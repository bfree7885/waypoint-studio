#!/usr/bin/env bash
# Install Waypoint Photo Importer user-level auto-import (systemd path unit).
# Prefer install-photo-importer-autostart.sh — it does NOT enable units automatically.
# This script installs AND enables — use only when you are ready for auto-import.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "NOTE: install-photo-importer-autostart.sh installs units without enabling."
echo "This script enables auto-import immediately."
echo ""
read -r -p "Enable auto-import now? [y/N] " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Aborted. Run: $ROOT/scripts/install-photo-importer-autostart.sh"
  exit 1
fi

"$ROOT/scripts/install-photo-importer-autostart.sh"

USER_SYSTEMD="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
STATE_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/waypoint-photo-importer"

systemctl --user enable waypoint-photo-importer.path
systemctl --user start waypoint-photo-importer.path || true

echo ""
echo "Auto-import ENABLED."
echo "Automation log: $STATE_DIR/automation.log"
echo "Disable: $ROOT/scripts/uninstall-photo-importer.sh"
