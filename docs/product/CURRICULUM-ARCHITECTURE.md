# TerrainBound curriculum architecture

**Status:** Phase B spine  
**Date:** 2026-09-14  
**Branch:** `terrainbound/phase-b-curriculum-spine`  
**Not merged. Not deployed.**

This is the authoritative 12-topic course model. It does **not** replace the field game. Regions stay an atlas. Standards stay invisible to students.

Companions: [`TERRAINBOUND-LEARNING-ENVIRONMENT.md`](TERRAINBOUND-LEARNING-ENVIRONMENT.md), [`SUMMIT-ARCHITECTURE.md`](SUMMIT-ARCHITECTURE.md).

---

## Regions are not the curriculum

```
NYS Standards (internal, codes pending)
            ↑
         Concepts
            ↑
      12-Topic Course
     ↙        ↓         ↘
  Game     Summit     Resources
                      ↙        ↘
                   DFD        Stories
```

| Object | What it is | What it is not |
| --- | --- | --- |
| **Curriculum topic** | One slot in the owner’s 12-topic NYS Earth & Space Sciences course | A game region |
| **Game region** | A walkable atlas place (Cedar Hollow, Dark Sky, …) | A module / unit ID |
| **Science concept** | A plain-language idea students actually learn | A standards code |
| **Standard alignment** | Internal NYSSLS / NYS P-12 metadata | Student-facing chrome |
| **Learning resource** | Investigation, DFD video, article, review, … | A live news feed |

A topic may have zero, one, or many game regions, plus articles, videos, Summit contexts, and review. A region may later support concepts from more than one topic if the science justifies it.

Today every topic still has **one planned atlas region**. That is a current mapping copied from `regions.json`, not a law. The schema already allows a topic with no field work and a concept that belongs to two topics (`runoff` → Topic 1 and Topic 9) without turning Cedar Hollow into Island Coast.

---

## Authoritative 12-topic model

File: `terrainbound/data/learning/curriculum.json`

This file is the course. `data/world/regions.json` remains the atlas (`curriculumTopic` / `curriculumTitle` are **links**, not the database).

Teaching order (unchanged): `1, 2, 10, 11, 3, 4, 5, 6, 9, 7, 8, 12`.

`prerequisiteTopicIds` are that teaching-order predecessor. **Game unlocks are separate** (`predecessor`, `availableAfter` on regions / experiences). Dark Sky is Topic 11 and opens after Cedar Hollow field clearance; it is not “you finished Topics 2–10.”

### Owner-review table

**All 12 titles currently derive only from `regions.json` `curriculumTitle` (mirrored on mastery profiles and the world bible).** There is no separate classroom syllabus file in the repository. Treat every title as **awaiting owner confirmation**.

| # | Current repo title | Source | Confidence | Existing region(s) | Existing concepts found | Existing standards found | Needs owner confirmation? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Scientific Thinking & Earth Systems | `regions.json` `curriculumTitle`; also mastery `cedar-hollow.json`, bible | Repo-derived from region metadata | Cedar Hollow (playable) | Mastery habits + Summit hydrology/systems concepts | No PE codes. Placeholder SEPs only | **Yes** |
| 2 | Maps, GIS & Geospatial Thinking | `regions.json`; mastery `high-country.json`; bible | Repo-derived | High Country (playable) | Mastery geospatial competencies | None (codes null) | **Yes** |
| 3 | Earth's Materials | `regions.json`; bible; puzzle travel list | Repo-derived; concepts are **proposed**, not playable | Painted Badlands (future) | Puzzle-doc travel IDs (`mineral-id`, `density`, …) | None | **Yes** |
| 4 | Surface Processes | `regions.json`; bible; puzzle travel list | Repo-derived; proposed | Glacier Country (future) | Puzzle-doc travel IDs (`glacial-forms`, `mass-wasting`, …) | None | **Yes** |
| 5 | Earth's Interior & Plate Tectonics | `regions.json`; bible; puzzle travel list | Repo-derived; proposed | Firepeak (future) | Puzzle-doc travel IDs (`plate-motion`, …) | None | **Yes** |
| 6 | Earth's History | `regions.json`; bible; puzzle travel list | Repo-derived; proposed | Deep Time Canyon (future) | Puzzle-doc travel IDs (`superposition-wayup`, `radiometric`, …) | None | **Yes** |
| 7 | Weather & Atmospheric Systems | `regions.json`; bible; puzzle travel list | Repo-derived; proposed | Stormlands (future) | Puzzle-doc travel IDs + one DFD video pointer (Mount Hood) | None | **Yes** |
| 8 | Climate & Global Change | `regions.json`; bible; puzzle travel list | Repo-derived; proposed | Icewater Bay (future) | Puzzle-doc travel IDs (`weather-vs-climate`, …) | None | **Yes** |
| 9 | Water & Ocean Systems | `regions.json`; bible; puzzle travel list | Repo-derived; proposed | Island Coast (future) | Puzzle-doc travel IDs; `runoff` also linked from Topic 1 | None | **Yes** |
| 10 | Solar System | `regions.json`; mastery `sunfall-desert.json`; bible | Repo-derived | Sunfall Desert (playable) | Mastery sky competencies | None | **Yes** |
| 11 | Stars & the Universe | `regions.json`; mastery `dark-sky-basin.json`; bible | Repo-derived | Dark Sky Basin (playable) | Mastery light-as-evidence competencies | None | **Yes** |
| 12 | Natural Resources, Hazards & Sustainability | `regions.json`; bible; puzzle travel list | Repo-derived; proposed | High Sierra (future, synthesis) | Puzzle-doc travel IDs (`whole-toolkit`, …) | None | **Yes** |

