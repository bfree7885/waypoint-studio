# Dashboard Performance Report — Sprint 2

## Wins this sprint

| Change | Effect |
| --- | --- |
| Trails remain off critical `Promise.all` | First paint not blocked by OSM |
| Trails/elevation/rivers no longer force Partial alone | Less banner noise; perceived “healthy” sooner |
| Specialty mounts still lazy per tab | Weather/Photo/etc. JS work deferred until opened |
| `aria-busy` cleared when content engine resolves | Heuristic audits / AT see usable sooner |
| Hero preview instead of empty cue-only summary | Value visible without a tab click |

## Not solved (honest)

- Sequential load of ~120 design-system modules via `wds.js` dominates cold start
- No CSS bundling / critical CSS extraction
- 5-minute dashboard refresh still re-runs `startDashboard` fully
- Double location hydrate (provisional → precise) can still re-render once

## Recommendations before public beta

1. Split Dashboard entry into a thin boot bundle (location + OIP + recovery) vs deferred specialty UIs
2. Cache last good OIP package for instant first paint offline
3. Measure LCP/INP on real phones after deploy (do not claim lab CWV without measurement)
4. Consider reducing refresh interval work (diffing platform package before full re-render)
