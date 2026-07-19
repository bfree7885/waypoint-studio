# SignalTerrain Cyber — Product Recovery Phase 2

**Date:** 2026-07-18 / 2026-07-19  
**Live engine:** **1.2.0**  
**Signal engine:** **2.0.0**  
**Commit policy:** Not committed / not pushed (owner review)

---

## Mission check

| Requirement | Status |
|-------------|--------|
| Enrichment metadata on every event | **Yes** — `record.enrichment` |
| Deduplication + supporting sources | **Yes** — CVE primary + narrative merge |
| Correlation (CVE/KEV/advisory/outage/ransomware/ATT&CK heuristic) | **Yes** — `correlation.json` + `signal.correlation` |
| Operational briefings (morning/evening/weekly/critical) | **Yes** — `signal.briefings` + Briefings nav |
| Plain-English risk | **Yes** — `record.risk` |
| Recommendations with why | **Yes** — `record.recommendation` |
| Trend interpretation | **Yes** — `signal.trends` + Trends panel |
| Noise reduction by default | **Yes** — 74/294 hidden in benchmark run |
| Unified timeline + filters | **Yes** — Timeline panel |
| Personalization framework | **Yes** — personas in artifact + Settings preference |
| Docs (architecture, processing, correlation, benchmarks, debt, roadmap) | **Yes** |

---

## What changed

### Engine

- New module: `scripts/cyber-signal/signal-engine.mjs`  
- Live engine wires signal layer after scoring  
- Writes `data/cyber/correlation.json`  
- `live.json` gains `signal` block; records carry enrichment/recommendation/risk/noise/personas  

### UI

- Nav: Briefings, Timeline, Trends  
- Cards show recommended action + plain risk summary  
- Detail explains who / likelihood / mitigation / enrichment  
- Show low-signal toggle  
- Persona preference (localStorage)  

### Artifacts (this run)

- 294 records · 220 surfaced · 74 hidden · 958 relationships · signal ~56 ms · trust **Live**

---

## Quality review notes

| Screen | Analyst? | Admin? | Workload↓ | Noise↓ |
|--------|----------|--------|-----------|--------|
| Overview | Yes — brief + top actions | Yes — plain language | Yes | Yes (default hide) |
| Briefings | Yes — shift handoff style | Mostly | Yes | Yes |
| Threats / KEV | Yes | Yes with recommendation chips | Yes | Yes |
| Timeline | Yes for situational awareness | Yes with filters | Medium | Yes |
| Trends | Yes — interpretive, not vanity charts | Partial | Medium | N/A |
| Settings personas | Foundation only | Clear | Future | Future |

Remaining friction: large `live.json`; ATT&CK heuristics need advanced labeling in denser views; related-graph panel not yet first-class in UI.

---

## Files

```
scripts/cyber-signal/signal-engine.mjs
scripts/signalterrain-cyber-live-engine.mjs          — 1.2.0
design-system/js/signalterrain/wds-signalterrain-cyber-live.js
design-system/css/wds-signalterrain-cyber-live.css
data/cyber/live.json · health.json · graph.json · history.json · correlation.json
docs/SIGNALTERRAIN-CYBER-SIGNAL-ARCHITECTURE.md
docs/SIGNALTERRAIN-CYBER-SIGNAL-PROCESSING.md
docs/SIGNALTERRAIN-CYBER-CORRELATION.md
docs/SIGNALTERRAIN-CYBER-PERFORMANCE-BENCHMARKS.md
docs/SIGNALTERRAIN-CYBER-V1-ROADMAP.md
docs/SIGNALTERRAIN-CYBER-PRODUCT-RECOVERY-PHASE2.md
docs/SIGNALTERRAIN-CYBER-RECOVERY-CHANGELOG.md      — updated
```
