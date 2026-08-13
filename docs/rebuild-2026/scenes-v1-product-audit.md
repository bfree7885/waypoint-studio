# Scenes V1 — Product Audit + Development Plan

**Date:** 2026-08-13  
**Production SHA:** `b615963` (from `<meta name="waypoint-build">` on live pages; `/build-info.json` returns 404)  
**Scope:** Audit + product planning only. No Scenes redesign, no feature implementation, no Dashboard modifications.  
**Screenshots:** [`docs/rebuild-2026/scenes-v1-audit-screenshots/`](./scenes-v1-audit-screenshots/) (46 PNGs at 390/430/768/1440/1728 where primary)  
**Screenshot method:** Headless Chrome against local checkout (`python3 -m http.server`) after production HTML/route/SHA verification via curl. Visual source = current tree; production deploy confirmed at `b615963`.

---

## Executive answer

### What is Scenes today?

Scenes is a **photography craft hub** with a coherent *marketing journey* (“import → review → keep → discover other ways of seeing”) and a **fragmented implementation**:

| Layer | Reality |
|-------|---------|
| Hub | `/apps/scenes/` — polished landing that points primarily at Photo Coach + Photo Library + Hidden Landscapes |
| Strongest live tools | Photo Coach shoot review, Photo Library (local catalog), Hidden Landscapes + Animal Vision (creative/educational remaps) |
| Early studio | `/apps/waypoint-scenes/` — Living Scene effects / parallax / PNG export |
| Placeholders | Living Scenes module page, Scene Builder preview page, Photographer Profile preview page |
| Missing pillars | Outdoor Journals, Year in Nature, books/calendars/print commerce — **not implemented** |
| Parallel trees | `apps/scenes/*` redirects + stub engines; real work lives in sibling apps |

A new user would believe Scenes is **“review today’s shoot, keep photographs privately, then optionally explore alternate ways of seeing.”** They would **not** find journals, books, or a finished Living Scenes product.

### What should we turn it into?

**Scenes V1 core:** a connected craft loop —

**Import (Library) → Review & learn (Photo Coach) → Keep & revisit (Library/Profile evidence) → Optionally explore perception (Hidden Landscapes / Animal Vision).**

Dashboard remains OBSERVE/DISCOVER/UNDERSTAND for conditions. Scenes owns the **post-field photographic craft** and **honest visual exploration** — not weather, not social, not print commerce, not a second Dashboard.

**First development attack (one):** make **Photo Coach shoot review + Library as single catalog** production-excellent and subscriber-worthy. Defer Living Scenes polish, journals, and book outputs.

---

## 1. Production audit

### Entry routes

| URL | Production behavior | User belief |
|-----|---------------------|-------------|
| `/scenes/` | **200** HTML redirect → `/apps/photo-coach/` | Skips hub; lands in Coach |
| `/apps/scenes/` | **Live hub** — “Review today’s shoot” | Photography craft home |
| `/apps/photo-coach/` | Live shoot review upload UI | Primary tool |
| `/apps/photo-library/` | Live local library | Import / keep |
| `/apps/hidden-landscapes/` | Live creative studio | Explore seeing |
| `/apps/animal-vision/` | Live educational remaps | Explore animal vision |
| `/apps/waypoint-scenes/` | Early Living Scene studio | Upload + effects |
| `/apps/scenes/living-scenes/` | **Future experience** copy only | Not ready |
| `/apps/scenes/scene-builder/` | **Preview** → links to waypoint-scenes | Not finished |
| `/apps/scenes/photographer-profile/` | **Preview** → early companion | Not finished |
| `/apps/scenes/photo-coach/` etc. | Meta refresh redirects to sibling apps | Thin wrappers |
| `/journals/`, `/outdoor-journals/`, `/year-in-nature/`, `/calendar/`, `/books/` | **404** | Do not exist |
| `/living-scenes/`, `/photo-coach/`, `/hidden-landscapes/` (root) | **404** | Dead short paths |

### Navigation

