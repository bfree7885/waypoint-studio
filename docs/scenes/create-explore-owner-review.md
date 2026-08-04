# Create × Explore — Owner Review

**Audience:** Product owner · engineering leads  
**Date:** 2026-08-03  
**Branch:** `docs/scenes-create-explore-architecture`  
**Base:** `origin/main` @ `59c09deb`  
**Companion:** [`imaging-architecture.md`](./imaging-architecture.md)  
**Scope:** Architecture and reuse plan only — **no major features**, **no merge**, **no deploy**.

---

## Verdict

Connect **Create** (Living Scenes / atmosphere) and **Explore** (Hidden Landscapes + Animal Vision) as two product doors into **one shared imaging platform**, not two separate render stacks.

**Key recommendation — one future engine:**

> **Scenes Imaging Engine (SIE)** — a single local-first imaging runtime with a shared source → graph → stage → export pipeline. Explore plugs in pixel transforms; Create plugs in atmosphere / motion layers. Product chrome stays separate; pixels and provenance do not.

Do **not** invent a second WebGL stack or rewrite Photo Coach. Reuse what already works.

---

## What we reviewed

| Surface | Live path (main) | Maturity | Imaging role |
|---------|------------------|----------|--------------|
| Scenes hub | `/apps/scenes/` | Live IA | Labels Create → Living Scenes preview; Explore → Hidden Landscapes |
| Living Scenes | `/apps/scenes/living-scenes/` | Future preview | No controls on main; Create door only |
| Hidden Landscapes | `/apps/hidden-landscapes/` | Experimental studio | Canvas VisionEngine + transform registry |
| Animal Vision | `/apps/animal-vision/` | Experimental companion | Separate canvas transforms + species JSON |
| Legacy Scene Builder / effects | `/apps/waypoint-scenes/` | Legacy / preview | Full Living Scenes effect runtime (RAF, DOM+canvas), export snapshot |
| Platform engine stubs | `/apps/scenes/js/engines/` | Interface-only | Vision / Animation / Scene / Coach / Profile |
| Photo Library handoff | `/apps/photo-library/` | Available | `?libraryId=` into Coach + Hidden Landscapes |

### Branch notes (Create / Explore prior art)

| Branch | What it contributes (do not treat as live SoT) |
|--------|-----------------------------------------------|
| `feature/scenes-sprint1-four-pillar-foundation` | Functional **CREATE** at `/apps/waypoint-scenes/create/` (Living Scenes studio moved off Coach host); **EXPLORE** overview linking HL + Animal Vision |
| `turnaround/sprint-05-scenes-surface-cleanup` | Honesty bands on hub; demotes Living Scenes / legacy studio; internal `FOUR-PILLAR-VISION.md` (Observe / Understand / Create / Share) |
| `feature/rc4-platform-sprint1-unified-experience` | Platform chrome unification + Scenes sprint lineage (Coach / Library); not a new imaging stack |

**Base choice:** `origin/main` is the honest live tree. Sprint 1’s Create/Explore routes are valuable **reference implementations** to absorb into SIE later; they are not the current public hub SoT after Sprint 5 honesty cleanup.

---

## 1. Architecture — one imaging platform

### Product doors (UX)

```
Scenes
├── Craft loop (Observe / Understand) … Photo Coach, Library, Learn  ← out of scope for SIE core
└── Imaging platform
    ├── CREATE  → Living Scenes (+ Scene Builder composition later)
    └── EXPLORE → Hidden Landscapes · Animal Vision · future ImageSets
```

Create and Explore are **intent labels**, not separate engines.

### System shape

```
                 ┌──────────────────────────┐
                 │   Photo Library / file    │
                 │   ImageSource + metadata  │
                 └────────────┬─────────────┘
                              │
                 ┌────────────▼─────────────┐
                 │  Scenes Imaging Engine   │
                 │  (SIE — one runtime)     │
                 │  Source → Graph → Frame  │
                 └─────┬──────────────┬─────┘
                       │              │
           ┌───────────▼──┐    ┌──────▼──────────┐
           │ CREATE graph │    │ EXPLORE graph   │
           │ EffectNodes  │    │ TransformNodes  │
           │ (atmosphere) │    │ (HL / AV / …)   │
           └───────────┬──┘    └──────┬──────────┘
                       │              │
                 ┌─────▼──────────────▼─────┐
                 │ Shared Stage + Export    │
                 │ compare · preview · PNG  │
                 │ honesty / provenance     │
                 └──────────────────────────┘
```

### Facades (keep names, collapse implementations)

| Existing stub / prototype | Future role under SIE |
|---------------------------|------------------------|
| `VisionEngine` (HL live + scenes stub) | Explore facade over SIE transform graphs |
| `AnimationEngine` (scenes stub + waypoint-scenes runtime) | Create facade over SIE effect graphs + timeline |
| `SceneEngine` | Scene **documents** (layers, stories) that *reference* SIE graphs — not a second pixel engine |
| Coach / Profile engines | Unchanged — critique & growth, not imaging |

