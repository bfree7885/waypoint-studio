# Sheds V3.2 — Field Intelligence & Hunt Planning

**Status:** Inspect Facts + Why this may matter (2026-08-26). No suitability score, no wildlife prediction.  
**Branch:** `chore/product-direction-reconciliation`  
**Audit:** [`reports/sheds-v3-2-field-intelligence/AUDIT.md`](../../reports/sheds-v3-2-field-intelligence/AUDIT.md)  
**Recovery:** [`reports/sheds-v3-2-field-intelligence/RECOVERY.md`](../../reports/sheds-v3-2-field-intelligence/RECOVERY.md)  
**Facts:** [`reports/sheds-v3-2-field-intelligence/FACTS.md`](../../reports/sheds-v3-2-field-intelligence/FACTS.md)  
**Explainability:** [`reports/sheds-v3-2-field-intelligence/EXPLAIN.md`](../../reports/sheds-v3-2-field-intelligence/EXPLAIN.md)  
**Field UX:** [`reports/sheds-v3-2-field-intelligence/FIELD-UX.md`](../../reports/sheds-v3-2-field-intelligence/FIELD-UX.md)

---

## Goal

When a hunter inspects a point, Sheds should answer:

1. **What is here?** Physical facts (elevation, slope, aspect, land cover).
2. **Why this may matter?** Deterministic interpretation of those supported facts only.
3. **Limits:** What Sheds does **not** know — including wildlife presence.

Inspect must not invent sheds, deer, trails, bedding, or find probability. It must not become SEARCH, YOU, or OBS.

**YOU ≠ SEARCH ≠ INSPECT ≠ OBS** remains unchanged from V3.1.

---

## Shipped

1. Facts HUD (elevation / slope / aspect / land cover + edge) with honest partial / none / failed states.
2. Deterministic **Why this may matter** from supported facts (`buildWhyLines`).
3. Limits: terrain/land-cover context can help you decide where to look more closely; not deer/shed presence; Inspect ≠ OBS.
4. Mobile scrollable Inspect + Done. No `HabitatGis.scorePoint` on Inspect.

## Data sources (existing only)

| Signal | Source | Class |
| --- | --- | --- |
| Coordinates | Map tap | FACT |
| Elevation | Open-Meteo elevation API | REAL |
| Slope + aspect | Finite-difference on a 5-point Open-Meteo neighborhood (~60 m) | DERIVED |
| Slope fallback | Bundled Pike/Milford GIS pack (USGS 3DEP-derived) | DERIVED |
| Land cover / edge | Bundled NLCD 2021 GIS pack (`pa-pike-milford-v1`) | REAL + derived edge |

No new raster backend, no LLM, no new external habitat provider.

## Deterministic Why rules

Documented in [`EXPLAIN.md`](../../reports/sheds-v3-2-field-intelligence/EXPLAIN.md). Summary:

- Slope → walking difficulty (physical).
- Aspect (slope ≥ 2°) → relative solar exposure (physical, Northern Hemisphere).
- Land-cover `edgeM` ≤ 90 m → nearby cover change may be worth inspecting (editorial inspection heuristic, not wildlife).
- Elevation Why only when it is the sole supported fact (geographic context).
- Missing / failed inputs produce **no** matching Why line.

## Limitation / truth safeguards

Always:

> Terrain and land-cover context can help you decide where to look more closely. They do not indicate that deer or shed antlers are present.

Also: Inspect is not an observation of wildlife. Banned HUD language includes shed found, deer present, bedding/feeding area, deer trail, find probability, habitat-signal / search-potential phrasing.

## Partial / none / failed

Unchanged from Facts: show supported facts; `unavailable` ≠ `0`; failed copy is distinct; no-data/failed omit Why.

## Deferred (not this slice)

- Statewide GIS packs / aspect rasters in pack
- Search Areas / hunt planner / routes / weather in Inspect
- Habitat suitability scoring on Inspect
- LLM narratives / DeviceOrientation compass

## Tests

`node automation/test-sheds-v3-2-inspect-intel.mjs` plus Phase 1 / Phase 2 / V3 mapping / field UX suites.
