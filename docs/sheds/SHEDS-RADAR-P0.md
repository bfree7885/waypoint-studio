# Sheds RADAR P0 — Architecture / data proof

**Status:** Prototype architecture/data proof (not production-ready)  
**Internal name:** Shed Radar (do **not** ship that phrase as product UI)  
**AOI:** `pa-pike-milford-v1` (Pike / Milford PA) only  
**Branch intent:** prove a continuous-looking relative search-interest surface without requiring a Search Area

Related: Phase 1 model `SHEDS-V2-0-PHASE1-SEARCH-PRIORITY-TODAY.md`, product roadmap `SHEDS-PRODUCT-ROADMAP.md`.

---

## What P0 proves

1. A viewport-scoped score field can compute **without** a Search Area / Search Location.
2. Base landscape uses real pack land-cover + slope (+ elevation-derived aspect when fetched).
3. Two controlled condition frames over the **same** geography change **where** intensity concentrates (not a uniform boost).
4. Display is continuous/bilinear — not primary square analysis cells.
5. Tap/click explainability lists only supported factors.
6. Outside the Pike pack, coverage is honest (no fabricated land-cover radar).

---

## Viewport / grid

| Parameter | Value |
| --- | --- |
| Target cell scale | ~90 m (`TARGET_CELL_M`) |
| Target analysis window | ~4.5 km (`TARGET_SPAN_M`), clamped to pack ∩ viewport |
| Max grid | 56×56 (≤ 3136 cells) |
| Min zoom | 11 |
| Clip | Intersection of map viewport and pack bounds, then span clamp, re-clipped to pack |

Module: `apps/shed-hunting/js/sheds-radar-p0.js` (`WaypointShedsRadarP0`).

---

## Input sources

| Input | Source | Notes |
| --- | --- | --- |
| Land cover / structure | Pike GIS pack (NLCD 2021) | Public domain USGS |
| Edge distance | Pack `edgeM` | Forest↔non-forest heuristic |
| Slope | Pack `slopeDeg` (3DEP-derived) | Also elevation-derived when enriching |
| Aspect / featureKind | Open-Meteo elevation → `SearchPriority.evaluateGrid` | Real DEM; never fabricated |
| Conditions | Controlled Frame A / Frame B | Prototype snapshots — not live forecast UI |

Observations / personal history are **excluded** from the radar base.

---

## Base score mapping

Reuses Phase 1 GIS → base score:

| GIS band | Base score |
| --- | --- |
| `stronger` | 2 |
| `some` | 1 |
| `limited` | 0 |

Display priority = `score / 3` (0–1 continuous for bilinear paint only).

Condition × spatial modifiers come **only** from `WaypointShedsSearchPriorityToday.evaluateCell` (no second model).

---

## Condition frames

### Frame A — Neutral / Cold

```
snowCoverStatus: limiting
freezeThawStatus: null
tempTrendStatus: cooling
seasonCategory: late_winter
```

No solar trigger. Snow practicality may shift steep vs bench/gentle cells.

### Frame B — Warming / Thaw

```
snowCoverStatus: light
freezeThawStatus: freeze_thaw
tempTrendStatus: warming
seasonCategory: late_winter
```

`solar_searchability` (+1) on southish aspect with slope ≥ 2°. Missing aspect → no solar modifier.

---

## Cache key

```
packId|west|south|east|north|rows|cols|90
```

(bounds fixed to 4 decimals)

Elevation cache key:

```
west|south|east|north|rows|cols|radar
```

**Frame switch** re-applies conditions on the cached base field and **must not** refetch elevation.

---

## Render interpolation

- `renderMode: "radar-interest"`
- `sheds-heat-layer.js` paints via `_paintContinuousPriority` (bilinear sample of cell `priority`)
- Interpolation is **visual only** — analytical resolution remains ~90 m
- Copy: “Smoothed display; analysis resolution approximately ~90 m”
- No sub-cell precision claims

---

## Unsupported coverage

Outside Pike pack AOI:

- No fabricated land-cover-rich radar
- Empty/limited grid + honest message

---

## Search Areas

Remain available as optional planning/inspection tools. Radar P0 is the primary heat when enabled; Search Areas overlay is independent. Toggle Radar P0 Off to restore the prior Search-Location-gated Phase 1 interest path.

---

## Known prototype limits

- Single AOI pack only
- No PLAY / timeline UI
- No SNODAS / PAD-US
- No personal-history weighting
- Aspect depends on Open-Meteo elevation availability
- Not production-ready; do not deploy as a launch

---

## Tests

`automation/test-sheds-radar-p0.mjs`

Evidence capture (enrichment-ready Frame A/B):

`automation/capture-sheds-radar-p0-evidence.mjs`

Evidence images + `proof-report.json`: `docs/sheds/samples/radar-p0/`

Acceptance: do not claim Frame A/B visual proof until `elevKey` is non-empty,
aspect-bearing cells exist, analytical changed/unchanged cells are both > 0,
and map-region screenshot pixels differ (not merely frame-button chrome).
