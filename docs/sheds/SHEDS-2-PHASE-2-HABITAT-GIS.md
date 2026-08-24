# Sheds 2.0 — Phase 2 Habitat GIS MVP

**Status:** Implementation complete — ready for owner review  
**Date:** 2026-08-24  
**Branch:** `feat/sheds-2-phase-2-habitat-gis`  
**Worktree:** `.worktrees/sheds-2-phase-2-habitat-gis`  
**Base / Phase 1:** `b38af8be5598105ee93dec48b312534364a2d7b3`  
**Design inputs:** [`SHEDS-2-PHASE-2-GIS-RECON.md`](./SHEDS-2-PHASE-2-GIS-RECON.md), [`SHEDS-2-PHASE-2-ARCHITECTURE.md`](./SHEDS-2-PHASE-2-ARCHITECTURE.md)

---

## Mission

Give Sheds its first genuinely spatial habitat guidance using real public GIS data inside an explicit **SEARCH AREA**.

The map answers:

> What landscape characteristics inside this chosen area may make some portions more worthwhile to inspect than others?

It does **not** answer “Where are sheds?”

---

## Implemented datasets

| Layer | Provider | Exact product / version | Resolution | License | Coverage (MVP) |
| --- | --- | --- | --- | --- | --- |
| Land cover | USGS / MRLC | `NLCD_2021_Land_Cover_L48` via MRLC WMS GetMap GeoTIFF; palette remapped to NLCD codes | ~30 m nominal (pack cells ~90 m for this AOI) | US public domain | Pike / Milford PA pack |
| Terrain elev | USGS 3DEP | `3DEPElevation` ImageServer `exportImage` | Multi (~10–30 m source), resampled to pack grid | US public domain | Same AOI |
| Slope | Derived | `numpy.gradient` on elev → degrees, quantized 0–90 | Pack grid | Derived from public domain | Same AOI |
| Forest/open edge | Derived | Chebyshev neighborhood transition; forest = NLCD `{41,42,43,90}`; distance × cell size → meters | Pack grid | WAYPOINT_HEURISTIC | Same AOI |
| State Game Lands | PASDA / PGC | MapServer query (layer 0) | Vector | Public map service | On-demand bbox (MAP / ACCESS CONTEXT only) |

**Not in habitat score:** OSM roads/trails, SGL membership, season, weather, deer density, NDVI.

---

## Preprocessing

**Script:** `scripts/sheds-gis/build-pack.py`

**Example:**

```bash
python3 scripts/sheds-gis/build-pack.py \
  --west -74.90 --south 41.26 --east -74.70 --north 41.40 \
  --pack-id pa-pike-milford-v1 \
  --region "Pike County / Milford-area Pennsylvania" \
  --out apps/shed-hunting/gis/packs/pa-pike-milford-v1.json
```

**Documents in pack metadata:** source dataset, year, access URL template, license, processing time (`createdAt`), bounds, CRS (`EPSG:4326`), cell size, sha256 of payload arrays.

**Does not commit** source GeoTIFFs — only the compact JSON pack.

---

## Pack format

File: `apps/shed-hunting/gis/packs/pa-pike-milford-v1.json`

| Field | Meaning |
| --- | --- |
| `packId` / `version` | Identity + cache invalidation |
| `bounds` | WGS84 west/south/east/north |
| `rows` / `cols` | Grid (MVP: 180×180) |
| `cellSizeMApprox` | ~89.7 m for this AOI |
| `nlcd` / `edgeM` / `slopeDeg` | Base64-encoded `uint8` rasters |
| `sources` | Provenance for NLCD, elev, edge, slope |
| `sha256` | Integrity of encoded arrays |

**Pack size:** ~130,731 bytes (~128 KB).

**Geographic bounds:** west −74.90, south 41.26, east −74.70, north 41.40 (Pike County / Milford-area Pennsylvania).

---

## Search-area UX

