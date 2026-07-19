# Platform Consistency — Changelog (Phase 1)

**Date:** 2026-07-18  
**Commit:** none (owner review)

## Added

- `design-system/css/wds-platform-ui.css` imported from `wds.css`
- `design-system/js/platform/wds-platform-ui.js` (helpers + task nav)
- `WDS.escapeHtml` / `WDS.core.escapeHtml`
- Platform docs + `automation/test-platform-consistency.mjs`

## Changed

- Shell local nav + buttons + map buttons → 44px targets
- ForageCast/Savant shells & fetch → prefer platform UI
- Savant fonts → Inter (platform body)
- 64 HTML pages load `wds-platform-ui.js`
- Volunteer mini-nav removed
- ForageCast nav registry/config restored to task IA
- Recovery CSS task-nav reduced to product paint only

## Architecture note

Shared structure now lives in design-system; product CSS should theme, not re-implement flex/overflow/active-link metrics.
