# Hidden Landscapes — production path audit (Attack 4)

**Date:** 2026-08-16  
**Branch:** `feat/scenes-v1-hidden-landscapes`

## Verdict table

| Path | Decision | Notes |
|------|----------|-------|
| `apps/hidden-landscapes/index.html` + `js/hl-*.js` (new) | **KEEP / REBUILD** | Authoritative EXPLORE umbrella: Light, Color, Structure, Animal Vision |
| `apps/hidden-landscapes/data/modes.json`, `species.json`, `research-citations.json` | **KEEP** | Catalog + epistemic vocabulary + citations |
| `apps/hidden-landscapes/dormant/*` | **REMOVE FROM PRODUCTION PATH** | Legacy creative false-color studio (`infrared-dream`, etc.) — not loaded |
| `apps/animal-vision/` live studio | **MERGE** | Redirects to `hidden-landscapes/?pillar=animal` |
| `apps/animal-vision/js/*`, `data/species.json` | **DORMANT** | Old deer/bee/turtle transforms retained for reference; not production UI |
| `apps/scenes/hidden-landscapes/` | **KEEP** | Thin redirect to app |
| Creative IR / psychedelic modes | **REMOVE FROM PRODUCTION** | Replaced by honest UNAVAILABLE spectral education |
| Bee UV / Bird UV transforms on user photos | **DEFER** | Educational UNAVAILABLE states only |
| Box turtle prototype | **DEFER** | Insufficient V1 outdoor model vs deer/canine |
| Polarization / hyperspectral / thermal | **DORMANT / FUTURE** | Listed UNAVAILABLE |
| Photo Library `?libraryId=` handoff | **KEEP** | Defaults analysis to Original; Edit optional |
| Moving Scenes / Auto Edit / Coach | **UNTOUCHED** | Frozen / preserved |

## Authoritative production routes

- `/apps/hidden-landscapes/` — studio
- `/apps/animal-vision/` → `/apps/hidden-landscapes/?pillar=animal`
- `/apps/scenes/hidden-landscapes/` → redirect

## Scientific rule

Never present visualizations as signals the camera did not measure. RGB ≠ UV / IR / thermal / polarization / hyperspectral.
