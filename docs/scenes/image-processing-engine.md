# Scenes Image Processing Engine

**Status:** Design only — no product rewrite  
**Branch:** `docs/scenes-image-processing-engine`  
**Base:** `origin/main` @ `59c09deb`  
**Owner review:** [`image-processing-owner-review.md`](./image-processing-owner-review.md)

**Extends (do not replace):**

| Prior artifact | Branch | Relationship |
|----------------|--------|--------------|
| [`imaging-architecture.md`](./imaging-architecture.md) | `docs/scenes-create-explore-architecture` | Still the Create × Explore **pixel** contract (SIE graph → stage → export). This doc widens the platform around it. |
| [`create-explore-owner-review.md`](./create-explore-owner-review.md) | same | Owner verdict for Create/Explore doors; still valid. |
| `apps/scenes/js/imaging/*` stubs | same | Interface-only; pointers updated here. |

If those companion files are missing on a checkout, read them from `origin/docs/scenes-create-explore-architecture`.

---

## One sentence

One local-first **Scenes Processing Platform** feeds every image-based Scenes product from shared media services; **SIE** remains the single pixel runtime for Create/Explore, while Photo Coach and Portfolio Builder consume the same ingest/thumbs/cache path through analysis and curation cores — never a second competing render stack.

---

## Why this doc exists

Prior SIE work correctly scoped **Create** (Living Scenes) and **Explore** (Hidden Landscapes, Animal Vision) onto one imaging runtime and kept Coach critique **out of the transform graph**. That split stays.

What this review adds: inventory of **all** image steps across Photo Coach, Hidden Landscapes, Living Scenes, Animal Vision, and Portfolio Builder, then one reusable pipeline so shared concerns (decode, fit, thumbnails, compare shells, export, dispose, library ids) stop duplicating while product-specific cores stay honest about what they do.

```
Scenes Processing Platform
├── Media Core          ← shared by everyone (bytes in → buffers / thumbs out)
├── SIE (Imaging)       ← Create + Explore pixel graphs (prior SIE)
├── Analysis Core       ← Photo Coach / Shoot Review / PC2 providers
└── Curation Core       ← Portfolio Builder (+ Assistant signals)
```

**Non-contradiction with prior SIE:** Coach critique is still **outside SIE**. It is **inside** the platform via Media Core + Analysis Core. Portfolio Builder does not invent pixels; it ranks library ids.

---

## Product inventory (processing steps)

Sources: `origin/main` live trees plus feature evidence on portfolio / Photo Coach 2 / Create-Explore branches. Maturity labels are honest, not aspirational.

### 1. Photo Coach / Shoot Review

| Step | What happens today | Where |
|------|--------------------|-------|
| Ingest | File upload or `?libraryId=` handoff | `apps/photo-coach/`, `photo-library-client.js` |
| Decode | `Image` + object URL | analysis demo / shoot flow |
| Thumbnail | Downscale → JPEG data URL (~0.68 quality) | `photo-coach-shoot.js` |
| Analysis sample | Fixed sample canvas **200×130**, cover-fit draw | `photo-coach-analysis-demo.js` |
| Signal extract | Luma / sat / edges / blur estimate / thirds / histogram | same |
| Critique compose | Confidence-gated mentoring doc (engine v4) | same |
| Preview overlays | Thirds grid, crop suggestion chrome (DOM) | `photo-coach.js` |
| Session compare | Side-by-side **critique** cards (not pixel slider) | `photo-coach-compare.js` |
| EXIF (optional) | Read-only when present; never invent | shoot / outdoor context |
| Persist | Shoot + session localStorage; thumbs only | shoot store / repository |
| PC2 (feature) | Eleven-section review via provider `analyze(context)` | `feature/scenes-photo-coach-2-architecture` |

**Not imaging transforms.** Coach does not remap RGB for export. It samples for education.

### 2. Hidden Landscapes (Explore)

| Step | What happens today | Where |
|------|--------------------|-------|
| Ingest | File + type/size gates (~28 MB); library handoff available | `hl-vision-engine.js`, studio |
| Decode & fit | Max edge **~1600**; immutable `sourceData` | VisionEngine |
| Transform | Registry processors from `transformations.json` | `hl-transforms.js` |
| Intensity | Source ↔ result blend | `applyIntensity` |
| Stage blit | Original + result canvases | VisionEngine |
| Compare | Slider / side / toggle | `hl-studio.js` |
| Honesty | Accuracy / simulation copy on modes | catalog + UI |
| Export | Local canvas download | `exportImage` |
| Dispose | Revoke URLs; drop canvases | partial |

