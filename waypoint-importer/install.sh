#!/usr/bin/env bash
# Install Waypoint Importer on Linux Mint 22 / Ubuntu 24.04
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ID="waypoint-importer"
VENV="${HOME}/.local/share/${APP_ID}/venv"
BIN_DIR="${HOME}/.local/bin"
DESKTOP_DIR="${HOME}/.local/share/applications"
DATA_DIR="${HOME}/.local/share/${APP_ID}"
CONFIG_DIR="${HOME}/.config/${APP_ID}"

echo "==> Waypoint Importer installer"
echo "    Project: ${ROOT}"

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing dependency: $1"
    return 1
  fi
  return 0
}

MISSING=0
need_cmd python3 || MISSING=1
need_cmd pip3 || true

if [[ "${MISSING}" -ne 0 ]]; then
  echo "Install Python 3 first: sudo apt install python3 python3-venv python3-pip"
  exit 1
fi

echo "==> System packages (exiftool, rclone recommended)"
if command -v apt-get >/dev/null 2>&1; then
  if [[ "${WI_SKIP_APT:-}" != "1" ]]; then
    echo "    You may be prompted for sudo to install exiftool / rclone / python3-tk / python3-venv"
    sudo apt-get update -y
    sudo apt-get install -y python3-venv python3-pip python3-tk libtk8.6 exiftool || true
    if ! command -v rclone >/dev/null 2>&1; then
      echo "    rclone not found — installing via apt if available…"
      sudo apt-get install -y rclone || {
        echo "    apt rclone unavailable. Install from https://rclone.org/install/"
      }
    fi
  fi
fi

mkdir -p "${DATA_DIR}" "${CONFIG_DIR}" "${BIN_DIR}" "${DESKTOP_DIR}" \
  "${HOME}/Pictures/Waypoint Library" "${DATA_DIR}/logs"

echo "==> Creating virtualenv at ${VENV}"
python3 -m venv "${VENV}"
# shellcheck disable=SC1091
source "${VENV}/bin/activate"
pip install --upgrade pip
pip install -r "${ROOT}/requirements.txt"

WRAPPER="${BIN_DIR}/waypoint-importer"
cat > "${WRAPPER}" <<EOF
#!/usr/bin/env bash
exec "${VENV}/bin/python" "${ROOT}/main.py" "\$@"
EOF
chmod +x "${WRAPPER}"

DESKTOP_FILE="${DESKTOP_DIR}/waypoint-importer.desktop"
cat > "${DESKTOP_FILE}" <<EOF
[Desktop Entry]
Type=Application
Version=1.0
Name=Waypoint Importer
Comment=Import Sony SD card photos to Waypoint Library and Google Drive
Exec=${WRAPPER}
Icon=camera-photo
Terminal=false
Categories=Graphics;Photography;
StartupNotify=true
Keywords=sony;sd;photo;rclone;waypoint;
EOF

# Also copy a project-local desktop file for reference
cp "${DESKTOP_FILE}" "${ROOT}/assets/waypoint-importer.desktop"

echo
echo "==> Installed"
echo "    Launcher: ${WRAPPER}"
echo "    Desktop:  ${DESKTOP_FILE}"
echo "    Library:  ${HOME}/Pictures/Waypoint Library"
echo
echo "Next steps:"
echo "  1. Configure rclone Google Drive remote named 'gdrive':"
echo "       rclone config"
echo "  2. Run: waypoint-importer"
echo "     or find “Waypoint Importer” in your app menu"
echo
if ! command -v rclone >/dev/null 2>&1; then
  echo "WARNING: rclone is not on PATH — Drive uploads will be disabled until installed."
fi
if ! command -v exiftool >/dev/null 2>&1; then
  echo "WARNING: exiftool is not on PATH — dates will fall back to file mtime."
fi
