# Dashboard — Functional Tile Catalog

**Status:** Locked inventory for the 2026 Rebuild Dashboard workspace  
**Authority:** `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js`  
**Owner review:** [dashboard-catalog-owner-review.md](./dashboard-catalog-owner-review.md)  
**Architecture:** [docs/rebuild-2026/03-dashboard-architecture.md](../rebuild-2026/03-dashboard-architecture.md)

---

## Rules

1. **Every catalog entry is live** — payloads read the shared Outdoor Intelligence Platform (OIP) package or a documented local calculation.
2. **No Coming Soon / placeholder / disabled stubs** in the selectable catalog. Unsupported ideas stay out of the registry.
3. **Tiles never fetch** — memoised selectors in `wds-dashboard-rebuild-data.js` parse the platform package once; each tile reads a normalised view.
4. **Sizes** are only `standard` | `wide` | `featured` (legacy tokens migrate). Current catalog uses `standard` for all 32.
5. **Customize** browses nine library categories (+ Favorites). Selections persist in `waypoint-dashboard-rebuild-prefs-v1`.
6. Legacy Outdoor OS / V2 / V3 catalogs are **not** this inventory.

---

## Inventory — 32 tiles, 9 categories

### Weather (5)

| ID | Title | Default |
| --- | --- | --- |
| `ph-conditions` | Current Conditions | yes |
| `ph-hourly` | Hourly Forecast | yes |
| `ph-forecast` | Daily Forecast | |
| `ph-wind` | Wind | |
| `ph-precip` | Precipitation Window | |

### Photography (5)

| ID | Title | Default |
| --- | --- | --- |
| `ph-golden` | Golden Hour | yes |
| `ph-blue` | Blue Hour | |
| `ph-photo` | Photography Conditions | |
| `ph-sky` | Cloud and Sky | |
| `ph-night-photo` | Night Photography | |

### Astronomy (3)

| ID | Title | Default |
| --- | --- | --- |
| `ph-sun` | Sun and Daylight | yes |
| `ph-moon` | Moon Phase | |
| `ph-dark-sky` | Dark-Sky Window | |

### Air and Environment (3)

| ID | Title | Default |
| --- | --- | --- |
| `ph-air` | Air Quality | yes |
| `ph-uv` | UV Index | |
| `ph-exposure` | Outdoor Exposure | |

### Hiking and Trails (4)

| ID | Title | Default |
| --- | --- | --- |
| `ph-hiking-window` | Hiking Window | yes |
| `ph-daylight-left` | Daylight Remaining | yes |
| `ph-trail-estimate` | Trail Condition Estimate | |
| `ph-pack` | Pack Guidance | |

### Rivers and Water (3)

| ID | Title | Default |
| --- | --- | --- |
| `ph-river` | River Level | yes |
| `ph-rainfall` | Recent Rainfall | |
| `ph-flood` | Flood Context | |

### Wildlife and Birding (3)

| ID | Title | Default |
| --- | --- | --- |
| `ph-birding` | Birding Conditions | |
| `ph-wildlife-window` | Wildlife Observation Window | yes |
| `ph-seasonal` | Seasonal Context | |

### Travel and Access (3)

| ID | Title | Default |
| --- | --- | --- |
| `ph-driving` | Driving Conditions | |
| `ph-travel-window` | Outdoor Travel Window | |
| `ph-place` | Location Summary | |

### Alerts and Safety (3)

| ID | Title | Default |
| --- | --- | --- |
| `ph-alerts` | Active Weather Alerts | yes |
| `ph-risk` | Outdoor Risk Summary | yes |
| `ph-freeze` | Freeze or Ice Risk | |

---

## Intentionally deferred (not in registry)

eBird sightings, moonrise/moonset, dedicated visibility, pollen, smoke/wildfire attribution, aurora, ISS passes, meteor calendars — no dependable free client source without fabricating richness. See owner review for reasons.

---

## Related code

| File | Role |
| --- | --- |
| `wds-dashboard-rebuild-registry.js` | Authoritative catalog |
| `wds-dashboard-rebuild-data.js` | Shared selectors + 32 builders |
| `wds-dashboard-rebuild-customize.js` | Category-grouped library UI |
| `wds-dashboard-rebuild-prefs.js` | Persistence / category bulk enable |
| `wds-dashboard-rebuild.css` | Catalog + interpretation styles |
