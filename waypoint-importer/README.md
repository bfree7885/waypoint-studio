# Waypoint Importer

Desktop app for **Linux Mint 22 / Ubuntu 24.04** that imports new photos from a Sony camera SD card into your Waypoint photography workflow.

- Detects removable cards with a `DCIM` folder  
- Imports only **never-seen** files (SHA256, not filenames)  
- Organizes locally as `~/Pictures/Waypoint Library/YYYY/YYYY-MM-DD/`
- Uploads with **rclone** to `gdrive:Waypoint Photos/YYYY/YYYY-MM-DD/`
- **Never** deletes or modifies files on the SD card  

## Requirements

| Tool | Purpose |
|------|---------|
| Python 3.10+ | Runtime |
| CustomTkinter | GUI |
| exiftool | Capture date metadata |
| rclone | Google Drive upload |

## Install

```bash
cd waypoint-importer
chmod +x install.sh
./install.sh
```

Then configure rclone (once):

```bash
rclone config
# Create a remote named: gdrive
# Type: Google Drive
```

Launch:

```bash
waypoint-importer
```

Or open **Waypoint Importer** from the application menu.

## Folder structure

Photos are grouped by **shoot date** (one folder per capture day):

| Location | Path |
|----------|------|
| Local | `~/Pictures/Waypoint Library/YYYY/YYYY-MM-DD/` |
| Google Drive | `gdrive:Waypoint Photos/YYYY/YYYY-MM-DD/` |

Example for a shoot on 10 July 2026:

```
~/Pictures/Waypoint Library/2026/2026-07-10/
gdrive:Waypoint Photos/2026/2026-07-10/
```

Date resolution:

1. **EXIF `DateTimeOriginal`** when present  
2. **File modification time** only when `DateTimeOriginal` is unavailable  

All photos from the same capture date share the same folder. Folders are created automatically if missing; repeated imports reuse the same path and skip already-imported files via the SHA256 ledger.

## Workflow

1. Insert the Sony SD card.  
2. The app shows **✓ Sony SD Card Detected** and counts **New Photos**.  
3. Confirm destinations: Local Library + Google Drive.  
4. Click **Import**.  
5. Review results: Imported / Skipped / Uploaded.  
6. Use **Open Local Folder** or **Open Google Drive Folder**.  
7. **Analyze in Photo Coach** is a placeholder for a future handoff.

   Browser-side contract (not wired in the desktop app yet): `WaypointPhotoCoachImporterBridge`
   in `apps/waypoint-scenes/js/photo-coach-importer-bridge.js` — validate/stage a session
   payload (`protocolVersion` 1.0.0). See `apps/photo-coach/docs/SHOOT-REVIEW.md`.

## Layout

```
waypoint-importer/
├── main.py
├── requirements.txt
├── install.sh
├── README.md
├── assets/
│   └── waypoint-importer.desktop
└── waypoint_importer/
    ├── __init__.py
    ├── config.py           # paths, prefs, extensions
    ├── card_detector.py    # DCIM / removable media
    ├── duplicate_checker.py# SHA256 SQLite store
    ├── metadata.py         # exiftool dates
    ├── importer.py         # copy + orchestrate
    ├── drive_sync.py       # rclone upload
    └── ui.py               # CustomTkinter GUI
```

## Data locations

| Path | Use |
|------|-----|
| `~/Pictures/Waypoint Library/` | Local organized originals |
| `~/.local/share/waypoint-importer/imported_hashes.sqlite3` | SHA256 import ledger |
| `~/.config/waypoint-importer/preferences.json` | Preferences |
| `~/.local/share/waypoint-importer/logs/importer.log` | Logs |

## Safety

- SD card is **read-only** from this app’s perspective (copy only).  
- Duplicate detection uses **content hashes**, so renamed files are still skipped.  
- Upload failures are reported; local imports are still kept.  
- rclone retries are enabled; check the log for details.

## Future roadmap (not implemented)

The code is structured so these can land without a rewrite:

- Automatic Photo Coach launch after import  
- Batch analysis handoff  
- Photographer profiles  
- Background monitoring daemon  
- Preferences window  
- Multiple camera profiles  

## Development

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

## License

Part of the Waypoint Studio / Waypoint Scenes photography toolkit.
