# Savant WIE — Remaining Technical Debt

**Date:** 2026-07-18

## High

1. Palate traits from free-text notes are keyword heuristics — not ML embeddings.
2. Climate trajectory still uses a single °C/decade scenario.
3. Discover catalog too small for rich producer/AVA/vintage facets.
4. Occasion/season recommendation signals are architected in mission but only lightly used (purchase seasons).

## Medium

5. Compare UI is catalog-entry only on Discover — property A/B compare API exists, no dual-map UI yet.
6. Food pairing rules are a compact expert set — expand carefully with sources.
7. Cellar “approaching maturity” uses drink-to years only.
8. WIE scripts load on every Savant page (simplicity over code-splitting).

## Low / intentional

9. No black-box “AI score” — by design.
10. No sample cellar — empty states teach onboarding.

## Tests

- `automation/test-savant-wie.mjs`
- Phase 1 `automation/test-savant-recovery.mjs` still relevant
