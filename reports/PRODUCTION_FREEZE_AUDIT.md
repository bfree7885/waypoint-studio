# Waypoint Outdoor Intelligence — Production Freeze Audit

**Date:** 2026-07-10  
**Build:** `f84b5f8` (+ freeze hardening commit)  
**Scope:** Dashboard, kiosk, live engine — monitoring-ready freeze  
**Status:** Feature-frozen for real-world monitoring period

---

## Executive summary

The Outdoor Intelligence dashboard, kiosk, and live engine are **production-ready for a monitoring freeze** with no critical blockers identified in automated validation. Core modules load independently via OIP parallel providers with honest unavailable states. This freeze **does not add features**; it gates debug overhead, removes a dead boot branch, and documents known gaps.

---

## Module verification matrix

| Module | Provider | Dashboard | Kiosk | Live engine | Independent failure |
|--------|----------|-----------|-------|-------------|-------------------|
| **Location** | Browser geo → IP → cache | ✅ `wds-location.js` | ✅ `kiosk-boot.js` | N/A (user-only) | ✅ Unavailable state, no fake coords |
| **Time/timezone** | Open-Meteo + `wds-daylight-utils` | ✅ Sky dashboard | ✅ `kiosk-normalize` daylight | ✅ sunrise/sunset plugins | ✅ Falls back to browser TZ |
| **Current weather** | Open-Meteo | ✅ Outdoor weather widget | ✅ Kiosk weather panel | ✅ weather plugin | ✅ `settleProvider` timeout isolated |
| **Hourly forecast** | Open-Meteo | ✅ Weather UI | ✅ Kiosk hourly | ✅ (in weather pkg) | ✅ Unavailable panel if missing |
| **Daily forecast** | Open-Meteo | ✅ Weather UI | ✅ Today range/summary | ✅ (in weather pkg) | ✅ Same |
| **Sun/Moon** | Derived from weather/daylight | ✅ Sky dashboard | ✅ `renderSunMoon()` | ✅ moon + sunrise plugins | ✅ Guard rejects engine coords |
| **AQI** | Open-Meteo AQ | ✅ Safety dashboard | ✅ `renderAqi()` | ✅ air_quality plugin | ✅ Unavailable if fetch fails |
| **UV** | Open-Meteo current | ✅ Safety / weather | ✅ `renderUv()` | ✅ uv plugin | ✅ Shows — when missing |
| **River gauges** | USGS Water | ✅ Water dashboard | ✅ `renderRiver()` | ✅ river_gauges plugin | ✅ no-nearby vs unavailable |
| **NWS alerts** | weather.gov | ✅ Safety dashboard | ✅ `renderAlerts()` | ✅ alerts plugin | ✅ empty vs unavailable |
| **Photography** | `wds-photography-conditions` | ✅ Sky / photo widgets | ✅ via `kiosk-normalize` | ⚠️ Simpler engine heuristic | ✅ User surfaces share canonical module |

---

## Automated validation results

| Test | Result |
|------|--------|
| `automation/test-kiosk-modules.mjs` | PASS |
| `automation/test-kiosk-location-boot.mjs` | PASS |
| `automation/test-trail-conditions.mjs` | PASS |
| `automation/test-profile-migration.mjs` | PASS |
| `scripts/validate-location.mjs` | PASS |
| `scripts/validate-location-sensitive.mjs` | PASS |
| `scripts/validate-surface-consistency.mjs` | PASS (after harness alignment) |
| `scripts/validate-dashboard-data.mjs` | PASS |
| `scripts/validate-live-engine-resilience.mjs` | PASS (20 cycles) |

---

## Remaining critical bugs

**None identified** in automated validation for the scoped production modules.

Historical Kansas/engine-coordinate leak is **guarded** (`wds-platform-guard.js`, `kiosk-normalize.js`, runtime migration) and covered by regression tests. Re-run `scripts/verify-production.mjs` after each deploy during monitoring.

---

## Remaining non-critical bugs

