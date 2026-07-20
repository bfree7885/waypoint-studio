# RC2 Production Routes

**Generated:** 2026-07-20  
**Production build:** `8be5ce5` (verified against `origin/main`)  
**Method:** HTTP crawl of https://waypointstudio.org + expected probes + smoke suite

## Summary

| Class | Count |
| --- | ---: |
| Working | 57 |
| Broken (public probes) | 2* |
| Dead controls (`href="#"`, empty) | 0 |
| Unique builds observed | `8be5ce5`, `local` (nested pages pending stamp expansion) |

\* `/apps/scholar/` and `/apps/university/` are **private owner surfaces** under `private/university/` — not public apps. They are classified **Hidden**, not user-journey defects. Public crawl does not link to them.

## Core platform

| Route | Status | Class | Notes |
| --- | --- | --- | --- |
| `/` | 200 | Working | Contact + LI discoverable |
| `/contact.html` | 200 | Working | Build stamped |
| `/support.html` | 200 | Working | |
| `/about.html` | 200 | Working | |
| `/privacy.html` | 200 | Working | |
| `/knowledge.html` | 200 | Working | |
| `/settings.html` | 200 | Working | |
| `/kiosk.html` | 200 | Working | |
| `/map/` | 200 | Redirect | → Sheds map |

## Applications

| Route | Status | Class |
| --- | --- | --- |
| `/apps/dashboard/` | 200 | Working |
| `/apps/scenes/` | 200 | Working |
| `/apps/photo-coach/` | 200 | Working |
| `/apps/shed-hunting/` | 200 | Working |
| `/apps/foragecast/` | 200 | Working |
| `/apps/fieldry/` | 200 | Working |
| `/apps/steepleaf/` | 200 | Working |
| `/apps/steepleaf/explore/` | 200 | Working |
| `/apps/signalterrain/` | 200 | Working |
| `/apps/savant-sommelier/` | 200 | Working |
| `/apps/waypoint-volunteer/` | 200 | Working |
| `/apps/landscape-interpretation/` | 200 | Working |
| `/apps/landscape-interpretation/learn.html` | 200 | Working |
| `/apps/hidden-landscapes/` | 200 | Working |
| `/apps/photo-library/` | 200 | Working |
| `/apps/animal-vision/` | 200 | Working |
| `/apps/scholar/` | 404 | Hidden (private) |
| `/apps/university/` | 404 | Hidden (private) |

## Smoke suite

`node automation/smoke-production-rc2.mjs` → **16/16 OK** against live production at `8be5ce5`.

## Artifacts

- `reports/rc2-route-crawl.json`
- `reports/rc2-browser-spotcheck.json`
