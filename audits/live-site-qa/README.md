# Waypoint Studio — Live Site QA Audit

**Audit only.** No application code was modified. No commits. No pushes.

| Field | Value |
| --- | --- |
| **Target** | https://waypointstudio.org |
| **Audit date** | 2026-07-19 (America/New_York) |
| **Tooling** | Playwright Chromium 1.51 + `@axe-core/playwright` (wcag2a/aa) |
| **Viewports** | Desktop 1440×1000 · Mobile 390×844 |
| **Routes audited** | 110 page visits (74 unique desktop crawl routes + mobile seed set + location matrix) |
| **Duration** | ~7 minutes wall clock (`2026-07-19T13:48:20Z` → `13:55:11Z`) |

---

## Executive summary

Production is **broadly navigable**: homepage, marketing pages, and most app shells return **HTTP 200**, render branded chrome, and support basic search / keyboard focus. Sheds map loads tiles and accepts pan/zoom (behind an ethics dialog). Location mocking works for Dashboard (Milford when granted; Westerlo approximate when denied/unavailable).

The audit still found **blocking and trust-breaking issues** that prevent a public-beta recommendation:

1. **P0:** Public link to `https://waypointstudio.org/map/` returns **404** (linked from Sheds).
2. **P1:** Dashboard reliability — `data/live.json` / `data/health.json` **404**, NWS alerts called with `point=0.0000,0.0000` (**400**), UI shows **“Partial success”**; automated wait also flagged persistent busy/loading heuristics beyond 15s (content is partially visible — see limitations).
3. **P1:** ForageCast shows location **“NULL, NY”** on Overview (misleading location presentation).
4. **P1:** Steepleaf explore/entity and ForageCast season-table remained in loading/busy heuristics >15s.
5. **Systemic P1/P2:** Dozens of `wds-*.css` requests **404** (wrong relative paths resolving under `/` or app folders) across nearly every page — pages still paint via other stylesheets, but network/console noise is severe.
6. **P2 (axe):** Widespread **color-contrast** failures; some **nested-interactive** / **aria-prohibited-attr**.

