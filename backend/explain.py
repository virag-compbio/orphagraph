"""
Explain: turns the facts behind a journey into plain language with an LLM, sentence by sentence,
where every sentence must cite the facts it uses.

The model only rephrases. Facts are built here from the graph-derived journey; the model returns
{"sentences": [{"text", "facts"}]} and each sentence is validated:
  - it must cite at least one fact id that exists;
  - every number in it must appear in the text of the facts it cites.
Sentences that fail are dropped and counted. If the LLM is unreachable, the template text is returned.

Configuration (environment variables), defaulting to a local Ollama server running OpenAI's open-weight model:
  LLM_BASE_URL   http://localhost:11434/v1   (any OpenAI-compatible endpoint, e.g. https://api.openai.com/v1)
  LLM_MODEL      gpt-oss:20b
  OPENAI_API_KEY ollama                      (ignored by Ollama; required by the OpenAI API)
  LLM_TIMEOUT    180 (seconds)
  LLM_DISABLED   set to 1 to always use the template text

Pre-generate explanations for the curated diseases (so the demo is instant):
  python3 backend/explain.py --warm
"""

import hashlib
import json
import os
import re
import sys
import threading
from typing import Any, Dict, List, Optional

CACHE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "explanations_cache.json")

LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "http://localhost:11434/v1")
LLM_MODEL = os.environ.get("LLM_MODEL", "gpt-oss:20b")
LLM_API_KEY = os.environ.get("OPENAI_API_KEY", "ollama")
LLM_TIMEOUT = float(os.environ.get("LLM_TIMEOUT", "180"))
LLM_DISABLED = os.environ.get("LLM_DISABLED") == "1"

PERSONA_STYLE = {
    "maria": "a patient organization leader with no scientific training who must decide what to do next; plain language, practical",
    "devon": "a newly diagnosed family member reading at night; very plain, warm language, no jargon (explain any term you must use)",
    "priya": "a biotech scout evaluating therapeutic opportunities; concise and precise, mention mechanisms and evidence tiers",
    "dr_osei": "an academic clinician-scientist; technical language is fine, focus on mechanisms and evidence strength",
}

SYSTEM_PROMPT = """You explain findings from a rare disease knowledge graph.

Rules:
- Use ONLY the numbered facts provided. Do not add knowledge from outside the facts.
- Every sentence must cite the fact ids it relies on in its "facts" list.
- Do not generalize beyond what a cited fact says (e.g. a fact about one disease says nothing about another).
- Copy numbers exactly as they appear in the facts, and keep hedging words such as "may" or "unverified".
- Do not write fact ids in the sentence text; list them only in "facts".
- Keep uncertainty visible: phenotype-only similarity is not evidence of a shared mechanism, and an
  INFERRED_HYPOTHESIS lead is unverified. Say when no supported connection was found.
- Do not give medical advice; suggest discussing options with the care team where relevant.
- Return JSON matching the schema."""

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "sentences": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"text": {"type": "string"}, "facts": {"type": "array", "items": {"type": "string"}}},
                "required": ["text", "facts"],
            },
        }
    },
    "required": ["sentences"],
}

_cache_lock = threading.Lock()


def _load_cache() -> Dict[str, Any]:
    try:
        with open(CACHE_PATH, encoding="utf-8") as fh:
            return json.load(fh)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


_cache: Dict[str, Any] = _load_cache()


def _save_cache() -> None:
    tmp = CACHE_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(_cache, fh, indent=1)
    os.replace(tmp, CACHE_PATH)


# ---------------------------------------------------------------------------
# Facts
# ---------------------------------------------------------------------------

