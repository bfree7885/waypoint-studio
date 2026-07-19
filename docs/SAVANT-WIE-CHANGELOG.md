# Savant Sommelier — Phase 2 Changelog (Wine Intelligence Engine)

**Date:** 2026-07-18  
**Commit:** none (owner review before commit/push)

## Added

- Wine Intelligence Engine under `apps/savant-sommelier/js/wie/`:
  - signals, palate, recommend, discovery, tasting, pairing, cellar, purchase, education, compare, search, engine
- Discover: personal recommendations, guided discovery, intelligent search, food pairing, style compare
- Cellar: cellar / tasting / purchase intelligence panels with why text
- Learn: continuous teachable moments
- Vineyard: strengths/risks, climate trajectory with uncertainty, why-not grapes, horizon compare
- Docs: architecture, recommendation, palate, vineyard, performance, debt, future AI, changelog
- Tests: `automation/test-savant-wie.mjs`

## Changed

- `vineyard-engine.js` → v1.1 future package (whyNot, strengths, risks, climateTrajectory)
- Foundation status → intelligence
- Recovery CSS — intelligence panels

## Removed / avoided

- Placeholder recommendations without why
- Black-box ranking UX
- Fake AI certainty on climate decades

## V1 readiness (honest)

Still **pre-V1**. Phase 2 makes Savant *think* with explanations. Version 1.0 still wants live climate/map evidence, richer catalogs, and more palate signal depth.
