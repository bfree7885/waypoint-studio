# SignalTerrain Cyber — Signal Processing

**Engine:** Signal Intelligence **2.0.0** · Live **1.2.0**

---

## Processing steps (ordered)

1. **Ingest** — provider runners fetch and normalize into common record shape.  
2. **Primary dedupe** — merge by CVE / stable identity in the live engine.  
3. **Priority score** — transparent factor contributions (KEV, CVSS band, edge, freshness, profile hooks later in UI).  
4. **Narrative merge** — near-duplicate titles without CVE get supporting sources linked under one item.  
5. **Enrich** — derive severity, confidence, freshness, exploit maturity, platforms, industry hints, SME/enterprise likelihood, ATT&CK keyword hints.  
6. **Recommend** — map enrichment + priority to an action + why.  
7. **Explain risk** — who / likelihood / mitigation difficulty / patch-now vs wait.  
8. **Noise score** — hide healthy outages, stale low-priority, routine low-signal by default (≥55).  
9. **Correlate** — CVE ↔ KEV ↔ advisories ↔ vendors ↔ ransomware theme ↔ heuristic ATT&CK.  
10. **Brief** — Morning / Evening / Weekly / Critical packs.  
11. **Trends** — compare current vs previous artifact counts with plain-English interpretation.  
12. **Timeline** — chronological events with category + filter metadata.

---

## Deduplication policy

| Rule | Behavior |
|------|----------|
| Shared CVE | Upstream merge (one intelligence item) |
| Same type + normalized title (no CVE) | Secondary merge; `supportingSources[]` |
| Distinct CVE / distinct advisory | Keep separate |

Users should not see ten copies of the same story in default views.

---

## Noise reduction

- Default UI hides `noise.hideByDefault`  
- Toggle: **Show low-signal**  
- Healthy cloud status heartbeats are intentionally low-signal  

---

## Performance notes (this run)

| Metric | Value |
|--------|-------|
| Input → output records | see `live.meta.counts` |
| Surfaced by default | `meta.counts.surfacedByDefault` |
| Hidden by default | `meta.counts.hiddenByDefault` |
| Signal processing | `signal.meta.processingMs` (typically tens of ms on ~300 records) |
| Correlation relationships | `correlation.json` |

Bottleneck remains **provider I/O and `live.json` size**, not the signal layer.

---

## Failure modes

- Provider error → Partial trust; remaining providers still enrich.  
- Total fetch failure with prior artifact → Cached trust; retain previous.  
- Missing enrichment fields on old cached records → Signal engine re-enriches on next successful run.  
