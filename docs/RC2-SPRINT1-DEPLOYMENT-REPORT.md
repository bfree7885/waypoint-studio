# RC2 Sprint 1 — Deployment Recovery Report

**Date:** 2026-07-20  
**Repository:** `bfree7885/waypoint-studio`  
**Production:** https://waypointstudio.org

## Root causes

1. **Hard deploy blocker:** `apps/steepleaf/data/foundation.json` used absolute site-root path `/explore/` for a ready route.  
   `automation/validate-production-links.mjs` fails the Pages build on that condition.
2. **Cascade:** Every Pages deploy after `761b202` failed at “Validate production links,” freezing production on that SHA.
3. **Fingerprint gaps:** Several public HTML entrypoints (Contact, Support, About, LI, etc.) were not stamped by `inject-build-metadata.mjs`, leaving `waypoint-build=local` on production for those pages.

## Fixes

| Change | Purpose |
| --- | --- |
| Steepleaf `path: "explore/"` (relative) | Unblock link validator / Pages |
| Expand `HTML_FILES` in inject script | Stamp Contact, Support, About, Privacy, Knowledge, Settings, LI, Photo Library, Hidden Landscapes |
| `automation/verify-production-deploy.mjs` | Post-deploy fingerprint + critical route checks |
| `pages.yml` `verify` job | Fail the workflow if live site does not converge to deploy SHA |

## Tests run (pre-push)

- `node automation/validate-production-links.mjs` → Broken: 0  
- `node automation/validate-production-assets.mjs` → Missing: 0  
- `node automation/test-production-recovery.mjs` → PASS  
- `node automation/test-contact-platform.mjs` → PASS (122)

## Deployment evidence

Documented after push + Actions completion in the same sprint log / Sprint 2 handoff:

- Expected: production `meta[name=waypoint-build]` equals short SHA of deployed commit  
- Critical routes including Landscape Interpretation must return 200  

## Remaining risks

- CDN propagation delay (mitigated by verify retries)  
- GitHub Pages environment permissions must remain enabled for Actions  
- Separate WIP (Dashboard V2 widget redesign) intentionally not included in this deploy commit  

## Recommendations

- Keep foundation.json routes app-relative  
- Treat `verify-production-deploy.mjs` as required gate for release claims  
- Proceed to RC2 Sprint 2 for full user-journey integrity on the recovered build  