def build_facts(journey: Dict[str, Any]) -> List[Dict[str, str]]:
    """Numbered, self-contained statements derived from the graph-driven journey."""
    facts: List[Dict[str, str]] = []

    def add(kind: str, text: str) -> None:
        facts.append({"id": f"F{len(facts) + 1}", "kind": kind, "text": text})

    s1, s2, s3 = journey["step1_diagnosis"], journey["step2_mechanism"], journey["step3_assets"]
    disease = s1["disease"]
    name = disease.get("label")

    add("disease", f"{name} ({disease.get('code')}) is the condition being explored.")
    add("treatment", s1["treatment_line"])
    if s1.get("trials"):
        for t in s1["trials"]:
            add("trial", f"Registered study {t['nct_id']}: {t['label']}. Phase: {t['phase']}. Status: {t['status']} "
                         f"({'currently recruiting' if t['recruiting'] else 'not currently recruiting'}).")
    else:
        add("trials", s1["status"])

    mech = [r for r in s2["related_diseases"] if r["basis"] == "mechanism"]
    pheno = [r for r in s2["related_diseases"] if r["basis"] == "phenotype"]
    for r in mech[:4]:
        pathways = r["shared_pathways"]
        listed = ", ".join(f"'{p}'" for p in pathways[:2]) + (f" and {len(pathways) - 2} more" if len(pathways) > 2 else "")
        gene = f" They are caused by the same gene ({', '.join(r['shared_genes'])}), so variant effects may differ." if r["shared_genes"] else ""
        similarity = (f"their phenotype similarity score is {r['phenotype_similarity']:.2f} on a 0-1 scale"
                      if s2.get("has_phenotypes") else f"phenotype similarity was not computed because {name} has no phenotype annotations in the atlas")
        add("mechanism", f"{name} and {r['label']} share the Reactome pathway(s) {listed}; {similarity}.{gene}")
    for r in pheno[:3]:
        terms = ", ".join(p["label"] for p in r["shared_phenotypes"][:3])
        add("phenotype", f"{r['label']} has similar phenotypes to {name} (similarity score {r['phenotype_similarity']:.2f}; "
                         f"shared features include {terms}) but no recorded shared pathway, so this is not evidence of a shared mechanism.")
    for c in s2["counterexamples"]:
        add("counterexample", f"{c['label']} affects the same pathway ({c['pathway']}) in the opposite direction "
                              f"({c['their_direction'].replace('_', ' ')} vs {c['this_direction'].replace('_', ' ')} for {name}), "
                              f"so it needs a different treatment strategy and should not be pooled with {name}.")
    if not mech and not pheno and not s2["counterexamples"]:
        add("gap", s2["insight"])

    for lead in s2["repurposing_leads"][:3]:
        add("lead", f"{lead.get('label')} is listed as a candidate for {name} with evidence tier {lead.get('evidence_tier')}. "
                    f"{lead.get('mechanism') or ''}".strip())
    lit = s2.get("literature", {"claims": []})
    for c in lit["claims"][:3]:
        ev = c["evidence"][0]
        context = (ev.get("context") or "unspecified").replace("_", " ")
        add("literature", f"PubMed paper PMID {ev['pmid']} ({ev.get('year')}, {context}) reports that {c['subject']} "
                          f"{c['relation']} {c['object']}"
                          + (", which contradicts a recorded positive claim" if c["contradicts"] else "")
                          + f". Quote: \"{ev['quote']}\" (extracted automatically, quote checked against the abstract).")
    for c in s2["contraindications"]:
        add("contraindication", f"{c['label']} should be avoided in {name}: {c.get('reason') or 'recorded contraindication'}.")

    for a in s3["reusable_assets"][:3]:
        add("asset", f"Existing resource: {a['name']} ({a['type']}, custodian {a['custodian']}, built for {a['for_disease']}). {a['reusability']}.")
    for k in s3["key_collaborators"][:2]:
        where = f" ({k['institution']})" if k.get("institution") else ""
        add("investigator", f"{k['name']}{where} is linked because: {k['connection']}.")
    return facts


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

# Standalone numbers only: digits inside identifiers such as "NGLY1" or "SCN2A" are not quantities
_NUMBER = re.compile(r"(?<![\w.])\d+(?:\.\d+)?(?![\w])")


def _validate(sentences: List[Dict[str, Any]], facts: List[Dict[str, str]]) -> Dict[str, Any]:
    by_id = {f["id"]: f for f in facts}
    kept, dropped = [], []
    if not isinstance(sentences, list):
        sentences = []
    for s in sentences:
        if isinstance(s, str):  # schema not followed: take inline "F12"-style ids as the citations
            s = {"text": s, "facts": re.findall(r"\bF\d+\b", s)}
        elif not isinstance(s, dict):
            continue
        # Remove inline citation markers such as "(F4)", "[F2, F7]" or "(F4-F7)" that the model may add anyway
        text = re.sub(r"\s*[(\[]\s*F\d+(?:\s*[-\u2010-\u2015,;]\s*F?\d+)*\s*[)\]]", "", str(s.get("text", ""))).strip()
        cited = [f for f in dict.fromkeys(s.get("facts") or []) if f in by_id]
        if not text:
            continue
        if not cited:
            dropped.append({"text": text, "reason": "no valid fact citation"})
            continue
        source_text = " ".join(by_id[f]["text"] for f in cited)
        stray = [n for n in _NUMBER.findall(re.sub(r"\bF\d+\b", "", text)) if n not in source_text]
        if stray:
            dropped.append({"text": text, "reason": f"number(s) not in cited facts: {', '.join(stray)}"})
            continue
        kept.append({"text": text, "facts": cited})
    return {"sentences": kept, "dropped": dropped}