- Global shell marks **Scenes** active across Coach / Library / HL / Animal Vision / waypoint-scenes (`wds-app-nav-config.js` match list).
- Local Scenes features: **Today · Review a shoot · Your photographs · Other ways of seeing**.
- Living Scenes / Scene Builder / Profile appear as “Later” / Preview on hub — honest status labels on module pages.
- `/scenes/` bypassing the hub is **inconsistent** with hub IA (users never see the journey).

### What works vs unfinished (production)

**Working interactions (code + live pages):** upload/analyze in Photo Coach; import/catalog in Photo Library; upload/transform/export preview in Hidden Landscapes & Animal Vision; effect studio in waypoint-scenes.

**Unfinished / misleading:** Living Scenes module is preview-only while waypoint-scenes still offers a partial Living Scene; Scene Builder hub ≠ full product; Photographer Profile hub is preview while `/apps/photo-coach/profile/` has an early companion; `/scenes/` skip-hub redirect; gear copy in Guide hardcodes Sony a6700 (owner-specific).

### New-user belief (synthesis)

> “Scenes helps me review photographs from today’s outing on my device, keep a private library, and optionally play with infrared-inspired / animal-vision looks. Create/Share/Journals are promised later or elsewhere.”

### Screenshots

Primary viewports captured for: `scenes-home`, `photo-coach`, `photo-library`, `hidden-landscapes`, `living-scenes`, `waypoint-scenes`.  
Secondary (390 + 1440): `scene-builder`, `photographer-profile`, `animal-vision`, `photo-coach-profile`, `photo-coach-guide`, `landscape-interpretation`, `scenes-legacy-redirect`, `dashboard-home`.

See [`scenes-v1-audit-screenshots/`](./scenes-v1-audit-screenshots/) and `audit-capture-report.json`.

---

## 2. Route inventory

### User-reachable Scenes family (production)

```
/apps/scenes/                          Hub
/apps/scenes/photo-coach/              → /apps/photo-coach/
/apps/scenes/photo-library/            → /apps/photo-library/
/apps/scenes/hidden-landscapes/        → /apps/hidden-landscapes/
/apps/scenes/living-scenes/            Placeholder page
/apps/scenes/scene-builder/            Preview page
/apps/scenes/photographer-profile/     Preview page
/apps/photo-coach/                     Shoot review (primary)
/apps/photo-coach/guide/               Field-guide journey (secondary)
/apps/photo-coach/profile/             Early photographer companion
/apps/photo-library/                   Local catalog
/apps/hidden-landscapes/               Creative spectral-inspired studio
/apps/animal-vision/                   Species vision approximations
/apps/waypoint-scenes/                 Early Living Scene / parallax / export PNG
/apps/landscape-interpretation/        Place-reading education (adjacent)
/apps/photo-pipeline/                  Owner review tool (not consumer product)
/scenes/                               Redirect → photo-coach
```

### Dead / absent

Journals, Year in Nature, calendars, books, root short aliases for coach/HL/living-scenes.

---

## 3. Repository / code-path inventory

### Production-used paths (authoritative)

| Concern | Path |
|---------|------|
| Hub UI | `apps/scenes/index.html`, `apps/scenes/css/scenes-home.css` |
| Photo Coach UI | `apps/photo-coach/index.html` |
| Coach analysis / shoot / profile | `apps/waypoint-scenes/js/photo-coach*.js`, `exif-reader.js`, `utils/file-upload.js` |
| Photo Library | `apps/photo-library/js/pl-*.js` |
| Hidden Landscapes | `apps/hidden-landscapes/js/hl-*.js`, `data/transformations.json` |
| Animal Vision | `apps/animal-vision/js/*`, `data/species.json` |
| Early Living Scene | `apps/waypoint-scenes/` (effects engine under `js/engine/`) |
| Shell / nav | `design-system/js/platform/wds-app-nav*.js` |
| Outdoor context bridge | `design-system/js/wds-ecosystem-bridge.js`, `photo-coach-outdoor-context.js` |
| Dashboard handoff links | `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-intel.js` (read-only for this audit) |

### Parallel / scaffold / abandoned patterns

