# Waypoint Studio — Complete Production Audit (July 2026)

**Audit branch:** `audit/waypoint-studio-complete-production-review-2026-07`  
**Starting SHA (origin/main):** `59c09de`  
**Live production SHA:** `59c09de` (verified via `https://waypointstudio.org/data/build-info.json`)  
**Audit date:** 2026-07-26  
**Scope:** Audit and planning only — no feature implementation, no merge, no deploy.

---

## Executive verdict

Waypoint Studio is a **usable public alpha / early beta platform** with one coherent live product surface (Home/Dashboard Rebuild), one partially coherent craft product (Scenes around Photo Coach), and one honest but incomplete field map (Sheds). The production site matches repository `main`. It does **not** match the unfinished catalog-expansion branch, which *does* contain a full 32-tile implementation that has never been merged.

**Overall score: 63 / 100** — functional prototype requiring substantial work (band 60–69).

| Product | Score | Stage |
| --- | ---: | --- |
| Dashboard | 71 | Usable beta, thin catalog |
| Scenes | 58 | Partial craft loop; vision unfinished |
| Sheds | 48 | Working foundation / prototype |
| Importer workflow | 52 | Strong local import; broken handoff |
| **Platform overall** | **63** | Fragmented studio with good pieces |

**Recommended priority:** Stabilize production foundation → finish and ship Dashboard catalog depth → stabilize Importer → build Scenes around import→review→portfolio → pause Sheds expansion until the first two products are coherent.

---

## Part 1 — Repository and deployment reconciliation

### Verified state (do not trust prior chat memory)

| Fact | Verified value |
| --- | --- |
| Local audit branch | `audit/waypoint-studio-complete-production-review-2026-07` @ `59c09de` |
| `origin/main` | `59c09de` |
| Production `build-info.commit` | `59c09de` |
| Production cache-bust | `dash-tile-layout-1` |
| Deploy workflow | `.github/workflows/pages.yml` — push to `main` → GitHub Pages artifact of repo root |
| Production matches main? | **Yes** |
| Catalog expansion on production? | **No** |

### Critical correction to the owner brief

The brief stated that `feature/dashboard-functional-tile-catalog` “contains no implementation” at `59c09de`. **That was true of the branch tip when it was created from main.** As of this audit, the remote feature branch tip is `c975958` and **does contain** commits:

- `1164abc` feat(dashboard): expand the workspace to a 32-tile functional catalog
- `a178291` test(dashboard): cover the functional tile catalog end to end
- `e7a4b15` / `c7b2525` docs

Those commits are **not on main and not in production**. Live Dashboard still has **exactly five** catalog tiles: Conditions, Air, Alerts, Astronomy, Light.

### Competing implementations (canonical vs dead)

| Product | Canonical | Still loaded but unused | Still publicly reachable competitor |
| --- | --- | --- | --- |
| Dashboard | `design-system/js/dashboard/rebuild/*` via `apps/dashboard/js/home-boot.js` | Outdoor OS, V2, V3, Recovery, V1 catalog — **76 dashboard modules** inside `wds.js`’s 164-module loader | Root `js/home-boot.js` orphaned (not referenced) |
| Scenes | Hub `apps/scenes/` + tools `apps/photo-coach/`, `apps/photo-library/`, `apps/hidden-landscapes/` | Portfolio suite exists only on feature branches | `apps/waypoint-scenes/` monolith still live; Living Scenes / Scene Builder are previews |
| Sheds | `apps/shed-hunting/map/` | — | `sheds/`, `map/` redirects only |

**No service workers** exist. Stale-UI risk is CDN/`?v=` cache-bust drift, not SW.

### Deployment

- Trigger: push to `main` or `workflow_dispatch`
- Artifact: entire repo minus `private/` and `audits/`
- Metadata injected by `scripts/inject-build-metadata.mjs`
- Post-deploy verify: `automation/verify-production-deploy.mjs`
- Cache: Fastly/GitHub `max-age=600` on HTML

---

## Part 2–3 — Routes and links (summary)

