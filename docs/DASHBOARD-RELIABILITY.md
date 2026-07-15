# Dashboard Reliability & Provider Resilience

**Work block:** Dashboard Reliability & Provider Resilience  
**Date:** 2026-07-14  
**Commit status:** **Not committed. Not pushed.** Owner review required.

---

## Mission

Make the Outdoor Intelligence Dashboard feel dependable when providers are slow, partial, cached, or offline. Widgets must always reach a **terminal state**. Users should never wonder whether the application is broken.

---

## Architecture reviewed

| Layer | Role |
|-------|------|
| `apps/dashboard/js/home-boot.js` | Boot gate, location bootstrap, 5‑min refresh |
| `design-system/js/wds-content-engine.js` | Region load → OIP package → render grid → mount widgets; live-updated banner |
| `design-system/js/outdoor-intelligence/wds-oip-service.js` | Parallel provider assemble with soft timeouts; in-memory `lastPackage` |
| `design-system/js/dashboard/wds-dashboard-reliability.js` | **New** trust vocabulary, connectivity, mount deadlines |
| `design-system/js/dashboard/wds-dashboard-engine.js` | Mount batch + `settleStaleMounts` + refresh settlement |
| `design-system/js/dashboard/wds-educational-fallback.js` | Operational panels (Loading / Offline / Cached / Provider Unavailable / …) |
| `design-system/js/dashboard/wds-dashboard-widget-data.js` | `liveMount` / tags for catalog widgets |
| Specialty UIs | Outdoor weather, sky/sun-moon/photography, trail/water/… mounts |

Providers (current): Open‑Meteo weather/AQ, NWS alerts, USGS water, Overpass trails, elevation, derived daylight/photography (OIE).

---

## Terminal states (tags + panels)

| State | Tag | When |
|-------|-----|------|
| Loading | Loading | Mount in progress; waiting copy is provider-specific |
| Success | Live | Provider returned usable live data |
| Partial Success | Partial | Package `blockStatus` mixes live + unavailable |
| Cached | Cached | Offline with `lastPackage`, stale trail cache, or failed refresh with prior package |
| Offline | Offline | `navigator.onLine === false` and no usable cache for that block |
| Provider Unavailable | Provider Unavailable | Timeout / soft-fail after hydrate |
| Error | Error | Hard mount/API error path |

Success keeps the established product word **Live** (not “Success”) to avoid a branding/trust rewrite.

Visual distinction: new CSS classes `--loading`, `--partial`, `--cached`, `--offline`, `--error` on widget tags (layout unchanged).

---

## Failure scenarios → recovery

| Scenario | Behavior |
|----------|----------|
| Provider timeout (8s OIP; 8s forecast mounts) | Soft-fail → null slice / Provider Unavailable panel; other providers continue |
| Sky forecast hang (historical gap) | Now raced with `raceForecast` (8s); no longer blocks settle forever |
| Mount batch hang | Entire `mountWidgets` jobs wrapped with 12s deadline, then `settleStaleMounts` |
| Partial provider success | `meta.trust = partial`; banner + optional Live→Partial tag promotion |
| Offline + cache | OIP returns last package with `fromCache` / `trust=cached`; banner “Using cached conditions” |
| Offline + no cache | Empty unavailable package with `trust=offline`; Offline panels |
| OIP get throws after prior success | Prefer cached package over empty |
| Widget refresh click | Mount race + settle stale on that article |
| Stale busy mounts after QC settle | Settled to Provider Unavailable / Offline / Cached with specific copy |

---

## Timeout strategy

| Path | Timeout | Notes |
|------|---------|-------|
| OIP `settleProvider` (weather, alerts, AQ, elevation, USGS) | **8000 ms** | Soft-fail → null |
| OIP trails | **75000 ms** | Overpass can be slow; service has its own retries |
| Outdoor weather UI forecast race | **8000 ms** | Via `dashboardReliability.raceForecast` |
| Sky / photography forecast race | **8000 ms** | Same helper (was previously unbounded) |
| Mount batch deadline | **12000 ms** | Guarantees `settleStaleMounts` runs |
| Geo boot / geocode | 8000 / 6000 ms | Unchanged |
| Home module boot deadline | 20000 ms | Unchanged |

---

## Retry strategy

| Path | Retries |
|------|---------|
| Weather / AQI / NWS / USGS / elevation | **None** at OIP (by design — soft timeout + next refresh) |
| Trails (Overpass) | Endpoint failover + **1** retry with short backoff (existing) |
| User refresh | Per-widget ↻ and 5‑minute dashboard refresh |
| Location | User “Use my location” retry (existing) |

