# Production Owner Review — Waypoint Studio

**Date:** 2026-07-20 04:33 UTC  
**Live site:** https://waypointstudio.org

## Plain answers

1. **Is the latest code live?** No. `origin/main`=`081965d`; production=`761b202`.
2. **Visible changes?** Only through `761b202` (Dashboard Today Outside era and earlier).
3. **Not visible?** Everything after `761b202`: outdoor recoveries, LI, Volunteer strengthen, Dashboard/Experience V2, Scholar/University, Contact hero gate.
4. **Failing links?** LI/Scholar/University 404; Contact hero missing (Contact page itself works).
5. **Working apps?** Dashboard, Scenes, Sheds, ForageCast, Fieldry, Steepleaf, Savant, SignalTerrain, Volunteer — older build.
6. **Only look complete?** Anything “fixed in tree” in recent docs but not redeployed.
7. **Problem type?** **Deployment/release engineering** (one code defect blocking CI). Features exist on GitHub.
8. **Fix first?** Steepleaf `/explore/` → green Pages → confirm new SHA → smoke LI/Contact/Dashboard.
9. **Publicly showable?** Older public alpha only; not “latest closed beta.”
10. **Owner verify after fix?** `waypoint-build` ≠ `761b202`; LI not 404; Contact in hero; Dashboard loads.

| Expected change | Production now | Why | Next |
| --- | --- | --- | --- |
| Latest main live | Still `761b202` | Pages failing | Fix Steepleaf + redeploy |
| Landscape Interpretation | 404 | Never deployed | Block 1 |
| Contact on home hero | Missing | Undeployed | Redeploy |
| App recoveries | Old | Undeployed | Redeploy |
| Dashboard V2 | Absent | Undeployed | Redeploy |

**Bottom line:** The site is behind GitHub. One Steepleaf path breaks the deploy validator and freezes production at `761b202`.
