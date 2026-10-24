#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -x "$ROOT/backend/.venv/bin/uvicorn" || ! -d "$ROOT/frontend/node_modules" ]]; then
  "$ROOT/scripts/setup.sh"
fi

cleanup() {
  if [[ -n "${API_PID:-}" ]]; then
    kill "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

"$ROOT/backend/.venv/bin/uvicorn" app.main:app --app-dir "$ROOT/backend" --host 127.0.0.1 --port 8000 &
API_PID=$!

ready=0
for _ in $(seq 1 50); do
  if curl -sf "http://127.0.0.1:8000/api/v1/health" >/dev/null; then
    ready=1
    break
  fi
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "The analysis service failed to start." >&2
    exit 1
  fi
  sleep 0.1
done

if [[ "$ready" -ne 1 ]]; then
  echo "The analysis service did not become ready." >&2
  exit 1
fi

echo ""
echo "Savant Sommelier"
echo "  App  http://127.0.0.1:5173"
echo "  API  http://127.0.0.1:8000/api/v1/health"
echo ""

cd "$ROOT/frontend"
npm run dev
