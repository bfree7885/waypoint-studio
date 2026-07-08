#!/usr/bin/env bash
# Install Waypoint Live Engine cron (every 30 minutes).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT/scripts/waypoint-live-engine"
LOG_DIR="$ROOT/scripts/logs"
LOG="$LOG_DIR/live-engine.log"
CRON_LINE="*/30 * * * * $SCRIPT >> $LOG 2>&1"

mkdir -p "$LOG_DIR"
chmod +x "$SCRIPT" "$ROOT/scripts/waypoint-live-engine.mjs" 2>/dev/null || chmod +x "$SCRIPT"

# Run once immediately so live.json exists before dashboard loads
"$SCRIPT" || true

MARKER="scripts/waypoint-live-engine"
if crontab -l 2>/dev/null | grep -Fq "$MARKER"; then
  echo "Cron job already installed for waypoint-live-engine."
  crontab -l 2>/dev/null | grep -F "$MARKER" || true
  exit 0
fi

(crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
echo "Installed Waypoint Live Engine cron (every 30 minutes):"
echo "  $CRON_LINE"
echo "Log: $LOG"
echo "Remove later: crontab -e"
