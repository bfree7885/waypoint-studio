# Cyber Provenance & Trust

**Status:** Architecture V0.1  
**Schemas:** `schema-provenance-v0.1.json`, change events in `schema-change-event-v0.1.json`  
**Runtime:** `answerProvenanceQuestions`, `detectChanges`, `dedupePreserveAttribution`

---

## Questions every object must answer

| Question | Mechanism |
|----------|-----------|
| Where did this come from? | `provenance[].sourceLabel` / `sourceUrl` |
| When was it retrieved? | `provenance[].retrievedAt` |
| How many independent sources support it? | Distinct `connectorId`s after merge |
| Has it been verified? | `verified` / `provenance[].verified` |
| Has it changed? | Append-only `chg_*` change events |

Display **confidence separately from severity**. Independent source count does **not** imply certainty.

---

## Provenance object

Required: `connectorId`, `retrievedAt`, `sourceLabel`, `verified`  
Optional: `sourceUrl`, `sourceRecordId`, `verificationNote`, `contentHash`, `reliability`

Reliability mirrors connector trust — it is not CVSS.

---

## Change detection

Meaningful change types:

- New mitigation  
- Severity revised  
- Exploitation confirmed (e.g. KEV id appears)  
- Patch released  
- Vendor statement updated / verified  
- Additional affected products  
- References added  

`detectChanges(previous, next)` emits human-readable `summary` strings. **History is not overwritten** — prior normalized snapshots and change events remain.

---

## Deduplication & attribution

When NVD + CISA + curated advisories describe Log4Shell:

1. Records merge on `cve:CVE-2021-44228`  
2. Arrays (products, references) union  
3. **All** provenance rows remain  
4. `answerProvenanceQuestions` reports independent source count  

Never discard a source because another “won.”

---

## Related

- [CYBER-INGESTION-ARCHITECTURE.md](CYBER-INGESTION-ARCHITECTURE.md)  
- [CYBER-CACHE.md](CYBER-CACHE.md)  
- [WAYPOINT-TRUST-FRAMEWORK.md](WAYPOINT-TRUST-FRAMEWORK.md)  
- [WAYPOINT-CONFIDENCE-SYSTEM.md](WAYPOINT-CONFIDENCE-SYSTEM.md)
