# Sheds V3.2 — Inspect Facts

**Slice:** FACTS ONLY (follow-up to Inspect Intelligence recovery)  
**Date:** 2026-08-26  
**Branch:** `chore/product-direction-reconciliation`  
**HUD:** Terrain + Habitat/land-cover facts + Limits. No “Why this may matter.” No suitability bands.

Inspect remains a location readout. It is not SEARCH, not YOU, and not an observation.

---

## Facts supported (existing architecture)

| Fact | When shown | Source | Class |
| --- | --- | --- | --- |
| Coordinates | Always at an Inspect point | Map tap | FACT |
| Distance/bearing from YOU / SEARCH | When those points exist | Field tools math | DERIVED |
| Elevation (ft) | Network sample succeeds | Open-Meteo elevation API | REAL |
| Slope (degrees + class) | Neighborhood elev or GIS pack slope | Open-Meteo 5-point neighborhood (~60 m) or bundled Pike/Milford 3DEP-derived slope | DERIVED |
| Aspect (cardinal facing) | Neighborhood elev succeeds **and** slope ≥ 2° | Finite-difference on the same neighborhood | DERIVED |
| Land-cover class | Point inside bundled GIS pack | NLCD 2021 in `pa-pike-milford-v1` | REAL |
| Land-cover edge distance (m) | Pack sample includes `edgeM` (including **0 m**) | Pack forest/open edge raster | DERIVED |

Zero / flat values are shown as values (`Elevation: 0 ft`, `Slope: 0° (nearly flat)`, `Land-cover edge: 0 m`). They are not labeled unavailable.

On nearly flat ground, aspect is **not defined** (not “north” and not “unavailable”).

---

## Facts deferred (not this slice)

- Aspect raster inside the GIS pack (pack has slope only)
- Land-cover / habitat classification **outside** the Pike/Milford pack
- Snow depth, weather-at-point, soils, hydrology, canopy height
- Walkability / solar-exposure **interpretation** (helpers may exist; HUD does not show them)
- Habitat suitability bands (`HabitatGis.scorePoint`) on Inspect
- Wildlife presence, bedding, feeding, trails, movement, shed likelihood

---

## Partial / no-data / failed

- **Partial:** show ready facts; label missing ones `unavailable` (not 0).
- **No data (unavailable):** “Detailed terrain/habitat information isn't available for this location.” Coordinates still show.
- **Failed fetch:** “Terrain and habitat details couldn't be retrieved for this location.” Distinct copy from unavailable. No invented numbers.

Limits always include: these facts do not indicate deer or shed antlers are present; Inspect is not an observation of wildlife.

---

## What Inspect does not do

YOU ≠ SEARCH ≠ INSPECT ≠ OBS.

The HUD does not show “Why this may matter,” solar notes, walkability, or habitat-signal bands.
