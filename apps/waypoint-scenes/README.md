# Waypoint Scenes

**Observe. Discover. Understand.**  
Capture what you find. Learn why it matters.

Flagship photography product in **[Waypoint Studio](../../)** — four pillars:

| Pillar | Experience | Route |
|--------|------------|-------|
| **LEARN** | Photo Coach | [`/apps/photo-coach/`](../photo-coach/) |
| **CREATE** | Living Scenes | [`create/`](./create/) |
| **REMEMBER** | Outdoor Journals | [`remember/`](./remember/) (foundation) |
| **EXPLORE** | Hidden Landscapes | [`explore/`](./explore/) |

**Canonical entry:** [`/apps/waypoint-scenes/`](./)  
**Photo Coach source of truth:** [`/apps/photo-coach/`](../photo-coach/) — do not host a second consumer Coach here.  
**Owner `photo_pipeline`:** separate internal tooling — not the consumer LEARN experience.

Shared design system: [`design-system/`](../../design-system/README.md).

**Governance:** [`docs/STRATEGIC-DIRECTION.md`](../../docs/STRATEGIC-DIRECTION.md) · [`docs/WAYPOINT-STUDIO-CONSTITUTION.md`](../../docs/WAYPOINT-STUDIO-CONSTITUTION.md)

## Run locally

From the **repository root**:

```bash
python3 -m http.server 8080
```

Open [http://localhost:8080/apps/waypoint-scenes/](http://localhost:8080/apps/waypoint-scenes/)

## Key paths

| Area | Location |
|------|----------|
| Scenes landing | `index.html` |
| Living Scenes studio | `create/` |
| Outdoor Journals foundation | `remember/` |
| Hidden Landscapes overview | `explore/` |
| Shared Coach / studio JS | `js/` |
| Foundation styles | `css/scenes-foundation.css` |
| WDS (shared) | `../../design-system/` |

## AI agents

[`docs/ai-agents/`](../../docs/ai-agents/README.md)
