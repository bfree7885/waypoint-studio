# TerrainBound — Cedar Hollow

A small cartoon wilderness you can walk. This folder is a **standalone prototype**, not a Waypoint Studio app.

It is **not** the retired trail-endurance page at `apps/terrainbound/`. Do not wire this game into Studio nav, product registries, DNS, or `terrainbound.org`.

## Run

From the repository root:

```bash
python3 -m http.server 8085
```

Open [http://localhost:8085/terrainbound/](http://localhost:8085/terrainbound/)

Needs a local http server (ES modules). Do not open `index.html` as `file://`.

## Checks

```bash
node terrainbound/tests/phase0.test.mjs
node terrainbound/tests/phase1.test.mjs
node terrainbound/tests/phase2.test.mjs
node terrainbound/tests/phase3.test.mjs
node terrainbound/tests/phase4.test.mjs
```

Progress is stored in this browser only. **New exploration** in the Field Tablet clears it after confirmation.

## What is playable

Region: **Cedar Hollow** — station, woods, knob, creek, pond, marsh, rocky exposure, overlook. Topic 1, Scientific Thinking & Earth Systems.

Eleven further regions exist on the **world map as previews only**. They are not walkable worlds yet.

The world map is a stylized atlas, not GIS. Travel follows teaching order. A new region opens when mastery evidence is sufficient — not XP, quizzes, or collectible completion.

Missions:
- **Where Does the Water Go?** (storm water path)
- **Reading the Landscape** (what shaped the hollow)

Discoveries: 12 optional field finds. Walk to them and inspect. Names stay hidden until found.

Field tablet (**J**): Mission notes, Discoveries, Evidence cards, a landscape sketch, and a **Field Record**. Evidence is a student's interpretation, not a minimap. World map: title screen, tablet World tab, or the World map control.

Ranger Wren: short comments, hints when useful, acknowledgement of finds. After enough landscape evidence, the player builds an explanation from a process plus recorded notes — not a quiz.

## Architecture

| Layer | Role |
| --- | --- |
| `data/world/regions.json` | Twelve-region manifest (names, order, previews) |
| `data/world/bible.json` | Design blueprint for future regions |
| `data/world/tools.json` | Field tools earned by learning |
| `data/world/hazards.json` | Hazard / respond hooks (unimplemented) |
| `data/mastery/` | Topic 1 competency slots and travel requirements |
| `data/regions/` | Playable places (Cedar Hollow only) |
| `data/missions/` | Missions |
| `data/discoveries/` | Optional finds (data-driven) |
| `data/investigations/` | Landscape interpretation |
| `data/curriculum/` | Hidden standards placeholders |
| `js/worldmap.js` | Atlas, previews, travel gate |
| `js/mastery.js` | Evidence vs content completion |
| `js/tools.js` / `js/hazards.js` | Toolkit and respond architecture |
| `js/world.js` | Terrain, biomes, collision |
| `js/mission.js` | Mission observations |
| `js/discoveries.js` | Discovery log |
| `js/investigation.js` | Evidence, measurements, hypothesis |
| `js/curriculum.js` | Internal alignment |
| `js/save.js` | Local field journal (v2, migrates v1) |
| `js/audio.js` | Quiet audio bus |
| `js/render.js` + `js/ui.js` + `js/game.js` | Game loop |

Canvas 2D, no build step, no paid services.

## Out of scope

Teacher dashboard, accounts, quizzes, XP, playable regions 2–12, deploy, `terrainbound.org`.
