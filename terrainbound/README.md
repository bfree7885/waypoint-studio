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
```

## What is playable

Region: **Cedar Hollow** — station, woods, knob, creek, pond, marsh, rocky exposure, overlook.

Mission: **Where Does the Water Go?** (optional to ignore).

Discoveries: 12 optional field finds. Walk to them and inspect. Names stay hidden until found.

Field tablet (**J**): Mission notes and Discoveries as separate notebook sections.

Ranger Wren: short comments, hints when useful, acknowledgement of finds. No lectures.

## Architecture

| Layer | Role |
| --- | --- |
| `data/regions/` | Places |
| `data/missions/` | Missions |
| `data/discoveries/` | Optional finds (data-driven) |
| `data/curriculum/` | Hidden standards placeholders |
| `js/world.js` | Terrain, biomes, collision |
| `js/mission.js` | Mission observations |
| `js/discoveries.js` | Discovery log |
| `js/curriculum.js` | Internal alignment |
| `js/render.js` + `js/ui.js` + `js/game.js` | Game loop |

Canvas 2D, no build step, no paid services.

## Out of scope

Teacher dashboard, accounts, quizzes, XP, extra regions, deploy, `terrainbound.org`.
