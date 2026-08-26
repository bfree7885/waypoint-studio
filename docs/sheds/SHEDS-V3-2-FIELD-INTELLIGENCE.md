# Sheds V3.2 — Field Intelligence & Hunt Planning

**Status:** Inspect Facts slice (2026-08-26). Interpretation / suitability is **not** shown on Inspect.  
**Branch:** `chore/product-direction-reconciliation`  
**Audit:** [`reports/sheds-v3-2-field-intelligence/AUDIT.md`](../../reports/sheds-v3-2-field-intelligence/AUDIT.md)  
**Recovery:** [`reports/sheds-v3-2-field-intelligence/RECOVERY.md`](../../reports/sheds-v3-2-field-intelligence/RECOVERY.md)  
**Facts:** [`reports/sheds-v3-2-field-intelligence/FACTS.md`](../../reports/sheds-v3-2-field-intelligence/FACTS.md)

---

## Goal

When a hunter inspects a point, Sheds should answer:

1. What physical facts are known here (elevation, slope, aspect)?
2. What land-cover classification is known here?
3. What does Sheds **not** know — including wildlife presence?

Inspect is the doorway. It must not invent sheds, deer, trails, bedding, or find probability. It must not become SEARCH, YOU, or OBS.

**YOU ≠ SEARCH ≠ INSPECT ≠ OBS** remains unchanged from V3.1.

---

## Shipped in this slice (facts only)

1. **`sheds-inspect-intel.js`** — deterministic facts report builder (testable).
2. **Inspect HUD** — Terrain (elevation / slope / aspect) · Habitat (land cover + edge distance) · Limits.
3. **Honest states** — full data, partial data, no data, failed retrieval; zero ≠ unavailable.
4. **Mobile panel** — scrollable, dismissible (Done), map remains dominant.
5. Interpretation (“Why this may matter”), solar notes, and habitat suitability bands are **hidden / omitted** from Inspect.

## Data sources (existing only)

| Signal | Source | Class |
| --- | --- | --- |
| Coordinates | Map tap | FACT |
| Elevation | Open-Meteo elevation API | REAL |
| Slope + aspect | Finite-difference on a 5-point Open-Meteo neighborhood (~60 m) | DERIVED |
| Slope fallback | Bundled Pike/Milford GIS pack (USGS 3DEP-derived) | DERIVED |
| Land cover / edge | Bundled NLCD 2021 GIS pack (`pa-pike-milford-v1`) | REAL + derived edge |

No new raster backend, no LLM, no new external habitat provider. Inspect does **not** call `HabitatGis.scorePoint`.

## Limitation / truth safeguards

Always:

> These are physical and land-cover facts at this point. They do not indicate that deer or shed antlers are present.

Also: Inspect is not an observation of wildlife. Banned HUD language includes shed found, deer present, bedding/feeding area, deer trail, find probability, “Why this may matter,” and habitat-signal / suitability phrasing.

## Partial / none / failed

- **Partial:** show only supported facts (e.g. elevation without habitat); missing fields say `unavailable`.
- **No data:** “Detailed terrain/habitat information isn't available for this location.” Inspect still shows coordinates.
- **Failed fetch:** “Terrain and habitat details couldn't be retrieved for this location.” No invented numbers.
- **Zero values:** `0 ft` / `0° (nearly flat)` / `Land-cover edge: 0 m` are measurements. Aspect on slope &lt; 2° is **not defined**, not 0° north.

## Deferred (not this slice)

- Statewide GIS packs / aspect rasters in pack
- Search Areas / hunt planner / routes
- Weather or seasonal prediction in Inspect
- Suitability / “Why this may matter” interpretation (explicitly out of this facts pass)
- LLM narratives / DeviceOrientation compass

Habitat land-cover at Inspect works only inside the bundled Pike/Milford pack. Elsewhere the HUD says land cover is unavailable.

## Tests

`node automation/test-sheds-v3-2-inspect-intel.mjs` plus Phase 1 / Phase 2 / V3 mapping / field UX suites.
