# Dashboard — Functional Tile Catalog Expansion (Owner Review)

**Status:** implemented, rebased onto `origin/main`, production-readiness verified — pending merge and production deploy
**Branch:** `feature/dashboard-functional-tile-catalog`
**Starting SHA (feature work):** `59c09de` (matched the prior `main` tip)
**Pre-rebase tip (this integration pass):** `c975958`
**Post-rebase tip:** `c975958` (already contained `origin/main`; rebase was a no-op)

---

## 0. Production-readiness integration (2026-08-03)

### Rebase

| Item | Value |
| --- | --- |
| Base | `origin/main` @ `59c09de` |
| Feature tip before rebase | `c975958` |
| Merge-base | `59c09de` (= `origin/main`) |
| Outcome | **Already up to date** — no replay, no conflicts |
| Notable conflicts | None |

Feature commits remain: `1164abc` (catalog), `a178291` (tests), `e7a4b15` / `c7b2525` (docs), plus two unrelated live-engine publish commits (`83ec742`, `c975958` `[skip ci]`).

### Working tiles

| Metric | Count |
| --- | --- |
| **Working / catalogued tiles** | **32** |
| Default-visible | 11 |
| Categories | 9 |
| **Removed this pass** | **none** (rebuild registry had no duplicates or obsolete stubs) |
| **Disabled / Coming soon / placeholder** | **none** |

Every registry ID maps 1:1 to `liveIds` and a `buildWidgetPayload` builder. Layout sizes remain the three allowed values (`standard` / `wide` / `featured`); this catalog uses `standard` for all 32. Legacy Outdoor OS / V2 / V3 catalogs stay in tree for historical surfaces and are **not** part of the Rebuild product path — they were left alone so OS/V2/V3 tests keep passing.

### Preserved

- All 32 working tiles and category-grouped customization
- Mobile layout repair (full-width tiles, one column)
- Today Outside (`wds-dashboard-rebuild-today.js`)
- Rebuild architecture (`wds-dashboard-rebuild*`, registry, prefs, workspace, deepeners, kiosk)
- Tile layout + mobile editing contracts

### Test summary (this pass)

| Suite | Result |
| --- | --- |
| `test-dashboard-functional-tile-catalog.mjs` | **177 pass / 0 fail** |
| `test-dashboard-tile-layout-repair.mjs` | **48 pass / 0 fail** |
| `test-dashboard-mobile-tile-editing.mjs` | **39 pass / 0 fail** |
| `test-dashboard-rebuild-phase1.mjs` | **88 pass / 0 fail** |
| `test-dashboard-rebuild-phase2.mjs` | **97 pass / 0 fail** |
| `test-dashboard-rebuild-phase3.mjs` | **102 pass / 0 fail** |
| `test-dashboard-reliability.mjs` | **41 pass / 0 fail** |
| `test-dashboard-os-copy.mjs` | **28 pass / 0 fail** |
| `test-dashboard-os-interpret.mjs` | **80 pass / 0 fail** |
| `test-dashboard-os-routes.mjs` | **36 pass / 0 fail** |
| `test-dashboard-v2.mjs` | **59 pass / 0 fail** |
| `test-dashboard-v3.mjs` | **50 pass / 0 fail** |
| `test-dashboard-today-outside.mjs` | **28 pass / 4 fail** (stale Outdoor OS asserts; same baseline on `origin/main`) |
| **Dashboard green total (excl. stale today-outside)** | **845 pass / 0 fail** |

Stale today-outside failures (not introduced here; documented on main): Outdoor OS CSS load, empty dashboard nav, product title "Outside", home-boot outdoor-dashboard-only sections.

### Screenshots

Existing browser captures under `docs/rebuild-2026/dashboard-functional-tile-catalog/` remain the authoritative visual record (`verification.json` `ok: true`, 26 PNGs including desktop default/all-tiles/customize and mobile 320–430 + apps/dashboard).

### Ship gate

- **Do not merge. Do not deploy.** This pass only rebased/verified and refreshed this owner review.

---

## 1. Interrupted-run context

A previous implementation run stopped because of a monthly agent usage limit
before writing any code. That was not a code failure. On resume the branch was
verified clean: no partial catalog code existed, and the only working-tree
changes were automated publishing artefacts (`data/live.json`,
`data/health.json`, `data/publish-state.json`, `debug.html`, `status.html`).
Those files were left untouched and were **not** committed, per the repository's
dirty-tree rules.

