# 🧬 Orphagraph Atlas

> An evidence-backed knowledge graph that takes a patient group from an isolated rare-disease diagnosis to related communities, reusable resources, researchers and a concrete next step, or to an honest statement of what is not known.

Built for the Hack-Nation challenge "AI Atlas for the World's Rare Diseases". The graph is assembled from open biomedical data, extended with claims extracted from PubMed by OpenAI's open-weight `gpt-oss-20b` (run locally), and every curated record is checked against a public source.

---

## 📊 At a Glance

| | |
|---|---|
| Diseases | **159** (13 curated seeds plus their phenotype and pathway neighbours, from a universe of 5,310 rare OMIM diseases) |
| Genes / Reactome pathways / HPO phenotypes | 139 / 274 / 1,005 |
| Phenotype-similarity links | 801 (IC-weighted, computed from HPO annotations) |
| Literature claims | 53 quote-verified claims (34 edges) from 37 PubMed papers, kept from 359 extracted |
| Clinical studies | 4, checked against ClinicalTrials.gov |
| Drugs | 10, including 3 FDA approvals checked in Drugs@FDA |
| Investigators | 41 (4 from trial records and authorship, 37 last authors of the extracted papers) |
| Patient organizations | 4, with links checked on their websites |

These are honest numbers for a focused slice; the import scales by adding seeds (see *Data & Reproducing the Dataset*).

---

## 🏃 Quick Start

**Prerequisites:** Python 3.9+, Node.js 18+. The built data (`backend/data/*.json`) and cached explanations are in the repository, so no downloads are needed.

```bash
python3 -m pip install -r requirements.txt
```
```bash
npm --prefix frontend install
```
```bash
python3 start.py
```
Open http://localhost:5173 (API docs at http://127.0.0.1:8000/docs). `Ctrl+C` stops both servers.

**Optional, for live LLM explanations and chat answers** (cached explanations for the curated diseases work without it):
```bash
ollama pull gpt-oss:20b
```
Keep Ollama running while the app runs. Without it, other diseases and new chat questions show template text.

### Hosting on Render (free)