This block does **not** invent aggressive weather retries (rate-limit risk). Recovery preference: cache → honest terminal state → user refresh.

---

## Caching strategy

| Store | Use in reliability |
|-------|--------------------|
| OIP `lastPackage` (memory) | Returned when offline or when assemble fails after a prior success |
| Trail in-memory cache | Can mark package `fromCache` / `stale` when service returns stale trail data |
| Location `wds-location-v3` | Existing 6h soft cache for coordinates (unchanged) |
| AQI / NWS / USGS / elevation TTLs | Unchanged provider caches |

Cached UI must show **Cached** (or Offline) — never imply Live.

Banner (`renderLiveUpdatedBanner`) now surfaces Offline / Cached / Partial with age when possible.

---

## User-facing copy changes

Examples of clearer status language:

- “Waiting for weather provider…”
- “River data unavailable”
- “Weather provider timed out. Retry this block…”
- “Using cached conditions”
- “Offline”
- “Provider Unavailable” (replaces vague “Unavailable” / “Not yet available” on failure tags)

---

## Startup improvements

1. `liveMount` no longer pretends **Live** while still loading.
2. Mount jobs cannot hang settlement indefinitely (sky timeout + batch deadline).
3. Late settle always clears `aria-busy`.
4. Offline short-circuit avoids waiting on dead network during `OIP.get`.
5. Partial trust surfaces after hydrate without blocking unrelated widgets (providers already parallel).

---

## Automated tests

`automation/test-dashboard-reliability.mjs` (38 assertions) covers:

- Tag vocabulary mapping  
- Waiting / unavailable copy  
- Partial / cached / offline package trust  
- Connectivity meta application  
- Educational fallback badges  
- `liveMount` Loading regression  
- Settle clears busy (online + offline)  
- `withDeadline` / `raceForecast` timeout → null (deadline **0 ms**, not flaky sleeps)

Also re-checked: trail unit suite + browser smoke (PASS).

---

## Remaining risks

1. Provider in-memory caches (AQI/NWS/…) are not unified with OIP offline package — weather body can still be empty offline if never hydrated.
2. Trails hydrate asynchronously after first package (stabilization block) — trail widget may briefly show Loading/Unavailable before Overpass completes.
3. Customize can re-enable legacy duplicate widgets with weaker mount paths.
4. No Service Worker / IndexedDB weather persistence — cache is session/memory + location localStorage only.
5. `navigator.onLine` is imperfect (false positives/negatives on captive portals).
6. Deep per-widget keyboard/a11y of refresh controls not expanded in this block.

---

## Progressive paint (stabilization follow-up)

As of the Scene Builder + perceived-performance stabilization block:

1. Content engine paints the dashboard **grid with Loading cards** immediately after region load, before OIP completes.
2. Trails are **split off** the critical `Promise.all` and merge later via `notifyChange`.
3. Safe `readStored()` locations (non–engine-publish-point) can start the dashboard while geolocation finishes.
4. WSKB preload no longer gates first paint.

---

## Recommendations (future)

1. Persist last successful weather slice to `sessionStorage` for true cold-start offline.
2. Soft single retry on weather timeout only when online and telemetry shows transient failure.
3. Smoke asserts: morning widgets not stuck Loading; Offline banner appears under controlled CDP offline.
4. Cull Customize duplicates for legacy hourly/forecast/river singles.

---

## Files touched (this block)

- `design-system/js/dashboard/wds-dashboard-reliability.js` (**new**)
- `design-system/js/dashboard/wds-educational-fallback.js`
- `design-system/js/dashboard/wds-dashboard-widget-data.js`
- `design-system/js/dashboard/wds-dashboard-engine.js`
- `design-system/js/wds-weather-ui.js`
- `design-system/js/weather/wds-outdoor-weather-ui.js`
- `design-system/js/weather/wds-sky-dashboard-ui.js`
- `design-system/js/outdoor-intelligence/wds-oip-service.js`
- `design-system/js/wds-content-engine.js`
- `design-system/js/wds.js` (script order)
- `design-system/css/wds-dashboard-widgets.css`
- `automation/test-dashboard-reliability.mjs` (**new**)
- `docs/DASHBOARD-RELIABILITY.md` (**this file**)

---

*End of Dashboard Reliability documentation.*
