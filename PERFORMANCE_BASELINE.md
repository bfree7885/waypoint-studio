# Waypoint Studio — Performance Baseline

**Status:** Measurement report (no optimizations applied)  
**Date:** July 2026  
**Page under test:** Homepage outdoor dashboard (`/index.html`)  
**Method:** Static analysis of loader configuration, file sizes, boot sequence, and network call paths. No code was modified to produce this report.

---

## Executive summary

The homepage loads **67 JavaScript files (~698 KB uncompressed)** and **24 CSS files (~199 KB uncompressed)** before the dashboard can boot, plus **Google Fonts** and **one Open-Meteo API call**. The dominant cost is the **`wds.js` sequential module loader**, which injects **65 deferred scripts** that must all download and execute before `home-boot.js` can initialize the dashboard. CSS uses a **22-file `@import` chain** inside `wds.css`, creating a secondary waterfall. Live data on first load is limited to **Open-Meteo weather**; all other widgets use bundle JSON or client-side intelligence.

---

## 1. JavaScript files loaded

### Homepage entry scripts (`index.html`)

| # | File | Size |
|---|------|------|
| 1 | `design-system/js/wds.js` | 2.6 KB |
| 2 | `js/home-boot.js` | 2.2 KB |

### Modules injected by `wds.js` (65 files)

`wds.js` appends one `<script defer>` per module to `<head>`. Total: **65 modules · ~693 KB uncompressed**.

| Folder | Module count |
|--------|--------------|
| Root (`design-system/js/`) | 21 |
| `dashboard/` | 10 |
| `weather/` | 8 |
| `regional-intelligence/` | 5 |
| `outdoor-intelligence/` | 5 |
| `flora/` | 4 |
| `species/` | 2 |
| `wildlife/` | 2 |
| `trails/` | 2 |
| `water/` | 2 |
| `safety/` | 2 |
| `ethics/` | 1 |
| `observations/` | 1 |

**Total JavaScript HTTP requests on homepage cold load: 67**

### Full load order (as defined in `design-system/js/wds.js`)

```
wds-core.js
wds-research-integrity.js
wds-provenance.js
ethics/wds-outdoor-ethics.js
wds-icons.js
wds-tabs.js
wds-upload.js
wds-search.js
wds-gallery.js
species/wds-wskb-core.js
species/wds-wskb-render.js
wds-species.js
wds-nav.js
wds-education.js
wds-education-factory.js
wds-education-topic.js
wds-location.js
wds-map-view.js
wds-species-spotlight.js
weather/wds-weather-core.js
weather/wds-daylight-utils.js
weather/wds-outdoor-weather-intel.js
weather/wds-sky-dashboard-intel.js
weather/wds-weather-providers.js
weather/wds-weather-service.js
wds-weather-ui.js
weather/wds-outdoor-weather-ui.js
weather/wds-sky-dashboard-ui.js
wildlife/wds-wildlife-dashboard-intel.js
wildlife/wds-wildlife-dashboard-ui.js
trails/wds-trail-dashboard-intel.js
trails/wds-trail-dashboard-ui.js
water/wds-water-dashboard-intel.js
water/wds-water-dashboard-ui.js
flora/wds-flora-dashboard-intel.js
flora/wds-foraging-dashboard-intel.js
flora/wds-flora-dashboard-ui.js
flora/wds-foraging-dashboard-ui.js
safety/wds-safety-dashboard-intel.js
safety/wds-safety-dashboard-ui.js
regional-intelligence/wds-regional-intelligence-engine.js
regional-intelligence/wds-regional-intelligence-core.js
regional-intelligence/wds-regional-intelligence-sources.js
outdoor-intelligence/wds-oip-model.js
outdoor-intelligence/wds-oip-location.js
outdoor-intelligence/wds-oip-sources.js
outdoor-intelligence/wds-oip-adapters.js
outdoor-intelligence/wds-oip-service.js
regional-intelligence/wds-regional-intelligence-v2-core.js
regional-intelligence/wds-regional-intelligence-service.js
observations/wds-wos-core.js
wds-happening-now.js
wds-dashboard.js
dashboard/wds-dashboard-categories.js
dashboard/wds-educational-fallback.js
dashboard/wds-dashboard-widget-data.js
dashboard/wds-dashboard-widgets.js
dashboard/wds-dashboard-highlights.js
dashboard/wds-dashboard-catalog.js
dashboard/wds-dashboard-settings.js
dashboard/wds-dashboard-brief.js
dashboard/wds-dashboard-customize.js
dashboard/wds-dashboard-engine.js
wds-content-engine.js
wds-ecosystem.js
```

