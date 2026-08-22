#!/usr/bin/env bash
# Idempotent Cloud Agent bootstrap for Waypoint Studio.
#
# The site itself is a no-build static tree served with `python3 -m http.server`.
# This script only refreshes the dependencies the automated checks need:
#   - `ws` for the Node automation/smoke harness (package.json / package-lock.json)
#   - Pillow for the Python photo_pipeline unit tests (tests/test_photo_pipeline.py)
#
# It is safe to re-run: npm ci/install and pip install both converge without
# rewriting tracked source, and no long-running process is started here.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "[install] Node $(node --version), npm $(npm --version), Python $(python3 --version)"

# Node dependencies for the automation + smoke test harness.
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

# Python dependency for the photo_pipeline test suite. Installed into the user
# site with --break-system-packages so it works on PEP 668 "externally managed"
# base images without mutating system packages.
python3 -m pip install --user --break-system-packages -r photo_pipeline/requirements.txt

echo "[install] done"
