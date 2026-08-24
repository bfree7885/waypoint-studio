# Sheds 2.0 — Phase 2A GIS / Habitat Reconnaissance

**Status:** Research + architecture only — **do not implement from this doc alone**  
**Date:** 2026-08-24  
**Baseline:** Phase 1 commit `b38af8be` (`feat/sheds-2-phase-1-prediction-truth`)  
**Companions:** [`SHEDS-2-PHASE-2-ARCHITECTURE.md`](./SHEDS-2-PHASE-2-ARCHITECTURE.md) · [`SHEDS-2-PHASE-1-PREDICTION-TRUTH.md`](./SHEDS-2-PHASE-1-PREDICTION-TRUTH.md) · [`SHEDS-2-ARCHITECTURE.md`](./SHEDS-2-ARCHITECTURE.md) · [`SHEDS-2-REALITY-AUDIT.md`](./SHEDS-2-REALITY-AUDIT.md)

---

## 1. Mission of this recon

Answer:

> What real spatial information can help a shed hunter decide where **within a chosen search area** it may be more worthwhile to walk?

Non-goals:

- Probability of finding an antler  
- Exact cast dates / shed GPS  
- Deer presence without evidence  
- Undoing Phase 1 channel separation  
- Silently using coarse **YOU** as fine-scale analysis location  

---

## 2. Phase 1 baseline (production truth)

| Channel | Phase 1 reality |
| --- | --- |
| Timing | Coarse regional photoperiod window |
| Habitat | Private observations + **weak** Open-Meteo elev proxies; **empty** without spatial evidence; **no NLCD** |
| Searchability | Weather / daylight / footing heuristics |
| Evidence support | Input coverage — not find % |
| Location | YOU may be ± multi-km; fine habitat must wait for **SEARCH LOCATION** |

Phase 1 code already states: *“No NLCD / forest-edge GIS in Phase 1.”* (`sheds-habitat.js`)

---

## 3. Data source scorecards

Legend — **Recommendation:** `USE PHASE 2` · `LATER` · `CONTEXT ONLY` · `REJECT`  
**Primary channel:** `TIMING` · `HABITAT` · `SEARCHABILITY` · `CONFIDENCE` · `MAP CONTEXT`

### 3.1 USGS NLCD / Annual NLCD (land cover)

| Field | Value |
| --- | --- |
| DATASET | National Land Cover Database (legacy epochs through 2021) + Annual NLCD Collection (1985–2023+) |
| PROVIDER | USGS / MRLC Consortium |
| AUTHORITATIVE? | Yes (federal) |
| GEOGRAPHIC COVERAGE | CONUS (PA fully covered) |
| RESOLUTION | **30 m** |
| UPDATE FREQUENCY | Legacy multi-year epochs; Annual NLCD intended yearly |
| ACCESS METHOD | MRLC viewer/email clip, ScienceBase, EarthExplorer, AWS S3 (requester-pays for some Annual products), WMS |
| LICENSE / USE | U.S. public domain (USGS) — credit USGS |
| DOWNLOAD SIZE | Statewide PA clip: order ~tens–low hundreds of MB GeoTIFF depending on year/products; CONUS mosaics much larger |
| PROCESSING COMPLEXITY | Moderate — class remap, edge derivation, tile/pack for AOI |
| BROWSER FEASIBILITY | Full raster **no**; AOI tiles / class polygons / precomputed grids **yes** |
| OFFLINE FEASIBILITY | Good if PA packs prebundled |
| SCIENTIFIC VALUE | High for **structure** (forest / ag / developed / wetland / open) — not “forest = sheds” |
| PRODUCT VALUE | High — first honest spatial differentiation inside a search area |
| PRIMARY CHANNEL | **HABITAT** (structure) |
| RISKS | Class confusion; outdated patches; overclaiming food/cover quality from Level II labels alone |
| RECOMMENDATION | **USE PHASE 2** |