| Path | Status |
|------|--------|
| `apps/scenes/js/engines/*` | Interface stubs / registry only — **not** the live Coach/HL engines |
| `apps/scenes/*/index.html` redirects & placeholders | Thin product skin |
| `apps/photo-coach/guide/` + `js/photo-coach-*.js` (journey) | Parallel “field guide” product under same brand |
| `apps/waypoint-scenes/index.html` | Older all-in-one studio (Living Scene + Coach CSS cohabitation) |
| `apps/photo-pipeline/` | Internal owner pipeline review |
| Field-guide templates (`design-system/field-guide/templates/seasonal-journal.html`) | Template language only — not a Scenes journal product |

### Tests (selected)

`automation/test-photo-coach-shoot-review.mjs`, `test-photo-library.mjs`, `test-hidden-landscapes.mjs`, `test-photographer-profile.mjs`, `test-animal-vision.mjs`, `smoke-browser.mjs` (includes Scenes routes).

### Docs (selected)

`docs/SCENES_PLAYBOOK.md`, `docs/rebuild-2026/04-scenes-architecture.md`, app-local ARCHITECTURE / PHOTO-LIBRARY / SHOOT-REVIEW / ANIMAL-VISION / PHOTOGRAPHER-PROFILE.

---

## 4. Feature reality matrix

| Feature | Status | Evidence |
|---------|--------|----------|
| Scenes hub | **LIVE + FUNCTIONAL** | Production `/apps/scenes/` |
| Photo Coach shoot review | **LIVE + FUNCTIONAL** | Upload 1–20, on-device analysis, labels, shoot summary, local persistence |
| Photo Coach field guide (`/guide/`) | **PARTIALLY FUNCTIONAL** | Curated concepts + conditions when platform resolves; separate from shoot review |
| Photo Library | **LIVE + FUNCTIONAL** | IndexedDB + localStorage catalog, collections, handoff ids |
| Photographer Profile (early) | **PARTIALLY FUNCTIONAL** | `/apps/photo-coach/profile/` computes from records; hub page is preview |
| Hidden Landscapes | **LIVE + FUNCTIONAL** | Upload, modes, intensity, compare, local export; honesty catalog |
| Animal Vision | **LIVE + FUNCTIONAL** | Deer/honeybee/box turtle approximations; local export |
| Living Scenes (hub module) | **PLACEHOLDER** | Explicit “Future experience” |
| Living Scenes (waypoint-scenes effects) | **PROTOTYPE / PARTIALLY FUNCTIONAL** | Canvas effects (fog, rain, fireflies…), parallax, PNG snapshot; many exports pending |
| Scene Builder | **VISUAL MOCKUP / PREVIEW** | Hub preview; early studio = waypoint-scenes |
| Outdoor Journals | **NOT IMPLEMENTED** | No routes, no app |
| Hiking / wildlife / mushroom journals | **NOT IMPLEMENTED** | Mentions only as genre heuristics in Coach |
| Year in Nature | **NOT IMPLEMENTED** | |
| Book / calendar outputs | **NOT IMPLEMENTED** | Coach “print lab” = advice text; `export.js` video/wallpaper stubs |
| Landscape Interpretation | **PARTIALLY FUNCTIONAL** | Adjacent educational app; not in Scenes local nav |
| Photo Pipeline | **DORMANT** (owner tool) | Not part of consumer Scenes journey |
| Scenes engine stubs | **DORMANT** | Scaffold only |

---

## 5. Photo Coach audit

### Surfaces

1. **Primary:** `/apps/photo-coach/` — “How did today’s shoot go?”  
2. **Secondary:** `/apps/photo-coach/guide/` — conditions, composition concepts, editing philosophy, gear, local progress.  
3. **Companion:** `/apps/photo-coach/profile/` — growth profile from analyses.

### Upload

Yes. Drag/drop, file picker, folder picker; JPG/PNG/WebP; up to 20 images / 20 MB each. Client-side only (object URLs / canvas). Trust copy states analysis runs in browser.

### Analysis — real vs simulated

**Real on-device heuristics**, not a stubbed random mock and **not** an external LLM/API.

