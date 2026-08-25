# Sheds V3.2 — Field Intelligence & Hunt Planning

**Status:** Inspect Intelligence slice implemented (recovery 2026-08-25)  
**Branch:** `chore/product-direction-reconciliation`  
**Audit:** [`reports/sheds-v3-2-field-intelligence/AUDIT.md`](../../reports/sheds-v3-2-field-intelligence/AUDIT.md)  
**Recovery:** [`reports/sheds-v3-2-field-intelligence/RECOVERY.md`](../../reports/sheds-v3-2-field-intelligence/RECOVERY.md)

---

## Goal

When a hunter inspects a point, Sheds should answer:

1. What is this spot physically like?
2. What habitat information do we actually have?
3. Why might those characteristics matter when deciding whether to search here?
4. What does Sheds **not** know?

Inspect is the doorway. It must not invent sheds, deer, trails, bedding, or find probability.

**YOU ≠ SEARCH ≠ INSPECT ≠ OBS** remains unchanged from V3.1.

---

## Shipped in this slice

1. **`sheds-inspect-intel.js`** — deterministic report builder (testable).
2. **Inspect HUD** — Terrain / Habitat / Why this may matter / Limits.
3. **Honest states** — full data, partial data, no data, failed retrieval.
4. **Mobile panel** — scrollable, dismissible (Done), map remains dominant.

## Data sources (existing only)

| Signal | Source | Class |
| --- | --- | --- |
| Coordinates | Map tap | FACT |
| Elevation | Open-Meteo elevation API | REAL |
| Slope + aspect | Finite-difference on a 5-point Open-Meteo neighborhood (~60 m) | DERIVED |
| Slope fallback | Bundled Pike/Milford GIS pack (USGS 3DEP-derived) | DERIVED |
| Land cover / edge | Bundled NLCD 2021 GIS pack (`pa-pike-milford-v1`) | FACT + heuristic edge |
| Habitat score | Existing `HabitatGis.scorePoint` (MODEL, observations off) | EDITORIAL_HEURISTIC — not shown as wildlife presence |

No new raster backend, no LLM, no new external habitat provider.

## Deterministic interpretation rules

FACT (Terrain / Habitat) is never mixed into INTERPRETATION except as input.

| Input | Interpretation (Why this may matter) |
| --- | --- |
| Slope 2–12° | Moderate slope is generally walkable. |
| Slope ≥ 12° | Steeper terrain may slow walking. |
| South-facing (NH, slope ≥ 2°) | Relatively strong afternoon solar exposure. |
| North-facing (NH, slope ≥ 2°) | Less direct winter sun; may hold snow longer. |
| East/west aspect | Solar differences are modest here. |
| Land-cover edge ≤ 90 m | Nearby habitat transition may make the area worth inspecting. |
| Slope < 2° | Aspect/solar claims are suppressed. |

If an input is missing, it is omitted. No interpretation is invented from empty inputs.

## Limitation / truth safeguards

Always:

> This describes terrain and habitat suitability. It does not indicate that deer or shed antlers are present.

Also: modeled suitability ≠ wildlife observation. Banned HUD language includes shed found, deer present, bedding/feeding area, deer trail, find probability.

## Partial / none / failed

- **Partial:** show only supported facts (e.g. elevation without habitat).
- **No data:** “Detailed terrain/habitat information isn't available for this location.” Inspect still shows coordinates.
- **Failed fetch:** “Terrain and habitat details couldn't be retrieved for this location.” No invented numbers.

## Deferred (not this slice)

- Statewide GIS packs / aspect rasters in pack
- Search Areas / hunt planner / routes
- Weather or seasonal prediction in Inspect
- New suitability model / LLM narratives
- DeviceOrientation compass

Habitat land-cover at Inspect works only inside the bundled Pike/Milford pack. Elsewhere the HUD says habitat is unavailable.

## Tests

`node automation/test-sheds-v3-2-inspect-intel.mjs` plus Phase 1 / Phase 2 / V3 mapping / field UX suites.
