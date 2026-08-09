# Owner review — Live data reliability status

**Branch:** `feature/live-data-reliability-status`  
**Author:** Bryan Freeman  
**Date:** 2026-08-08  
**Status:** Ready for owner review — **do not merge** until approved  
**Do not merge.**

---

## Objective

Users should never wonder whether live data is current. Audit every live feed, ship a reusable honesty component (`wds-live-status`), wire it into key surfaces, and document sources / semantics / retry — without redesigning apps.

---

## What shipped

### Reusable component

| Path | Role |
| --- | --- |
| `design-system/js/platform/wds-live-status.js` | `WDS.liveStatus` — normalize, adapters, render, mount |
| `design-system/css/wds-live-status.css` | Calm strip + dark HUD variant |
| Registered in | `design-system/js/wds.js`, `design-system/css/wds.css` |

Reports: **Last updated · Source · Healthy / Warning / Offline · Retry · graceful failure**.

### Integrations

| Surface | Change |
| --- | --- |
| Articles | Feed health uses shared component; retry reloads page |
| Sheds map | Weather + tile health in context panel; weather failures no longer silent |
| SignalTerrain Cyber Live | Trust strip uses shared component; retry remounts live UI |
| Global Signals home | Status strip under honesty banner (sample/demo → Warning) |

### Docs

- `docs/quality/live-data-sources.md` — full inventory, semantics, schedules
- This owner review

### Tests

- `automation/test-live-status.mjs` — state normalization, adapters, HTML contract
- Hooked in CI after Articles RSS tests

---

## Feeds audited

1. Articles curated RSS (+ Actions every 12h)  
2. Outdoor Live Engine (`data/live.json` / `health.json`) — adapter ready; dashboard migration follow-up  
3. Sheds Open-Meteo weather (client)  
4. Sheds map tiles (OSM / OpenTopoMap)  
5. SignalTerrain Cyber Live providers  
6. Global Signals home package (sample/demo on main; live ingest noted on feature branch)  
7. Scheduled workflows (`articles-refresh`, Pages, GS ingest on feature branch)

---

## Product / trust notes

- Sample/demo Global Signals is **Warning**, not Healthy.  
- Cyber never substitutes sample threats when live fails.  
- Articles never invent stories when feeds fail.  
- Sheds weather errors surface Offline with continue-without-weather messaging.  
- Age demotion is honest; labeled demos skip false Offline aging.

---

## Recommendation

**Approve for merge after a quick visual pass** on:

1. `/articles/` — status strip + Retry  
2. `/apps/shed-hunting/map/` — open Context (i) → weather + tiles  
3. `/apps/signalterrain/cyber/live.html` — trust strip  
4. `/side-trails/global-signals/` — Warning for sample/demo  

Follow-up (separate PR): migrate dashboard Live Engine chips to the same component; wire GS ingestion `status.json` when live architecture lands.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Surfaces that omit the script fall back to prior markup | Articles / ST keep legacy fallbacks |
| Tile counters grow without reset on layer switch | Acceptable honesty signal; reset can be a polish item |
| Live Engine dashboard not fully migrated | Documented; adapter exists |

---

## Verification

```bash
node automation/test-live-status.mjs
```

Optional: open the four surfaces above locally with a static server.
