# Sheds Map System Review — Sprint 6

## Role of the map

The map is the product workspace. Chrome (HUD, FAB rail, Today’s Search sheet) is subordinate to the Leaflet canvas.

## Startup path

1. Leaflet + Sheds modules boot
2. Restore last map view when present
3. Ethics sheet once (`waypoint-sheds-ethics-seen-v1`)
4. GPS locate unless previously denied
5. Coarse heat (10×10) immediately at zoom ≥ 9
6. Refine heat (18×18) after elevation + soft weather

## Layers

| Layer | Purpose |
| --- | --- |
| Base topo tiles | Orientation / landforms |
| Heat grid | Relative walk priority (not antler probability) |
| Observations | Private local markers |
| Coverage marks | Partial / thorough / revisit |
| Plan ring | Suggested next pocket |
| User + accuracy | GPS presence |

## Interaction model

- Locate / recenter / add note / track / tools on FAB
- Today’s Search peek always visible; expand for briefing + mark coverage
- Long-press / tools for advanced explain, weights, export

## Performance notes

- Coarse-first heat avoids waiting on Open-Meteo elevation
- `recomputeGen` + elev `AbortController` drop stale refine work
- Heat opacity / visibility changes apply immediately; weights recompute on short debounce

## Remaining map risks

- Provider tile cancellations during gesture storms (console noise)
- Very large observation libraries (cap 500) may slow marker rebuild
- No offline tile pack — offline depends on browser cache
