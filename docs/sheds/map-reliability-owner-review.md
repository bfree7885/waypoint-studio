# Sheds map reliability — owner review

**Date:** 2026-08-08  
**Branch:** `fix/sheds-map-reliability` → `release/sheds-map-reliability`  
**Base:** `origin/main` @ `8fd9131` (Side Trails discovery)  
**Canonical URL:** https://waypointstudio.org/apps/shed-hunting/map/

---

## Verdict

**Permanently fixed.** Production gray gaps had two cooperating causes; both are addressed without zoom workarounds.

| Cause | Evidence | Fix |
| --- | --- | --- |
| **1. Broken Leaflet CSS SRI (primary layout)** | Browser blocked `leaflet.css` (`integrity` mismatch). Tiles rendered with `position: static` → fragmented grid and dark gray shell background in the holes. Already logged in `audits/live-site-qa/console-errors.md`. | Vendor Leaflet 1.9.4 under `apps/shed-hunting/vendor/leaflet/` (no CDN SRI). CSS safeguard forces `position: absolute` on `#sheds-map .leaflet-tile`. |
| **2. OSMF public raster tiles (provider policy)** | Requests to `*.tile.openstreetmap.org` can return HTTP **200** PNGs with `x-blocked: Access denied` and an “Access blocked / 418” placeholder (`docs/sheds/map-reliability/osm-blocked-tile.png`). Policy: https://operations.osmfoundation.org/policies/tiles/ | Default basemap → **CARTO Voyager**; topo → **Esri World Topo**. Code **refuses** OSMF public hosts even via override. |

---

## Network / console capture

### Before (production @ `8fd9131`)

- Screenshot: [`production-before.png`](./map-reliability/production-before.png)
- Network summary: [`production-before-network.json`](./map-reliability/production-before-network.json)
- Hosts: `a|b|c.tile.openstreetmap.org`
- Console (historical QA): Leaflet CSS integrity failure — resource blocked
- Curl with `Referer: https://waypointstudio.org/` → `x-blocked` + 6933-byte placeholder PNG

### After (local fix gate)

- Screenshots: [`local-after-desktop.png`](./map-reliability/local-after-desktop.png), [`local-after-mobile.png`](./map-reliability/local-after-mobile.png), [`local-after-zoomed.png`](./map-reliability/local-after-zoomed.png)
- Coverage probe: **190/190** viewport samples covered (`coverageRatio: 1`) from CARTO tiles — [`local-tile-coverage.json`](./map-reliability/local-tile-coverage.json)
- Hosts: `*.basemaps.cartocdn.com`
- Console errors: none observed in CDP smoke

### Blocked-tile artifact

- [`osm-blocked-tile.png`](./map-reliability/osm-blocked-tile.png) — OSMF “Access blocked” placeholder (not a real basemap tile)

---

## Provider

| Role | Provider | Template | Key required |
| --- | --- | --- | --- |
| Street (default) | CARTO Voyager | `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png` | No |
| Topographic | Esri World Topo | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}` | No |
| Optional override | CI secret / meta | `WAYPOINT_MAP_TILE_CONFIG` JSON → `<meta name="waypoint-map-tiles">` via `inject-build-metadata.mjs` | Only if you inject a keyed URL |

Attribution preserved on-map (OSM contributors + CARTO; Esri / GIS User Community for topo). Privacy copy updated.

---

## Graceful failure

- `tileerror` → up to 3 timed retries per tile image
- Persistent failure → honest `#map-tile-status` banner (warn / error), not silent gray
- Loading chrome still clears on first basemap `load`
- ResizeObserver + redraw after size settle to avoid origin drift

---

## Regression gates

| Gate | Result |
| --- | --- |
| `node automation/test-sheds-tile-provider.mjs` | 15 PASS |
| `node automation/test-sheds-map.mjs` | 41 PASS |
| `node automation/test-sheds-map-cdp.mjs` | PASS |
| Desktop viewport tile coverage | 100% |
| Mobile viewport screenshot | Captured |
| Zoom-in screenshot | Captured |

---

## Remaining limitations

**Later (2026-08-29):** Unauthenticated CARTO Voyager tiles watermark **API KEY REQUIRED**. Sheds Street now defaults to Esri World Street Map. The CARTO verification below describes the 2026-08-08 OSMF fix, not the current default.

1. Esri (and any remaining CARTO) CDNs are third-party — still subject to their ToS and outages; `WAYPOINT_MAP_TILE_CONFIG` remains an optional URL overlay. Do not hardcode secrets.
2. OpenTopoMap is no longer the default topo layer (sparse/slow at overview); Esri World Topo is the Layers alternate.
3. Headless CDP screenshots can under-report composited layers; DOM coverage sampling is the authoritative local gate used here.
4. Volunteer `discover.html` already used a **correct** Leaflet CSS SRI on unpkg; Sheds had a **wrong** hash on jsDelivr — do not reintroduce CDN SRI for Sheds without verifying the digest.

---

## Production verification (live)

- **URL:** https://waypointstudio.org/apps/shed-hunting/map/
- **Deploy SHA:** `9aba99f` (`9aba99fdc41603f164f1ccacbd99bb5a8a730b19`)
- **build-info:** `shortCommit=9aba99f`, `source=github-pages`
- Leaflet CSS: vendored, **loaded** (`tilePosition: absolute`)
- Tile hosts: `*.basemaps.cartocdn.com` only (no OSMF public)
- Viewport coverage: **1.0** (complete grid)
- Screenshot: [`production-after.png`](./map-reliability/production-after.png)
- Network: [`production-after-network.json`](./map-reliability/production-after-network.json)

---

## Deploy checklist

1. Merge release → `main` (Pages workflow). **Done** (`9aba99f`).
2. Confirm `https://waypointstudio.org/data/build-info.json` `shortCommit` matches deploy SHA. **Confirmed `9aba99f`.**
3. Open https://waypointstudio.org/apps/shed-hunting/map/ — expect continuous CARTO grid, attribution visible, no integrity error in console. **Confirmed coverageRatio 1.0.**
4. Spot-check Layers → Topographic (Esri).

---

## Files touched (summary)

- `apps/shed-hunting/vendor/leaflet/**` — vendored Leaflet 1.9.4
- `apps/shed-hunting/js/sheds-tile-provider.js` — provider + reliability
- `apps/shed-hunting/js/sheds-map-app.js` — use provider, status UI, resize redraw
- `apps/shed-hunting/map/index.html` — local Leaflet, tile status node
- `apps/shed-hunting/css/sheds-map.css` — tile status + absolute-tile safeguard
- `privacy.html` — honest tile provider language
- `scripts/inject-build-metadata.mjs` + `.github/workflows/pages.yml` — optional tile config inject
- `automation/test-sheds-*.mjs` — regressions
