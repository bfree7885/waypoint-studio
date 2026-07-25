# Owner review — Scenes Sprint 3  
## Scene Library + Shoot Review Workspace

**Date:** 2026-07-25  
**Focus:** Scenes only  
**Status:** Stop for owner review — **no merge, no deploy**

---

## Repository and branch

| | |
|--|--|
| **Repository** | `/home/bryan/Projects/waypoint-studio` |
| **Branch** | `feature/scenes-sprint3-scene-library` |
| **Starting SHA** | `e8258e187b7c72c31110327888fb4274207b851b` |
| **Ending SHA** | _(filled after commit)_ |
| **Working-tree status** | Sprint 3 committed and pushed on the feature branch. |

### Base-branch note

The brief asked to branch from `feature/scenes-sprint2-photo-coach-experience`. **That branch does not exist** locally or on `origin` (Sprint 2 was never committed under that name). This sprint was branched from the Sprint 1 tip (`feature/scenes-sprint1-four-pillar-foundation` @ `e8258e1`), which is the latest Scenes work.

---

## Vision delivered

Scenes is no longer only an upload app. Every imported shoot becomes a **Scene**. The Scene Library is the permanent foundation that Photo Coach, Portfolio Advisor, Living Scenes, Outdoor Journals, and future Print Studio plug into — without forcing the user to re-upload.

---

## Architecture

```
apps/waypoint-scenes/
  library/          Scene Library UI
  scene/            Shoot Review Workspace (Scene Detail)
  portfolio/        Portfolio Advisor foundation
  export/           Export foundation
  remember/         Outdoor Journals foundation (sceneId-aware)
  create/           Living Scenes studio (sceneId-aware)
  js/scene-library/
    scene-models.js     durable Scene + Photo model
    scene-store.js      localStorage index
    scene-engine.js     list / search / sort / filter / save
    scene-ingest.js     stable ingestion interface
    scene-demo.js       sample Scenes (Milford Woods, etc.)
    scene-format.js     date / status helpers
    scene-library-ui.js Library page UI
    scene-detail-ui.js  Detail + virtualized grid + photo detail
  css/scene-library.css
```

**Persistence:** Scene metadata in `localStorage` key `waypoint-scene-library-index-v1`. Thumbnails are URL references (sample assets or object URLs) — never hundreds of full-resolution blobs in localStorage.

**Importer decoupling:** Scenes does not import from Waypoint Importer directly. Importer (and any other source) calls the stable ingest API.

---

## Scene model (v1)

Fields implemented:

- Identity: `id`, `title`, `schemaVersion`
- Dates: `createdDate`, `captureDate`, `lastOpenedAt`
- Place: `location`, `gps`
- Capture: `camera`, `lens`, `exifSummary`
- Import: `importSource`, `storageLocations`
- Imagery: `coverImageId`, `coverImageUrl`, `thumbnailUrl`, `favoriteImageId`
- Counts / media: `photos[]`, `photoCount` (may exceed materialized thumbs for large shoots)
- Status: `status`, `analysisStatus`, `portfolioStatus`, `journalStatus`, `livingScenesStatus`
- Notes / tags: `notes`, `tags`, `weather` (placeholder), `isSample`

Each photo: `id`, `filename`, `originalRef`, `thumbnailUrl`, `captureTime`, camera EXIF, `gps`, `favorite`, `flag`, `rating` (placeholder), `subjectHints`, `notes`, `moduleRefs`.

---

## Stable ingestion interface

`WaypointSceneIngest`:

| Method | Purpose |
|--------|---------|
| `ingestFromFolderFiles(files, meta)` | Manual folder / `webkitdirectory` |
| Drag-drop on Library | Uses same path with `SOURCE.dragDrop` |
| `ingestFromLibraryFolder(folderMeta)` | Already-imported Photo Library set |
| `ingestFromExistingShoot(shoot)` | Promote a Photo Coach shoot → Scene |
| `ingestFromImporterPayload(payload)` | **Locked future Importer contract** |

The Scene Library does not care how the photographs arrived.

---

## Routes

| Route | Role |
|-------|------|
| `/apps/waypoint-scenes/library/` | Scene Library |
| `/apps/waypoint-scenes/scene/?id=…` | Shoot Review Workspace |
| `/apps/waypoint-scenes/portfolio/?sceneId=…` | Portfolio Advisor foundation |
| `/apps/waypoint-scenes/export/?sceneId=…` | Export foundation |
| `/apps/waypoint-scenes/remember/?sceneId=…` | Outdoor Journals foundation (scene-aware) |
| `/apps/waypoint-scenes/create/?sceneId=…` | Living Scenes (studio + scene link note) |
| `/apps/photo-coach/?sceneId=…` | Photo Coach with honest Scene-link banner |

