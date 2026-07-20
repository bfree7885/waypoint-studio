# Remaining Production Risks

**After Recovery Sprint 1 (local, uncommitted).** Live site will not reflect these fixes until the owner commits, pushes, and Pages deploys.

## Still real risks

| Risk | Severity | Notes |
| --- | --- | --- |
| **Deploy not shipped** | P0 until push | All repairs are local until merge + Pages |
| Dashboard cold JS weight | P1 perf | ~120 sequential modules — usable but slow on mid devices |
| Partial provider failures | P1 | Honest “Partial success” may still appear when upstream APIs fail |
| CSS `@import` waterfall | P2 perf | Correct paths, but many round-trips |
| Accessibility contrast | P2 | Systemic axe color-contrast across dark theme |
| ForageCast data honesty | P2 | Scores can render before place is fully resolved — labels fixed, model certainty still product work |
| Map tile aborts | P3 | OSM `ERR_ABORTED` during zoom often benign |
| Sample/demo copy | P3 | Steepleaf/Volunteer/ST still disclose sample/demo language |

## Cleared or mitigated (once deployed)

- Site-root `/map/` 404 for bookmarks (redirect page)
- Foundation `/map/` absolute trap (`routeHref` + foundation.json)
- Live/health JSON 404 from app directories
- NWS `point=0,0` from `Number(null)`
- Steepleaf explore parse error + hang without retry
- “null, NY” region string coercion
- Missing pre-deploy asset gate

## Honest stability assessment

**Infrastructure correctness** after this sprint (locally verified): **substantially improved**.

**Public production stability today:** still matches the prior audit until deploy.

**Recommendation after ship:** re-run Playwright live audit (without treating axe `@import` noise as CSS outages) and keep closed-beta posture until Dashboard cold-start and contrast work land.
