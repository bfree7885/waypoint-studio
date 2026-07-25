# Waypoint Scenes — Architecture

Waypoint Scenes is one product with five experiences. Working tools remain in their current app paths; `apps/scenes/` is the modular platform shell, navigation home, and future engine boundary.

**Foundation milestone (Work Block 1):** polished Scenes landing, shared navigation, Photo Coach preserved at its stable path, Hidden Landscapes Studio V0.1, and restrained product previews for Living Scenes, Scene Builder, and Photographer Profile. Status labels use Available / Experimental / Preview / Future experience — not a roadmap checklist.

**Shoot Review (Work Block 3):** Photo Coach at `/apps/photo-coach/` now reviews a full session (queue, Shoot Summary, grouping, private Keep/Maybe/Reject/Favorite labels, best-of categories, session stats). See `apps/photo-coach/docs/SHOOT-REVIEW.md`. Importer handoff is interface-only via `WaypointPhotoCoachImporterBridge`.

**Photo Library (Work Block 4):** Shared local catalog at `/apps/photo-library/` — `PhotoLibraryEngine`, IndexedDB originals, collections/search/filters, and `?libraryId=` handoff into Photo Coach / Hidden Landscapes. See `apps/photo-library/docs/PHOTO-LIBRARY.md`.

**Portfolios (Portfolio Foundation):** Purpose-driven curated sets at `/apps/scenes/portfolio/` — localStorage `waypoint-scenes-portfolios-v1`, ordered Library image refs, cover, notes, observational candidate suggestions from existing labels/ratings/coach notes. Distinct from Photo Coach session “portfolio” history and from light Library collections. See `docs/scenes/current-state-reconciliation.md`.

**Portfolio Assistant / Coach / Builder:** Candidate review (`assistant.html`), comparative coaching, and Auto Portfolio Builder (`builder.html`) — local-first drafts from real Library signals only. Builder store: `waypoint-scenes-portfolio-builder-sessions-v1`.

## Modules

| Module | Purpose | Status on platform | Live tool today |
|--------|---------|--------------------|-----------------|
| **Photo Coach** | Critique and long-term coaching from each photograph | Available | `/apps/photo-coach/` |
| **Hidden Landscapes** | Creative landscape interpretations + spectral literacy | Experimental | `/apps/hidden-landscapes/` |
| **Living Scenes** | Subtle motion and atmosphere on stills | Future experience | Preview page only |
| **Scene Builder** | Interactive photographic environments and stories | Preview | `/apps/waypoint-scenes/` (early studio) |
| **Photographer Profile** | Private lifelong companion for how you see | Preview | `/apps/photo-coach/profile/` (early companion) |
| **Portfolios** | Purpose-driven curated sets from the private library | Available | `/apps/scenes/portfolio/` |

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
  portfolio/                 # purpose portfolios (CRUD + candidates)
  data/experiences.json      # shared experience catalog
  css/scenes-home.css
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

## Engine interfaces

| Engine | Responsibility | Status |
|--------|----------------|--------|
| `SceneEngine` | Scene graph, educational layers, export | Interface only |
| `VisionEngine` | Creative transformations + future spectral ImageSets | **Prototype in Hidden Landscapes Studio** |
| `CoachEngine` | Critique facade over Photo Coach (no rewrite) | Interface only |
| `ProfileEngine` | Lifelong photographer companion from analyses | **Live via Photo Coach growth store** |
| `AnimationEngine` | Living Scenes motion / weather / season effects | Interface only |

### Photographer Profile / ProfileEngine

Live at `/apps/photo-coach/profile/`. Local-first (`localStorage` growth keys).

- **Learning pipeline:** Photo Coach analysis → `PhotoRecord` / `Shoot` → `ProfileRepository.recalculate()` → `WaypointPhotoCoachProfileEngine.compute()`
- **Outputs:** Photography DNA, gentle observations, favorites (subjects, locations, seasons, time, lenses, light), growth trends, project suggestions rooted in history, curiosity insights, confidence timeline
- **Principles:** No likes, followers, rankings, or grades in the companion voice. Soft language (“It appears…”, “You may enjoy…”). Never fabricate missing location/season/EXIF data.
- **Privacy:** Private by default; no cloud upload; future sync must be opt-in
- **Future AI:** on-device or opted-in narrative summaries over the same local evidence model
- **Community:** any future sharing is opt-in and separate from the private companion

Scenes bridge: `apps/scenes/js/engines/profile-engine.js` delegates to the Photo Coach repository when scripts are co-loaded.

### Hidden Landscapes VisionEngine prototype

Live at `/apps/hidden-landscapes/`. Canvas 2D, local-only.

- Transformation registry: `apps/hidden-landscapes/data/transformations.json`
- Processors: `hl-transforms.js` (separate from UI)
- Factory: `HiddenLandscapesVision.createVisionEngine`
- Honesty: creative simulations ≠ genuine IR/UV/full-spectrum/thermal/animal vision
- Future: real `ImageSet` frames from converted cameras and filters

Shared stub remains in `apps/scenes/js/engines/vision-engine.js` for registry completeness.

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
