# Savant Sommelier — Product Recovery Phase 1 Changelog

**Date:** 2026-07-18  
**Commit:** none (owner review before commit/push)

## Added

- Five primary experiences: Discover, Learn, My Cellar, Vineyard Intelligence, Settings
- `data/discover-catalog.json` — educational grapes/regions/styles with why/flavors/similar/price
- `data/learn-curriculum.json` — 15 learning topics with overview, visual aids, facts, misconceptions, related links
- `data/grape-suitability-models.json` — cultivar climate preference models + horizons
- `js/vineyard/vineyard-engine.js` — property analysis + Future Vineyard explanations
- `js/vineyard/vineyard-map-contract.js` — parcel/soils/climate/terrain overlay architecture
- `js/buying/buying-contract.js` — retailer/price/availability architecture
- `js/savant-fetch.js`, `js/savant-shell.js`, `js/savant-views.js`
- `css/savant-recovery.css`
- Pages: `learn.html`, `cellar.html`, `vineyard.html`, `settings.html` (+ rebuilt `index.html`)
- Docs: Product Recovery, Architecture, Performance, Technical Debt, Future Vineyard Roadmap, Shared Platform Opportunities
- Tests: `automation/test-savant-recovery.mjs`
- Sitemap + smoke routes for all five pages

## Changed

- Extended `js/savant-models.js` for quantity, purchase, location, drink windows, ratings, notes, favorites, search, stats, clearAll
- Platform nav (`wds-app-nav-config.js`, `nav-registry.json`) — five Savant tasks; status active
- `foundation.json` / `preview.json` updated for recovery posture

## Removed / avoided

- Foundation stub as the only UX
- Sample cellar data
- Rendering unfinished map overlays or live buying UI
- Vivino-style scoreboard framing

## Honest readiness

Pre-V1 recovery complete for review. Serious product shape; not yet Version 1.0 without live climate/map/retailer evidence layers.
