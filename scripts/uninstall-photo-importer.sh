#!/usr/bin/env bash
# Uninstall Waypoint Photo Importer auto-import (systemd user units only).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
USER_SYSTEMD="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"

systemctl --user disable waypoint-photo-importer.path 2>/dev/null || true
systemctl --user stop waypoint-photo-importer.path 2>/dev/null || true
systemctl --user stop waypoint-photo-importer.service 2>/dev/null || true

rm -f "$USER_SYSTEMD/waypoint-photo-importer.path"
rm -f "$USER_SYSTEMD/waypoint-photo-importer.service"

systemctl --user daemon-reload

echo "Removed Waypoint Photo Importer systemd user units."
echo "The importer script remains at $ROOT/scripts/photo-importer.mjs for manual use."
echo ""
echo "Automation log (not deleted):"
echo "  ${XDG_DATA_HOME:-$HOME/.local/share}/waypoint-photo-importer/automation.log"
