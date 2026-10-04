#!/usr/bin/env python3
"""
Extract: builds the literature layer of the Rare Disease Atlas from PubMed abstracts.

    python3 backend/ingest/extract_literature.py              # curated diseases, writes backend/data/literature.json
    python3 backend/ingest/extract_literature.py --per-disease 20

Pipeline:
  1. For each curated disease, search PubMed (NCBI E-utilities, no key) for recent primary papers with
     abstracts (reviews excluded) and fetch title, abstract, year, journal and last author.
  2. An LLM (same OpenAI-compatible endpoint as explain.py; default local gpt-oss:20b via Ollama) extracts
     claims of a few fixed types, each with a quote copied from the abstract.
  3. A claim is kept only if
       - its quote appears verbatim in the title/abstract (whitespace, dashes and quotes normalized),
       - both entities appear in the abstract and map to existing atlas nodes (diseases, genes, drugs)
         or to an HPO term (phenotypes, via hp.obo names and exact synonyms),
       - the quote is a full clause (40+ characters) naming the claim's key entity: both gene and disease for a
         gene-disease claim, the phenotype or drug otherwise (the other entity must appear in the abstract, since
         phenotype sentences often say "patients" rather than repeating the disease name),
       - the entity types match the relation, and
       - a gene-disease claim agrees with the OMIM gene link already in the atlas (otherwise it usually means a
         family name such as "Noonan syndrome" was matched to the wrong subtype).
  4. Kept claims become LIT_* edges (tier LITERATURE_EXTRACTED) carrying PMID, year, quote and study context.
     Papers with at least one kept claim become publication nodes; their last authors become investigator
     nodes linked to the disease the paper was retrieved for (names and affiliations only).

Raw model output is cached per PMID in backend/data/raw/literature_llm_cache.json, so re-running only
re-applies the checks unless --refresh is given.
"""

import argparse
import collections
import json
import os
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(HERE)
sys.path.insert(0, BACKEND)
sys.path.insert(0, HERE)

import explain  # noqa: E402  (LLM endpoint configuration)
from build_graph import parse_obo_terms  # noqa: E402
from curated import CURATED  # noqa: E402

DATA_DIR = os.path.join(BACKEND, "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
GRAPH_PATH = os.path.join(DATA_DIR, "graph.json")
OUT_PATH = os.path.join(DATA_DIR, "literature.json")
LLM_CACHE_PATH = os.path.join(RAW_DIR, "literature_llm_cache.json")
PUBMED_CACHE_PATH = os.path.join(RAW_DIR, "pubmed_cache.json")
EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
PROMPT_VERSION = "v1"

# Queries that need more than the disease names (curated variant-effect clusters share a gene)
QUERY_OVERRIDES = {
    "DIS_SCN2A_GOF": 'SCN2A[tiab] AND ("gain of function"[tiab] OR "gain-of-function"[tiab])',
    "DIS_SCN2A_LOF": 'SCN2A[tiab] AND ("loss of function"[tiab] OR "loss-of-function"[tiab] OR haploinsufficiency[tiab])',
}

RELATIONS = {
    # relation: (subject type, object type, edge relationship, edge goes subject->object)
    "gene_causes_disease": ("gene", "disease", "LIT_CAUSED_BY", False),
    "disease_has_phenotype": ("disease", "phenotype", "LIT_HAS_PHENOTYPE", True),
    "drug_improves_disease": ("drug", "disease", "LIT_DRUG_IMPROVES", True),
    "drug_no_effect_on_disease": ("drug", "disease", "LIT_DRUG_NO_EFFECT", True),
    "drug_worsens_disease": ("drug", "disease", "LIT_DRUG_WORSENS", True),
}
CONTEXTS = ["patients", "animal_model", "cell_model", "computational", "unspecified"]

SYSTEM_PROMPT = """You extract findings from a biomedical abstract into structured claims.

Rules:
- Use only these relations: gene_causes_disease, disease_has_phenotype, drug_improves_disease,
  drug_no_effect_on_disease, drug_worsens_disease.
- subject and object must be written exactly as they appear in the abstract (a gene symbol, a disease
  name, a drug name, or a clinical feature/symptom).
- quote must be copied verbatim, character for character, from the abstract: the sentence or clause that
  states the claim. Do not paraphrase or join sentences.
- context: where the finding comes from (patients, animal_model, cell_model, computational, unspecified).
- Only extract what the abstract states. If nothing fits, return an empty list.
- Return JSON matching the schema."""

SCHEMA = {
    "type": "object",
    "properties": {
        "claims": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "subject": {"type": "string"},
                    "relation": {"type": "string", "enum": list(RELATIONS)},
                    "object": {"type": "string"},
                    "context": {"type": "string", "enum": CONTEXTS},
                    "quote": {"type": "string"},
                },
                "required": ["subject", "relation", "object", "context", "quote"],
            },
        }
    },
    "required": ["claims"],
}


