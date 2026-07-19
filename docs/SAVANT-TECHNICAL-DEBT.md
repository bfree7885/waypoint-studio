# Savant Sommelier — Technical Debt Report (Phase 1)

**Date:** 2026-07-18

## High priority

1. **Climate / terrain estimators are educational** — replace with authoritative DEM, PRISM/Daymet-class normals, and hardiness datasets when licensing allows.
2. **Map is schematic** — Western US teaching canvas, not a real basemap; click→lat/lng is approximate.
3. **Discover catalog is thin** — ~16 educational entries; facets exist, coverage does not yet match every facet richly (producer, AVA, vintage, certification tags).
4. **No photo upload pipeline** — cellar schema supports `photoDataUrl` but UI does not yet attach images.
5. **Buying is architecture-only** — no retailer adapters.

## Medium priority

6. Friends’ recommendations reserved — no social graph.
7. Settings units do not yet re-label vineyard metric units in the UI.
8. Duplicate script tags across five HTML pages (acceptable for static apps; could use a shared include later).
9. Grape model set is six cultivars — expand carefully with agronomic sources.
10. Wind / soils / hydrology metrics acknowledge low confidence — need real layers.

## Low priority / intentional

11. Foundation mount / old platform-foundation boot removed from primary pages by design.
12. No critic scores, public rankings, or marketplace compulsion (product principle, not debt).

## Test coverage

- `automation/test-savant-recovery.mjs` covers engine explainability, nav features, file presence, cellar search helpers.
- Browser smoke routes added for five Savant pages.
- Platform foundation test still exercises `WaypointSavant` site persistence.