The `Dockerfile` builds the frontend and serves it together with the API from one container, and `render.yaml` describes the service for [Render](https://render.com)'s free tier. To try the container locally:
```bash
docker build -t orphagraph . && docker run --rm -p 7860:7860 orphagraph
```
To deploy: push the repository to GitHub, then in Render choose **New → Blueprint**, connect the repository and confirm. Render builds the image (about 5 minutes) and gives the app a `https://<name>.onrender.com` address; each later push redeploys it.

- The free instance sleeps after 15 minutes without visitors and takes about a minute to wake, so open the link once before a demo.
- There is no LLM server in the container: the cached explanations are shown and anything else uses the template text. For live explanations, set `LLM_DISABLED=0`, `LLM_BASE_URL`, `LLM_MODEL` and `OPENAI_API_KEY` in the service's environment, for any OpenAI-compatible endpoint.

## 🏗 Architecture

```
 Open data (HPO, OMIM gene links,          PubMed abstracts              Hand-checked records
 Reactome, MONDO)                                │                       (trials, drugs, papers,
        │                                        ▼                        assets, investigators,
        ▼                              ingest/extract_literature.py       patient organizations)
 ingest/build_graph.py                  gpt-oss extracts claims;                 │
 slice, IC, similarity                  quotes checked verbatim                  │
        │                                        │                               │
  data/graph.json                       data/literature.json                curated.py
        └───────────────────────┬────────────────┴───────────────────────────────┘
                                ▼
                  database.py  (merge by OMIM id; curated wins)
                                ▼
                  graph_engine.py  (NetworkX)
                  mechanism & phenotype neighbours, counterexamples, gaps,
                  assets, investigators, leads, journey, dossiers
                        │                         │
                        ▼                         ▼
              explain.py (gpt-oss)          moonshot.py
              cited sentences,              sourced baseline vs
              validated, cached             assumption-based route
                        └────────────┬────────────┘
                                     ▼
                     main.py (FastAPI)  →  React frontend (Vite)
```

| Component | File | Role |
|---|---|---|
| Import | `backend/ingest/build_graph.py` | Builds the disease/gene/phenotype/pathway slice and phenotype similarity from open data |
| Extract | `backend/ingest/extract_literature.py` | PubMed search, LLM claim extraction, verbatim-quote and entity checks |
| Curated layer | `backend/curated.py` | Verified trials, drugs, publications, assets, investigators, organizations |
| Verification | `backend/ingest/verify_curated.py` | Re-checks curated links, PMIDs and NCT ids |
| Merge | `backend/database.py` | Combines the three layers |
| Engine | `backend/graph_engine.py` | All graph reasoning behind the journey, dossiers, path finder and chat |
| Explain | `backend/explain.py` | Turns graph facts into persona-specific text with per-sentence citations |
| 10× model | `backend/moonshot.py` | Sourced NGLY1 timeline and the atlas-route assumptions |
| API | `backend/main.py` | FastAPI endpoints (`/docs` lists them) |
| UI | `frontend/src/` | React views: journey, graph, dossiers, 10×, pathways, trials, chat |

---

## 🚀 Features

- **Maria's journey (4 steps), built from the graph for any disease.**
  1. Diagnosis: approved therapies and registered studies with their current status.
  2. Mechanism: diseases sharing a Reactome pathway (ranked by pathway specificity plus phenotype similarity), phenotype-only neighbours labelled as such, **counterexamples** (same pathway, opposite variant effect, e.g. SCN2A gain- vs loss-of-function) and an explicit **gap statement** when nothing is connected. Literature claims are listed with quotes and PubMed links.
  3. Reusable assets and investigators, each with the reason it is linked; researchers publishing on more than one disease are marked as bridging communities.
  4. Actions for this week and an outreach draft built only from what was found.
- **Explanations for four personas** (Maria, Devon, Priya, Dr. Osei): written by the local LLM from numbered facts; each sentence cites its facts, and sentences without valid citations or with numbers not in the cited facts are removed.
- **Persona dossiers:** repurposing leads with evidence tiers, computed research gaps, patient checklist, shared-mechanism view for researchers.
- **Knowledge graph explorer and path finder** (contraindications are never used as links).
- **Trial and registry finder** with phenotype filters and live study status.
- **Q&A chat:** answers from atlas facts with sentence-level citations.
- **10× Moonshot:** sourced NGLY1 baseline (49.9 or 80.7 months to a first prospective natural-history cohort) versus an assumption-based atlas route (default 11 months, i.e. 4.5× or 7.3×), with sliders and a list of what must be validated.

---

## 🔍 How Claims Are Kept Honest

- **Evidence tiers** on every claim edge: clinical proven (approval or randomized trial), clinical observational, case reports, preclinical, inferred hypothesis; plus computed, database and literature-extracted provenance.
- **Curated records** carry their source (PMID, NCT id, FDA application, HGNC, organization website) and check date; `verify_curated.py` re-checks them.
- **Literature claims** are kept only with a verbatim quote that states the claim, entities that map to atlas nodes or HPO terms, and gene-disease links that agree with OMIM.
- **Explanations** cite facts sentence by sentence; the template text is shown when the model is unavailable.
- **Gaps are stated, not filled:** missing investigators, models, registries or mechanisms are reported as gaps.

## ⚠️ Limitations

- The slice is small (159 diseases, 13 curated); most diseases have no curated trials, assets or organizations yet.
- Reactome pathway sharing can be noisy (e.g. Rett links to Long QT syndrome through a MECP2-variant pathway); such links rank low but are shown.
- Explanations can still overstate a cited fact in wording; the cited facts are shown next to every sentence.
- The literature layer covers 12 abstracts per curated disease; drug claims for drugs outside the curated set are not kept, so no contradictions are recorded yet.
- The 10× atlas route is a set of assumptions to test, not a measurement.

## 🎬 Suggested Demo Path

1. **Maria's Journey → NGLY1 Deficiency:** registered studies (Phase 3 gene therapy, not recruiting) → step 2: shared ER glycan-trimming pathway with CDG type IIB, literature quotes → step 3: published iPSC models, natural-history study design, trial PIs → step 4: outreach draft.
2. Switch to **SCN2A Loss-of-Function:** the counterexample and the sodium channel blocker caution (PMID 28379373).
3. Switch to **CDKL5 Deficiency Disorder:** no shared pathway is recorded, so step 2 lists only phenotype-similar diseases and says this is not evidence of a shared mechanism; switch persona to **Devon** for the plain-language explanation.
4. **10× Moonshot:** the sourced timeline and the assumptions that would have to hold for 10×.

---

## 🛠 Tech Stack

- **Backend**: Python 3, FastAPI, NetworkX, OpenAI Python SDK (pointed at a local Ollama server or any OpenAI-compatible endpoint).
- **Frontend**: React 18, Vite, TypeScript, TailwindCSS, `react-force-graph-2d`, Lucide icons.
- **Data**: HPO, OMIM (via HPO), Reactome, MONDO, PubMed, ClinicalTrials.gov, Drugs@FDA, HGNC.

---

## 🗂 Data & Reproducing the Dataset

The graph has three layers, merged at startup by `backend/database.py`:

| Layer | File | Contents |
|---|---|---|
| Imported | `backend/data/graph.json` (built by `backend/ingest/build_graph.py`) | Diseases, causal genes, HPO phenotypes, Reactome pathways, phenotype similarity |
| Literature | `backend/data/literature.json` (built by `backend/ingest/extract_literature.py`) | Claims extracted from PubMed abstracts with verbatim quotes, papers, last-author investigators |
| Curated | `backend/curated.py` | Drugs, clinical trials, publications, patient organizations, research assets and investigators, each with its source (PMID, NCT id, FDA application, HGNC, organization website) and check date |

**Rebuild the imported layer** (downloads ~117 MB of open data to `backend/data/raw/` on first run, then takes a few seconds):
```bash
python3 backend/ingest/build_graph.py
```
Add `--refresh` to re-download the latest source releases.

**Sources** (open, no API keys): HPO annotations and ontology (`phenotype.hpoa`, `hp.obo`), HPO `genes_to_disease.txt` (OMIM/mim2gene_medgen Mendelian links), Reactome `NCBI2Reactome.txt` (lowest-level human pathways), MONDO `mondo-rare.obo` (OMIM ↔ Orphanet ↔ MONDO cross-references).

**Method**
1. Universe: OMIM diseases equivalent to a MONDO term tagged *rare* (excluding OMIM susceptibility entries and groupings), with at least one Mendelian gene and 3 phenotype annotations (~5,300 diseases).
2. Phenotype specificity: information content of each HPO term, computed from how many universe diseases carry it (or a more specific term).
3. Phenotype similarity: IC-weighted Jaccard over ancestor-propagated HPO terms.
4. Slice: the curated seed diseases plus, for each, its top phenotype neighbours and top pathway-sharing neighbours (~160 diseases). Reactome pathways with more than 40 genes are ignored so hub pathways do not link everything.
5. Mechanism neighbours share a Reactome pathway through their causal genes; links are ranked by the most specific shared pathway plus phenotype similarity. A recorded gain- vs loss-of-function direction turns a shared pathway into a counterexample.

Parameters (seeds, caps, thresholds) are at the top of `build_graph.py` and recorded in `graph.json` metadata.

**Re-check the curated layer** (links load, PMIDs and NCT ids exist, titles and trial statuses match the registries):
```bash
python3 backend/ingest/verify_curated.py
```

**Rebuild the literature layer** (needs the local LLM, see below; ~25 minutes for 12 abstracts per curated disease, model output is cached in `backend/data/raw/`):
```bash
python3 backend/ingest/extract_literature.py
```
For each curated disease it searches PubMed (primary papers with abstracts, reviews excluded) and has the LLM extract claims of fixed types (gene causes disease, disease has phenotype, drug improves / has no effect on / worsens disease), each with a quote. A claim is kept only if the quote appears word for word in the abstract and states the claim, both entities map to atlas nodes or HPO terms, and a gene-disease claim agrees with the OMIM link already in the atlas. Kept claims carry PMID, year, quote and study context (tier `LITERATURE_EXTRACTED`); last authors of those papers become investigator nodes (name and affiliation only). Rejection counts by reason are stored in `literature.json` metadata.

---

## 🤖 Explanations with an LLM (OpenAI gpt-oss, run locally)

Journey step 2 and the chat answers are written by an LLM from numbered **facts** built out of the graph (`backend/explain.py`). The model only rephrases: every sentence must cite fact ids, and a sentence is dropped if it cites no valid fact or contains a number that is not in the facts it cites. The UI shows the citations, the facts given to the model and how many sentences were removed. If the model is unavailable, the template text is shown.

**Default setup: free and local, no API key.** It uses OpenAI's open-weight `gpt-oss-20b` through [Ollama](https://ollama.com):
```bash
ollama pull gpt-oss:20b
```
Keep Ollama running while the backend runs. To pre-generate explanations for the curated diseases and all personas (so the demo is instant):
```bash
python3 backend/explain.py --warm
```

**Any OpenAI-compatible endpoint** can be used via environment variables, e.g. the OpenAI API:
```bash
LLM_BASE_URL=https://api.openai.com/v1 LLM_MODEL=<model> OPENAI_API_KEY=<key> python3 start.py
```
Other settings: `LLM_TIMEOUT` (seconds, default 180), `LLM_DISABLED=1` (always use template text). Generated explanations are cached in `backend/data/explanations_cache.json`.

---

## ⏱ The 10× Moonshot

`backend/moonshot.py` and the *10× Moonshot* tab compare one milestone: the first prospective natural-history cohort for a newly described ultra-rare disease, with NGLY1 deficiency as the case study.

- **Baseline (measured):** elapsed time between dated PubMed and ClinicalTrials.gov records: first patient report (PMID 22581936, May 2012) to first prospective cohort (PMID 27388694, July 2016) = 49.9 months; to the first registered natural-history study (NCT03834987, Feb 2019) = 80.7 months.
- **Atlas route (assumed):** three steps the atlas supports (find partners and reusable assets, adapt an existing protocol and get ethics approval, enrol via existing registries), each with a stated default and range. Defaults give 11 months, i.e. 4.5× (conservative baseline) or 7.3× (registered-study baseline). 10× requires the route to take 5.0 or 8.1 months respectively.
- Each assumption lists what must be validated; viewers can change the assumptions with sliders. Costs are not estimated.