# ---------------------------------------------------------------------------
# Text normalization
# ---------------------------------------------------------------------------

def norm(text: str) -> str:
    text = unicodedata.normalize("NFKC", text or "").lower()
    text = re.sub(r"[‐-―−]", "-", text)
    text = re.sub(r"[‘’‛`´]", "'", text)
    text = re.sub(r"[“”]", '"', text)
    return re.sub(r"\s+", " ", text).strip()


def key(text: str) -> str:
    """Looser key for entity lookup: letters and digits only."""
    return re.sub(r"[^a-z0-9]", "", norm(text))


def contains_term(haystack_norm: str, term: str) -> bool:
    return re.search(r"(?<![a-z0-9])" + re.escape(norm(term)) + r"(?![a-z0-9])", haystack_norm) is not None


# ---------------------------------------------------------------------------
# Caches and HTTP
# ---------------------------------------------------------------------------

def load_json(path, default):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def save_json(path, obj):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(obj, fh, indent=1)
    os.replace(tmp, path)


def eutils(endpoint: str, params: dict) -> bytes:
    url = f"{EUTILS}/{endpoint}?{urllib.parse.urlencode(params)}"
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=60) as resp:
                data = resp.read()
            time.sleep(0.4)  # stay under 3 requests/second without an API key
            return data
        except Exception:
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"PubMed request failed: {url}")


# ---------------------------------------------------------------------------
# Atlas entity dictionaries
# ---------------------------------------------------------------------------

def load_graph_nodes():
    """Imported nodes merged with curated ones (same merge rule as database.py, nodes only)."""
    imported = load_json(GRAPH_PATH, {"nodes": []})
    curated_by_omim = {n["omim"]: n for n in CURATED["nodes"] if n.get("type") == "disease" and n.get("omim")}
    nodes = {}
    for n in imported["nodes"]:
        c = curated_by_omim.get(n.get("omim")) if n.get("type") == "disease" else None
        if c:
            nodes[c["id"]] = {**n, **c, "omim_name": n["label"]}
        else:
            nodes[n["id"]] = n
    for n in CURATED["nodes"]:
        nodes.setdefault(n["id"], n)
    return nodes


def disease_names(node):
    names = {node.get("label", ""), re.sub(r"\s*\(.*?\)", "", node.get("label", "")), node.get("omim_name") or ""}
    names.update(node.get("synonyms", []))
    return {n.strip() for n in names if n and len(n.strip()) > 3}


def drug_names(node):
    label = node.get("label", "")
    names = {label, re.sub(r"\s*\(.*?\)", "", label)}
    names.update(p.strip() for p in re.findall(r"\(([^)]+)\)", label) for p in p.split("/"))
    names.update(part.strip() for part in label.split("/"))
    return {n for n in names if len(n) > 3 and not n.lower().startswith(("ivs-", "gsk3"))}


def load_hpo_names():
    """Normalized HPO name / exact synonym -> (HPO id, preferred name)."""
    names = {}
    for t in parse_obo_terms(os.path.join(RAW_DIR, "hp.obo")):
        if t.get("is_obsolete", ["false"])[0] == "true":
            continue
        tid, name = t["id"][0], t.get("name", [""])[0]
        synonyms = [m.group(1) for s in t.get("synonym", []) if (m := re.match(r'"(.+?)" EXACT', s))]
        for n in [name] + synonyms:
            names.setdefault(key(n), (tid, name))
    return names


PHENOTYPE_QUALIFIERS = re.compile(r"^(?:complex|transient|mild|moderate|severe|marked|significant|varying degrees of)\s+")


def abbreviations(text):
    """Abbreviations defined in the text as "long form (ABBR)" -> the text preceding the parenthesis."""
    found = {}
    for m in re.finditer(r"([^.;:()]{3,120}?)\s*\(([A-Za-z][A-Za-z0-9-]{1,11})\)", text):
        found.setdefault(m.group(2).upper(), m.group(1))
    return found


