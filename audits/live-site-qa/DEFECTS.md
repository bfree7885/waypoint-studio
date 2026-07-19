# Defects — Live Production QA (Curated)

**Base:** https://waypointstudio.org  
**Generated:** 2026-07-19  
**Method:** Playwright crawl + screenshot review. Automated raw hits also exist in `route-results.json` (many are duplicates of the systemic CSS-404 pattern).

Severity:

- **P0** — public route or essential workflow broken
- **P1** — major functionality or trust problem
- **P2** — significant UX, performance, or accessibility problem
- **P3** — polish or consistency issue

---

## P0 — Site-root `/map/` returns 404

| Field | Detail |
| --- | --- |
| **Route** | https://waypointstudio.org/map/ |
| **Viewport** | desktop + mobile |
| **Steps** | 1) Open Sheds https://waypointstudio.org/apps/shed-hunting/ 2) Follow link targeting `/map/` (also discovered in crawl) |
| **Expected** | Map experience or redirect to `/apps/shed-hunting/map/` |
| **Actual** | HTTP **404** branded page “This page isn’t here” |
| **Evidence** | `desktop/desktop__map.png`, `mobile/mobile__map.png`, `route-results.json` |
| **Suggested repair** | Remove or rewrite Sheds (and any other) links from `/map/` → `/apps/shed-hunting/map/`; add server redirect for old bookmarks |

---

## P1 — Dashboard unreliable cold load / partial providers

| Field | Detail |
| --- | --- |
| **Route** | https://waypointstudio.org/apps/dashboard/ |
| **Viewport** | desktop + mobile; also geo granted/denied/unavailable |
| **Steps** | Open Dashboard; wait for Today summary; observe network |
| **Expected** | Honest, complete outdoor summary for a resolved location without hard provider failures |
| **Actual** | UI shows **“Partial success — Some providers responded; others timed out or failed.”** Network: `/apps/dashboard/data/live.json` **404**, `/apps/dashboard/data/health.json` **404**, `api.weather.gov/alerts/active?point=0.0000,0.0000` **400**. Automated usable-wait flagged >15s busy heuristics (content partially visible — see README limitations). With geo **granted**, title correctly used **Milford, PA**; denied/unavailable fell back to **Westerlo, NY (approximate)**. |
| **Evidence** | `desktop/desktop__apps_dashboard.png`, `mobile/mobile__apps_dashboard.png`, `network-failures.md`, location matrix entries in `route-results.json` |
| **Suggested repair** | Ship live/health data or stop requesting missing endpoints; never call NWS with 0,0; clear `aria-busy` when partial UI is shown; harden provider timeouts |

---

## P1 — ForageCast displays location as “NULL, NY”

| Field | Detail |
| --- | --- |
| **Route** | https://waypointstudio.org/apps/foragecast/ |
| **Viewport** | desktop (visual); location matrix also exercised |
| **Steps** | Open ForageCast Overview as first-time visitor |
| **Expected** | Clear location name or honest “location unknown / set a place” empty state |
| **Actual** | Header/context shows **“NULL, NY”** while still ranking species opportunities — misleading product clarity |
| **Evidence** | `desktop/desktop__apps_foragecast.png` (screenshot review) |
| **Suggested repair** | Guard null place names; force place picker / IP fallback labeling before rendering scores |

---

## P1 — Steepleaf explore & entity remain in loading heuristic >15s

| Field | Detail |
| --- | --- |
| **Route** | https://waypointstudio.org/apps/steepleaf/explore/ · `/apps/steepleaf/entity/` |
| **Viewport** | desktop |
| **Steps** | Navigate to route; wait 15s for main content |
| **Expected** | Brew/entity UI usable |
| **Actual** | Automated wait still detected loading/busy markers after **15s** |
| **Evidence** | `desktop/desktop__apps_steepleaf_explore.png`, `desktop/desktop__apps_steepleaf_entity.png`, `performance.md` |
| **Suggested repair** | Fix boot path / missing data; ensure fail/retry UI within timeout |

---

## P1 — ForageCast season-table stuck loading heuristic >15s

| Field | Detail |
| --- | --- |
| **Route** | https://waypointstudio.org/apps/foragecast/season-table.html |
| **Viewport** | desktop |
| **Steps** | Open season table; wait 15s |
| **Expected** | Table usable or clear empty/error |
| **Actual** | Stuck-loading heuristic true after 15s |
| **Evidence** | `desktop/desktop__apps_foragecast_season-table.html.png`, `performance.md` |
| **Suggested repair** | Resolve boot hang; add timeout + retry |

---

## P2 — Systemic Design System CSS 404s