## 2. Recovered audit findings

The prior audit concluded that the shared Outdoor Intelligence Platform (OIP)
package plus local calculations could support roughly 28 honest tiles across
nine categories, and that several requested features had no dependable source.
Validation on resume confirmed this and refined it:

- The client OIP package hydrates `weatherRef.current`, `weatherRef.hourly`,
  `weatherRef.daily`, `daylight`, `airQuality`, `alerts`, `usgsWater`,
  `elevation`, `timezone`, `region`, and `calendar`.
- The Rebuild registry wired only **4** live payload IDs and catalogued one
  empty Alerts shell — five visible tiles in total.
- `buildWidgetPayload` handled only those four IDs.
- Moonrise/moonset are computed nowhere and are not published by the weather
  providers in use; the previous Astronomy tile printed "Moonrise — Not
  reported", which is honest but not useful as a standing row.
- The weather layer can answer from **Open-Meteo or NWS**, and NWS does not
  publish sunrise/sunset, cloud cover, humidity, or UV. Any tile depending on
  those fields must degrade honestly rather than assume Open-Meteo.

## 3. Catalog

### Initial catalog (5 tiles, 5 categories)

`ph-conditions`, `ph-light`, `ph-air`, `ph-astronomy`, `ph-alerts`.

### Final catalog — 32 functional tiles across 9 categories

| Category | Count | Tile IDs |
| --- | --- | --- |
| Weather | 5 | `ph-conditions`, `ph-hourly`, `ph-forecast`, `ph-wind`, `ph-precip` |
| Photography | 5 | `ph-golden`, `ph-blue`, `ph-photo`, `ph-sky`, `ph-night-photo` |
| Astronomy | 3 | `ph-sun`, `ph-moon`, `ph-dark-sky` |
| Air and Environment | 3 | `ph-air`, `ph-uv`, `ph-exposure` |
| Hiking and Trails | 4 | `ph-hiking-window`, `ph-daylight-left`, `ph-trail-estimate`, `ph-pack` |
| Rivers and Water | 3 | `ph-river`, `ph-rainfall`, `ph-flood` |
| Wildlife and Birding | 3 | `ph-birding`, `ph-wildlife-window`, `ph-seasonal` |
| Travel and Access | 3 | `ph-driving`, `ph-travel-window`, `ph-place` |
| Alerts and Safety | 3 | `ph-alerts`, `ph-risk`, `ph-freeze` |

### Source and dependency per tile