---

## 2. CSS files loaded

### Linked directly from `index.html`

| # | File | Role |
|---|------|------|
| 1 | Google Fonts CSS (`fonts.googleapis.com`) | External, render-blocking |
| 2 | `design-system/css/wds.css` | Master import hub, render-blocking |
| 3 | `css/home-dashboard.css` | Homepage dashboard layout, render-blocking |

### Imported by `wds.css` (22 files via `@import`)

```
wds-tokens.css
wds-base.css
wds-components.css
wds-education.css
wds-patterns.css
wds-field-guide.css
wds-home-sections.css
wds-outdoor-ethics.css
wds-provenance.css
wds-research-integrity.css
wds-content-engine.css
wds-weather.css
wds-outdoor-weather.css
wds-sky-dashboard.css
wds-wildlife-dashboard.css
wds-trail-dashboard.css
wds-water-dashboard.css
wds-flora-dashboard.css
wds-safety-dashboard.css
wds-species-spotlight.css
wds-wskb.css
wds-dashboard-widgets.css
```

**Total CSS HTTP requests on homepage cold load: 24** (1 master + 22 imports + 1 homepage file), plus Google Fonts CSS and font files.

**Total CSS size (uncompressed): ~199 KB** (`wds.css` imports ~196 KB + `home-dashboard.css` ~2.7 KB)

---

## 3. Largest files

### JavaScript (top 15 by size)

| Size | File |
|------|------|
| 43.9 KB | `wds-content-engine.js` |
| 33.0 KB | `dashboard/wds-dashboard-catalog.js` |
| 30.5 KB | `wds-weather-ui.js` |
| 22.9 KB | `weather/wds-weather-providers.js` |
| 22.2 KB | `regional-intelligence/wds-regional-intelligence-engine.js` |
| 21.1 KB | `wds-ecosystem.js` |
| 20.7 KB | `wds-location.js` |
| 20.7 KB | `wds-education.js` |
| 20.6 KB | `wds-happening-now.js` |
| 20.0 KB | `wildlife/wds-wildlife-dashboard-intel.js` |
| 18.7 KB | `wds-research-integrity.js` |
| 18.3 KB | `trails/wds-trail-dashboard-intel.js` |
| 17.3 KB | `observations/wds-wos-core.js` |
| 17.0 KB | `dashboard/wds-dashboard-engine.js` |
| 15.3 KB | `safety/wds-safety-dashboard-intel.js` |

**Combined JS payload:** ~698 KB uncompressed across 67 files.

### CSS (top 10 by size)

| Size | File |
|------|------|
| 36.0 KB | `wds-content-engine.css` |
| 26.4 KB | `wds-components.css` |
| 22.9 KB | `wds-dashboard-widgets.css` |
| 10.0 KB | `wds-field-guide.css` |
| 9.6 KB | `wds-flora-dashboard.css` |
| 8.7 KB | `wds-outdoor-weather.css` |
| 8.7 KB | `wds-education.css` |
| 8.2 KB | `wds-home-sections.css` |
| 7.2 KB | `wds-weather.css` |
| 6.8 KB | `wds-tokens.css` |

---

## 4. Scripts that block initial page load

### Render-blocking (CSS)

| Asset | Why it blocks |
|-------|---------------|
| Google Fonts stylesheet | Standard `<link rel="stylesheet">` in `<head>` with no `media`/`async` strategy |
| `design-system/css/wds.css` | Render-blocking; triggers 22 sequential `@import` fetches |
| `css/home-dashboard.css` | Render-blocking stylesheet |

The `@import` chain inside `wds.css` is a **CSS waterfall**: the browser must fetch `wds.css`, parse it, then fetch each imported file. This delays first paint even before JavaScript runs.

### Boot-blocking (JavaScript)

| Asset | Why it blocks |
|-------|---------------|
| `wds.js` | Runs on `DOMContentLoaded` (defer), then injects 65 more scripts |
| 65 WDS modules | All use `defer`; must download and execute in injection order before `WDS.*` API is complete |
| `home-boot.js` | Polls with `requestAnimationFrame` until `WDS.location`, `WDS.contentEngine`, and related APIs exist — **dashboard cannot start until the entire 65-module stack has executed** |

