# Waypoint University — Work Block 3 Report

**Date:** 2026-07-18 / 2026-07-19  
**Schema:** 1.2.0  
**Status:** Uncommitted — do not push until requested  

---

## Mission check

| Criterion | Result |
|-----------|--------|
| Adaptive learning companion (not AI tutor) | **Yes** — derived insights from use |
| Understand what I know / forget / never connected | Profile + Understanding Map + gaps + bridges |
| Focus next | Ranked next steps with **why** |
| No grades / social / gamification | Enforced by design |

---

## Learning engine architecture

Module: `private/university/js/wu-learn.js` (`WU.Learn`)

```
graphIndex + meta(recentViews, learningGoals, lastWriteAt)
        │
        ▼
  buildInsights()  ← fingerprint cache (invalidate on write/open/search)
        │
        ├── profile          (focus, improving, neglected, depth, breadth, momentum, confidence)
        ├── map              (Understanding Map by stage)
        ├── gaps             (learning opportunities)
        ├── next             (≤5 recommendations + why)
        ├── bridges          (cross-disciplinary)
        └── timeline         (intellectual growth events)
```

**Performance:** Insights rebuild only when the fingerprint changes (`nodeCount:edgeCount:lastWriteAt`). Typical elapsed time is surfaced in Settings / Understanding. Search relatedness still uses tag/project inverted indexes from Block 2.

---

## Knowledge progression model

Stages (descriptive, never grades):

1. Discovered → 2. Exploring → 3. Practicing → 4. Applying → 5. Connecting → 6. Teaching → 7. Mastering  

**Inference signals:** body depth, open count, degree, examples/applications, project tags, definitions/answered questions, research conclusions, annotations, interdisciplinary neighbors, optional self-rated confidence.

**Manual override:** `learning.stageManual` on edit. Auto resumes when cleared.

**Use tracking:** `touchOpened` increments `openCount` / `lastStudiedAt`; search records `searchHits` on top hits.

---

## Understanding Map

Panel `#understanding` groups topics by effective stage. Home shows profile strip (focus, improving, quiet, revisited, cross-links).

---

## Recommendation logic

Scored candidates (capped at 5), each with a human **why**:

- Today’s focus / reading queue  
- Missing prerequisites & weak hubs  
- Mid-stream research  
- Open questions on active projects  
- Long-term goals (Settings)  
- Cross-disciplinary bridge seeds  

---

## Cross-disciplinary discovery

`DISCIPLINE_BRIDGES` in schema (vision↔photo, GIS↔ecology, ecology↔foraging, cyber↔linux, stats↔wildlife, AI↔apps, tea/wine↔place). Surfaces when both sides have material and few cross-links. Multi-project nodes highlighted as hinges.

---

## Timeline / project intelligence / reading

- **Timeline:** discoveries, finished sources, answered questions, research conclusions, project links — grouped by year.  
- **Projects:** living hubs via `projectIntelligence` (related, missing, references, questions, recent, research, disciplines, bridges).  
- **Reading:** annotations (`highlight`, `margin`, `definition`, `question`, `concept`, `future`) on any item; Reading workspace lists in-progress and annotated sources. Ready for future document overlay annotation without requiring it now.

---

## Search evolution

`Search.researchAssist(graphIndex, node)` adds nearby concepts, frequent hubs, follow-ups, projects using this, questions involving this — layered on Block 2 related/follow-up search.

---

## Explicitly not built

Public profiles · classrooms · grades · certificates · social · gamification · leaderboards · AI tutoring.

---

## Remaining debt / toward V1.0

| Item | Notes |
|------|--------|
| Media blobs + full backup | Still the largest capture gap |
| Worker insights for 50k+ nodes | Cache helps; incremental still better |
| PDF/page-anchored annotation | Schema ready; UI is note-based |
| Merge duplicates / revision restore | Health finds; no merge UI |
| Optional private SRS | `review` fields unused in UI |

---

## Files

```
private/university/js/wu-schema.js   — 1.2.0 stages, bridges, annotations
private/university/js/wu-store.js    — learning + annotations + goals + search hits
private/university/js/wu-learn.js    — NEW engine
private/university/js/wu-search.js   — researchAssist
private/university/js/wu-app.js      — panels + home companion
private/university/css/wu.css
private/university/index.html
docs/WAYPOINT-UNIVERSITY-BLOCK3.md
docs/WAYPOINT-UNIVERSITY-BLOCK3-CHANGELOG.md
docs/WAYPOINT-UNIVERSITY-ROADMAP.md
docs/WAYPOINT-UNIVERSITY-ARCHITECTURE.md
docs/WAYPOINT-UNIVERSITY-KNOWLEDGE-MODEL.md
```