| Tile ID | Title | Dependencies | Source | Kind |
| --- | --- | --- | --- | --- |
| `ph-conditions` | Current Conditions | `weatherRef.current` | Open-Meteo / NWS | External |
| `ph-hourly` | Hourly Forecast | `weatherRef.hourly` | Open-Meteo / NWS | External |
| `ph-forecast` | Daily Forecast | `weatherRef.daily` | Open-Meteo / NWS | External |
| `ph-wind` | Wind | `weatherRef.current.wind`, `weatherRef.hourly` | Open-Meteo / NWS | External + calculated peak |
| `ph-precip` | Precipitation Window | `weatherRef.hourly` | Open-Meteo / NWS | External + calculated window |
| `ph-golden` | Golden Hour | `daylight` | Waypoint calculation | Calculated |
| `ph-blue` | Blue Hour | `daylight` | Waypoint calculation | Calculated |
| `ph-photo` | Photography Conditions | `weatherRef.current`, `daylight` | Waypoint calculation | Calculated |
| `ph-sky` | Cloud and Sky | `weatherRef.current` | Open-Meteo / NWS | External + calculated character |
| `ph-night-photo` | Night Photography | `daylight`, `weatherRef.current` | Waypoint calculation | Calculated |
| `ph-sun` | Sun and Daylight | `daylight` | Waypoint calculation | Calculated |
| `ph-moon` | Moon Phase | `daylight` | Waypoint calculation | Calculated (local ephemeris) |
| `ph-dark-sky` | Dark-Sky Window | `daylight`, `weatherRef.current` | Waypoint calculation | Calculated |
| `ph-air` | Air Quality | `airQuality` | Open-Meteo Air Quality | External |
| `ph-uv` | UV Index | `weatherRef.current.uvIndex`, `weatherRef.daily` | Open-Meteo | External + categorisation |
| `ph-exposure` | Outdoor Exposure | `airQuality`, `weatherRef.current` | Waypoint calculation | Calculated |
| `ph-hiking-window` | Hiking Window | `weatherRef.hourly`, `daylight`, `alerts` | Waypoint calculation | Calculated |
| `ph-daylight-left` | Daylight Remaining | `daylight` | Waypoint calculation | Calculated |
| `ph-trail-estimate` | Trail Condition Estimate | `weatherRef.current`, `weatherRef.hourly` | Waypoint calculation | Calculated |
| `ph-pack` | Pack Guidance | `weatherRef.current`, `daylight` | Waypoint calculation | Calculated |
| `ph-river` | River Level | `usgsWater` | USGS Water Services | External |
| `ph-rainfall` | Recent Rainfall | `weatherRef.hourly` | Open-Meteo | External + calculated totals |
| `ph-flood` | Flood Context | `alerts` | NOAA / NWS | External |
| `ph-birding` | Birding Conditions | `weatherRef.current`, `daylight` | Waypoint calculation | Calculated |
| `ph-wildlife-window` | Wildlife Observation Window | `daylight`, `weatherRef.current` | Waypoint calculation | Calculated |
| `ph-seasonal` | Seasonal Context | `location`, `daylight` | Waypoint calculation | Calculated |
| `ph-driving` | Driving Conditions | `weatherRef.current` | Waypoint calculation | Calculated |
| `ph-travel-window` | Outdoor Travel Window | `weatherRef.hourly`, `daylight`, `alerts` | Waypoint calculation | Calculated |
| `ph-place` | Location Summary | `location`, `elevation`, `daylight` | Open-Meteo elevation + geocode | External |
| `ph-alerts` | Active Weather Alerts | `alerts` | NOAA / NWS | External |
| `ph-risk` | Outdoor Risk Summary | `alerts`, `weatherRef.current`, `airQuality` | Waypoint calculation | Calculated |
| `ph-freeze` | Freeze or Ice Risk | `weatherRef.current`, `weatherRef.hourly` | Waypoint calculation | Calculated |

**Externally sourced:** 12 tiles read a provider value directly.
**Calculated:** 20 tiles interpret provider values; each one carries an
`Estimated` trust chip and a `basis` line naming its inputs.

### Deferred, with reasons

| Deferred | Reason |
| --- | --- |
| eBird recent sightings | No integration; would require a keyed external API and produces stale or empty results for most locations. |
| Moonrise / moonset times | Neither Open-Meteo nor NWS returns them in the packages we fetch, and we do not compute a lunar ephemeris beyond phase. |
| Dedicated visibility | No provider field; only qualitative fog/haze wording from the conditions summary, surfaced inside `ph-driving`. |
| Pollen | No dependable free source for the covered regions. |
| Smoke and wildfire impact | Requires a separate smoke model; AQI alone cannot attribute cause. |
| Aurora forecasts | Requires NOAA SWPC integration not present in the client. |
| ISS passes | Requires orbital propagation not present in the client. |
| Meteor activity | Calendar-driven content with no live source; would be editorial, not observed. |

No placeholder, simulated, disabled, or "Coming soon" entry exists for any of
these. They are simply absent.

## 4. Registry architecture

One authoritative registry, `wds-dashboard-rebuild-registry.js`, is loaded once
by `design-system/js/wds.js` and shared by both the homepage (`/`) and
`/apps/dashboard/`. Each entry carries:

```js
{
  id, title, category, libraryCategory, description,
  size: "standard" | "wide" | "featured",
  dataDependencies: [...],   // shared payload slices this tile reads
  defaultVisible,            // membership in the default dashboard
  sourceLabel,               // default attribution
  icon, defaultOrder, emptyMessage
}
```

Guarantees enforced by tests: unique IDs, unique default order, explicit
category metadata, no ambiguous `sm`/`md`/`lg`/`anchor`/`half`/`compact` values,
every entry mapping to a real payload builder, and every entry marked `live` and
`catalogAvailable`. Layout size is a registry property and never varies with
content length or data state.

## 5. Shared payload changes

`wds-dashboard-rebuild-data.js` gained a memoised `selectors(platform)` layer
that parses the OIP package **once** and hands all 32 tiles the same normalised
view: current conditions, sorted hourly rows split into past and future, daily
rows, daylight, air quality, alerts, USGS water, timezone, place, elevation,
season, and latitude. Tiles never fetch; they read.

Two correctness fixes surfaced during browser verification:

- **Attribution follows the answering provider.** The weather layer can fall
  back from Open-Meteo to NWS. Tiles now resolve their source label from
  `weatherRef.meta.provider` at render time, so a card never credits Open-Meteo
  for an NWS reading.
- **Daily high/low are labelled by value, and date-only rows keep their calendar
  weekday.** One provider publishes period pairs out of order, which rendered as
  "53° / 81°"; date-only strings also parsed as UTC midnight and shifted the
  weekday west of UTC.

### Caching, stale data, and error isolation

- Caching stays where it already lives: the OIP service and the per-provider
  services (USGS holds its own cache). The Dashboard adds no new cache layer.
- `meta.fromCache` renders a **Cached** chip instead of **Live**.
- Missing dependency ⇒ that tile alone reports `unavailable` with honest copy;
  unrelated tiles stay live. Verified by test and by a live capture with the
  air-quality provider blocked.
- `buildWidgetPayload` wraps every builder in try/catch, so a throwing provider
  degrades one tile instead of the workspace.
- Offline (`navigator.onLine === false`) renders an **Offline** chip.

## 6. Customization behaviour

The library is now a category browser rather than one flat list of 32 entries:

- Ten groups (nine categories plus Favorites), each with a title, a one-line
  description, and a live "N of M selected" count.
- **Select all** and **Clear** per category, applied in a single save.
- Individual add/remove and favorite per tile, unchanged.
- Category tabs still filter to a single group.
- Selections persist to `waypoint-dashboard-rebuild-prefs-v1` (unchanged key)
  and are de-duplicated on normalise.
- Deferred and unsupported tiles are absent from the registry, so nothing
  unsupported is selectable.
- At mobile widths the group header stacks and the bulk actions become a
  two-up grid; no horizontal overflow at 320 px.

## 7. Default dashboard

Eleven tiles spanning eight categories, a useful cross-section rather than
everything: `ph-conditions`, `ph-hourly`, `ph-golden`, `ph-sun`, `ph-air`,
`ph-hiking-window`, `ph-daylight-left`, `ph-river`, `ph-wildlife-window`,
`ph-alerts`, `ph-risk`.

## 8. Preserved layout repair

No regression to the production tile-layout repair. Mobile stays one column,
every tile spans the full mobile grid, family grids fill incomplete rows,
`standard`/`wide`/`featured` remain the only sizes, and loading and error states
use the same footprint as success (verified by comparing size-class counts
between a fully hydrated render and a platform-less render).

## 9. Files changed

| File | Change |
| --- | --- |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js` | Rewritten: 32-tile catalog, nine categories, dependency metadata, dynamic attribution, basis/interpretation rendering |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js` | Rewritten: memoised shared selectors, 32 payload builders, error containment, provider-aware source labels |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-customize.js` | Category-grouped catalog browser with counts and bulk actions |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-prefs.js` | `setCategoryEnabled`, `categorySelectedCount`, duplicate-safe normalise, corrected minimal preset |
| `design-system/css/wds-dashboard-rebuild.css` | Catalog group styles, interpretation/basis/source styles, mobile bulk-action layout |
| `index.html`, `apps/dashboard/index.html` | Cache-bust `dash-tile-layout-1` → `dash-tile-catalog-1` |
| `automation/test-dashboard-functional-tile-catalog.mjs` | New suite (177 assertions) |
| `automation/capture-dashboard-functional-tile-catalog.mjs` | New browser capture and verification |
| `automation/test-dashboard-rebuild-phase{1,2,3}.mjs`, `test-dashboard-tile-layout-repair.mjs`, `test-dashboard-mobile-tile-editing.mjs`, `test-home-rc1.mjs` | Updated to the new catalog and tile IDs |

## 10. Tests

| Suite | Assertions |
| --- | --- |
| `test-dashboard-functional-tile-catalog.mjs` (new) | 177 passed, 0 failed |
| `test-dashboard-rebuild-phase1.mjs` | 88 passed, 0 failed |
| `test-dashboard-rebuild-phase2.mjs` | 97 passed, 0 failed |
| `test-dashboard-rebuild-phase3.mjs` | 102 passed, 0 failed |
| `test-dashboard-tile-layout-repair.mjs` | 48 passed, 0 failed |
| `test-dashboard-mobile-tile-editing.mjs` | 39 passed, 0 failed |
| **Total** | **551 passed, 0 failed** |
| `capture-dashboard-functional-tile-catalog.mjs` (browser) | 0 failures, 0 console errors |

