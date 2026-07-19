# Savant Sommelier — Performance Report (Phase 1)

**Date:** 2026-07-18

## Goals addressed

| Area | Change |
|------|--------|
| Initial paint | Replaced foundation boot stack with lean task pages + recovery CSS |
| Navigation | Five-task strip; fewer dead routes |
| Search | Client-side filter on cached discover catalog; instant cellar search |
| Caching | `SavantFetch` memory cache (default 10 min) with stale fallback |
| Bundle size | No heavy map SDK; schematic map CSS only |
| Loading states | Explicit loading / error / empty — no endless spinners |
| Responsiveness | Task nav scroll, mobile map stacking, 44px targets |

## Profile notes (engineering)

- Discover/Learn JSON is small and cacheable; repeated visits hit memory cache.
- Vineyard analysis is synchronous CPU on click (lightweight); grape models loaded once per analysis session via fetch cache.
- Cellar repaints are localStorage-bound — acceptable for hundreds of bottles; no network.
- Fonts: Cormorant + Source Sans 3 (preconnect); Inter removed from Savant pages to avoid unused face weight.

## Remaining performance debt

1. Shared WDS shell/nav scripts still load on every page (platform convention).
2. `savant-views.js` is a single multi-view module — could code-split later.
3. Schematic map is CSS, not WebGL — fine for Phase 1; real basemap will need lazy load.
4. No service worker / offline shell yet (cellar already works offline once loaded).

## Suggested Phase 2 measurements

- Lighthouse mobile first-contentful paint on Discover
- Time-to-interactive on Vineyard after first click
- Catalog filter latency with 500+ entries (when catalog grows)
