# Shared Media Library

Central repository for **approved** Waypoint Studio photographs used across the website and apps.

## What it is

- One catalog: `data/media/catalog.json`
- Web derivatives: `data/media/approved/<media_id>/`
- Authoritative originals: `~/Pictures/Waypoint Library/` (never duplicated into git unless owner chooses)

## Asset record (approved)

| Field | Purpose |
|-------|---------|
| `id` | Stable `wpmedia_…` id |
| `sha256` | Content identity — prevents unnecessary duplicates |
| `tags` / `species` / `season` | Discovery |
| `location` | GPS only if owner approved with awareness |
| `apps` | Destinations (Scenes, Fieldry, hero, …) |
| `copyright` | From EXIF / owner |
| `versions` | thumbnail → background paths |
| `alt_text` / `caption` | Accessibility (owner-editable) |
| `usage_history` | Where published |
| `original_library_path` | Pointer only — not a second master |

## Deduplication

Import and enqueue key on **SHA256**. Re-importing the same bytes does not create a second catalog row.

## Website integration

```html
<script src="/design-system/js/media/waypoint-media-api.js"></script>
<script>
  const media = await WaypointMedia.load();
  const heroes = media.forDestination('Homepage hero');
  const url = media.versionUrl(heroes[0], 'hero');
</script>
```

Optional: `<meta name="waypoint-media-catalog" content="/data/media/catalog.json">`

## Policy

```json
{
  "auto_publish": false,
  "originals_never_modified": true,
  "requires_owner_approval": true
}
```

## Local pipeline DB vs website catalog

| Store | Path | Contents |
|-------|------|----------|
| Working DB | `Library/.waypoint-pipeline/media.sqlite3` | All imports + analysis + review state |
| Website catalog | `data/media/catalog.json` | Approved subset only |

```mermaid
flowchart LR
  Orig[Originals in Library] -.->|reference| DB[(SQLite pipeline)]
  DB -->|derivatives| Ver[.waypoint-pipeline/versions]
  DB -->|approve --publish| Web[data/media]
  Web --> Apps[Waypoint apps]
```

## Not in scope

- Client delivery DAM
- Stock licensing marketplace
- Cloud sync of the working DB (Drive sync remains originals via importer rclone)
