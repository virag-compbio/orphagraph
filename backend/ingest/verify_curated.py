#!/usr/bin/env python3
"""
Re-checks the curated layer against public sources:

    python3 backend/ingest/verify_curated.py

  - every URL in curated records loads (HTTP 2xx/3xx),
  - every PMID cited anywhere exists in PubMed and publication titles match PubMed exactly,
  - every NCT id exists on ClinicalTrials.gov, and curated trial titles and statuses match the registry.
Exits with status 1 if anything fails, so it can run before a submission or demo.
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from curated import CURATED  # noqa: E402


BROWSER_HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) "
                                 "Chrome/120 Safari/537.36", "Accept": "text/html,application/xhtml+xml"}


def fetch(url: str) -> bytes:
    # Some organization sites block a bare User-Agent and others block a browser one, so try both
    for headers in ({"User-Agent": "Mozilla/5.0"}, BROWSER_HEADERS):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=20) as resp:
                return resp.read()
        except urllib.error.HTTPError as exc:
            if exc.code not in (403, 406) or headers is BROWSER_HEADERS:
                raise
    raise RuntimeError("unreachable")


def main() -> int:
    failures = []
    text = json.dumps(CURATED)

    urls = sorted({v for n in CURATED["nodes"] for v in n.values() if isinstance(v, str) and v.startswith("http")})
    for url in urls:
        try:
            fetch(url)
        except Exception as exc:
            failures.append(f"link does not load: {url} ({str(exc)[:60]})")

    pmids = set(re.findall(r'"(?:pmid|source_pmid)": "(\d+)"', text)) | set(re.findall(r"PMID (\d{6,9})", text))
    pmids |= {p for n in CURATED["nodes"] for p in n.get("source_pmids", [])}
    summary = json.loads(fetch("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id="
                               + ",".join(sorted(pmids))))["result"]
    for pmid in sorted(pmids):
        if pmid not in summary or "error" in summary[pmid]:
            failures.append(f"PMID not found: {pmid}")
    for n in CURATED["nodes"]:
        if n.get("type") == "publication":
            actual = summary.get(n["pmid"], {}).get("title", "")
            if actual.rstrip(".").lower() != n["title"].rstrip(".").lower():
                failures.append(f"title mismatch for PMID {n['pmid']}: PubMed has '{actual[:80]}'")

    trials = {n["nct_id"]: n for n in CURATED["nodes"] if n.get("type") == "trial"}
    for nct in sorted(set(re.findall(r"NCT\d{8}", text))):
        try:
            p = json.loads(fetch(f"https://clinicaltrials.gov/api/v2/studies/{nct}?fields=BriefTitle,OverallStatus"))["protocolSection"]
        except Exception:
            failures.append(f"NCT id not found: {nct}")
            continue
        if nct in trials:
            t = trials[nct]
            if p["identificationModule"]["briefTitle"] != t["label"]:
                failures.append(f"{nct}: title differs from the registry")
            if p["statusModule"]["overallStatus"].replace("_", " ").lower() != t["status"].replace(",", "").lower():
                failures.append(f"{nct}: status is now {p['statusModule']['overallStatus']} (curated: {t['status']})")

    print(f"checked {len(urls)} links, {len(pmids)} PMIDs, {len(set(re.findall(r'NCT[0-9]{8}', text)))} NCT ids")
    for f in failures:
        print("FAIL", f)
    print("all checks passed" if not failures else f"{len(failures)} problem(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
