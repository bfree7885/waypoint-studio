# Whitetail Biological Model v1.0

**Species:** *Odocoileus virginianus* (white-tailed deer)  
**Product:** Sheds field intelligence — Waypoint Studio  
**Implementation:** `apps/shed-hunting/js/sheds-biological-model.js`  
**Commit status:** **Not committed. Not pushed.** Owner review required.  
**This is not machine learning.** Scores are transparent ecological heuristics for relative search guidance — **never** a probability that an antler is present.

---

## Language contract

| Term | Meaning in this product |
|------|-------------------------|
| Search priority | Relative walk-next attractiveness in the visible map |
| Confidence | Strength of support for the guidance given available inputs |
| Probability of find | **Not computed and never implied** |
| Observed | User-recorded field notes on this device |
| Inferred | Derived from elevation neighborhoods or optional edge hints |
| Ecological assumption | Literature-backed rule applied when data are sparse |
| User preference | Adjustable influence weights in Controls |

---

## Research summary

### Antler casting timing

- Cast follows post-rut **testosterone decline**; photoperiod is the master clock (endocrine reviews; MU Extension G9486; NH deer assessment).
- Typical northern windows: roughly **late December–March**, with most animals done by early March in many Midwestern summaries.
- **Nutrition stress**, age, and dominance can **advance** casting (QDMA science summary).
- Casting windows tend to be **tighter farther from the equator**; southern herds are more variable.
- **Disagreement / uncertainty:** exact peak day is individual and herd-specific; we use a **latitude-softened DOY peak**, not a forecast of sheds on the ground.

### Winter habitat & thermal ecology

- Night beds often in **closed conifer**; day beds frequently more **solar-exposed** (Armstrong et al. 1983; Schmitz 1991).
- Dense mature conifer **snow/thermal shelter** and proximity to forage are central northern management themes (MSU habitat cover; MN DNR winter habitat notes).
- As snow deepens, deer **concentrate** (“yard”), reduce travel, and favor canopies that intercept snow (~40 cm open snow seriously restricts movement in Great Lakes literature).

### Weather

