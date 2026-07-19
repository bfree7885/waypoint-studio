# ForageCast Outdoor Intelligence Engine (Phase 2)

**Date:** 2026-07-18  
**Status:** Implemented locally — not committed / not pushed  
**Depends on:** Product Recovery Phase 1 (summary-first shell)

---

## Purpose

Transform ForageCast from a weather/data surface into an **outdoor decision-support system** that interprets conditions the way an experienced naturalist would — with transparent scoring, not opaque “AI magic.”

---

## Layered architecture

```
Raw observations
    → Derived environmental conditions
        → Species suitability models (weighted scores)
            → Confidence calculations
                → Natural-language explanations
```

| Layer | Module | Responsibility |
|-------|--------|----------------|
| 1 Observations | `js/oie/foragecast-oie-observations.js` | Extract provider/model facts only |
| 2 Derived | `js/oie/foragecast-oie-derived.js` | Rainfall trends, soil persistence, drying/drought, heat accumulation, nighttime cooling, humidity, swings, phenology |
| 3 Scoring | `js/oie/foragecast-oie-scoring.js` | Transparent weighted suitability per species |
| 4 Confidence | `js/oie/foragecast-oie-confidence.js` | Why high/low, what changed, what would improve/reduce |
| 5 Explain | `js/oie/foragecast-oie-explain.js` | Opportunities, momentum, forecast intelligence, naturalist insights |
| Map contract | `js/oie/foragecast-oie-map-contract.js` | Interfaces for future spatial overlays (no unfinished UI) |
| Engine | `js/oie/foragecast-oie-engine.js` | Orchestration + memory/localStorage cache |

`ForageCastIntelligence.buildSummary()` delegates to `ForageCastOIE.engine` when loaded.

---

## Environmental interpretation signals

Derived (not merely displayed):

- Recent rainfall trends  
- Soil moisture persistence  
- Drying periods / extended drought  
- Heat accumulation (GDD-style proxy)  
- Nighttime cooling pattern  
- Humidity persistence  
- Temperature swings  
- Seasonal progression / phenological timing  

Future-ready scoring slots (neutral until data exists): elevation, slope/aspect, canopy.

---

## Species suitability scoring

Each species receives a **0–1 suitability score** from weighted factors:

- Recent precipitation  
- Temperature patterns (fit to species `idealTemp`)  
- Humidity  
- Soil moisture  
- Seasonal timing (peak day / spread)  
- Elevation / slope-aspect / canopy (future-ready, currently neutral)

Every score exposes:

- Factor values  
- Weights  
- Contribution ranking  
- Top drivers  
- Limiting factors  

Legacy `species-model.json` weights map into this framework when present.

---

## Confidence explanations

For each species the engine answers:

1. Why confidence is high (or low)  
2. What changed since yesterday (prior cached score when available)  
3. What would improve confidence  
4. What would reduce confidence  

Bands: High / Moderate / Low — tightened when live weather is missing or factors disagree.

---

## Today’s best opportunities

Prioritized briefing lines, e.g.:

> Chanterelles — High confidence due to sustained moisture…

Emphasis on interpretation; numeric readiness remains secondary.

Momentum labels: Improving · Stable · Declining · Rapidly improving · Rapidly declining (with why).

---

## Forecast intelligence

Forecast rows are interpreted into field-relevant statements (improve after rain, warm nights extend window, drying reduces productivity, heavy rain may limit access) — never a raw dump of mm/°C alone.

---

## Map intelligence preparation

`ForageCastOIE.map` defines overlay contracts:

- Heat maps  
- Habitat suitability  
- Species overlays  
- Observation density  
- Public land overlays  
- Terrain-derived suitability  

`createSpatialRequest()` returns architectural requests only.  
`schematicSuitability()` powers today’s educational schematic map — not georeferenced detection.

---

## Performance

- Derived + scored packages cached in memory (~3 minutes by observation key)  
- Prior species scores stored in `localStorage` for “since yesterday” deltas  
- UI calls `evaluate()` / `buildSummary()` instead of recomputing factor math ad hoc  
- Expensive zone blends remain optional soft inputs

---

## Tests

```bash
node automation/test-foragecast-oie.mjs
node automation/test-foragecast-recovery.mjs
```

---

## Remaining limitations (honest)

1. Suitability ≠ confirmed fruiting.  
2. Soil moisture is inferred, not from in-situ probes.  
3. Spatial factors are neutral until real elevation/aspect/canopy inputs exist.  
4. Five supported species only (no placeholder species added).  
5. Map overlays remain contract-only.  
6. Provider failover still limited (Open-Meteo primary).  

---

## Path to a solid V1.0

1. Real terrain-derived inputs for elevation/aspect/canopy.  
2. Broader species library with per-species models.  
3. Georeferenced habitat overlays using the map contract.  
4. Multi-provider weather + clearer freshness chrome.  
5. Offline last-known derived package for field use.
