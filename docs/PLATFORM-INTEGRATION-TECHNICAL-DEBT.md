# Platform Integration Technical Debt

**Date:** 2026-07-18

| ID | Item | Severity | Notes |
|---|---|---|---|
| TD-I1 | Observation persistence still per-app | Medium | Bridge is read-only; writes stay local — correct for now |
| TD-I2 | Specialty profiles not migrated | Medium | Volunteer / Photo Coach / Savant / Steepleaf / ST |
| TD-I3 | Three collection systems | Medium | Platform / Photo Library / ST research |
| TD-I4 | Search href depth edge cases | Low | Providers resolve via catalog; some hits lack href |
| TD-I5 | Graph seed re-run protection | Low | Flag key; clearing storage re-seeds |
| TD-I6 | Settings page outside `wds.js` bundle | Low | Explicit script list — intentional for light page |
| TD-I7 | Workflow UI not on every from-app | Low | Catalog complete; hooks partial |
| TD-I8 | Dashboard still has legacy favorites fallback | Low | Prefer platform places first |
| TD-I9 | `wds.js` script count grew again | High for CWV | Integration modules add to Phase 2 fan-out debt |

---

## Debt reduced

- Orphan Profile / Settings / Locations APIs now have a real UI and callers.  
- Cross-app observation coupling via raw keys reduced on Dashboard path.  
- Missing Studio search / notification / workflow architecture filled with honest, local-first modules.
