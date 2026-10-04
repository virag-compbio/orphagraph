#!/usr/bin/env python3
"""
Builds the imported layer of Orphagraph Atlas from open data files.

    python3 backend/ingest/build_graph.py            # downloads missing files, writes backend/data/graph.json
    python3 backend/ingest/build_graph.py --refresh  # re-downloads all source files first

Sources (all openly downloadable, no API keys):
  - HPO phenotype annotations (phenotype.hpoa) and ontology (hp.obo)        -> disease-phenotype links
  - HPO genes_to_disease.txt (MENDELIAN rows, from OMIM/mim2gene_medgen)    -> disease-gene links
  - Reactome NCBI2Reactome.txt (lowest-level human pathways)                -> gene-pathway links
  - Reactome ReactomePathwaysRelation.txt (pathway hierarchy)                -> excludes the "Disease" branch
  - MONDO mondo-rare.obo (equivalence cross-references)                     -> OMIM <-> Orphanet <-> MONDO ids

Method:
  1. Universe = OMIM diseases equivalent to a MONDO term tagged "rare" (excluding OMIM susceptibility
     entries and groupings such as "Obesity"), with at least one Mendelian gene and MIN_TERMS phenotypes.
  2. Phenotype specificity: information content IC(t) = -ln(fraction of universe diseases annotated
     with t or a descendant of t).
  3. Phenotype similarity between two diseases = IC-weighted Jaccard over their ancestor-propagated
     HPO term sets: sum(IC of shared terms) / sum(IC of all terms in either).
  4. Slice = seed diseases + for each seed its top phenotype neighbours and top pathway-sharing neighbours.
     Pathways larger than PATHWAY_SIZE_CAP genes are ignored so that hub pathways do not link everything.
     Pathways under Reactome's "Disease" branch are ignored too: they describe diseases and mutant proteins
     (e.g. "MPS IIIA - Sanfilippo syndrome A", "Signaling by FLT3 ITD and TKD mutants"), not shared normal biology.
"""

import argparse
import collections
import csv
import json
import math
import os
import re
import sys
import urllib.request
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "..", "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
OUT_PATH = os.path.join(DATA_DIR, "graph.json")

SOURCES = {
    "phenotype.hpoa": "https://github.com/obophenotype/human-phenotype-ontology/releases/latest/download/phenotype.hpoa",
    "genes_to_disease.txt": "https://github.com/obophenotype/human-phenotype-ontology/releases/latest/download/genes_to_disease.txt",
    "hp.obo": "https://github.com/obophenotype/human-phenotype-ontology/releases/latest/download/hp.obo",
    "NCBI2Reactome.txt": "https://reactome.org/download/current/NCBI2Reactome.txt",
    "ReactomePathwaysRelation.txt": "https://reactome.org/download/current/ReactomePathwaysRelation.txt",
    "mondo-rare.obo": "https://github.com/monarch-initiative/mondo/releases/latest/download/mondo-rare.obo",
}

# Seeds: OMIM entries of the diseases curated in backend/curated.py, plus the OMIM SCN2A disorders
SEED_OMIM = [
    "615273",  # Congenital disorder of deglycosylation 1 (NGLY1)
    "612164",  # Developmental and epileptic encephalopathy 4 (STXBP1)
    "312750",  # Rett syndrome (MECP2)
    "252900",  # Mucopolysaccharidosis type IIIA (SGSH)
    "229300",  # Friedreich ataxia 1 (FXN)
    "606232",  # Phelan-McDermid syndrome (SHANK3)
    "300672",  # Developmental and epileptic encephalopathy 2 (CDKL5)
    "204200",  # Ceroid lipofuscinosis, neuronal, 3 (CLN3)
    "218040",  # Costello syndrome (HRAS)
    "163950",  # Noonan syndrome 1 (PTPN11)
    "309400",  # Menkes disease (ATP7A)
    "613721",  # Epileptic encephalopathy, early infantile, 11 (SCN2A)
    "607745",  # Seizures, benign familial infantile, 3 (SCN2A)
]

