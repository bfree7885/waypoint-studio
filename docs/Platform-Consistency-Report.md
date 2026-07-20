# Platform Consistency Report — Sprint 13

## Before

- Strong shared shell (`was-shell`) but incomplete product accents
- Duplicate CSS loads (app-shell linked twice)
- Parallel skeletons (Dashboard cream vs platform token shimmer)
- Legacy `.btn` still authored in Photo Coach / Scene Builder
- Sheds map offline from skip/experience utilities
- Error copy often technical or silent about cache

## After

| Dimension | Status |
|-----------|--------|
| Visual language | Shared badges, cards (`wds-xcard`), empty pages |
| Navigation | Shell unchanged; Steepleaf/ST nav get shared touch/active patterns |
| Loading | Shared skeleton + optional progressive loading helper |
| Errors | Kind-based titles, hints, cache honesty, retry |
| Empty | `emptyPageHtml` guidance pattern |
| Typography | Token fonts; LIE remapped onto rails |
| Spacing | Card/section/form rhythm in experience-v2 |
| Product accents | Dashboard, Volunteer, LIE, studio-home, photo apps |

## Cohesion score (honest)

| Area | Score |
|------|-------|
| Shell / nav chrome | 9/10 |
| Buttons | 8/10 (aliases remain for safety) |
| Loading / empty / error APIs | 8/10 (adoption incomplete in every view) |
| Maps | 5/10 |
| Nested Photo Coach pages | 7/10 |
| Automated cross-app visual regression | 3/10 |

**Overall:** Studio feels more like one product. Deep map/cyber surfaces and full empty-state adoption remain the largest consistency gaps.