1. **Tap/click map** → sets **SEARCH LOCATION** (diamond marker + tooltip “SEARCH — analysis center (not YOU)”).  
2. **SEARCH AREA** = circle with radius **Small 400 m / Medium 600 m / Large 1 km**.  
3. GIS analysis runs **only** when SEARCH LOCATION is set, and scores **only cells inside the radius**.  
4. **YOU** never auto-becomes SEARCH when coarse.

### Accuracy gate

| Threshold | Behavior |
| --- | --- |
| `YOU_ACCURACY_MAX_M = 500` | Deliberate **Analyze at YOU** allowed only if reported accuracy ≤ 500 m |
| Coarse YOU (e.g. owner ±4.75 km) | Prompt: “Tap the area you want to analyze…” — **no auto GIS** |
| GPS / date / weather updates | Must **not** move SEARCH LOCATION |

Rationale: kilometer-scale browser positioning is acceptable for YOU labeling, not for ridge-scale habitat analysis.

---

## Land-cover mapping

NLCD codes retained on every sample. UI buckets:

| Structure | NLCD codes |
| --- | --- |
| water | 11 |
| developed | 21–24 |
| other | 31 |
| forest | 41–43 |
| open | 52, 71 |
| agriculture | 81–82 |
| wetland | 90, 95 |

---

## Edge derivation

- **Forest:** NLCD `{41, 42, 43, 90}` (deciduous/evergreen/mixed + woody wetlands treated as forest-structure for transition).  
- **Open/ag/other:** all non-forest classes for transition detection.  
- **Method:** 3×3 neighborhood; cell is edge if forest mask min≠max; BFS cell distance; `edgeM ≈ dist × cellSizeMApprox`, capped at 255.  
- **UI language:** “habitat transition” — **not** “shed hotspot”.  
- **Smoothing:** none beyond neighborhood edge detection.

---

## Terrain logic

Slope is a **terrain / walkability context** signal:

| Slope | Terrain score role |
| --- | --- |
| &lt; 2° | Nearly flat |
| 2–12° | Moderate — generally walkable (higher terrain score) |
| 12–25° | Steeper — slower walking |
| ≥ 25° | Steep — limited walkability |

**Does not assume** steeper = more sheds or flat = more sheds.

---

## Observation integration

- Private observations remain local-first.  
- Habitat GIS uses Bio `channelMode: "habitat"` → **`parts.shedBoost`** only (season/weather excluded).  
- Cap: `OBS_CAP = 0.35` (aligned with Phase 1 `SHED_FIND_INTEREST_CAP`).  
- Decay: Bio `recencyDecay` / age still applies to shed finds.  
- One or many finds **cannot** dominate the whole SEARCH AREA via the cap; structure/terrain still vary spatially.

---

## Habitat categories

Internal score:

`0.45×structure + 0.25×terrain + 0.30×observed`  
All weights classified **WAYPOINT_HEURISTIC**.

| Band | Meaning |
| --- | --- |
| Limited habitat signal | Lower combined structure/terrain/obs |
| Some habitat signal | Mid |
| Stronger habitat signal | Higher |
| Habitat data unavailable for this area | No pack / outside SEARCH / no sample |

**No percentages. No find probability.**

Structure channel includes NLCD bucket + near-edge boost (≤ ~90 m).  

---

## Confidence (Evidence support)

| Level | When |
| --- | --- |
| Low | No GIS pack / sparse sources |
| Moderate | Land cover + terrain available |
| Higher | Structure + terrain + meaningful private observations |

Wording: **Evidence support** — not chance of success.

---

## Explanation

Tapping a habitat cell surfaces contributing factors from actual inputs:

- Landscape structure (NLCD + transition)  
- Terrain (slope)  
- Observed evidence (capped)  
- Limit: landscape structure ≠ antler present; ~30 m honesty  

---

## Caching / offline

