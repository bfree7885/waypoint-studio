# Waypoint Scenes

**Observe. Discover. Understand.**  
Capture what you find. Learn why it matters.

Flagship photography product in **[Waypoint Studio](../../)**.

Every imported shoot becomes a **Scene**. Photo Coach, Portfolio Advisor, Living Scenes, Outdoor Journals, and Print Studio all operate on the same Scene — the user should never re-upload the same photographs.

## Primary workspace

| Area | Route |
|------|-------|
| **Scene Library** | [`library/`](./library/) |
| **Shoot Review / Scene Detail** | [`scene/?id=…`](./scene/) |
| Scenes landing (four pillars) | [`index.html`](./) |

## Four paths (from a Scene)

| Pillar | Experience | Route |
|--------|------------|-------|
| **LEARN** | Photo Coach | [`/apps/photo-coach/?sceneId=…`](../photo-coach/) |
| **CREATE** | Living Scenes | [`create/`](./create/) |
| **REMEMBER** | Outdoor Journals | [`remember/`](./remember/) (foundation) |
| **SELECT** | Portfolio Advisor | [`portfolio/`](./portfolio/) (foundation) |
| **EXPLORE** | Hidden Landscapes | [`explore/`](./explore/) |

**Photo Coach source of truth:** [`/apps/photo-coach/`](../photo-coach/) — do not host a second consumer Coach here.  
**Owner `photo_pipeline`:** separate internal tooling — not the consumer LEARN experience.

## Scene ingestion interface

Stable contract (Importer will call this eventually — Scenes does not care how photos arrived):

- `WaypointSceneIngest.ingestFromFolderFiles(files, meta)`
- `WaypointSceneIngest.ingestFromLibraryFolder(folderMeta)`
- `WaypointSceneIngest.ingestFromExistingShoot(shoot)`
- `WaypointSceneIngest.ingestFromImporterPayload(payload)`

Modules live under [`js/scene-library/`](./js/scene-library/).

## Run locally

From the **repository root**:

```bash
python3 -m http.server 8080
```

Open [http://localhost:8080/apps/waypoint-scenes/library/](http://localhost:8080/apps/waypoint-scenes/library/)

## Key paths

| Area | Location |
|------|----------|
| Scene Library | `library/` |
| Scene Detail | `scene/` |
| Portfolio Advisor foundation | `portfolio/` |
| Export foundation | `export/` |
| Living Scenes studio | `create/` |
| Outdoor Journals foundation | `remember/` |
| Hidden Landscapes overview | `explore/` |
| Scene model / engine / ingest | `js/scene-library/` |
| Shared Coach JS | `js/photo-coach*.js` |
| Foundation styles | `css/scenes-foundation.css`, `css/scene-library.css` |

## AI agents

[`docs/ai-agents/`](../../docs/ai-agents/README.md)
