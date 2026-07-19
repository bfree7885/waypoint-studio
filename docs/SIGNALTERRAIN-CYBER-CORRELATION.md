# SignalTerrain Cyber — Correlation Model

**Artifact:** `data/cyber/correlation.json`  
**Summary in live:** `signal.correlation` (sampled relationships)

---

## Relationship types

| Type | Meaning | Evidence |
|------|---------|----------|
| `mentions-cve` | Record references a CVE | Identifiers |
| `listed-in-kev` | CVE present in KEV posture | `exploitation.knownExploited` |
| `ransomware-associated` | KEV ransomware flag / equivalent | Official flag |
| `advisory-covers` | Advisory/release covers CVE | Extracted CVE |
| `same-cve` | Two records share a CVE | Shared identifier |
| `affects-vendor` | Entity extraction vendor | Parsed entities |
| `outage-affects` | Service outage → vendor | Outage record |
| `heuristic-attack-map` | Keyword → ATT&CK technique | **Heuristic** — not MITRE-confirmed |

---

## What is *not* correlated yet

- Dedicated threat-actor campaign feeds  
- Malware-family graphs beyond ransomware KEV flags  
- EPSS probability edges  
- Confirmed MITRE mappings from official ATT&CK datasets  

These remain **roadmap** items; the UI must not present heuristics as confirmed actor attribution.

---

## Consumption

- Analyst UI: supporting sources on cards/detail; timeline categories  
- Future: graph explorer, “related intelligence” panels, persona-weighted edges  