Nothing in `index.html` uses `async` or dynamic import. The critical path is:

```
HTML → CSS waterfall (24 files) → wds.js → 65 JS modules (sequential execution) → home-boot.js → JSON fetches → Open-Meteo → dashboard render
```

### Scripts that do **not** block HTML parsing

All JavaScript uses `defer`, so HTML parsing is not blocked. However, **Time to Interactive** and **dashboard first render** are blocked until the full JS stack completes.

---

## 5. Scripts that could safely be lazy-loaded later

These modules are loaded on every homepage visit but are **not required for the default morning dashboard preset** to boot and render.

### Tier A — Not referenced by homepage boot path (safest)

| Module(s) | Size | Reason |
|-----------|------|--------|
| `wds-ecosystem.js` | 21.1 KB | Only used by legacy product-home flows; not called from `index.html` boot |
| `wds-upload.js` | 2.3 KB | Waypoint Scenes upload; not used on dashboard |
| `wds-gallery.js` | 4.0 KB | Gallery UI; not used on dashboard |
| `wds-search.js` | 2.0 KB | Search UI; not used on dashboard |
| `observations/wds-wos-core.js` | 17.3 KB | Fieldry WOS schema; not used on homepage |

**Tier A subtotal: ~47 KB**

### Tier B — Domain dashboards hidden in default morning preset

Default visible widgets (`V1_MORNING_VISIBLE`): outdoor weather, glance vitals, highlights, sun/moon, safety, conservation news. These **do not** include full-width domain dashboards.

| Module pair | Size | Load when |
|-------------|------|-----------|
| `wildlife/wds-wildlife-dashboard-intel.js` + `-ui.js` | 26.0 KB | Wildlife dashboard widget enabled |
| `trails/wds-trail-dashboard-intel.js` + `-ui.js` | 25.0 KB | Trail dashboard widget enabled |
| `water/wds-water-dashboard-intel.js` + `-ui.js` | 20.8 KB | Water dashboard widget enabled |
| `flora/wds-flora-dashboard-intel.js` + `-ui.js` | 17.1 KB | Flora dashboard widget enabled |
| `flora/wds-foraging-dashboard-intel.js` + `-ui.js` | 16.4 KB | Foraging dashboard widget enabled |

**Tier B subtotal: ~105 KB** (lazy-load when user enables widget or switches to Explorer/Forager preset)

### Tier C — Deferrable but used indirectly at boot

| Module(s) | Size | Notes |
|-----------|------|-------|
| `wds-education-factory.js` + `wds-education-topic.js` | 14.2 KB | Not used by dashboard widgets; safe unless education routes added to homepage |
| `species/wds-wskb-render.js` | ~8 KB | Profile renderer; homepage only preloads records via `wds-wskb-core.js` |
| `wds-map-view.js` | ~12 KB | Called via `applyLocation` at render; no network fetch, but not visible on default dashboard |

### Tier D — Required for default homepage (do not lazy-load yet)

Core boot path dependencies include: `wds-core`, research integrity, ethics, location, weather stack, OIP, dashboard engine/catalog/settings, content engine, happening-now (used by highlights generator), legacy `wds-dashboard.js` (used by `applyToBundle`), safety + sun/moon + outdoor weather UI.

**Estimated lazy-load savings if Tier A + B deferred: ~152 KB (~22% of JS payload) and 16 fewer script executions on first load.**

---

## 6. Widgets that load external data

On the **default morning dashboard preset**, only one external API is connected:

| Widget / system | External source | When |
|-----------------|-----------------|------|
| **Outdoor Weather** (anchor) | `https://api.open-meteo.com/v1/forecast` | OIP `resolveWeather()` during `contentEngine.init` |
| **Sun & Moon dashboard** | Same Open-Meteo package (reused via `platform.weatherRef`) | Widget mount after render |
| **Glance vitals** (temp, UV, sunrise) | Derived from `weatherRef` / platform — no separate API call | Widget `getData()` |
| **Today's Outdoor Highlights** | Client-side from platform + bundle | No external API |
| **Safety dashboard** | Uses platform; may call `WDS.weather.getForecast()` if live package not already attached | Mount phase |
| **Conservation news** | Editorial from `pike-county-pa.json` only | No external API |

