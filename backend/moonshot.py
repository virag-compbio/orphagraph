"""
The 10x Moonshot: one milestone, a measured baseline, and an atlas route whose duration comes only from
stated assumptions.

Milestone: a newly described ultra-rare disease gets its first prospective natural-history cohort.
Case study: NGLY1 deficiency. Baseline dates are taken from PubMed and ClinicalTrials.gov records
(checked 2026-10-04); the elapsed time between them is computed, not estimated.

The atlas route lists the steps the atlas supports, each with a default duration and a plausible range.
These are team assumptions, not measurements; the frontend lets viewers change them and see whether 10x holds.
"""

from datetime import date
from typing import Any, Dict, List

DAYS_PER_MONTH = 30.44

EVENTS: List[Dict[str, Any]] = [
    {"id": "first_report", "date": "2012-05-11", "label": "First NGLY1 patient reported (exome sequencing study, Need et al.)",
     "source": "PMID 22581936", "url": "https://pubmed.ncbi.nlm.nih.gov/22581936/"},
    {"id": "case_series", "date": "2014-03-20", "label": "First case series defines the disorder (8 patients, Enns et al.)",
     "source": "PMID 24651605", "url": "https://pubmed.ncbi.nlm.nih.gov/24651605/"},
    {"id": "prospective_cohort", "date": "2016-07-07", "label": "First prospective phenotyping cohort published (12 patients at NIH, Lam et al.)",
     "source": "PMID 27388694", "url": "https://pubmed.ncbi.nlm.nih.gov/27388694/"},
    {"id": "registered_nhs", "date": "2019-02-01", "label": "First registered prospective NGLY1 natural-history study starts (Stanford)",
     "source": "NCT03834987", "url": "https://clinicaltrials.gov/study/NCT03834987"},
    {"id": "gene_therapy", "date": "2024-02-13", "label": "GS-100 gene therapy trial starts (context, not part of the milestone)",
     "source": "NCT06199531", "url": "https://clinicaltrials.gov/study/NCT06199531"},
]

BASELINES = [
    {"id": "conservative", "from": "first_report", "to": "prospective_cohort",
     "label": "First report to first prospective cohort (published)",
     "note": "Conservative: uses the publication date, so the cohort itself was assembled earlier than this."},
    {"id": "registered", "from": "first_report", "to": "registered_nhs",
     "label": "First report to first registered natural-history study start",
     "note": "Uses the start date of the first NGLY1 natural-history study registered on ClinicalTrials.gov."},
]

ROUTE_STAGES = [
    {
        "id": "connect",
        "label": "Find related communities, reusable protocols, investigators and registries",
        "atlas_feature": "Disease page: connected diseases, resources and people, literature investigators, studies",
        "default_months": 1.0, "min_months": 0.25, "max_months": 3.0,
        "assumption": "The atlas surfaces the relevant protocol, registry and researchers in days; confirming them by "
                      "contacting the people involved takes weeks.",
        "validate": "Time real patient-group leaders from diagnosis to a confirmed list of partners, with and without the atlas.",
    },
    {
        "id": "protocol",
        "label": "Adapt an existing natural-history protocol and obtain ethics approval",
        "atlas_feature": "Reusable study design in the atlas (natural-history protocol template)",
        "default_months": 6.0, "min_months": 2.0, "max_months": 12.0,
        "assumption": "Adapting an approved multi-site protocol (and relying on an existing IRB where possible) is "
                      "faster than writing one; ethics review remains the main fixed cost.",
        "validate": "Check with the protocol owner and an IRB whether the template can be adopted and how long review takes.",
    },
    {
        "id": "enrol",
        "label": "Enrol the first cohort",
        "atlas_feature": "Patient organization and registry links, mechanism-neighbour communities",
        "default_months": 4.0, "min_months": 1.0, "max_months": 9.0,
        "assumption": "An existing patient registry lets eligible families be contacted at once instead of being found "
                      "one by one; ultra-rare cohorts stay small regardless.",
        "validate": "Ask the patient organization how many registered families meet the protocol's eligibility criteria.",
    },
]

CAVEATS = [
    "NGLY1 is a relatively fast case: a well-organized family foundation drove research from the start, so many "
    "ultra-rare diseases take longer than this baseline.",
    "The baseline measures what happened, including work done in parallel; the atlas route assumes its steps run in "
    "sequence, which makes it conservative.",
    "The atlas route is a set of assumptions to test, not a measured result.",
    "Costs are not estimated because no sourced figures are available.",
]


def _months_between(start: str, end: str) -> float:
    return round((date.fromisoformat(end) - date.fromisoformat(start)).days / DAYS_PER_MONTH, 1)


def calculate() -> Dict[str, Any]:
    events = {e["id"]: e for e in EVENTS}
    baselines = []
    for b in BASELINES:
        months = _months_between(events[b["from"]]["date"], events[b["to"]]["date"])
        baselines.append({**b, "months": months, "months_needed_for_10x": round(months / 10, 1)})

    route_default = round(sum(s["default_months"] for s in ROUTE_STAGES), 2)
    route_best = round(sum(s["min_months"] for s in ROUTE_STAGES), 2)
    route_worst = round(sum(s["max_months"] for s in ROUTE_STAGES), 2)
    for b in baselines:
        b["speedup_default"] = round(b["months"] / route_default, 1)
        b["speedup_range"] = [round(b["months"] / route_worst, 1), round(b["months"] / route_best, 1)]

    return {
        "milestone": "First prospective natural-history cohort for a newly described ultra-rare disease",
        "case_study": "NGLY1 deficiency",
        "events": EVENTS,
        "baselines": baselines,
        "route": {
            "stages": ROUTE_STAGES,
            "default_months": route_default,
            "best_case_months": route_best,
            "worst_case_months": route_worst,
        },
        "caveats": CAVEATS,
        "sources_checked": "2026-10-04",
    }
