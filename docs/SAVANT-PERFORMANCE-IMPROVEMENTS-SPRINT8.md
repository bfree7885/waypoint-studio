# Savant Performance Improvements — Sprint 8

## Changes

1. Boot watch avoids infinite “busy” without recovery
2. Discover/Learn defer heavy chrome until JSON arrives (less wasted paint on fail)
3. Facet list trimmed — fewer useless filter attempts
4. Search path single-scored — no dual full-catalog filter for common case

## Unchanged

- Full WIE script stack still loads on every page (Settings included)
- Vineyard analysis is sync CPU after click
- Educational climate estimators remain light heuristics

## Suggested next

- Split Settings/Cellar bundles from Discover WIE stack
- Memory-cache catalog across navigations within the SPA session
