# Remaining Critical Defects — Sprint 10

These are the defects that matter for the Closed Beta / RC1 decision.  
Severity uses the live QA scale.

## Still critical until live-verified (were P0/P1 on production)

| ID | Defect | Tree status | Live status | Action |
| --- | --- | --- | --- | --- |
| RCD-1 | `/map/` 404 | Fixed | Unknown post-deploy | Smoke `/map/` → Sheds map |
| RCD-2 | Dashboard app-relative live/health 404 + NWS `0,0` | Fixed | Unknown | Network panel on Dashboard cold load |
| RCD-3 | ForageCast `NULL, NY` | Fixed | Unknown | Overview location string sanity |
| RCD-4 | Steepleaf explore/entity infinite busy | Mitigated | Unknown | Open explore/entity; expect content or Retry |
| RCD-5 | ForageCast season-table infinite busy | Mitigated | Unknown | Same |

## Critical for public RC1 (open)

| ID | Defect | Notes |
| --- | --- | --- |
| RCD-6 | Systemic color-contrast | axe ~102 routes; Knowledge worst |
| RCD-7 | No live re-audit after recovery | Evidence gap for any “RC1” claim |

## High (not Closed-Beta blockers if framed)

| ID | Issue |
| --- | --- |
| RCH-1 | Dashboard / ForageCast slow cold start |
| RCH-2 | Volunteer demo-only opportunities |
| RCH-3 | Missing photos in Fieldry/Sheds |
| RCH-4 | Nested interactive in Photo Coach / Hidden Landscapes |

## Closed in Sprint 10 review (gate fixes)

| ID | Issue | Fix |
| --- | --- | --- |
| S10-1 | Home missing Contact link (contact platform contract) | `index.html` |
| S10-2 | LI Learn missing `wds-platform-resilience.js` before platform-ui | `learn.html` |

## Do not treat as critical

- Axe mass `wds-*.css` 404s when pages load design-system CSS correctly (Sprint 1 analysis)
- Terrainbound retirement
- Sample/demo honesty badges (product requirement)
