# Day Arc fold variance — M3 publish gate

**Date:** 2026-07-22  
**Harness:** `automation/audit-dashboard-os-m3-fold.mjs`  
**Data:** [`fold-audit.json`](./fold-audit.json)  
**Server:** `http://127.0.0.1:8799/apps/dashboard/` (Pike seeded)

## Policy (unchanged)

1. Priority order preserved: **Happening → What Matters → Do This**
2. Primary briefing must remain readable in the first viewport when content allows
3. **Day Arc may sit below the fold** on short screens
4. **Do not** compress primary briefing to force Day Arc above the fold

## Viewports measured

| Viewport | Priority order | Primary briefing in first viewport | Day Arc fully above fold | Legacy chrome |
|----------|----------------|------------------------------------|--------------------------|---------------|
| 1440×900 | OK | Yes | Yes (this content) | No |
| 1366×768 | OK | Yes | Yes (this content) | No |
| 1280×720 | OK | Yes | Yes (this content) | No |
| 1024×768 | OK | Yes | Yes (this content) | No |
| Mobile 390×844 | OK | Yes | Yes (this content) | No |
| Large mobile 430×932 | OK | Yes | Yes (this content) | No |

## Notes

- With the mild “Soft overcast” briefing used for this audit, Day Arc peek sat above the fold on all listed viewports.
- Approved M3 night captures and reconcile review still document **content-dependent** variance: taller Happening / Matters copy can push Day Arc just below first paint on shorter heights. That remains acceptable under the policy above.
- No layout compression was applied for publish.

## Verdict

Fold behavior acceptable for production. Priority hierarchy intact; Day Arc not forced above fold.
