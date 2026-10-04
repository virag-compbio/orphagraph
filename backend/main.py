"""
FastAPI application for Orphagraph Atlas.
"""

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
from graph_engine import graph_engine
import explain

app = FastAPI(
    title="Orphagraph Atlas API",
    description="Evidence-based Biomedical Knowledge Graph connecting rare diseases, genes, phenotypes, studies, assets, and patient groups into actionable next steps.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    query: str

@app.get("/api")
def root():
    return {
        "message": "Welcome to Orphagraph Atlas API!",
        "documentation": "http://127.0.0.1:8000/docs",
        "frontend_ui": "http://localhost:5173",
        "endpoints": {
            "health": "/api/health",
            "graph": "/api/graph",
            "marias_journey": "/api/journey/maria",
            "moonshot_10x": "/api/moonshot",
            "diseases": "/api/diseases",
            "assets": "/api/assets",
            "investigators": "/api/investigators",
            "silos": "/api/silos"
        }
    }

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Orphagraph Atlas"}

@app.get("/api/graph")
def get_graph():
    return graph_engine.get_full_graph()

@app.get("/api/graph/stats")
def get_stats():
    return graph_engine.get_graph_stats()

@app.get("/api/graph/search")
def search_nodes(q: str = Query(..., min_length=1), type: Optional[str] = None):
    results = graph_engine.search_nodes(query=q, node_type=type)
    return {"query": q, "count": len(results), "results": results}

@app.get("/api/search")
def search(q: str = Query("", max_length=200), limit: int = Query(6, ge=1, le=20)):
    """Grouped matches for the search box: diseases, genes, symptoms and drugs."""
    return {"query": q, "results": graph_engine.search_entities(q, limit)}

@app.get("/api/entity/{node_id}")
def entity(node_id: str):
    """Profile for a gene, symptom or drug page."""
    profile = graph_engine.entity_profile(node_id)
    if profile is None:
        raise HTTPException(status_code=404, detail=f"No gene, symptom or drug {node_id} in the atlas.")
    return profile

@app.get("/api/graph/node/{node_id}/neighborhood")
def get_node_neighborhood(node_id: str, depth: int = Query(1, ge=1, le=3)):
    result = graph_engine.get_node_neighborhood(node_id=node_id, depth=depth)
    return result

@app.get("/api/graph/path")
def find_path(source: str = Query(...), target: str = Query(...)):
    result = graph_engine.find_shortest_path(source_id=source, target_id=target)
    return result

@app.get("/api/diseases")
def list_diseases():
    nodes = [dict(graph_engine.G.nodes[n]) for n in graph_engine.G.nodes() if graph_engine.G.nodes[n].get("type") == "disease"]
    # Curated diseases first (they carry trials, groups and assets), then imported ones alphabetically
    nodes.sort(key=lambda d: (d["id"].startswith("DIS_OMIM_"), d.get("label", "").lower()))
    return {"total": len(nodes), "diseases": nodes}

@app.get("/api/journey/maria")
def get_marias_journey(disease: str = Query("DIS_NGLY1")):
    if not graph_engine.is_disease(disease):
        raise HTTPException(status_code=404, detail=f"Disease {disease} not found.")
    return graph_engine.generate_marias_journey(disease_id=disease)

@app.get("/api/moonshot")
def get_moonshot_10x():
    return graph_engine.calculate_moonshot_10x()

@app.get("/api/assets")
def list_assets():
    assets = [dict(graph_engine.G.nodes[n]) for n in graph_engine.G.nodes() if graph_engine.G.nodes[n].get("type") == "asset"]
    return {"total": len(assets), "assets": assets}

@app.get("/api/investigators")
def list_investigators():
    investigators = [dict(graph_engine.G.nodes[n]) for n in graph_engine.G.nodes() if graph_engine.G.nodes[n].get("type") == "investigator"]
    return {"total": len(investigators), "investigators": investigators}

@app.get("/api/dossier/{disease_id}")
def get_action_dossier(disease_id: str, subgraph: bool = True):
    dossier = graph_engine.generate_action_dossier(disease_id=disease_id)
    if "error" in dossier:
        raise HTTPException(status_code=404, detail=dossier["error"])
    if not subgraph:  # the disease page does not draw the neighbourhood graph (most of the payload)
        dossier.pop("subgraph", None)
    return dossier

@app.get("/api/explain/journey/{disease_id}")
def explain_journey(disease_id: str, persona: str = Query("maria"), refresh: bool = False):
    """LLM explanation of the journey facts; every sentence cites fact ids and is validated (see explain.py)."""
    if not graph_engine.is_disease(disease_id):
        raise HTTPException(status_code=404, detail=f"Disease {disease_id} not found.")
    return explain.explain_journey(graph_engine, disease_id, persona, refresh)

@app.post("/api/chat")
def chat_reasoning(request: ChatRequest):
    result = graph_engine.chat_query_reasoner(query=request.query)
    diseases = result["matched_entities"]["diseases"]
    if diseases:
        result["answer"] = explain.explain_question(graph_engine, diseases[0]["id"], request.query)
    return result

def _strongest_evidence(drug_id: str) -> Dict[str, Any]:
    """The drug's best evidence tier across its disease links (contraindications excluded) and for which disease."""
    best = None
    for _, target, data in graph_engine.G.out_edges(drug_id, data=True):
        if graph_engine.G.nodes[target].get("type") != "disease" or data.get("relationship") == "CONTRAINDICATED_WARNING":
            continue
        rank = graph_engine.EVIDENCE_TIER_RANK.get(data.get("evidence_tier"), 9)
        if best is None or (rank, graph_engine.G.nodes[target].get("label", "")) < best[0]:
            best = ((rank, graph_engine.G.nodes[target].get("label", "")), data.get("evidence_tier"), graph_engine.G.nodes[target].get("label"))
    return {"evidence_tier": best[1], "evidence_for": best[2]} if best else {"evidence_tier": None, "evidence_for": None}

@app.get("/api/silos")
def analyze_silos():
    diseases = [dict(graph_engine.G.nodes[n]) for n in graph_engine.G.nodes() if graph_engine.G.nodes[n].get("type") == "disease"]
    pathways = [dict(graph_engine.G.nodes[n]) for n in graph_engine.G.nodes() if graph_engine.G.nodes[n].get("type") == "pathway"]
    drugs = [dict(graph_engine.G.nodes[n]) for n in graph_engine.G.nodes() if graph_engine.G.nodes[n].get("type") == "drug"]

    G = graph_engine.G
    clusters = []
    for pw in pathways:
        # Diseases linked to the pathway directly or through one of their causal genes
        linked = {n for n in graph_engine.undirected_G.neighbors(pw["id"]) if G.nodes[n].get("type") == "disease"}
        for gene in (n for n in graph_engine.undirected_G.neighbors(pw["id"]) if G.nodes[n].get("type") == "gene"):
            linked |= {d for d in graph_engine.undirected_G.neighbors(gene) if G.nodes[d].get("type") == "disease"}
        if len(linked) >= 2:
            clusters.append({
                "pathway": pw["label"], "pathway_id": pw["id"], "database_id": pw.get("database_id"), "size": pw.get("size"),
                "connected_diseases": sorted(({"id": d, "label": G.nodes[d].get("label"), "curated": not d.startswith("DIS_OMIM_")}
                                              for d in linked), key=lambda x: (not x["curated"], x["label"].lower())),
            })

    return {
        "total_diseases": len(diseases),
        "total_repurposable_molecules": len(drugs),
        "total_cross_disease_pathways": len(clusters),
        # Pathways linking the most diseases first; single-disease pathways are not cross-disease
        "cross_disease_pathways": sorted(clusters, key=lambda c: (-len(c["connected_diseases"]), c["pathway"]))[:25],
        "repurposing_matrix": [
            {"id": d["id"], "drug": d.get("label"), "status": d.get("fda_status"), "mechanism": d.get("mechanism"), **_strongest_evidence(d["id"])}
            for d in drugs
        ]
    }

# Serve the built frontend (frontend/dist) from the same server when it exists, as in the
# Docker image. Locally, `python3 start.py` uses the Vite dev server instead.
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "dist")
if os.path.isdir(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str):
        file = os.path.realpath(os.path.join(FRONTEND_DIST, path))
        if path and file.startswith(os.path.realpath(FRONTEND_DIST) + os.sep) and os.path.isfile(file):
            return FileResponse(file)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