| Field | Detail |
| --- | --- |
| **Route** | Nearly all studio pages (home, apps, legal) |
| **Viewport** | desktop + mobile |
| **Steps** | Open any major route; inspect network |
| **Expected** | Stylesheet URLs resolve under `/design-system/` (or bundled CSS only) |
| **Actual** | Hundreds of requests like `/wds-tokens.css`, `/apps/foragecast/wds-base.css`, etc. return **HTTP 404**. Pages still render (other CSS loads), but console/network are noisy and theming may be incomplete. |
| **Evidence** | `network-failures.md`, unique path sample in audit analysis (~30+ distinct `wds-*.css` basenames failing) |
| **Suggested repair** | Fix relative `@import` / link href bases; verify deploy includes design-system assets at expected paths |

---

## P2 — ForageCast live/health JSON 404

| Field | Detail |
| --- | --- |
| **Route** | https://waypointstudio.org/apps/foragecast/ (+ subpages) |
| **Viewport** | desktop |
| **Steps** | Open ForageCast; watch XHR |
| **Expected** | live/health endpoints exist or client does not request them |
| **Actual** | `/apps/foragecast/data/live.json` and `health.json` **404** |
| **Evidence** | `network-failures.md`, `route-results.json` |
| **Suggested repair** | Align client with deployed data contract |

---

## P2 — Accessibility: systemic color-contrast (+ scattered serious issues)

| Field | Detail |
| --- | --- |
| **Route** | Most audited pages |
| **Viewport** | desktop (axe) |
| **Steps** | axe-core wcag2a/aa |
| **Expected** | No serious/critical contrast failures on primary text |
| **Actual** | **color-contrast** flagged on ~102 route analyses; also **nested-interactive** (Photo Coach, HL, Animal Vision), **aria-prohibited-attr** (ForageCast) |
| **Evidence** | `accessibility.md` |
| **Suggested repair** | Raise muted text contrast; unwrap nested interactive controls; fix prohibited ARIA |

---

## P2 — Sheds map: OSM tile aborts during interaction

| Field | Detail |
| --- | --- |
| **Route** | https://waypointstudio.org/apps/shed-hunting/map/ |
| **Viewport** | desktop |
| **Steps** | Load map → zoom → pan |
| **Expected** | Tiles load; cancellations minimal |
| **Actual** | Map smoke **ok** (tiles visible; Milford area with geo). Many `*.tile.openstreetmap.org` **ERR_ABORTED** during zoom (often benign cancellations) — monitor for blank tile regions. Ethics modal blocks first interaction until Understood. |
| **Evidence** | `desktop/map__sheds_before.png`, `desktop/map__sheds_after.png`, `route-results.json` → `map` |
| **Suggested repair** | Ensure modal gating is intentional; consider tile CDN / rate-limit handling; retest after dismiss |

---

## P3 — Dashboard duplicate H1

| Field | Detail |
| --- | --- |
| **Route** | `/apps/dashboard/` |
| **Viewport** | desktop |
| **Steps** | Open Dashboard; count `h1` |
| **Expected** | Single primary heading |
| **Actual** | `duplicateH1: true` |
| **Evidence** | `route-results.json` |
| **Suggested repair** | Demote secondary titles to `h2` |

---

## P3 — Sample / foundation language still visible on some apps

| Field | Detail |
| --- | --- |
| **Route** | SignalTerrain, Steepleaf, Volunteer (and Studio home foundation mention) |
| **Viewport** | desktop |
| **Steps** | Open app; scan body text |
| **Expected** | Production copy without “sample” scaffolding |
| **Actual** | Automated text flags `hasSample: true` on SignalTerrain, Steepleaf, Volunteer |
| **Evidence** | `route-results.json` visibleFlags |
| **Suggested repair** | Replace residual sample strings |

---

## Location matrix notes (not separate defects if already covered)

| App | Granted (Milford, PA) | Denied | Unavailable |
| --- | --- | --- | --- |
| Dashboard | Title **Milford, PA**; still Partial success + live.json 404 | Westerlo approximate; NWS 0,0 400 | Same as denied pattern |
| ForageCast | Loads (~7–9s); live/health 404; visual NULL, NY trust issue | Loads; same JSON 404 | Loads; same |
| Fieldry | Fast shell load; no infinite spinner observed | Same | Same |

---

## Interaction smoke (passed)

- Studio home search for “fieldry” → **2 results**
- Contact email field present; invalid value filled; **form not submitted**
- Keyboard Tab focuses “Waypoint Studio” link with visible outline

---

## Raw automated volume

The initial synthesizer also emitted **~263** per-route CONSOLE/NET/A11Y rows (mostly duplicates of CSS 404 + contrast). Treat **this curated list** as the actionable defect set; use raw files for evidence depth.