### Widgets with external data when enabled (not default)

| Widget | `futureProvider` / source | Status |
|--------|---------------------------|--------|
| Air quality | `air-quality-api` | Not connected |
| Bird migration | `ebird-migration` | Not connected |
| River levels / stream flow | `usgs-gauges` | Not connected |
| Flood status | `nws-flood` | Not connected |
| Trail closures / park alerts | `nps-alerts`, `trail-reports` | Not connected |
| Aurora / ISS / meteor showers | Various astronomy APIs | Not connected |

**No widget on the default homepage calls USGS, eBird, NWS, or other agency APIs today.**

### Weather fetch duplication risk

`WDS.weather.getForecast()` has **no in-flight deduplication cache**. OIP fetches Open-Meteo once during platform assembly. Widget mounts receive `options.package = platform.weatherRef` and should reuse it — but any mount path that omits `package` could trigger a **duplicate Open-Meteo request**. This is a latent issue, not measured as duplicate in static analysis.

---

## 7. Network requests on first page load

Typical cold load of `/index.html` with a returning user (location in `localStorage`):

### Static assets (~91+ requests)

| Category | Count | Notes |
|----------|-------|-------|
| HTML | 1 | `index.html` |
| CSS | 24 | `wds.css` + 22 imports + `home-dashboard.css` |
| JavaScript | 67 | `wds.js` + `home-boot.js` + 65 modules |
| Google Fonts | 3–6 | Preconnect hints + CSS + woff2 files (Cormorant Garamond, Inter) |

### Data fetches after JavaScript boot (~4–6 requests)

| # | URL | Size (approx) | Trigger |
|---|-----|---------------|---------|
| 1 | `design-system/content-engine/regions-index.json` | 5.0 KB | `WDS.location.bootstrap()` |
| 2 | `design-system/content-engine/regions/pike-county-pa.json` | 32 KB | `WDS.contentEngine.loadRegion()` (cached after first fetch) |
| 3 | `design-system/species/index.json` | 0.8 KB | `WDS.wskb.preloadFromBundle()` |
| 4 | `design-system/species/records/morchella-americana.json` | ~small | WSKB preload from species spotlight |
| 5 | `https://api.open-meteo.com/v1/forecast?...` | ~5–15 KB | OIP weather resolution |

### Not fetched on default homepage boot

- Geolocation API (only if user triggers location prompt)
- Fieldry / localStorage reads (synchronous, not network)
- ForageCast, Fieldry, or Scenes app assets

**Estimated total first-load requests: ~95–100** (static + data + fonts + 1 API)

---

## 8. Recommended improvements (impact · difficulty · risk)

### R1 — Dashboard-only CSS entry point on homepage

Replace full `wds.css` on `index.html` with a trimmed stylesheet that imports only dashboard-relevant CSS (tokens, base, components, dashboard widgets, weather, safety, content-engine, ethics, provenance, research-integrity) and omits field-guide, education, patterns, home-sections, species-spotlight, and WSKB styles.

| | |
|--|--|
| **Estimated impact** | **High** — removes ~39 KB CSS and 6 HTTP requests from the critical path; reduces `@import` waterfall depth |
| **Estimated difficulty** | **Low** — new CSS file + one `index.html` link change |
| **Risk level** | **Low** — visual regression test on homepage and customize panel only |

---

### R2 — Lazy-load Tier A scripts (ecosystem, upload, gallery, search, WOS)

Remove five modules from the initial `wds.js` array; load them only when navigating to Fieldry, Scenes, or legacy ecosystem pages.

| | |
|--|--|
| **Estimated impact** | **Medium** — ~47 KB and 5 script parses removed from every homepage visit |
| **Estimated difficulty** | **Low** |
| **Risk level** | **Low** — modules are unreferenced on homepage boot path |

---

### R3 — Lazy-load domain dashboard modules (Tier B)

Dynamically import wildlife/trails/water/flora/foraging intel+UI pairs when the user enables those widgets or selects Explorer/Forager preset.

| | |
|--|--|
| **Estimated impact** | **High** — ~105 KB and 10 script parses deferred for default morning users |
| **Estimated difficulty** | **Medium** — requires a small dynamic loader and mount-time dependency check |
| **Risk level** | **Medium** — must preserve mount order when widgets become visible |