1. **Kiosk pollen/wildlife panels** — Always show unavailable stubs; live engine fetches pollen/eBird server-side only. UI slots exist but no user-location provider wired.
2. **Photography score divergence** — Live engine `data/live.json` uses simplified cloud heuristic; dashboard/kiosk use `wds-photography-conditions.js`. Intentional separation; engine JSON is health metadata only.
3. **Headless geolocation** — Browser tests cannot obtain geo/IP in CI; cache-fallback paths validated separately.
4. **Overpass trail latency** — Trail conditions (shipped in f84b5f8) can take 12–55s; OIP 75s timeout + widget deferred refetch. Out of freeze scope for new work.
5. **Photo Coach smoke** — Pre-existing `WDS.appBoot unavailable` in headless smoke (adjacent app, not dashboard core).

---

## Technical debt (documented, not addressed in freeze)

| Item | Location | Notes |
|------|----------|-------|
| Duplicate boot paths | `kiosk-boot.js` vs `wds-app-boot.js` | Near-identical OIP fetch; consolidate post-freeze |
| Triplicated ENGINE_PUBLISH constant | guard, normalize, location | Extract shared constant |
| Legacy widget IDs | `wds-dashboard-settings.js` | 20+ hidden via `hideIfNew()` |
| `wds-provenance.js` shim | Bundle loader | Deprecated alias; call sites use `researchIntegrity \|\| provenance` |
| Full dashboard re-init on 5min refresh | `home-boot.js` `scheduleDashboardRefresh` | Re-runs `contentEngine.init`; consider diff refresh |
| Kiosk sun/moon HTML | `kiosk.js` inline | Diverges from `wds-sky-dashboard-ui.js` formatting |
| AQI category mapping | live-engine vs client service | Duplicated `aqiCategory()` |
| Operational artifacts in repo | `data/live.json`, `debug.html`, `status.html` | Engine-generated; ensure publish pipeline is intentional |

---

## Recommended future enhancements (NOT implemented)

- Wire kiosk pollen/eBird from OIP when providers become user-location keyed
- Consolidate kiosk boot onto `wds-app-boot.js`
- Shared sun/moon renderer between kiosk and dashboard
- Diff-based dashboard refresh instead of full re-init
- Remove `wds-provenance.js` after call-site migration
- Additional trail data sources (only if monitoring validates Overpass reliability)
- eBird, Recreation.gov, NPS integrations (marked pending in integrations registry)

---

## Freeze hardening applied (this commit)

1. **Debug snapshot gated** — `wireDebugSnapshot()` in `home-boot.js` runs only with `?debug=location` or `localStorage["waypoint-debug-location"]=1`. Eliminates MutationObserver + 5s interval overhead in production.
2. **Render audit gated** — `wds-render-audit.js` auto-init disabled unless same debug flag. Removes observers/intervals on every page load.
3. **Debug nav removed** — `debug.html` link removed from public dashboard nav (`index.html`). Ops access via direct URL / live engine artifact remains.
4. **Dead boot branch removed** — `WDS.regionalIntelligence.configure` fallback in `home-boot.js` (never existed on top-level API).
5. **Validation harness aligned** — `validate-surface-consistency.mjs` checks `kiosk-normalize.js` for canonical photography path.

---

## Monitoring checklist (next 7 days)

- [ ] Confirm `https://waypointstudio.org/status.html` shows HEALTHY engine
- [ ] Spot-check dashboard at resolved location: weather, sun/moon, AQI, river, alerts load independently
- [ ] Verify kiosk at `/kiosk.html` with geo: no Kansas sunrise/river leak
- [ ] Run `node scripts/verify-production.mjs` daily or after deploys
- [ ] Watch for console errors on mobile (390px) and desktop
- [ ] Confirm 5-minute dashboard refresh does not degrade performance

---

## Architecture reference

```
WDS.location.bootstrap()
  → WDS.outdoorIntelligence.get()     [parallel: weather, AQI, NWS, USGS, elevation, trails]
  → WDS.platformGuard.sanitize()
  → WDS.liveEngine.mergeEngineContext() [health metadata only]
  → Dashboard: content-engine → dashboard-engine → *-ui.js
  → Kiosk: kiosk-boot → kiosk-normalize → kiosk.js
  → Live engine: waypoint-live-engine.mjs → data/live.json (publish point, not user weather)
```

**Feature freeze effective:** No new capabilities, providers, UI features, or missions until monitoring period completes.
