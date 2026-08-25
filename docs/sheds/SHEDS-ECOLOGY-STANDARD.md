# Sheds Ecology & Environmental Intelligence Standard

**Product:** Waypoint Studio → Sheds  
**Status:** Binding product standard for V3 planning  
**Companion:** [`SHEDS-BEST-IN-CLASS-AUDIT.md`](./SHEDS-BEST-IN-CLASS-AUDIT.md), [`SHEDS-ROADMAP-V3.md`](./SHEDS-ROADMAP-V3.md)  
**Foundation:** Sheds 2.0 Phases 1–4 + PR #52 mobile field chrome (**accepted**)  
**Constraint:** Ecology/environmental claims are scientific information. Unsupported certainty is a product defect.

---

## 1. Mission differentiation

Sheds is **not** a general outdoor atlas and **not** an onX clone.

> **Purpose-built shed hunting + rigorous whitetail ecology + transparent environmental intelligence.**

The product should help a hunter understand:

| Question | Channel |
| --- | --- |
| Where should I search? | Habitat MODEL + Observed + coverage gaps |
| Why does this area matter? | Explainable factors with provenance |
| When do conditions favor searching? | Timing + Searchability |
| What do landscape features mean biologically? | Ecology coaching (labeled) |
| What has actually been observed? | Observed (user + authoritative sources) |
| What is inferred? | Modeled / Derived |
| How confident are we? | Confidence = support for *guidance*, never find % |
| How do I search without unnecessary disturbance? | Stewardship intelligence |

---

## 2. Evidence classes (mandatory)

Every user-visible claim, score, heat band, badge, or coach line must map to exactly one class:

| Class | Definition | Examples | UI treatment |
| --- | --- | --- | --- |
| **Observed** | Direct field observation or authoritative source datum | User shed find; GPS track; NLCD land-cover class from pack; Open-Meteo temperature reading | Solid / “Observed” |
| **Derived** | Deterministic calculation from source data | Slope/aspect from DEM samples; track distance; daylight length from lat/date | “Derived from …” |
| **Modeled / inferred** | Heuristic or model prediction | Habitat interest heat; “candidate winter cover”; timing phase; searchability “good day” | Distinct MODEL styling; never sold as fact |
| **Unknown** | Insufficient evidence | No GIS pack; no snow depth; no local observations | Empty / “Insufficient evidence” — never invent |

### Banned presentation patterns

Never present modeled deer behavior as observed fact.

| Ban | Prefer |
| --- | --- |
| deer are here | recent observations / fresh sign nearby (if Observed) |
| bucks will bed here | candidate bedding cover (Modeled) |
| sheds are here | prior finds raise *interest* only (Modeled, capped) |
| deer use this route | trail/crossing notes suggest travel (Observed) / terrain may concentrate movement (Modeled) |
| hotspot / find probability | higher modeled search potential |
| High confidence (bare) | High *support for guidance* — list missing inputs |

### Allowed scientific phrasing (examples)

- higher modeled search potential  
- habitat characteristics consistent with winter use  
- terrain may concentrate movement  
- candidate bedding cover  
- probable travel constraint (Modeled; label as heuristic)  
- recent observations increase guidance support  
- insufficient evidence  

---

## 3. Channel architecture (keep)

Do **not** collapse these into one mystery score:

```
TIMING          → when (regional casting window)
HABITAT MODEL   → where (landscape structure / notes / GIS)
SEARCHABILITY   → now/how (weather, footing, visibility)
CONFIDENCE      → support for guidance (not find %)
OBSERVED        → what was actually recorded
STEWARDSHIP     → how to search responsibly (V3 expansion)
```

Rules:

1. Season/weather must not silently repaint Habitat MODEL as if land cover changed.  
2. Prior shed finds raise **interest** with a hard cap — never prove presence.  
3. Confidence discloses missing inputs when elevated.  
4. Empty beats decorative geometry.

---

## 4. Whitetail biology — what Sheds may claim

### 4.1 Established enough for coarse Timing (with uncertainty)

| Topic | Status | Product rule |
| --- | --- | --- |
| Antler cast after post-rut testosterone decline under photoperiod | Supported (agency + review literature; see `EVIDENCE` in biological model) | Timing phases OK as **Modeled** regional windows |
| Geographic variation (earlier south / later north) | Supported as tendency | Latitude-informed windows; never day-precise cast |
| Individual variation (age, dominance, nutrition, stress) | Supported | Always disclose individual/herd uncertainty |
| Nutrition / winter stress can advance cast | Supported as tendency | Searchability/Timing note — not a cast trigger button |

### 4.2 Must remain Unknown or lightly coached

| Topic | Why |
| --- | --- |
| Exact cast day for a property | Not knowable from remote data |
| Buck density / sex ratio on a parcel | Not available without survey |
| “This saddle always holds sheds” | Anecdote ≠ evidence |
| Age of animal from a shed without inspection protocol | Optional user metadata only |

### 4.3 Provenance for biology claims

Any biology coach line must cite:

- evidence class  
- source class (literature / agency / user observation / model)  
- geographic applicability (e.g. northern winter vs southern)  
- known disagreements (e.g. aspect preference — Pauley / E14 style)

Keep expanding `WaypointShedsBiological.EVIDENCE` rather than inventing free-text certainty.

---

## 5. Winter habitat — claim ladder

