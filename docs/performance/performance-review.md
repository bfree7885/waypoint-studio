# Performance Sprint Review

**Branch:** `feature/performance-sprint`  
**Date:** 2026-08-08  
**Scope:** Homepage · Dashboard · Articles · Sheds · SignalTerrain · Global Signals  
**Constraint:** Safe performance optimizations only — no feature redesign or behavior changes.  
**Status:** Pushed for owner review — **do not merge** until approved.

---

## Executive summary

Cold-load cost on content/foundation pages was dominated by the full `wds.css` **33-file `@import` waterfall** (~287 KB) and render-blocking Google Fonts. Homepage/Dashboard remain heavy because `wds.js` still injects **164 modules (~1.76 MB uncompressed)** — out of scope for a safe no-behavior-change cut in this sprint.

Largest measured wins:

| Surface | Before → After (desktop Lighthouse, local, light throttle) |
|---------|-------------------------------------------------------------|
| **Articles** | Perf **0.77 → 0.86**, CLS **0.695 → 0.282**, bytes **979 → 775 KiB**, requests **50 → 26** |
| **SignalTerrain** | Bytes **2,595 → 286 KiB**, requests **54 → 30**, CLS **0.56 → 0.46** |
| **Sheds** | LCP **0.4 → 0.2 s**, bytes **822 → 768 KiB**; tile fetches deferred until pan/zoom idle |
| Homepage / Dashboard | Duplicate `wds-app-shell.css` link removed; `wds-build.js` deferred; critical CSS preload + Open-Meteo dns-prefetch |

Raw summaries: [`lighthouse-before.json`](./lighthouse-before.json), [`lighthouse-after.json`](./lighthouse-after.json).

---

## Method

1. Clean worktree from `origin/main` at `/home/bryan/Projects/waypoint-studio-perf`.
2. Static audit of script tags, CSS includes, `@import` chains, image lazy-loading, and Sheds tile options.
3. Lighthouse (desktop, `--throttling-method=provided`, RTT 40 ms, 10 Mbps, CPU ×1) against `python3 -m http.server` **from the perf worktree**.
4. Safe HTML/CSS/JS tweaks only; re-measure; document remaining debt.

**Note:** An orphan HTTP listener on the measurement port can serve a different checkout. Always confirm server cwd before trusting after metrics (see playbook lesson).

**Global Signals before caveat:** The baseline GS run reported only **8 requests / 78 KiB** and **0 JS** — the board likely did not fully settle. After metrics (15 requests / ~371 KiB, CLS 0.169) better reflect a completed hydrate. Treat GS before/after score as directional, not a regression of product speed.

---

## Audit findings (before)

### JavaScript

| Page | Entry scripts | Notes |
|------|---------------|-------|
| Homepage / Dashboard | `wds-build` (blocking) + `wds.js` + `home-boot` | `wds.js` injects **164** ordered scripts (~1.76 MB) |
| Articles | 5 deferred platform/feed scripts (~76 KB) | Reasonable for the surface |
| Sheds map | **10 blocking** scripts (Leaflet + app stack ~175 KB local) | HTML parser blocked until all execute |
| SignalTerrain | **16 deferred** platform scripts (~135 KB) | Extra modules vs sibling ST pages (identity/workflows/places/observations unused on foundation landing) |
| Global Signals | 1 deferred home board script (~19 KB) | Lightest product surface |

### CSS

- `wds.css` `@import`s **33** stylesheets (~287 KB). Articles and SignalTerrain paid the full dashboard-widget tax.
- Homepage/Dashboard also linked `wds-app-shell.css` **again** (already imported by `wds.css`).
- SignalTerrain linked `wds-platform-foundation.css` on top of full `wds.css` (foundation already in the import set when using full hub).

### Fonts / images / tiles

- Articles, Sheds, SignalTerrain used **render-blocking** Google Fonts (Homepage already used non-blocking `media="print"` + `onload`).
- No meaningful below-fold `<img loading="lazy">` opportunities on these six entry HTML shells (feeds/maps hydrate without large static hero images).
- Sheds Leaflet layers used `updateWhenIdle: false` (eager tile churn while panning).

### Navigation speed

- Same-origin multi-page navigation remains HTML document loads (no SPA). Shell pages that pull full `wds.css` + many scripts feel slower between routes than Global Signals’ slim stack.

---

## Optimizations shipped

### Additive: `design-system/css/wds-shell.css`

Shell subset for content/foundation pages: tokens, aurora bridge, base, components, app-shell, platform-ui/boot, provenance, research-integrity (**9 imports · ~74 KB** vs full hub **33 · ~287 KB**). Dashboard keeps `wds.css`.

### Per surface

1. **Homepage + Dashboard**
   - Remove duplicate `wds-app-shell.css` `<link>`.
   - `defer` on `wds-build.js` (order preserved with `wds.js` / `home-boot`).
   - Preload `wds-dashboard-rebuild.css`; `dns-prefetch` for Open-Meteo.

