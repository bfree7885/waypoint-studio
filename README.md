# Waypoint Scenes

Bring quiet, cinematic motion to landscape and nature photographs — entirely in your browser.

Part of the **Waypoint Studio** ecosystem. Shared UI tokens, components, and patterns live in [`design-system/`](design-system/README.md) (WDS). The **Learn** tab uses the [Waypoint Education Framework](design-system/education/README.md) (WEF).

## AI agents (Cursor)

Role definitions for faster development live in [`.ai-agents/`](.ai-agents/README.md) — product, design, engineering, motion, education, QA, and release. Mission: **Observe. Understand. Create. Share.**

## Run locally

From the project root:

```bash
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080).

## Interface

Single-page workspace with five tabs:

| Tab | Purpose |
|-----|---------|
| **Living Scene** | Upload, Effects Studio, Scene Presets, live weather/atmosphere preview |
| **Interactive Parallax** | 2.5D mouse/tilt parallax (separate from weather effects) |
| **Photography** | Darkroom portfolio, masonry gallery, field notes |
| **Learn** | Guides and Coming Soon roadmap |
| **Export** | Snapshot preview (video export on roadmap) |

Hero upload, drag-and-drop, and nav shortcuts sit above the tabbed workspace.

## Effects (modular engine)

Each overlay module supports **intensity, speed, opacity, scale, and randomness**. Camera has **zoom, horizontal drift, vertical drift, and rotation**.

| Module | Layer |
|--------|-------|
| Fog, Cloud Drift, Light Rays | DOM / CSS |
| Rain, Snow, Fireflies, Dust, Leaf Drift | Canvas (shared loop) |

Add new effects in `js/engine/effects/` — see `js/engine/README.md`.

## Scene presets

Ten curated moods in `js/scene-presets.js`. Upload a photo for automatic analysis and preset recommendations (`js/scene-analyzer.js`).

Morning Mist · Dense Fog · Golden Hour · Blue Hour · Thunderstorm · Winter Stillness · Spring Rain · Firefly Evening · Mountain Wind · Still Lake · Rippling Water

## Coming Soon roadmap

Seventeen upcoming AI and export features appear as cards in the sidebar (`js/coming-soon.js`), grouped by:

Scene intelligence · Motion & atmosphere · Sky & night · Transformation · Export & delivery

## Export (planned)

See `js/export.js` for export handler stubs. UI placeholders live in the Coming Soon panel.

## Requirements

- Modern browser with Canvas and File API
- No login, no paid APIs, no build step
