# Scenes Imaging Architecture (companion)

**Status:** Design companion to [`create-explore-owner-review.md`](./create-explore-owner-review.md)  
**Engine name:** **Scenes Imaging Engine (SIE)**  
**Not implemented** — contracts and migration notes only.

---

## One sentence

SIE is the single local-first runtime that turns a photograph into an honest preview and export — whether the user is **creating** atmosphere (Living Scenes) or **exploring** alternative ways of seeing (Hidden Landscapes, Animal Vision).

---

## Layer stack

```
┌─────────────────────────────────────────────────────────────┐
│ Product surfaces (Create / Explore)                         │
│  Living Scenes UI · HL Studio · Animal Vision UI            │
├─────────────────────────────────────────────────────────────┤
│ Stage kit (shared UX primitives)                            │
│  upload · preview shell · compare · intensity · honesty     │
│  reduced-motion · export affordances                        │
├─────────────────────────────────────────────────────────────┤
│ Scenes Imaging Engine (SIE)                                 │
│  Source → Graph → Frame → Export + Provenance               │
├─────────────────────────────────────────────────────────────┤
│ Processors (pluggable)                                      │
│  spectral-inspired remaps · species vision · atmosphere FX  │
├─────────────────────────────────────────────────────────────┤
│ Shared media (optional)                                     │
│  Photo Library ids · session handoff · ImageSet scaffolds   │
└─────────────────────────────────────────────────────────────┘
```

Coach critique, Profile growth math, and Dashboard weather are **outside** SIE.

---

## Core types (logical)

| Type | Fields (minimal) | Notes |
|------|------------------|-------|
| `ImageSource` | `id`, `kind` (`file`\|`library`\|`blob`), `naturalSize`, `processSize`, `buffer` | Downscale policy: max edge ~1600 for preview transforms |
| `AccuracyLabel` | `accuracyType`, `requiresSpecialCapture`, `disclaimer` | Required on every Explore node; Create may use `creative-atmosphere` |
| `TransformNode` | `id`, `family` (`explore-spectral`\|`explore-animal`\|`create-atmosphere`), `params`, `intensity` | Processors are pure where possible |
| `EffectNode` | `id`, `layer` (`dom`\|`canvas`), `enabled`, `opacity`, `speed`, `density`, `direction` | From Living Scenes / waypoint-scenes registry |
| `ImagingGraph` | `sourceId`, `nodes[]`, `composeMode` (`replace`\|`overlay`) | Explore usually one replace node; Create overlays effects |
| `StageFrame` | `original`, `result`, `timestamp`, `reducedMotion` | What the stage blits |
| `ExportSpec` | `format`, `includeMetadata`, `filenameHint` | Local download only by default |
| `ImagingProvenance` | graph snapshot + accuracy labels + engine version | Attached to exports / gallery later |

---

## API surface (target)

Conceptual methods — stubs may mirror these names without full behavior:

```
createEngine(options) → engine

engine.loadSource(input)           // File | libraryId | ImageBitmap
engine.setGraph(graph)
engine.setCompareMode(mode)        // slider | side | toggle
engine.render()                    // → StageFrame
engine.updateParam(nodeId, patch)  // intensity / effect params
engine.export(spec)                // → Blob + provenance
engine.dispose()
```

Facades remain for product clarity:

- `VisionEngine` → SIE graph with Explore processors only  
- `AnimationEngine` → SIE graph with Create effect nodes + RAF loop  
- `SceneEngine` → documents that *reference* SIE graphs (composition / stories)

---

## Processor families

### Explore — spectral-inspired (`hl-transforms` lineage)

Registry-driven RGB remaps (`transformations.json`). Always start from the unchanged source buffer. Intensity blends source ↔ transformed.

### Explore — animal vision (`animal-vision-transforms` lineage)

Species config (`species.json`) + deterministic remaps. Soft periphery / blur are suggestive only; UV modes must stay UV-inspired language.

### Create — atmosphere (`waypoint-scenes` engine lineage)

Registered effects (fog, rain, snow, fireflies, cloud-drift, light-rays, dust, leaf-drift) + camera motion. Respect `prefers-reduced-motion`. Original photograph remains the base plate.

---

## Compare & stage

Reuse HL Studio patterns as the shared Stage kit:

| Mode | Use |
|------|-----|
| Slider | Default desktop Explore compare |
| Side-by-side | Explicit A|B |
| Toggle | Default narrow / touch |

Create stage: continuous preview with optional before/after freeze-frame using the same blit helpers.

---

## Privacy & honesty gates

1. No upload of image bytes without explicit opt-in (none in SIE MVP).  
2. Every Explore result carries an `AccuracyLabel`.  
3. Never invent EXIF, location, season, or spectral channels.  
4. ImageSet future frames attach as additional `ImageSource`s — not fake metadata on RGB remaps.

---

## Migration sketch (no big rewrite)

1. Extract shared decode / downscale / intensity blend / canvas export into `apps/scenes/js/imaging/`.  
2. Point HL VisionEngine and Animal Vision at shared source + export helpers.  
3. Register HL + AV processors under one registry module.  
4. Wrap waypoint-scenes effect runtime as Create processor family.  
5. Retire duplicate compare CSS/JS once Stage kit exists.  
6. Keep product URLs stable; only internals consolidate.

---

## Stub map (this branch)

| Path | Role |
|------|------|
| `apps/scenes/js/imaging/imaging-engine.js` | SIE facade stub |
| `apps/scenes/js/imaging/pipeline.js` | Documented pipeline stages stub |
| `apps/scenes/js/engines/vision-engine.js` | Existing Explore-facing stub (unchanged contract) |
| `apps/scenes/js/engines/animation-engine.js` | Existing Create-facing stub (unchanged contract) |

Stubs reject/no-op with messages pointing here — they do not reimplement HL or Living Scenes.
