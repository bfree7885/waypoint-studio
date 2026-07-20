# Fieldry Performance Improvements — Sprint 7

## Changes

1. Draft autosave debounced (500ms) — avoids write storms while typing
2. History search debounced (280ms) — fewer hash navigations
3. Quick-capture first paint — less DOM above the fold for primary save path
4. Export `buildCSV` pure function — testable without Blob churn

## Unchanged structural costs

- Full list filter is in-memory over all local observations (fine for hundreds; not indexed)
- Knowledge demo preload still async after first paint
- Platform CSS 404 noise on cold load (studio-wide)

## Suggested soak

- 500+ observation filter latency on mid-range phone
- Draft autosave with private-mode / full storage