- Engine: `apps/waypoint-scenes/js/photo-coach-analysis-demo.js` (filename legacy; header says **On-device analysis engine v4**).
- Method: downsample to ~200×130 canvas → luminance/color/edge/Laplacian/thirds histogram signals → confidence-gated strengths/issues → letter grade.
- Schema labels engine as `demo-analysis` / “On-device analysis” — honest about limits, but naming is confusing.
- **No TensorFlow / cloud vision / ChatGPT** in the critique path. `wds-ai-guide.js` is loaded for guide-card patterns, not as the photo judge.

### Feedback coverage

| Dimension | Present? | Quality notes |
|-----------|----------|---------------|
| Composition / balance / thirds | Yes | Heuristic tonal weight; useful but shallow vs expert critique |
| Exposure / highlights / shadows | Yes | Histogram-based |
| Focus / sharpness | Partial | Laplacian blur estimate — resolution- and downsample-sensitive (historical soft-critique risk) |
| Subject isolation | Partial | Center vs edge brightness proxy — not true subject detection |
| Color / warmth | Yes | |
| Crop suggestions | Text advice | Does **not** modify pixels |
| EXIF | Yes | `exif-reader.js` — camera, focal, exposure when present; does not invent |
| Nature / genre | Heuristic | Landscape/forest/wildlife/mushroom guesses from signals + EXIF focal |
| Outdoor context | Optional | Reads `sessionStorage` `waypoint-outdoor-context-v1` if Dashboard/OIE saved it |

### Modify images?

**No.** Coaching + private Keep/Maybe/Reject/Favorite labels. Originals preserved; Library stores blobs separately.

### Mobile

Upload UI is responsive (see `photo-coach-390.png`). Folder picker and large sessions are weaker on phones; analysis itself is browser-capable.

### Vs generic AI chat

**Differentiation today:** private, local, shoot-batch workflow, structured scores, EXIF, optional field context, no upload-to-cloud.  
**Weakness:** critique depth is classical CV heuristics — a careful ChatGPT vision session can feel more “human.” Waypoint wins on **privacy, shoot workflow, outdoor context, and trust labeling** — not on prose wisdom alone.

### Verdict

**Keep and harden** as the flagship. Rename/clarify “demo” branding. Treat blur/sharpness confidence gates as a known risk. Do not replace with opaque cloud AI without opt-in and honesty.

---

## 6. Living Scenes audit

### Two meanings (confusing)

1. **Hub module** `/apps/scenes/living-scenes/` — placeholder (“no animation controls yet”).  
2. **Early studio** `/apps/waypoint-scenes/` — upload still → Effects Studio (fog, rain, snow, fireflies, leaf drift, light rays, cloud drift, dust) + parallax + PNG export.

### Inputs / outputs

- Inputs: user photograph; optional presets.  
- Outputs: animated canvas preview; PNG snapshot. Video / Live Photo / wallpaper exports = **not implemented** (`export.js` stubs).  
- Env data / Dashboard weather driving effects: **pending** per `scene-context.js` capabilities.  
- Persistence / personalization: weak relative to Coach/Library.  
- Generative imagery: **none** (effects on user’s photo).

### Differentiation

A quiet atmospheric still→motion tool *could* differentiate; today it is still a **visual experiment / prototype**, not a subscriber-worthy product. The hub correctly labels the unfinished module as Future — but waypoint-scenes remains reachable and can inflate expectations.

### Verdict

**DEFER** productization. Do not invest as V1 core. Optionally keep as Side Trail / experimental studio under honest status.

---

## 7. Journals audit

Outdoor Journals, hiking/wildlife/mushroom journals, Year in Nature:

| Capability | Status |
|------------|--------|
| Create/name journals | **NOT IMPLEMENTED** |
| Entries / photos / dates / locations | **NOT IMPLEMENTED** in Scenes |
| Search / edit / delete / export | **NOT IMPLEMENTED** |
| Templates vs products | N/A — concept-only in strategy docs / field-guide templates |

Fieldry owns structured outdoor observations; ForageCast has its own journal surface. **Scenes does not currently own REMEMBER.** Building journals in Scenes would be greenfield and should not be assumed from pillar slides.