def lookup_disease(surface, disease_lookup, abbrev):
    """Exact name/synonym, then without parentheses or possessive, then via an abbreviation defined in the abstract."""
    variants = [surface, re.sub(r"\s*\(.*?\)", "", surface), re.sub(r"'s\b", "", surface)]
    for v in variants:
        hit = disease_lookup.get(key(v))
        if hit:
            return hit
    long_form = abbrev.get(re.sub(r"\s*\(.*?\)", "", surface).strip().upper())
    if long_form:
        words = long_form.split()
        for n in range(1, min(len(words), 8) + 1):   # shortest trailing phrase that names an atlas disease
            hit = disease_lookup.get(key(" ".join(words[-n:])))
            if hit:
                return hit
    return None


def lookup_phenotype(surface, hpo_lookup):
    """
    HPO term for a phenotype phrase: exact name/synonym first, then each part of "a/b", then the phrase
    without a leading severity qualifier ("transient transaminitis" -> "transaminitis"). Returns (id, name).
    """
    candidates = [surface] + [p for p in re.split(r"\s*/\s*", surface) if p != surface]
    for c in candidates:
        for variant in (c, PHENOTYPE_QUALIFIERS.sub("", norm(c))):
            hit = hpo_lookup.get(key(variant))
            if hit:
                return hit
    return None


# ---------------------------------------------------------------------------
# PubMed
# ---------------------------------------------------------------------------

def pubmed_query(disease_id, node):
    if disease_id in QUERY_OVERRIDES:
        q = QUERY_OVERRIDES[disease_id]
    else:
        unique = {}
        for t in sorted(disease_names(node), key=len):
            unique.setdefault(t.lower(), t)
        terms = list(unique.values())[:4]
        q = "(" + " OR ".join(f'"{t}"[tiab]' for t in terms) + ")"
    return f"{q} AND hasabstract AND english[la] NOT review[pt]"


def fetch_records(pmids, cache):
    missing = [p for p in pmids if p not in cache]
    for i in range(0, len(missing), 50):
        root = ET.fromstring(eutils("efetch.fcgi", {"db": "pubmed", "id": ",".join(missing[i:i + 50]), "retmode": "xml"}))
        for art in root.findall(".//PubmedArticle"):
            pmid = art.findtext(".//PMID")
            abstract = " ".join("".join(t.itertext()) for t in art.findall(".//Abstract/AbstractText"))
            authors = art.findall(".//AuthorList/Author")
            last = authors[-1] if authors else None
            year = art.findtext(".//JournalIssue/PubDate/Year") or (art.findtext(".//JournalIssue/PubDate/MedlineDate") or "")[:4]
            cache[pmid] = {
                "pmid": pmid,
                "title": "".join(art.find(".//ArticleTitle").itertext()) if art.find(".//ArticleTitle") is not None else "",
                "abstract": abstract,
                "journal": art.findtext(".//Journal/Title") or "",
                "year": int(year) if year.isdigit() else None,
                "last_author": None if last is None or last.findtext("LastName") is None else {
                    "name": f"{last.findtext('ForeName') or last.findtext('Initials') or ''} {last.findtext('LastName')}".strip(),
                    "affiliation": (last.findtext(".//AffiliationInfo/Affiliation") or "")[:160],
                },
            }
    return [cache[p] for p in pmids if p in cache]


# ---------------------------------------------------------------------------
# LLM extraction
# ---------------------------------------------------------------------------

