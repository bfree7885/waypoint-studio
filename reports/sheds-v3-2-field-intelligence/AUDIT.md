# Sheds V3.2 — Field Intelligence Audit

**Date:** 2026-08-25  
**Branch:** `chore/product-direction-reconciliation`  
**Tip at audit:** `f26e841d`  
**Scope:** Read-only inventory before V3.2 implementation. Does not reopen Studio product strategy.

Companions: [`SHEDS-V3-MAPPING-FOUNDATION.md`](../../docs/sheds/SHEDS-V3-MAPPING-FOUNDATION.md), [`SHEDS-2-PHASE-1-PREDICTION-TRUTH.md`](../../docs/sheds/SHEDS-2-PHASE-1-PREDICTION-TRUTH.md), [`SHEDS-2-PHASE-2-HABITAT-GIS.md`](../../docs/sheds/SHEDS-2-PHASE-2-HABITAT-GIS.md), [`SHEDS-2-PHASE-3-FIELD-WORKFLOW.md`](../../docs/sheds/SHEDS-2-PHASE-3-FIELD-WORKFLOW.md), [`reports/sheds-v3-mapping-acceptance/FINAL-REPORT.md`](../sheds-v3-mapping-acceptance/FINAL-REPORT.md).

---

## 1. Map (current)

| Capability | Status | Notes |
| --- | --- | --- |
| Street basemap | Shipped | CARTO Voyager (default) |
| Topographic | Shipped | Esri World Topo |
| Satellite | Shipped (V3.1) | Esri World Imagery — landscape context, not habitat proof |
| Hybrid | Shipped (V3.1) | Imagery + Esri Boundaries & Places labels |
| Terrain/topo as analysis layer | Partial | Topo is basemap only; slope/elev for scoring come from GIS pack / Open-Meteo |
| Zoom | Shipped | Field rail zoom in/out; Leaflet zoom control hidden on mobile |
| Locate / YOU | Shipped | Browser geolocation; generation-guarded; accuracy gates for Analyze at YOU |
| Measure | Shipped (V3.1) | Polyline + distance + approx enclosed area; isolates from SEARCH |
| Inspect | Shipped (V3.1) | Lat/lng, Open-Meteo elev, distance/bearing from YOU & SEARCH; **no habitat/terrain intelligence yet** |
| Layers / heat | Shipped | Habitat GIS bands inside SEARCH; observed heat modes; SGL overlay = access context only |
| Observations markers | Shipped | Private localStorage OBS markers; distinct chrome |
| Waypoints (named pins) | Limited | SEARCH center + saved Search Areas; not a freeform waypoint editor |

**Key files**

- `apps/shed-hunting/js/sheds-map-app.js` — orchestration, Inspect/Measure, SEARCH, sessions
- `apps/shed-hunting/js/sheds-map-field-tools.js` — distance/bearing/area math
- `apps/shed-hunting/js/sheds-tile-provider.js` — basemap catalog + reliability
- `apps/shed-hunting/css/sheds-map.css` — field chrome, Inspect/Measure HUDs
- `apps/shed-hunting/map/index.html` — shell + sheets

**Inspect today (`renderInspectHud` ~3394–3447):** coordinates, elevation loading/ready/unavailable, From YOU, From SEARCH, honesty line “Context only — not habitat proof.” Does **not** sample NLCD/edge/slope or explain suitability.

---

## 2. Intelligence (current)

### Channels (Phase 1 — preserved)

| Channel | Module | Answers |
| --- | --- | --- |
| Timing | `sheds-timing.js` | Coarse season phase (not day-precise cast claims) |
| Habitat / where to walk | `sheds-habitat.js` + GIS | Notes + optional weak elev; GIS when pack covers SEARCH |
| Searchability | `sheds-searchability.js` + Today’s Search | Is today a good day to search? |
| Evidence support | `sheds-confidence.js` | Low/Moderate/High **coverage**, not find % |

### Habitat GIS (Phase 2)

- Pack: `apps/shed-hunting/gis/packs/pa-pike-milford-v1.json` (Pike / Milford PA AOI)
- Inputs: NLCD 2021 structure, derived forest/open edge (m), USGS 3DEP-derived slope (°)
- Scoring: `sheds-habitat-gis.js` — structure 0.45 + terrain 0.25 + optional capped observations 0.3
- Bands: Limited / Some / Stronger habitat signal — **never** “shed found”
- Grid runs **only inside SEARCH AREA** radius when SEARCH is set

### Terrain / aspect

| Signal | Available? | How |
| --- | --- | --- |
| Elevation at point | Yes | Open-Meteo elevation API (Inspect + grid samples) |
| Slope in pack | Yes | Precomputed `slopeDeg` raster |
| Aspect in pack | **No** | Pack does not store aspect or elev rasters |
| Aspect (weak) | Partial | Finite-diff in `sheds-likelihood-model.js` / biological model when elev grid exists |
| Morphology ridges/valleys | Weak heuristic | 3×3 elev proxies when grid present — labeled weak |

### Weather / season

- Open-Meteo forecast → Searchability primarily
- Snow **depth** unavailable (never invented)
- Seasonal Timing = photoperiod + latitude heuristic (editorial categories)
- Biological model documents aspect/regional disagreement; must not claim bedding sites

### Prediction-truth safeguards (locked)

- No find probability / “antler here”
- Season & weather excluded from habitat spatial heat
- YOU ≠ SEARCH ≠ TARGET/INSPECT ≠ OBS
- Generation tokens for locate / weather / elev / recompute
- Empty habitat > fake heat
- Observed influence default **OFF** in MODEL

