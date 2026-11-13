#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -x "$ROOT/backend/.venv/bin/pytest" || ! -d "$ROOT/frontend/node_modules" ]]; then
  "$ROOT/scripts/setup.sh"
fi

cd "$ROOT/backend"
"$ROOT/backend/.venv/bin/pytest"
cd "$ROOT/frontend"
npm test
npm run build
