# Savant WIE — Performance Report (Phase 2)

**Date:** 2026-07-18

## Improvements

| Area | Change |
|------|--------|
| Recommendation speed | In-memory engine package cache (~2 min) keyed by cellar signal counts |
| Search | Client-side synonym/misspelling normalize + scored catalog scan (small N) |
| Map UI | Unchanged schematic click path; analysis remains lightweight CPU |
| Rendering | Intelligence blocks are plain HTML strings; no card-heavy chrome |
| Caching | `SavantFetch` for JSON + `SavantWIE.engine` memory cache |
| Navigation | Same five-task IA — intelligence embedded, not new pages |

## Profile notes

- Catalog ~16 entries: search/recommend are effectively instant.
- Cellar intel re-evaluates on paint with `force: true` after mutations; overview Discover uses cache on repeat visits.
- Vineyard trajectory adds O(grapes × horizons) — currently tiny.

## Next measurements

- Engine evaluate time with 200+ cellar rows
- Search latency with 500+ catalog entries
- Lazy-load WIE on Settings-only pages (optional)
