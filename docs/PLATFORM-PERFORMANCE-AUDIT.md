# Platform Performance Audit

**Date:** 2026-07-18  
**Scope:** Studio Home, Dashboard, Scenes, Photo Coach, Sheds, ForageCast, Fieldry, SignalTerrain, Steepleaf, Savant, Volunteer, Landscape Interpretation  
**Commit status:** Not committed.

---

## Method

This audit combines:

1. Static asset budgets (bytes on disk)
2. Script graph size (`wds.js` ordered loader)
3. HTML script counts on representative pages
4. Code-path review for waterfalls, duplicate fetches, blocking work
5. Automated route/asset integrity (`automation/audit-platform-routes.mjs`)

Browser Lab (Lighthouse FP / LCP / TTI) was **not** run in this session (no headed Chrome harness). Treat the numbers below as **engineering budgets + structural findings**, not field CWV.

---

## Asset budgets (selected)

| Asset | Size |
|---|---:|
| `wds-platform-resilience.js` | 13.3 KB |
| `wds-platform-ui.js` | 7.4 KB |
| `wds-platform-ui.css` | 7.3 KB |
| `wds-map-view.js` | 12.2 KB |
| `wds-oip-service.js` | 24.9 KB |
| `foragecast-views.js` | 19.0 KB |
| `savant-views.js` | 43.2 KB |
| `wds.js` ordered script list | **112** modules |

Resilience overhead is small relative to the existing OIP/dashboard chain.

---

## Page script budgets (static HTML tags)

| Page | `<script>` | deferred | stylesheets |
|---|---:|---:|---:|
| Studio Home `index.html` | 6 | 6 | 4 |
| Dashboard | 4 (+ `wds.js` fans out ~112) | 2 | 5 |
| ForageCast conditions | 26 | 25 | 5 |
| Savant home | 26 | 25 | 3 |
| SignalTerrain home | 10 | 10 | 3 |
| Sheds home | 10 | 10 | 3 |

**Interpretation:** Dashboard’s critical path remains dominated by the ordered `wds.js` chain (~108–112 files, `async=false`). ForageCast/Savant are high script-count apps but mostly `defer`.

---

## Structural performance findings

| Finding | Severity | Status |
|---|---|---|
| `wds.js` sequential module fan-out (~112) | High (structural) | **Documented** — needs bundle split / critical-path trim before V1 CWV targets |
| Duplicate parallel JSON loads across FC shell/home/prediction | Medium | **Mitigated** — coalescing via `WDS.resilience.getJson` + platformUi delegation |
| Provider waterfalls inside OIP | Medium | **Partially OK** — OIP already parallelizes with soft timeouts; now also records health |
| Search re-render on every keystroke (Savant) | Medium | **Fixed** — 140ms debounce on Discover + Cellar |
| Map listener / transform cost | Low–Med | **Mitigated** — `will-change` during interaction; destroy clears |
| Blocking Google Fonts (various apps) | Medium | Mixed — Dashboard previously mitigated; other apps still vary |
| Leaflet Sheds map (separate stack) | Medium | **Open** — not yet on WDS MapView resilience path |
| Large Savant views module (43 KB) | Low | Acceptable for beta; split later if TTI regresses |

---

## Estimated interaction improvements (engineering)

These are **expected** effects from this block, not measured Lighthouse deltas:

| Area | Before | After (expected) |
|---|---|---|
| Duplicate JSON race (same URL) | N parallel network | 1 in-flight + memory cache |
| Provider timeout hang | Could leave UI “loading” | Soft-fail ≤ ~8s + stale cache when available |
| Offline revisit | Hard empty/error | Session cache + offline banner |
| Savant typeahead | Sync recompute every input | Debounced ~140ms |
| Map pan/zoom composite | Default layer promotion | Hinted transform; cleaned on destroy |

---

## Recommended next measurements (owner / beta lab)

1. Lighthouse mobile on: Dashboard, ForageCast Conditions, Savant Discover, Sheds Map, SignalTerrain Live  
2. Capture `wdb-*` performance marks already present on Dashboard  
3. Add `performance.mark` around ForageCast `bootPage` and Savant `start`  
4. Bundle: generate a single critical `wds-critical.js` for Dashboard Today tab only

---

## Verdict

Platform loading is **more predictable** (coalesce, timeout, cache). Absolute first-load speed for Dashboard remains gated by the **112-module ordered loader** — the largest remaining performance risk before public beta.
