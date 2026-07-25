# Scenes — Current State Reconciliation

**Date:** 2026-07-24  
**Branch context:** `feature/scenes-portfolio-foundation` (cut from `origin/main`)  
**Starting SHA (`origin/main`):** `0be5f9fb23f0b0f024794ea2542df502416537f1`  
**Dashboard status:** Paused — not in scope for this work.

---

## Verdict

Scenes already has a **working photography craft loop** (import → shoot review → private library → experimental vision). What it lacks is a **purpose-driven Portfolio workspace** distinct from (a) Photo Library collections and (b) Photo Coach “portfolio” session history. The right next sprint is a **local-first Portfolio foundation** that curates real Library images — not AI auto-generation.

---

## Current Scenes routes

| Route | Role | Status |
|-------|------|--------|
| `/apps/scenes/` | Photography product home (journey + discover) | **Functional** |
| `/apps/scenes/photo-coach/` | Module landing → redirects / deep-links to live Coach | Landing + live tool |
| `/apps/scenes/photo-library/` | Redirect to `/apps/photo-library/` | **Functional** redirect |
| `/apps/scenes/hidden-landscapes/` | Module landing → HL tool | Landing + live experimental tool |
| `/apps/scenes/living-scenes/` | Preview-only module page | **Preview** (no builder) |
| `/apps/scenes/scene-builder/` | Module landing → `/apps/waypoint-scenes/` | Preview / early studio |
| `/apps/scenes/photographer-profile/` | Module landing → Coach profile companion | Preview + early companion |
| `/apps/photo-coach/` | Live critique + Shoot Review | **Functional** |
| `/apps/photo-library/` | Local catalog, collections, handoff | **Functional** |
| `/apps/hidden-landscapes/` | Creative vision studio | **Experimental / functional** |
| `/apps/waypoint-scenes/` | Early Scene Builder + legacy Photo Coach modules | Partial / legacy overlap |
| `/apps/photo-pipeline/` | Pipeline / review surface | Separate supporting app |
| `/apps/scenes/portfolio/` | *(added this sprint)* purpose portfolios | Foundation |

Platform shell: navy Scenes product chrome via `data-product="scenes"`, shared WDS App Shell, category accents in `scenes-home.css`.

---

## Working features (safe to reuse)

1. **Photo Library (`apps/photo-library/`)** — local-first SoT for photographs  
   - Metadata: `localStorage` `waypoint-photo-library-index-v1`  
   - Collections: `waypoint-photo-library-collections-v1`  
   - Originals: IndexedDB `waypoint-photo-library-media-v1`  
   - Real fields: rating, `selectionLabel` (keep/maybe/reject), favorite, camera/EXIF when present, subject hints, Photo Coach module refs (grade/score when analyzed)  
   - Honest nulls for missing GPS/EXIF — never fabricated

2. **Photo Coach + Shoot Review (`apps/photo-coach/` + `apps/waypoint-scenes/js/photo-coach-*.js`)**  
   - Single-image critique and multi-image session review  
   - Private Keep/Maybe/Reject/Favorite labels  
   - Grouping (burst / near-duplicate / similar composition)  
   - Shoot summary with cautious, evidence-based language  
   - Sessions: `waypoint-photo-coach-shoots-v1`

3. **Photo Coach “Portfolio” store (`photo-coach-portfolio.js`)**  
   - **Not** a curated exhibition portfolio — it is **coached session history** (`waypoint-photo-coach-sessions-v1`) with thumbnails and critique JSON  
   - Migrates metadata/thumbs into Photo Library on first library open

4. **Photographer Profile** — local growth companion from analysis history (soft language, no rankings)

5. **Hidden Landscapes** — local creative transformations with simulation honesty labels

6. **Scenes engines under `apps/scenes/js/engines/`** — mostly **interfaces**; Profile/Vision have live implementations elsewhere

---

## Broken / incomplete / duplicated / mocked

