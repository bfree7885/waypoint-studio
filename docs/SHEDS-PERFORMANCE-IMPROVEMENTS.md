# Sheds Performance Improvements — Sprint 6

## Changes

1. **Abort stale elevation** — pan/zoom increments `recomputeGen` and aborts in-flight Open-Meteo elevation chunks
2. **Coarse-first heat** (existing, retained) — UI updates before refine completes
3. **Weather reuse** — cached `state.weather` skips duplicate soft forecast when still present
4. **Legend phase text** — communicates coarse vs refined without blocking interaction
5. **Observation default path** — FAB removes Tools sheet open/close from the hot path

## Not changed (still material)

- OpenTopoMap / CDN tile latency outdoors
- 18×18 refine cost on low-end phones
- Full observation marker rebuild on every save
- No Service Worker tile cache pack

## Suggested next measurements (manual)

- Time to interactive map after ethics dismiss
- Time coarse heat → refine on LTE vs Wi‑Fi
- Memory after 200+ observations + long track
