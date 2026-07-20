# ForageCast — Remaining Technical Debt

| Item | Severity | Notes |
| --- | --- | --- |
| Cold-start platform script weight | High | Dominant usable-wait driver in QA |
| Open-Meteo without multi-provider failover | Medium | Partial/uncertain states exist; failover incomplete |
| Duplicate `fetchPlatform` per page | Medium | Session cache helps; still redundant work |
| Schematic-only maps | Medium | Product honesty OK; field users want basemap later |
| Small species library | Medium | Do not fabricate entries |
| Editorial Pike-centric `home.json` secondary content | Low | Summary path independent |
| Season table vs recovery IA wording drift | Low | Partially aligned this sprint |
| No Playwright browser smoke in CI for NULL label | Medium | Unit tests cover sanitization |

## Out of scope (by design this sprint)

- New species expansion
- Social / marketplace features
- Redesigning Dashboard or other apps