### Verdict

**DEFER** (or route REMEMBER to Fieldry linkage later). Do not pretend templates equal a product.

---

## 8. Books / calendars / outputs audit

| Output | Reality |
|--------|---------|
| Photo books / Year in Nature books | **NOT IMPLEMENTED** |
| Calendars | **NOT IMPLEMENTED** |
| Print ordering / commerce | **NOT IMPLEMENTED** (correct — do not build) |
| Coach “Print lab” | Advisory copy from analysis (canvas size suggestions) |
| HL / Animal Vision export | Local JPEG/PNG download of transformed preview |
| Living Scene export | PNG snapshot only |

### Verdict

**DEFER** all book/calendar products. Keep local image export. No commerce.

---

## 9. Hidden Landscapes audit

### What exists

Studio at `/apps/hidden-landscapes/` with catalog-driven modes, e.g.:

`original`, `infrared-dream`, `crimson-canopy`, `violet-wilds`, `ghost-forest`, `electric-meadow`, `nocturnal-world`, `mono-infrared-study`

Plus honesty taxonomy (`creative-false-color`, `specialized-capture-required`, education essays on IR/full-spectrum/filters). Intensity slider, split/side/toggle compare, local download.

**Animal Vision** (sibling): research-informed approximations for deer, honeybee, box turtle — explicitly not exact subjective vision; RGB-limited.

### Concept vs implementation

| Concept | Status |
|---------|--------|
| IR-inspired false color | **Live simulation** (honest) |
| UV / thermal / true full-spectrum capture | **Not captured** — education only |
| Polarization / phenology time-series | **Not implemented** |
| Macro / night as specialized modes | Genre hints in Coach; not HL modes |
| Animal vision | **Live approximations** (separate app) |
| Scientific viz / NDVI | Explicitly **not** NDVI (`vegScore` comment) |

### Scientific honesty

Strong. Catalog summary: previews are **not** genuine IR/UV/full-spectrum/thermal/species-accurate vision. This must remain non-negotiable.

### Verdict

**KEEP** as EXPLORE pillar — already live, differentiated, and on-brand when honesty stays front-and-center. Merge Animal Vision under “Other ways of seeing” IA (already partially done in nav).

---

## 10. Dashboard → Scenes handoff audit

*(Dashboard code inspected only; not modified.)*

### What Dashboard does

Rebuild intel attaches `toolLinks` with `id: "scenes"`, `href: "/apps/scenes/"`, and reason strings such as:

- Favorable evening light / golden window  
- Blue-hour light  
- Dark-sky opportunity  
- Morning light window  

Happening Now / depth actions surface these links. **No query string, hash, or POST body** carries opportunity id, light state, or location.

### What Scenes receives

| Channel | Behavior |
|---------|----------|
| URL params from Dashboard links | **None** |
| `sessionStorage` `waypoint-outdoor-context-v1` | Written by `WDS.ecosystemBridge` when OIE briefing is saved (typically while using Dashboard/platform) — **not** written by the Scenes link click itself |
| Photo Coach outdoor panel | Reads bridge snapshot if present; empty state otherwise |

### What Scenes needs (future, Scenes-side)

Without changing frozen Dashboard behavior beyond eventual deep links:

1. Accept optional `?opportunity=` / `?light=` / `?from=dashboard` (when Dashboard later emits them).  
2. On hub/Coach, if outdoor context missing, offer “Use today’s field conditions” via platform boot (location permission — already platform-shaped).  
3. Never invent conditions when bridge empty.

### Verdict

Handoff is **navigational only** today — useful as a door, not a contextual coach. Highest ROI later: deep-link + read existing ecosystem bridge; do not block V1 on Dashboard changes.

---

## 11. User-journey analysis

**Intended hub journey:** Import → Review shoot → Choose keepers → Learn (articles) → Discover Hidden Landscapes → Later Create/Profile.

**Actual journey:** Mixed tool collection with a strong spine:

```
[Dashboard conditions] ──link──► Scenes hub ──► Photo Coach
                                      │
                                      ├─► Photo Library
                                      └─► Hidden Landscapes / Animal Vision
                                 (Living Scenes / Builder / Journals = incomplete)
```