---

## 2. Shared image-processing pipeline

Documented stages (see companion for types). Light stubs on this branch: `apps/scenes/js/imaging/*`.

| Stage | Job | Reuse today |
|-------|-----|-------------|
| **Ingest** | Accept File / library id / object URL; revoke URLs; size/type gates | HL `loadImage`, AV upload, waypoint-scenes upload, Library handoff |
| **Decode & fit** | Decode to canvas; downscale max-edge for safe preview (~1600) | HL VisionEngine, AV `drawScaled` |
| **Source buffer** | Immutable `ImageData` / typed copy as graph input | HL `sourceData`, AV transforms |
| **Graph apply** | Run TransformNode and/or EffectNode list | HL processors, AV registry, waypoint-scenes effect registry |
| **Intensity / params** | Blend or tune without mutating source | HL `applyIntensity`, effect opacity/speed/density |
| **Stage blit** | Original + result canvases; compare modes | HL studio compare (slider / side / toggle) |
| **Honesty** | Attach accuracy / simulation labels | `transformations.json`, Animal Vision disclaimers |
| **Export** | Local `canvas.toBlob` download + provenance stub | AV export, HL `exportImage`, waypoint-scenes `downloadSnapshot` |
| **Dispose** | Revoke URLs, drop canvases, stop RAF | All three studios (partial) |

**Workers / WebGL:** not required for the first consolidation. Canvas 2D + optional OffscreenCanvas worker is enough until Living Scenes video export or heavy stacks demand more. Prefer one Canvas 2D path first; add WebGL only as an optional compositor backend behind the same graph API.

---

## 3. Reusable inventory

### Rendering

| Asset | Location | Reuse |
|-------|----------|-------|
| Effect base + registry + RAF runtime | `apps/waypoint-scenes/js/engine/` | **Create** core — fog, rain, snow, fireflies, cloud-drift, light-rays, dust, leaf-drift |
| Effects facade | `apps/waypoint-scenes/js/effects.js` | Public Create API |
| CSS stage / studio shell | `apps/waypoint-scenes/css/*`, HL / AV CSS | Extract shared stage tokens later; do not fork blindly |
| Scenes platform stubs | `apps/scenes/js/engines/*` | Stable facade names for SIE |

### Transformations

| Asset | Location | Reuse |
|-------|----------|-------|
| HL processors + intensity blend | `apps/hidden-landscapes/js/hl-transforms.js` | Explore spectral-inspired family |
| HL mode catalog | `apps/hidden-landscapes/data/transformations.json` | Registry SoT + honesty fields |
| Animal Vision processors | `apps/animal-vision/js/animal-vision-transforms.js` | Explore species family |
| Species config | `apps/animal-vision/data/species.json` | Params + educational copy |
| VisionEngine lifecycle | `apps/hidden-landscapes/js/hl-vision-engine.js` | Best prototype of SIE Explore path |

### Previews / compare

| Asset | Location | Reuse |
|-------|----------|-------|
| Slider / side / toggle compare | `apps/hidden-landscapes/js/hl-studio.js` | **Shared Stage kit** for Explore (+ Create before/after) |
| Side-by-side / toggle | Animal Vision app | Merge into Stage kit; delete duplicate later |
| Living Scenes preview shell | Sprint 1 `waypoint-scenes/create/` + legacy index | Create stage chrome |

### Exports

| Asset | Location | Reuse |
|-------|----------|-------|
| JPEG/PNG interpretation download | `apps/animal-vision/js/animal-vision-export.js` | Shared export helper |
| HL `exportImage` | `hl-vision-engine.js` | Align mime/quality/filename policy |
| PNG snapshot | `apps/waypoint-scenes/js/export.js` | Create still export; video/Live Photo remain future |

### Metadata / honesty / processing config

| Asset | Location | Reuse |
|-------|----------|-------|
| Transformation accuracy fields | `transformations.json` | SIE `AccuracyLabel` |
| ImageSet scaffolds | `apps/hidden-landscapes/data/image-sets.json` | Future multi-frame Explore — no fabricated spectral EXIF |
| Vision modes / wavelengths / filters | HL `data/*.json` | Education + future capture workflows |
| Experience catalog | `apps/scenes/data/experiences.json` | Hub copy / engine ids |
| EXIF reader (builder) | `apps/waypoint-scenes/js/exif-reader.js` | Optional Create context — never invent values |
| Library module refs | Photo Library engine | Persist “used in HL / Living Scene” without storing pixels twice |

### Related but **not** SIE

| Asset | Why separate |
|-------|----------------|
| Photo Coach analysis | Critique product, not transform graph |
| `photo_pipeline/` (Python site catalog) | Publishing / site media ops — different trust boundary |
| Dashboard / SignalTerrain explorers | Not photography imaging |

---

## 4. Future rendering engine — SIE

### Why one engine

Today Create and Explore already share the same physical constraints: local bytes, canvas preview, honesty labeling, compare, download. They diverge only in **graph node types** (atmosphere overlays vs pixel remaps). Two engines would duplicate ingest, downscale, export, library handoff, and provenance — the expensive, bug-prone parts.

