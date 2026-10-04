"""
Orphagraph Atlas: graph engine and journey reasoning.
"""

import collections
import re

import networkx as nx
from typing import Dict, List, Any, Optional
from database import KNOWLEDGE_GRAPH
import moonshot

class RareDiseaseGraphEngine:
    def __init__(self):
        self.raw_data = KNOWLEDGE_GRAPH
        self._mechanism_cache: Dict[str, Dict[str, Dict[str, Any]]] = {}
        self._pair_similarity = {frozenset((a, b)): s for a, b, s in self.raw_data.get("pair_similarity", [])}
        self.G = nx.MultiDiGraph()
        self.undirected_G = nx.Graph()
        self._build_graph()

    def _build_graph(self):
        self.G.clear()
        self.undirected_G.clear()
        for node in self.raw_data["nodes"]:
            self.G.add_node(node["id"], **node)
            self.undirected_G.add_node(node["id"], **node)

        for edge in self.raw_data["edges"]:
            src = edge["source"]
            tgt = edge["target"]
            self.G.add_edge(src, tgt, **edge)
            self.undirected_G.add_edge(src, tgt, **edge)

    def get_full_graph(self) -> Dict[str, Any]:
        return {
            "nodes": [dict(self.G.nodes[n]) for n in self.G.nodes()],
            "edges": [
                {**self.G.edges[e], "source": e[0], "target": e[1]}
                for e in self.G.edges(keys=True)
            ],
            "stats": self.get_graph_stats()
        }

    def get_graph_stats(self) -> Dict[str, Any]:
        node_counts = {}
        for _, data in self.G.nodes(data=True):
            ntype = data.get("type", "unknown")
            node_counts[ntype] = node_counts.get(ntype, 0) + 1

        return {
            "total_nodes": self.G.number_of_nodes(),
            "total_edges": self.G.number_of_edges(),
            "node_breakdown": node_counts,
            "monogenic_diseases": node_counts.get("disease", 0),
            "repurposing_drugs": node_counts.get("drug", 0),
            "research_assets": node_counts.get("asset", 0),
            "key_investigators": node_counts.get("investigator", 0),
            "clinical_trials": node_counts.get("trial", 0),
            "patient_foundations": node_counts.get("patient_group", 0),
            "evidence_publications": node_counts.get("publication", 0)
        }

    def search_nodes(self, query: str, node_type: Optional[str] = None) -> List[Dict[str, Any]]:
        query_lower = query.lower().strip()
        results = []
        for n, data in self.G.nodes(data=True):
            if node_type and data.get("type") != node_type:
                continue
            
            label = str(data.get("label", "")).lower()
            code = str(data.get("code", "")).lower()
            hpo = str(data.get("hpo_id", "")).lower()
            desc = str(data.get("description", "")).lower()
            hgnc = str(data.get("hgnc", "")).lower()
            synonyms = " ".join(data.get("synonyms", [])).lower()
            
            if (query_lower in label or 
                query_lower in code or 
                query_lower in hpo or 
                query_lower in desc or 
                query_lower in hgnc or
                query_lower in synonyms):
                results.append(dict(data))
        return results

    def get_node_neighborhood(self, node_id: str, depth: int = 1) -> Dict[str, Any]:
        if node_id not in self.G:
            return {"nodes": [], "edges": []}

        current_layer = {node_id}
        visited = set(current_layer)

        for _ in range(depth):
            next_layer = set()
            for n in current_layer:
                neighbors = set(self.undirected_G.neighbors(n))
                next_layer.update(neighbors - visited)
            visited.update(next_layer)
            current_layer = next_layer

        subgraph_nodes = [dict(self.G.nodes[n]) for n in visited]
        subgraph_edges = []

        for src, tgt, key, data in self.G.edges(keys=True, data=True):
            if src in visited and tgt in visited:
                subgraph_edges.append({**data, "source": src, "target": tgt})

        return {
            "nodes": subgraph_nodes,
            "edges": subgraph_edges,
            "focus_node": dict(self.G.nodes[node_id]) if node_id in self.G else None
        }

    def find_shortest_path(self, source_id: str, target_id: str) -> Dict[str, Any]:
        if source_id not in self.undirected_G or target_id not in self.undirected_G:
            return {"found": False, "nodes": [], "edges": [], "explanation": "Entity not found in graph."}

        try:
            # A contraindication is a warning, not a mechanistic link, so paths may not pass through it
            traversable = nx.subgraph_view(
                self.undirected_G,
                filter_edge=lambda u, v: self.undirected_G[u][v].get("relationship") != "CONTRAINDICATED_WARNING"
            )
            path = nx.shortest_path(traversable, source=source_id, target=target_id)
            nodes = [dict(self.G.nodes[n]) for n in path]
            edges = []
            
            for i in range(len(path) - 1):
                u, v = path[i], path[i+1]
                edge_data = None
                if self.G.has_edge(u, v):
                    edge_data = {**self.G.get_edge_data(u, v)[0], "source": u, "target": v}
                elif self.G.has_edge(v, u):
                    edge_data = {**self.G.get_edge_data(v, u)[0], "source": v, "target": u}
                if edge_data:
                    edges.append(edge_data)

            steps = [f"{n.get('label', n.get('id'))} ({n.get('type')})" for n in nodes]
            explanation = " ➔ ".join(steps)

            return {
                "found": True,
                "path_length": len(path) - 1,
                "path_nodes": nodes,
                "path_edges": edges,
                "explanation": explanation
            }
        except nx.NetworkXNoPath:
            return {
                "found": False,
                "nodes": [],
                "edges": [],
                "explanation": f"No mechanistic connection found between {source_id} and {target_id}."
            }

    EVIDENCE_TIER_RANK = {"CLINICAL_PROVEN": 0, "CLINICAL_OBSERVATIONAL": 1, "CLINICAL_CASE_REPORTS": 2,
                          "PRECLINICAL_VALIDATED": 3, "INFERRED_HYPOTHESIS": 4}
    RECRUITING_STATUSES = {"recruiting", "not yet recruiting", "enrolling by invitation"}

    def _edge_data(self, u: str, v: str, relationship: Optional[str] = None) -> Dict[str, Any]:
        """
        One edge between u and v. With `relationship`, the edge of that type; otherwise the first
        non-literature edge (literature claims sit alongside curated/database edges and must not hide them).
        """
        edges = list((self.G.get_edge_data(u, v) or {}).values())
        if relationship:
            edges = [e for e in edges if e.get("relationship") == relationship]
        else:
            edges = sorted(edges, key=lambda e: str(e.get("relationship", "")).startswith("LIT_"))
        return dict(edges[0]) if edges else {}

    def _has_edge(self, u: str, v: str, relationship: str) -> bool:
        return any(e.get("relationship") == relationship for e in (self.G.get_edge_data(u, v) or {}).values())

    def _is_recruiting(self, trial: Dict[str, Any]) -> bool:
        return str(trial.get("status", "")).strip().lower() in self.RECRUITING_STATUSES

    def _disease_trials(self, disease_id: str) -> List[Dict[str, Any]]:
        """Trials linked to the disease, recruiting ones first."""
        trials = [
            dict(self.G.nodes[t]) for t in self.G.successors(disease_id)
            if self.G.nodes[t].get("type") == "trial"
        ]
        return sorted(trials, key=lambda t: not self._is_recruiting(t))

    def _approved_drugs(self, disease_id: str) -> List[Dict[str, Any]]:
        return [
            dict(self.G.nodes[d]) for d in self.G.predecessors(disease_id)
            if self._has_edge(d, disease_id, "FDA_APPROVED_INDICATION")
        ]

    def _ranked_leads(self, disease_id: str, drugs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Re-scores each drug by its direct edge to this disease (a drug can be well supported
        for one disease and pure hypothesis for another), then sorts by evidence tier and confidence.
        Drugs reached only indirectly are kept as INFERRED_HYPOTHESIS; contraindicated drugs are
        excluded here and reported by _contraindicated_drugs instead.
        """
        leads = []
        for drug in drugs:
            edge = self._edge_data(drug["id"], disease_id)
            if edge.get("relationship") == "CONTRAINDICATED_WARNING":
                continue
            lead = dict(drug)
            lead["relationship"] = edge.get("relationship", "INDIRECT")
            lead["evidence_tier"] = edge.get("evidence_tier", "INFERRED_HYPOTHESIS")
            lead["repurposing_confidence"] = edge.get("confidence", min(drug.get("repurposing_confidence", 0.3), 0.3))
            if edge.get("source_pmid"):
                lead["source_pmid"] = edge["source_pmid"]
            leads.append(lead)
        return sorted(leads, key=lambda d: (self.EVIDENCE_TIER_RANK.get(d["evidence_tier"], 3), -d["repurposing_confidence"]))

    def _contraindicated_drugs(self, disease_id: str) -> List[Dict[str, Any]]:
        return [
            {"label": self.G.nodes[d].get("label"), "reason": self._edge_data(d, disease_id, "CONTRAINDICATED_WARNING").get("mechanism")}
            for d in self.G.predecessors(disease_id)
            if self._has_edge(d, disease_id, "CONTRAINDICATED_WARNING")
        ]

    MAX_MECHANISM_NEIGHBOURS = 6
    MAX_PHENOTYPE_NEIGHBOURS = 5
    ASSET_RELATION_TEXT = {
        "VALIDATED_DISEASE_MODEL": "Validated model of this condition",
        "REUSABLE_STUDY_DESIGN": "Study design recorded as reusable for this condition",
        "DISEASE_BIOMARKER_ASSAY": "Biomarker assay for this condition",
        "REUSABLE_CROSS_DISEASE_ASSET": "Proposed cross-disease reuse (unverified hypothesis)",
    }

    def _out(self, node_id: str, relationship: Optional[str] = None, node_type: Optional[str] = None) -> List[str]:
        return [
            v for v in self.G.successors(node_id)
            if (relationship is None or self._has_edge(node_id, v, relationship))
            and (node_type is None or self.G.nodes[v].get("type") == node_type)
        ]

    def _in(self, node_id: str, relationship: Optional[str] = None, node_type: Optional[str] = None) -> List[str]:
        return [
            u for u in self.G.predecessors(node_id)
            if (relationship is None or self._has_edge(u, node_id, relationship))
            and (node_type is None or self.G.nodes[u].get("type") == node_type)
        ]

    def _label(self, node_id: str) -> str:
        return self.G.nodes[node_id].get("label", node_id)

    def _disease_ids(self) -> List[str]:
        return [n for n, d in self.G.nodes(data=True) if d.get("type") == "disease"]

    def _disease_mechanisms(self, disease_id: str) -> Dict[str, Dict[str, Any]]:
        """
        Pathways disrupted by the disease, either directly or through its causal gene. A variant-effect
        direction (gain/loss of function) recorded on the disease->pathway or disease->gene edge is carried along.
        """
        if disease_id not in self._mechanism_cache:
            mechanisms = {}
            for p in self._out(disease_id, node_type="pathway"):
                mechanisms[p] = {"via": "direct annotation", "direction": self._edge_data(disease_id, p).get("direction")}
            for g in self._out(disease_id, "CAUSED_BY_MUTATION"):
                direction = self._edge_data(disease_id, g).get("direction")
                for p in self._out(g, node_type="pathway"):
                    mechanisms.setdefault(p, {"via": f"{self._label(g)} gene", "direction": direction})
            self._mechanism_cache[disease_id] = mechanisms
        return self._mechanism_cache[disease_id]

    def _pathway_weight(self, pathway_id: str) -> float:
        """Smaller pathways are more specific evidence of a shared mechanism."""
        size = self.G.nodes[pathway_id].get("size")
        return min(1.0, 10 / size) if size else 1.0

    def _phenotype_similarity(self, a: str, b: str) -> Optional[Dict[str, Any]]:
        for u, v in ((a, b), (b, a)):
            for data in (self.G.get_edge_data(u, v) or {}).values():
                if data.get("relationship") == "PHENOTYPE_SIMILAR":
                    return data
        return None

    def _related_diseases(self, disease_id: str) -> Dict[str, Any]:
        """
        Compares the disease with every other disease in the atlas.
        - Shared pathway with compatible (or unknown) variant direction -> mechanism neighbour.
        - Shared pathway disrupted in the opposite direction (GoF vs LoF) -> counterexample.
        - Phenotype similarity (precomputed HPO edge) without a shared pathway -> phenotype neighbour,
          which is weaker and not a mechanism claim.
        Only the strongest neighbours of each kind are returned; totals report how many exist.
        """
        mine = self._disease_mechanisms(disease_id)
        my_genes = set(self._out(disease_id, "CAUSED_BY_MUTATION"))
        mechanism, phenotype, counterexamples = [], [], []
        others = [d for d in self._disease_ids() if d != disease_id]

        for other in others:
            theirs = self._disease_mechanisms(other)
            compatible, opposite = [], []
            for p in mine.keys() & theirs.keys():
                a, b = mine[p]["direction"], theirs[p]["direction"]
                (opposite if a and b and a != b else compatible).append(p)
            # Deterministic order (set iteration order varies between processes)
            compatible.sort(key=lambda p: (self.G.nodes[p].get("size") or 0, self._label(p)))
            opposite.sort(key=self._label)
            similarity = self._phenotype_similarity(disease_id, other)   # strong pairs only (graph edge)
            sim_score = self._pair_similarity.get(frozenset((disease_id, other)), similarity.get("score", 0) if similarity else 0)

            if opposite:
                counterexamples.append({
                    "disease_id": other,
                    "label": self._label(other),
                    "pathway": ", ".join(self._label(p) for p in opposite),
                    "this_direction": mine[opposite[0]]["direction"],
                    "their_direction": theirs[opposite[0]]["direction"],
                })
            if not compatible and not similarity:
                continue
            entry = {
                "disease_id": other,
                "label": self._label(other),
                "basis": "mechanism" if compatible else "phenotype",
                # Most specific shared pathway plus phenotype similarity; summing over pathways would let
                # hub genes that sit in dozens of pathways dominate
                "score": round(max((self._pathway_weight(p) for p in compatible), default=0) + 2 * sim_score, 3),
                "shared_pathways": [self._label(p) for p in compatible],
                "shared_pathway_ids": compatible,
                "shared_genes": sorted(self._label(g) for g in my_genes & set(self._out(other, "CAUSED_BY_MUTATION"))),
                "phenotype_similarity": sim_score,
                "shared_phenotypes": [
                    {"label": t, "informative": True} for t in (similarity or {}).get("shared_terms", [])
                ],
            }
            (mechanism if compatible else phenotype).append(entry)

        mechanism.sort(key=lambda r: (-r["score"], r["label"]))
        phenotype.sort(key=lambda r: (-r["score"], r["label"]))
        return {
            "related": mechanism[:self.MAX_MECHANISM_NEIGHBOURS] + phenotype[:self.MAX_PHENOTYPE_NEIGHBOURS],
            "counterexamples": counterexamples,
            "totals": {"mechanism": len(mechanism), "phenotype": len(phenotype)},
            "compared": len(others),
        }

    @staticmethod
    def _short_list(items: List[str], k: int = 2) -> str:
        return ", ".join(items[:k]) + (f" and {len(items) - k} more" if len(items) > k else "")

    def _mechanism_insight(self, disease_id: str, mechanisms: Dict[str, Any], rel: Dict[str, Any]) -> str:
        name = self._label(disease_id)
        mech = [r for r in rel["related"] if r["basis"] == "mechanism"]
        pheno = [r for r in rel["related"] if r["basis"] == "phenotype"]
        parts = []
        if mech:
            top = mech[0]
            gene_note = (f" Same gene ({', '.join(top['shared_genes'])}), so variant effects may differ."
                         if top["shared_genes"] else "")
            parts.append(
                f"{name} shares a disrupted Reactome pathway with {rel['totals']['mechanism']} disease(s) in the atlas. "
                f"Closest: {top['label']} ({self._short_list(top['shared_pathways'])}; phenotype similarity "
                f"{top['phenotype_similarity']:.2f}).{gene_note}")
        if pheno:
            top = pheno[0]
            parts.append(
                f"{rel['totals']['phenotype']} disease(s) have similar phenotypes without a recorded shared pathway, "
                f"which is not evidence of a shared mechanism. Most similar: {top['label']} (similarity "
                f"{top['phenotype_similarity']:.2f}: {self._short_list([p['label'] for p in top['shared_phenotypes']], 3)}).")
        for c in rel["counterexamples"]:
            parts.append(
                f"Counterexample: {c['label']} disrupts the same pathway ({c['pathway']}) in the opposite direction "
                f"({c['this_direction'].replace('_', ' ')} here vs {c['their_direction'].replace('_', ' ')}), "
                f"so it belongs in a separate cluster with a different treatment strategy.")
        if not mech and not pheno and not rel["counterexamples"]:
            threshold = self.raw_data.get("metadata", {}).get("parameters", {}).get("similarity_min")
            parts.append(
                f"No supported connection found for {name}. Compared with {rel['compared']} other diseases in the atlas "
                f"by shared Reactome pathways ({len(mechanisms)} recorded for {name}) and HPO phenotype similarity"
                + (f" (threshold {threshold})" if threshold else "") + ". "
                "Adding pathway annotations and literature evidence for this condition is the next step to test for neighbours.")
        elif not mech:
            parts.append(f"No shared pathway is recorded for {name} in the atlas.")
        return " ".join(parts)

    def _asset_home_diseases(self, asset_id: str) -> List[str]:
        """Diseases the asset was built for (excludes proposed cross-disease reuse)."""
        return [self._label(d) for d in self._out(asset_id, node_type="disease")
                if self._edge_data(asset_id, d).get("relationship") != "REUSABLE_CROSS_DISEASE_ASSET"]

    def _disease_assets(self, disease_id: str, rel: Dict[str, Any]) -> List[Dict[str, Any]]:
        name = self._label(disease_id)
        assets, seen = [], set()
        for a in self._in(disease_id, node_type="asset"):
            edge = self._edge_data(a, disease_id)
            node = self.G.nodes[a]
            assets.append({
                "id": a,
                "name": node.get("label"),
                "type": node.get("asset_type"),
                "custodian": node.get("custodian"),
                "for_disease": ", ".join(self._asset_home_diseases(a)) or name,
                "relation": edge.get("relationship"),
                "evidence_tier": edge.get("evidence_tier", "INFERRED_HYPOTHESIS"),
                "reusability": self.ASSET_RELATION_TEXT.get(edge.get("relationship"), "Linked to this condition"),
            })
            seen.add(a)
        for r in rel["related"]:
            if r["basis"] != "mechanism":
                continue
            for a in self._in(r["disease_id"], node_type="asset"):
                edge = self._edge_data(a, r["disease_id"])
                if a in seen or edge.get("relationship") == "REUSABLE_CROSS_DISEASE_ASSET":
                    continue
                node = self.G.nodes[a]
                assets.append({
                    "id": a,
                    "name": node.get("label"),
                    "type": node.get("asset_type"),
                    "custodian": node.get("custodian"),
                    "for_disease": r["label"],
                    "relation": "RELATED_DISEASE_ASSET",
                    "evidence_tier": "INFERRED_HYPOTHESIS",
                    "reusability": f"Built for {r['label']} (shares {', '.join(r['shared_pathways'])}); check whether it applies to {name} before reuse.",
                })
                seen.add(a)
        return assets

    MAX_INVESTIGATORS = 5

    def _disease_investigators(self, disease_id: str, mechanisms: Dict[str, Any], assets: List[Dict[str, Any]], rel: Dict[str, Any]) -> List[Dict[str, Any]]:
        name = self._label(disease_id)
        asset_ids = {a["id"] for a in assets if a["relation"] != "RELATED_DISEASE_ASSET"}
        trial_ids = {t["id"] for t in self._disease_trials(disease_id)}
        related_mech = {r["disease_id"]: r for r in rel["related"] if r["basis"] == "mechanism"}
        investigators = []
        for k, node in self.G.nodes(data=True):
            if node.get("type") != "investigator":
                continue
            reasons, papers, direct = [], [], False
            other_diseases = []
            for t in self.G.successors(k):
                for edge in (self.G.get_edge_data(k, t) or {}).values():
                    r = edge.get("relationship")
                    if t == disease_id and r == "PUBLISHES_ON":
                        n = edge.get("n_papers", 1)
                        role = "Last author" if node.get("source") == "PubMed author list" else "Author"
                        reasons.append(f"{role} of {n} PubMed paper{'s' if n != 1 else ''} on {name} in the atlas")
                        papers += edge.get("pmids", [])
                        direct = True
                    elif t in trial_ids and r == "PRINCIPAL_INVESTIGATOR":
                        reasons.append(f"Principal investigator of {self._label(t)} ({self.G.nodes[t].get('nct_id')})")
                        direct = True
                    elif t == disease_id:
                        reasons.append(f"Principal investigator for {name}")
                        direct = True
                    elif t in asset_ids:
                        reasons.append(f"Develops {self._label(t)}")
                        direct = True
                    elif t in mechanisms:
                        reasons.append(f"Studies {self._label(t)}, which is disrupted in {name}")
                        direct = True
                    elif t in related_mech:
                        reasons.append(f"Works on {self._label(t)}, which shares {', '.join(related_mech[t]['shared_pathways'][:2])}")
                    elif r == "PUBLISHES_ON" and self.G.nodes[t].get("type") == "disease":
                        other_diseases.append(self._label(t))
            if not reasons:
                continue
            if other_diseases:
                # Network overlap: the same researcher already publishes on another disease community
                reasons.append(f"also publishes on {', '.join(sorted(set(other_diseases)))}")
            investigators.append({
                "name": node.get("label"),
                "institution": node.get("institution"),
                "role": node.get("role"),
                "email": node.get("email"),
                "connection": "; ".join(dict.fromkeys(reasons)),
                "papers": sorted(set(papers)),
                "other_diseases": sorted(set(other_diseases)),
                "direct": direct,
                "source": "curated" if k.startswith("KOL_") else node.get("source", "literature"),
            })
        # Curated contacts first, then researchers bridging communities, then by number of papers
        investigators.sort(key=lambda i: (not i["direct"], i["source"] != "curated", "Principal investigator" not in i["connection"],
                                          not i["other_diseases"], -len(i["papers"])))
        return investigators[:self.MAX_INVESTIGATORS]

    def _literature_claims(self, disease_id: str) -> Dict[str, Any]:
        """Literature-extracted claims touching the disease, with contradiction flags for drug effects."""
        readable = {
            "LIT_CAUSED_BY": "is caused by variants in", "LIT_HAS_PHENOTYPE": "has the feature",
            "LIT_DRUG_IMPROVES": "improves", "LIT_DRUG_NO_EFFECT": "showed no effect on", "LIT_DRUG_WORSENS": "worsens",
        }
        claims = []
        for u, v, edge in list(self.G.out_edges(disease_id, data=True)) + list(self.G.in_edges(disease_id, data=True)):
            r = edge.get("relationship", "")
            if not r.startswith("LIT_"):
                continue
            contradicts = False
            if r in ("LIT_DRUG_NO_EFFECT", "LIT_DRUG_WORSENS"):
                # Contradicts a positive literature claim or a curated candidate/indication for the same drug
                positive = {"LIT_DRUG_IMPROVES", "REPURPOSING_CANDIDATE", "EFFECTIVE_INDICATION", "FDA_APPROVED_INDICATION"}
                contradicts = any(e.get("relationship") in positive for e in (self.G.get_edge_data(u, v) or {}).values())
            claims.append({
                "subject": self._label(u), "relation": readable.get(r, r), "object": self._label(v),
                "relationship": r, "n_papers": edge.get("n_papers", len(edge.get("evidence", []))),
                "evidence": edge.get("evidence", []), "contradicts": contradicts,
            })
        claims.sort(key=lambda c: (not c["contradicts"], -c["n_papers"], c["object"]))
        pmids = {e["pmid"] for c in claims for e in c["evidence"]}
        return {"claims": claims, "n_papers": len(pmids), "contradictions": [c for c in claims if c["contradicts"]]}

    def _disease_groups(self, disease_id: str, rel: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
        # Disease-specific organizations first (fewest linked diseases), then umbrella organizations
        own_ids = sorted(self._in(disease_id, "PATIENT_ADVOCACY_LEADER"),
                         key=lambda g: (len(self._out(g, "PATIENT_ADVOCACY_LEADER")), self._label(g)))
        own = [dict(self.G.nodes[g]) for g in own_ids]
        related, seen = [], set(own_ids)
        for r in rel["related"]:
            if r["basis"] == "mechanism":
                for g in self._in(r["disease_id"], "PATIENT_ADVOCACY_LEADER"):
                    if g not in seen:
                        seen.add(g)
                        related.append({**dict(self.G.nodes[g]), "related_disease": r["label"], "shared_pathways": r["shared_pathways"]})
        return {"own": own, "related": related}

    def _disease_context(self, disease_id: str) -> Dict[str, Any]:
        mechanisms = self._disease_mechanisms(disease_id)
        rel = self._related_diseases(disease_id)
        assets = self._disease_assets(disease_id, rel)
        return {
            "mechanisms": mechanisms,
            "related": rel,
            "assets": assets,
            "investigators": self._disease_investigators(disease_id, mechanisms, assets, rel),
            "groups": self._disease_groups(disease_id, rel),
            "leads": self._ranked_leads(disease_id, [dict(self.G.nodes[d]) for d in self._in(disease_id, node_type="drug")]),
        }

    def is_disease(self, node_id: str) -> bool:
        return node_id in self.G and self.G.nodes[node_id].get("type") == "disease"

    def generate_marias_journey(self, disease_id: str = "DIS_NGLY1") -> Dict[str, Any]:
        """
        Executes the 4-step journey from the challenge brief, built from the graph:
        1. Isolated Diagnosis Search
        2. Disrupted Mechanism & Hidden Cluster (or an explicit gap)
        3. Reusable Assets & Key Opinion Leaders linked to the disease or its mechanism neighbours
        4. Sourced Proposal & 'Action This Week'
        """
        if not self.is_disease(disease_id):
            raise KeyError(f"Disease {disease_id} not found.")

        disease = dict(self.G.nodes[disease_id])
        name = disease.get("label")
        ctx = self._disease_context(disease_id)
        mechanisms, rel, assets = ctx["mechanisms"], ctx["related"], ctx["assets"]
        investigators, groups, drugs = ctx["investigators"], ctx["groups"], ctx["leads"]
        trials = self._disease_trials(disease_id)
        approved = self._approved_drugs(disease_id)

        if approved:
            treatment_line = f"Approved therapy recorded in the atlas: {', '.join(d.get('label') for d in approved)}."
        else:
            treatment_line = "No approved treatment is recorded in the atlas."

        if trials:
            n_recruiting = sum(self._is_recruiting(t) for t in trials)
            trial_list = "; ".join(f"{t.get('label')} ({t.get('nct_id')}, {t.get('phase')}, {t.get('status')})" for t in trials)
            trial_status = f"{len(trials)} registered stud{'y' if len(trials) == 1 else 'ies'} in the atlas, {n_recruiting} currently recruiting: {trial_list}."
        else:
            trial_status = "No registered studies in the atlas for this condition."

        step1 = {
            "step_title": "1. Maria's Isolated Diagnosis",
            "prompt": f"Maria's child is diagnosed with {name} ({disease.get('code')}). {treatment_line}",
            "treatment_line": treatment_line,
            "trials": [{k: t.get(k) for k in ("label", "nct_id", "phase", "status", "intervention")} | {"recruiting": self._is_recruiting(t)}
                       for t in trials],
            "status": trial_status,
            "disease": disease
        }

        # Primary mechanism: the pathway shared with most neighbours, then the most specific (smallest)
        shared_counts = collections.Counter(p for r in rel["related"] if r["basis"] == "mechanism" for p in r["shared_pathway_ids"])
        primary = min(mechanisms, key=lambda p: (-shared_counts[p], self.G.nodes[p].get("size") or 0)) if mechanisms else None
        step2 = {
            "step_title": "2. Disrupted Mechanism & Hidden Disease Cluster",
            "primary_mechanism": self._label(primary) if primary else "No mechanism recorded in the atlas",
            "insight": self._mechanism_insight(disease_id, mechanisms, rel),
            "connecting_pathway": dict(self.G.nodes[primary]) if primary else None,
            # Diseases in the atlas sharing the primary pathway, and the condition's other recorded pathways
            "connecting_pathway_shared_with": shared_counts[primary] if primary else 0,
            "other_pathways": sorted(
                ({"id": p, "label": self._label(p), "via": mechanisms[p]["via"]} for p in mechanisms if p != primary),
                key=lambda x: (not self.G.nodes[x["id"]].get("description"), x["label"])),
            "related_diseases": rel["related"],
            "has_phenotypes": bool(self._out(disease_id, "HAS_PHENOTYPE")),
            "counterexamples": rel["counterexamples"],
            "repurposing_leads": drugs,
            "literature": self._literature_claims(disease_id),
            "contraindications": self._contraindicated_drugs(disease_id)
        }

        step3 = {
            "step_title": "3. Reusable Research Assets & Key Opinion Leaders",
            "reusable_assets": [
                {k: a[k] for k in ("name", "type", "custodian", "reusability", "for_disease", "evidence_tier")}
                for a in assets
            ],
            "key_collaborators": [
                {k: i[k] for k in ("name", "institution", "role", "email", "connection", "papers", "other_diseases", "source")}
                for i in investigators
            ]
        }

        # Step 4: every action names a node found above; gaps are stated instead of filled in.
        actions = []
        if investigators:
            k = investigators[0]
            where = f" ({k['institution']})" if k.get("institution") else ""
            actions.append(f"**Contact {k['name']}**{where}: {k['connection']}. Ask about collaboration and access to existing models or protocols.")
        else:
            actions.append(f"**No investigator is linked to {name} in the atlas.** Search PubMed and NIH RePORTER for groups working on this condition and add them.")

        screen_lead = next((d for d in drugs if d["relationship"] == "REPURPOSING_CANDIDATE"), None)
        model = next((a for a in assets if a["relation"] == "VALIDATED_DISEASE_MODEL"), None)
        if screen_lead:
            where = f"using {model['name']}" if model else "in patient-derived cells (no validated model of this condition is recorded in the atlas)"
            actions.append(f"**Test repurposing candidate {screen_lead.get('label')}** (evidence: {screen_lead['evidence_tier']}) {where}.")
        else:
            actions.append("**No repurposing candidate is recorded for this condition.** Prioritise building or accessing a disease model for screening.")

        if groups["own"]:
            actions.append(f"**Coordinate with {groups['own'][0].get('label')}** on registry and natural-history data.")
        else:
            actions.append("**No patient organization is linked in the atlas.** Check the NORD, Global Genes and Orphanet directories.")
        for g in groups["related"][:1]:
            actions.append(f"**Compare registry and study designs with {g.get('label')}** ({g['related_disease']}, which shares {', '.join(g['shared_pathways'])}).")
        for c in rel["counterexamples"]:
            actions.append(f"**Do not pool treatment strategy with {c['label']}**: same pathway ({c['pathway']}), opposite direction of effect.")

        if investigators:
            k = investigators[0]
            mech_related = [r for r in rel["related"] if r["basis"] == "mechanism"]
            lines = [
                f"Subject: {name}: possible research collaboration",
                "",
                f"Dear {k['name']},",
                "",
                f"I lead a patient organization for {name}. Our rare disease atlas links your work to our condition: {k['connection']}.",
            ]
            if mech_related:
                r = mech_related[0]
                lines.append(f"The atlas also shows that {name} shares {', '.join(r['shared_pathways'])} with {r['label']}, which may make findings transferable between the two communities.")
            if assets:
                lines.append(f"We would like to learn whether existing resources ({'; '.join(a['name'] for a in assets[:3])}) could support research on {name}.")
            lines += [
                "These links come from curated database and literature records and still need expert review.",
                "",
                "Could we schedule a short call to discuss whether a collaboration makes sense?",
                "",
                "Sincerely,",
                "Maria (Patient Organization Leader)",
            ]
            email = "\n".join(lines)
        else:
            email = f"No investigator is linked to {name} in the atlas yet, so no outreach draft was generated."

        step4 = {
            "step_title": "4. Sourced Proposal & 'Action This Week'",
            "action_this_week": [f"{i}. {a}" for i, a in enumerate(actions, 1)],
            "draft_proposal_email": email
        }

        return {
            "disease_id": disease_id,
            "step1_diagnosis": step1,
            "step2_mechanism": step2,
            "step3_assets": step3,
            "step4_action": step4
        }

    def calculate_moonshot_10x(self) -> Dict[str, Any]:
        """Sourced baseline vs assumption-based atlas route (see moonshot.py)."""
        return moonshot.calculate()

    def generate_action_dossier(self, disease_id: str) -> Dict[str, Any]:
        if not self.is_disease(disease_id):
            return {"error": f"Disease {disease_id} not found."}

        disease = dict(self.G.nodes[disease_id])
        name = disease.get("label")
        neighborhood = self.get_node_neighborhood(disease_id, depth=2)
        ctx = self._disease_context(disease_id)
        mechanisms, rel = ctx["mechanisms"], ctx["related"]
        mech_related = [r for r in rel["related"] if r["basis"] == "mechanism"]

        connected_genes = [dict(self.G.nodes[g]) for g in self._out(disease_id, "CAUSED_BY_MUTATION")]
        connected_symptoms = [dict(self.G.nodes[s]) for s in self._out(disease_id, "HAS_PHENOTYPE")]
        top_pathways = sorted(mechanisms, key=lambda p: self.G.nodes[p].get("size") or 0)[:10]
        connected_pathways = [dict(self.G.nodes[p]) for p in top_pathways]
        connected_drugs = ctx["leads"]
        connected_trials = self._disease_trials(disease_id)
        connected_groups = ctx["groups"]["own"]
        connected_assets = ctx["assets"]
        connected_kols = ctx["investigators"]

        # Evidence: publications supporting the disease, its genes or pathways, or a non-hypothetical lead for it
        evidence_targets = {disease_id, *mechanisms, *(g["id"] for g in connected_genes),
                            *(d["id"] for d in connected_drugs if d["evidence_tier"] != "INFERRED_HYPOTHESIS")}
        connected_pubs = [
            dict(self.G.nodes[n]) for n, d in self.G.nodes(data=True)
            if d.get("type") == "publication" and evidence_targets & set(self._out(n, "SUPPORTS_EVIDENCE"))
        ]

        # Maria's Journey
        marias_journey = self.generate_marias_journey(disease_id)

        # Researcher Action Plan
        repurposing_hypotheses = []
        for drug in connected_drugs:
            repurposing_hypotheses.append({
                "molecule_name": drug.get("label"),
                "drugbank_id": drug.get("drugbank_id"),
                "status": drug.get("fda_status"),
                "confidence_score": drug["repurposing_confidence"],
                "evidence_tier": drug["evidence_tier"],
                "mechanism_of_action": drug.get("mechanism"),
                "target_genes": drug.get("target_genes", []),
                "source_pmid": drug.get("source_pmid"),
                # Generic next experiments: test the lead in the models the atlas records for this disease
                "recommended_assays": [f"Test {drug.get('label')} in {a['name']}" for a in connected_assets
                                       if a["relation"] == "VALIDATED_DISEASE_MODEL"]
                                      or ["No disease model is recorded in the atlas; a model is needed before testing"]
            })

        silo_breaking_synergies = []
        for p in top_pathways:
            sharing = [r["label"] for r in mech_related if p in r["shared_pathway_ids"]]
            silo_breaking_synergies.append({
                "shared_pathway": self._label(p),
                "synergy_insight": (
                    f"Also disrupted in {', '.join(sharing)}: candidate for shared assays and compound screening."
                    if sharing else
                    f"Not shared with any other disease in the atlas yet."
                )
            })

        researcher_actions = {
            "disease_name": name,
            "orpha_code": disease.get("code"),
            "omim_id": disease.get("omim"),
            "causal_genes": connected_genes,
            "target_pathways": connected_pathways,
            "repurposing_hypotheses": repurposing_hypotheses,
            "silo_breaking_synergies": silo_breaking_synergies,
            "evidence_base": connected_pubs,
            # Gaps computed from what the atlas does not contain for this disease
            "critical_research_voids": [gap for gap, missing in [
                ("No disease model (cell or animal) is recorded in the atlas.",
                 not any(a["relation"] == "VALIDATED_DISEASE_MODEL" for a in connected_assets)),
                ("No registered clinical or natural-history study is recorded in the atlas.", not connected_trials),
                ("No shared disease mechanism is recorded in the atlas.", not mech_related),
                ("No repurposing lead with direct evidence (beyond hypothesis) is recorded.",
                 not any(d["evidence_tier"] != "INFERRED_HYPOTHESIS" for d in connected_drugs)),
                ("No literature claims were extracted for this disease yet.",
                 not self._literature_claims(disease_id)["claims"]),
            ] if missing] or ["No major gaps among the atlas's tracked resources."]
        }

        # Patient & Caregiver Action Plan (Devon & Maria)
        n_recruiting = sum(self._is_recruiting(t) for t in connected_trials)
        summary = [f"{name} is a rare genetic condition."]
        summary.append(
            f"The atlas lists {len(connected_trials)} registered stud{'y' if len(connected_trials) == 1 else 'ies'}, {n_recruiting} currently recruiting."
            if connected_trials else "The atlas does not list any registered studies for it yet."
        )
        summary.append(
            f"Patient organization: {', '.join(g.get('label') for g in connected_groups)}."
            if connected_groups else "No patient organization is linked in the atlas yet."
        )
        patient_actions = {
            "disease_name": name,
            "plain_language_summary": " ".join(summary),
            "immediate_diagnostic_steps": [
                "Confirm molecular diagnosis via whole-exome sequencing (WES) or target gene panel with Sanger confirmation.",
                f"Obtain formal baseline assessment for primary phenotypes: {', '.join([s.get('label') for s in connected_symptoms[:3]])}.",
                "Request referral to a designated Rare Disease Center of Excellence or Academic Medical Center."
            ],
            "active_clinical_trials": [
                {
                    "trial_title": t.get("label"),
                    "nct_id": t.get("nct_id"),
                    "phase": t.get("phase"),
                    "status": t.get("status"),
                    "sponsor": t.get("sponsor"),
                    "locations": t.get("locations"),
                    "intervention": t.get("intervention"),
                    "is_recruiting": self._is_recruiting(t),
                    "action_url": f"https://clinicaltrials.gov/study/{t.get('nct_id')}"
                } for t in connected_trials
            ],
            "support_and_advocacy_groups": [
                {
                    "name": g.get("label"),
                    "country": g.get("country"),
                    "website": g.get("website"),
                    "registry_url": g.get("registry_url"),
                    "contact_url": g.get("contact_url"),
                    "contact": g.get("contact_email")
                } for g in connected_groups
            ],
            "patient_checklist": [
                *([f"Join the {g.get('label')} patient registry: {g['registry_url']}" for g in connected_groups if g.get("registry_url")]
                  or [f"Ask {connected_groups[0].get('label')} whether a patient registry exists." if connected_groups
                      else "Ask your genetics team which patient organizations or registries exist for this condition."]),
                "Ask your genetic counselor about research biobanking (for example blood or skin samples).",
                "Review clinical trial eligibility criteria with your specialist."
            ]
        }

        # Biotech Scout Action Plan (Priya)
        if any(a["relation"] == "VALIDATED_DISEASE_MODEL" for a in connected_assets):
            readiness = "High (validated model of this condition in the atlas)"
        elif connected_assets:
            readiness = "Moderate (only related-disease or unverified assets)"
        else:
            readiness = "Low (no reusable assets recorded)"
        priya_actions = {
            "mechanism_evaluation": marias_journey["step2_mechanism"]["primary_mechanism"],
            "addressable_patient_clusters": [name] + [r["label"] for r in mech_related],
            "preclinical_readiness": readiness,
            "named_investigators": [k["name"] for k in connected_kols],
            "key_reusable_assets": [a["name"] for a in connected_assets]
        }

        # Academic Scientist Action Plan (Dr. Osei)
        osei_actions = {
            "unrelated_diseases_sharing_mechanism": [
                {"disease": r["label"], "pathway": ", ".join(r["shared_pathways"])} for r in mech_related
            ],
            "collaborator_directory": [
                {"name": k["name"], "institution": k["institution"], "email": k["email"], "connection": k["connection"]}
                for k in connected_kols
            ]
        }

        return {
            "disease": disease,
            "marias_journey": marias_journey,
            "researcher_actions": researcher_actions,
            "patient_actions": patient_actions,
            "priya_actions": priya_actions,
            "osei_actions": osei_actions,
            "moonshot_10x": self.calculate_moonshot_10x(),
            "subgraph": neighborhood
        }

    def chat_query_reasoner(self, query: str) -> Dict[str, Any]:
        q = query.lower()
        matched_diseases = []
        matched_genes = []
        matched_drugs = []

        for node_id, data in self.G.nodes(data=True):
            # Whole-word match on non-empty identifiers ("" or short symbols must not match inside other words)
            terms = [str(data.get(k) or "").lower() for k in ("label", "code", "hgnc")]
            if any(t and re.search(r"(?<!\w)" + re.escape(t) + r"(?!\w)", q) for t in terms):
                ntype = data.get("type")
                if ntype == "disease":
                    matched_diseases.append(data)
                elif ntype == "gene":
                    matched_genes.append(data)
                elif ntype == "drug":
                    matched_drugs.append(data)

        evidence_citations = []
        key_insights = []
        actionable_steps = []

        if matched_diseases:
            d = matched_diseases[0]
            d_id = d["id"]
            dossier = self.generate_action_dossier(d_id)
            
            key_insights.append(f"**Target Condition:** {d.get('label')} ({d.get('code')}, {d.get('omim')}) - {d.get('category')}.")
            key_insights.append(f"**Pathophysiology & Mechanism:** {d.get('description')}")
            
            drugs = dossier["researcher_actions"]["repurposing_hypotheses"]
            if drugs:
                drug_list = ", ".join([f"**{dr['molecule_name']}** (Confidence: {int(dr['confidence_score']*100)}%)" for dr in drugs])
                key_insights.append(f"**Repurposing & Therapeutic Leads:** {drug_list}.")

            trials = dossier["patient_actions"]["active_clinical_trials"]
            if trials:
                trial_summary = "; ".join([f"{t['trial_title']} ({t['nct_id']} - {t['status']})" for t in trials])
                key_insights.append(f"**Registered Studies (status from ClinicalTrials.gov):** {trial_summary}")

            for pub in dossier["researcher_actions"]["evidence_base"]:
                evidence_citations.append({
                    "pmid": pub.get("pmid"),
                    "title": pub.get("title"),
                    "journal": pub.get("journal"),
                    "year": pub.get("year"),
                    "evidence_score": pub.get("evidence_score")
                })

            actionable_steps = [
                f"1. **Maria's Action This Week:** Reach out to collaborative investigator with sourced proposal.",
                f"2. **Preclinical Assay Screening:** Test {drugs[0]['molecule_name'] if drugs else 'candidate'} in patient iPSC lines.",
                "3. **Pooled Natural History Registry:** Connect with active patient advocacy network."
            ]

        else:
            all_diseases = [d["label"] for _, d in self.G.nodes(data=True) if d.get("type") == "disease"]
            key_insights.append(f"The AI Atlas contains {self.G.number_of_nodes()} biomedical nodes and {self.G.number_of_edges()} evidence-grounded edges across {len(all_diseases)} curated monogenic disease clusters.")
            key_insights.append(f"Curated conditions include: {', '.join(all_diseases[:6])} and more.")
            actionable_steps = [
                "Select a specific rare disease (e.g. 'NGLY1 Deficiency', 'STXBP1 Encephalopathy') to explore Maria's 1-click journey.",
                "Use the 10x Moonshot Accelerator tab to review timeline reductions."
            ]

        return {
            "query": query,
            "matched_entities": {
                "diseases": matched_diseases,
                "genes": matched_genes,
                "drugs": matched_drugs
            },
            "insights": key_insights,
            "actionable_steps": actionable_steps,
            "evidence_citations": evidence_citations,
            "graph_stats": self.get_graph_stats()
        }

# Global singleton instance
graph_engine = RareDiseaseGraphEngine()
