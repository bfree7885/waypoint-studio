# Waypoint Scenes — Architecture

Waypoint Scenes is one product with five experiences. Working tools remain in their current app paths; `apps/scenes/` is the modular platform shell, navigation home, and future engine boundary.

## Modules

| Module | Purpose | Live tool today |
|--------|---------|-----------------|
| **Photo Coach** | Critique and long-term coaching from each photograph | `/apps/photo-coach/` |
| **Hidden Landscapes** | Beyond-human vision literacy (IR, UV, full spectrum, polarization, species) | `/apps/hidden-landscapes/` (+ Animal Vision) |
| **Living Scenes** | Motion, weather, seasonal, and environmental immersion from stills | Scaffold module only |
| **Scene Builder** | Interactive educational / storytelling scenes from photographs | `/apps/waypoint-scenes/` |
| **Photographer Profile** | Lifelong private companion for style, strengths, themes, growth | `/apps/photo-coach/profile/` |

Platform routes live under `/apps/scenes/<module>/`. They introduce the experience, link back to the Scenes home, and deep-link to working tools without relocating Photo Coach code.

## Folder map

```
apps/scenes/
  index.html                 # product landing (five cards)
  photo-coach/               # module landing → live Photo Coach
  hidden-landscapes/         # module landing → HL + Animal Vision
  living-scenes/             # module landing (planned)
  scene-builder/             # module landing → live builder
  photographer-profile/      # module landing → live profile
  data/experiences.json      # shared experience catalog
  css/scenes-home.css
  js/scenes-platform.js      # optional catalog helpers (experiences.json)
  js/engines/                # interface-only engines
  assets/media/              # shared photography for the platform UI
  docs/ARCHITECTURE.md
```

Landing and module pages are finished static HTML (no loading placeholders). `experiences.json` remains the shared catalog for documentation and future dynamic surfaces.

Working implementations stay put:

- `apps/photo-coach/` — do not rewrite
- `apps/hidden-landscapes/`
- `apps/animal-vision/`
- `apps/waypoint-scenes/`

## Shared data models

**Experience** (`data/experiences.json`) — id, title, status, summary, description, module path, tool hrefs, engine id, photography metadata.

Future shared contracts (documented; not fully implemented):

- **CoachingSession** — image ref, critique, opportunities → ProfileEngine
- **ImageSet** — multi-mode frames (see Hidden Landscapes) → VisionEngine
- **SceneDocument** — layers, annotations, export → SceneEngine
- **LivingTimeline** — effect ids + keyframes → AnimationEngine
- **PhotographerProfile** — aggregated evidence → ProfileEngine

## Engine interfaces (scaffold only)

| Engine | Responsibility |
|--------|----------------|
| `SceneEngine` | Scene graph, educational layers, export |
| `VisionEngine` | Spectrum / species rendering for Hidden Landscapes |
| `CoachEngine` | Critique facade over Photo Coach (no rewrite) |
| `ProfileEngine` | Lifelong profile ingest + growth summaries |
| `AnimationEngine` | Living Scenes motion / weather / season effects |

All engines currently reject or return empty stubs with `TODO` markers. No experimental implementations.

## How modules communicate

1. **Navigation** — App Shell local nav + module sibling nav + always “Back to Waypoint Scenes”.
2. **Catalog** — `experiences.json` is the single source for landing cards and module copy.
3. **Deep links** — Module pages link to existing apps; engines will later wrap those apps instead of duplicating them.
4. **Data handoff (future)** — CoachEngine sessions → ProfileEngine; ImageSet / session refs → SceneEngine / VisionEngine / AnimationEngine via local ids only.
5. **Privacy** — Local-first by default; no engine uploads image bytes unless a future explicit sync option exists.

## Future AI integration points

- `CoachEngine.analyze` — on-device or opted-in coaching models (wrap existing Photo Coach).
- `VisionEngine` + `TODO(ai-analysis)` — explanations for why a mode looks different.
- `ProfileEngine.summarizeGrowth` — longitudinal insights from stored sessions.
- `AnimationEngine` / `SceneEngine` — guided effect suggestions (never required for core export).

## Success bar

Scenes should feel like one polished product. Module pages are finished introductions, not empty stubs with lorem ipsum. Engine files are interfaces only until a dedicated implementation milestone.