Full inventories: `waypoint-studio-route-inventory-2026-07.md`, `waypoint-studio-link-audit-2026-07.md`.

| Metric | Count |
| --- | ---: |
| Routes crawled | 84 |
| Links extracted | 674 |
| Unique internal destinations probed | 93 |
| Broken internal destinations | **0** |
| HTTP 404 seed routes | 7 (portfolio suite, `/private/`, `/waypoint-importer/`) |
| Routes flagged unfinished language | 26 |
| Browser screenshots | 44 |
| Browser console errors | 0 |
| Failed network (browser) | 1 (`/favicon.ico` 404) |

Notable public routes: `/`, `/apps/dashboard/`, `/apps/scenes/`, `/apps/photo-coach/`, `/apps/photo-library/`, `/apps/hidden-landscapes/`, `/apps/shed-hunting/map/`, About/Contact/Privacy/Terms/Support, Incubator, Articles, plus many incubator/lifestyle apps.

**Health note:** HTTP 200 does not equal healthy. Living Scenes returns 200 as an honest “Future experience” preview. Support returns 200 with a “Coming later” incubator card.

---

## Part 4 — Dashboard audit

### What production ships

- Rebuild workspace with five selectable tiles.
- Today Outside observational summary.
- Customize: enable/disable, favorite, reorder, size cycle, columns, presets.
- Family grouping (Environmental / Astronomy / Photography).
- Layout repair from `73d60de` / merge `35bbb0a` is live: mobile tiles full-width at 390px; no Coming Soon in catalog.

### Tile classifications (production)

| ID | Title | Class |
| --- | --- | --- |
| `ph-conditions` | Conditions | Production-ready (when weather answers) |
| `ph-air` | Air | Functional but often unavailable (provider/location) |
| `ph-alerts` | Alerts | Functional but weak trust labeling (“Waiting” on empty) |
| `ph-astronomy` | Astronomy | Functional but weak (moonrise “Not reported”) |
| `ph-light` | Light | Functional but often unavailable under NWS fallback |

**Answer to quality questions:**

1. Does it explain what it does? Partially — “Workspace” + instruments, but Home≡Dashboard confuses first-time visitors.
2. Is the first screen useful? Moderately — Today Outside + Conditions are useful; several tiles often Unavailable/Partial.
3. Are five tiles enough for a customizable outdoor workspace? **No.** Customization offers little meaningful choice.
4. Are categories clear? Partially — three families over five tiles feels thin.
5. Data live and trustworthy? Often honest; NWS fallback strips sunrise/cloud/UV so Photography/Light degrade.
6. Better than a conventional weather app? Not yet — thinner forecast depth, more empty states.
7. Missing for compelling: depth (hourly/daily/wind/precip), water, hiking, safety interpretations, reliable sun times independent of provider, stronger Today Outside.

### Unmerged catalog branch

`origin/feature/dashboard-functional-tile-catalog` contains ~32 functional tiles across nine categories with category select-all/clear. It is a legitimate next Dashboard sprint **after** merge-gate review — not production.

---

## Parts 5–7 — Scenes, Sheds, Importer

See feature matrix for full classification.

**Scenes live loop:** Photo Coach / Shoot Review → Photo Library → Hidden Landscapes (experimental).  
**Not live:** Outdoor Journals (absent), Living Scenes (preview only), Portfolio Assistant/Builder/Health/Website Output (feature branch only, 404 on production).

**Sheds:** Map foundation with ethics modal, likelihood surfaces, local storage. Location often off; map tiles appeared fragmented during capture; honesty copy is strong. Stage: prototype / foundation.

**Importer:** Desktop Python app — detect Sony SD, copy, SHA ledger, optional Drive. **No eject, no Scenes handoff, no automated GUI tests.** Not a public web product (`robots` disallow; directory 404 on Pages after artifact exclusions / path).

---

## Parts 8–14 — Forms, responsive, a11y, perf, data, security, content

