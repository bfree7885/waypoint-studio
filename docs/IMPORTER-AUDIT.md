# Waypoint Importer — Audit (Automated Photo Pipeline V1)

**Date:** 2026-07-18  
**Scope:** Existing importers + photo library / coach handoff  
**Status:** Living audit for PHOTO-PIPELINE work block

---

## Systems found

| System | Path | Role |
|--------|------|------|
| **Python Waypoint Importer (primary)** | `waypoint-importer/` | GUI SD → `~/Pictures/Waypoint Library/` + rclone Drive |
| **Node Photo Importer v1.1** | `scripts/photo-importer.mjs` | CLI SD → mounted Google Drive `Photography/` |
| **Browser Photo Library** | `apps/photo-library/` | IndexedDB catalog (manual upload) |
| **Photo Coach** | `apps/photo-coach/` | Critique / shoot review |
| **Importer bridge** | `photo-coach-importer-bridge.js` | Protocol stub — not wired |

---

## What already works (Python importer)

| Capability | Status |
|------------|--------|
| SD / DCIM detection | Yes — `/media/$USER`, `/run/media/$USER` |
| Camera card identity | Mount display name + DCIM path |
| SHA256 hashing | Yes — 1 MiB chunks |
| Duplicate detection | Yes — SQLite ledger `imported_hashes.sqlite3` |
| Import new only | Yes |
| Folder organization | `YYYY/YYYY-MM-DD/` under library root |
| Metadata (date) | exiftool `DateTimeOriginal` → folder; mtime fallback |
| Google Drive sync | rclone `copyto` → `gdrive:Waypoint Photos/...` |
| Logging | `~/.local/share/waypoint-importer/logs/importer.log` |
| Import history | Ledger + log (no dedicated UI) |
| Originals sacred | Copy-only; never writes SD |
| Extensions | ARW, JPG, JPEG, PNG, HEIF, HIF, MOV, MP4 |

**Evidence on this host:** ~322 ledger entries; library under `~/Pictures/Waypoint Library/`.

---

## Gaps vs full pipeline

| Gap | Notes |
|-----|-------|
| Full EXIF pack | Only date used for folders today |
| Thumbnails / web versions | Not generated |
| Local AI / heuristic review | Not present |
| Privacy flags | Not present |
| Destination classification | Not present |
| Quality scores with explanations | Not present |
| Accessibility text | Not present |
| Review UI for publish | Not present |
| Shared media catalog for website | Scenes gallery is curated static data |
| Auto publish | Correctly absent — must stay approval-gated |
| Two importers | Risk of split libraries if both used |

---

## Decision for V1

- **Keep Python importer as disk SoT** (hash ledger + library path + rclone).  
- **Add** `photo_pipeline/` package for analysis, derivatives, catalog, review export.  
- **Do not** auto-publish; approval writes `data/media/catalog.json` for website API.  
- Node CLI remains optional/legacy; document “prefer Python importer.”

---

## Integration points

1. After each successful import batch → write import manifest + enqueue analysis.  
2. Analysis never modifies originals; derivatives under library `.waypoint-pipeline/`.  
3. Review UI reads catalog SQLite/JSON; Approve copies metadata into website media catalog.  
4. Photo Coach bridge can stage handoff from manifest (optional).