- `localStorage` key `waypoint-sheds-gis-pack-v1:{packId}` + manifest `waypoint-sheds-gis-manifest-v1`.  
- Invalidate when `version` or `sha256` changes.  
- `preferCacheOnly` / fetch-fail → use cached pack if present.  
- **Offline:** cached habitat packs + local notes can still score SEARCH AREA; weather/searchability and basemap tiles may degrade separately. Full offline maps are **not** promised.

---

## Map layers / markers

| Kind | Role |
| --- | --- |
| YOU | Device position (+ accuracy ring) |
| SEARCH | Analysis center |
| SEARCH AREA | Radius circle |
| TARGET | Planner suggestion only when justified |
| OBSERVATION | Private notes |
| SGL overlay | Access context — verify regulations |
| Habitat bands | Discrete Limited / Some / Stronger fills inside SEARCH only |

Unavailable outside pack: honest empty — **no decorative heat**.

---

## Performance (measured 2026-08-24, Node harness)

See also `docs/sheds/SHEDS-2-PHASE-2-VALIDATION.json`.

| Metric | Value |
| --- | --- |
| Pack size | 130,731 bytes |
| Disk read | ~0.2 ms |
| JSON parse | ~0.8 ms |
| Base64 inflate | ~2.6 ms |
| Analysis 22×22 SEARCH grid | ~5 ms |
| Band iterate “render” | ~0.1 ms |
| Heap (harness) | ~5.5 MB used / ~48 MB RSS |

**Mobile concern:** Pack + three 180² uint8 planes is modest. Do not load many statewide packs at once. Basemap tiles dominate memory/network when offline tiles are missing. SEARCH AREA analysis should not freeze the browser at this size.

---

## Validation (landscape structure only — not sheds)

Pike / Milford pack structure fractions (approx):

| Structure | Share |
| --- | --- |
| Forest | ~74% |
| Developed | ~11% |
| Wetland | ~8% |
| Agriculture | ~4% |
| Water | ~2% |
| Open / other | &lt;1% |

Also: ~59% of cells within ~90 m of a forest/non-forest transition; slope mostly moderate (2–12°) with flat and steeper tails.

Spot checks: Milford vicinity samples **developed**; northern/western AOI samples **forest**; southern sample **wetland** with edge distance 0 — consistent with mixed Pike landscape. **No shed-location validation performed.**

---

## Tests

```bash
cd .worktrees/sheds-2-phase-2-habitat-gis
node automation/test-sheds-phase2-habitat-gis.mjs
node automation/test-sheds-phase1-prediction-truth.mjs
# plus Sheds regression suite listed in owner report
```

---

## Owner local review

```bash
cd /home/bryan/projects/waypoint-scenes/.worktrees/sheds-2-phase-2-habitat-gis
python3 -m http.server 8080
```

Open: [http://127.0.0.1:8080/apps/shed-hunting/map/](http://127.0.0.1:8080/apps/shed-hunting/map/)

Pan to Milford / Pike (~41.32, −74.80), tap to set SEARCH, inspect structure bands, explain a cell, optionally toggle SGL context, add a note, change date (SEARCH must not move).

---

## Limitations

- Single AOI pack (Pike/Milford) — not statewide PA.  
- Pack cell ~90 m vs NLCD ~30 m — do not imply finer precision.  
- NLCD from WMS palette remapping — possible class noise at palette edges.  
- Edge definition includes woody wetlands as forest-structure — heuristic.  
- Weights are Waypoint heuristics, not calibrated encounter rates.  
- SGL overlay needs network (or cache) and is not legal advice.  
- Basemap offline not guaranteed.  
- No polygon draw, geocoder, density, NDVI, or national packs.

---

## Next-phase options (not implemented)

- Additional PA validation packs  
- Polygon SEARCH AREA  
- Aspect / bench only with independent validation  
- Broader caching / pack catalog UI  
- Stronger a11y explain panel polish  

---

## Integration bug fixed during acceptance

`observedScore` originally called Bio with `mode: "habitat"` and fell back to generic priority, which **broke observation decay** (old finds could score ≥ fresh). Fixed to use `channelMode: "habitat"` and capped `parts.shedBoost`.
