#!/usr/bin/env bash
# Waypoint University — private local launch
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR/server"

if [[ "${1:-}" == "setup" ]]; then
  exec node server.mjs setup
fi

if [[ ! -f .env ]]; then
  echo "No owner credentials yet."
  echo "Run:  $DIR/start.sh setup"
  exit 1
fi

exec node server.mjs
