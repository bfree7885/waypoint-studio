# Whitetail Biological Model v2.0 (Phase 1 prediction truth)

**Species:** *Odocoileus virginianus* (white-tailed deer)  
**Product:** Sheds field intelligence — Waypoint Studio  
**Implementation:** `apps/shed-hunting/js/sheds-biological-model.js` (+ `sheds-timing.js`, `sheds-habitat.js`, `sheds-searchability.js`, `sheds-confidence.js`)  
**Factor config version:** `2.0.0`  
**Owner review:** `docs/sheds/SHEDS-2-PHASE-1-PREDICTION-TRUTH.md`  
**This is not machine learning.** Scores are transparent ecological heuristics for relative walk guidance — **never** a probability that an antler is present.

---

## Version history

| Version | Notes |
|---------|-------|
| 1.0.0 | Initial factor catalog, evidence index, confidence channels |
| 1.1.0 | Map integration: season phases + override, observation recency + diminishing returns, presets, field validation store, session model stamps, coarse→refine heat, retired planner coverage double-apply |
| **2.0.0** | Phase 1 prediction truth: habitat channel excludes season/weather from spatial heat; timing/searchability/confidence separated; shed-find interest capped; provenance classes |

---

## Authoritative pipeline (Phase 1)

```
map-app.recomputeHeat (gen token; coarse then refine)
  → Likelihood.buildGrid (habitat-only; empty when no notes/elev)
  → Biological.scoreCell({ channelMode: "habitat" })
  → heat layer (habitatInterest) + channel panel + Explain
  → Planner.plan (requires habitat signal; distance bias)
Timing / Searchability / Confidence evaluated separately for UI
```

Legacy independent likelihood formulas are not active. `WaypointShedsLikelihood` is a grid wrapper only.

---

## Language contract

| Term | Meaning |
|------|---------|
| Search priority | Relative walk-next attractiveness in the visible map |
| Biological suitability | Additive ecology score before search/coverage/access multipliers |
| Confidence | Strength of support for guidance — not find chance |
| Probability of find | Not computed and never implied |
| Observed | User field notes on this device |
| Inferred | Elevation neighborhoods or optional land-cover hints |
| Ecological assumption | Literature-backed rule when data are sparse |
| User preference | Weights, season override, presets |

---

## Seasonal phases

`pre_shed` · `early_shed` · `peak_shed` · `late_shed` · `post_shed` · `outside` · `unknown`

Derived from date + latitude; optional user override is preference, not fact. Timing varies by animal, age, health, nutrition, weather, and local conditions.

---

## Observation influence

Documented in code `INFLUENCE`: spatial radii, recency half-lives, confidence multipliers, shed freshness, diminishing-return stack `[1, 0.55, 0.30, 0.18, 0.10]`, plus `MAX_FACTOR_FRACTION` (0.28).

Field validation (`waypoint-sheds-validation-v1`) stores evidence with `treatAsBiologicalTruth: false`.

---

## Presets

`sheds-model-presets.js`: Balanced, Early season, Peak shed, Late season, Deep snow, Low snow, Feeding transitions, Bedding and cover, Travel corridors, Revisit planning. Reset restores balanced defaults.

---

## Model versioning

Sessions and validation snapshots store `modelVersion`, `factorConfigVersion`, `activePreset`, `regionalContext`, `dataCoverageSummary`, `inputDataTimestamp`. Old sessions are not silently reinterpreted.

---

## Terrain and habitat sources

| Input | Source | Method | Limitations |
|-------|--------|--------|-------------|
| Elevation | Open-Meteo | Viewport samples | Network; cached by bounds key |
| Slope/aspect | Derived | Finite differences | Needs neighbors |
| Microforms | Derived | 3×3 elev hints | Not surveyed landforms |
| Land cover | Optional category | Lookup | Unavailable by default — not invented |
| Weather | Open-Meteo | Snow/temp/wind | Crust unavailable |

---

## Research (core, from v1.0)

Casting: photoperiod/testosterone (MU Extension G9486; agency assessments; QDMA). Winter thermal/snow: Armstrong 1983; Schmitz 1991; MSU habitat cover; MN DNR WSI; Moen 1976; DelGiudice et al. Aspect **disagreement** documented (Pauley 1988 / E14). Fences/gaps and hunting movement: Peterson 2011; Can. J. Zool. hunting behavior.

Evidence objects E01–E14 live in `WaypointShedsBiological.EVIDENCE`.

---

## Privacy keys

`waypoint-sheds-observations-v1`, `sessions-v1`, `coverage-v1`, `validation-v1`, `model-prefs-v1`, `map-view-v1`.

---

## Limitations and deferred

No ML. No inventable land cover. No road impedance, crust sensing, multi-species, or accuracy marketing claims.

---

## Tests

```bash
node automation/test-sheds-biological-model.mjs
node automation/test-sheds-integration-v1.1.mjs
node automation/test-sheds-map.mjs
node automation/test-sheds-planner.mjs
node automation/test-sheds-map-cdp.mjs
```

Factor catalog and base shares remain in `sheds-biological-model.js` (authoritative configuration).
