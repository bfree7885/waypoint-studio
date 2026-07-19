# Performance Findings — Version 1 Readiness

**Date:** 2026-07-18  
**Note:** No headed Lighthouse run in this session. Findings are structural + prior audits.

## Bottlenecks
| Bottleneck | Severity | Evidence |
|---|---|---|
| `wds.js` ~119 ordered scripts | **Critical** | Counted in loader |
| ForageCast/Savant ~25 deferred scripts/page | High | Static HTML budgets |
| External provider latency (Open-Meteo, NWS, USGS, Overpass) | Medium | Soft-timeout 8s; still waits |
| Leaflet tile CDN | Medium | Sheds / Volunteer maps |
| Large cyber workspace DOM | Medium | SignalTerrain |
| Savant views ~43KB single module | Low | Acceptable for closed beta |

## Mitigations already in place
- Request coalescing, retries, session cache (`WDS.resilience`)  
- Dashboard tab-scoped lazy mounts (prior recovery)  
- Debounced search (Savant + Studio search)  
- MapView `will-change` cleanup  

## Offline
- Offline banner + stale cache on shared fetch paths  
- True offline shell / service worker: **not present**

## Recommendation
Closed beta OK on desktop/Wi‑Fi. **Public beta blocked** until Dashboard critical-path bundle exists and mobile LCP/TTI are measured.