**Modes (main):** `original`, `infrared-dream`, `crimson-canopy`, `violet-wilds`, `ghost-forest`, `electric-meadow`, `nocturnal-world`, `mono-infrared-study`.

### 3. Animal Vision (Explore companion)

| Step | What happens today | Where |
|------|--------------------|-------|
| Ingest / decode / fit | Same pattern as HL (`drawScaled`) | `animal-vision-transforms.js` |
| Transform | Species remaps + soft blur / periphery | transforms + `species.json` |
| Compare | Side / slider / toggle (duplicate of HL UX) | `animal-vision-app.js` |
| Honesty | Educational / UV-inspired language | docs + UI |
| Export | JPEG/PNG interpretation download | `animal-vision-export.js` |

**Species (main):** `white-tailed-deer`, `honeybee`, `eastern-box-turtle`.

### 4. Living Scenes / Create (atmosphere)

| Step | What happens today | Where |
|------|--------------------|-------|
| Hub surface | Preview-only “Future experience” | `/apps/scenes/living-scenes/` |
| Effect runtime | RAF loop; DOM + canvas layers | `apps/waypoint-scenes/js/engine/` |
| Effects | fog, rain, snow, fireflies, cloud-drift, light-rays, dust, leaf-drift | `engine/effects/*` |
| Params | opacity / speed / density / direction | effect-base + registry |
| Camera motion | Presets / parallax helpers | waypoint-scenes studio |
| Capture frame | Still composite for snapshot | `WaypointEffects.captureFrame` |
| Export still | PNG `downloadSnapshot` | `export.js` |
| Export motion | Video / Live Photo / wallpaper — **stubs only** | same |
| Reduced motion | Must respect `prefers-reduced-motion` | runtime / CSS |
| Sprint 1 Create | Working Create studio (reference, not main hub SoT) | `feature/scenes-sprint1-four-pillar-foundation` |

### 5. Portfolio Builder (Learn / curate)

| Step | What happens today | Where |
|------|--------------------|-------|
| Source normalize | Library / collection / shoot / portfolio / selected ids | `builder-engine.js` + assistant-signals |
| Signal collect | Favorites, Keep/Maybe/Reject, ratings, soft Coach grades, tags, aspect, resolution, membership | assistant + builder |
| Draft pipeline | eligibility → constraints → weight → similarity → diversity → roles → sequence → explain | `builder-engine.js` |
| Preview | Thumbnails from library / sessions (no re-analysis) | builder UI |
| Persist / save | Session + portfolio create / rebuild-with-diff | builder-session / portfolio-engine |
| Export website | Separate output sprint — layout/publish, not pixel engine | `feature/scenes-portfolio-website-output` |

**Explicitly excluded from Builder:** sharpness/exposure ML, perceptual hash, invented aesthetics (see builder owner review).

---

## Common concerns (cross-product)

| Concern | Shared today? | Canonical future home |
|---------|---------------|------------------------|
| **Ingest** (File / libraryId / blob URL + revoke) | Partial duplicates | Media Core |
| **Decode & fit** (max-edge preview ~1600; analysis samples smaller) | HL / AV / Coach / Library each roll own | Media Core (`decodeFit`, `makeSample`, `makeThumbnail`) |
| **Immutable source buffer** | HL best prototype | Media Core → SIE |
| **Rendering / blit** | HL + AV canvases; Living Scenes RAF; Coach `<img>` | Stage kit + SIE / Animation facade |
| **Transformations** | HL + AV separate stacks | SIE processor registry (Explore families) |
| **Atmosphere effects** | waypoint-scenes only | SIE Create family (AnimationEngine facade) |
| **Analysis sampling** | Coach + scene-analyzer | Analysis Core (shares Media Core decode) |
| **Previews / compare** | HL+AV pixel compare; Coach session compare; Builder thumbs | Stage kit (pixel) + product-specific compare (critique / draft) |
| **Exports** | AV / HL / waypoint-scenes stills; motion stubs | Export service + provenance |
| **Caching** | Object URLs ad hoc; Library IndexedDB originals; shoot thumbs in localStorage | Media Cache (memory + Library ids) |
| **Honesty / provenance** | HL/AV labels; Coach “On-device analysis” | Honesty + Provenance service |
| **Library handoff** | `?libraryId=` into Coach + HL | Media Core resolve (Photo Library remains catalog SoT — see parallel unification work) |