---

## 3. Field UX (current)

| Surface | State |
| --- | --- |
| Mobile field chrome | Accepted (PR #52 + V3.1): dock Search \| Note \| Plan \| More; session strip; Field Briefing peek |
| Map-first | Yes — panels are sheets/HUDs over map |
| Desktop | Same shell; Leaflet layers control visible; more room for briefing/tools |
| Planning vs Field modes | **No explicit modes** — responsive UX + Tools → Field Plan |
| Field Plan | `sheds-field-plan.js` — Timing, Habitat MODEL, Searchability, Evidence, areas to inspect |
| Hunt session | Start/End Search; tracking path; summary without “area empty of sheds” claims |

**Marker distinction (must preserve)**

| Kind | Role |
| --- | --- |
| YOU | Device location |
| SEARCH | Analysis center / Search Area center |
| INSPECT / TARGET | Inspected or planner suggestion — not an antler pin |
| OBS | User-created field evidence |

---

## 4. Existing data — classification

| Source | Class |
| --- | --- |
| Browser geolocation | **REAL DATA** |
| Open-Meteo weather (temp, precip, wind, snowfall_sum, sunrise/sunset) | **REAL DATA** |
| Open-Meteo elevation point samples | **REAL DATA** |
| CARTO / Esri basemap tiles | **REAL DATA** (imagery ≠ biology) |
| USGS NLCD 2021 (in pack) | **REAL DATA** |
| USGS 3DEP elev → pack slope | **DERIVED DATA** |
| Forest/open edge distance | **DERIVED DATA** + **DETERMINISTIC INFERENCE** (neighborhood rule) |
| Habitat structure/terrain scores & bands | **EDITORIAL/HEURISTIC** (Waypoint weights) |
| Season Timing categories | **EDITORIAL/HEURISTIC** |
| Searchability window deltas | **EDITORIAL/HEURISTIC** |
| Evidence-support Low/Mod/High | **EDITORIAL/HEURISTIC** (input coverage) |
| Biological aspect_sun preference | **EDITORIAL/HEURISTIC** (regional disagreement documented) |
| Private observations / Search Areas / sessions | **REAL DATA** (user-authored, local) |
| PASDA SGL polygons | **REAL DATA** — **map/access context only**, not habitat weight |
| Demo/placeholder wildlife density | **None in Habitat GIS path** (must not invent) |

---

## 5. Observations (current)

Types already exist in `sheds-observation-store.js` (shed found, deer seen/sign, trail, bedding/feeding evidence, crossings, pressure, search completed, access, habitat note, other). **Do not auto-create wildlife OBS from model.** Expand types only if needed — V3.2 should preserve compatibility, not grow the form.

---

## 6. Search Area & planning maturity

| Piece | Maturity |
| --- | --- |
| Tap → SEARCH + radius Small/Med/Large | Shipped |
| Save / reopen Search Areas | Shipped (Phase 3 store) |
| Field Plan sheet | Shipped but easy to miss (Tools) |
| Polygon Search Area editor | **Not present** — defer unless required |
| Inspect ↔ habitat explanation | **Gap** — primary V3.2 opportunity |
| Outside Pike pack | Habitat unavailable (honest) — coverage expansion deferred |

---

## 7. Gaps that block “read this landscape”

1. **Inspect is coordinates + elev only** — does not surface NLCD, edge, slope, or “why this may matter.”
2. **Aspect not available at Inspect** without a new elev-neighborhood derivation.
3. **Explainability lives on heat/explain panel for SEARCH grid cells**, not at arbitrary Inspect taps.
4. **GIS coverage is one AOI** — outside pack, Inspect still useful for elev/relations but not habitat.
5. **Planning storytelling** still weaker than architecture trust (Phase 4 direction audit) — V3.2 should deepen Inspect, not rebuild chrome.

---

## 8. Recommended V3.2 feature set (smallest coherent)

Prefer **three strong capabilities** over six thin ones:

1. **Inspect Field Intelligence** — sample GIS when covered; explain structure/edge/slope; honest empty outside pack.
2. **Terrain aspect at Inspect** — derive slope/aspect from Open-Meteo neighborhood elevations (physical geography language only).
3. **Explainable suitability + confidence labels** — reuse `HabitatGis.scorePoint`; show Why / Limits / coverage language; never “shed found.”

**Defer**

- Statewide GIS packs / pack catalog UI  
- Explicit Planning vs Field product modes  
- Polygon Search Area editor  
- DeviceOrientation compass  
- Full offline tile packs  
- Observation type expansion  
- Weather duplication of Dashboard  
- LLM site narratives  

---

## 9. Risk notes

- Keep Inspect HUD scrollable and dismissible so the map stays dominant on 375–430px.
- Generation-guard elev + aspect fetches like V3.1 Inspect elev.
- Do not pass season/weather into habitat score at Inspect.
- Preserve YOU ≠ SEARCH ≠ INSPECT ≠ OBS chrome and short-circuits.

---

## 10. Tests to preserve / extend

Preserve: `test-sheds-phase1-prediction-truth`, `test-sheds-phase2-habitat-gis`, `test-sheds-v3-mapping-foundation`, `test-sheds-tile-provider`, `test-sheds-field-ux`, phase3/4 suites as applicable.

Add: `automation/test-sheds-v3-2-inspect-intel.mjs` for report builder truth labels, weak-data, strong-data, and banned “shed found” language.
