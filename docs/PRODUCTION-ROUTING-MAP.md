# Production Routing Map

**Date:** 2026-07-18

## Canonical public entry points

| Product | Canonical URL | Notes |
|---|---|---|
| Studio Home | `/` (`index.html`) | App directory |
| Settings | `/settings.html` | Shared identity/places |
| About / Privacy / Contact / Support | root HTML | Footer SoT |
| Dashboard | `/apps/dashboard/` | Live |
| ForageCast | `/apps/foragecast/` | Live |
| Fieldry | `/apps/fieldry/` | Live |
| Photo Coach | `/apps/photo-coach/` | Live |
| Hidden Landscapes | `/apps/hidden-landscapes/` | Experimental |
| Photo Library | `/apps/photo-library/` | Live/early |
| Scenes hub | `/apps/scenes/` | Directory only |
| Sheds | `/apps/shed-hunting/` | Foundation; map at `map/` |
| SignalTerrain | `/apps/signalterrain/` | Foundation |
| Steepleaf | `/apps/steepleaf/` | Early access |
| Savant | `/apps/savant-sommelier/` | Early access |
| Volunteer | `/apps/waypoint-volunteer/` | Foundation |
| Landscape Interpretation | `/apps/landscape-interpretation/` | Experimental educational reader (Sprint 9) |

## Redirects / aliases

| Legacy / duplicate | Target |
|---|---|
| `/map/` | `/apps/shed-hunting/map/` |
| `/apps/scenes/photo-coach/` | `/apps/photo-coach/` |
| `/apps/scenes/hidden-landscapes/` | `/apps/hidden-landscapes/` |
| `/apps/scenes/photo-library/` | `/apps/photo-library/` |
| `/apps/terrainbound/` | `/apps/fieldry/` |
| `/apps/signalterrain/cyber/` | `live.html` |

## Foundation route rule

Paths in `foundation.json` are **app-relative** (no leading `/` for in-app links).  
`WDS.platformFoundation.routeHref` strips a leading `/` if present.

## Do not advertise (not ready)

- Sheds `species/`, `finds/`, `forecast/` (`ready: false`)
- Landscape Interpretation as GIS / verified land-history (field reader is educational only)
- Volunteer as live regional feeds (demo catalog)