# ---------------------------------------------------------------------------
# LLM call
# ---------------------------------------------------------------------------

def _call_llm(facts: List[Dict[str, str]], instruction: str) -> List[Dict[str, Any]]:
    from openai import OpenAI  # imported lazily so the backend runs without the SDK installed

    client = OpenAI(base_url=LLM_BASE_URL, api_key=LLM_API_KEY, timeout=LLM_TIMEOUT)
    fact_block = "\n".join(f"{f['id']}: {f['text']}" for f in facts)
    kwargs: Dict[str, Any] = dict(
        model=LLM_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Facts:\n{fact_block}\n\nTask: {instruction}"},
        ],
        response_format={"type": "json_schema", "json_schema": {"name": "explanation", "schema": RESPONSE_SCHEMA, "strict": True}},
    )
    if LLM_MODEL.startswith("gpt-oss"):
        kwargs["reasoning_effort"] = "low"
    response = client.chat.completions.create(**kwargs)
    return json.loads(response.choices[0].message.content or "{}").get("sentences", [])


def explain(key_parts: List[str], facts: List[Dict[str, str]], instruction: str, fallback_text: str,
            refresh: bool = False) -> Dict[str, Any]:
    """Cached, validated LLM explanation; falls back to the template text."""
    fact_hash = hashlib.sha1(json.dumps([facts, instruction], sort_keys=True).encode()).hexdigest()[:12]
    key = "|".join(key_parts + [LLM_MODEL, fact_hash])
    if not refresh:
        with _cache_lock:
            if key in _cache:
                return {**_cache[key], "cached": True}

    base = {"facts": facts, "model": LLM_MODEL, "endpoint": LLM_BASE_URL}
    if LLM_DISABLED:
        return {**base, "source": "template", "text": fallback_text, "sentences": [], "dropped": [], "error": "LLM disabled"}
    try:
        sentences = []
        for _ in range(2):  # the model occasionally returns an empty or unparseable list; retry once
            try:
                sentences = _call_llm(facts, instruction)
            except json.JSONDecodeError:
                sentences = []
            if sentences:
                break
        result = _validate(sentences, facts)
    except Exception as exc:  # unreachable server, timeout, malformed output
        return {**base, "source": "template", "text": fallback_text, "sentences": [], "dropped": [], "error": str(exc)[:300]}
    if not result["sentences"]:
        return {**base, "source": "template", "text": fallback_text, "sentences": [], "dropped": result["dropped"],
                "error": "no sentence passed validation"}

    out = {**base, "source": "llm", "text": " ".join(s["text"] for s in result["sentences"]),
           "sentences": result["sentences"], "dropped": result["dropped"]}
    with _cache_lock:
        _cache[key] = out
        _save_cache()
    return {**out, "cached": False}


def explain_journey(engine, disease_id: str, persona: str = "maria", refresh: bool = False) -> Dict[str, Any]:
    journey = engine.generate_marias_journey(disease_id)
    facts = build_facts(journey)
    style = PERSONA_STYLE.get(persona, PERSONA_STYLE["maria"])
    instruction = (f"Write 4-7 sentences for {style}. Explain what the atlas found for "
                   f"{journey['step1_diagnosis']['disease'].get('label')}: which other diseases are connected and how strongly, "
                   f"what remains uncertain, and what existing resources or next steps the facts point to.")
    return explain(["journey", journey["disease_id"], persona], facts, instruction,
                   journey["step2_mechanism"]["insight"], refresh)


def explain_question(engine, disease_id: str, question: str, refresh: bool = False) -> Dict[str, Any]:
    journey = engine.generate_marias_journey(disease_id)
    facts = build_facts(journey)
    instruction = (f"Answer this question in 3-6 sentences, using only the facts: \"{question}\". "
                   f"If the facts do not answer it, say so plainly.")
    return explain(["question", journey["disease_id"], question.strip().lower()], facts, instruction,
                   journey["step2_mechanism"]["insight"], refresh)


if __name__ == "__main__":
    if "--warm" in sys.argv:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from graph_engine import graph_engine
        curated = [d for d in graph_engine._disease_ids() if not d.startswith("DIS_OMIM_")]
        for d in curated:
            for persona in PERSONA_STYLE:
                r = explain_journey(graph_engine, d, persona, refresh="--refresh" in sys.argv)
                print(f"{d:16} {persona:8} {r['source']:8} kept={len(r['sentences'])} dropped={len(r['dropped'])} "
                      f"{'(cached)' if r.get('cached') else ''} {r.get('error', '')}", flush=True)
    else:
        print(__doc__)
