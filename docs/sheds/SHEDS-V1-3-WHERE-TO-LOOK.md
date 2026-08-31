# ShedHunting.org V1.3 — Where should I look?

**Status:** product work on Studio `main` (`fe14f88d`). Not deployed. Do not merge or publish in this phase.

V1.1/V1.2 answered **Should I go today?** V1.3 adds the first honest **Where should I look?** layer on `/map/`.

This is not an antler prediction system. It never claims antlers, deer, travel routes, or find probability.

## Product questions

1. Should I go shed hunting today? — V1.1/V1.2 (overview + Today’s Hunt). Unchanged.
2. Where should I look? — V1.3 map **Search Areas** + Inspect field intelligence.

## Architecture (smallest coherent version)

Keep three conceptual layers in `apps/shed-hunting/js/sheds-search-priority.js`:

| Layer | Examples | Honesty |
|---|---|---|
| RAW DATA | slope = 8°, aspect = SW, elevation = 412 m | Measured or unavailable |
| DERIVED TERRAIN FEATURE | gentle bench beside steeper hillside | Geometric, not biological |
| INTERPRETATION | worth checking because flatter transition terrain may concentrate travel and is easier to search | Heuristic language only |

**Base terrain priority** and **Today context** stay separable. Weather/season may add notes. They must not rewrite static terrain into a wildlife score, and they must not imply timing is favorable when season is outside.

## Data sources (already in the project)

- Open-Meteo elevation (`v1/elevation`) — same provider as the existing map Inspect path. No paid vendor.
- Today’s Hunt snapshot (`sheds-today-hunt.js` / `sheds-weather.js`) for contextual notes only.
- Bundled USGS 3DEP/NLCD pack remains the landscape **habitat overlay** (V3 GIS). Search Areas does **not** feed season/weather into that habitat model.

## Search priority model

Three categories only: **Higher / Moderate / Lower**.

Never: percentages, “shed probability”, “AI confidence”, “deer are here”.

| Priority | Terrain heuristic (conservative) |
|---|---|
| Higher | Gentle or moderate slope **and** a terrain transition (bench / flatter cell beside steeper neighbor), optionally with useful sun-exposure context |
| Moderate | Walkable slope with some terrain differentiation, or isolated gentle ground without a clear transition |
| Lower | Steep ground (search-effort penalty), or little terrain differentiation on uniformly steep/flat-featureless cells |

Missing elevation, failed request, unsupported zoom, or incomplete neighborhood → **unavailable** states. **Never silently return Moderate.**

Honest copy:

- Terrain intelligence unavailable here
- Zoom in to inspect terrain
- Not enough terrain data

## Map UX

- Control label: **Search Areas** (HUD chip + Map & layers). Default **off** (map-first).
- Overlay: restrained GridLayer (reuse `HeatGrid`) with Higher / Moderate / Lower fills. Do not bury the Esri street basemap.
- Independent of the existing landscape habitat overlay.
- Preserve Measure, Inspect, Import JSON, overlay checkboxes, offline/export.

Zoom: overlay and Inspect terrain scoring require zoom ≥ 12. Coarser views show “Zoom in to inspect terrain” instead of a fake grid.

Performance: small grid (~12×12 + 1-cell halo), abortable fetch, pan debounce, do not share the habitat elevation abort controller.

## Inspect HUD

When the hunter inspects a point (existing Inspect control):

```
Search priority: Higher | Moderate | Lower | (unavailable copy)

Terrain
slope, aspect, elevation, derived feature

Why
• 1–3 reasons

Field note
practical searchability; terrain is a search guide, not evidence sheds are present
```

Existing V3.2 Inspect report stays in **More detail**.

## Today context (notes only)

If snow depth is limiting → prefer a note that easier/exposed ground may be more practical; do not claim clear ground when `snow_depth` is missing.

If freeze→thaw or warming → sun-exposed terrain may get a seasonal searchability note.

If season is outside → map intelligence still works; must not imply now is a good time to hunt.

## Out of scope

Release plumbing, DNS, GitHub App, `publish-shed-hunting-host.mjs`, tag `legacy-terrain-intelligence-2026-03-10`, V1.4, paid data vendors, DEM raster infrastructure.