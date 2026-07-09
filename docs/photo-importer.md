# Waypoint Photo Importer

Practical SD card → Google Drive import for Sony a6700 (ARW/JPEG) on Linux Mint.

**Goal:** plug in SD card → copy verified files into `~/Google Drive/Photography/YYYY/YYYY-MM-DD/` → log → desktop notification.

This is a foundation tool, not a photo app. It pairs with [Photo Coach](../apps/photo-coach/) and a Darktable workflow.

---

## Supported files

| Type | Extensions |
|------|------------|
| Sony RAW | `.ARW` |
| JPEG | `.JPG`, `.JPEG` |
| Video (optional) | `.MP4`, `.MOV` — skip with `--no-video` |

Scanned folders on the card: `DCIM/` and `PRIVATE/` (if present).

---

## Destination layout

```
~/Google Drive/Photography/
├── 2026/
│   └── 2026-07-09/
│       ├── DSC01234.ARW
│       └── DSC01234.JPG
└── import-logs/
    └── 2026-07-09-import.log
```

Date folders use each file’s modification time (shoot-date from EXIF is a future enhancement).

### Google Drive path detection

If you do not pass `--dest`, the importer searches:

- `~/Google Drive/Photography`
- `~/GoogleDrive/Photography`
- `~/google-drive/Photography`
- `~/Drive/Photography`
- `~/Google Drive/My Drive/Photography`
- Similar variants under your Google Drive root

If none exist, it prints what was tried and how to create the folder.

---

## Safety protections

- **Never deletes** files on the SD card
- **Never overwrites** without verification — identical files (size + SHA-256) are skipped as duplicates
- **Name collisions** with different content get `_imported_001` suffixes
- **Refuses system paths** (`/usr`, `/etc`, `/boot`, etc.) as source
- **Refuses Google Drive** as source (prevents copying from the wrong drive)
- **Auto-detect** only uses mounts under `/media/$USER/` or `/run/media/$USER/` with `DCIM` or `PRIVATE`
- **Post-copy verification** — size match + SHA-256 checksum

---

## Manual commands

From the repo root:

### 1. Dry-run (no SD card required)

```bash
node scripts/photo-importer.mjs --dry-run
```

Shows whether a Google Drive Photography folder was found and explains how to test when a card is mounted.

### 2. Dry-run with SD card

```bash
ls /media/$USER/
node scripts/photo-importer.mjs --dry-run --source "/media/$USER/CARDNAME" --verbose
```

### 3. Actual import

```bash
node scripts/photo-importer.mjs --source "/media/$USER/CARDNAME"
```

Or let it auto-pick the only mounted card with DCIM:

```bash
node scripts/photo-importer.mjs
```

### 4. Custom destination

```bash
node scripts/photo-importer.mjs \
  --source "/media/$USER/CARDNAME" \
  --dest "$HOME/Google Drive/Photography"
```

### 5. Validation (CI / local smoke)

```bash
node scripts/validate-photo-importer.mjs
```

---

## Testing with your SD card

1. Insert the a6700 SD card (USB reader or built-in slot).
2. Wait for Linux Mint to mount it (usually `/media/$USER/NO NAME` or similar).
3. Confirm DCIM exists:
   ```bash
   ls "/media/$USER/CARDNAME/DCIM"
   ```
4. Dry-run:
   ```bash
   node scripts/photo-importer.mjs --dry-run --source "/media/$USER/CARDNAME" -v
   ```
5. Import:
   ```bash
   node scripts/photo-importer.mjs --source "/media/$USER/CARDNAME"
   ```
6. Check Google Drive folder and log:
   ```bash
   ls ~/Google\ Drive/Photography/*/
   tail -50 ~/Google\ Drive/Photography/import-logs/*-import.log
   ```

Re-running the same import should report **duplicates skipped**, not re-copy.

---

## Logs

| Log | Location |
|-----|----------|
| Import log | `~/Google Drive/Photography/import-logs/YYYY-MM-DD-import.log` |
| Automation log | `~/.local/share/waypoint-photo-importer/automation.log` |

---

## Desktop notification

On success or partial failure, the importer runs:

```bash
notify-send "Photo import complete" "N copied, M duplicates skipped, F failed"
```

Skip with `--no-notify`. Requires `libnotify-bin` (`notify-send`).

---

## Enable auto-import on card insert

**Run a successful manual import first.**

Auto-import uses a **systemd user path unit** (no system-wide udev rules). It watches `/media/$USER/` and runs the importer after the mount settles (~8 seconds).

### Install

```bash
chmod +x scripts/install-photo-importer.sh scripts/uninstall-photo-importer.sh scripts/photo-importer-run.sh
./scripts/install-photo-importer.sh
```

### Check status

```bash
systemctl --user status waypoint-photo-importer.path
journalctl --user -u waypoint-photo-importer.service -n 50
tail -f ~/.local/share/waypoint-photo-importer/automation.log
```

### Disable / uninstall

```bash
./scripts/uninstall-photo-importer.sh
```

Importer scripts remain for manual use.

---

## Troubleshooting

| Problem | What to do |
|---------|------------|
| No Google Drive folder | Create `mkdir -p ~/Google\ Drive/Photography` or pass `--dest` |
| No SD card detected | `ls /media/$USER/` — pass explicit `--source` |
| Multiple mounts | Use `--source` with the correct card |
| Permission denied | Ensure you can read the mount; do not run as root |
| `notify-send` missing | `sudo apt install libnotify-bin` or use `--no-notify` |
| Auto-import never runs | `systemctl --user status waypoint-photo-importer.path` — ensure user lingering if needed: `loginctl enable-linger $USER` |
| Import runs twice | Lock file in `~/.local/share/waypoint-photo-importer/import.lock` — check automation log |

### Useful commands

```bash
# Syntax check
node --check scripts/photo-importer.mjs

# Full validation suite
node scripts/validate-photo-importer.mjs

# Simulate automation wrapper
./scripts/photo-importer-run.sh
```

---

## Files in this repo

| File | Purpose |
|------|---------|
| `scripts/photo-importer.mjs` | Main importer |
| `scripts/photo-importer-run.sh` | Automation wrapper with lock |
| `scripts/install-photo-importer.sh` | Install systemd user units |
| `scripts/uninstall-photo-importer.sh` | Remove auto-import |
| `scripts/validate-photo-importer.mjs` | Smoke tests |
| `scripts/photo-importer.path` | systemd path unit template |
| `scripts/photo-importer.service` | systemd service template |

---

## Future (not in v1)

- EXIF shoot-date folders
- Darktable collection sidecar
- Photo Coach progress linkage
- Import queue UI
