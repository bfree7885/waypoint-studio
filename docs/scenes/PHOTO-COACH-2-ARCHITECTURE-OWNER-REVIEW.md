# Owner review — Photo Coach 2.0 architecture

**Date:** 2026-07-29  
**Focus:** Scenes / Photo Coach only (education-focused reviews)  
**Status:** Stop for owner review — **no merge, no deploy**

---

## Repository and branch

| | |
|--|--|
| **Repository** | `/home/bryan/Projects/waypoint-studio` |
| **Branch** | `feature/scenes-photo-coach-2-architecture` |
| **Starting SHA** | `89129f4fa7cd19b583e43b90ae9642fdcfb7650f` (`feature/scenes-sprint3-scene-library` tip) |
| **Implementation SHA** | `cd787d23d3c5f25ce65e2e9e383f5053afa1f6d2` |
| **Tip SHA** | `2ed6a21e91c49e6323a69837e4f11f8edd1fb21e` |
| **Working-tree note** | Unrelated local placeholder SVG edits may remain uncommitted; not part of this sprint. |

---

## How prior Scenes WIP was handled

| Effort | Handling |
|--------|----------|
| **Scene Library Sprint 1** | Not mid-flight in this session. Existing Scene Library work already lives on `feature/scenes-sprint3-scene-library` (base for this branch). No Library park commit required. |
| **Portfolio Advisor Foundation** | Not started / not mid-flight. Deferred entirely in favor of Photo Coach 2.0. |
| **Dashboard** | Untouched. |
| **Waypoint Importer** | Untouched. |

---

## Goal

Build **Photo Coach 2.0 architecture** for education-focused reviews — not image editing.

Each review supports:

1. Overall Impression  
2. Composition  
3. Light  
4. Color  
5. Subject  
6. Story  
7. Technical Quality  
8. What Works  
9. What Weakens It  
10. Suggested Edits  
11. What To Practice Next  

Reusable analysis modules + placeholder providers so future AI can plug in **without redesign**.

### Explicitly out of scope (honored)

- No LLM integration  
- No image generation  
- No cloud inference  

---

## What shipped

### Core architecture (`apps/waypoint-scenes/js/photo-coach-2/`)

| Module | Role |
|--------|------|
| `schema.js` | Review document model, section order, recommendation + evidence factories |
| `evidence.js` | Normalized image regions (zones/boxes) + EXIF citations |
| `modules.js` | One reusable analysis module per review section |
| `fixtures.js` | Deterministic woodland-dawn fixture (local tests/demos) |
| `providers.js` | Provider registry, AI-ready placeholder, heuristic fixture provider, contract |
| `composer.js` | Facade: `analyzeWith` / `analyzeFixture` / `analyzePlaceholder` / evidence audit |
| `ui.js` | Minimal section renderer |

### Consumer shell

- `apps/photo-coach/review-v2/index.html` — was-shell / WDS-friendly demo of all eleven sections  
- `apps/photo-coach/css/photo-coach-2.css` — scoped review styles  

### Tests

- `automation/test-photo-coach-2-architecture.mjs`  
  Covers schema section order/titles, module registry, region/EXIF evidence, placeholder vs fixture providers, recommendation citations, module composition overrides, and future-provider plug-in without redesign.

### Design rules enforced in code

- Every recommendation in the fixture provider cites a **region** and/or **EXIF** field.  
- Placeholder provider preserves full section shape without inventing critique.  
- Providers register via a stable `analyze(context) → ReviewDocument` contract.

---

## How to verify

```bash
node automation/test-photo-coach-2-architecture.mjs
```

Optional UI: open `apps/photo-coach/review-v2/index.html` via the studio static server / local file preview.

---

## Deferred

- Wiring Photo Coach 2.0 into the live Shoot Review upload flow (still uses legacy critique schema until a follow-up sprint)  
- Real on-device pixel heuristics beyond the deterministic fixture  
- Portfolio Advisor Foundation workflow  
- Scene Library enhancements beyond what already exists on the sprint-3 base  
- Any LLM / cloud model attachment (intentionally out of scope)

---

## Owner ask

Confirm the eleven-section review model and provider contract are the right foundation before wiring into production Shoot Review UI.
