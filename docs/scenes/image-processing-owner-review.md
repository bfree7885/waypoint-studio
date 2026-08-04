# Scenes Image Processing Engine — Owner Review

**Audience:** Product owner · engineering leads  
**Date:** 2026-08-04  
**Branch:** `docs/scenes-image-processing-engine`  
**Base:** `origin/main` @ `59c09deb`  
**Companion:** [`image-processing-engine.md`](./image-processing-engine.md)  
**Prior SIE (extend, don’t replace):** [`create-explore-owner-review.md`](./create-explore-owner-review.md) · [`imaging-architecture.md`](./imaging-architecture.md) on `docs/scenes-create-explore-architecture`  
**Scope:** Architecture and reuse plan only — **no major features**, **no merge**, **no deploy**.

---

## Verdict

Approve **one Scenes Processing Platform** for all image-based Scenes products, with **SIE** kept as the single pixel runtime for Create and Explore.

| Door | Products | Engine path |
|------|----------|-------------|
| **Craft / Learn** | Photo Coach, Portfolio Builder | Media Core → Analysis / Curation (not SIE transforms) |
| **Create** | Living Scenes (+ Scene Builder composition later) | Media Core → SIE EffectNodes |
| **Explore** | Hidden Landscapes, Animal Vision | Media Core → SIE TransformNodes |

**Key recommendation:**

> Stop proliferating per-app decode, thumbnail, compare, and export helpers. Extract **Media Core + Stage + Export** once. Keep Photo Coach as education-over-samples and Portfolio Builder as signal-driven drafts. Do **not** rewrite those products into a transform graph.

This **extends** the 2026-08-03 Create×Explore SIE decision; it does not reopen a second imaging stack.

---

## What we reviewed

| Surface | Live path (main) | Maturity | Processing role |
|---------|------------------|----------|-----------------|
| Photo Coach / Shoot Review | `/apps/photo-coach/` | Available | Sample → signals → critique; thumbs; session compare |
| Photo Coach 2 architecture | feature branch | Design + scaffold | Provider-based ReviewDocument (eleven sections) |
| Hidden Landscapes | `/apps/hidden-landscapes/` | Experimental | Best SIE Explore prototype (VisionEngine) |
| Animal Vision | `/apps/animal-vision/` | Experimental | Parallel Explore transforms + export helper |
| Living Scenes | `/apps/scenes/living-scenes/` | Future on hub | Preview copy only on main |
| Living Scenes runtime | `/apps/waypoint-scenes/js/engine/` | Legacy / reference | Real Create atmosphere RAF + still export |
| Portfolio Builder | feature `scenes-auto-portfolio-builder` | Feature (not main SoT) | Metadata curation pipeline; no pixel invent |
| Photo Library | `/apps/photo-library/` | Available | Catalog + thumbs + `libraryId` handoff (SoT for stored bytes) |
| Prior SIE stubs/docs | `docs/scenes-create-explore-architecture` | Design | Create/Explore graph contract |

### Branch notes (evidence, not live SoT)

| Branch | Contribution |
|--------|----------------|
| `docs/scenes-create-explore-architecture` | SIE naming, types, pipeline stubs, Create×Explore owner verdict |
| `feature/scenes-photo-coach-2-architecture` | Analysis provider contract for future Coach |
| `feature/scenes-auto-portfolio-builder` (+ portfolio-* lineage) | Pure curation draft engine |
| `feature/scenes-sprint1-four-pillar-foundation` | Working Create studio reference |
| `feature/scenes-photo-library-unification` | **Parallel** — catalog/import; do not overwrite those docs |

**Stashes / other WIP:** Left untouched. Work performed in an isolated worktree from `origin/main`.

---

## 1. Inventory summary (every processing step)

Full tables live in the companion. Condensed:

1. **Shared media path** — ingest → decode → (fit | thumb | sample) → dispose/cache  
2. **Explore path** — source buffer → RGB remap → intensity → stage compare → honesty → still export  
3. **Create path** — base plate → stacked atmosphere effects (RAF) → capture frame → still export (motion Future)  
4. **Coach path** — sample buffer → heuristic signals → critique / future PC2 ReviewDocument → session persist  
5. **Builder path** — library signals → eligibility/weight/diversity/roles/sequence → draft save  

Nothing in (4) or (5) should become a Hidden Landscapes–style processor without an explicit product decision.

---

## 2. One reusable pipeline

