# Happening Now discovery layer (2026-08-12)

Exposes the existing `happeningNow` ranked-signal API as a Dashboard shell discovery section.

## Placement

Between **Today Outside** and **Workspace** inside `renderShell` (`wds-dashboard-rebuild.js`).

Not an instrument tile. Not in Customize view.

## Empty state

If `happeningNow` is empty (or all signals lack evidence / are expired): **render nothing**.

No “Everything looks normal” / “Nothing happening” copy.

## UI module

`design-system/js/dashboard/rebuild/wds-dashboard-rebuild-happening.js`  
API: `WDS.dashboardRebuildHappening` (`render`, `bind`, `resolveSignals`)

Each item: title · severity text · one-line context · Why? disclosure · optional Scenes link · optional instrument focus.

## Dedup with Before You Go

`composeBeforeYouGoBrief(..., { happeningIds })` skips restating precip/wind/air/light/astro discoveries already shown in Happening Now (alerts may still lead BYO).

## Tests

`automation/test-dashboard-rebuild-happening.mjs` — 16 required scenarios + a11y + dedupe.
