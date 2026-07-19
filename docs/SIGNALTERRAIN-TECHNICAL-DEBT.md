# SignalTerrain — Remaining Technical Debt

| Item | Severity | Notes |
| --- | --- | --- |
| Large monolithic `live.json` | High | Needs split for mobile/slow networks |
| Dual sample vs live surface set | Medium | Labeled; still easy to confuse if users ignore badges |
| Radio modules unfinished | Medium | Receivers/incidents/audio planned only |
| Systemic CSS relative 404s | Medium | Studio-wide |
| IBM Plex + Cormorant remote fonts | Low | Cold network delay |
| No Playwright smoke for Live brief bands | Medium | Unit contracts cover mapping/routing |

## Out of scope (by design)

- Offensive cybersecurity capabilities
- Fake live data when providers fail
- Expanding sample threat catalogs as if they were production
