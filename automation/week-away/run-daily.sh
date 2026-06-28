#!/usr/bin/env bash
# Week-away daily runner — validation + optional webhook to Cursor Automation.
# Does NOT run AI locally. Pair with Cursor Automations (see START_HERE.md).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WA="$ROOT/automation/week-away"
LOG_DIR="$WA/logs"
mkdir -p "$LOG_DIR"

LOG="$LOG_DIR/$(date +%Y-%m-%d).log"
exec > >(tee -a "$LOG") 2>&1

echo "=== Waypoint week-away daily runner $(date -Iseconds) ==="

# Load optional webhook
if [[ -f "$WA/.env" ]]; then
  # shellcheck disable=SC1090
  source "$WA/.env"
fi

cd "$ROOT"

# Syntax-check dashboard JS (fast smoke test)
echo "→ Syntax check dashboard JS..."
failed=0
for f in design-system/js/dashboard/*.js; do
  if ! node -c "$f" 2>/dev/null; then
    echo "  FAIL: $f"
    failed=1
  fi
done
if [[ "$failed" -ne 0 ]]; then
  echo "✗ Syntax errors in dashboard JS — fix before automation continues."
  exit 1
fi
echo "→ Syntax OK"

# Show state
if [[ -f "$WA/state.json" ]]; then
  echo "→ State: $(cat "$WA/state.json")"
fi

# Ping Cursor Automation webhook if configured
if [[ -n "${WEBHOOK_URL:-}" ]]; then
  echo "→ Triggering Cursor automation webhook..."
  if curl -sf -X POST "$WEBHOOK_URL" -H "Content-Type: application/json" \
    -d "{\"source\":\"waypoint-week-away\",\"date\":\"$(date -Iseconds)\"}"; then
    echo "→ Webhook OK"
  else
    echo "✗ Webhook failed (check WEBHOOK_URL in automation/week-away/.env)"
    exit 1
  fi
else
  echo "! No WEBHOOK_URL set — skipping trigger."
  echo "  Use Cursor Automations schedule (recommended) or set .env — see START_HERE.md"
fi

echo "=== Done ==="
