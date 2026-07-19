# Waypoint Scholar — Module 4 Report

**Date:** 2026-07-18 / 2026-07-19  
**Schema:** 1.3.0  
**Status:** Uncommitted — do not push until requested  

---

## Mission check

| Criterion | Result |
|-----------|--------|
| Scholar as place where ideas begin | **Yes** — primary nav + home CTA |
| Dedicated research workspaces | 8 workspaces, shared design language |
| Research sessions → timeline | Start / end / park; timeline merge |
| Field note architecture | Contexts, place, conditions, geo hooks |
| Project research hubs | Sessions, notes, questions, sources, experiments, field, ideas |
| Source reliability | Personal dimensions + conflicts |
| Thinking tools foundation | Stubs + editable fields; canvases deferred |
| Calm / fast / private | No social, no grades |

---

## Architecture

```
wu-schema.js   SCHOLAR_WORKSPACES, FIELD_NOTE_CONTEXTS, RELIABILITY_*, THINKING_TOOLS, session kinds
wu-store.js    session / field / reliability / thinking normalize + startSession / endSession / captureFieldNote
wu-scholar.js  workspace filters, hubs, reliability summary, timeline merge, thinking stubs
wu-app.js      #scholar workspaces + session/field/thinking flows
wu-learn.js    unchanged core; Scholar merges session/field into timeline UI
```

Sessions, field notes, and thinking artifacts are **first-class nodes** in the same graph — not a parallel database.

---

## Research workspaces

Active Research · Reading · Writing · Projects · Experiments · Reference · Questions · Field Notes  

Each filters kinds (and a few workflow signals) while sharing cards, typography, and navigation.

---

## Research session model

```
kind: session
session: { purpose, startedAt, endedAt, status, workspace, discoveries, futureWork, questionIds[], conceptIds[], sourceIds[] }
```

`meta.activeSessionId` tracks the live session. Completed sessions appear on the learning timeline.

---

## Field notes

```
kind: field-note
field: { context, place, conditions, capturedAt, lat?, lon? }
```

Contexts: photography, wildlife, trail, tea, wine, foraging, cyber, linux, gis, other.  
Designed for future offline/media capture without requiring it now.

---

## Source reliability

Personal scores 0–5: authority, evidence, bias concern, recency, confidence — plus free-text conflicting viewpoints and notes. Never presented as objective truth.

---

## Thinking tools (foundation only)

Concept map · Argument map · Decision journal · Hypothesis · Experiment plan  

Creating a stub allocates the kind + `thinking` payload. Full interactive canvases are Module 5+ work.

---

## Recommendations for Module 5

1. **Media & place** — photo/audio attach on field notes; map pin optional; full backup with blobs  
2. **Session linking UI** — pick questions / concepts / sources into `session.*Ids` without raw IDs  
3. **Thinking canvases** — start with hypothesis board + decision journal review dates  
4. **Argument / concept map** — SVG or list-based claim graphs on top of existing edges  
5. **Scholar command palette** — one keystroke to session, field note, or search  
6. **Reliability roll-ups** — per-project evidence quality without ranking people  

---

## Technical debt

| Item | Notes |
|------|--------|
| session.*Ids unused in UI | Schema ready; picker next |
| Thinking stubs are forms, not canvases | Intentional |
| Nav length growing | Consider Scholar-first IA collapse later |
| Media still missing | Module 5 / V1.0 critical |

---

## Files

```
private/university/js/wu-schema.js
private/university/js/wu-store.js
private/university/js/wu-scholar.js   NEW
private/university/js/wu-app.js
private/university/css/wu.css
private/university/index.html
docs/WAYPOINT-UNIVERSITY-BLOCK4-SCHOLAR.md
docs/WAYPOINT-UNIVERSITY-BLOCK4-CHANGELOG.md
docs/WAYPOINT-UNIVERSITY-ROADMAP.md
docs/WAYPOINT-UNIVERSITY-ARCHITECTURE.md
docs/WAYPOINT-UNIVERSITY-KNOWLEDGE-MODEL.md
```
