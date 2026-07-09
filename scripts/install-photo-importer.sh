#!/usr/bin/env bash
# Install Waypoint Photo Importer user-level auto-import (systemd path unit).
# Does NOT modify system udev rules. Safe to review before enabling.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
USER_SYSTEMD="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
STATE_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/waypoint-photo-importer"
MARKER="Waypoint Photo Importer"

chmod +x "$ROOT/scripts/photo-importer-run.sh" "$ROOT/scripts/photo-importer.mjs" 2>/dev/null || true
mkdir -p "$USER_SYSTEMD" "$STATE_DIR"

install_unit() {
  local src="$1"
  local dest="$2"
  sed "s|__REPO_ROOT__|$ROOT|g" "$src" > "$dest"
}

install_unit "$ROOT/scripts/photo-importer.path" "$USER_SYSTEMD/waypoint-photo-importer.path"
install_unit "$ROOT/scripts/photo-importer.service" "$USER_SYSTEMD/waypoint-photo-importer.service"

systemctl --user daemon-reload
systemctl --user enable waypoint-photo-importer.path
systemctl --user start waypoint-photo-importer.path || true

echo "Installed $MARKER user automation."
echo ""
echo "Manual test first (recommended):"
echo "  node $ROOT/scripts/photo-importer.mjs --dry-run"
echo "  node $ROOT/scripts/photo-importer.mjs --source /media/\$USER/CARDNAME"
echo ""
echo "Auto-import is ENABLED via systemd user path unit:"
echo "  $USER_SYSTEMD/waypoint-photo-importer.path"
echo "  $USER_SYSTEMD/waypoint-photo-importer.service"
echo ""
echo "Automation log:"
echo "  $STATE_DIR/automation.log"
echo ""
echo "Check status:"
echo "  systemctl --user status waypoint-photo-importer.path"
echo "  journalctl --user -u waypoint-photo-importer.service -n 50"
echo ""
echo "Disable auto-import:"
echo "  $ROOT/scripts/uninstall-photo-importer.sh"
echo ""
echo "IMPORTANT: Run a successful manual import before relying on automation."