- **Contact:** FormSubmit → `contact@waypointstudio.org`; mailto fallback without JS. Clear path exists.
- **Responsive:** Dashboard mobile layout OK for primary tiles; customize measurement flagged half-width risk from nested selectors (investigate). Sheds map tiles unreliable.
- **A11y (home snapshot):** `html[lang]`, title, landmarks present; automated empty-name scan clean on home. Deep WCAG 2.2 AA not fully exercised — residual risk.
- **Performance:** `wds.js` loads **164** modules including ~67 dead dashboard-era files on every Home load. Favicon 404. HTML cached 600s.
- **Data integrity:** Trust chips generally honest; Astronomy still shows “Moonrise — Not reported”; Light/Air frequently Unavailable under provider fallback.
- **Security/privacy:** No client secrets found in scan. HSTS present. **Missing CSP, X-Frame-Options, X-Content-Type-Options.** `status.html` / `debug.html` publicly reachable (robots-disallowed but fetchable). CORS `*`. FormSubmit third party.
- **Content:** Mission on About matches “Observe. Discover. Understand.” Product family mostly coherent; Support still advertises “Coming later”; Incubator correctly de-emphasized but still linked.

---

## Scoring (detail in scorecard)

| Category | Raw / max | Weighted |
| --- | ---: | ---: |
| Core functionality | 12 / 20 | 12 |
| Reliability and data integrity | 10 / 15 | 10 |
| Navigation and link integrity | 8 / 10 | 8 |
| Mobile and responsive quality | 7 / 10 | 7 |
| User experience and clarity | 6 / 10 | 6 |
| Accessibility | 7 / 10 | 7 |
| Performance | 5 / 10 | 5 |
| Visual design and consistency | 3.5 / 5 | 3.5 |
| Security and privacy | 3.5 / 5 | 3.5 |
| Product completeness and differentiation | 2 / 5 | 2 |
| **Total** | | **63** |

---

## Issue counts

| Severity | Count |
| --- | ---: |
| P0 | 0 |
| P1 | 8 |
| P2 | 14 |
| P3 | 11 |

Full register: `waypoint-studio-production-issue-register-2026-07.md`.

---

## Five strongest aspects

1. Honest trust labeling and empty states on Dashboard (Live / Partial / Unavailable).
2. Deployment fingerprinting (`build-info.json`) matching `main`.
3. Scenes craft loop clarity on hub (Review → Import → Learn).
4. Sheds field-ethics honesty modal.
5. Layout repair held: no Coming Soon tiles; mobile full-width on primary workspace.

## Ten largest problems

1. Dashboard catalog too thin for a “customizable outdoor workspace” claim.
2. Dead Dashboard eras still loaded (performance + maintainability tax).
3. Scenes portfolio suite absent from production while vision/docs imply depth.
4. Living Scenes / Journals pillars not products.
5. Importer→Scenes handoff nonexistent.
6. Sheds map reliability / incomplete tile paint under audit capture.
7. Provider fallback silently empties Light/Air/UV-dependent tiles.
8. Public debug/status surfaces and missing security headers.
9. Product sprawl in Incubator + many apps compete for attention.
10. Navigation/docs still describe Outdoor OS / multi-era Dashboard incorrectly in places.

---

## Turnaround recommendation

**Continue — but consolidate.** Do not spread across Sheds features, portfolio web output, and Dashboard expansion simultaneously.

1. Hide or clearly quarantine unfinished public previews that over-promise.
2. Merge and ship Dashboard functional catalog after gate.
3. Trim `wds.js` dead eras.
4. Stabilize Importer + Coach handoff.
5. Build Scenes portfolio on the real import path.
6. Sheds: maintenance-only until Phase E decision.

Emergency fixes made during this audit: **none**.  
Merged or deployed during this audit: **none**.

---

## Evidence paths

- Screenshots: `docs/audits/evidence/2026-07/screenshots/` (44)
- JSON: `docs/audits/evidence/2026-07/json/`
- Tooling: `automation/audit-production-crawl.mjs`, `automation/audit-production-browser.mjs`