| Item | Assessment |
|------|------------|
| Living Scenes | Preview copy only — AnimationEngine interface stub |
| Scene Builder | Early studio at `apps/waypoint-scenes/`; Scenes module is a pointer |
| Photographer Profile module page | Preview; live companion at `/apps/photo-coach/profile/` |
| Engine stubs in `apps/scenes/js/engines/` | Interface-only; safe; do not treat as runtime SoT |
| Photo Coach “portfolio” naming | Overloaded — session history ≠ purpose portfolio |
| Library **Collections** | Working lightweight named sets — not purpose/health/rationale portfolios |
| Importer handoff | Bridge stub / interface-only until disk importer supplies blobs |
| Rebuild docs (`docs/rebuild-2026/04-scenes-architecture.md`) | Architecture baseline; describes greenfield options — **do not discard working tools** |
| `docs/scenes/` (pre-sprint) | Did not exist — playbook lives at `docs/SCENES_PLAYBOOK.md` |

No abandoned remote `feature/*scenes*` or `*portfolio*` product branches were found; Scenes work lives on `main` history (modular platform, Photo Library, Shoot Review, photography redesign commits). Active remote branches are overwhelmingly Dashboard RC3 — leave them alone.

---

## Relevant docs & storage facts

| Doc | Use |
|-----|-----|
| `apps/scenes/docs/ARCHITECTURE.md` | Modular platform map |
| `apps/photo-library/docs/PHOTO-LIBRARY.md` | Catalog / IndexedDB contract |
| `apps/photo-coach/docs/SHOOT-REVIEW.md` | Session labels & grouping |
| `docs/SCENES_PLAYBOOK.md` | Product standards for Scenes |
| `docs/PHOTO-PIPELINE.md` / `docs/IMPORTER-AUDIT.md` | Import pipeline context |

**Storage reality for Portfolio:** portfolios must reference **LibraryImage ids** (and optionally legacy coach session ids only as secondary hints). Blob bytes stay in Library IndexedDB. Candidate suggestions may use rating / selectionLabel / favorite / coach grade / capture date / fingerprint **only when present**. Insufficient data → manual selection with an honest empty suggestions state.

---

## Architecture risks

1. **Name collision:** “Portfolio” in Photo Coach means session history — new product language must say **purpose portfolio / exhibition set** and use distinct storage keys.  
2. **Dual catalogs:** Coach sessions + Library index can diverge; Library migration is additive — Portfolio should prefer Library ids.  
3. **Collections vs Portfolios:** Collections remain light organizational chips; Portfolios add purpose, ordered curation, cover, notes, rationale, future health. Do not silently merge concepts.  
4. **Rebuild temptation:** Rebuild doc discusses greenfield Scenes — evidence says continue wrapping live Coach/Library rather than rewrite.  
5. **Dashboard branch pollution:** Scenes work must not land on Dashboard feature branches; operational files like `data/publish-state.json` stay uncommitted noise.

---

## Recommended next sprint (and why)

**Portfolio Foundation** — smallest meaningful Portfolio Intelligence slice:

- Durable local Portfolio model (CRUD, reorder, cover, purpose/description, notes)  
- Add/remove from real Photo Library / shoot-review-labeled images  
- Candidate suggestions from **existing** labels/ratings/analysis when present, with observational honesty framing  
- Automated tests for model, CRUD, persistence, missing-data grace, candidate logic  

**Why this sprint is correct**

- Builds on **real** Library + Coach evidence already on device  
- Unlocks Portfolio Assistant / Auto Builder / Health later without fake production data  
- Avoids AI auto-generation before curation primitives exist  
- Matches product standards: local-first, trust, no fabricated EXIF or placeholder “demo portfolios”  
- Does not touch Dashboard or Sheds  

**Deferred (explicitly not this sprint):** Auto Portfolio Builder, Portfolio Coach narratives, Portfolio Health scoring UI, cloud sync, social share, full AI culling.

---

## Confirmation for implementers

- Prefer careful continuation of Photo Library + Coach evidence.  
- Do not discard working Scenes functionality because rebuild docs discuss greenfield.  
- No fake portfolios in production empty states — invite create/import instead.
