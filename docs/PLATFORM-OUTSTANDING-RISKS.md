# Platform Outstanding Risks

**Date:** 2026-07-18  
**Commit status:** Not committed.

---

## Blockers / high risks before inviting broad beta

| Risk | Why it matters | Mitigation status |
|---|---|---|
| Dashboard cold load on slow networks | Users may bounce before first useful paint | Known; lazy tab mounts help; **bundle split still required** |
| External provider outages (Open-Meteo / NWS / USGS) | Outdoor apps look “broken” if honesty UI missing | Soft-fail + labels largely in place |
| Sheds map CDN / tile failures | Core Sheds experience is the map | **Open** — needs explicit degraded UI |
| Location permission denial / wrong fallback | Wrong regional intelligence | Fallback labeled; still educate in UI |
| No accounts / sync | Multi-device users lose journal/cellar | Acceptable for beta if messaging clear |
| Data honesty regressions | Fake confidence destroys trust | Policy retained; tests cover FC/Savant honesty |

---

## Medium risks

- Tab refresh intervals (Dashboard 5 min) while offline → should prefer cache (mostly does).  
- Mobile memory on SignalTerrain cyber workspace (large DOM).  
- Touch map jank on low-end Android (MapView + Leaflet).  
- Support burden without a Studio-wide diagnostics page.

---

## Low risks

- Session cache privacy on shared computers (educational data only today).  
- Double-loading resilience on pages that also use `wds-platform.js` (idempotent).

---

## Non-risks (clarified)

- Lack of social features / accounts is **not** a reliability risk for V1.  
- Educational/static catalogs without live feeds are fine when labeled.
