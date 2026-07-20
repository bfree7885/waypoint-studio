# Production Remediation Roadmap

**Generated:** 2026-07-20 04:33 UTC  
**Audit only — no product remediation implemented in this pass.**

## Release Block 1 — Deployment truth (P0)
Objective: production serves current `main` with clear SHA fingerprint.  
Defects: PROD-001, 002, 008, 009, 012.  
Likely files: `apps/steepleaf/data/foundation.json`, optionally link validator / inject-build-metadata / pages.yml.  
Acceptance: Pages green; production `waypoint-build` == deployed short SHA; LI returns 200.

## Release Block 2 — Routes / navigation
Defects: PROD-003, 004, 007. Depends on Block 1.

## Release Block 3 — Critical workflows
Re-verify Dashboard, maps, location, Volunteer, Fieldry, Contact on new build. Defects: PROD-005, 006.

## Release Block 4 — Mobile / a11y / visual
Defects: PROD-010, 011. Re-axe after deploy.

## Release Block 5 — Performance / resilience
Dashboard/ForageCast cold-start after live build exists.

## Release Block 6 — Product language / discoverability
Defects: PROD-004, 013. RC1 honesty framing on live site.
