# Savant Search Review — Sprint 8

## Behavior

1. Query always runs through `SavantWIE.engine.search` (synonyms, misspellings, scored results)
2. Facet + value filters the scored hit list via `matchEntry`
3. Facets without catalog data (producer, vintage, blend, price, ava, subregion) are hidden

## Why

Previously, query-only used WIE scoring while facet paths used substring `matchEntry`, so the same typed term could disagree. Unified scoring keeps “interpreted as…” suggestions trustworthy.

## Performance

- Catalog remains small (~16 entries) — full scan + Levenshtein is fine
- Input debounced (~140ms) when resilience helpers exist
- No new indexes required this sprint

## Remaining gaps

- Facet value autocomplete still free-text
- Cellar search remains separate substring helper
- Growing catalog past hundreds needs index / capped Levenshtein (see performance debt)
