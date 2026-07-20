# Savant Knowledge Architecture Review — Sprint 8

## Intent

Teach why wines differ through **place**: climate, soils/geology cues, growing conditions, and tasting characteristics — observation over memorization.

## Current model (honest)

| Layer | Representation | Linked how |
| --- | --- | --- |
| Discover catalog | Grape / region / style cards | `regionHints`, `countryHints`, `similar[]` |
| Learn curriculum | Topics with `related[]` | In-page anchors + Start-here order |
| Cellar | Local WOS-like bottles | Free-text winery/region/varietal |
| Sites | Lat/lng study points | Used by Vineyard; not graph-linked to catalog |
| Vineyard engine | Educational metrics + Future Vineyard | Metric → `education.forMetric` snippets |
| WIE education | Fixed teachable snippets | Page/theme keyed |

## Teaching chain (UI)

Wine → producer notes → site → region → climate → geology → growing conditions → tasting — shown as an honesty strip. **Producer→site→geology entity joins are not modeled yet.**

## Sprint 8 bridges

- Place story on Discover cards
- Learn path ordering existing topics
- Links between Discover, Learn (climate/tasting), and Vineyard

## Next architecture steps (deferred)

- Optional producer/site entities in WOS extension
- Soil/geology layers beyond limestone snippets
- Deep links from curriculum IDs into Discover facet queries