---

## One reusable pipeline

Ordered stages. Product cores enter/exit at marked points; they do not fork Media Core.

```
                    ┌─────────────────────────────────────────┐
                    │              Media Core                 │
 ingest → resolveLibrary? → decodeFit → sourceBuffer          │
         → thumbnail? → sampleBuffer? → cachePut → dispose*   │
                    └───────────┬─────────────┬───────────────┘
                                │             │
              ┌─────────────────▼──┐   ┌──────▼────────────────┐
              │ SIE (pixel graph)  │   │ Analysis Core         │
              │ applyGraph         │   │ sample → signals →    │
              │  · TransformNodes  │   │ critique / ReviewDoc  │
              │  · EffectNodes     │   └──────────┬────────────┘
              │ intensity / RAF    │              │ soft grades
              │ stageBlit + Stage  │              │
              │ attachHonesty      │   ┌──────────▼────────────┐
              │ exportFrame        │   │ Curation Core         │
              └────────────────────┘   │ signals → draft →     │
                                       │ sequence → save       │
                                       └───────────────────────┘
```

### Stage contract (platform)

| Stage | Job | Consumers |
|-------|-----|-----------|
| `ingest` | Accept File / library id / blob; validate size/type | All |
| `resolveLibrary` | Map `libraryId` → bytes / object URL without duplicating catalog | Coach, HL, Builder, future Create |
| `decodeFit` | Decode; optional max-edge fit for process buffer | SIE, thumbs |
| `sourceBuffer` | Immutable process-size ImageData / bitmap | SIE |
| `thumbnail` | Small JPEG/WebP data URL or blob for UI lists | Coach, Library, Builder |
| `sampleBuffer` | Tiny analysis canvas (e.g. 200×130) | Analysis Core, scene-analyzer |
| `applyGraph` | TransformNodes and/or EffectNodes | SIE only |
| `analyze` | Signals → critique / PC2 ReviewDocument | Analysis Core only |
| `curate` | Eligibility → draft portfolio | Curation Core only |
| `stageBlit` | Original + result (+ compare mode) | SIE Stage kit |
| `attachHonesty` | AccuracyLabel / on-device / creative-atmosphere | SIE + Analysis labels |
| `export` | Local download + provenance stub | SIE (+ future Coach share packs) |
| `cachePut` / `dispose` | Keyed cache; revoke URLs; stop RAF | All |

`*` Dispose is end-of-session; cache may retain thumbs by library id.

### Policy knobs (one place)

| Policy | Default | Notes |
|--------|---------|-------|
| Preview max edge | 1600 | Matches HL VisionEngine |
| Analysis sample | 200×130 (Coach) / 160×100 (scene-analyzer) | Normalize later under Analysis Core |
| Thumb max edge | ~480 (Library ~ scale) | Align Coach shoot thumbs with Library |
| Max file bytes | ~28 MB | Match HL gate |
| Accepted MIME | jpeg/png/webp (+ gif/bmp best-effort) | Shared validator |
| Export | local `toBlob` only in MVP | No upload without opt-in |
| Motion export | Future | Keep stubs labeled Future |

---

## SIE (unchanged role, extended consumers)

Canonical name remains **Scenes Imaging Engine (SIE)** from prior Create/Explore architecture.

```
createEngine(options) → engine
engine.loadSource(input)      // via Media Core
engine.setGraph(graph)
engine.setCompareMode(mode)
engine.render() → StageFrame
engine.updateParam(nodeId, patch)
engine.exportFrame(spec)
engine.dispose()
```

Facades (platform stubs → real runtimes over time):

| Facade | Maps to |
|--------|---------|
| `VisionEngine` | SIE Explore processors (HL + Animal Vision families) |
| `AnimationEngine` | SIE Create effect nodes + RAF (waypoint-scenes runtime) |
| `SceneEngine` | Documents referencing SIE graphs — not a second pixel engine |
| `CoachEngine` | Analysis Core facade over Photo Coach (no SIE transform) |
| `ProfileEngine` | Growth from Coach sessions (unchanged) |
| `ImagingEngine` | Direct SIE entry (`apps/scenes/js/imaging/`) |

### Processor families (SIE)

1. **Explore — spectral-inspired** — `hl-transforms` + `transformations.json`  
2. **Explore — animal vision** — `animal-vision-transforms` + `species.json`  
3. **Create — atmosphere** — waypoint-scenes effect registry + camera motion  

