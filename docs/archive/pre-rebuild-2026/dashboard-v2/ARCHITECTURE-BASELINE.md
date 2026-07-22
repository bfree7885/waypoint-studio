# Dashboard V2 — Architecture Baseline (pre-change)

**Captured:** 2026-07-19  
**Purpose:** Protect working V1 before Version 2 work.

## Entry points

| Route | File |
|-------|------|
| Canonical | `apps/dashboard/index.html` |
| Legacy redirect | `dashboard.html` → `apps/dashboard/` |
| Boot | `apps/dashboard/js/home-boot.js` |

## Boot sequence (V1)

1. HTML shell + skeleton (`wdb-page-loading`)
2. `wds.js` loads design-system modules in order
3. `home-boot.js` resolves location (provisional US-national shell if no coords)
4. `WDS.contentEngine.init({ sections: ["outdoor-dashboard"] })`
5. `WDS.dashboardEngine.renderDashboard` → **Product Recovery shell** (default ON)
6. OIP hydrates providers in parallel; widgets mount lazily per tab

## Recovery shell (V1 primary UI)

- Module: `design-system/js/dashboard/wds-dashboard-recovery.js`
- Tabs: Today · Weather · Photography · Rivers · Air · Sun & Moon · Alerts
- Today tab: `wds-dashboard-today-summary.js` (interpretive bullets)
- Feature flag: `waypoint-dashboard-recovery-v1` (`"0"` disables)

## Shared dependencies (do not break)

- `WDS.location` / `wds-location-v3`
- `WDS.outdoorIntelligence` (OIP package)
- `WDS.dashboardEngine` mount + reliability settle
- `WDS.photographyConditions` (Photo Coach contract)
- Widget catalog: `wds-dashboard-catalog.js`, settings v4 storage

## Providers (live at baseline)

Open-Meteo weather/AQ, NWS alerts, USGS water, Nominatim geocode, Open-Meteo elevation, OSM trails.

## Tests at baseline

- `automation/test-dashboard-reliability.mjs` (unit, 38 cases)
- CDP smokes: `automation/smoke-browser.mjs`, `automation/mobile-layout.mjs`
- **No Playwright** in repo at baseline

## V1 behavior preserved in V2

- All recovery tabs and widget mounts unchanged
- Customize / settings panel unchanged
- Routes and `dashboard.html` redirect unchanged
- V2 adds layer **above** tabs; V1 detail panels remain
