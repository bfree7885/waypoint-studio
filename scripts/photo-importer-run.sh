#!/usr/bin/env bash
# Waypoint Photo Importer — automation wrapper (systemd / manual)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMPORTER="$ROOT/scripts/photo-importer.mjs"
STATE_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/waypoint-photo-importer"
LOG="$STATE_DIR/automation.log"
LOCK="$STATE_DIR/import.lock"
STALE_LOCK_MINUTES=30

mkdir -p "$STATE_DIR"

log() {
  printf '[%s] %s\n' "$(date -Is)" "$*" | tee -a "$LOG"
}

if [[ ! -f "$IMPORTER" ]]; then
  log "ERROR: importer not found at $IMPORTER"
  exit 1
fi

if [[ -f "$LOCK" ]]; then
  lock_age=$(( $(date +%s) - $(stat -c %Y "$LOCK" 2>/dev/null || echo 0) ))
  if (( lock_age < STALE_LOCK_MINUTES * 60 )); then
    log "Import already running (lock $LOCK, ${lock_age}s old). Exiting."
    exit 0
  fi
  log "Removing stale lock (${lock_age}s old)"
  rm -f "$LOCK"
fi

echo $$ > "$LOCK"
trap 'rm -f "$LOCK"' EXIT

log "Waypoint Photo Importer automation started"

# Wait for mount to settle (systemd ExecStartPre also sleeps)
sleep 2

MEDIA_BASE="/media/$USER"
if [[ ! -d "$MEDIA_BASE" ]]; then
  log "No $MEDIA_BASE directory. Nothing to import."
  exit 0
fi

# Quick check: any subdirectory with DCIM?
found=0
for mount in "$MEDIA_BASE"/*; do
  [[ -d "$mount" ]] || continue
  if [[ -d "$mount/DCIM" || -d "$mount/PRIVATE" ]]; then
    found=1
    break
  fi
done

if [[ "$found" -eq 0 ]]; then
  log "No camera media (DCIM/PRIVATE) under $MEDIA_BASE. Skipping."
  exit 0
fi

log "Running importer: node $IMPORTER"
if node "$IMPORTER" --verbose >> "$LOG" 2>&1; then
  log "Import finished successfully"
  exit 0
else
  code=$?
  log "Import finished with exit code $code (see log)"
  exit "$code"
fi
