# RC2 Sprint 2 — Production Integrity Report

**Date:** 2026-07-20  
**Production:** https://waypointstudio.org  
**Verified build:** `8be5ce5`

## Prerequisite (Sprint 1 completion)

Sprint 1 deploy recovery landed and verified during this sprint:

- Pages workflow run https://github.com/bfree7885/waypoint-studio/actions/runs/29752081675 → **success** (build + deploy + verify)
- Production `waypoint-build` = **`8be5ce5`** (matches `main`)
- Critical routes including Landscape Interpretation return **200**

## What was audited

- Full internal link crawl (59 routes)
- Production smoke suite (16 surfaces)
- Chromium desktop + mobile390 spot checks (console / page errors / failed same-origin requests)
- Contact/Support presence on home
- Private vs public route classification (Scholar/University)

## Defects repaired this sprint

| Item | Change |
| --- | --- |
| LI discoverability without relying only on JS catalog | Added Landscape Interpretation card to home Outdoor static grid |
| 404 recovery paths | Added LI + Knowledge links on `404.html` |
| Fingerprint coverage | Expanded `inject-build-metadata.mjs` HTML stamp list for nested Scenes/Cyber/Sheds map/HL/Animal Vision pages |
| Smoke suite | Added `automation/smoke-production-rc2.mjs` with optional `EXPECTED_SHORT` fingerprint check |

## Results

| Check | Result |
| --- | --- |
| `verify-production-deploy.mjs` | PASS (`8be5ce5`, 0 failed critical routes) |
| `smoke-production-rc2.mjs` | PASS 16/16 |
| Crawl dead `href` / `#` | 0 |
| Crawl broken public user routes | 0 (Scholar/University classified Hidden) |
| Spot-check console errors | 0 on sampled apps |
| Spot-check page errors | 0 |
| Home Contact links | Present |
| Home LI links | Present |

## Intentionally not changed

- Dashboard V2 widget redesign WIP left uncommitted (Sprint 2 boundary: do not redesign Dashboard V2)
- Private University/Scholar apps remain under `private/` (not published to Pages)
- No product vision / pricing / app removal changes

## Accessibility notes

- Skip link present on home
- Contrast debt from prior live axe baseline remains a **Sprint 3** candidate (systemic token work), not a deploy blocker
- Sampled pages expose Contact and primary nav without console failures

## Responsive notes

- Mobile 390 viewport loads of home, dashboard, LI, contact, steepleaf, scenes: HTTP 200, no page errors
- Full multi-breakpoint visual QA matrix remains recommended for Sprint 3 polish

## Remaining risks / Sprint 3 recommendations

1. Systemic WCAG contrast remediation (design tokens + Knowledge)
2. Broader Firefox/WebKit matrix + full interactive button matrix per app
3. Nested pages still showing `waypoint-build=local` until next deploy stamps expanded HTML list
4. Dashboard cold-start performance budgets
5. Commit/ship Dashboard V2 widgets work in a dedicated sprint (not this one)

## Files changed (Sprint 2)

- `index.html` — LI home card
- `404.html` — recovery links
- `scripts/inject-build-metadata.mjs` — broader stamp list
- `automation/smoke-production-rc2.mjs` — production smoke suite
- `docs/RC2-PRODUCTION-ROUTES.md`
- `docs/RC2-SPRINT2-PRODUCTION-INTEGRITY.md`
- `reports/rc2-route-crawl.json`
- `reports/rc2-browser-spotcheck.json`
