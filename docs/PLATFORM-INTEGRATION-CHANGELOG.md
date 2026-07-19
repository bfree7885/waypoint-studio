# Platform Integration Changelog — Phase 3

**Date:** 2026-07-18  
**Commit status:** Not committed. Not pushed.

## Added

- `design-system/js/platform/wds-platform-observations.js` — unified private observation query bridge
- `design-system/js/platform/wds-platform-places.js` — saved / recent / favorite places over platform Locations
- `design-system/js/platform/wds-platform-search.js` — global search providers (apps, places, collections, observations, knowledge, settings)
- `design-system/js/platform/wds-platform-notifications.js` — opt-in local reminder inbox
- `design-system/js/platform/wds-platform-graph.js` — relationship seeds + observation-derived edges
- `design-system/js/platform/wds-platform-workflows.js` — cross-app workflow catalog + HTML renderer
- `design-system/js/platform/wds-platform-identity.js` — profile/settings ensure, theme, app linking
- `design-system/js/platform/wds-platform-settings-page.js` + `settings.html`
- `design-system/css/wds-platform-integration.css`
- `automation/test-platform-integration.mjs`
- Documentation suite listed in the Integration Report

## Updated

- `wds-platform-stores.js` — expanded settings (units, maps, theme)
- `wds.js` / `wds-platform.js` — load integration modules
- `wds.css` — import integration CSS
- Dashboard widget data — wildlife + favorites via platform bridges
- Studio Home — search + Settings link + module scripts
- ForageCast / Fieldry / Sheds / Savant — natural workflow links and Studio settings entry points
- Key app HTML pages — load workflow/observations/identity scripts

## Explicit non-goals

- No new product features
- No accounts / cloud sync
- No push notifications
- No fake suitability scores from cross-app data
- No forced auto-navigation between apps