**Product use:** Remap Anderson-style classes into shed-search structure buckets (e.g. forest, shrub/open, cropland/pasture, wetland, developed, barren/water). Explain class → why walk interest — never find %.

---

### 3.2 Forest / habitat edge (derived from NLCD)

| Field | Value |
| --- | --- |
| DATASET | Derived forest↔open / forest↔ag edge distance & edge density from NLCD |
| PROVIDER | Derived (Waypoint) from USGS NLCD |
| AUTHORITATIVE? | Source yes; derivation is model assumption |
| GEOGRAPHIC COVERAGE | Same as NLCD pack |
| RESOLUTION | ~30 m (edge distance continuous within AOI) |
| UPDATE FREQUENCY | Follows NLCD pack refresh |
| ACCESS METHOD | Offline preprocess from NLCD GeoTIFF |
| LICENSE / USE | Follows NLCD + disclose derivation |
| DOWNLOAD SIZE | Small derived grids per AOI / county pack |
| PROCESSING COMPLEXITY | Moderate (morphological edge, distance transform) |
| BROWSER FEASIBILITY | Precomputed grids yes; live CONUS no |
| OFFLINE FEASIBILITY | Excellent |
| SCIENTIFIC VALUE | Moderate — travel/edge ecology plausible; **not** calibrated shed predictor |
| PRODUCT VALUE | High for “where within this parcel to look first” |
| PRIMARY CHANNEL | **HABITAT** |
| RISKS | Edge ≠ antlers; suburban edges ≠ huntable access |
| RECOMMENDATION | **USE PHASE 2** (as derived layer, soft weights) |

---

### 3.3 USGS 3DEP DEM (elevation / slope)

| Field | Value |
| --- | --- |
| DATASET | 3DEP seamless DEM (1/3″ ~10 m preferred; 1″ ~30 m acceptable fallback) |
| PROVIDER | USGS The National Map / OpenTopography subset APIs |
| AUTHORITATIVE? | Yes |
| GEOGRAPHIC COVERAGE | CONUS; PA well covered at 1/3″ in most areas |
| RESOLUTION | ~10 m (1/3″) or ~30 m (1″) |
| UPDATE FREQUENCY | Continuous improvement; not daily |
| ACCESS METHOD | National Map download, ImageServer/WCS, OpenTopography USGS DEM API |
| LICENSE / USE | Public domain |
| DOWNLOAD SIZE | County/AOI GeoTIFF: tens–hundreds of MB at 10 m |
| PROCESSING COMPLEXITY | Moderate — slope; optional ruggedness; **aspect soft only** |
| BROWSER FEASIBILITY | Preprocessed slope/interest grids yes; raw lidar no |
| OFFLINE FEASIBILITY | Good with packs |
| SCIENTIFIC VALUE | Moderate for **walkability / benches / steep refuse**; aspect regional disagreement (Phase 1 evidence) |
| PRODUCT VALUE | Medium–high if replacing Open-Meteo 3×3 heuristics |
| PRIMARY CHANNEL | **HABITAT** (structure/terrain) + soft **SEARCHABILITY** (steepness as footing) |
| RISKS | Over-weighting aspect; morphology theater |
| RECOMMENDATION | **USE PHASE 2** for elevation + slope; aspect **CONTEXT ONLY / soft**; reject microform theater |

**Replace** Phase 1 Open-Meteo elev morphology for habitat when 3DEP pack present.

---

### 3.4 NHD / NHDPlus HR (hydrography)

