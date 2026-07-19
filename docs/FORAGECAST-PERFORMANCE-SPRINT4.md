# ForageCast — Performance Improvements (Sprint 4)

## Shipped

| Change | Effect |
| --- | --- |
| Season table boot watchdog + 1.8s loc soft-start | Ends hung “Preparing…” within ~15s with fail/retry |
| Platform fetch `.catch` → null on season table | Weather failure no longer blocks species/conditions JSON |
| Location label sanitization | Avoids confusing re-renders / trust loss (not a ms win, but perceived quality) |
| Graph/session patterns elsewhere | N/A this sprint; ForageCast still uses memory JSON cache via `ForageCastFetch` / platformUi |

## Unchanged structural costs

- Large deferred `wds-platform.js` dependency tree (~8–9s usable wait observed in live QA)
- Multiple JSON + weather on first Overview paint
- No bundle split for ForageCast-only cold path

## Suggested next

1. Prefetch `species-model.json` + `conditions.json` from Overview after first paint  
2. Defer map/WSKB scripts on Overview  
3. Session-level shared `fetchPlatform` promise across task pages (reduce duplicate provider work)
