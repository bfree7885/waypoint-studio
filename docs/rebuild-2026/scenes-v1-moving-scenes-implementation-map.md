# Scenes V1 Attack 3 — Moving Scenes Implementation Map

**Branch:** `feat/scenes-v1-moving-scenes`  
**Base:** Auto Edit ship `54cbef98` (#36)  
**Dashboard:** FROZEN

## Authoritative paths

| Concern | Path |
|---------|------|
| Moving Scenes app | `apps/moving-scenes/` |
| Hub aliases | `apps/scenes/moving-scenes/`, `apps/scenes/living-scenes/` (redirect) |
| Analyze / Choice / Render | `ms-analyze.js`, `ms-choice.js`, `ms-render.js` |
| Assist / Compare / Export / Store | `ms-assist.js`, `ms-compare.js`, `ms-export.js`, `ms-store.js` |
| Library SoT | `pl-models.js` (`movingScenes` + legacy `livingScenes`), `pl-ui.js`, `pl-engine.js` |
| Auto Edit handoff | `apps/auto-edit/` → Make it move link after save |
| Nav | `wds-app-nav-config.js`, `nav-registry.json` |
| Fixtures / tests | `automation/fixtures/moving-scenes/`, `automation/test-moving-scenes.mjs` |
| Owner gallery | `docs/rebuild-2026/scenes-v1-moving-scenes/` |

## Living Scenes audit (KEEP / REBUILD / DORMANT / REMOVE FROM PROD)

| Asset | Verdict | Notes |
|-------|---------|-------|
| `apps/scenes/living-scenes/` placeholder | **REBUILD → redirect** | User-facing name Moving Scenes; path kept as alias |
| `apps/waypoint-scenes/` overlay effects (fog/rain/fireflies/cloud DOM) | **DORMANT** | Prototype invents weather particles; not product path |
| `scene-analyzer.js` band heuristics | **REBUILD** | Reborn as confidence-gated `ms-analyze.js` |
| `export.js` video stubs | **REMOVE FROM PROD path** | Replaced by `ms-export.js` MediaRecorder |
| Parallax / Ken Burns helpers | **DORMANT** | Not core; omitted when artifact-prone |
| Engine registry under waypoint-scenes | **KEEP (dormant)** | Available for experiments; not Wired as V1 default |

## Supported V1 classes

- **clouds** — localized sky/cloud warp
- **water** — typed lake/river/pool when confident
- **fog / haze** — soft breathe when coverage credible

## Deferred

foliage, grass, rain invent, snow invent, stars invent, light invent, parallax/Ken Burns, wildlife body animation

## Storage

| Key | Role |
|-----|------|
| `waypoint-moving-scenes-recipes-v1` | Recipe index |
| IDB `moving-{originalId}-v{n}` | Moving derivative blob |
| `moduleRefs.movingScenes` | Link from ORIGINAL |
| `role: moving-scene` sibling | Catalog row (never replaces original/edit) |
