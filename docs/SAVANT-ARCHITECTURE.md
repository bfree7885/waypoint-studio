# Savant Sommelier — Architecture Report (Phase 1)

**Date:** 2026-07-18

## Layering

```
Pages (Discover / Learn / Cellar / Vineyard / Settings)
        ↓
SavantViews + SavantShell (task nav, mount, escape, loading)
        ↓
Domain modules
  · WaypointSavant (local models)
  · SavantVineyard (property + future engine)
  · SavantMap (overlay contracts)
  · SavantBuying (purchase contracts)
  · SavantFetch (cache + timeout)
        ↓
Data
  · discover-catalog.json
  · learn-curriculum.json
  · grape-suitability-models.json
  · foundation.json / preview.json
  · localStorage (cellar, sites, wishlist, settings)
```

## Key modules

| Module | Path | Responsibility |
|--------|------|----------------|
| Models | `js/savant-models.js` | Cellar / sites / wishlist / settings |
| Fetch | `js/savant-fetch.js` | Memory cache, timeouts, stale fallback |
| Shell | `js/savant-shell.js` | Task nav + helpers |
| Views | `js/savant-views.js` | All five experiences |
| Vineyard engine | `js/vineyard/vineyard-engine.js` | Analyze + Future Vineyard |
| Map contract | `js/vineyard/vineyard-map-contract.js` | Overlay seams, click→analyze |
| Buying contract | `js/buying/buying-contract.js` | Retailer/price/availability seams |

## Design principles

1. **Explainability first** — scores always accompany why text.
2. **Honesty labels** — educational-estimate / scenario-estimate / contract-ready.
3. **No unfinished features rendered** — map overlays and buying are contracts only.
4. **Local-first private cellar** — no sample inventory.
5. **Shared platform shell** — WDS app nav + shell depth=1.

## Future integration points

- DEM / climate normals providers → `analyzeProperty` input overrides
- Parcel / soils / hydrology tile services → `SavantMap.createSpatialRequest`
- Retailer APIs → `SavantBuying.createOfferQuery` adapters
- Friends’ recommendations → cellar social layer (explicitly deferred)

## Platform alignment

Mirrors ForageCast recovery patterns (task nav, fetch cache, honesty banners, contract-ready map seams) so Waypoint Studio products share a recognizable intelligence UX language.
