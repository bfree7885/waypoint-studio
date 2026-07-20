# Steepleaf — Performance Improvements (Sprint 3)

## Changes

| Improvement | Detail |
| --- | --- |
| Graph load cache | `wds-steepleaf-graph.js` reuses in-flight / completed load per base path — explore → entity no longer double-fetches the demo graph |
| Boot progress | `platformBoot.status` updates status text without remounting the boot shell |
| Faster fail | Explore/entity watch timeout **12s** (was 15s) so hung loads surface retry sooner |
| Companion paint | Immediate `paint()` once models/guides/briefing are present; no indefinite “Starting…” |
| Perceived load | Status strings: waiting for scripts → fetching graph → building search/page |

## Not changed (structural)

- Still loads multiple deferred platform + product scripts (no bundler merge this sprint)
- Google Fonts remain remote (Cormorant + Inter) — cold network can delay typography
- Demo graph JSON size is educational completeness over minimal payload
- Studio app shell + nav still initialize on every Steepleaf route

## Suggested next

1. Prefetch `demo-graph.json` from companion when idle  
2. Split explore UI so search mounts before recommendation lenses  
3. Measure LCP on companion home after deploy (target: usable briefing <3s on mid mobile)
