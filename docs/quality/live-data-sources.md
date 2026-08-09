# Live data sources inventory

**Branch:** `feature/live-data-reliability-status`  
**Purpose:** Honest inventory of every live (or scheduled) feed used in Waypoint Studio, with status semantics and retry behavior.  
**Product rule:** Never fabricate freshness. Prefer Explicit Unknown / Offline over silent omission.

Canonical UI: `design-system/js/platform/wds-live-status.js` + `design-system/css/wds-live-status.css` (`WDS.liveStatus`).

---

## Status semantics (shared)

| State | Meaning | Dot / label |
| --- | --- | --- |
| **Healthy** | Feed responded; data is within expected freshness | Green · Healthy |
| **Warning** | Partial success, stale/cached, degraded modules, or labeled sample/demo | Amber · Warning |
| **Offline** | Fetch failed, package missing, or age beyond max | Red · Offline |
| **Unknown** | Health metadata missing; do not invent a healthier state | Gray · Unknown |
| **Loading** | Request in flight | Blue pulse · Loading |

Every status strip should surface:

1. **Last updated** (relative + `datetime` when known)
2. **Source** (provider / artifact path / schedule)
3. **State** (above)
4. **Retry** (when a client remount/reload is useful)
5. **Graceful failure message** (what the UI is doing without inventing data)

Age policy defaults (overridable per adapter): warn after 3h, treat as offline after 12h. Live Engine uses tighter windows (warn 90m / offline 3h). Cyber uses wider windows (warn 6h / offline 24h). Sample/demo datasets skip age demotion so labeled demos are not falsely marked Offline.

---

## Feed inventory

### 1. Articles / curated RSS

| | |
| --- | --- |
| **Surfaces** | `/articles/`, RSS at `/feeds/waypoint-*.xml` |
| **Artifacts** | `data/articles/articles.json`, `data/articles/health.json` |
| **Sources** | Publisher RSS listed in `data/articles/feed-registry.json` (NOAA, Audubon, etc.) |
| **Schedule** | GitHub Actions `articles-refresh.yml` — cron `0 */12 * * *` + `workflow_dispatch` |
| **Retry** | Workflow re-run; UI “Refresh page” reloads committed artifacts |
| **Failure mode** | Empty set refused (keeps last good in git); UI shows Offline / Warning — never invents stories |
| **Status adapter** | `WDS.liveStatus.fromArticlesHealth(health, data)` |
| **Wired** | Yes — Articles feed replaces legacy badge when component present |

### 2. Outdoor Live Engine (weather + modules)

| | |
| --- | --- |
| **Surfaces** | Home / dashboard outdoor widgets via `wds-live-engine-feed.js` |
| **Artifacts** | `data/live.json`, `data/health.json`, `data/publish-state.json` |
| **Sources** | Open-Meteo (weather, AQ, UV), NWS alerts, derived sun/photography modules |
| **Schedule** | Engine script `scripts/waypoint-live-engine.mjs` (~30 minute nextScheduledUpdate); publish path is operational, not always on Actions on `main` |
| **Retry** | Re-run engine; client re-fetches `/data/live.json` with cache bust |
| **Failure mode** | Module-level fallback / degraded overall status; client must not treat missing feed as “fine” |
| **Status adapter** | `WDS.liveStatus.fromLiveEngine(health, feed)` |
| **Wired** | Adapter ready; dashboard already has trust/last-updated strips — prefer migrating those call sites to `wds-live-status` in a follow-up |

### 3. Sheds map — weather (client)

| | |
| --- | --- |
| **Surfaces** | `/apps/shed-hunting/map/` |
| **Sources** | Open-Meteo forecast API (browser `fetch`, no key) |
| **Schedule** | On locate / recompute when online |
| **Retry** | “Retry weather” in status panel |
| **Failure mode** | Scoring continues without weather; status shows Offline + error text (no silent `null`) |
| **Status adapter** | `WDS.liveStatus.fromClientFeed({ id: "sheds-weather", … })` |
| **Wired** | Yes |

