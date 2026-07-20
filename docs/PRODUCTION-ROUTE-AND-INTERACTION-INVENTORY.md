# Production Route and Interaction Inventory

**Generated:** 2026-07-20 04:33 UTC  
**Production host:** https://waypointstudio.org  
**Production build marker:** `761b202`  
**Expected remote main:** `081965d`  
**Method:** HTTP crawl of production + expected-route probes + Playwright spot checks (Chromium desktop 1280 + mobile 390)

## Release context (read first)

Production is **not** serving current `origin/main`.  
Last successful GitHub Pages deploy: `761b202` (2026-07-19).  
All subsequent Pages deploys **failed** on `validate-production-links.mjs` due to one Steepleaf absolute route (`/explore/`).

## Inventory table (production)

| Area | Production URL | HTTP | Build meta | Linked from home? | Desktop | Mobile | Direct load | Status |
| --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| Studio Home | `/` | 200 | 761b202 | — | Pass | Pass | Pass | **Pass (stale)** |
| Dashboard | `/apps/dashboard/` | 200 | 761b202 | Yes | Pass | Pass | Pass | **Pass (stale vs V2)** |
| Scenes | `/apps/scenes/` | 200 | 761b202 | Yes | Pass | Pass | Pass | Pass |
| Photo Coach | `/apps/photo-coach/` | 200 | 761b202 | Via Scenes | Spot | — | Pass | Partial |
| Sheds | `/apps/shed-hunting/` | 200 | 761b202 | Yes | Spot | Spot | Pass | Pass (pre-sprint6 depth) |
| ForageCast | `/apps/foragecast/` | 200 | 761b202 | Yes | Spot | Spot | Pass | Pass (pre-recovery depth) |
| Fieldry | `/apps/fieldry/` | 200 | 761b202 | Yes | Pass | Pass | Pass | Pass (pre-sprint7 depth) |
| Steepleaf | `/apps/steepleaf/` | 200 | 761b202 | Yes | Pass | Pass | Pass | Pass (pre-sprint3 depth) |
| Savant | `/apps/savant-sommelier/` | 200 | 761b202 | Yes | — | — | Pass | Pass (pre-sprint8 depth) |
| SignalTerrain | `/apps/signalterrain/` | 200 | 761b202 | Yes | — | — | Pass | Pass (pre-Live depth) |
| Volunteer | `/apps/waypoint-volunteer/` | 200 | 761b202 | Yes | Pass | Pass | Pass | Pass (pre-sprint9 strengthen) |
| Landscape Interpretation | `/apps/landscape-interpretation/` | **404** | — | No | Fail | Fail | Fail | **Not Deployed** |
| LI Learn | `/apps/landscape-interpretation/learn.html` | **404** | — | No | Fail | Fail | Fail | **Not Deployed** |
| LI Field | `/apps/landscape-interpretation/field.html` | **404** | — | No | Fail | Fail | Fail | **Not Deployed** |
| Scholar | `/apps/scholar/` | **404** | — | No | — | — | Fail | **Not Deployed** |
| University | `/apps/university/` | **404** | — | No | — | — | Fail | **Not Deployed** |
| Contact page | `/contact.html` | 200 | local | Footer JS yes; hero static **no** | Pass | Pass | Pass | **Partial** |
| Support | `/support.html` | 200 | local | Yes | — | — | Pass | Pass |
| About | `/about.html` | 200 | local | Yes | — | — | Pass | Pass |
| Knowledge | `/knowledge.html` | 200 | local | Yes | — | — | Pass | Pass |
| Settings | `/settings.html` | 200 | local | Yes | — | — | Pass | Pass |
| Privacy | `/privacy.html` | 200 | — | Footer | — | — | Pass | Pass |
| Kiosk | `/kiosk.html` | 200 | 761b202 | — | — | — | Pass | Pass |
| `/map/` | `/map/` | 200 | — | — | — | — | Pass | Pass |

## Crawl totals

- Pages/probes recorded: **64**
- Broken page routes: **5** (LI ×3, Scholar, University)
- Build markers observed: `761b202`, `local`
- Dead controls (`href="#"`, empty): **0**
- Broken assets (checked): **0**
