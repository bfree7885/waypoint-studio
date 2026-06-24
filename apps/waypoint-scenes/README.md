# Waypoint Scenes

Creative reflection from field evidence — honest landscape photography, quiet motion, and collections that treat your frames as evidence from a place.

Part of **[Waypoint Studio](../../)** — the fourth core instrument (after Dashboard, ForageCast, and Fieldry). Supports photography and memory; does not replace structured observation capture in Fieldry.

**Role:** Visual storytelling after time outside — not a harvest tool, not a social feed.

Shared design system: [`design-system/`](../../design-system/README.md). Learn engine: [WEF](../../design-system/education/README.md).

**Governance:** [`docs/STRATEGIC-DIRECTION.md`](../../docs/STRATEGIC-DIRECTION.md) · [`docs/WAYPOINT-STUDIO-CONSTITUTION.md`](../../docs/WAYPOINT-STUDIO-CONSTITUTION.md)

## Run locally

From the **repository root** (not this folder):

```bash
python3 -m http.server 8080
```

Open [http://localhost:8080/apps/waypoint-scenes/](http://localhost:8080/apps/waypoint-scenes/)

## Interface

| Studio | Purpose |
|--------|---------|
| **Living Scene** | Upload, Effects Studio, Scene Presets, atmosphere |
| **Parallax** | 2.5D mouse/tilt depth |
| **Collections** | Gallery, field notes, workflow |
| **Field Guide** | WEF curriculum |
| **Export** | PNG snapshot |

## Key paths

| Area | Location |
|------|----------|
| App shell | `index.html` |
| Styles | `css/` |
| Scripts | `js/` |
| Images | `assets/Images/` |
| Portfolio SVGs | `images/portfolio/` |
| WDS (shared) | `../../design-system/` |

## AI agents

[`docs/ai-agents/`](../../docs/ai-agents/README.md)
