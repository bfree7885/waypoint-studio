# Applications Requiring Additional Consistency Work

**Date:** 2026-07-18

| App | Priority | Remaining gaps |
|-----|----------|----------------|
| **Sheds map** | High | Rejoin shell or formally document immersive exception; unify fonts/CDN/loading |
| **Photo Coach + Waypoint Scenes** | High | Adopt `.wds-btn`, shared empty/loading; reduce `.pc-*` radius forks |
| **Steepleaf** | Medium | Move `.sl-nav` → `.wds-task-nav`; use platform loading/empty |
| **SignalTerrain Cyber** | Medium | Align `.st-cyber-nav` + `st-loading` with platform UI |
| **Fieldry** | Medium | Remove leftover `.ws-topnav` selectors; confirm shell feature IA |
| **Volunteer discover** | Medium | Map loading/offline classes; keep shell-only nav |
| **Dashboard** | Medium | Replace inline page-loading with `.wds-skeleton` |
| **Animal Vision / Hidden Landscapes / Photo Library** | Low | Mostly Scenes-child; inherit Coach/Scenes cleanup |
| **Photo Pipeline** | Low | Either bring into shell or mark internal-tooling |
| **Foundation stubs** (where still thin) | Low | Grow via product recovery, not one-off chrome |

## Already in good shape (this phase)

- ForageCast + Savant task nav structure
- Shell chrome on most live product pages
- Volunteer subpages without duplicate mini-nav
- Shared fetch/escape/loading helpers available platform-wide