```
Media Core
  ingest → library resolve → decodeFit → sourceBuffer
  thumbnail · sampleBuffer · cache · dispose
        │
        ├─► SIE ………… applyGraph → stageBlit → honesty → export
        ├─► Analysis … sample → critique / ReviewDocument
        └─► Curation … signals → portfolio draft
```

**Backend choice (unchanged from prior SIE):** Canvas 2D first; optional OffscreenCanvas worker later; WebGL/WebGPU only as a compositor backend behind the same graph API if Create density or video encode demands it.

---

## 3. Common rendering, transforms, previews, exports, caching

| Layer | Share | Keep product-local |
|-------|-------|--------------------|
| Rendering blit / RAF orchestration | Stage kit + SIE / AnimationEngine | Coach DOM overlays; Builder grid chrome |
| Transforms / effects | SIE processor registry | Coach critique text; Builder explanations |
| Previews | Stage kit for pixel A|B; Media thumbs everywhere | Coach session compare; Builder sequence UI |
| Exports | Shared still export + provenance | Portfolio website publish; Coach share packs (future) |
| Caching | Library originals + Media Cache for process/thumbs | Shoot session documents; builder sessions |

---

## 4. Shared services to build next

Priority order for engineering (still extract-only):

1. **Media Core** — one decodeFit / thumbnail / sample / revoke API  
2. **Export Service** — one `toBlob` + filename + provenance stub  
3. **Stage Kit** — HL compare modes adopted by Animal Vision  
4. **Processor Registry** — HL + AV under Explore families  
5. **AnimationEngine wrap** — waypoint-scenes runtime behind SIE Create  
6. **Analysis Core facade** — CoachEngine → existing analysis / PC2 providers  
7. **Curation Core** — already modular; only wire Media thumb resolve  

**Photo Library unification** remains the catalog owner. Processing engine consumes ids.

---

## 5. Alignment with prior SIE (no silent contradiction)

| Prior decision | Status |
|----------------|--------|
| One SIE for Create + Explore pixels | **Affirmed** |
| Coach critique outside SIE transform graph | **Affirmed** |
| Local-first; no upload without opt-in | **Affirmed** |
| Honesty labels on Explore simulations | **Affirmed** |
| Living Scenes Future on main hub until owner promotes | **Affirmed** |
| Stubs only; no big rewrite | **Affirmed** |
| Platform includes Media + Analysis + Curation cores | **New extension** — explained in companion |

Four-pillar craft language (Observe / Understand / …) and Create/Explore imaging doors both remain; imaging pixels stay Create+Explore.

---

## 6. Technical debt this design addresses

| Debt | Direction |
|------|-----------|
| HL vs AV duplicate decode/compare/export | Media Core + Stage + Export |
| Coach vs Library duplicate thumbs | Shared thumbnail helper |
| VisionEngine stub vs live HL engine | Stub becomes thin SIE delegate |
| AnimationEngine stub vs live waypoint-scenes | Wrap, don’t rewrite effects |
| Builder pure engine vs ad hoc thumbs | Resolve via Media / Library only |
| Motion export stubs marketed as ready | Keep Future until SIE motion export exists |

---

## 7. Explicit non-goals

- Implementing full SIE or rewriting HL / AV / Living Scenes / Coach / Builder  
- Merging or deploying this branch  
- Overwriting photo-library-unification or other parallel docs agents’ files  
- Claiming Living Scenes Available on main  
- Treating RGB remaps as genuine IR/UV/thermal/animal vision  
- Putting Portfolio draft logic inside the pixel graph  

---

## 8. Owner asks

1. **Approve** the Scenes Processing Platform framing (Media Core + SIE + Analysis + Curation) as the shared direction for all five image-based products.  
2. **Reaffirm** prior SIE approval for Create × Explore pixels.  
3. Prioritize **Media Core + Export + Stage** extraction before any Create hub marketing change.  
4. Confirm Photo Library unification remains catalog SoT; processing engine only consumes ids.

---

## References

- Companion: `docs/scenes/image-processing-engine.md`  
- Prior: `docs/scenes/imaging-architecture.md`, `docs/scenes/create-explore-owner-review.md`  
- `apps/scenes/docs/ARCHITECTURE.md`  
- `apps/hidden-landscapes/docs/HIDDEN-LANDSCAPES.md`  
- `apps/animal-vision/docs/ANIMAL-VISION.md`  
- `apps/photo-coach/docs/SHOOT-REVIEW.md`  
- `apps/waypoint-scenes/js/engine/README.md`  
- Portfolio Builder owner review (feature branch)  
- Photo Coach 2 architecture owner review (feature branch)  