Do not invent replacement titles. If the classroom names differ, supply the list and Phase B follow-up will copy it into `curriculum.json` (and then optionally sync atlas copy).

---

## Concept layer

File: `terrainbound/data/learning/concepts.json`

Plain-language ideas. Each row has `evidenceSource` and `evidenceKind`:

| Kind | Meaning |
| --- | --- |
| `mastery-competency` | Playable region mastery profile (`elicitedNow: true`) |
| `summit-concept` | `data/summit/concepts.json` (Cedar Hollow tutor glossary) |
| `proposed-travel-competency` | Travel-required IDs in `docs/PUZZLE-CURRICULUM-ARCHITECTURE.md` §9.2 for **unbuilt** regions |

No concept was filled from general Earth Science memory. Future-region names such as `density` or `plate-motion` are the repository’s own planned IDs; summaries paraphrase those IDs and the region bible purpose, not a textbook.

Cross-links that are already justified:

- `runoff` → Topics 1 and 9 (taught in Cedar Hollow; Island Coast owns infiltration vs runoff later)
- `timescale` → Topics 1 and 6
- `slope` related to High Country `gradient`
- `moon` related to Island Coast `tides-ocean`
- `rain-shadow` → Topic 7, evidenced in the Deep Forest Dispatch Mount Hood story (not a game region)

Cedar Hollow is **not** labeled a Topic 4 or Topic 9 game experience. Reading the Landscape may mention an older clock; ice as an agent stays Glacier Country.

---

## Standards layer

File: `terrainbound/data/learning/standards.json`

NYSSLS / NYS P-12 Earth & Space Sciences. Allowed types match that framework:

- `performance-expectation`
- `science-engineering-practice`
- `disciplinary-core-idea`
- `crosscutting-concept`

**Population status:** pending.

- `code` is null on every row
- `alignments` (PE table) is empty
- Seven SEP **titles** were copied from existing `data/curriculum/placeholders.json` `sciencePractice` strings
- A coded row is invalid unless `source` is set and `verificationStatus` is `owner-supplied` or `verified-against-nyssls`
- `playerVisible: false` — tests fail if this flips on

Do not show HS-ESS codes, module lists, or benchmarks to students.

---

## Game-content alignment

File: `terrainbound/data/learning/experiences.json`

Each atlas region is one `GameExperience` today (`experience-{regionId}`) with `topicIds[]`, `conceptIds[]`, `standardIds[]`.

Playable mappings use elicited mastery/Summit concepts. Future mappings use the documented travel lists only. `standardIds` stay empty until owner codes exist.

The game engine does **not** import this file.

---

## Resource relationships

`catalog.json` collections:

| Type used in Phase B | Examples |
| --- | --- |
| `terrainbound-investigation` | Where Does the Water Go?, What makes water move, Reading the Landscape, High Country field season, Sunfall observing campaign, Light as field evidence |
| `review` | After the rain |
| `deep-forest-dispatch-video` | Mount Hood rain shadow (`youtubeVideoId` already in DFD story JSON) |

Supported types, mostly empty: `external-video`, `article`, `visualization`, `simulation`, `reading`, `assessment`.

No live news ingest. No DFD API. YouTube embed only; do not rehost. Brands stay distinct.

---

## Summit relationships

`SummitContext` (still not imported by `game.js`) now includes `standardIds` and `studentFacingStandards: false`.

Helpers: `curriculumSummitContext`, `attachCurriculumToSummitContext`.

Existing Cedar Hollow / Dark Sky packets are unchanged. Phase D may add `facts.learning` from this spine. Summit should know “Topic X, concept Y” and must not recite standards codes.

---

## What is owner-confirmed vs inferred

| Item | Status |
| --- | --- |
| 12 topic **numbers** and teaching order | In repo (`courseOrderTopicNumbers`) |
| 12 topic **titles** | In repo on regions — **not confirmed as classroom names** |
| Playable concepts (Topics 1, 2, 10, 11) | Evidenced in mastery + Summit glossary |
| Future-region concepts | Evidenced only as planned IDs in the puzzle architecture doc |
| Official NYSSLS PE / DCI / CCC codes | **Missing** |
| SEP practice **names** | Copied from placeholders; codes still null |
| Field Station / global Summit | Not this phase |

Regenerate JSON from the evidenced lists with `node terrainbound/data/learning/build-phase-b-data.mjs` if the spine files must stay in sync. Edit evidence sources first; do not hand-type codes into `standards.json`.