### What SIE must support

| Capability | Create | Explore | Future |
|------------|--------|---------|--------|
| Still preview | ✓ | ✓ | |
| Parametric intensity | effect opacity/speed | transform intensity | |
| Multi-node graphs | stacked effects | chained modes (rare) | LUT / capture frames |
| Motion / RAF | ✓ | optional subtle | seasonal timelines |
| Compare stage | before/after | slider/sbs/toggle | ImageSet A/B/C |
| Honesty labels | creative atmosphere | simulation vs capture | real IR/UV frames |
| Export still | ✓ | ✓ | |
| Export motion | wallpaper / short loop | — | video / Live Photo stubs already named |
| Library round-trip | handoff id | `libraryId` today | shared ImagingProvenance |

### Backend choice (phased)

1. **Phase A (now → next engineering sprint):** Canvas 2D SIE facade; migrate shared helpers; keep HL / AV / waypoint-scenes UIs.  
2. **Phase B:** Single processor registry + Stage kit; Animal Vision and HL call the same `createEngine`.  
3. **Phase C:** Living Scenes Create surface re-homed under Scenes (absorb Sprint 1 create studio) with AnimationEngine → SIE.  
4. **Phase D (only if needed):** WebGL/WebGPU compositor backend behind the same graph API for denser particles or video encode — not a product rewrite.

**Rejected alternatives:** separate WebGL “Living engine” + Canvas “Explore engine”; generative/AI image models as the default transform path; cloud render farm.

---

## 5. Roadmap (documentation-level)

| Horizon | Outcome |
|---------|---------|
| **Now (this branch)** | Owner-approved SIE direction; companion architecture; imaging stubs |
| **Next** | Extract shared ingest / intensity / export helpers; wire HL + AV without UX redesign |
| **Create honesty** | Either restore Living Scenes studio behind clear Preview/Available labels (Sprint 1 create path) or keep preview-only — owner call; engine work should not wait on hub marketing |
| **Unify Stage** | One compare/preview module used by Explore + Create |
| **ImageSet** | Real multi-mode frames when capture exists; simulations stay labeled |
| **SceneEngine docs** | Composition/stories reference SIE graphs; do not fork pixels |

---

## 6. Technical debt

| Debt | Risk | Direction |
|------|------|-----------|
| Duplicate canvas transform stacks (HL vs AV) | Drift in downscale, intensity, export | Merge processors under SIE registry |
| Duplicate compare UIs | Inconsistent a11y / mobile behavior | Shared Stage kit from HL patterns |
| Living Scenes preview on hub vs full studio in legacy/sprint1 | Users cannot reach working Create effects from main hub | Owner: promote Create studio or keep Future — but **keep engine code** |
| `VisionEngine` stub vs live `HiddenLandscapesVision` | Two stories for one engine | Stub becomes thin delegate to SIE |
| `AnimationEngine` stub unused while waypoint-scenes runtime is real | Create work orphaned from platform registry | AnimationEngine wraps waypoint-scenes engine |
| Coach JS still loaded from `waypoint-scenes/` | Coupling / CSS drift (noted in Sprint 5) | Decouple Coach analysis from Create imaging over time |
| Export video / Live Photo / wallpaper stubs | Empty promises if promoted | Keep behind Future until SIE motion export exists |
| Parallel docs agents | Filename collisions | This review uses **`create-explore-owner-review.md` only** — does not touch learn-pillar or reconciliation reports |
| Four-pillar naming (Sprint 5: Create/Share vs Sprint 1: CREATE/EXPLORE) | Vocabulary drift | **Imaging platform = Create + Explore**; Observe/Understand/Share remain craft pillars |

---

## 7. Explicit non-goals (this effort)

- Building the full SIE implementation or WebGL engine  
- Merging or deploying this branch  
- Rewriting Photo Coach, Dashboard, or platform consolidation docs  
- Claiming Living Scenes is Available on main  
- Treating RGB remaps as genuine IR/UV/thermal/animal vision  

---

## 8. Owner asks

1. **Approve SIE** as the single future rendering / imaging engine for Create + Explore.  
2. Confirm Create surface strategy: keep Living Scenes Future on hub, or re-link a clearly labeled studio that already exists in legacy/sprint1.  
3. Prioritize Phase A helper extraction (low risk) before any Create marketing change.

---

## References

- `docs/rebuild-2026/04-scenes-architecture.md`  
- `docs/SCENES_PLAYBOOK.md`  
- `apps/scenes/docs/ARCHITECTURE.md`  
- `apps/hidden-landscapes/docs/HIDDEN-LANDSCAPES.md`  
- `apps/animal-vision/docs/ANIMAL-VISION.md`  
- `apps/waypoint-scenes/js/engine/README.md`  
- Sprint 1 owner review (branch): Create/Explore pillar routes  
- Turnaround Sprint 5: surface honesty + four-pillar internal note  
