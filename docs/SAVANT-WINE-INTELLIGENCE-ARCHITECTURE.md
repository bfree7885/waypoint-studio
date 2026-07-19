# Savant Sommelier — Wine Intelligence Architecture (Phase 2)

**Date:** 2026-07-18  
**Status:** Implemented locally — **not committed / not pushed**  
**Depends on:** Product Recovery Phase 1

## Purpose

Turn Savant from a wine storage UI into software that **interprets, explains, teaches, and recommends** — like a calm sommelier + viticulturist + educator — with transparency instead of black-box scores.

## Layered pipeline

```
Signals (cellar / wishlist / ratings / purchases / notes)
    → Palate profile (weights + confidence)
        → Recommendations (multi-signal + WHY)
        → Guided discovery
        → Tasting pattern analysis
        → Food pairing explanations
        → Cellar intelligence
        → Purchase intelligence
Education / Compare / Search (cross-cutting)
Vineyard engine (site + climate trajectory + why / why-not)
```

| Layer | Module |
|-------|--------|
| Boot | `js/wie/savant-wie-boot.js` |
| Signals | `js/wie/savant-wie-signals.js` |
| Palate | `js/wie/savant-wie-palate.js` |
| Recommend | `js/wie/savant-wie-recommend.js` |
| Discovery | `js/wie/savant-wie-discovery.js` |
| Tasting | `js/wie/savant-wie-tasting.js` |
| Pairing | `js/wie/savant-wie-pairing.js` |
| Cellar intel | `js/wie/savant-wie-cellar.js` |
| Purchase | `js/wie/savant-wie-purchase.js` |
| Education | `js/wie/savant-wie-education.js` |
| Compare | `js/wie/savant-wie-compare.js` |
| Search | `js/wie/savant-wie-search.js` |
| Engine | `js/wie/savant-wie-engine.js` |
| Vineyard | `js/vineyard/vineyard-engine.js` |

UI calls `SavantWIE.engine.evaluate({ catalog })` rather than recomputing ad hoc.

## Non-negotiables

1. Every recommendation answers **why**.
2. Low-data states stay educational — never fake certainty.
3. Unfinished map/buy features remain contracts only.
4. Local-first privacy for cellar signals.