The new suite covers all 25 required areas: catalog size, nine categories,
three-plus tiles per category, unique IDs, metadata validity, component mapping,
absence of placeholder/deferred entries, shared payload reuse, zero per-tile
network requests, category grouping, per-tile toggle, select-all, clear,
persistence, default balance, loading/empty/error/stale states, dependency
isolation, mobile full-width, odd counts, long titles, route consistency, and
interpretation standards.

`test-home-rc1.mjs` still reports one pre-existing failure —
"support experiences are Home architecture", caused by residual "Coming later"
copy in `support.html`. It is a documented Sprint 6 follow-up, unrelated to this
work, and was failing before this branch.

## 11. Screenshots

All under `docs/rebuild-2026/dashboard-functional-tile-catalog/`:

- Viewports: `320x800-`, `360x800-`, `375x812-`, `390x844-`, `430x932-`,
  `768x1024-`, `1024x768-`, `1440x1000-all-tiles.png`
- `1440x1000-default.png`, `1440x1000-default-loading.png`
- `1440x1000-all-tiles.png`, `1440x1000-odd-count.png`,
  `1440x1000-one-category.png`
- `1440x1000-partial-data-failure.png`
- `1440x1000-customize.png`, `390x844-customize.png`,
  `1440x1000-customize-select-all-wildlife.png`
- Per category: `1440x1000-customize-category-{weather,photography,astronomy,air,hiking,water,wildlife,travel,safety}.png`
- `390x844-apps-dashboard.png`
- `measurements.json`, `verification.json`

## 12. Performance impact

| Metric | Before | After | Delta |
| --- | --- | --- | --- |
| Dashboard Rebuild JS + CSS (raw) | 86,150 B | 151,836 B | +65,686 B |
| Same, gzipped | 19,330 B | 32,136 B | **+12,806 B** |
| Upstream requests per page load | 1 per provider | 1 per provider | **unchanged** |
| Duplicate requests | none | none | unchanged |
| Console errors | 0 | 0 | unchanged |
| Layout shift from tiles | none observed | none observed | unchanged |

Going from 5 to 32 tiles adds about **12.5 KB gzipped** and **zero** additional
network requests, because every tile reads the one shared platform package
through a memoised selector. Tiles keep the existing lazy paint with reserved
skeleton dimensions, so the larger catalog does not change first paint or
introduce layout shift.

## 13. Known limitations

- When the weather layer answers from NWS rather than Open-Meteo, sunrise,
  sunset, cloud cover, humidity, and UV are absent, so the light, sky, UV, and
  exposure tiles correctly report unavailable. This is upstream behaviour made
  visible, not a regression — but it means a user on an NWS fallback sees more
  empty tiles than one on Open-Meteo. Worth a follow-up that computes sunrise
  and sunset locally from latitude and date so the light family never depends on
  a provider field.
- `ph-river` depends on a USGS gauge within the search radius; outside that
  radius it honestly reports no nearby gauge rather than substituting a distant
  one.
- Runoff wording in `ph-rainfall` is a qualitative estimate from forecast
  precipitation totals, not a measured discharge response.
- Moon illumination is a phase approximation, not a precise ephemeris.

## 14. Recommended next sprint

1. Compute sunrise, sunset, and twilight locally from latitude, longitude, and
   date so the Photography and Astronomy families never depend on a provider
   field that NWS does not publish.
2. Add a real river trend by requesting a short USGS time series instead of a
   single instantaneous value.
3. Resolve the pre-existing `support.html` "Coming later" copy so
   `test-home-rc1.mjs` returns to a clean pass.
4. Consider per-category collapse in the library once the catalog grows past
   about 40 entries.

---

## 15. Delivery record

- **Branch:** `feature/dashboard-functional-tile-catalog`
- **Implementation SHA:** `e7a4b15` (feature `1164abc`, tests `a178291`, docs `e7a4b15`)
- **Pre-rebase tip (integration):** `c975958`
- **Post-rebase tip:** `c975958` (already on `origin/main`)
- **Production-readiness docs SHA:** _stamped on the integration commit_
- **Merge SHA:** _stamped on merge — do not merge in this pass_
- **Production SHA:** _stamped after deploy — do not deploy in this pass_
- **Live URLs checked:** _recorded after deploy_
- **Clean-browser verification:** _recorded after deploy_
