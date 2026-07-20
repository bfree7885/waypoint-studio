# Production Defect Register

**Generated:** 2026-07-20 04:33 UTC

| Severity | Count |
| --- | ---: |
| Blocker | 1 |
| Critical | 3 |
| High | 6 |
| Medium | 4 |
| Low | 3 |

### PROD-001 — GitHub Pages deploy frozen by link validator (Blocker / P0)
Evidence: Pages successes stop at `761b202`; later runs fail at Validate production links on Steepleaf `/explore/`.  
Fix: make explore route app-relative; redeploy.  
Verify: production `waypoint-build` equals deployed short SHA.

### PROD-002 — Production does not match origin/main (Critical)
Production `761b202` vs `origin/main` `081965d`. Consequence of PROD-001.

### PROD-003 — Landscape Interpretation 404 (Critical)
https://waypointstudio.org/apps/landscape-interpretation/ → 404 (desktop+mobile screenshots). Never deployed.

### PROD-004 — Home Contact hero gate missing (Critical)
Production home HTML lacks `contact.html` in hero row; present on `main`. Footer/shell may still expose Contact via JS.

### PROD-005 — Dashboard V2 / Experience System V2 not live (High)
Commits `d091e1e`, `cfb8bcc` on remote; production still `761b202`.

### PROD-006 — Field/outdoor recovery sprints not live (High)
Commits after `761b202` through Savant/SignalTerrain/Sheds/Fieldry/ForageCast/Steepleaf failed Pages deploy.

### PROD-007 — Scholar / University 404 (High)
`/apps/scholar/`, `/apps/university/` probes 404.

### PROD-008 — Mixed build metadata (Medium)
Some pages show `waypoint-build=local` on production.

### PROD-009 — Steepleaf absolute `/explore/` (High; blocks release)
`apps/steepleaf/data/foundation.json` path `/explore/`.

### PROD-010 — Accessibility contrast debt (Medium)
Best evidence remains Jul 19 live axe (~102 contrast routes); not fully re-scanned this pass.

### PROD-011 — No Firefox/WebKit matrix (Low; audit limit)
Chromium only.

### PROD-012 — Local checkpoint commit ahead of origin (Low)
Local HEAD `03290f5` ahead of `081965d`.

### PROD-013 — “Unchanged site” perception (Medium)
Deploy freeze, not missing implementation.

### PROD-014 — Full interactive matrix not exhausted (Low; audit limit)
Spot checks + crawl, not every control on every app.
