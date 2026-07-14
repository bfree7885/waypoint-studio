# Photo Library — Architecture

Work Block 4 foundation for Waypoint Scenes.

## Purpose

One local catalog for every photograph used by Photo Coach, Hidden Landscapes, Photographer Profile, and future Living Scenes / Scene Builder.

A photograph should exist **once**. Modules reference it; they do not re-upload or re-store originals.

## Routes

| URL | Role |
|-----|------|
| `/apps/photo-library/` | Live catalog UI |
| `/apps/scenes/photo-library/` | Scenes module landing |

## PhotoLibraryEngine

`apps/photo-library/js/pl-engine.js`

Responsibilities:

- `importFiles` — add images (dedupe by name/size/lastModified fingerprint)
- `search` / filters / sort
- Collections and tags
- Metadata updates (notes, labels, favorite, rating)
- `getOriginalFile` / `getOriginalBlob` — module handoff without re-upload
- Additive migration from Photo Coach portfolio + PhotoRecord stores

Factory also registered as `WaypointScenesEngines.PhotoLibraryEngineFactory`.

## Models

`pl-models.js`

- **LibraryImage** — identity, capture/import dates, camera/GPS, geometry, tags, collections, private rating / Keep-Maybe-Reject / favorite, module refs, media keys, legacy ids
- **Collection** — private named sets with cover + imageIds

Missing metadata stays `null`. Nothing is fabricated.

## Storage architecture

| Layer | Key / DB | Contents |
|-------|----------|----------|
| Index | `localStorage` `waypoint-photo-library-index-v1` | LibraryImage metadata (+ optional thumbnail data URL) |
| Collections | `waypoint-photo-library-collections-v1` | Collection[] |
| Meta | `waypoint-photo-library-meta-v1` | migrationVersion |
| Media | IndexedDB `waypoint-photo-library-media-v1` / store `media` | original (and future derived) blobs |

Legacy Photo Coach keys (`waypoint-photo-coach-sessions-v1`, `waypoint-photo-records-v1`, shoots) remain until a dedicated migration sprint. First library open may **copy metadata/thumbs** into the index (additive).

## Module integration

`apps/waypoint-scenes/js/photo-library-client.js`

- `?libraryId=` on Photo Coach or Hidden Landscapes
- Resolves IndexedDB blob (or thumbnail fallback) → `File`
- Photo Coach write-back via `linkPhotoCoachResult` after analysis

Quick actions in the Library detail panel open those tools with the id.

## Future Waypoint Importer

Importer continues to own `~/Pictures/Waypoint Library/…` on disk.

Browser handoff should eventually:

1. Copy/chosen File → `PhotoLibraryEngine.importFiles`
2. Optionally open Photo Coach with `libraryId`

Bridge stub remains in Photo Coach Importer Bridge; library is the intended ingest SoT.

## Tests

```bash
node automation/test-photo-library.mjs
node automation/test-photo-coach-shoot-review.mjs
node automation/test-hidden-landscapes.mjs
node automation/smoke-browser.mjs http://127.0.0.1:8080
```