MIN_TERMS = 3                 # minimum phenotype annotations for a disease to enter the universe
PATHWAY_SIZE_CAP = 40         # ignore Reactome pathways with more genes than this
REACTOME_DISEASE_ROOT = "R-HSA-1643685"   # top-level "Disease" pathway; its descendants are excluded
PHENO_NEIGHBOURS_PER_SEED = 8
PATHWAY_NEIGHBOURS_PER_SEED = 6
SIMILARITY_EDGES_PER_DISEASE = 8
SIMILARITY_MIN = 0.12
PHENOTYPES_SHOWN_PER_DISEASE = 12
SMALLEST_PATHWAYS_PER_GENE = 3
HIGH_FRACTION, MODERATE_FRACTION = 0.02, 0.10   # informativeness bins by fraction of diseases annotated
PHENOTYPIC_ABNORMALITY = "HP:0000118"


def download(refresh: bool) -> None:
    os.makedirs(RAW_DIR, exist_ok=True)
    for name, url in SOURCES.items():
        path = os.path.join(RAW_DIR, name)
        if refresh or not os.path.exists(path):
            print(f"  downloading {name} ...", file=sys.stderr)
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})  # reactome.org rejects urllib's default
            with urllib.request.urlopen(req, timeout=300) as resp, open(path + ".tmp", "wb") as out:
                out.write(resp.read())
            os.replace(path + ".tmp", path)


def parse_obo_terms(path):
    """Yields one dict of tag -> [values] per [Term] stanza."""
    term = None
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.rstrip("\n")
            if line.startswith("["):
                if term:
                    yield term
                term = {} if line == "[Term]" else None
            elif term is not None and ": " in line:
                tag, value = line.split(": ", 1)
                term.setdefault(tag, []).append(value)
    if term:
        yield term


def load_hpo():
    names, parents, alt, obsolete = {}, collections.defaultdict(set), {}, set()
    for t in parse_obo_terms(os.path.join(RAW_DIR, "hp.obo")):
        tid = t["id"][0]
        names[tid] = t.get("name", [tid])[0]
        if t.get("is_obsolete", ["false"])[0] == "true":
            obsolete.add(tid)
            for r in t.get("replaced_by", []):
                alt[tid] = r
        for a in t.get("alt_id", []):
            alt[a] = tid
        for p in t.get("is_a", []):
            parents[tid].add(p.split(" ! ")[0])
    return names, parents, alt, obsolete


def load_annotations(alt, obsolete):
    names, terms, freq = {}, collections.defaultdict(set), {}
    with open(os.path.join(RAW_DIR, "phenotype.hpoa"), encoding="utf-8") as fh:
        version = next((l.split(": ", 1)[1].strip() for l in fh if l.startswith("#version")), "unknown")
    with open(os.path.join(RAW_DIR, "phenotype.hpoa"), encoding="utf-8") as fh:
        rows = csv.DictReader((l for l in fh if not l.startswith("#")), delimiter="\t")
        for r in rows:
            if not r["database_id"].startswith("OMIM:") or r["aspect"] != "P" or r["qualifier"] == "NOT":
                continue
            hp = alt.get(r["hpo_id"], r["hpo_id"])
            if hp in obsolete:
                continue
            d = r["database_id"]
            names[d] = r["disease_name"]
            terms[d].add(hp)
            if r["frequency"]:
                freq[(d, hp)] = r["frequency"]
    return names, terms, freq, version


def load_genes():
    disease_genes, ncbi = collections.defaultdict(set), {}
    with open(os.path.join(RAW_DIR, "genes_to_disease.txt"), encoding="utf-8") as fh:
        for r in csv.DictReader(fh, delimiter="\t"):
            if r["association_type"] == "MENDELIAN" and r["disease_id"].startswith("OMIM:"):
                disease_genes[r["disease_id"]].add(r["gene_symbol"])
                ncbi[r["gene_symbol"]] = r["ncbi_gene_id"].split(":")[1]
    return disease_genes, ncbi


