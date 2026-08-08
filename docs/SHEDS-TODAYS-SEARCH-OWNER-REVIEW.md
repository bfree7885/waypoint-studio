# Sheds — Today’s Search + Observation Heatmaps — Owner Review

**Branch:** `feature/sheds-todays-search`  
**Author:** Bryan Freeman  
**Status:** Ready for owner review — **do not merge** until approved.  
**Date:** 2026-08-07

## Goal

Make Sheds immediately useful for a whitetail hunter *today*, with:

1. **Today’s Search** — transparent condition briefing over the full-screen map  
2. **Observation-driven heatmaps** — heat from the user’s private notes only

## What shipped

### Today’s Search (`sheds-todays-search.js`)

Primary bottom sheet now labeled **Today’s Search**. On open it answers:

| Question | Surface |
| --- | --- |
| When are conditions most favorable today? | Ranked morning / midday / evening windows |
| Which windows deserve attention? | Best window highlighted + why lines |
| Nearby areas / terrain types | Terrain analysis + optional planner pocket |
| Environmental signals | Fact / analysis / pattern / uncertain tags |
| What is uncertain? | Explicit uncertainty list + confidence |

Live inputs (when available) via **Open-Meteo**: temperature, wind, surface pressure trend, precipitation, snowfall sum, sunrise/sunset. Seasonal timing still uses the existing biological latitude heuristic.

### Observation storage (local / private)

`localStorage` key `waypoint-sheds-observations-v1` (unchanged store, extended fields):

- date/time (`observedAt`)
- location
- type (includes deer seen / sign)
- optional sex / class
- optional notes, habitat, quantity, confidence
- weather snapshot at save (from live package when present)
- optional photo **reference string** (not uploaded)

No cloud backend. Export JSON remains user-controlled.

### Observation heat (`sheds-observation-patterns.js`)

- Heat mode toggle: **Estimated opportunity** (biological) vs **Observed activity** (notes only)
- Filters: morning · midday · evening · season · weather-at-note · date range
- Empty filter ⇒ **empty heat** (no demo fill)
- Patterns inform Today’s Search only when ≥5 activity notes across ≥2 days

### Labeling contract

- **Observed activity** — points / heat from user notes  
- **Pattern derived from observations** — aggregates when sufficient  
- **Estimated opportunity** — biological walk-priority model  

Never framed as exact deer GPS or shed certainty.

## Tests

```bash
node automation/test-sheds-todays-search.mjs
node automation/test-sheds-observation-heat.mjs
node automation/test-sheds-planner.mjs
node automation/test-sheds-sprint6.mjs
```

## Screenshots

See `docs/screenshots/sheds/`:

- `todays-search-collapsed.png`
- `todays-search-expanded.png`
- `observed-activity-filters.png` (when captured)

## Live data sources

| Source | Use |
| --- | --- |
| Open-Meteo forecast API | Current wx, hourly pressure/precip, daily snow/sunrise/sunset |
| Open-Meteo elevation | Biological heat refine (unchanged) |
| Browser geolocation | Optional user position (denied → honest partial briefing) |
| OSM / OpenTopoMap tiles | Basemap (provider sees approximate tile requests) |

No NWS alerts wired in this change. Moon phase is **not** used as a deer-behavior predictor.

## Limitations (honest)

1. Crepuscular window preference is **field practice / soft analysis**, not a location forecast.  
2. Wind → fence-line and snowmelt → south-aspect lines are interpretive, not proven for every property.  
3. Observation heat only appears after the user logs notes — first-run map is intentionally empty in observed mode.  
4. Weather filter on heat only matches notes that saved a snapshot.  
5. Photos are reference strings only — no gallery/upload.  
6. Land-cover still unavailable in the biological model.  
7. Patterns need enough private history; until then Today’s Search says so.  
8. Tile/weather providers still see approximate request locations.

## Recommendation

**Do not merge yet.** Owner should walk the map on phone + desktop:

1. Confirm Today’s Search language feels honest and useful  
2. Deny location once — confirm partial/denied states  
3. Toggle Observed activity with zero notes — confirm empty heat  
4. Add several deer/sign notes across days — confirm patterns + heat  
5. Approve or request copy/scoring tweaks before merge