Landing CTA: **Open Scene Library**. Nav adds Scene Library + Portfolio Advisor.

---

## Scene Library features

- Cover, title, date, location, camera, photo count, favorite badge, analysis status, last opened
- Search (title, camera, lens, location, notes, date, filenames, subjects)
- Sort: recent / alphabetical / capture date / camera / location / favorites
- Filter: favorites only
- Import folder + drag/drop folders
- Demo seed: **Milford Woods** (264 photos · Sony a6700 · July 24, 2026), Dawn Meadow, Coastal Fog

---

## Shoot Review Workspace

- Hero cover + Scene identity
- Quick summary (camera, lens, time span, focal lengths, ISO, location, favorite, weather/AI placeholders)
- Primary actions — **all real links**, unfinished → honest foundations:
  - Review Shoot (grid)
  - Photo Coach
  - Portfolio Advisor
  - Living Scenes
  - Outdoor Journals
  - Export
- Responsive photo grid with thumbnail sizes (sm/md/lg)
- Windowed / virtualized rendering (only visible thumbs + buffer)
- Selection, keyboard arrows, favorite toggle, EXIF quick view, histogram/notes placeholders
- Does **not** load hundreds of full-resolution images at once

---

## Performance

- Virtualized grid: DOM only holds the visible window
- Scene `photoCount` can report 264 while materializing a representative subset of thumbs (demo pattern mirrors a large shoot)
- Thumbnails are background-image URLs; originals stay as refs (`originalRef`)
- localStorage index capped at 500 Scenes

---

## Test results

| Suite | Result |
|-------|--------|
| `automation/test-scenes-sprint3-scene-library.mjs` | **96 passed** |
| `automation/test-scenes-sprint1-foundation.mjs` | **53 passed** |
| `automation/test-photo-coach-shoot-review.mjs` | **41 passed** |
| `automation/validate-production-assets.mjs` | **OK — 0 missing** |

Coverage includes: Scene model, library HTML, detail HTML, search/sort/favorites, ingest (folder + importer payload), demo seed, virtualized grid source checks, placeholder workflows, routing, nav, reduced-motion CSS.

**Lint / typecheck / production JS build:** N/A for this static HTML/JS site. Syntax checks on new modules: OK.

---

## Screenshots

Under `docs/rebuild-2026/screenshots/sprint3/`:

| File | Viewport |
|------|----------|
| `desktop-1440-scene-library.png` | 1440 |
| `desktop-1440-scene-detail.png` | 1440 |
| `desktop-1440-photo-grid.png` | 1440 (tall) |
| `desktop-1440-portfolio.png` | 1440 |
| `desktop-1440-journals.png` | 1440 |
| `desktop-1440-living-scenes.png` | 1440 |
| `desktop-1440-export.png` | 1440 |
| `tablet-768-scene-library.png` | 768 |
| `tablet-768-scene-detail.png` | 768 |
| `mobile-430-scene-library.png` | 430 |
| `mobile-430-scene-detail.png` | 430 |
| `mobile-390-scene-library.png` | 390 |
| `mobile-390-portfolio.png` | 390 |

---

## Known limitations

1. **Photo Coach is not yet Scene-native.** `?sceneId=` shows an honest banner; frames are not auto-loaded from the Scene. Full Scene → Coach handoff is Sprint 4 material.
2. **Living Scenes** likewise acknowledges `sceneId` but does not yet pull a frame from the Scene store automatically.
3. Demo Scenes materialize a representative subset of thumbnails while reporting the full `photoCount` (264) — intentional for large-shoot UX; real Importer ingest will materialize all thumbs (or a progressive window) via the payload contract.
4. No real EXIF parser in folder ingest yet — camera fields stay null unless provided by the caller (Importer / library).
5. Weather + AI observations remain honest placeholders.
6. Portfolio Advisor / Export / Outdoor Journals are foundations only (disabled CTAs, no fake results).
7. Ratings UI is a data-field placeholder only.

---

## Explicit recommendation for Sprint 4

**Make every capability Scene-native:**

1. Photo Coach reads photographs from a Scene (`?sceneId=`) without re-upload; write analysis status back onto the Scene.
2. Living Scenes opens a chosen Scene frame (or favorite) directly.
3. Wire Waypoint Importer → `ingestFromImporterPayload` end-to-end (still no tight coupling beyond the contract).
4. Begin Portfolio Advisor selection MVP on top of the Scene model (best-of + near-duplicate grouping).
5. Optional: progressive thumbnail generation for large card imports.

Do **not** invent a second library. Everything plugs into the Scene.

---

## Decision requested

Approve `feature/scenes-sprint3-scene-library` after review, or request adjustments before merge.  
**No deploy from this sprint.**
