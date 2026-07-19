# Production Repair Changelog

**Date:** 2026-07-18  
**Commit status:** Not committed. Not pushed.

## Added
- `design-system/js/platform/wds-platform-boot.js`
- `design-system/css/wds-platform-boot.css`
- `automation/validate-production-links.mjs`
- `automation/test-production-repair.mjs`
- Production repair documentation suite (`docs/PRODUCTION-*.md`)

## Fixed
- Foundation `routeHref` site-root 404 bug (`/map/` → `map/`)
- Absolute ready routes in foundation.json files
- Empty Savant busy mounts; Steepleaf/ForageCast/Fieldry weak boots
- Scenes dual entry points → redirects + nav hrefs to live apps
- Duplicate home/Sheds/Volunteer/Fieldry/ForageCast copy
- Sheds map missing About/Privacy links

## Explicit non-goals
- No new product features
- No visual redesign of apps
- No fabricated content
- No commit / push
