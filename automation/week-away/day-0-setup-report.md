# Day 0 — Automation setup

**Date:** Setup before departure  
**Status:** Infrastructure ready; Day 1–7 pending automation

## What changed

- Added `automation/week-away/` — playbook, task queue, agent prompt, state tracker
- Added `START_HERE.md` with Cursor Automations setup instructions
- Added `run-daily.sh` + optional cron installer for webhook trigger
- Landed dashboard V1 work: morning brief, glance vitals, presets, tighter default layout

## Why

Owner will be away one week with no computer access. This enables one small, tested improvement per day without input.

## Files modified

- `automation/week-away/*` (new)
- `design-system/js/dashboard/wds-dashboard-brief.js` (new)
- `design-system/js/dashboard/wds-dashboard-settings.js`
- `design-system/js/dashboard/wds-dashboard-catalog.js`
- `design-system/js/dashboard/wds-dashboard-engine.js`
- `design-system/js/dashboard/wds-dashboard-customize.js`
- `design-system/js/dashboard/wds-dashboard-categories.js`
- `design-system/js/dashboard/wds-dashboard-highlights.js`
- `design-system/js/wds-content-engine.js`
- `design-system/js/wds.js`
- `design-system/css/wds-dashboard-widgets.css`
- `index.html`

## Problems found

- Previous dashboard V1 commit was interrupted — changes were uncommitted
- `gh` CLI not installed on machine (use git push directly or install gh)
- Local `cursor` CLI does not run agents headlessly — **Cursor Automations (cloud)** required for true autonomy

## Problems remaining

- Days 1–7 reports not yet written (automation will create them)
- `WEEK_AWAY_SUMMARY.md` pending until Day 7
- User must enable Cursor Automation before leaving (see `START_HERE.md`)

## Ideas for tomorrow (Day 1)

- Verify morning brief renders with live weather after location set
- Touch target pass on mobile widget controls (Day 2 task)
