# ForageCast — Location System Review (Sprint 4)

## Sources supported

| Source | Behavior |
| --- | --- |
| Browser geolocation | Preferred; builds coord state + optional reverse geocode |
| IP geolocation | Fallback when GPS denied/unavailable; labeled approximate |
| Saved / cached location | Restored when fresh and valid |
| Manual county / state search | Via location bar |
| Unavailable | Explicit unavailable state — never fake a county |

## Bug fixed: “NULL, NY”

**Root cause:** `name: null` (or city/`placeLabel` string `"NULL"` / `"null, NY"`) concatenated with `stateCode`, or returned verbatim as `displayTitle`.

**Repairs:**

1. `WDS.location.isUsablePlacePart` / `sanitizePlaceLabel`
2. Hardened `formatRegionLabel`, `formatStatusLine`, `formatHeroMeta`, location bar HTML
3. `applyPlaceDisplay` rejects poisoned labels; falls back to coords or “Location in {ST}”
4. `WDS.usNational.displayTitle` same guards
5. `ForageCastLocation.formatRegionLabel` delegates to platform + local fallbacks (“Set a place to personalize”)

## Permission / empty paths

| Case | User-facing outcome |
| --- | --- |
| Permission denied | IP attempt → else cached → else unavailable / set a place |
| No GPS | Same fallback chain |
| Geocode timeout | Coord + state label (not null city) |
| Invalid cached label | Cleaned on `applyPlaceDisplay` / format |

## Remaining risks

- Reverse geocode quality still depends on Nominatim availability
- Editorial Pike bundle vs national educational mode can confuse users about “how local” content is — honesty copy still required
