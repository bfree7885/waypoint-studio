#!/usr/bin/env bash
# Stop Waypoint kiosk autostart and restore normal laptop behavior.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AUTOSTART="${XDG_CONFIG_HOME:-$HOME/.config}/autostart/waypoint-kiosk.desktop"
SERVICE="waypoint-kiosk.service"

log() {
  printf '[%s] %s\n' "$(date -Iseconds)" "$*"
}

if systemctl --user is-active --quiet "$SERVICE" 2>/dev/null; then
  systemctl --user stop "$SERVICE"
  log "stopped systemd user service: $SERVICE"
fi

if systemctl --user is-enabled --quiet "$SERVICE" 2>/dev/null; then
  systemctl --user disable "$SERVICE"
  log "disabled systemd user service: $SERVICE"
fi

if [ -f "$AUTOSTART" ]; then
  rm -f "$AUTOSTART"
  log "removed desktop autostart: $AUTOSTART"
fi

if [ -n "${DISPLAY:-}" ] && command -v xset >/dev/null 2>&1; then
  xset s on >/dev/null 2>&1 || true
  xset +dpms >/dev/null 2>&1 || true
  xset s blank >/dev/null 2>&1 || true
  log "restored display sleep defaults via xset"
fi

log "kiosk mode disabled"
log "close the full-screen browser window manually if it is still open"
