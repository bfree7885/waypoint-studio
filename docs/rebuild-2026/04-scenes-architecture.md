# 04 — Scenes Architecture

**Status:** Architecture baseline — awaiting owner approval  
**Depends on:** [01-product-vision.md](./01-product-vision.md), [02-information-architecture.md](./02-information-architecture.md)  
**Live honesty:** Public surface status is documented in [`docs/scenes/FOUR-PILLAR-VISION.md`](../scenes/FOUR-PILLAR-VISION.md). This file preserves product vision; it must not be read as a claim that Living Scenes, Scene Builder, Outdoor Journals, or Portfolio are live finished products.

---

## Product definition

**Scenes** is Waypoint’s photography product: **education, photo analysis, shoot review, and learning** — a craft companion for people who make outdoor photographs.

Soul: deepen how you see. Not weather. Not shed hunting. Not a social network.

---

## Relationship to existing code (research snapshot)

Today’s tree (reference for rebuild planning — not binding IA):

| Path | Role today |
|------|------------|
| `apps/scenes/` | Product hub / module landings / engine stubs |
| `apps/photo-coach/` | Live Photo Coach + Shoot Review |
| `apps/photo-library/` | Local catalog + handoff |
| `apps/hidden-landscapes/` | Experimental creative / spectral literacy |
| `apps/animal-vision/` | Related experimental vision literacy |
| `apps/waypoint-scenes/` | Early scene builder studio |
| `apps/scenes/docs/ARCHITECTURE.md` | Prior modular platform notes |

The 2026 Rebuild treats Scenes as a **greenfield product architecture** that may absorb, wrap, or retire these paths deliberately — not a patch note on Outdoor OS, and not a forced rewrite of working Coach tools without a migration plan.

---

## Product job

When someone opens Scenes they should think: *“This helps me understand my photographs and grow as a photographer.”*

Primary jobs:

1. **Analyze** a photograph with honest, educational critique
2. **Review a shoot** (session queue, private labels, best-of categories, session summary)
3. **Learn** — light, composition, landscape literacy, without grades-as-product
4. **Keep a private library and profile** rooted in evidence they actually made

---

## Module map (rebuild baseline)

| Module | Purpose | Maturity posture |
|--------|---------|------------------|
| **Photo Coach** | Single-image and session critique | Core |
| **Shoot Review** | Session workflow (queue, labels, summary) | Core (may live inside Coach) |
| **Photo Library** | Local-first catalog, search, collections, handoff | Core |
| **Photographer Profile** | Private companion from analysis history | Core companion |
| **Hidden Landscapes** | Creative interpretations + honesty about simulation vs real spectral | Experimental |
| **Living Scenes** | Subtle motion / atmosphere on stills | Future |
| **Scene Builder** | Interactive photographic environments / stories | Preview / future |

Status labels on the hub must stay honest: Available / Experimental / Preview / Future.

---

## Surfaces

```
Scenes home
  ├── Photo Coach / Shoot Review  ← primary craft tool
  ├── Photo Library               ← local catalog
  ├── Photographer Profile        ← private growth companion
  ├── Hidden Landscapes           ← experimental
  └── Future modules              ← preview only until real
```

**Hub vs tool:** The hub introduces and routes. The tools do the work. Do not trap users on marketing cards when a working tool exists — deep-link to start-here experiences.

---

## Data concepts

| Concept | Meaning |
|---------|---------|
| **Photo / Image ref** | Local or session-scoped reference; privacy default local |
| **CoachingSession** | Critique, opportunities, links to profile evidence |
| **Shoot** | Ordered session of photos + private labels + summary stats |
| **Library catalog** | Indexed local originals/collections (e.g. IndexedDB patterns already explored) |
| **PhotographerProfile** | Aggregated private evidence — DNA-like preferences, gentle observations |
| **ImageSet** | Multi-mode frames for landscape literacy (Hidden Landscapes trajectory) |

Never fabricate EXIF, location, or season. Soft language for inference (“It appears…”, “You may notice…”).

---

## Engine boundaries (logical)

| Engine | Responsibility |
|--------|----------------|
| **CoachEngine** | Critique and shoot-review facade |
| **LibraryEngine** | Catalog, search, handoff ids |
| **ProfileEngine** | Lifelong private companion recalculation |
| **VisionEngine** | Creative / literacy transformations (experimental honesty) |
| **SceneEngine** | Scene documents / educational layers (future) |
| **AnimationEngine** | Living Scenes motion (future) |

Engines are product-internal. Dashboard and Sheds do not embed CoachEngine as their home.

---

## Education model

- Observation and coaching — **not** homework, quizzes, or public grades
- Explain *why* a suggestion might help seeing; do not shame
- Creative simulations must disclose they are not genuine IR/UV/thermal when they are not
- Optional light/conditions context from providers is supporting color — Scenes does not become Dashboard

---

## Privacy

- Local-first originals and critique history by default
- No cloud upload without explicit opt-in
- Profile is private; any future sharing is separate and opt-in
- Importer bridges are interface contracts, not silent exfiltration

---

## Cross-product rules

| From Scenes | Allowed | Forbidden |
|-------------|---------|-----------|
| → Dashboard | Link for conditions / light widgets | Hosting Dashboard workspace inside Scenes chrome as primary |
| → Sheds | Rare contextual links (e.g. wildlife ethics) | Becoming a shed map |
| ← Dashboard | “Review shoot” deep link | Dashboard owning shoot review IA |

---

## Performance

- Hub pages: static-first, no blocking on all modules
- Coach: progressive analysis; show image immediately
- Library: virtualize large catalogs; do not decode all originals up front
- Fail gracefully offline for local assets; honest errors for missing files

---

## Explicit non-goals

- Merging Scenes into Dashboard widgets as the photography product
- Social feed, followers, public rankings
- Replacing Outdoor OS with “Scenes briefing”
- Pretending experimental spectral tools are scientific instruments without disclosure
