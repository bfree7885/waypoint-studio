# Waypoint Photo Importer v1.1

Practical SD card → Google Drive import for Sony a6700 (ARW/JPEG) on Linux Mint.

**Goal:** plug in SD card → run one command → verified copies land in `~/Google Drive/Photography/YYYY/YYYY-MM-DD/` → log → desktop notification.

Foundation tool for your photography workflow. Pairs with [Photo Coach](../apps/photo-coach/) and Darktable. Not a DAM. No AI critique.

---

## Quick start (Linux Mint)

```bash
cd ~/projects/waypoint-scenes

# 1. Check destination + instructions (no card needed)
./scripts/photo-import --dry-run

# 2. Plug in SD card, find mount name
ls /media/$USER/

# 3. Preview import
./scripts/photo-import --dry-run --source "/media/$USER/CARDNAME" -v

# 4. Import for real
./scripts/photo-import --source "/media/$USER/CARDNAME"
```

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

Date folders use each file’s modification time (EXIF shoot-date is a future enhancement).

### Google Drive path detection

If you do not pass `--dest`, the importer searches (in order):

- `~/Google Drive/Photography`
- `~/GoogleDrive/Photography`
- `~/Google Drive/My Drive/Photography`
- `~/Insync/Google Drive/Photography`
- Other variants under mounted Google Drive / Insync roots

With `--create-dest` (default), it creates `Photography/` when a Google Drive root exists but the folder does not.

---

## Safety protections

- **Never deletes** files on the SD card
- **Never overwrites** without verification — identical files (size + SHA-256) are skipped
- **Global duplicate detection** — skips files already anywhere under `Photography/` (same name + checksum)
- **Name collisions** with different content get `_imported_001` suffixes
- **Refuses system paths** and cloud-sync folders as source
- **Auto-detect** only uses mounts under `/media/$USER/` with `DCIM` or `PRIVATE`
- **Post-copy verification** — size match + SHA-256 checksum

---

## Commands

| Command | Purpose |
|---------|---------|
| `./scripts/photo-import --dry-run` | Check destination, see next steps |
| `./scripts/photo-import --source "/media/$USER/CARD"` | Import from card |
| `./scripts/photo-import --dest "$HOME/Google Drive/Photography"` | Custom destination |
| `./scripts/photo-import --no-video` | Skip video files |
| `node scripts/validate-photo-importer.mjs` | Run validation tests |

Equivalent without wrapper:

```bash
node scripts/photo-importer.mjs --source "/media/$USER/CARDNAME"
```

---

## Testing with your SD card

1. Insert the a6700 SD card (USB reader or built-in slot).
2. Wait for Linux Mint to mount it (usually `/media/$USER/NO NAME`).
3. Confirm DCIM exists:
   ```bash
   ls "/media/$USER/CARDNAME/DCIM"
   ```
4. Dry-run:
   ```bash
   ./scripts/photo-import --dry-run --source "/media/$USER/CARDNAME" -v
   ```
5. Import:
   ```bash
   ./scripts/photo-import --source "/media/$USER/CARDNAME"
   ```
6. Verify:
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

On success or partial failure (if `notify-send` exists):

```
Photo import complete — N copied, M duplicates skipped, F failed
```

Skip with `--no-notify`. Install with: `sudo apt install libnotify-bin`

---

## Auto-import on card insert (optional — not enabled by default)

**Run a successful manual import first.**

### 1. Install systemd units (does NOT enable)

```bash
chmod +x scripts/install-photo-importer-autostart.sh scripts/uninstall-photo-importer.sh
./scripts/install-photo-importer-autostart.sh
```

This copies user-level systemd units but does **not** start auto-import.

### 2. When ready, enable

```bash
systemctl --user enable --now waypoint-photo-importer.path
loginctl enable-linger $USER   # optional: keep running when logged out
```

### 3. Check status

```bash
systemctl --user status waypoint-photo-importer.path
journalctl --user -u waypoint-photo-importer.service -n 50
tail -f ~/.local/share/waypoint-photo-importer/automation.log
```

### 4. Disable

```bash
./scripts/uninstall-photo-importer.sh
```

### Immediate enable (interactive confirm)

```bash
./scripts/install-photo-importer.sh
```

---

## Troubleshooting

| Problem | What to do |
|---------|------------|
| No Google Drive folder | Mount Google Drive, then `--create-dest` or `mkdir -p ~/Google\ Drive/Photography` |
| No SD card detected | `ls /media/$USER/` — pass explicit `--source` |
| Multiple mounts | Use `--source` with the correct card |
| Permission denied | Ensure you can read the mount; do not run as root |
| `notify-send` missing | `sudo apt install libnotify-bin` or `--no-notify` |
| Auto-import never runs | `systemctl --user status waypoint-photo-importer.path` |
| Import runs twice | Lock file in `~/.local/share/waypoint-photo-importer/import.lock` |

---

## Files in this repo

| File | Purpose |
|------|---------|
| `scripts/photo-importer.mjs` | Main importer (v1.1) |
| `scripts/photo-import` | One-command shortcut |
| `scripts/photo-importer-run.sh` | Automation wrapper with lock |
| `scripts/install-photo-importer-autostart.sh` | Install units, do not enable |
| `scripts/install-photo-importer.sh` | Install + enable (interactive) |
| `scripts/uninstall-photo-importer.sh` | Remove auto-import |
| `scripts/validate-photo-importer.mjs` | Smoke tests |
| `scripts/photo-importer.path` | systemd path unit template |
| `scripts/photo-importer.service` | systemd service template |

---

## v1.1 changes

- Global duplicate detection across entire `Photography/` library
- Insync Google Drive path support
- `--create-dest` creates Photography folder when Drive is mounted
- Dry-run shows planned copy destinations
- Progress counter during import
- `photo-import` shortcut command
- Auto-import installer does not enable units until you choose

---

## Future (not in v1.1)

- EXIF shoot-date folders
- Darktable collection sidecar
- Photo Coach progress linkage
