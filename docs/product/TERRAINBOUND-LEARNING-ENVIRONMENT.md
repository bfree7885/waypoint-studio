# TerrainBound as an Earth & Space Science learning environment

**Status:** Phase A foundation — architecture only  
**Date:** 2026-09-14  
**Branch:** `terrainbound/phase-a-learning-foundation`  
**Not merged. Not deployed.**

This document is the product north star for TerrainBound’s next evolution. It does **not** replace the working field game. Cedar Hollow, High Country, Sunfall Desert, Dark Sky Basin, Field Clearance, hazards, and production Summit stay.

Companion: [`SUMMIT-ARCHITECTURE.md`](SUMMIT-ARCHITECTURE.md). Existing tutor design remains [`terrainbound/docs/SUMMIT-TUTOR-ARCHITECTURE.md`](../../terrainbound/docs/SUMMIT-TUTOR-ARCHITECTURE.md).

---

## Product north star

TerrainBound is becoming a comprehensive **NYS Earth & Space Sciences** learning environment.

The existing game remains a major component. It is how students **apply** science in the field. It is not the whole product.

Students should be able to:

**Explore → Watch → Read → Ask → Investigate → Apply**

The feel is an Earth & Space Science world, not an LMS and not a digital textbook. Interesting science first. Standards sit behind the scenes.

Four long-term layers:

1. **Game / field investigations** — existing TerrainBound regions, puzzles, Wren, Field Clearance.
2. **Ask Summit** — one persistent tutor across game, curriculum, real-world stories, videos, and general questions.
3. **Real-world Earth & Space Science** — curated events and articles with “Summit’s Take.” No live news ingestion in this phase.
4. **Watch / visual learning** — Deep Forest Dispatch and other educational video, embedded, never rehosted.

---

## Game preservation

Non-negotiable:

- Do not rewrite the Canvas 2D engine.
- Do not discard Cedar Hollow, High Country, Sunfall, or Dark Sky Basin.
- Do not replace Field Clearance, AAR, hazards, or atlas progression.
- Do not make Summit grant clearance or complete puzzles.
- Do not surface NYSSLS / HS-ESS codes in student UI.
- Do not merge TerrainBound into Waypoint Studio Dashboard.

The game stays a standalone static site (`terrainbound/` → `terrainbound.org`). A future Field Station shell may wrap it. The engine stays the engine.

---

## Relationship with Deep Forest Dispatch

Deep Forest Dispatch and TerrainBound are **separate, interconnected** Earth & Space Science experiences.

```
Deep Forest Dispatch  <->  TerrainBound
```

| Rule | Meaning |
| --- | --- |
| Brands stay distinct | Do not merge DFD into TerrainBound or TerrainBound into DFD |
| TerrainBound may surface DFD films | YouTube embed only; do not download or rehost third-party video |
| DFD may point at TerrainBound | A story can invite related field work when that region exists |
| Summit may appear in DFD films | Same character, not a second tutor brand |
| Ideas may cross | Weather, ice, water, sky — shared science, separate products |

DFD catalog today: `data/deep-forest-dispatch/`. TerrainBound Phase A only records the sibling pointer in `terrainbound/data/learning/catalog.json`. No videos are copied into the game.

---

## Curriculum-first architecture

The spine is the owner’s **12-topic NYS Earth & Space Sciences course**, already stored on the atlas:

| # | Title (from `data/world/regions.json`) | Region | State |
| --- | --- | --- | --- |
| 1 | Scientific Thinking & Earth Systems | Cedar Hollow | playable |
| 2 | Maps, GIS & Geospatial Thinking | High Country | playable |
| 3 | Earth's Materials | Painted Badlands | future |
| 4 | Surface Processes | Glacier Country | future |
| 5 | Earth's Interior & Plate Tectonics | Firepeak | future |
| 6 | Earth's History | Deep Time Canyon | future |
| 7 | Weather & Atmospheric Systems | Stormlands | future |
| 8 | Climate & Global Change | Icewater Bay | future |
| 9 | Water & Ocean Systems | Island Coast | future |
| 10 | Solar System | Sunfall Desert | playable |
| 11 | Stars & the Universe | Dark Sky Basin | playable |
| 12 | Natural Resources, Hazards & Sustainability | High Sierra | future |

Teaching order is not numeric: `1, 2, 10, 11, 3, 4, 5, 6, 9, 7, 8, 12`.

**Official NYS P-12 / NYSSLS performance-expectation codes are not in the repository.** `placeholderAlignment.code` is null. `data/learning/standards.json` is an empty alignment table with `status: pending-owner-codes`. Do not invent codes.

Topic titles were **not invented in Phase A**. They are read from existing region data via `curriculumTopicsFromWorld`.

If the owner’s classroom names differ from these twelve titles, supply the authoritative list before Phase B populates extra copy.

---

## Summit’s expanded role

