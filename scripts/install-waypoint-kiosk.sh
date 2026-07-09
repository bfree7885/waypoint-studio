#!/usr/bin/env bash
# Install Waypoint kiosk autostart (systemd user service + desktop entry).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_SRC="$ROOT/scripts/waypoint-kiosk.service"
DESKTOP_SRC="$ROOT/scripts/waypoint-kiosk.desktop"
USER_SYSTEMD="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
AUTOSTART_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/autostart"

mkdir -p "$USER_SYSTEMD" "$AUTOSTART_DIR" "$ROOT/scripts/logs"
chmod +x "$ROOT/scripts/start-waypoint-kiosk.sh"

sed "s|%h/projects/waypoint-scenes|$ROOT|g; s|/home/bryan/projects/waypoint-scenes|$ROOT|g" \
  "$SERVICE_SRC" >"$USER_SYSTEMD/waypoint-kiosk.service"

sed "s|/home/bryan/projects/waypoint-scenes|$ROOT|g" \
  "$DESKTOP_SRC" >"$AUTOSTART_DIR/waypoint-kiosk.desktop"

systemctl --user daemon-reload
systemctl --user enable waypoint-kiosk.service

echo "Installed Waypoint kiosk autostart:"
echo "  systemd user service: $USER_SYSTEMD/waypoint-kiosk.service"
echo "  desktop autostart:      $AUTOSTART_DIR/waypoint-kiosk.desktop"
echo ""
echo "Start now:  systemctl --user start waypoint-kiosk.service"
echo "Stop:       systemctl --user stop waypoint-kiosk.service"
echo "Logs:       $ROOT/scripts/logs/kiosk.log"