| Field | Value |
| --- | --- |
| DATASET | NHD / NHDPlus High Resolution |
| PROVIDER | USGS |
| AUTHORITATIVE? | Yes |
| GEOGRAPHIC COVERAGE | National |
| RESOLUTION | Vector network (HR); not a 30 m raster |
| UPDATE FREQUENCY | Periodic national releases |
| ACCESS METHOD | The National Map download; ArcGIS REST map services |
| LICENSE / USE | Public domain |
| DOWNLOAD SIZE | HU4/HU8 extracts large; AOI clip manageable |
| PROCESSING COMPLEXITY | Moderate (distance-to-stream rasterize for AOI) |
| BROWSER FEASIBILITY | Vector overlay / precomputed distance band yes |
| OFFLINE FEASIBILITY | Good with PA packs |
| SCIENTIFIC VALUE | Weak–moderate as shed predictor; moderate as landscape structure / travel edge |
| PRODUCT VALUE | Medium — useful as soft context inside search area |
| PRIMARY CHANNEL | **HABITAT** (soft) or **MAP CONTEXT** |
| RISKS | “Antlers by water” myth; wetlands ≠ sheds |
| RECOMMENDATION | **LATER** (or thin CONTEXT ONLY overlay in Phase 2 if cheap) — not MVP-critical |

---

### 3.5 OpenStreetMap roads / trails

| Field | Value |
| --- | --- |
| DATASET | OSM highways / paths |
| PROVIDER | OpenStreetMap contributors |
| AUTHORITATIVE? | Community — completeness uneven |
| GEOGRAPHIC COVERAGE | Global / PA |
| RESOLUTION | Vector |
| UPDATE FREQUENCY | Continuous |
| ACCESS METHOD | Overpass / Geofabrik extracts / tiles |
| LICENSE / USE | ODbL — attribution + share-alike for derivatives |
| DOWNLOAD SIZE | PA extract manageable |
| PROCESSING COMPLEXITY | Low–moderate |
| BROWSER FEASIBILITY | Vector tiles / distance-to-road grids |
| OFFLINE FEASIBILITY | Good |
| SCIENTIFIC VALUE | Low for deer biology; high for human access |
| PRODUCT VALUE | High for field planning |
| PRIMARY CHANNEL | **SEARCHABILITY** / **MAP CONTEXT** — **not HABITAT** |
| RISKS | Mixing “easy walk” with “good habitat” |
| RECOMMENDATION | **USE PHASE 2** as access/searchability — **REJECT** as habitat weight |

---

### 3.6 Pennsylvania public lands (SGL / state forest / parks)

| Field | Value |
| --- | --- |
| DATASET | PA State Game Lands (+ DCNR state forests/parks via PASDA / agency services) |
| PROVIDER | Pennsylvania Game Commission; DCNR; PASDA |
| AUTHORITATIVE? | Yes for agency-published boundaries |
| GEOGRAPHIC COVERAGE | Pennsylvania |
| RESOLUTION | Vector polygons |
| UPDATE FREQUENCY | Periodic agency updates |
| ACCESS METHOD | `pgcmaps.pa.gov` ArcGIS REST; PASDA REST/WMS; downloads |
| LICENSE / USE | Agency terms — generally public mapping use; verify attribution |
| DOWNLOAD SIZE | Small–moderate GeoJSON/FGDB |
| PROCESSING COMPLEXITY | Low |
| BROWSER FEASIBILITY | Excellent (vector overlay + “inside SGL?”) |
| OFFLINE FEASIBILITY | Excellent |
| SCIENTIFIC VALUE | N/A as biology; high as **where you may legally hunt/search** (with caveats) |
| PRODUCT VALUE | Very high for PA hunters |
| PRIMARY CHANNEL | **MAP CONTEXT** + **SEARCHABILITY** (access/eligibility context) |
| RISKS | Legal overclaim; private inholdings; seasonally closed roads |
| RECOMMENDATION | **USE PHASE 2** (PA-first overlay + honesty: “agency boundary — verify regulations”) |

---

### 3.7 PGC Wildlife Management Units (WMU)