- **Deep snow** raises movement energy cost more than cold alone (MN DNR WSI narrative; Moen 1976; DelGiudice et al.).
- MN WSI scores cold days (≤0°F) and deep-snow days (≥15"); we do **not** clone WSI — we use soft snow/cold/wind modifiers when a weather provider responds.
- **Snow crust / freeze–thaw:** biologically important for mobility and predation escape, but **not remotely sensed** here → explicit uncertainty.
- Light snow can improve antler **visibility** for humans; deep snow reduces walkability — both affect *search*, not find probability.

### Terrain microforms

- Applied topography (drainages as corridors, **benches**, **saddles** as low-cost ridge crossings) is widely used in habitat management writing.
- Peer-reviewed energy conservation supports preferring gentler / lower-cost routes in winter.
- **Model approach:** coarse elevation-neighborhood **hints** only; not surveyed landform polygons.

### Aspect (documented disagreement)

- Many northern sources emphasize **south-facing** winter bedding/yards for solar gain.
- Pauley (1988, Montana thesis): on that winter range, deer selected **north** aspects and steeper/lower sites — opposing the broad sun heuristic.
- v1.0 therefore applies only a **soft** northern sun bias and **surfaces the disagreement** in evidence + uncertainty notes.

### Movement, fences, edges

- Deer maintain **site fidelity** under hunting risk and often **reduce** exploratory travel (Claude et al. / Can. J. Zool. hunting behavior).
- Tall roadside fencing sharply cuts crossings; deer use **endings/gaps** and keep home-range fidelity (Peterson et al. 2011).
- Fence-crossing observations therefore mark probable **pinch** points — useful for search corridors, not guarantees.

### Human pressure

- Hunting/recreation can increase **nocturnality** and residency in known secure cover.
- Recorded hunting/hiking disturbance **down-weights** pressured pockets relative to quieter adjacent cover when the user logs it.
- Road proximity layers are **deferred** (no OSM impedance in v1.0).

### Bachelor groups & social winter behavior

- Post-rut bachelor regrouping and winter concentration are real ecological themes, but **group composition is not sensed** from the map.
- Proxy: user `winter_concentration` / bedding clusters. We do **not** invent bachelor-group locations.

---

## Factor catalog (modular scoring)

Each factor declares rationale, evidence IDs, biological confidence, data kind, and an explicit **base share** (`BASE_SHARE` in code). Preference weights scale shares. Contributions are **capped** so no single factor exceeds `MAX_FACTOR_FRACTION` (0.28) of the additive sum.

| Factor ID | Category | Data kind | Base share | Prefs key |
|-----------|----------|-----------|------------|-----------|
| `season_timing` | seasonal | ecological_assumption | 0.18 | season |
| `slope` | terrain | inferred | 0.08 | slope |
| `aspect_sun` | terrain | ecological_assumption | 0.08 | aspect |
| `terrain_form` | terrain | inferred | 0.07 | terrainForm |
| `thermal_cover` | habitat | observed* | 0.08 | thermalCover |
| `feeding` | habitat | observed | 0.09 | feeding |
| `bedding` | habitat | observed | 0.09 | bedding |
| `edge_transition` | habitat | inferred/observed | 0.06 | edges |
| `corridors` | behavior | observed | 0.07 | corridors |
| `fence_crossing` | behavior | observed | 0.05 | fences |
| `deer_sign` | behavior | observed | 0.06 | deerSign |
| `shed_find_interest` | calibration_signal | observed | 0.04 | shedFinds |
| `human_pressure` | human | observed* | 0.05 | humanPressure |

\*Thermal/human default to neutral when unobserved rather than inventing cover or roads.

**Multiplicative modifiers (not hidden):** search-completed notes, coverage marks (partial/thorough/revisit), snow/cold/wind when weight `snow` > off.

---

## Confidence system (≠ probability)

| Channel | Rates |
|---------|-------|
| `biological` | Mean biologicalConfidence of active weighted factors |
| `environmentalData` | Terrain / weather / edge data availability |
| `observationDensity` | Count of observations & nearby notes |
| `overallRecommendation` | Blend of the three — **guidance support only** |

Explain UI and planner copy always label these as confidence, not chance of an antler.

---

## Calibration hooks (no ML)

`result.calibration.readyFor` includes:

- regional peak DOY offsets  
- per-factor bias from confirmed finds  
- season validation pass/fail logs  
- user weight profiles by region  

No learning loop is implemented in v1.0.

---

## Assumptions

1. Northern-hemisphere photoperiod casting pattern is the default; southern hemisphere gets a shifted heuristic only.
2. Without land-cover rasters, we **never invent** conifer yards — thermal boost requires user winter/bedding notes (or stays neutral).
3. Elevation-neighborhood microforms are **hints**, not authoritative geomorphology.
4. Prior shed finds raise **interest** only.
5. Thorough search marks reduce planner attractiveness; they do **not** prove emptiness.

---

## Uncertainty & deferred questions

| Topic | Status |
|-------|--------|
| Land-cover / canopy closure | Deferred |
| True saddle/bench GIS delineation | Deferred (hints only) |
| Snow crust / freeze–thaw | Unavailable |
| Road / trail density impedance | Deferred |
| Multi-species | Deferred |
| Regional validation against known finds | Future calibration |
| ML / fitted weights | Explicitly out of scope for v1.0 |

---

## Evidence index (short)

| ID | Source |
|----|--------|
| E01 | MU Extension G9486 antler development |
| E02 | NH Fish & Game deer assessment |
| E03 | QDMA Canada — Science Behind Sheds |
| E04 | Bubenik 2006 antler/reproduction review |
| E05 | Armstrong et al. 1983 winter bed sites |
| E06 | Schmitz 1991 thermal habitat choice |
| E07 | MSU Deer Lab habitat cover |
| E08 | Minnesota DNR winter / WSI |
| E09 | Moen 1976 energy conservation |
| E10 | DelGiudice et al. conifer & snow |
| E11 | Hunting spatial behavior (Can. J. Zool.) |
| E12 | Peterson et al. 2011 roadside fences |
| E13 | Applied topography management synthesis |
| E14 | Pauley 1988 — **aspect disagreement** |

Full citation strings and URLs live in `WaypointShedsBiological.EVIDENCE`.

---

## Architecture

```
observations + elevation + weather + prefs
        ↓
sheds-biological-model.js  (factors → capped contributions → confidence → explanation)
        ↓
sheds-likelihood-model.js  (grid builder)
        ↓
heat layer + search planner (why + taxonomy)
```

---

## Tests

```bash
node automation/test-sheds-biological-model.mjs
node automation/test-sheds-map.mjs
node automation/test-sheds-planner.mjs
node automation/test-sheds-map-cdp.mjs
```

---

## Honesty checklist

- [x] Transparent documented base shares  
- [x] Observed vs inferred vs assumption vs preference separated  
- [x] Disagreement on aspect documented  
- [x] Confidence ≠ probability  
- [x] No invented land cover  
- [x] Calibration hooks without ML  