Coherent **if** V1 commits to craft loop. Incoherent if all four conceptual pillars are treated as equal shipping promises.

Best natural journey for Waypoint:

> I noticed conditions (Dashboard) → I went outside → I review frames (Coach) → I keep evidence (Library) → I deepen seeing (HL) → I return outside with one clearer idea.

CREATE/REMEMBER can arrive later without blocking that loop.

---

## 12. Differentiation analysis

| Pillar | Why use it beyond “it’s in Waypoint”? | Verdict |
|--------|----------------------------------------|---------|
| Photo Coach | Private shoot review + on-device critique + EXIF + optional field context; not a social feed | **Strong if quality rises** |
| Photo Library | One local SoT for photos across modules | **Necessary infrastructure** |
| Hidden Landscapes | Honest spectral literacy + beautiful remaps without fake science | **Strong niche** |
| Animal Vision | Educational empathy with clear limits | **Strong companion to HL** |
| Living Scenes | Only if motion feels like *place memory*, not Instagram effects | **Weak today** |
| Journals | Personal natural history — but Fieldry already owns observations | **Weak as Scenes duplicate** |
| Books/calendars | Emotional keepsake — no implementation; commerce out of scope | **Defer** |

---

## 13. Product-value scoring (1–5)

Scale: higher is better except **Effort** and **Maintenance** (5 = hardest/heaviest).

### Photo Coach (+ Shoot Review)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Usefulness | 4 | Solves real post-shoot need |
| Differentiation | 4 | Local + outdoor-aware + session workflow |
| Waypoint fit | 5 | Learn / understand seeing |
| Emotional value | 4 | “How did today go?” resonates |
| Repeat-use | 5 | Every outing |
| Feasibility | 4 | Already live |
| Effort | 3 | Harden, don’t invent |
| Maintenance | 3 | Heuristics + storage |
| Monetization | 4 | Depth/session history/profile |
| Identity demo | 5 | Shows calm craft + honesty |

### Photo Library

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Usefulness | 4 | Foundation for all photo tools |
| Differentiation | 3 | Local-first is the differentiator |
| Waypoint fit | 5 | Privacy / evidence |
| Emotional value | 3 | Quiet utility |
| Repeat-use | 5 | |
| Feasibility | 4 | Live |
| Effort | 3 | |
| Maintenance | 4 | IndexedDB quotas |
| Monetization | 2 | Should stay free core |
| Identity demo | 3 | |

### Hidden Landscapes (+ Animal Vision)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Usefulness | 3 | Wonder + literacy more than daily utility |
| Differentiation | 5 | Honesty + education unusual |
| Waypoint fit | 5 | Explore / understand perception |
| Emotional value | 5 | |
| Repeat-use | 3 | Occasional |
| Feasibility | 4 | Live |
| Effort | 2 | Polish |
| Maintenance | 2 | |
| Monetization | 3 | Packs / education later |
| Identity demo | 5 | |

### Living Scenes

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Usefulness | 2 | Decorative unless place-memory deepens |
| Differentiation | 2 | Crowded effects space |
| Waypoint fit | 3 | Create — optional |
| Emotional value | 3 | |
| Repeat-use | 2 | |
| Feasibility | 3 | Prototype exists |
| Effort | 4 | Perf + export hard |
| Maintenance | 4 | |
| Monetization | 3 | |
| Identity demo | 3 | |

### Outdoor Journals / Year in Nature / Books

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Usefulness | 4 (concept) / 1 (today) | High if built; zero now |
| Differentiation | 4 (concept) | |
| Waypoint fit | 4 | REMEMBER — but Fieldry overlap |
| Emotional value | 5 (concept) | |
| Repeat-use | 5 (concept) | |
| Feasibility | 2 | Greenfield |
| Effort | 5 | |
| Maintenance | 4 | |
| Monetization | 4 | Books later |
| Identity demo | 4 | |
| **Ship now?** | **No** | Sunk-cost ignore: not real |

---

## 14. Scenes V1 recommended scope

**Scenes is Waypoint’s photographic craft + perception studio.**

