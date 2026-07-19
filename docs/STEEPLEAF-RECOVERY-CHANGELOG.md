# Steepleaf Recovery — Changelog

**Phase:** Product Recovery 1  
**Date:** 2026-07-18 / 2026-07-19  
**Status:** Uncommitted — owner review

---

## Product

- Default experience answers **“What should I brew today?”** with an explainable briefing.
- Workflow nav: Home, Today's Brew, My Collection, Brewing Sessions, Tea Journal, Discover, Learning, Search, Settings.
- Brewing workflow: select tea → guided parameters (with why) → timer → notes → saved session.
- Session history compares the current brew to the previous brew of the same tea.
- Learning covers categories, processing, oxidation, fermentation, water, variables, storage, terminology.
- Discover shows style guidance and gaps vs the user’s real collection — no shop, no social feed.
- Empty states stay empty; no sample tasting journals are seeded.

## Data (`steepleaf-models.js` → schema 1.1)

- Expanded tea + brew fields; search; export/import; preferences; delete.
- Caps: 500 teas / 800 brews.

## Engine

- `steepleaf-briefing.js` — personalized briefing + session comparison.
- `steepleaf-guides.js` — brewing defaults + learning topics.

## UI

- New `wds-steepleaf-app.js` SPA + `wds-steepleaf.css`.
- Softened Steepleaf accent tokens (calm leaf green).
- Shell status: active product features in nav/catalog.

## Removed / cleaned

- `apps/steepleaf/data/preview.json` (unused).
- Foundation brochure as primary UX (JSON retained for platform tests / honesty).
- Herbarium / “merge into ForageCast” identity in `product-registry.json`.

## Files

```
apps/steepleaf/index.html
apps/steepleaf/js/steepleaf-models.js
apps/steepleaf/js/steepleaf-guides.js
apps/steepleaf/js/steepleaf-briefing.js
apps/steepleaf/js/wds-steepleaf-app.js
apps/steepleaf/data/foundation.json
design-system/css/wds-steepleaf.css
design-system/css/wds-tokens.css
design-system/js/platform/wds-app-nav-config.js
design-system/js/platform/wds-platform-catalog.js
design-system/ecosystem/nav-registry.json
design-system/ecosystem/product-registry.json
docs/STEEPLEAF-PRODUCT-RECOVERY-PHASE1.md
docs/STEEPLEAF-RECOVERY-CHANGELOG.md
```

## Verified

```
node --check apps/steepleaf/js/*.js
node automation/test-platform-foundation.mjs
```
