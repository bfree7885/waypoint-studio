# Field Station

**Status:** Phase C  
**Date:** 2026-09-14  
**Branch:** `terrainbound/phase-c-field-station`  
**Not merged. Not deployed.**

The Field Station is a thin porch in front of the existing TerrainBound field game. It is a camp, not an LMS.

Companions: [`TERRAINBOUND-LEARNING-ENVIRONMENT.md`](TERRAINBOUND-LEARNING-ENVIRONMENT.md), [`CURRICULUM-ARCHITECTURE.md`](CURRICULUM-ARCHITECTURE.md), [`SUMMIT-ARCHITECTURE.md`](SUMMIT-ARCHITECTURE.md).

---

## Purpose

Students arrive at a Field Service station: continue field work, walk the land, read the course atlas, or watch a real catalog item. The Canvas 2D game remains the place you investigate and apply.

It is not a school portal, gradebook, module list, or standards dashboard.

---

## Navigation / state

No router framework. Hash routes only:

| Hash | Surface |
| --- | --- |
| `#/` | Field Station home |
| `#/course` | Course atlas (Topic 1–12) |
| `#/course/topic-01` | Topic detail |
| `#/watch` | Watch & Read |
| `#/watch/{resourceId}` | One catalog item |
| `#/ask` | Ask Summit placeholder |
| `#/field` | Existing game |

Browser back returns from Course / Watch / Field to the previous Station hash. Mobile back is the same history stack.

`?field=1` or `?station=0` skips the Station and boots the game as before (review / capture).

The game instance is created on first Field or Continue (`boot()`), then paused (`mode = "away"`) when returning. No full reload.

---

## Why it is not an LMS

- No completion percentages, assignments, or admin chrome.
- Course atlas is an expedition guide: topic number, title, honest status.
- Future topics say they are not built. No fake missions.
- Standards codes never appear.
- Concept IDs stay in data; students see names.

---

## Course surface

Authority: `data/learning/curriculum.json` via `courseDisplayTopics()`.

Display order is Topic **1 → 12** until `ownerDefinedCourseSequence` is supplied. Game travel order (`1, 2, 10, 11, …`) is not the Course list.

---

## Field integration

`js/field-station.js` never imports `game.js`. `main.js` injects `boot`.

Tiny `game.js` hook: `enterField`, `leaveField`, `enableReturn` HUD / title “Field Station” buttons. Canvas, regions, Summit overlay, AAR, atlas, and save key are unchanged.

---

## Watch & Read

Renders `catalog.json` resources and videos only. Mount Hood is a YouTube nocookie embed, branded **Deep Forest Dispatch**. Investigations are labeled as field work, not a second player.

---

## Ask Summit placeholder

No ask box. Copy states Summit tutors inside supported investigations (Cedar Hollow, Dark Sky). A “Find Summit in the field” button opens Field. Phase D wires global Summit.

---

## Save / Continue

`SAVE_KEY` is unchanged. Continue appears only when `readSave` returns a journal. It calls `enterWorld()` (skips the in-game title). Field always shows the existing title screen. No-save home uses “Start field work.”

---

## Mobile

One scroll root (`.station-shell`). 44px targets, safe-area padding, landscape compact header, `:focus-visible`, `prefers-reduced-motion`. Do not nest the Station inside the game overlay stack.

---

## Phase D

Open the same Summit engine from Station / Course / Watch with `SummitContext`. Keep one conversation. Optional mobile fullscreen Ask Summit. Do not invent a second bot.