| Feature | If Observed | If Derived | If Modeled | If Unknown |
| --- | --- | --- | --- | --- |
| Conifer / thermal cover | User note or land-cover class | — | “candidate thermal cover” from cover class | no boost |
| Solar exposure / aspect | — | aspect from DEM | soft sun-bias heuristic with regional caveat | no claim |
| Wind exposure | — | rough from DEM + wind | weak heuristic only | Unknown |
| Snow depth | measured / authoritative snow product | SWE water-eq ≠ depth (disclose) | never invent depth | Unknown |
| Snow crust | rare in public feeds | — | do not invent | Unknown |
| Browse / ag / mast | user note or crop/land-cover | — | “possible food adjacency” | Unknown |
| Water / wetlands | hydro/wetland layers or note | — | proximity heuristic | Unknown |
| Edge habitat | NLCD edge metrics / note | edgeM in GIS pack | — | Unknown |
| Human disturbance | user pressure notes | — | down-weight disturbed pockets (heuristic) | Unknown |

**Rule:** Prefer authoritative public rasters/vectors when available (NLCD, DEM, wetlands, hydro). Do not add a dataset merely because it exists — it must improve a user decision with honest resolution and freshness labels.

---

## 6. Movement — heuristics vs evidence

Traditional hunting language (funnels, saddles, benches, ridgelines) is often **heuristic**.

| Concept | Product treatment |
| --- | --- |
| Terrain funnel / saddle / bench | Modeled *candidate* from DEM morphology — label **heuristic** until validated |
| Field edge / cover transition | Stronger when Derived from land cover; else Modeled |
| Trails / crossings / fences | Prefer Observed notes; GIS fence layers only with source disclosure |
| Bedding↔feeding travel | Modeled relationship language only; never “deer commute here” |
| Roads / streams | Observed map features + Modeled cost/constraint language |

Do **not** assume every traditional hunting heuristic is scientifically established. Document each as:

`heuristic | literature-supported tendency | observed-only | research required`

---

## 7. Environmental context — source classes to prefer

Investigate (do not auto-ship) authoritative sources:

| Domain | Example source classes |
| --- | --- |
| Elevation / slope / aspect | USGS 3DEP / DEM via existing Open-Meteo elev or direct tiles |
| Land cover / forest | USDA NLCD, tree canopy where available |
| Wetlands / hydro | NWI / state hydro |
| Weather / snow | NOAA / NWS / Open-Meteo / SNODAS-class products |
| Drought | USDM |
| Public / protected land | USGS PAD-US, USFS, USFWS, state wildlife (e.g. PASDA SGL already) |
| Agriculture | CDL / state ag where resolution helps shed search |
| Biology / management | State wildlife agencies, peer-reviewed ecology |

Every integration requires: resolution, vintage, license, offline feasibility, missing-data behavior, and UI provenance.

---

## 8. Stewardship & ethics (product, not footer)

Ethics sheet exists; V3 must **surface stewardship inside field decisions**.

Integrate when reliable:

| Topic | Behavior |
| --- | --- |
| Winter wildlife disturbance | Warn when MODEL suggests candidate concentration / deep-snow yards |
| Sensitive / protected lands | Show access context layers; never encourage illegal entry |
| Seasonal closures | Jurisdiction rules when **authoritative** data available |
| Private property | Access awareness; no parcel trespass coaching |
| Wetlands / fragile soils | Soft caution near wet soils when layer present |
| Leave No Trace | Short field tips in briefing / More — not a quiz |
| Repeated disturbance | Coverage + revisit coaching: don’t hammer the same wintering pocket |
| Bedding/refuge language | Prefer “candidate cover — approach carefully / glass first” over “go into the beds” |
| Shed collection legality | Jurisdiction notes only from reliable sources; else Unknown |

Stewardship lines are **Observed** (rule layer) or **Modeled caution** — never moralizing fake certainty.

---

## 9. Explainability contract

Any score or recommendation must answer:

1. What inputs?  
2. What source / freshness / resolution?  
3. What weights / assumptions?  
4. What is missing?  
5. What evidence class is each factor?  
6. What should the hunter do next?

Template (wording flexible):

```
HIGHER MODELED SEARCH POTENTIAL
Why (Modeled / Derived / Observed):
  • south-facing slope (Derived)
  • nearby winter cover class (Observed land cover)
  • field/forest edge (Derived)
  • terrain funnel heuristic (Modeled)
  • recent cold period (Observed weather)
Confidence: MODERATE — support for guidance
Missing: current snow depth; recent local deer observations
Stewardship: winter concentration possible — minimize repeated pressure
```

**No mystery score.**

---

## 10. Offline & privacy (ecology implications)

| Principle | Implication |
| --- | --- |
| Local-first observations / sessions | Ecology coaching must degrade gracefully without inventing live weather/GIS |
| Network tiles / weather / SGL | Offline = honest Unavailable, not stale certainty theater |
| No cloud upload by default | Biological notes stay private unless user exports |
| Model version stamped on sessions | Old walks not silently re-scored into new “truth” |

---

## 11. Acceptance tests for future ecology work

A change fails review if it:

1. Uses banned certainty language on primary surfaces  
2. Mixes Observed and Modeled without labels  
3. Fills empty GIS with decorative heat  
4. Treats snow water-equivalent as snow depth without disclosure  
5. Encourages entering sensitive wintering areas without stewardship caution  
6. Ships a dataset without resolution/freshness/confidence UI  
7. Collapses Timing + Habitat + Searchability into one opaque “score”

---

## 12. Research required (explicit)

Before claiming product truth, research:

- Regional aspect preference disagreement (already flagged in model evidence)  
- Snow-depth products usable on phone at field resolution  
- Jurisdiction-specific shed possession / collection rules (US state matrix)  
- Which DEM morphometrics reliably approximate “funnels” vs hunter folklore  
- Conifer thermal cover proxies from NLCD vs true forest structure  
- Ethical UX patterns for wintering-yard avoidance (agency guidance)

Document findings under `docs/sheds/` before weighting them into Habitat MODEL.
