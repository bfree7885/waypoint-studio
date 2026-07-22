# Dashboard V2 — Personalized Outdoor Intelligence

**Question answered:** *What should I know before I go outside today?*  
**Internal version:** `2.1.0`  
**Feature flag:** `localStorage.waypoint-dashboard-v2` (default **on**; set `"0"` for V1 summary shell)

## Product shape

1. **Location & status header** — place label, local date/time, data freshness, trust badge (`Live` · `Cached` · `Partial` · `Offline` · `Provider Unavailable`), Customize widgets, Change location, Refresh, optional Kiosk (fullscreen of the same board)
2. **User-selected widgets** — only enabled widgets, grouped by category
3. **Waypoint’s Take** — deterministic 5–8 bullets beneath the board (more when hazards are active)
4. **Optional kiosk mode** — same registry, prefs, trust, cache, and Take engine (`WDS.dashboardV2Engine`)

No accounts. Preferences and cache stay on-device.

## Categories

Every widget belongs to exactly one category:

| Category | Examples |
|----------|----------|
| Weather | Current, hourly, multi-day, wind, precip |
| Astronomy | Sunrise/sunset, golden/blue hour, moon |
| Photography | Conditions, landscape/wildlife/night cues |
| Hiking and Outdoor Activity | Comfort, heat/cold, daylight remaining |
| Rivers and Water | Nearby USGS gauges, trend, flood context |
| Air and Environment | AQI, UV, visibility |
| Alerts and Safety | NWS, flood/heat/fire/storm filters |
| Seasonal Intelligence | Frost/snow cues, experimental phenology |

## Defaults (curated first load)

Current Conditions · Hourly Forecast · Severe/Weather Alerts · Sunrise/Sunset · Golden/Blue Hour · Moon Phase · Photography Conditions · Hiking Conditions · Air Quality · UV Index · Nearby River Gauges

## Availability honesty

| State | Meaning |
|-------|---------|
| **Live** | Backed by a live provider when online |
| **Derived** | Computed from live weather/daylight/moon/etc. |
| **Experimental** | Heuristic only (fog, mud, frost, mushroom cues) |
| **Planned** | Catalogued; shown in Customize; never invents values |
| **Data unavailable** | Provider/location cannot supply data this session |

**Planned (not fake-live):** pollen, smoke, primary pollutant, insect activity, water temperature, leaf/phenology, wildlife/migration feeds.

## Persistence

| Key | Purpose |
|-----|---------|
| `waypoint-dashboard-v2-widgets-v1` | Enabled widget ids + order |
| `waypoint-dashboard-v2` | Feature flag |
| `waypoint-dashboard-v2-cache-v1` | Trust/cache payload (location-keyed) |
| `waypoint-dashboard-v2-kiosk` | Kiosk/fullscreen preference |

Customize → toggle/reorder/Apply/Done writes immediately and survives refresh. **Reset defaults** restores the curated starter set.

## Waypoint’s Take

Deterministic rules engine — **no paid AI API**.

Priority: **Safety → Major changes / time-sensitive → Photography → Hiking → Rivers → Air → Seasonal**

- Interprets conditions; does not dump raw tables
- States partial/cached/offline clearly
- API: `WDS.dashboardV2Take.generateWaypointsTake(...)` (also `generateWaypointsTake`)

## Shared engine (Dashboard + Kiosk)

`WDS.dashboardV2Engine` is the single façade for:

- Widget registry (`dashboardV2Widgets`)
- Layout prefs (`dashboardV2Prefs`)
- Trust + cache (`dashboardV2Trust`)
- Board payload + HTML (`buildPayload` / `renderBoard` / `mount`)
- Kiosk mode flag (`setKioskMode` / `isKioskMode` / `syncSnapshot`)

Kiosk mode is fullscreen of the **same** board — identical selected widgets, Take, and trust.

## Mobile

Layouts target 320 · 375 · 390 · 430 · 768 · 1024 · 1440 with `overflow-x: clip` on the V2 root and single-column widget grids below 640px.

## Tests

```bash
node automation/test-dashboard-v2.mjs
```

Covers persistence, reorder selection, category grouping, provider failures, Waypoint’s Take, and kiosk sync.

## Modules

| File | Role |
|------|------|
| `v2/wds-dashboard-v2-widgets.js` | Category catalog |
| `v2/wds-dashboard-v2-prefs.js` | localStorage layout prefs |
| `v2/wds-dashboard-v2-widget-render.js` | Per-widget HTML |
| `v2/wds-dashboard-v2-take.js` | Waypoint’s Take |
| `v2/wds-dashboard-v2-customize.js` | Customize dialog (toggle, drag + keyboard reorder, reset) |
| `v2/wds-dashboard-v2-render.js` | Header + take + trust shell |
| `v2/wds-dashboard-v2.js` | Orchestrator |
| `v2/wds-dashboard-v2-engine.js` | Shared Dashboard/Kiosk engine |
| `v2/wds-dashboard-v2-trust.js` | Provider rows + cache |
| `v2/wds-dashboard-v2-model.js` | Normalized location/weather contracts |

See also: [`DASHBOARD-V2-IMPLEMENTATION.md`](./DASHBOARD-V2-IMPLEMENTATION.md).
