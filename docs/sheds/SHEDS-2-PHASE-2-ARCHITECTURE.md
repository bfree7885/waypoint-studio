# Sheds 2.0 — Phase 2 Habitat / GIS Architecture

**Status:** Design only — **do not implement yet**  
**Date:** 2026-08-24  
**Baseline:** Phase 1 `b38af8be`  
**Recon:** [`SHEDS-2-PHASE-2-GIS-RECON.md`](./SHEDS-2-PHASE-2-GIS-RECON.md)

---

## 1. Locked product rules (from Phase 1)

1. Channels stay separate: **Timing · Habitat · Searchability · Evidence support**.  
2. **YOU ≠ SEARCH LOCATION.** Fine GIS uses SEARCH LOCATION / SEARCH AREA only.  
3. No find-probability language; no cast-date certainty; no deer-presence theater.  
4. Empty habitat > decorative heat.  
5. Private observations stay local-first.

---

## 2. What Phase 2 answers

> Which portions of **this selected search area** contain landscape characteristics that may make them more worthwhile to **inspect**?

Not: “Where are sheds?”

---

## 3. SEARCH LOCATION UX (simplest useful)

### Markers (must stay visually distinct)

| Kind | Visual | Role |
| --- | --- | --- |
| **YOU** | Existing Phase 1 YOU + accuracy ring | Device estimate |
| **SEARCH LOCATION** | Distinct pin / crosshair (new) | Analysis center |
| **SEARCH AREA** | Circle (MVP) or later polygon | Analysis bounds |
| **SUGGESTED WALK** | Existing TARGET | Planner tip inside area |
| **OBSERVATION** | Existing letter pins | Private notes |

### MVP interaction (recommended)

1. User taps map → sets **SEARCH LOCATION** (requires confirmation if YOU accuracy > threshold, e.g. 200–500 m).  
2. Default **SEARCH AREA** = radius around search location (e.g. 400–800 m, user-adjustable).  
3. Optional: “Use YOU” only if accuracy ≤ threshold — otherwise prompt to tap map.  
4. Optional later: saved areas, geocoder, drawn polygon — **not MVP**.

### Accuracy gate

| YOU accuracy | Behavior |
| --- | --- |
| Precise enough (product threshold) | Offer “Analyze here (YOU)” |
| Coarse (e.g. multi-km) | Block auto-GIS on YOU; require explicit SEARCH LOCATION |
| Permission denied | Map-tap SEARCH LOCATION only |

Owner live ±4.75 km case: **must not** drive fine habitat GIS from YOU center.

---

## 4. Habitat model design

### 4.1 Separate components (do not collapse early)

| Component | Inputs | Output meaning |
| --- | --- | --- |
| **Habitat structure** | NLCD class + derived edge distance | Landscape type / edge context |
| **Terrain** | 3DEP elev + slope (aspect soft/optional) | Walkable vs steep; benches soft |
| **Observed evidence** | Private notes (decay, capped finds) | User-specific interest |
| **Access context** | OSM roads/trails; PA public-land flags | **Searchability / map context** — not habitat score |

### 4.2 Presentation (avoid fake precision)

Prefer categorical bands over percentages:

- **Limited habitat signal**  
- **Some habitat signal**  
- **Stronger habitat signal**  
- **No GIS pack / outside area** (honest empty)

Optional internal 0–1 for ranking cells — **never** shown as “% chance.”

### 4.3 Combining signals (if ranked)

Suggested Phase 2 rule-based blend (document as Waypoint heuristic):

```
structureScore ∈ [0,1]   // NLCD remap + edge proximity soft boost
terrainScore   ∈ [0,1]   // prefer moderate slopes; penalize extreme slope
observedScore  ∈ [0,1]   // kernels; shed_found capped (keep Phase 1 cap)

habitatSignal = clamp(
  0.45 * structureScore +
  0.25 * terrainScore +
  0.30 * observedScore
)
```

| Weight | Source | Limits |
| --- | --- | --- |
| 0.45 / 0.25 / 0.30 | Product heuristic | Not calibrated encounter rates |
| Edge boost | Soft add inside structure | Cap contribution |
| Aspect | Optional ≤ soft bias | Disclose disagreement |
| Access / roads | **Excluded** from habitatSignal | Separate searchability layer |
| Season / weather | **Excluded** | Timing / searchability only |

**Uncertainty:** Evidence support rises with pack present + observations; falls if only coarse structure and no notes.

### 4.4 Land-cover remap (illustrative)

| NLCD family | Structure hint (honest copy) |
| --- | --- |
| Forest / woody wetland | Cover / thermal cover context |
| Shrub / herbaceous / hay-pasture | Open / edge-adjacent structure |
| Cultivated crops | Ag adjacency — seasonal access rules apply |
| Developed | Usually lower walk interest; safety/trespass |
| Open water | Not a search surface |
| Emergent wetland | Soft edge context — footing caution |

Never: “Forest = sheds.”

---

## 5. Role of private observations

| Behavior | Phase 2 design |
| --- | --- |
| Own layer | **Yes** — always visible as Observed Evidence |
| Influence habitatSignal | **Yes** — capped kernels (retain Phase 1 find cap) |
| Separate channel UI | Keep “Observed evidence” explanation under Habitat / Evidence support |
| Decay | Keep Phase 1 recency half-lives |
| Find vs sign | Keep type weights; finds do not dominate map |
| Privacy | localStorage / on-device; GIS packs do not upload notes |

One historical shed pin ≠ persistent biological hotspot.

---

## 6. Processing architecture

### Recommendation: **Hybrid — preprocessed PA packs + browser composition**

