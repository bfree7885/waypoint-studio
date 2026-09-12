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
node terrainbound/tests/phase5.test.mjs
node terrainbound/tests/phase6.test.mjs
node terrainbound/tests/phase7.test.mjs
node terrainbound/tests/phase7_5.test.mjs
node terrainbound/tests/phase7_6.test.mjs
node terrainbound/tests/phase7_7.test.mjs
node terrainbound/tests/phase7_8.test.mjs
node terrainbound/tests/phase7_8c.test.mjs
node terrainbound/tests/phase7_9a.test.mjs
node terrainbound/tests/phase7_9b.test.mjs
node terrainbound/tests/phase7_9c.test.mjs
node terrainbound/tests/phase7_9d.test.mjs
node terrainbound/tests/phase7_9e.test.mjs
node terrainbound/tests/phase7_9f.test.mjs
node terrainbound/tests/phase7_9g.test.mjs
node terrainbound/tests/phase7_9h.test.mjs
node terrainbound/tests/phase7_9i.test.mjs
# Supervised field test (opt-in; not the default):
# /terrainbound/?summit=fieldtest
# Optional captures: node terrainbound/tests/capture-phase79i.mjs
# Constrained GPT-OSS eval (requires SUMMIT_API_KEY; Groq OpenAI-compatible URL default):
# SUMMIT_API_KEY=... node terrainbound/tests/phase7_9g-live.mjs
# Science-precision GPT-OSS eval:
# SUMMIT_API_KEY=... node terrainbound/tests/phase7_9h-live.mjs
# Optional captures: node terrainbound/tests/capture-phase79h.mjs
```

Progress is stored in this browser only. **New exploration** in the Field Tablet clears it after confirmation.

## What is playable

Three-region vertical slice:

- **Cedar Hollow** — Field Station. Woods, knob, creek, pond, marsh. Topic 1, Scientific Thinking & Earth Systems.
- **High Country** — Ridgeline Station. Maps, GIS, and geospatial thinking. Opens after Cedar Hollow field clearance.
- **Sunfall Desert** — Sunfall Observatory. Solar system / sky lab. Opens after High Country field clearance.

Nine further regions exist on the **world map as previews only**. They are not walkable worlds yet. Dark Sky Basin is visible and closed.

The world map is a stylized atlas, not GIS. Travel follows teaching order. A new region opens when mastery evidence is sufficient — not XP, quizzes, or collectible completion.

- **Where Does the Water Go?** (CH-02 storm water path)
- **What You Can See** (CH-01 observation vs interpretation)
- **What makes water move faster?** (CH-03–04 runoff table + graph)
- **After the rain** (CH-05 systems in the creek)
- **Two clocks** (CH-06 timescales — not glacial mastery)
- **The hollow is a system** / **When the story breaks** (CH-07–08)
- **Make the case** (CH-09 Wren After Action Report → field clearance)

Discoveries: 12 optional field finds. Walk to them and inspect. Names stay hidden until found. Mastery does not require collecting all of them.

Field tablet (**J**): Mission notes, Discoveries, Evidence cards, a landscape sketch, **Field data** (your measurements and graph), **puzzle evidence**, and a **Field Record**. Evidence is a student's interpretation, not a minimap. World map: title screen, tablet World tab, or the World map control.

Ranger Wren: short comments, hints when useful, acknowledgement of finds. After enough landscape evidence, the player builds an explanation from a process plus recorded notes — not a quiz. After a fair runoff-table comparison, the player's own numbers become the dataset. High Country opens when the After Action Report earns **field clearance**, not when every page is filled.

## Architecture

| Layer | Role |
| --- | --- |
| `data/world/regions.json` | Twelve-region manifest (names, order, previews) |
| `data/world/bible.json` | Design blueprint for future regions |
| `data/world/presentation.json` | Travel titles, camera reveals, atmosphere |
| `data/world/tools.json` | Field tools earned by learning |
| `data/world/hazards.json` | Hazard / respond hooks (unimplemented) |
| `data/mastery/` | Competency slots and travel requirements |
| `data/regions/` | Playable places (Cedar Hollow, High Country, Sunfall Desert) |
| `docs/GAME-BIBLE.md` | Production design (Field Service, explorer, no enemy) |
| `data/missions/` | Missions |
| `data/discoveries/` | Optional finds (data-driven) |
| `data/investigations/` | Landscape interpretation and runoff-table investigation |
| `data/fielddata/` | Reusable field datasets |
| `data/challenges/` | Regional field challenges |
| `data/curriculum/` | Hidden standards placeholders |
| `js/worldmap.js` | Atlas, previews, travel gate |
| `js/mastery.js` | Evidence vs content completion |
| `js/flume.js` | Fair tests, slope vs speed |
| `js/fielddata.js` | Dataset, graph, interpretation |
| `js/challenge.js` | After-the-rain field clearance |
| `js/tools.js` / `js/hazards.js` | Toolkit and respond architecture |
| `js/world.js` | Terrain, biomes, collision |
| `js/mission.js` | Mission observations |
| `js/discoveries.js` | Discovery log |
| `js/investigation.js` | Evidence, measurements, hypothesis |
| `js/curriculum.js` | Internal alignment |
| `data/puzzles/` | Cedar Hollow Layer A puzzle spec |
| `data/aar/` | After Action Report stems |
| `js/puzzles.js` | Puzzle use, systems map, conflict, tablet evidence |
| `js/aar.js` | Field debrief scoring (clearance vs more evidence) |
| `js/summit*.js` + `data/summit/` | Cedar Hollow Summit tutor (authored + hybrid conversational layer) |
| `js/save.js` | Local field journal (v6, migrates earlier saves) |
| `js/audio.js` | Quiet audio bus |
| `js/character.js` / `js/stations.js` / `js/atmosphere.js` / `js/travel.js` / `js/density.js` | Explorer, stations, sky, title cards, landcover |
| `js/render.js` + `js/ui.js` + `js/game.js` | Game loop |

Canvas 2D, no build step, no paid services required. Summit stays fully playable offline. An optional loopback proxy (`terrainbound/server/summit-proxy.mjs`) can sit behind `data/summit/provider.json` without placing API keys in the browser.

## Out of scope

Teacher dashboard, accounts, quizzes, XP, Dark Sky Basin / regions 4–12 as playable worlds, deploy, `terrainbound.org`.
