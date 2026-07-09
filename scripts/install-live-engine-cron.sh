#!/usr/bin/env bash
# Install Waypoint Live Engine cron (every 30 minutes).
# Runs the engine locally, then publishes refreshed artifacts to GitHub Pages when data changes.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT/scripts/waypoint-live-engine"
PUBLISH="$ROOT/scripts/publish-live-engine-artifacts.mjs"
LOG_DIR="$ROOT/scripts/logs"
ENGINE_LOG="$LOG_DIR/live-engine.log"
PUBLISH_LOG="$LOG_DIR/live-engine-publish.log"
CRON_LINE="*/30 * * * * cd $ROOT && WAYPOINT_PUBLISH_ENABLED=1 $SCRIPT >> $ENGINE_LOG 2>&1"
MARKER="scripts/waypoint-live-engine"

mkdir -p "$LOG_DIR"
chmod +x "$SCRIPT" "$ROOT/scripts/waypoint-live-engine.mjs" "$PUBLISH" 2>/dev/null || chmod +x "$SCRIPT" "$PUBLISH"

# Run once immediately so live.json exists before dashboard loads
"$SCRIPT" || true

if crontab -l 2>/dev/null | grep -Fq "$MARKER"; then
  echo "Cron job already installed for waypoint-live-engine."
  crontab -l 2>/dev/null | grep -F "$MARKER" || true
  echo ""
  echo "Note: cron updates the local repo, then publish-live-engine-artifacts.mjs commits/pushes"
  echo "data/live.json, data/health.json, status.html, and debug.html to GitHub Pages."
  echo "Engine log: $ENGINE_LOG"
  echo "Publish log: $PUBLISH_LOG"
  exit 0
fi

(crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
echo "Installed Waypoint Live Engine cron (every 30 minutes):"
echo "  $CRON_LINE"
echo ""
echo "Publish path: refreshed artifacts are committed and pushed to the tracked branch."
echo "Disable publish with WAYPOINT_PUBLISH_ENABLED=0 in crontab."
echo "Engine log: $ENGINE_LOG"
echo "Publish log: $PUBLISH_LOG"
echo "Remove later: crontab -e"