---

### R4 — Split `wds.js` into critical + deferred bundles

Phase 1 critical (~25 modules): core, location, weather, OIP, dashboard engine, content engine. Phase 2 idle/defer: domain dashboards, legacy adapters, education factory.

| | |
|--|--|
| **Estimated impact** | **High** — could cut time-to-dashboard by 40–60% on slow connections |
| **Estimated difficulty** | **Medium–High** — dependency ordering and boot gate changes |
| **Risk level** | **Medium** — regression risk across apps sharing `wds.js` |

---

### R5 — Flatten CSS `@import` chain

Replace `@import` in `wds.css` with explicit `<link>` tags, a build-time concat, or a single bundled CSS file to eliminate sequential CSS fetches.

| | |
|--|--|
| **Estimated impact** | **High** — parallel CSS downloads; faster first paint |
| **Estimated difficulty** | **Low–Medium** |
| **Risk level** | **Low** |

---

### R6 — Open-Meteo request deduplication

Add in-flight promise cache in `wds-weather-service.js` keyed by lat/lng so OIP and widget mounts never duplicate the same forecast fetch.

| | |
|--|--|
| **Estimated impact** | **Low–Medium** — saves 1 API round-trip and ~10 KB on edge cases; no effect on JS parse time |
| **Estimated difficulty** | **Low** |
| **Risk level** | **Low** |

---

### R7 — Self-host or subset Google Fonts

Download Cormorant Garamond + Inter subset; serve locally with `font-display: swap`.

| | |
|--|--|
| **Estimated impact** | **Medium** — removes external DNS/TLS latency and render-blocking font CSS |
| **Estimated difficulty** | **Low** |
| **Risk level** | **Low** |

---

### R8 — Defer WSKB preload

Load species records on demand when species spotlight is rendered, not during `contentEngine.init`.

| | |
|--|--|
| **Estimated impact** | **Low** — saves 1–2 JSON fetches (~1–5 KB) on boot |
| **Estimated difficulty** | **Low** |
| **Risk level** | **Low** |

---

### R9 — Remove duplicate regional intelligence stack

Both `wds-regional-intelligence-engine.js` (22 KB) and v2 core/service load on every page. Audit whether v1 engine can be deferred.

| | |
|--|--|
| **Estimated impact** | **Medium** — ~25–40 KB potential savings |
| **Estimated difficulty** | **Medium–High** — OIP depends on legacy adapter paths |
| **Risk level** | **Medium–High** |

---

### Impact summary matrix

| Recommendation | Impact | Difficulty | Risk |
|----------------|--------|------------|------|
| R1 Dashboard-only CSS | High | Low | **Low** |
| R2 Lazy-load Tier A JS | Medium | Low | **Low** |
| R3 Lazy-load domain dashboards | High | Medium | Medium |
| R4 Split wds.js bundles | High | Medium–High | Medium |
| R5 Flatten CSS imports | High | Low–Medium | **Low** |
| R6 Weather deduplication | Low–Medium | Low | **Low** |
| R7 Self-host fonts | Medium | Low | **Low** |
| R8 Defer WSKB preload | Low | Low | **Low** |
| R9 Dedupe regional intel | Medium | Medium–High | Medium–High |

---

## Recommended next step (single safest improvement)

### **R1 — Use a dashboard-only CSS entry point on `index.html`**

Create a trimmed stylesheet (e.g. `css/wds-dashboard-home.css`) that imports only the CSS modules the homepage dashboard actually uses, and link it instead of the full `design-system/css/wds.css`.

**Why this one first:**

1. **Lowest risk** — no JavaScript dependency changes, no boot sequence changes, no widget behavior changes.
2. **Immediate measurable gain** — removes ~6 HTTP requests and ~39 KB from the render-critical path on every visit.
3. **Easy to verify** — visual comparison of homepage + customize panel; no network tab archaeology required.
4. **Complements future JS work** — CSS trim delivers value independently while larger `wds.js` splitting is planned.

**Expected outcome:** Faster first paint and reduced CSS waterfall depth, with no change to dashboard functionality or live data behavior.

---

*This baseline should be re-measured after any performance work. Consider recording WebPageTest or Lighthouse scores against this document for before/after comparison.*
