#!/usr/bin/env bash
# Apply decisions exported from the review UI to the pipeline DB.
# Usage: scripts/photo-pipeline-apply-decisions.sh decisions.json [--publish]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FILE="${1:?decisions json required}"
PUBLISH_FLAG="${2:-}"
python3 - <<PY
import json, subprocess, sys
from pathlib import Path
decisions = json.loads(Path("$FILE").read_text())
publish = "$PUBLISH_FLAG" == "--publish"
for asset_id, payload in decisions.items():
    decision = payload.get("decision")
    if not decision:
        continue
    cmd = [sys.executable, "-m", "photo_pipeline", "decide", asset_id, decision]
    if publish and decision in ("approve", "approved"):
        cmd.append("--publish")
    print(" ".join(cmd))
    subprocess.check_call(cmd, cwd="$ROOT")
PY