| Layer | Where |
| --- | --- |
| NLCD class + edge distance grids | Preprocess offline → county/AOI packs (e.g. PNG/quantized grids or compact GeoJSON class polygons) |
| 3DEP slope / elev summary | Same pack |
| PGC SGL polygons | Vector in pack or live REST with offline cache |
| OSM access distance | Optional pack band |
| Habitat blend + explain | Browser on SEARCH AREA only |
| Weather searchability | Keep Open-Meteo (Phase 1) |

### Why not full browser CONUS

Raster size, memory, mobile perf, static hosting limits.

### Why not large backend yet

Waypoint remains largely static/local-first. Packs can ship as static assets or optional download. Live agency REST for SGL is acceptable with cache.

### Update cadence

- NLCD pack: yearly / when Annual NLCD adopted  
- 3DEP: infrequent refresh  
- SGL: pull on session or pack version bump  

---

## 7. Offline / local-first / privacy

| Concern | Plan |
| --- | --- |
| Offline | PA packs + local notes work without network; weather degrades honestly |
| Privacy | SEARCH LOCATION sent only to tile/weather/elev providers as today; **do not** log precise GPS to analytics; packs are generic |
| Storage | County pack budget target: prefer **&lt; 25–50 MB** compressed per county where practical; document actual sizes at build time |
| Performance | Analyze only SEARCH AREA grid (e.g. ≤ ~1–2 km radius); not full map viewport CONUS |

---

## 8. Validation plan (before claiming success)

Test **landscape structure detection**, not shed prediction.

| Environment | Expect GIS to show |
| --- | --- |
| Pike / Pocono forest | Dominant forest classes; limited ag; edge at openings/roads |
| Central PA mixed forest–ag | Clear forest/crop mosaic; high edge density zones |
| Agricultural PA | Cropland/pasture dominant; forest strips as structure contrast |
| Steep mountain | High slope bands; walkability penalties |
| Suburban edge | Developed classes; access ≠ habitat |

For each AOI record: structure map screenshot, band labels, explanation strings, whether empty states appear when pack missing.

Independent shed-find validation is **out of scope** unless labeled private observation overlays are used explicitly as user evidence — not as ground-truth model calibration.

---

## 9. Exact Phase 2 MVP

### WHAT WE BUILD

1. Explicit **SEARCH LOCATION / SEARCH AREA** UX + accuracy gate.  
2. **PA-first** habitat packs: NLCD structure + derived edge + 3DEP slope/elev.  
3. Habitat categorical signal map **inside search area only**.  
4. Keep Observed Evidence kernels (capped).  
5. PA State Game Lands overlay (context; verify-regs copy).  
6. OSM/access distance as **searchability / planning** overlay (optional thin).  
7. Explanations: “why this cell” cites NLCD class / edge / slope / notes.  
8. Evidence support reflects pack + notes — still not find %.

### WHAT WE DO NOT BUILD

- Find probability / cast-date prediction  
- Deer density heat from harvest stats  
- Sentinel/NDVI pipelines  
- Snow-as-habitat or snow-as-cast GIS  
- Aspect-strong scoring  
- National live CONUS rasters in browser  
- Geocoder (unless tiny later add)  
- Drawn polygons / multi-area manager (later)  
- Subscriptions / multi-species  
- Backend ML  

### DATA USED

- USGS NLCD (30 m)  
- Derived forest/open edge  
- USGS 3DEP (~10–30 m)  
- PGC SGL (+ WMU text context only)  
- Optional OSM roads/trails for access  
- Private observations (device)  
- Open-Meteo weather remains searchability  

### WHAT THE MAP WILL SHOW

- YOU vs SEARCH LOCATION vs AREA vs TARGET vs notes — distinct  
- Habitat signal wash **only inside SEARCH AREA**  
- Optional SGL outline  
- Optional access tint (labeled access, not habitat)  

### WHAT THE USER CAN DO

- Tap to set search location; adjust radius  
- See structure/edge/terrain explanations  
- Keep private notes influencing local signal  
- Work offline with packs (weather may be limited)  

### CLAIMS WE CAN MAKE

- “These parts of your selected area show forest/open edge / moderate slopes / your notes.”  
- “Public-land boundary from PGC — verify seasons and rules.”  
- “Guidance for where to inspect — not where antlers are.”  

### CLAIMS WE CANNOT MAKE

- Chance of finding a shed  
- Bucks shed here  
- Exact deer density / presence  
- Legal right to enter without user verification  

---

## 10. Expected owner-visible experience after Phase 2

1. Open Sheds map (Phase 1 channels intact).  
2. If YOU is coarse → prompted to tap a search point.  
3. Set SEARCH AREA over a familiar PA tract.  
4. See habitat signal vary for **real** reasons (forest vs field vs steep).  
5. Edge zones readable; empty outside pack/area.  
6. Notes still matter; one find doesn’t paint the county.  
7. SGL overlay helps orientation without legal theater.  

---

## 11. Implementation phases (future — not now)

| Step | Scope |
| --- | --- |
| 2A | This recon + architecture (done when docs accepted) |
| 2B | SEARCH LOCATION UX only (no rasters) — optional thin slice |
| 2C | PA pack pipeline + habitat structure/edge/slope in-area |
| 2D | SGL overlay + access searchability polish |

---

## 12. Architecture verdict

Real public GIS can materially improve Habitat **if** scoped to SEARCH AREA, PA packs, and categorical honesty.

**PHASE 2 GIS VERDICT: GO** — proceed to implementation planning only after owner accepts this MVP and location gate; **do not implement in this task**.
