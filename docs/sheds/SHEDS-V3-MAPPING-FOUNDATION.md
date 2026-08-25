# Sheds V3.1 — Mapping Foundation

**Date:** 2026-08-24  
**Base:** `main` (post PR #52 mobile field chrome — **accepted, not redesigned**)  
**Slice:** Field map foundation — basemaps, measure, inspect, resilience  
**Companions:** [`SHEDS-V3-OFFLINE-MAP-ARCHITECTURE.md`](./SHEDS-V3-OFFLINE-MAP-ARCHITECTURE.md), [`SHEDS-V3-ACCESS-DATA-ARCHITECTURE.md`](./SHEDS-V3-ACCESS-DATA-ARCHITECTURE.md)

---

## 1. Goal

Make the Sheds map substantially more useful for shed hunting without:

- redesigning the accepted mobile dock / session strip / Field Briefing
- expanding the biological model
- inventing find probabilities or deer-presence claims

Satellite imagery is **landscape context**, not habitat proof.

---

## 2. Basemaps — before / after

| Before | After |
| --- | --- |
| Street (CARTO Voyager) | Street (CARTO Voyager) — default |
| Topographic (Esri World Topo) | Topographic (Esri World Topo) |
| — | **Satellite (Esri World Imagery)** |
| — | **Hybrid (World Imagery + Esri Boundaries & Places reference)** |

Selection UI:

- Desktop: Leaflet layers control (unchanged pattern, expanded catalog)
- Mobile: **More → Map & layers → Basemap** select (Leaflet control remains hidden on field chrome)

Persistence: `localStorage` key `waypoint-sheds-basemap-v1` `{ id, savedAt }`. Invalid/missing → Street.

---

## 3. Satellite provider — selection & licensing

### Selected: Esri World Imagery

**Why**

1. Same ArcGIS Online tile host family already used for World Topo in production Sheds.  
2. Authoritative, high-quality aerial/satellite mosaic useful for fields, edges, clearings, roads.  
3. Attribution string documented by Esri; Leaflet attribution control already shown.  
4. No scraping — standard XYZ/ArcGIS tile URL templates.  
5. Configurable override via existing `WAYPOINT_MAP_TILE_CONFIG` / meta inject if a keyed provider is required later.

**URLs**

- Imagery: `…/World_Imagery/MapServer/tile/{z}/{y}/{x}`  
- Hybrid labels: `…/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`

**Attribution (on-map)**

- Satellite: Esri / Maxar / Earthstar Geographics / GIS User Community (wording per service credits)  
- Hybrid adds Esri reference credits  

**Constraints documented**

- Do **not** systematically harvest tiles for redistribution or offline packs via this endpoint (Esri ToS). Offline needs a separate licensed path — see Offline architecture.  
- Imagery age/resolution varies by place; never claim biological certainty from pixels.  
- Tile failures surface via existing `#map-tile-status` reliability hooks.

---

## 4. Hybrid

**Shipped:** Imagery + Esri reference label overlay as a single selectable basemap (`L.layerGroup`).

This is the standard Imagery Hybrid pattern — not a brittle cross-provider mashup.

---

## 5. Measure

| Capability | Status |
| --- | --- |
| Enter Measure from Map & layers | Done |
| Multi-point polyline + cumulative distance | Done |
| Units: ft / yd / mi | Done (`sheds-map-field-tools.js`) |
| Undo / Clear / Done | Done |
| Approx. area if ≥3 points (spherical) | Done (label: “if closed”) |
| Isolates from SEARCH taps | Done (`measureActive` short-circuits click) |
| Active HUD | Done (`#measure-hud`) |

Does not block pan/zoom; tracking continues independently.

---

## 6. Inspect point

| Capability | Status |
| --- | --- |
| Arm “Inspect next tap” from Map & layers | Done |
| Lat/lng | Done |
| Elevation via Open-Meteo (network, labeled) | Done — generation-guarded; never reuses stale elev for a new point |
| Distance + bearing from YOU | Done when located |
| Distance + bearing from SEARCH | Done when SEARCH set |
| Honesty line | “Context only — not habitat proof.” |

Not a permanent popup on every map tap.

---

## 7. Compass decision

| Source | Behavior |
| --- | --- |
| GPS `coords.heading` | Kept — course-over-ground when moving; suppressed when approximate |
| DeviceOrientation / magnetic compass | **Deferred** |

**Reasoning:** iOS Safari requires explicit permission and user gesture for absolute orientation; stationary GPS heading is unreliable; fake compass needles destroy trust. Preserve GPS course + inspect bearings; document DeviceOrientation for a later honest slice.

---

## 8. Resilience

- Reliability (`attachReliability`) applied to street, topo, satellite, and hybrid children.  
- OSMF public tiles still refused.  
- Offline banner unchanged — no fake “satellite available offline.”  
- Basemap switch clears tile-status until new layer reports.

---

## 9. Mobile architecture preservation

Kept: dock, session strip, Field Briefing, YOU/SEARCH/INSPECT/OBS, More → Map & layers, active-search hierarchy.

New tools live under Map & layers + temporary HUDs only while active.

---

## 10. Tests & QA

- `automation/test-sheds-tile-provider.mjs` — expanded  
- `automation/test-sheds-v3-mapping-foundation.mjs` — field tools + interaction isolation  
- Visual package: `reports/sheds-v3-mapping-foundation/`

---

## 11. Remaining limitations

1. Esri imagery licensing remains subject to Esri MLA / usage norms — monitor production; keyed inject path retained.  
2. No offline tile packs in this slice.  
3. No device compass.  
4. Measure area is approximate (spherical), not survey-grade.  
5. Elevation is a network sample for the inspected point only.  
6. Desktop `prompt×here` stacking still deferred.