### V1 core (ship excellence)

1. **Photo Coach** — shoot review & mentoring  
2. **Photo Library** — single local catalog / handoff SoT  
3. **Hidden Landscapes** (+ Animal Vision as EXPLORE) — honest other ways of seeing  
4. **Scenes hub** — routes the day-with-camera journey without fake modules

### Explicit non-goals for V1

- Outdoor Journals / Year in Nature / books / calendars / print commerce  
- Weather Dashboard inside Scenes  
- Social sharing / rankings  
- Cloud AI critique as default  
- Full Living Scenes productization  
- Merging Scenes visually into another Dashboard

---

## 15. KEEP / MERGE / DEFER / REMOVE

| Decision | Item |
|----------|------|
| **KEEP** | Photo Coach shoot review; Photo Library; Hidden Landscapes; Animal Vision; Scenes hub; ecosystem outdoor-context reader; honesty catalogs |
| **MERGE** | Animal Vision under HL “Other ways of seeing”; Photographer Profile into Coach growth companion (drop duplicate preview page narrative); Scene Builder preview → point only to experimental studio with status; Coach guide as secondary tab/section of Coach, not a rival product |
| **DEFER** | Living Scenes product; weather-driven living scenes; journals; Year in Nature; books/calendars; cloud AI critique; wallpaper/video export; Landscape Interpretation as Scenes-nav primary |
| **REMOVE / IGNORE (for V1 planning)** | Treating `apps/scenes/js/engines` stubs as architecture; `/scenes/` skip-hub redirect as desired IA (fix to hub later); journal/book concepts as “existing features”; owner-only photo-pipeline as user Scenes |

---

## 16. Visual-system audit (vs frozen Dashboard v1)

**No visual changes made.**

| Area | Observation |
|------|-------------|
| Shared | WDS shell, Cormorant + Source Sans/Inter, dark charcoal studio ground, lime/olive accents |
| Hub | Photographic full-bleed hero — correct Scenes identity (immersive, not instrument grid) |
| Coach | Dense three-column craft layout on desktop; stacks on mobile — more “tool” than Dashboard instruments |
| HL / AV | Studio panels + canvas stage — appropriate |
| Living Scenes placeholder | Reuses hub card/status language — fine for Future |
| Mismatch risks | Inter vs Source Sans inconsistency across pages; Guide vs Shoot Review feel like two products; Dashboard instrument art language should **not** be copied into Scenes |
| Mobile | Hub and Coach usable; secondary nav wraps; folder import weaker |

**Recommendation:** Inherit WDS tokens, type, shell, trust labels. Scenes should stay **more photographic and stage-led** (hero, canvas, filmstrip) — never a second instrument panel.

---

## 17. Technical-risk audit

### REQUIRED FOR V1

| Risk | Notes |
|------|-------|
| Browser storage quotas | Library IndexedDB originals; Coach localStorage shoots/records — quota & eviction UX |
| Image decode / large files | 20 MB caps; downsample for analysis; mobile memory |
| EXIF privacy | Strip/share choices; GPS in EXIF — never upload silently |
| Sharpness heuristic trust | Over-confident blur grades damage trust |
| Cross-module handoff | `libraryId` contracts must stay stable |
| Honest labeling | demo-analysis / simulation copy must stay accurate |

### LATER INFRASTRUCTURE

| Risk | Notes |
|------|-------|
| Auth / sync / cross-device | Not required for local-first V1 |
| Cloud AI cost | Only if opt-in critique added |
| Backend media | Avoid until sync exists |
| Dashboard deep-link protocol | Coordinate when Dashboard unfreezes |
| Export video / wallpaper | Perf + encoding |

### OPTIONAL

| Risk | Notes |
|------|-------|
| Mobile camera capture (`capture=`) | Nice-to-have vs file pick |
| Desktop importer bridge | Future SoT with disk library |
| WebGL effects for Living Scenes | Defer with product |

---

## 18. Monetization fit

**No payments implemented or proposed here.**

