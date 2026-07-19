# Platform Technical Debt Assessment

**Date:** 2026-07-18  
**Commit status:** Not committed.

---

## Debt register (hardening-relevant)

| ID | Item | Severity | Notes |
|---|---|---|---|
| TD-P1 | `wds.js` ~112 ordered scripts | **Critical** for CWV | Dominates Dashboard TTI; needs critical-path bundle |
| TD-P2 | ForageCast/Savant high HTML script counts (~26) | High | Defer helps; still parse cost on mid-tier phones |
| TD-P3 | Parallel weather implementations | Medium | Volunteer vs `wds-weather-service` |
| TD-P4 | Sheds Leaflet island | Medium | Different map stack, CDN dependency |
| TD-P5 | Kiosk outside platform shell | Medium | Separate CSS/JS; no resilience injection |
| TD-P6 | Direct `fetch` remaining in cyber / steepleaf graph | Medium | Util covered; not every call site |
| TD-P7 | Session-only persistent cache | Low–Med | Lost on tab close; no SW |
| TD-P8 | Console logging in some scene modules | Low | Not stripped for prod |
| TD-P9 | Photo-pipeline / shed map pages thin on platform UI | Low | Lower traffic; still beta surface |
| TD-P10 | Savant views monolith (~43 KB) | Low | Split when feature growth resumes |

---

## Debt reduced this block

- Missing `ForageCastFetch.formatFreshness` (runtime risk) — **fixed**  
- Duplicate JSON storms — **mitigated via coalesce**  
- Offline silence — **banner + cache**  
- Provider opacity — **session health UI**  
- Sheds map broken site links — **fixed**  
- Map listener leak on rebind — **destroy path + will-change cleanup**

---

## Prototype / debug residue

- Location debug module still in `wds.js` chain (`wds-location-debug.js`) — consider prod strip.  
- Render audit / platform guard useful for beta; gate behind flag later.

---

## Verdict

Hardening **reduced operational debt** more than code-volume debt. The largest remaining technical debt for V1 is still **frontend delivery architecture** (module fan-out), not missing try/catch.