| Field | Value |
| --- | --- |
| DATASET | Wildlife Management Units |
| PROVIDER | Pennsylvania Game Commission |
| AUTHORITATIVE? | Yes |
| GEOGRAPHIC COVERAGE | PA |
| RESOLUTION | Large polygons (regional) |
| UPDATE FREQUENCY | Occasional |
| ACCESS METHOD | PGC REST / PASDA |
| LICENSE / USE | Agency public mapping |
| DOWNLOAD SIZE | Tiny |
| PROCESSING COMPLEXITY | Trivial |
| BROWSER FEASIBILITY | Excellent |
| OFFLINE FEASIBILITY | Excellent |
| SCIENTIFIC VALUE | Regional management context only |
| PRODUCT VALUE | Medium for Timing/education links |
| PRIMARY CHANNEL | **TIMING** / **MAP CONTEXT** (regional) — **REJECT** as micro-habitat heat |
| RISKS | Painting WMU harvest stats as local density |
| RECOMMENDATION | **CONTEXT ONLY** |

---

### 3.8 Deer harvest / population statistics

| Field | Value |
| --- | --- |
| DATASET | PGC harvest reports / biological reports |
| PROVIDER | PGC |
| AUTHORITATIVE? | Yes as published stats |
| GEOGRAPHIC COVERAGE | PA (WMU/county aggregates) |
| RESOLUTION | **Coarse** |
| UPDATE FREQUENCY | Seasonal/annual |
| ACCESS METHOD | Reports / tables — not fine GIS |
| LICENSE / USE | Public agency publications |
| DOWNLOAD SIZE | Small |
| PROCESSING COMPLEXITY | Low |
| BROWSER FEASIBILITY | Text/cards yes |
| OFFLINE FEASIBILITY | Yes |
| SCIENTIFIC VALUE | Weak for micro-site search |
| PRODUCT VALUE | Low for map heat; medium for education |
| PRIMARY CHANNEL | **MAP CONTEXT** / Timing education |
| RISKS | Fake local deer density heat |
| RECOMMENDATION | **REJECT** for habitat grid; optional text context later |

---

### 3.9 Snow cover / depth products

| Field | Value |
| --- | --- |
| DATASET | e.g. NOAA / NWS / SNODAS-class products (investigate at implement time) |
| PROVIDER | NOAA / NSIDC / NWS |
| AUTHORITATIVE? | Varies by product |
| GEOGRAPHIC COVERAGE | CONUS |
| RESOLUTION | Often km-scale — coarser than NLCD |
| UPDATE FREQUENCY | Daily-ish for some products |
| ACCESS METHOD | APIs / GRIB / NetCDF |
| LICENSE / USE | Typically public federal |
| DOWNLOAD SIZE | Moderate–large |
| PROCESSING COMPLEXITY | High for mobile |
| BROWSER FEASIBILITY | Hard live |
| OFFLINE FEASIBILITY | Poor for daily |
| SCIENTIFIC VALUE | Searchability (visibility/footing) moderate; casting trigger **weak** (Phase 1) |
| PRODUCT VALUE | Incremental over Open-Meteo snowfall_sum |
| PRIMARY CHANNEL | **SEARCHABILITY** only |
| RISKS | Treating snow as cast trigger; inventing depth |
| RECOMMENDATION | **LATER** — keep Phase 1 Open-Meteo searchability; do not add snow GIS to habitat MVP |

---

### 3.10 Sentinel / Landsat / NDVI / canopy

| Field | Value |
| --- | --- |
| DATASET | Sentinel-2 / Landsat reflectance; NDVI; canopy products |
| PROVIDER | ESA / USGS |
| AUTHORITATIVE? | Yes as imagery |
| GEOGRAPHIC COVERAGE | Global / CONUS |
| RESOLUTION | 10–30 m |
| UPDATE FREQUENCY | Days–weeks |
| ACCESS METHOD | STAC / Earth Engine / AWS |
| LICENSE / USE | Generally open with attribution |
| DOWNLOAD SIZE | Large |
| PROCESSING COMPLEXITY | High |
| BROWSER FEASIBILITY | Poor without heavy infra |
| OFFLINE FEASIBILITY | Poor |
| SCIENTIFIC VALUE | Marginal for shed-search MVP vs static NLCD |
| PRODUCT VALUE | Low for Phase 2 |
| PRIMARY CHANNEL | Would tempt HABITAT |
| RISKS | Impressive GIS without product clarity; hosting cost |
| RECOMMENDATION | **REJECT** for Phase 2 |