**Overall readiness verdict:** **Selected applications ready for closed beta** (recommendation #3), not public beta. Studio shell + several apps are demoable with known defects; Dashboard/ForageCast location honesty and broken `/map/` must be fixed before wider invites.

---

## Final recommendation

### **3 — Selected applications ready for closed beta**

| Ready for closed beta (with caveats) | Hold / needs recovery |
| --- | --- |
| Studio home, About/Privacy/Contact/Support/Knowledge | Site-root `/map/` (404) |
| Scenes hub, Photo Coach, Hidden Landscapes, Photo Library | Dashboard cold reliability |
| Fieldry shell | ForageCast location label (“NULL, NY”) |
| SignalTerrain / Cyber shells | Steepleaf explore/entity boot hangs |
| Savant Sommelier, Volunteer shells | Systemic CSS 404 path bugs |
| Sheds map (after dismissing ethics modal) | Accessibility contrast across studio |

---

## Application scores (1–10)

Scores combine **automated Playwright evidence** and **screenshot review**. They are not Lighthouse lab scores.

| Application | Func | Rel | Perf | Mobile | A11y | Polish | Clarity | Overall |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| Studio Home | 8 | 6 | 8 | 8 | 5 | 8 | 8 | **7.3** |
| Dashboard | 6 | 4 | 3 | 5 | 5 | 7 | 6 | **5.1** |
| Scenes | 7 | 7 | 8 | 7 | 5 | 7 | 7 | **6.9** |
| Photo Coach | 7 | 6 | 7 | 7 | 4 | 7 | 7 | **6.4** |
| Hidden Landscapes | 7 | 6 | 7 | 7 | 4 | 7 | 7 | **6.4** |
| Photo Library | 7 | 6 | 8 | 7 | 5 | 7 | 7 | **6.7** |
| Sheds (+ map) | 7 | 6 | 6 | 6 | 5 | 7 | 7 | **6.3** |
| ForageCast | 6 | 5 | 4 | 6 | 4 | 7 | 4 | **5.1** |
| Fieldry | 7 | 7 | 8 | 7 | 5 | 7 | 7 | **6.9** |
| SignalTerrain | 6 | 6 | 7 | 6 | 5 | 6 | 5 | **5.9** |
| SignalTerrain Cyber | 7 | 6 | 7 | 6 | 5 | 7 | 7 | **6.4** |
| Steepleaf | 5 | 4 | 4 | 5 | 5 | 6 | 5 | **4.9** |
| Savant Sommelier | 7 | 6 | 7 | 6 | 5 | 7 | 7 | **6.4** |
| Waypoint Volunteer | 6 | 6 | 7 | 6 | 5 | 6 | 5 | **5.9** |
| Animal Vision | 7 | 6 | 8 | 7 | 4 | 7 | 7 | **6.6** |
| Terrainbound | 8* | 8 | 9 | 8 | 8 | 7 | 9 | **8.1*** |

\*Terrainbound correctly presents as **retired** — scored as honest retirement UX, not as an active product.

**Platform overall readiness (mean of active apps): ~6.2 / 10**

---

## What was exercised

### Automated (Playwright)

- Crawl of internal same-origin links from seeds (capped at 80 desktop routes)
- Desktop + mobile screenshots
- Console errors / warnings, failed network requests
- Navigation timing + “usable content” wait (15s loading heuristic)
- axe-core wcag2a/aa on each audited page
- Location matrix: **granted (Milford, PA)**, **denied**, **unavailable** on Dashboard, ForageCast, Fieldry
- Sheds map smoke: load, zoom control, pan drag, before/after screenshots
- Home studio search (“fieldry” → results)
- Contact form field presence (invalid email filled; **not submitted**)
- Keyboard Tab focus check on home

### Visual (screenshot review)

- Dashboard renders summary UI with Partial success banner
- ForageCast Overview shows **NULL, NY**
- `/map/` branded 404 page
- Sheds ethics modal on desktop/mobile; map tiles visible behind modal
- Mobile Sheds shows “Location off”

### Not completed / limited

| Gap | Why |
| --- | --- |
| Full Lighthouse CI | Not run — do not treat timings as lab CWV |
| Upload / camera / private file flows | Explicitly out of scope for production privacy |
| Real contact/support submit | Forbidden by brief |
| Dismissing Sheds ethics then deep map layer UI | Smoke panned under modal; full layer/marker QA incomplete |
| Every accordion/dialog in every app | Time-boxed; interactions sampled |
| Dashboard “stuck” vs `aria-busy` | Heuristic may over-flag while content is visible |
| Production vs local uncommitted repairs | Audit reflects **live** deploy only |

---

## Key verified defects (see `DEFECTS.md`)

- **P0** `/map/` 404 linked from Sheds
- **P1** Dashboard provider/live.json failures + Partial success; geo edge cases still call NWS with `0,0`
- **P1** ForageCast **NULL, NY** location labeling
- **P1** Steepleaf explore/entity + ForageCast season-table loading heuristics >15s
- **P2** Mass `wds-*.css` 404s (path resolution)
- **P2** axe color-contrast (systemic), nested-interactive on some Scenes apps
- **P3** Duplicate H1 on Dashboard; sample-language on some ST/Volunteer/Steepleaf pages

---

## Report index

| File | Purpose |
| --- | --- |
| [README.md](./README.md) | This executive summary |
| [DEFECTS.md](./DEFECTS.md) | Prioritized curated defects |
| [route-results.json](./route-results.json) | Full machine-readable results |
| [console-errors.md](./console-errors.md) | Console errors by route |
| [network-failures.md](./network-failures.md) | Failed requests by route |
| [accessibility.md](./accessibility.md) | axe findings |
| [performance.md](./performance.md) | Timing observations |
| [desktop/](./desktop/) | Desktop screenshots (85) |
| [mobile/](./mobile/) | Mobile screenshots (26) |
| [scripts/run-live-audit.mjs](./scripts/run-live-audit.mjs) | Audit runner |
| [artifacts/summary.json](./artifacts/summary.json) | Run totals |

---

## Commands run

```bash
# From platform checkout
cd audits/live-site-qa
npm install
npx playwright install chromium
node scripts/run-live-audit.mjs
```

Environment: Linux, Playwright Chromium (ubuntu24.04 fallback build). Network required for production + browser download.

---

## Limitations (honesty)

- Findings are from **headless Chromium** against the **public production URL**, not every real-user device/network.
- Auto-generated per-route CONSOLE/NET/A11Y rows can inflate raw counts; **curated severity lives in `DEFECTS.md`**.
- `route-results.json` retains the full raw defect synthesis used during the run.
- This session **did not repair** application source and **did not deploy**.