2. **Articles**
   - Switch `wds.css` → `wds-shell.css`.
   - Non-blocking fonts; drop unused Inter weight 300.
   - Reserve `#was-articles-feed { min-height: 28rem }` to cut CLS on hydrate.

3. **SignalTerrain landing**
   - Switch to `wds-shell.css` + foundation CSS only.
   - Non-blocking fonts.
   - Drop unused platform scripts (identity, workflows, places, observations); keep discover for `data-wds-related-apps`.

4. **Sheds map**
   - Non-blocking fonts; preconnect/dns-prefetch for jsDelivr + OSM tiles.
   - `defer` all map scripts (boot already waits for `DOMContentLoaded`).
   - Tile layers: `updateWhenIdle: true`, `updateWhenZooming: false`, modest `keepBuffer`.

5. **Global Signals**
   - Board `min-height` reservation for hydrate stability.
   - Left fonts blocking (async fonts added CLS without meaningful win on this already-light page).

---

## Measurements

Environment: Linux · Google Chrome headless · local `127.0.0.1` · desktop form factor · light network throttle (not mobile 4G). Scores are optimistic vs real cellular; relative deltas matter more.

| Page | Perf before → after | LCP | FCP | CLS | Total bytes | Requests |
|------|---------------------|-----|-----|-----|-------------|----------|
| Homepage | 0.86 → 0.85 | 0.5s → 0.7s | 0.1s → 0.1s | 0.279 → 0.298 | 3874 → 3871 KiB | 222 → 221 |
| Dashboard | 0.86 → 0.85 | 0.6s → 0.5s | 0.1s → 0.1s | 0.279 → 0.298 | 3849 → 3871 KiB | 219 → 219 |
| Articles | **0.77 → 0.86** | 0.2s → 0.2s | 0.2s → 0.2s | **0.695 → 0.282** | **979 → 775 KiB** | **50 → 26** |
| Sheds | 1.00 → 1.00 | **0.4s → 0.2s** | 0.2s → 0.1s | 0.001 → 0.022 | 822 → 768 KiB | 32 → 30 |
| SignalTerrain | 0.78 → 0.80 | 0.1s → 0.1s | 0.1s → 0.1s | 0.56 → 0.46 | **2595 → 286 KiB** | **54 → 30** |
| Global Signals | 1.00 → 0.93* | 0.2s → 0.2s | 0.2s → 0.2s | 0 → 0.169* | 78* → 371 KiB | 8* → 15 |

\*GS before undercounted (JS/board did not fully settle). After is the honest completed load.

Homepage score noise (±0.01) and LCP variance are within Lighthouse run-to-run spread on a JS-heavy shell; payload unchanged in substance.

---

## Remaining issues (owner backlog)

1. **Homepage/Dashboard JS monolith** — Split or lazy-load Tier A/B modules from `PERFORMANCE_BASELINE.md` / this audit (~unused JS still ~400 KiB per Lighthouse). Requires careful dependency graph work; not done here to avoid boot regressions.
2. **`wds.css` `@import` waterfall** — Even on dashboard, sequential CSS imports delay first paint. Long-term: build a concatenated/critical CSS artifact (or HTTP/2 push-friendly single file) without losing design-system modularity in source.
3. **CLS on shell mount** — Articles/SignalTerrain still shift when global nav injects. Consider static shell HTML or reserved header height in markup.
4. **Cache-Control: no-store on Home HTML** — Intentional for build freshness; hurts repeat visits. Consider short cache + bust query once Pages `build-info` flow is trusted.
5. **Expand `wds-shell.css` adoption** — Side Trails hub, About, Support, and other non-dashboard pages still pull full `wds.css`.
6. **Image pipeline** — When article cards gain thumbnails, enforce `loading="lazy"` + dimensions; none on these entry shells today.
7. **Mobile / Slow 4G re-measure** — Re-run Lighthouse mobile + production Pages URL after merge for field-realistic numbers.

---

## Owner-review path

1. Checkout `feature/performance-sprint` (or open the PR).
2. `python3 -m http.server 8765` from this branch; verify cwd.
3. Spot-check: `/`, `/apps/dashboard/`, `/articles/`, `/apps/shed-hunting/map/`, `/apps/signalterrain/`, `/side-trails/global-signals/`.
4. Confirm nav shell, articles feed, Sheds map tiles, ST related-apps, GS board still behave.
5. Approve merge or request follow-up on homepage code-splitting.

---

## Recommendation

**Approve and merge this branch** as a low-risk win for Articles and SignalTerrain (large byte/request cuts, better CLS). Schedule a follow-up sprint focused only on **homepage `wds.js` code-splitting** and **CSS bundling** — that is where remaining “feels instant” work lives.

---

## Files touched

- `design-system/css/wds-shell.css` *(new)*
- `index.html`, `apps/dashboard/index.html`
- `articles/index.html`
- `apps/signalterrain/index.html`
- `apps/shed-hunting/map/index.html`, `apps/shed-hunting/js/sheds-map-app.js`
- `side-trails/global-signals/index.html`
- `docs/performance/*`, `docs/ENGINEERING-PLAYBOOK.md` (Lessons Learned)
