#!/usr/bin/env bash
# Install a daily cron job for run-daily.sh (8:00 AM local time).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$ROOT/automation/week-away/run-daily.sh"
CRON_LINE="0 8 * * * $SCRIPT >> $ROOT/automation/week-away/logs/cron.log 2>&1"

chmod +x "$SCRIPT"

if crontab -l 2>/dev/null | grep -q "week-away/run-daily.sh"; then
  echo "Cron job already installed."
  exit 0
fi

(crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
echo "Installed daily cron (8:00 AM):"
echo "  $CRON_LINE"
echo ""
echo "Optional: create automation/week-away/.env with WEBHOOK_URL=..."
echo "Remove later: crontab -e"
