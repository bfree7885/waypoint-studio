# Dashboard Phase 2 — Owner Review

**Status:** Awaiting owner review — **stop here; do not commit / push / merge / deploy**
**Date:** 2026-07-22
**Authority:** `docs/rebuild-2026/` (esp. `03-dashboard-architecture.md`, `07-design-system.md`)
**Base:** `recovery/dashboard-rebuild-phase1` @ `a3fbc41` (approved Phase 1)
**Git:** Nothing committed, pushed, merged, or deployed in this work block

---

## Verdict

Phase 2 delivers the **first four real Dashboard widgets** — Conditions, Light, Air, Astronomy — on the locked Phase 1 shell. Today Outside now composes up to eight observational bullets from those instruments. Photography, Rivers, Wildlife, Alerts, and Trails remain catalog placeholders (“coming soon”). Outdoor OS is not revived.

**Phase 1 design unchanged:** layout, hierarchy, nav, visual language, widget-card chrome, responsive grid, Customize, Kiosk, and local prefs key.

---

## Widgets implemented

| Widget | Catalog id | Data | Trust behavior |
|--------|------------|------|----------------|
| **Conditions** | `ph-conditions` | Temp, sky, wind, humidity, precip chance from `platform.weatherRef` | Live / Cached; Waiting without place; Unavailable if no live weather |
| **Light** | `ph-light` | Sunrise, sunset, golden hour, blue hour from `platform.daylight` | **Estimated** when windows are derived |
| **Air** | `ph-air` | US AQI, category, PM2.5 from `platform.airQuality` when `status === "live"` | Live only; never invents AQI |
| **Astronomy** | `ph-astronomy` | Moon phase, illumination (labeled Computed), moonrise/set if present, night-sky note when cloud known | Partial / Estimated; moonrise “Not reported” when absent |

Ids keep the `ph-*` prefix so `waypoint-dashboard-rebuild-prefs-v1` continues to work.

---

## Data sources

| Layer | Source |
|-------|--------|
| Orchestration | `WDS.outdoorIntelligence.get({ location, includeWeather: true })` |
| Weather | Open-Meteo primary; **NWS recovery** in `home-boot.js` when primary returns a placeholder (e.g. rate limit) |
| Daylight / light windows | `WDS.daylightUtils.enrichFromWeather` via OIP merge |
| Air quality | `WDS.airQuality` via OIP (`open-meteo-air-quality`) |
| Moon | Daylight slice (phase/illumination computed when API omits moon times) |

Widgets do not call providers directly — registry adapters read the platform package.

---

## Today Outside

- Max **8** observational bullets from the four live widgets.
- Examples from capture: “76°F under sunny.” / “Winds around 9 mph.” / “Golden hour begins at 7:18 PM.” / “Air quality is Good.” / “The moon is a waxing gibbous.”
- Forbidden coaching voice filtered (`you should`, `do this`, homework, etc.).
- Trust chip reflects package honesty (often **Partial** when some blocks are estimated or missing).

---

## Files changed

### New

| Path | Role |
|------|------|
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js` | OIP → widget payloads + Today lines |
| `automation/test-dashboard-rebuild-phase2.mjs` | Phase 2 contracts + regressions |
| `automation/capture-dashboard-phase2.mjs` | Screenshot harness |
| `docs/rebuild-2026/phase2/*` | Screenshots + capture meta |
| `docs/rebuild-2026/dashboard-phase2-owner-review.md` | This review |

### Updated

| Path | Change |
|------|--------|
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js` | Live flags, fact render, honest trust chips |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-today.js` | Lines from live data |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-workspace.js` | Pass platform into registry |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js` | `setPlatform`, hydrate paint |
| `design-system/js/wds.js` | Load rebuild-data module |
| `design-system/css/wds-dashboard-rebuild.css` | Fact rows + estimated/unavailable chips (no layout redesign) |
| `apps/dashboard/js/home-boot.js` | OIP hydrate + NWS weather recovery |
| `apps/dashboard/index.html` | Cache-bust `rebuild-p2` |
| `automation/test-dashboard-rebuild-phase1.mjs` | Align waiting copy / live waiting states |

---

## Screenshots

Directory: [`docs/rebuild-2026/phase2/`](./phase2/)

| Viewport | File |
|----------|------|
| Desktop workspace | [01-desktop-workspace.png](./phase2/01-desktop-workspace.png) |
| Desktop customize | [02-desktop-customize.png](./phase2/02-desktop-customize.png) |
| Desktop kiosk | [03-desktop-kiosk.png](./phase2/03-desktop-kiosk.png) |
| Phone workspace | [04-phone-workspace.png](./phase2/04-phone-workspace.png) |

Capture meta: `docs/rebuild-2026/phase2/capture-meta.json` (Pike County, PA; four fact widgets hydrated).

---

## Tests

```bash
node automation/test-dashboard-rebuild-phase1.mjs   # 75 passed, 0 failed
node automation/test-dashboard-rebuild-phase2.mjs   # 94 passed, 0 failed
node automation/test-dashboard-os-routes.mjs        # 40 passed, 0 failed
```

**Totals this block:** 75 + 94 + 40 = **209 passed**.

Coverage includes: widget contracts, live/stale/missing, Today observational lines, customize/prefs persistence, kiosk constraints, no Outdoor OS entry, banned coaching chrome.

---

## Performance notes

- Shell still mounts immediately; OIP hydrate is non-blocking after place is safe.
- Per-widget settle: each card shows Waiting → Live/Estimated/Unavailable independently.
- Kiosk refresh calls `outdoorIntelligence.refresh()` when available, then repaints.
- Observed capture: platform settle typically within a few seconds after place seed; Open-Meteo 429 triggers NWS recovery for conditions/daylight without inventing values.

---

## Known limitations

1. **Open-Meteo daily quota** may force NWS recovery for weather; air quality still prefers Open-Meteo AQ API.
2. **Moonrise/moonset** often “Not reported” (forecast daily no longer supplies moon times); phase/illumination are computed and labeled.
3. **Golden/blue hour** are derived (±60 min from sunrise/sunset) and tagged **Estimated**.
4. Photography / Rivers / Wildlife / Alerts / Trails remain coming-soon placeholders (by design).
5. Location bootstrap can still prompt or enrich labels; kiosk continues to skip surprise prompts.

---

## Confirmations

| Gate | Status |
|------|--------|
| Phase 1 layout / hierarchy / nav / visual language unchanged | **Yes** |
| No Outdoor OS briefing revival | **Yes** |
| Only four real widgets beyond placeholders | **Yes** |
| Honest unavailable/stale — no fabricated live numbers | **Yes** |
| Local prefs key preserved | **Yes** (`waypoint-dashboard-rebuild-prefs-v1`) |
| Nothing committed / pushed / merged / deployed | **Yes** |

---

## How to run locally

```bash
python3 -m http.server 8080
# http://localhost:8080/apps/dashboard/
# http://localhost:8080/apps/dashboard/#/customize
# http://localhost:8080/apps/dashboard/#/kiosk

node automation/test-dashboard-rebuild-phase1.mjs
node automation/test-dashboard-rebuild-phase2.mjs
```