Intensity / opacity always blend against an immutable source plate. Explore results always carry `AccuracyLabel`. Create labels as `creative-atmosphere`.

---

## Recommended shared services

Implement as thin modules under `apps/scenes/js/` over time — extract, don’t rewrite products.

| Service | Responsibility | First extraction sources |
|---------|----------------|--------------------------|
| **Media Core** | ingest, decodeFit, thumbnail, sampleBuffer, URL revoke | HL `decodeFile`, AV `drawScaled`, Library thumb, Coach thumb |
| **Media Cache** | Process/thumb cache keyed by `libraryId` or content hash | Photo Library IndexedDB + in-memory Map |
| **Processor Registry** | Register Explore/Create processors by family | HL + AV PROCESSORS, effect registry |
| **Stage Kit** | Compare slider/side/toggle; blit helpers; reduced-motion | HL studio (best), then AV |
| **Export Service** | MIME/quality/filename + provenance attach | AV export + HL exportImage + WaypointExport |
| **Honesty / Provenance** | AccuracyLabel, engine version, graph snapshot | transformations.json + SIE types |
| **Analysis Core** | sample → signals → critique / PC2 provider contract | analysis-demo + PC2 composer |
| **Curation Core** | Builder draft pipeline (already pure) | `builder-engine.js` |
| **Library Bridge** | `libraryId` resolve / “used in” refs only | photo-library-client (align with photo-library unification; do not fork catalog here) |

### Caching strategy

1. **Originals:** Photo Library IndexedDB remains SoT for stored bytes.  
2. **Process buffer:** Memory (or ephemeral) per session; keyed by library id + maxEdge.  
3. **Thumbnails:** Prefer Library thumb; Coach shoot thumbs migrate toward same helper.  
4. **Transform results:** Optional LRU keyed by `(sourceId, graphHash, intensity)` — Explore only.  
5. **Never cache invented EXIF or fake spectral channels.**

### Preview & export matrix

| Product | Preview | Export |
|---------|---------|--------|
| Hidden Landscapes | Stage kit compare | Still + honesty |
| Animal Vision | Stage kit compare | Still interpretation |
| Living Scenes | Continuous RAF + optional freeze compare | Still now; motion later |
| Photo Coach | Image + overlays; critique compare | Session/share later — not transform export |
| Portfolio Builder | Thumb grid / sequence | Portfolio record / website output (non-SIE) |

---

## Alignment notes (intentional differences from prior wording)

| Prior SIE wording | This platform wording | Why |
|-------------------|----------------------|-----|
| “Coach critique … outside SIE” | Still true | Critique ≠ transform graph |
| Create + Explore = imaging platform | Still true for **pixels** | Unchanged |
| — | Media / Analysis / Curation cores | Coach + Builder share ingest without becoming SIE |
| Four-pillar Observe/Understand vs Create/Explore | Imaging = Create+Explore; Craft = Coach/Library/Learn | Vocabulary from prior owner review preserved |

**Photo Library unification** (parallel branch/worktree) owns catalog identity and import UX. This engine design **consumes** library ids; it does not redefine the catalog. Do not collide with `docs/scenes/*photo-library*` drafts from that effort.

---

## Migration sketch (docs-level only)

1. Land Media Core helpers; point HL + AV decode/export at them (no UX change).  
2. Register HL + AV under one Explore registry; share Stage kit.  
3. Wrap waypoint-scenes runtime as AnimationEngine → SIE Create family.  
4. Point Coach thumb + sample through Media Core; keep critique modules in place.  
5. Builder keeps pure draft engine; only thumb/resolve path consolidates.  
6. Optional: bring Create studio behind honest Available/Preview labels (owner call).

**Rejected:** separate WebGL Living engine + Canvas Explore engine; AI generative transforms as default; cloud render farm; rewriting Photo Coach or Portfolio Builder in this effort.

---

## Stub map (this branch)

| Path | Role |
|------|------|
| `apps/scenes/js/imaging/imaging-engine.js` | SIE facade stub (extends prior) |
| `apps/scenes/js/imaging/pipeline.js` | Platform stage map stub |
| `apps/scenes/js/imaging/media-core.js` | Media Core pointer stub (new) |
| Prior companion docs | On `docs/scenes-create-explore-architecture` until merged |

Stubs reject/no-op with messages pointing here. Live code stays in product apps.
