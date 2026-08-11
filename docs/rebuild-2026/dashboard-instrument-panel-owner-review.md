# Dashboard Attack — Owner Review (2026-08-10)

**Branch:** `feature/dashboard-instrument-panel`  
**Rule:** `docs/APP-SURFACE-ARCHITECTURE.md` — ONE APP = ONE PRODUCT SURFACE

## Objective

Make `/apps/dashboard/` a focused daily outdoor instrument panel. Remove cross-product promo from the Dashboard body. Document and gate the architecture rule.

## Changes

1. Architecture docs + PRODUCT_STANDARDS + DS 2.0 section
2. Deepeners reduced to Dashboard-native Waypoint’s Take only (Scenes/Sheds/Articles/Side Trails promo removed)
3. Dashboard identity: title, canonical, product-name, contact, boot error copy
4. Default instrument order: Conditions → Air → Alerts → Light → Astronomy
5. Place trust honesty: geo/manual → Live; ip → Estimated; storage → Cached
6. Permanent gates: `test-app-surface-isolation.mjs`, `test-dashboard-instrument-panel.mjs`
7. Updated `test-home-rc1.mjs` / articles deepen asserts for front-door + surface isolation

## Screenshots

`docs/rebuild-2026/screenshots-dashboard-attack/` — 375/430/768/1440/1728 workspace, customize, offline attempt.

## Gates

- `node automation/test-app-surface-isolation.mjs`
- `node automation/test-dashboard-instrument-panel.mjs`
- `node automation/test-home-rc1.mjs`
