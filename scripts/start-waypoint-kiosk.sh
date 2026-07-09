#!/usr/bin/env bash
# Start the local Waypoint server and open the outdoor dashboard kiosk full-screen.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${WAYPOINT_KIOSK_PORT:-8080}"
HOST="${WAYPOINT_KIOSK_HOST:-127.0.0.1}"
URL="http://${HOST}:${PORT}/kiosk.html"
LOG_DIR="$ROOT/scripts/logs"
SERVER_PID_FILE="$LOG_DIR/kiosk-server.pid"
ENGINE="$ROOT/scripts/waypoint-live-engine"
SERVER_STARTED=0

mkdir -p "$LOG_DIR"

log() {
  printf '[%s] %s\n' "$(date -Iseconds)" "$*" | tee -a "$LOG_DIR/kiosk.log"
}

is_server_up() {
  curl -fsS --max-time 2 "$URL" >/dev/null 2>&1
}

start_server() {
  if is_server_up; then
    log "web server already running on port ${PORT}"
    return
  fi

  log "starting web server on port ${PORT}"
  python3 -m http.server "$PORT" --directory "$ROOT" --bind "$HOST" >>"$LOG_DIR/kiosk-server.log" 2>&1 &
  echo $! >"$SERVER_PID_FILE"
  SERVER_STARTED=1

  for _ in $(seq 1 20); do
    if is_server_up; then
      log "web server ready"
      return
    fi
    sleep 0.25
  done

  log "web server failed to start"
  exit 1
}

refresh_live_data() {
  if [ -x "$ENGINE" ]; then
    log "running live engine"
  else
    log "live engine script missing; using existing data files"
    return
  fi

  if "$ENGINE"; then
    log "live engine finished"
  else
    log "live engine failed; kiosk will use last available data"
  fi
}

prevent_sleep() {
  if [ -n "${DISPLAY:-}" ] && command -v xset >/dev/null 2>&1; then
    xset s off >/dev/null 2>&1 || true
    xset -dpms >/dev/null 2>&1 || true
    xset s noblank >/dev/null 2>&1 || true
    log "display sleep disabled via xset"
  fi
}

find_browser() {
  local candidate
  for candidate in \
    "${WAYPOINT_KIOSK_BROWSER:-}" \
    chromium-browser \
    chromium \
    google-chrome-stable \
    google-chrome \
    firefox; do
    if [ -n "$candidate" ] && command -v "$candidate" >/dev/null 2>&1; then
      printf '%s' "$candidate"
      return 0
    fi
  done
  return 1
}

open_kiosk() {
  local browser
  local -a args
  browser="$(find_browser)" || {
    log "no supported browser found (chromium or firefox)"
    exit 1
  }

  log "opening kiosk in ${browser}: ${URL}"
  prevent_sleep

  case "$browser" in
    *firefox*) args=(--kiosk) ;;
    *) args=(--kiosk --noerrdialogs --disable-infobars --no-first-run --disable-session-crashed-bubble --check-for-update-interval=31536000) ;;
  esac

  if command -v systemd-inhibit >/dev/null 2>&1; then
    exec systemd-inhibit \
      --what=idle:sleep:handle-lid-switch \
      --who="Waypoint Kiosk" \
      --why="Outdoor dashboard kiosk display" \
      --mode=block \
      "$browser" "${args[@]}" "$URL"
  fi

  exec "$browser" "${args[@]}" "$URL"
}

refresh_live_data
start_server
open_kiosk