def extract_claims(record):
    from openai import OpenAI

    client = OpenAI(base_url=explain.LLM_BASE_URL, api_key=explain.LLM_API_KEY, timeout=explain.LLM_TIMEOUT)
    kwargs = dict(
        model=explain.LLM_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Title: {record['title']}\n\nAbstract: {record['abstract']}"},
        ],
        response_format={"type": "json_schema", "json_schema": {"name": "claims", "schema": SCHEMA, "strict": True}},
    )
    if explain.LLM_MODEL.startswith("gpt-oss"):
        kwargs["reasoning_effort"] = "low"
    content = client.chat.completions.create(**kwargs).choices[0].message.content or "{}"
    claims = json.loads(content).get("claims", [])
    return claims if isinstance(claims, list) else []


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--per-disease", type=int, default=12, help="abstracts fetched per curated disease")
    ap.add_argument("--refresh", action="store_true", help="re-run the LLM even for cached PMIDs")
    args = ap.parse_args()

    nodes = load_graph_nodes()
    curated_diseases = [n["id"] for n in CURATED["nodes"] if n.get("type") == "disease"]

    disease_lookup, gene_lookup, drug_lookup = {}, {}, {}
    for nid, n in nodes.items():
        if n.get("type") == "disease":
            for name in disease_names(n):
                disease_lookup.setdefault(key(name), nid)
        elif n.get("type") == "gene":
            gene_lookup[n["label"].upper()] = nid
        elif n.get("type") == "drug":
            for name in drug_names(n):
                drug_lookup.setdefault(key(name), nid)
    hpo_lookup = load_hpo_names()
    database_genes = collections.defaultdict(set)   # disease -> causal genes from the imported/curated layers
    curated_alias = {n["omim"]: n["id"] for n in CURATED["nodes"] if n.get("type") == "disease" and n.get("omim")}
    imported_ids = {n["id"]: curated_alias.get(n.get("omim"), n["id"]) for n in load_json(GRAPH_PATH, {"nodes": []})["nodes"]}
    for e in load_json(GRAPH_PATH, {"edges": []})["edges"] + CURATED["edges"]:
        if e["relationship"] == "CAUSED_BY_MUTATION":
            database_genes[imported_ids.get(e["source"], e["source"])].add(e["target"])

    pubmed_cache = load_json(PUBMED_CACHE_PATH, {})
    llm_cache = load_json(LLM_CACHE_PATH, {})

    print(f"1/3 PubMed search for {len(curated_diseases)} curated diseases", file=sys.stderr)
    retrieved_for = collections.defaultdict(list)   # pmid -> [disease ids]
    for d in curated_diseases:
        q = pubmed_query(d, nodes[d])
        ids = json.loads(eutils("esearch.fcgi", {"db": "pubmed", "term": q, "retmax": args.per_disease,
                                                  "sort": "relevance", "retmode": "json"}))["esearchresult"]["idlist"]
        for p in ids:
            retrieved_for[p].append(d)
        print(f"  {d:16} {len(ids):3} papers  ({q[:90]})", file=sys.stderr)
    records = fetch_records(list(retrieved_for), pubmed_cache)
    save_json(PUBMED_CACHE_PATH, pubmed_cache)

    print(f"2/3 extracting claims from {len(records)} abstracts with {explain.LLM_MODEL}", file=sys.stderr)
    for i, rec in enumerate(records, 1):
        ck = f"{rec['pmid']}|{explain.LLM_MODEL}|{PROMPT_VERSION}"
        if ck in llm_cache and not args.refresh:
            continue
        t0 = time.time()
        try:
            llm_cache[ck] = {"claims": extract_claims(rec)}
        except Exception as exc:
            llm_cache[ck] = {"claims": [], "error": str(exc)[:200]}
        save_json(LLM_CACHE_PATH, llm_cache)
        print(f"  [{i}/{len(records)}] PMID {rec['pmid']}: {len(llm_cache[ck]['claims'])} raw claims "
              f"({time.time() - t0:.0f}s)", file=sys.stderr, flush=True)

    print("3/3 validating", file=sys.stderr)
    edges, rejected = {}, collections.Counter()
    papers_with_claims, new_symptoms = {}, {}
    for rec in records:
        text_norm = norm(f"{rec['title']} {rec['abstract']}")
        abbrev = abbreviations(f"{rec['title']}. {rec['abstract']}")
        raw = llm_cache.get(f"{rec['pmid']}|{explain.LLM_MODEL}|{PROMPT_VERSION}", {}).get("claims", [])
        for c in raw:
            if not isinstance(c, dict) or c.get("relation") not in RELATIONS:
                rejected["malformed"] += 1
                continue
            s_type, o_type, rel, forward = RELATIONS[c["relation"]]
            quote = c.get("quote", "")
            if len(norm(quote)) < 20 or norm(quote) not in text_norm:
                rejected["quote not verbatim"] += 1
                continue

            def resolve(surface, etype):
                if not surface or not contains_term(text_norm, surface):
                    return None
                if etype == "gene":
                    return gene_lookup.get(re.sub(r"\s+gene$", "", surface.strip(), flags=re.I).upper())
                if etype == "disease":
                    return lookup_disease(surface, disease_lookup, abbrev)
                if etype == "drug":
                    return drug_lookup.get(key(surface))
                hit = lookup_phenotype(surface, hpo_lookup)
                if hit:
                    new_symptoms.setdefault(hit[0], hit[1])
                    return hit[0]
                return None

            quote_norm = norm(quote)
            must_name = {"gene_causes_disease": ("subject", "object"), "disease_has_phenotype": ("object",)}.get(c["relation"], ("subject",))
            if len(quote_norm) < 40 or not all(contains_term(quote_norm, c.get(k) or "") for k in must_name):
                rejected["quote does not state the claim"] += 1
                continue
            s_id, o_id = resolve(c.get("subject"), s_type), resolve(c.get("object"), o_type)
            if not s_id or not o_id:
                rejected[f"unmapped {s_type if not s_id else o_type}"] += 1
                continue
            if c["relation"] == "gene_causes_disease" and s_id not in database_genes.get(o_id, set()):
                rejected["gene link not in OMIM data"] += 1
                continue
            source, target = (s_id, o_id) if forward else (o_id, s_id)
            edge = edges.setdefault((source, target, rel), {
                "source": source, "target": target, "relationship": rel,
                "evidence_tier": "LITERATURE_EXTRACTED", "extracted_by": explain.LLM_MODEL, "evidence": [],
            })
            if all(e["pmid"] != rec["pmid"] for e in edge["evidence"]):
                edge["evidence"].append({"pmid": rec["pmid"], "year": rec["year"], "quote": quote.strip(), "context": c.get("context")})
            papers_with_claims[rec["pmid"]] = rec

    # Publications, SUPPORTS_EVIDENCE links and investigators (last authors)
    out_nodes, out_edges = [], []
    for e in edges.values():
        e["n_papers"] = len(e["evidence"])
        out_edges.append(e)
    supports = set()
    for e in edges.values():
        for ev in e["evidence"]:
            for t in (e["source"], e["target"]):
                supports.add((f"PUB_{ev['pmid']}", t))
    for pub, target in sorted(supports):
        out_edges.append({"source": pub, "target": target, "relationship": "SUPPORTS_EVIDENCE",
                          "evidence_tier": "LITERATURE_EXTRACTED"})

    investigators = {}
    for pmid, rec in papers_with_claims.items():
        out_nodes.append({"id": f"PUB_{pmid}", "type": "publication", "label": f"{(rec['last_author'] or {}).get('name', 'PubMed')}, {rec['year']}",
                          "pmid": pmid, "title": rec["title"], "journal": rec["journal"], "year": rec["year"],
                          "source": "PubMed (literature extraction)"})
        la = rec["last_author"]
        if not la:
            continue
        inv_id = "INV_" + key(la["name"]).upper()
        inv = investigators.setdefault(inv_id, {"id": inv_id, "type": "investigator", "label": la["name"],
                                                "institution": la["affiliation"], "role": "Last author on PubMed papers in the atlas",
                                                "source": "PubMed author list", "pmids": [], "diseases": collections.Counter()})
        inv["pmids"].append(pmid)
        for d in retrieved_for.get(pmid, []):
            inv["diseases"][d] += 1
        out_edges.append({"source": inv_id, "target": f"PUB_{pmid}", "relationship": "AUTHOR_OF", "evidence_tier": "LITERATURE_EXTRACTED"})
    for inv in investigators.values():
        for d, n in inv["diseases"].items():
            out_edges.append({"source": inv["id"], "target": d, "relationship": "PUBLISHES_ON", "n_papers": n,
                              "pmids": [p for p in inv["pmids"] if d in retrieved_for.get(p, [])],
                              "evidence_tier": "LITERATURE_EXTRACTED"})
        inv.pop("diseases")
        out_nodes.append(inv)
    for hp_id, name in new_symptoms.items():
        if hp_id not in nodes:
            out_nodes.append({"id": hp_id, "type": "symptom", "label": name, "hpo_id": hp_id, "source": "HPO (via literature extraction)"})

    kept = sum(len(e["evidence"]) for e in edges.values())
    raw_total = sum(len(llm_cache.get(f"{r['pmid']}|{explain.LLM_MODEL}|{PROMPT_VERSION}", {}).get("claims", [])) for r in records)
    save_json(OUT_PATH, {
        "metadata": {"built": date.today().isoformat(), "model": explain.LLM_MODEL, "prompt_version": PROMPT_VERSION,
                     "abstracts": len(records), "raw_claims": raw_total, "kept_claims": kept,
                     "rejected": dict(rejected), "per_disease": args.per_disease},
        "nodes": out_nodes, "edges": out_edges,
    })
    print(f"wrote {OUT_PATH}: {len(records)} abstracts, {raw_total} raw claims, {kept} kept "
          f"({len(edges)} edges), {len(papers_with_claims)} papers, {len(investigators)} investigators; "
          f"rejected {dict(rejected)}", file=sys.stderr)


if __name__ == "__main__":
    main()