def reactome_disease_branch():
    """All pathways under Reactome's top-level "Disease" pathway."""
    children = collections.defaultdict(set)
    with open(os.path.join(RAW_DIR, "ReactomePathwaysRelation.txt"), encoding="utf-8") as fh:
        for line in fh:
            parent, child = line.rstrip("\n").split("\t")[:2]
            children[parent].add(child)
    branch, stack = set(), [REACTOME_DISEASE_ROOT]
    while stack:
        for c in children.get(stack.pop(), ()):
            if c not in branch:
                branch.add(c)
                stack.append(c)
    return branch


def load_reactome():
    genes, names = collections.defaultdict(set), {}
    disease_branch = reactome_disease_branch()
    with open(os.path.join(RAW_DIR, "NCBI2Reactome.txt"), encoding="utf-8") as fh:
        for line in fh:
            f = line.rstrip("\n").split("\t")
            if len(f) >= 6 and f[5] == "Homo sapiens" and f[1] not in disease_branch:
                genes[f[1]].add(f[0])
                names[f[1]] = f[3].strip()
    print(f"  {len(disease_branch)} Reactome disease-branch pathways excluded", file=sys.stderr)
    return genes, names


def load_mondo_xrefs():
    """
    OMIM id -> (MONDO id, Orphanet code), using only equivalence cross-references and only for terms
    MONDO tags as rare that are neither OMIM susceptibility entries nor disease groupings.
    """
    xrefs = {}
    for t in parse_obo_terms(os.path.join(RAW_DIR, "mondo-rare.obo")):
        subsets = {s.split(" ")[0] for s in t.get("subset", [])}
        if (t.get("is_obsolete", ["false"])[0] == "true" or "rare" not in subsets
                or subsets & {"omim_susceptibility", "disease_grouping"}):
            continue
        omim, orpha = None, None
        for x in t.get("xref", []):
            if "equivalentTo" not in x:
                continue
            m = re.match(r"(OMIM|Orphanet):(\d+)", x)
            if m and m.group(1) == "OMIM":
                omim = m.group(2)
            elif m:
                orpha = m.group(2)
        if omim:
            xrefs[omim] = (t["id"][0], orpha)
    return xrefs


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--refresh", action="store_true", help="re-download all source files")
    args = ap.parse_args()

    print("1/6 source files", file=sys.stderr)
    download(args.refresh)

    print("2/6 parsing", file=sys.stderr)
    hp_names, hp_parents, hp_alt, hp_obsolete = load_hpo()
    d_names, d_terms, d_freq, hpoa_version = load_annotations(hp_alt, hp_obsolete)
    d_genes, gene_ncbi = load_genes()
    pw_genes, pw_names = load_reactome()
    mondo = load_mondo_xrefs()

    universe = [d for d in d_terms
                if d.split(":")[1] in mondo and d_genes.get(d) and len(d_terms[d]) >= MIN_TERMS]

    print(f"3/6 information content over {len(universe)} diseases", file=sys.stderr)
    anc_cache = {}

    def ancestors(t):
        if t not in anc_cache:
            out = {t}
            for p in hp_parents.get(t, ()):
                out |= ancestors(p)
            anc_cache[t] = out
        return anc_cache[t]

    sys.setrecursionlimit(10000)
    propagated = {d: set().union(*(ancestors(t) for t in d_terms[d])) for d in universe}
    counts = collections.Counter(t for d in universe for t in propagated[d])
    n = len(universe)
    ic = {t: -math.log(c / n) for t, c in counts.items()}

    def similarity(a, b):
        shared = propagated[a] & propagated[b]
        union = propagated[a] | propagated[b]
        denom = sum(ic[t] for t in union)
        return sum(ic[t] for t in shared) / denom if denom else 0.0

    def most_specific_shared(a, b, k=5):
        shared = propagated[a] & propagated[b]
        shared.discard(PHENOTYPIC_ABNORMALITY)
        specific = [t for t in shared if not any(t != s and t in ancestors(s) for s in shared)]
        return sorted(specific, key=lambda t: -ic[t])[:k]

    # Reactome: gene symbol -> capped pathways
    ncbi_to_gene = {v: k for k, v in gene_ncbi.items()}
    gene_pathways = collections.defaultdict(set)
    for pw, members in pw_genes.items():
        if len(members) <= PATHWAY_SIZE_CAP:
            for g in members:
                if g in ncbi_to_gene:
                    gene_pathways[ncbi_to_gene[g]].add(pw)

    def disease_pathways(d):
        return set().union(*(gene_pathways.get(g, set()) for g in d_genes[d]))

    print("4/6 selecting slice", file=sys.stderr)
    seeds = [f"OMIM:{o}" for o in SEED_OMIM if f"OMIM:{o}" in propagated]
    missing = [o for o in SEED_OMIM if f"OMIM:{o}" not in propagated]
    if missing:
        print(f"  warning: seeds not in universe: {missing}", file=sys.stderr)

    pathway_index = collections.defaultdict(set)
    for d in universe:
        for pw in disease_pathways(d):
            pathway_index[pw].add(d)

    selected = set(seeds)
    for s in seeds:
        sims = sorted(((similarity(s, d), d) for d in universe if d != s), reverse=True)
        selected.update(d for _, d in sims[:PHENO_NEIGHBOURS_PER_SEED])
        candidates = {}
        for pw in disease_pathways(s):
            for d in pathway_index[pw]:
                if d != s and not (d_genes[d] & d_genes[s]):
                    size = len(pw_genes[pw])
                    candidates[d] = min(candidates.get(d, size), size)
        ranked = sorted(candidates, key=lambda d: (candidates[d], -similarity(s, d)))
        selected.update(ranked[:PATHWAY_NEIGHBOURS_PER_SEED])
    selected = sorted(selected)

    print(f"5/6 building graph for {len(selected)} diseases", file=sys.stderr)
    nodes, edges = {}, []

    def informativeness(t):
        frac = counts[t] / n
        label = "High" if frac <= HIGH_FRACTION else "Moderate" if frac <= MODERATE_FRACTION else "Broad"
        return f"{label} ({frac:.1%} of diseases)"

    slice_genes = set()
    for d in selected:
        omim = d.split(":")[1]
        mondo_id, orpha = mondo.get(omim, (None, None))
        did = f"DIS_OMIM_{omim}"
        nodes[did] = {
            "id": did, "type": "disease", "label": d_names[d], "omim": omim,
            "code": f"ORPHA:{orpha}" if orpha else d, "mondo": mondo_id,
            "seed": d in seeds, "source": "HPO annotations (OMIM)",
        }
        for g in sorted(d_genes[d]):
            slice_genes.add(g)
            edges.append({"source": did, "target": f"GENE_{g}", "relationship": "CAUSED_BY_MUTATION",
                          "evidence_tier": "CURATED_DATABASE", "source_db": "HPO genes_to_disease (OMIM/mim2gene_medgen)"})
        top_terms = sorted(d_terms[d], key=lambda t: -ic.get(t, 0))[:PHENOTYPES_SHOWN_PER_DISEASE]
        for t in top_terms:
            f = d_freq.get((d, t))
            edges.append({"source": did, "target": t, "relationship": "HAS_PHENOTYPE",
                          "frequency": hp_names.get(f, f) if f else None,
                          "evidence_tier": "CURATED_DATABASE", "source_db": "HPO phenotype.hpoa"})
            nodes[t] = {"id": t, "type": "symptom", "label": hp_names.get(t, t), "hpo_id": t,
                        "ic": round(ic.get(t, 0), 3), "informativeness": informativeness(t)}

    for g in sorted(slice_genes):
        nodes[f"GENE_{g}"] = {"id": f"GENE_{g}", "type": "gene", "label": g,
                              "ncbi_gene": gene_ncbi.get(g), "source": "HPO genes_to_disease"}

    # Pathways: keep those shared by >= 2 slice genes, plus each gene's smallest pathways
    pathway_genes_in_slice = collections.defaultdict(set)
    for g in slice_genes:
        for pw in gene_pathways.get(g, ()):
            pathway_genes_in_slice[pw].add(g)
    keep = {pw for pw, gs in pathway_genes_in_slice.items() if len(gs) >= 2}
    for g in slice_genes:
        keep.update(sorted(gene_pathways.get(g, ()), key=lambda p: len(pw_genes[p]))[:SMALLEST_PATHWAYS_PER_GENE])
    for pw in sorted(keep):
        nodes[pw] = {"id": pw, "type": "pathway", "label": pw_names[pw], "database_id": f"REACTOME:{pw}",
                     "size": len(pw_genes[pw]), "source": "Reactome (lowest-level pathway)"}
        for g in sorted(pathway_genes_in_slice[pw]):
            edges.append({"source": f"GENE_{g}", "target": pw, "relationship": "IN_PATHWAY",
                          "evidence_tier": "CURATED_DATABASE", "source_db": "Reactome NCBI2Reactome"})

    # Phenotype similarity edges inside the slice (top-k per disease, undirected, deduplicated)
    pairs = {}
    for a in selected:
        sims = sorted(((similarity(a, b), b) for b in selected if b != a), reverse=True)
        for s, b in sims[:SIMILARITY_EDGES_PER_DISEASE]:
            if s >= SIMILARITY_MIN:
                pairs[tuple(sorted((a, b)))] = s
    for (a, b), s in sorted(pairs.items()):
        edges.append({
            "source": f"DIS_OMIM_{a.split(':')[1]}", "target": f"DIS_OMIM_{b.split(':')[1]}",
            "relationship": "PHENOTYPE_SIMILAR", "score": round(s, 3),
            "shared_terms": [hp_names.get(t, t) for t in most_specific_shared(a, b)],
            "method": "IC-weighted Jaccard over ancestor-propagated HPO terms",
            "evidence_tier": "COMPUTED", "source_db": "HPO phenotype.hpoa",
        })

    # Similarity of every pair in the slice (compact; edges above keep only the strongest pairs)
    pair_similarity = []
    for i, a in enumerate(selected):
        for b in selected[i + 1:]:
            s = similarity(a, b)
            if s >= 0.01:
                pair_similarity.append([f"DIS_OMIM_{a.split(':')[1]}", f"DIS_OMIM_{b.split(':')[1]}", round(s, 3)])

    print("6/6 writing", file=sys.stderr)
    graph = {
        "metadata": {
            "built": date.today().isoformat(),
            "hpo_annotations_version": hpoa_version,
            "sources": SOURCES,
            "parameters": {
                "seed_omim": SEED_OMIM, "min_terms": MIN_TERMS, "pathway_size_cap": PATHWAY_SIZE_CAP,
                "pheno_neighbours_per_seed": PHENO_NEIGHBOURS_PER_SEED,
                "pathway_neighbours_per_seed": PATHWAY_NEIGHBOURS_PER_SEED,
                "similarity_edges_per_disease": SIMILARITY_EDGES_PER_DISEASE, "similarity_min": SIMILARITY_MIN,
            },
            "universe_size": n,
        },
        "nodes": list(nodes.values()),
        "edges": edges,
        "pair_similarity": pair_similarity,
    }
    with open(OUT_PATH, "w", encoding="utf-8") as fh:
        json.dump(graph, fh, indent=1)
    by_type = collections.Counter(v["type"] for v in nodes.values())
    print(f"wrote {OUT_PATH}: {dict(by_type)}, {len(edges)} edges", file=sys.stderr)


if __name__ == "__main__":
    main()
