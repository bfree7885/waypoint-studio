# Turnaround Sprint 4 — Canonical Dashboard Loader

**Date:** 2026-07-26  
**Branch:** `turnaround/sprint-04-canonical-dashboard-loader`  
**Base:** Sprint 3 tip `3901080`  
**Audit:** P1-002 — obsolete Dashboard generations loaded via `wds.js`

---

## Objective

Stop loading Outdoor OS / V1 / V2 / V3 / Recovery on Home and `/apps/dashboard/`. Mount one Rebuild implementation through a dedicated loader.

---

## Load path (after)

```
index.html  ──┐
              ├── wds-build.js
              ├── wds-home.js   (48 modules — Rebuild + OIP/weather/nav)
              └── apps/dashboard/js/home-boot.js  → WDS.dashboardRebuild.mount()
apps/dashboard/index.html ──┘  (same trio)
```

Historical sources remain in Git under `design-system/js/dashboard/{os,v2,v3,…}` — see `LEGACY-NOT-LOADED.md`. They are not registered by `wds-home.js`.

---

## Modules before / after

| Metric | Before (`wds.js`) | After (`wds-home.js`) | Delta |
| --- | --- | --- | --- |
| Modules | **165** | **48** | **−117** |
| JS bytes (sum of module files) | **1,836,590** (~1794 KiB) | **513,787** (~502 KiB) | **−1,292 KiB** |
| Estimated JS requests | **166** | **49** | **−117** |

Evidence: `loader-before.json`, `loader-after.json`, `loader-delta.json`

### Removed from live Home runtime

- Outdoor OS (`dashboard/os/*`)
- Dashboard V2 (`dashboard/v2/*`)
- Dashboard V3 (`dashboard/v3/*`)
- Recovery (`wds-dashboard-recovery.js`)
- V1 dashboard widgets/catalog/story/briefing/settings/…
- `wds-happening-now.js`, `wds-dashboard-engine.js`, `wds-content-engine.js` (Home mount)
- OIE brief/rules engines (Home uses OIP `get()` path)
- Species/knowledge/education/gallery/upload and related non-Home surfaces
- Dashboard UI intel packs (wildlife/flora/safety/trails renderers)

### Kept (minimum Rebuild set)

Shell/nav · location · weather/air/alerts/elevation · USGS/trails (OIP) · regional intelligence · OIP · reliability · Rebuild data/registry/prefs/today/workspace/customize/kiosk/deepeners · Take

`wds.js` (non-Home demos/contact) was also stripped of V1/V2/V3/OS/Recovery/Rebuild so obsolete eras cannot return via that loader either.

---

## Browser metrics (local clean Chrome)

From `browser-metrics.json` (seeded Pike County location):

| Route | Viewport | Unique JS | Shell ready mark | Legacy OS/V2/V3 globals | CLS approx | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | desktop | 51 | ~189 ms | none | 0 | 0 |
| `/apps/dashboard/` | desktop | 51 | ~237 ms | none | 0 | 0 |
| `/` | mobile | 51 | ~181 ms | none | 0 | 0 |
| `/#/customize` | desktop | 51 | present | none | 0 | 0 |
| `/#/kiosk` | desktop | 51 | ~199 ms · platform ~475 ms | none | 0 | 0 |

`loaderModules` reported by runtime: **48**. Customize + kiosk APIs present. Rebuild mounts; Outdoor OS / V2 / V3 globals absent.

---

## Screenshots

`docs/turnaround/2026-07-26-sprint-04/`

- `home__desktop.png` / `home__mobile.png`
- `dash__desktop.png` / `dash__mobile.png`
- `customize__desktop.png`
- `kiosk__desktop.png`

---

## Tests

| Suite | Result |
| --- | --- |
| `test-canonical-dashboard-loader.mjs` | **Pass** (fails if legacy paths re-enter `wds-home.js`) |
| `test-home-rc1.mjs` | **56/56** |
| `test-dashboard-tile-layout-repair.mjs` | **50/50** |
| `test-dashboard-rebuild-phase1.mjs` | **88/88** |
| `test-dashboard-rebuild-phase2.mjs` | **96/96** |
| Browser capture smoke | **ok: true** |

---

## Files of note

- `design-system/js/wds-home.js` — canonical loader
- `design-system/js/wds.js` — legacy eras removed
- `design-system/js/dashboard/LEGACY-NOT-LOADED.md`
- `index.html`, `apps/dashboard/index.html` — point at `wds-home.js` (`dash-canonical-1`)
- `automation/test-canonical-dashboard-loader.mjs`
- `automation/capture-sprint-04-canonical-loader.mjs`

---

## Risks / follow-ups

- Other product apps that still used mega `wds.js` for Rebuild will not get Rebuild (none did in production HTML except Home).
- Further trim OIP optional providers (USGS/trails) if Home tiles never surface them.
- Do not merge/deploy until owner gate.