---

### 3.11 Open-Meteo elevation (current)

| Field | Value |
| --- | --- |
| DATASET | Open-Meteo elevation API samples |
| PROVIDER | Open-Meteo |
| AUTHORITATIVE? | Convenient, not USGS 3DEP |
| RESOLUTION | Coarse sample lattice |
| UPDATE FREQUENCY | On demand |
| ACCESS METHOD | HTTPS API |
| LICENSE / USE | Provider terms |
| DOWNLOAD SIZE | Tiny |
| PROCESSING COMPLEXITY | Low |
| BROWSER FEASIBILITY | Yes (current) |
| OFFLINE FEASIBILITY | Cache only |
| SCIENTIFIC VALUE | Weak (Phase 1 labeled) |
| PRODUCT VALUE | Fallback only |
| PRIMARY CHANNEL | HABITAT weak |
| RISKS | Fake micro-terrain |
| RECOMMENDATION | **LATER** keep as fallback when 3DEP pack missing; do not expand |

---

## 4. Pennsylvania-first vs national

**Recommend Pennsylvania-first Phase 2 packs.**

| Why PA-first wins |
| --- |
| PGC SGL + WMU REST already public and hunter-relevant |
| PASDA consolidates state GIS |
| Owner validation geography is PA |
| Smaller packs → offline / static-hosting feasible |
| NLCD + 3DEP still national standards — clipped to PA counties / AOIs |

National expansion later = same pipeline, new packs — not a different science model.

---

## 5. Rejected / deferred summary

| Dataset / idea | Decision | Why |
| --- | --- | --- |
| Deer density / harvest heat | REJECT (habitat) | Coarse stats ≠ micro map |
| NDVI / Sentinel pipelines | REJECT Phase 2 | Cost > value vs NLCD |
| Snow GIS habitat | REJECT | Searchability only; Phase 1 casting caution |
| Aspect as strong habitat | REJECT / soft | Regional disagreement |
| OSM as habitat weight | REJECT | Access ≠ biology |
| Live CONUS rasters in browser | REJECT | Perf / size |
| Private parcel ownership | REJECT Phase 2 | Legal/privacy risk |

---

## 6. Availability spot-checks (2026-08-24)

- MRLC / USGS NLCD & Annual NLCD: public domain; 30 m; download + WMS + cloud paths documented.  
- USGS 3DEP ImageServer / downloadable DEMs: authoritative elev; ~10–30 m products.  
- PGC `SGL_service` MapServer: live REST for State Game Lands / related layers (`pgcmaps.pa.gov`).  
- PASDA: PA Game Lands dataset summary + REST/WMS mirrors.  
- NHDPlus HR: public domain national hydro framework.

No statewide rasters were downloaded into the repo (by design).

---

## 7. Honest scientific limitations

1. Landscape structure ≠ antler presence.  
2. NLCD is ~30 m and temporally lagged vs today’s timber cut.  
3. Edge distance is a search-planning prior, not a calibrated encounter rate.  
4. Slope helps walkability more than cast biology.  
5. Public-land polygons are not legal advice.  
6. Coarse YOU (±km) must never seed fine GIS scoring.

---

## 8. Recon verdict (feeds architecture)

**Material improvement is feasible** with a small stack:

1. NLCD structure (+ derived edge)  
2. 3DEP slope / elevation (replace weak Open-Meteo morphology)  
3. Private observations (separate evidence)  
4. PA public-land overlay (context/access)  
5. OSM access as searchability — not habitat  

**PHASE 2 GIS research readiness: GO to architecture / MVP design** (implementation still gated by owner).