### 4. Sheds map — tiles

| | |
| --- | --- |
| **Surfaces** | Sheds map basemap |
| **Sources** | OpenStreetMap raster tiles; optional OpenTopoMap layer |
| **Schedule** | Continuous while map pans/zooms |
| **Retry** | Pan/zoom or switch layer; offline banner when browser offline |
| **Failure mode** | `tileerror` increments failure count → Warning/Offline; cached tiles may still paint |
| **Status adapter** | `fromClientFeed({ id: "sheds-tiles", … })` |
| **Wired** | Yes |

### 5. SignalTerrain Cyber Live

| | |
| --- | --- |
| **Surfaces** | `/apps/signalterrain/cyber/live.html` |
| **Artifacts** | `data/cyber/live.json`, `data/cyber/health.json`, `data/cyber/history.json` |
| **Sources** | CISA KEV, NVD, CISA advisories, vendor RSS, cloud status RSS, etc. (`scripts/signalterrain-cyber-live-engine.mjs`) |
| **Schedule** | Engine run / ops publish (see cyber docs); not fabricated when missing |
| **Retry** | Status Retry remounts live UI; Boot timeout retry |
| **Failure mode** | Honest empty / fail UI — **never** substitutes sample threats |
| **Status adapter** | `WDS.liveStatus.fromCyberLive(doc)` |
| **Wired** | Yes — trust strip uses shared component when loaded |

### 6. Global Signals

| | |
| --- | --- |
| **Surfaces** | `/side-trails/global-signals/` |
| **Artifacts (main today)** | Labeled sample/demo JSON under `data/global-signals/**` (`home/home.json` mode `sample-demo`) |
| **Live branch (not merged)** | `feature/global-signals-live-data-architecture` adds ingestion adapters + `data/global-signals/ingestion/status.json` (~6h Actions on that branch) |
| **Retry** | Reload; live mode remounts board |
| **Failure mode** | Sample/demo is **Warning** with honesty banner — not presented as Healthy live news |
| **Status adapter** | `WDS.liveStatus.fromGlobalSignalsHome(home)` |
| **Wired** | Yes on home dashboard |

### 7. Other / related

| Feed | Notes |
| --- | --- |
| USGS water / trail live plugins | Dashboard intel modules; use engine or client status — migrate to `wds-live-status` when touching those UIs |
| Platform resilience offline banner | Browser online/offline — complementary, not a feed |
| RSS public feeds | Generated from articles refresh; freshness follows articles health |

---

## Component API (summary)

```js
WDS.liveStatus.renderHtml(spec)
WDS.liveStatus.mount(el, spec, { onRetry })
WDS.liveStatus.fromArticlesHealth(health, data)
WDS.liveStatus.fromLiveEngine(health, feed)
WDS.liveStatus.fromCyberLive(doc)
WDS.liveStatus.fromGlobalSignalsHome(home)
WDS.liveStatus.fromClientFeed({ id, label, source, state, updatedAt, message, retry })
```

States normalize aliases (`ok`→healthy, `partial`/`stale`/`degraded`→warning, `unavailable`/`error`→offline).

---

## Scheduled workflows (repo)

| Workflow | Cadence | Writes |
| --- | --- | --- |
| `articles-refresh.yml` | Every 12 hours | `data/articles/*`, RSS under `feeds/` |
| `pages.yml` | On push to main | GitHub Pages deploy |
| GS ingest (feature branch) | ~6 hours when present | `data/global-signals/production/**`, ingestion status |

---

## Follow-ups (non-blocking)

1. Migrate dashboard Live Engine / widget trust chips to `wds-live-status` for one visual language.
2. When GS live architecture merges, point `fromGlobalSignalsHome` at ingestion `status.json` for Healthy/Warning from adapter failures.
3. Optional: expose Live Engine status strip on Rebuild Home shell header.
