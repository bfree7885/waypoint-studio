#!/usr/bin/env bash
# Install Waypoint Photo Importer systemd user units WITHOUT enabling auto-import.
# Review units, test manual import first, then enable yourself.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
USER_SYSTEMD="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
STATE_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/waypoint-photo-importer"

chmod +x "$ROOT/scripts/photo-import" "$ROOT/scripts/photo-importer-run.sh" "$ROOT/scripts/photo-importer.mjs" 2>/dev/null || true
mkdir -p "$USER_SYSTEMD" "$STATE_DIR"

install_unit() {
  local src="$1"
  local dest="$2"
  sed "s|__REPO_ROOT__|$ROOT|g" "$src" > "$dest"
}

install_unit "$ROOT/scripts/photo-importer.path" "$USER_SYSTEMD/waypoint-photo-importer.path"
install_unit "$ROOT/scripts/photo-importer.service" "$USER_SYSTEMD/waypoint-photo-importer.service"

systemctl --user daemon-reload

echo "Installed Waypoint Photo Importer systemd user units (NOT enabled)."
echo ""
echo "Files:"
echo "  $USER_SYSTEMD/waypoint-photo-importer.path"
echo "  $USER_SYSTEMD/waypoint-photo-importer.service"
echo ""
echo "Before enabling, run a successful manual import:"
echo "  cd $ROOT"
echo "  ./scripts/photo-import --dry-run"
echo "  ./scripts/photo-import --source /media/\$USER/CARDNAME"
echo ""
echo "When ready, enable auto-import on card insert:"
echo "  systemctl --user enable --now waypoint-photo-importer.path"
echo "  loginctl enable-linger \$USER   # optional: run when logged out"
echo ""
echo "Check status:"
echo "  systemctl --user status waypoint-photo-importer.path"
echo "  tail -f $STATE_DIR/automation.log"
echo ""
echo "Disable:"
echo "  $ROOT/scripts/uninstall-photo-importer.sh"