One Summit. Several contexts. Not five bots.

| Context | When | Behavior |
| --- | --- | --- |
| Game | Inside a region | Existing investigation-aware tutoring |
| Curriculum | On a topic/concept | Teach the idea; do not complete field work |
| Story | On a real-world event | Summit’s Take: what happened, why it matters, which science |
| Video | On a DFD or educational film | Pause-and-ask; connect to topics |
| General | No current artifact | Earth & Space Science questions, still honest about unknowns |

Shared rules: guide rather than give the answer; never grant Field Clearance; never invent measurements or visits. See `SUMMIT-ARCHITECTURE.md`.

---

## Content model

Implemented as `terrainbound/js/learning.js` plus:

- `data/learning/catalog.json` — empty collections, DFD sibling pointer
- `data/learning/standards.json` — empty alignments

| Model | Phase A |
| --- | --- |
| `CurriculumTopic` | Derived from world regions |
| `CurriculumConcept` | Empty here; game terms stay in `data/summit/concepts.json` |
| `StandardAlignment` | Schema only; no codes |
| `LearningResource` | Empty |
| `ScienceStory` | Empty (no news ingest) |
| `VideoResource` | Empty (embed later; never rehost) |
| `GameExperience` | Index of existing regions |
| `SummitContext` | Typed context object; not yet wired into `game.js` |

Conceptual relationship (not populated):

```
ScienceStory
  → curriculum topics / concepts
  → standards (internal)
  → SummitContext
  → related video(s)
  → related TerrainBound investigation(s)
```

---

## Proposed information architecture

The current product is a **single-page field game**: title screen → canvas world → overlays (atlas, tablet, Summit, AAR). There is no student home, no hash router, and no Discover/Learn chrome. That is correct for the game we shipped.

A four-tab LMS (`Today / Discover / Learn / Play / Ask Summit`) would fight that feel.

**Recommendation: add a thin Field Station shell later, keep Play as the current game.**

| Surface | Student job | Now |
| --- | --- | --- |
| **Continue** | Resume the last field region or topic | Game title “Explore” / save resume |
| **Field** | Play the existing TerrainBound game | The whole current app |
| **Course** | See the 12-topic spine without fake completion | Atlas already shows topics; not a module list |
| **Ask Summit** | Tutor with preserved context | In-game overlay only |
| **Watch & Read** | DFD films and science stories | Not built; do not ingest news |

Why not the suggested labels as equal tabs:

- **Today / Discover** as a news river would turn TerrainBound into Dashboard-lite. Curated “one interesting thing” can live under Watch & Read later.
- **Learn** as a content library reads as a textbook. The course atlas should feel like the world map, not a checklist.
- **Play** is already the product. It should not become a tile among four equals until the shell exists.
- **Ask Summit** should be reachable from everywhere, including a dedicated mobile full-screen later, without leaving Field.

Phase C should prototype Field Station as a calm porch in front of the existing `boot()`, not a rewrite of `game.js`.

Student loop once the shell exists:

1. Arrive at Field Station.
2. Continue field work, or open Course / Watch & Read.
3. Ask Summit from any surface; conversation persists.
4. Closing Summit returns to the exact surface (game camera, article, or video).

---

## Phased implementation roadmap

Adjusted from the requested sequence against what the repo already contains.

| Phase | Name | Job | Depends on |
| --- | --- | --- | --- |
| **A** | Architecture / foundation | This document, `learning.js`, empty catalogs, SummitContext, mobile viewport hook | Done on this branch |
| **B** | Curriculum + NYS standards spine | Owner-confirmed topic copy if needed; official PE codes into `standards.json`; concept map per topic **without** inventing codes | Owner codes |
| **C** | Field Station / home | Thin shell: Continue + Field (existing game) + Course atlas. No LMS chrome | A |
| **D** | Global Ask Summit | Wire `SummitContext` from game + course; optional mobile `fullscreen` layout; conversation persists across surfaces | A, C |
| **E** | Real-world science + Summit’s Take | Curated `ScienceStory` items (manual). No live RSS | B for topic links |
| **F** | Video / DFD | Embed DFD YouTube ids; TerrainBound may link out; DFD pages may link in | F does not require E |
| **G** | Cross-link game ↔ learning | Stories/videos point at playable investigations; investigations can cite a story without becoming homework | E/F + playable regions |
| **H** | Progress / review | Field Record already exists in-game. Later: course-level review that is not grades/quizzes | G |

Do not start live news ingestion, accounts, payments, or a second game engine in any of these phases.

---

## Phase A files

- `terrainbound/js/learning.js`
- `terrainbound/data/learning/catalog.json`
- `terrainbound/data/learning/standards.json`
- `terrainbound/tests/learning-foundation.test.mjs`
- Isolated Summit keyboard inset: `syncSummitViewport` + CSS variables (sheet layout unchanged)
