# Technical Debt Register — Sprint 10

Separated by severity. Includes recovery-sprint debt that remains open.

## Critical (blocks public RC1; gate Closed Beta if unverified)

| ID | Debt | Owner area |
| --- | --- | --- |
| CD-1 | No post-recovery **live Playwright re-audit** | Platform QA |
| CD-2 | Production confirmation of `/map/`, live/health URLs, NULL labels, boot exits | Deploy + QA |
| CD-3 | Systemic **color-contrast** failures (~102 routes) | Design system |

## High

| ID | Debt | Owner area |
| --- | --- | --- |
| HD-1 | Dashboard cold-start JS weight / provider fan-out | Dashboard |
| HD-2 | ForageCast cold path ~8s typical | ForageCast |
| HD-3 | Volunteer **demo catalog** only (no live regional feeds) | Volunteer |
| HD-4 | Fieldry / Sheds **no photo attach** | Field apps |
| HD-5 | LI **no GIS layers** (educational tags only) — marketing risk if oversold | LI |
| HD-6 | Scenes / Photo Coach / Photo Library / Animal Vision **unsprinted** | Scenes suite |
| HD-7 | Nested-interactive / aria issues in photography apps | Scenes a11y |

## Medium

| ID | Debt | Owner area |
| --- | --- | --- |
| MD-1 | Soft Savant knowledge graph (hints, not entity joins) | Savant |
| MD-2 | SignalTerrain Radio / planned routes `ready: false` | SignalTerrain |
| MD-3 | Sheds whitetail-only; tile abort console noise | Sheds |
| MD-4 | Steepleaf demo knowledge graph | Steepleaf |
| MD-5 | Axe `wds-*.css` 404 measurement noise vs real `@import` | Platform QA tooling |
| MD-6 | Duplicate / triple chrome on some foundation apps | Shell |
| MD-7 | Older V1 docs still say LI is docs-only (partially corrected S10) | Docs |

## Low

| ID | Debt | Owner area |
| --- | --- | --- |
| LD-1 | Dashboard duplicate H1 (P3) | Dashboard |
| LD-2 | Sample/foundation language still visible (intentional honesty) | Multiple |
| LD-3 | Inter/Google Fonts network dependence outdoors | Design |
| LD-4 | Contact form not end-to-end submitted in QA | Contact |

## Future enhancement (explicitly not debt of “broken”)

| ID | Idea |
| --- | --- |
| FE-1 | Unified write store across Fieldry / Sheds / Volunteer CS |
| FE-2 | Live Volunteer opportunity feeds |
| FE-3 | LI soils/DEM/historic aerial packs |
| FE-4 | Savant producer→site→geology entities |
| FE-5 | Bundle splitting / route-based code load |
| FE-6 | Full WCAG manual + SR certification pass |

## Explicit non-goals (do not re-open as “missing RC1 features”)

Volunteer management CRM · social rankings/likes · speculative AI land history · offensive RF tools · enterprise SOC