| Tier | Features |
|------|----------|
| **Free-value (must remain)** | Hub; basic single-image critique; Library core; HL/AV basic modes; privacy local processing |
| **Potential subscriber** | Multi-shoot history depth; richer personalized profile; advanced shoot analytics; curated coaching seasons; HL education packs; optional opt-in cloud critique |
| **Bad paywall** | Locking upload itself; locking honesty/education basics; locking Dashboard→Scenes door; charging for “Keep” labels |

Do not cripple the craft loop to manufacture a subscription.

---

## 19. Recommended architecture (planning only)

```
Scenes Hub
  ├─ Photo Library Engine     (IndexedDB SoT)
  ├─ Coach Engine             (analysis v4+ · shoot review · profile)
  ├─ Vision / Explore Engine  (HL transforms · Animal Vision)
  └─ Context Reader           (ecosystemBridge / future deep links)

Deferred: AnimationEngine (Living Scenes), JournalEngine, Output/BookEngine
Delete-from-mental-model: apps/scenes/js/engines stubs as “the platform”
```

Principles: local-first; progressive enhancement; one photo identity; simulation vs capture honesty; Dashboard for conditions, Scenes for craft.

---

## 20. ONE recommended next development attack

### Attack: **Photo Coach Shoot Review + Library SoT excellence**

**Why first:** Only live loop with daily repeat use, clear differentiation, existing code, Dashboard adjacency, and subscriber path — without inventing journals or shipping effects.

### WHAT IT SHOULD DO

- Make import → analyze (1–20) → label Keep/Maybe/Reject/Favorite → shoot summary → Library persistence feel calm, reliable, and trustworthy on desktop and mobile.  
- Clarify on-device analysis limits; tighten confidence gating (especially sharpness).  
- Ensure Library is the single catalog handoff for Coach ↔ HL.  
- Preserve outdoor-context panel when bridge data exists.  
- Align hub CTA and `/scenes/` entry so users land on the journey (hub or Coach — pick one intentional default).

### WHAT IT SHOULD NOT DO

- Cloud AI by default  
- Journals / books / Living Scenes productization  
- Dashboard redesign  
- Social features  
- Fake EXIF/location  
- Pixel-editing “auto fix” that silently alters originals  

### Minimum V1 functionality

1. Reliable multi-image shoot review with honest progress/cancel  
2. Stable private labels + shoot history  
3. Library import + open-in-Coach via `libraryId`  
4. Trustworthy empty/error/offline states  
5. Mobile-usable single-shoot path  
6. Clear “On-device analysis” labeling (retire confusing “demo” user-facing language)

### Subscriber-worthy bar

Session history that compounds into a private photographer companion; coaching that cites visible evidence + field context; library that becomes the user’s quiet archive — still local-first.

### Data / APIs

- Canvas + EXIF in-browser  
- Existing localStorage/IndexedDB keys  
- Optional outdoor context from ecosystem bridge / platform location  
- No new paid API required  

### Reuse vs rebuild vs delete/ignore

| Reuse | Rebuild / harden | Ignore for this attack |
|-------|------------------|------------------------|
| `photo-coach-analysis-demo.js` v4, shoot.js, repository, Library engine, shell | Confidence UX, storage resilience, mobile filmstrip, naming/trust copy, handoff | Living Scenes, journals, books, engine stubs, pipeline |

### Complexity

**MEDIUM** (HIGH if expanding into cloud AI or sync).

---

## Appendix A — Production confirmation

- **SHA:** `b615963`  
- **Prior context SHAs** (`9c8babcb` / `b615963`): current live meta confirms **`b615963`**.  
- **`/build-info.json`:** 404 on production (meta tag is the live signal).

## Appendix B — Screenshot index

Directory: `docs/rebuild-2026/scenes-v1-audit-screenshots/`

Examples: `scenes-home-{390,430,768,1440,1728}.png`, `photo-coach-*.png`, `photo-library-*.png`, `hidden-landscapes-*.png`, `living-scenes-*.png`, `waypoint-scenes-*.png`, plus secondary routes at 390/1440.

## Appendix C — Stop condition

This document ends the audit. No feature implementation, no feature PR, no Dashboard changes, no Scenes redesign performed.
