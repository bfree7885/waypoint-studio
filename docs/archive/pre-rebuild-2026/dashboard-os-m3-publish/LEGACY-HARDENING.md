# Legacy V2/V3 access hardening — M3 publish gate

**Date:** 2026-07-22

## Risk

V2/V3 modules still load via `design-system/js/wds.js` (shared models + kiosk/tests). Recovery is stubbed. If Outdoor OS failed to register, the engine previously fell through to Recovery / widget-grid presentation.

## Hardening shipped

1. **`wds-dashboard-engine.js`**
   - Detect Outside product surface (`data-product="dashboard"` or `/apps/dashboard/`)
   - Always prefer `dashboardOS.renderDashboard`
   - If OS missing on Outside → honest unavailable HTML; **never** Recovery / widget grid
   - Skip Recovery specialty mounts on Outside
2. **`wds-content-engine.js`**
   - Treat Outside as Outdoor OS surface even before OS API checks
   - Skip legacy briefing header, settings bind, and briefing-package bind on Outside
3. **Comments** on V2/V3/Recovery clarifying they are not production Outside presentation
4. **Regression tests** in `automation/test-dashboard-today-outside.mjs`
   - Entry HTML is OS-only (no V2/V3 CSS / Recovery markers)
   - Nav features empty; product titled Outside
   - Engine ignores V2/V3 localStorage flag keys
   - Runtime: OS wins even if Recovery claims enabled
   - Runtime: Outside without OS does not fall through to Recovery/widgets

## What remains (intentional)

| Artifact | Why kept |
|----------|----------|
| V2 model / prefs / briefing / activity / timeline / trust | Outdoor OS `buildPayload` + interpret |
| V2/V3 render / customize / kiosk modules | Modular tests + non-product kiosk |
| Loader entries in `wds.js` | Shared deps; trimming Outside-only loader is M4+ |

## Production route guarantee

`/apps/dashboard/` → `home-boot` → `sections: ["outdoor-dashboard"]` → `dashboardEngine.renderDashboard` → `dashboardOS`. Query params, hashes, and `waypoint-dashboard-v2` / `v3` localStorage flags cannot restore Recovery/V2/V3 as the Outside page chrome.
