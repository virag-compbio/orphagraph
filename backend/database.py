"""
Assembles the Orphagraph Atlas knowledge graph from three layers:

  - Imported layer: backend/data/graph.json, rebuilt by `python3 backend/ingest/build_graph.py`
    (HPO, OMIM gene links, Reactome, MONDO cross-references, computed phenotype similarity).
  - Literature layer: backend/data/literature.json, rebuilt by `python3 backend/ingest/extract_literature.py`
    (claims extracted from PubMed abstracts with verbatim quotes, papers, last-author investigators).
  - Curated layer: backend/curated.py (drugs, trials, publications, patient groups, assets,
    investigators, literature-sourced edges and display metadata).

Curated diseases are merged onto imported ones by OMIM id and take the curated node id (e.g. DIS_NGLY1),
so curated edges keep working. Identifiers and computed fields always come from the import.
When the same (source, target, relationship) edge exists in both layers, the curated edge wins.
"""

import json
import os
import sys
from typing import Any, Dict

from curated import CURATED

GRAPH_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "graph.json")
LITERATURE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "literature.json")

# Fields where the imported value is authoritative even if a curated node also sets them
IMPORT_AUTHORITATIVE = {"omim", "code", "mondo", "ic", "informativeness", "ncbi_gene", "source"}


def _load_imported() -> Dict[str, Any]:
    if not os.path.exists(GRAPH_PATH):
        print(f"[atlas] {GRAPH_PATH} not found; run `python3 backend/ingest/build_graph.py`. "
              "Serving the curated layer only.", file=sys.stderr)
        return {"metadata": {}, "nodes": [], "edges": []}
    with open(GRAPH_PATH, encoding="utf-8") as fh:
        return json.load(fh)


def _load_literature() -> Dict[str, Any]:
    if not os.path.exists(LITERATURE_PATH):
        return {"metadata": {}, "nodes": [], "edges": []}
    with open(LITERATURE_PATH, encoding="utf-8") as fh:
        return json.load(fh)


def _merge(imported: Dict[str, Any], curated: Dict[str, Any], literature: Dict[str, Any]) -> Dict[str, Any]:
    curated_by_omim = {n["omim"]: n["id"] for n in curated["nodes"] if n.get("type") == "disease" and n.get("omim")}
    alias = {n["id"]: curated_by_omim[n["omim"]] for n in imported["nodes"]
             if n.get("type") == "disease" and n.get("omim") in curated_by_omim}

    nodes: Dict[str, Dict[str, Any]] = {}
    for n in imported["nodes"]:
        nid = alias.get(n["id"], n["id"])
        nodes[nid] = {**n, "id": nid}
    # Literature nodes use final (curated) ids; they never overwrite imported or curated nodes
    for n in literature["nodes"]:
        nodes.setdefault(n["id"], dict(n))
    for n in curated["nodes"]:
        base = nodes.get(n["id"])
        if base is None:
            nodes[n["id"]] = dict(n)
            continue
        merged = {**base, **{k: v for k, v in n.items() if k not in IMPORT_AUTHORITATIVE}}
        if base.get("type") == "disease" and base.get("label") != n.get("label"):
            merged["omim_name"] = base.get("label")
        nodes[n["id"]] = merged

    edges: Dict[tuple, Dict[str, Any]] = {}
    for e in imported["edges"]:
        e = {**e, "source": alias.get(e["source"], e["source"]), "target": alias.get(e["target"], e["target"])}
        edges[(e["source"], e["target"], e["relationship"])] = e
    for e in literature["edges"]:
        if e["source"] in nodes and e["target"] in nodes:
            edges.setdefault((e["source"], e["target"], e["relationship"]), dict(e))
    for e in curated["edges"]:
        edges[(e["source"], e["target"], e["relationship"])] = dict(e)

    pair_similarity = [[alias.get(a, a), alias.get(b, b), s] for a, b, s in imported.get("pair_similarity", [])]

    return {"metadata": {**imported.get("metadata", {}), "literature": literature.get("metadata", {})},
            "nodes": list(nodes.values()), "edges": list(edges.values()), "pair_similarity": pair_similarity}


KNOWLEDGE_GRAPH: Dict[str, Any] = _merge(_load_imported(), CURATED, _load_literature())
