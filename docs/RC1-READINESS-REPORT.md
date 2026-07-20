# RC1 Readiness Report — Sprint 10

## Purpose

Decide whether Waypoint Studio should be called **Release Candidate 1** for public release.  
This report optimizes for **truth**, not optimism.

## Inputs

| Source | Role |
| --- | --- |
| `audits/live-site-qa/` (2026-07-19) | Production baseline |
| Recovery sprints 1–9 docs + commits | Intended repairs |
| `automation/test-*-recovery*.mjs` / sprint tests | Contract verification |
| Code inspection of P0/P1 repair sites | Confirm fixes exist in tree |
| Sprint 10 gate fixes | Home Contact; LI Learn resilience |

## Platform posture

| Question | Answer |
| --- | --- |
| Is production (last audited) RC1-ready? | **No** |
| Is the recovery tree Closed-Beta-ready? | **Yes, with gates** |
| Did sprints 1–9 invent major new products? | Mostly hardening; LI is the only new educational shell |
| Is there a post-recovery live Playwright run? | **No — this is the largest evidence gap** |

## Workflow verification (honest method)

This sprint did **not** re-run full Playwright against production (no auth to treat live as green). Verification used:

1. Curated defect list vs code presence of repairs  
2. Automation suites for sprints 1–9 + platform reliability/contact/knowledge  
3. Routing map / registry consistency  
4. Spot checks of `/map/`, live feed URLs, location sanitizers, boot watch usage  

**Assumption to refuse:** “tests pass ⇒ production is fixed.” Production must be re-audited after deploy.

## P0/P1 status matrix

| Defect (QA) | Tree | Live (last audit) | Closed-beta gate |
| --- | --- | --- | --- |
| `/map/` 404 | Fixed (`map/index.html`) | Open at audit time | Must verify live |
| Dashboard live/health 404 + NWS 0,0 | Fixed paths + guards | Open at audit time | Must verify live |
| ForageCast `NULL, NY` | Fixed sanitizers | Open at audit time | Must verify live |
| Steepleaf explore/entity >15s | Boot watch + parse fix | Open at audit time | Must verify live |
| ForageCast season-table >15s | Boot watch | Open at audit time | Must verify live |

## Decision

**B — Ready for Closed Beta after fixing listed critical issues**  
(see Executive Summary for the gate list)

Public **RC1 (option A)** is deferred until accessibility and cold-start work land and a live re-audit is green.
