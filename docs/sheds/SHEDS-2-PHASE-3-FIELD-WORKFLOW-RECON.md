# Sheds 2.0 — Phase 3 Field Workflow Reconnaissance

**Status:** Design / recon only — **do not implement yet**  
**Date:** 2026-08-24  
**Baseline:** Phase 2 commit `537d9ad852a6c53933aef5cde03be7e1498825ee` on `feat/sheds-2-phase-2-habitat-gis`  
**Inspected code:** `apps/shed-hunting/js/sheds-observation-store.js`, `sheds-session-store.js`, `sheds-observation-patterns.js`, `sheds-search-area.js`, `sheds-habitat-gis.js`, `sheds-map-app.js`, `sheds-search-planner.js`, map HTML ethics/privacy copy

---

## 1. Mission of Phase 3 (product)

Turn Sheds from “map + GIS analysis of a temporary SEARCH” into a **usable field workflow**:

1. Save and reopen **named Search Areas**  
2. Keep a private **field notebook** tied usefully to those areas  
3. Run a lightweight **Search Session** (start → observe → end → summary)  
4. Show a simple **Field Plan** before walking  
5. Keep **MODEL vs OBSERVED** visually and logically distinct  

Phase 3 is **not** more GIS layers, not denser prediction, not social/cloud.

---

## 2. What already exists (code facts)

### 2.1 SEARCH LOCATION / AREA (Phase 2 — ephemeral)

| Capability | Status |
| --- | --- |
| Tap map → SEARCH LOCATION | Yes (`state.searchLocation`) |
| Radius small/medium/large | Yes (400/600/1000 m) |
| Distinct from YOU / TARGET | Yes |
| Accuracy gate for Analyze-at-YOU | Yes (≤ 500 m) |
| GIS only inside SEARCH AREA | Yes |
| **Persist named Search Area** | **No** |
| Reopen / rename / archive | **No** |
| Link observations ↔ Search Area | **No** |

### 2.2 Observations (local-first)

**Storage:** `localStorage` key `waypoint-sheds-observations-v1`  
**Max:** 500  
**IndexedDB:** not used  
**Privacy flags:** `privacy: "private"` on records; ethics copy says GPS not in share URLs

**Types today** (`OBSERVATION_TYPES`):

| id | Label | Group |
| --- | --- | --- |
| `shed_found` | Shed found | find |
| `deer_seen` | Deer seen | wildlife |
| `deer_sign` | Deer sign | sign |
| `trail_crossing` | Trail or crossing | travel |
| `bedding_area` | Bedding area | habitat |
| `feeding_area` | Feeding area | habitat |
| `fence_crossing` | Fence crossing | travel |
| `winter_concentration` | Winter concentration area | habitat |
| `hunting_pressure` | Hunting pressure | disturbance |
| `hiking_pressure` | Hiking / recreation pressure | disturbance |
| `human_disturbance` | Other human disturbance | disturbance |
| `search_completed` | Search completed | effort |
| `access_issue` | Access issue | access |
| `habitat_note` | Habitat note | habitat |
| `other` | Other | other |

**Fields stored per observation:**

- `id`, `schemaVersion`, `type`, `speciesId` (whitetail only)  
- `location` `{ lat, lng, precision, privacy }`  
- `observedAt`, `createdAt`, `updatedAt`  
- `note`, `confidence` (`uncertain` / `probable` / `confirmed`), `quantity`  
- `details` (type-specific: shed side/freshness/collected; deer sex/class; habitat label strings)  
- `weatherSnapshot` (optional Open-Meteo snapshot at save time)  
- `photoRef` — **string reminder only** (max 240 chars); UI: “not uploaded”

**Not stored:** binary photos, EXIF blobs, cloud URLs, public share tokens.

### 2.3 Observation influence on models (today)

| Path | Behavior |
| --- | --- |
| Phase 1 Bio habitat | Observations contribute; `shed_found` capped (`SHED_FIND_INTEREST_CAP = 0.35`) + decay |
| Phase 2 Habitat GIS | `W_OBSERVED = 0.30` of score from capped `shedBoost` |
| Observed-only heat mode | Separate UI mode: heat from private notes only |
| Patterns module | Activity weights for Todays Search patterns (min 5 obs / 2 days) |
| Planner | Needs habitat signal (notes and/or GIS); coverage marks affect ranking |

**Gap:** MODEL and OBSERVED can be toggled via heat mode / compare prefs, but observations **silently** still feed Habitat GIS unless the user leaves “observed” weight in the model. There is no explicit “observations do not affect Habitat score” product control.

### 2.4 Sessions / tracking (exists, under-marketed)

**Storage:** `waypoint-sheds-sessions-v1`, `waypoint-sheds-coverage-v1`  
**UI:** Track FAB → start/end; session pill with distance; history sheet

**Session fields:**

- `id`, `status` (`active`/`ended`), `startedAt`, `endedAt`  
- `path[]` `{ lat, lng, t }` (max 4000 points; jitter &lt; 4 m ignored)  
- `distanceM`, `durationMs`  
- `observationIds[]`, `shedsFound`  
- `notes`, optional weather/model metadata snapshots  

**Coverage cells:** ~45 m buckets; levels `partial` / `thorough` / `revisit`; used by planner penalty — **not** “area empty of sheds.”

This is already a field session engine; Phase 3 should **productize and simplify** it (Start Search / End Search), not invent fitness tracking.

### 2.5 Field plan precursors

- Today’s Search channels: Timing / Searchability / Habitat / Evidence support  
- Planner TARGET when habitat exists  
- Session note field  
- Explain sheet for cells  

Missing: plan bound to a **saved** Search Area with user notes + GIS availability badge + clear “inspect these structure bands” without implying route optimization science.

### 2.6 Map view / prefs storage

| Key | Content |
| --- | --- |
| `waypoint-sheds-map-view-v1` | last center/zoom |
| `waypoint-sheds-model-prefs-v1` | heat/obs visibility, weights, compareMode |
| `waypoint-sheds-heat-ui-v1` | heatMode habitat vs observed |
| `waypoint-sheds-gis-pack-v1:*` | cached GIS packs |
| `waypoint-sheds-sgl-cache-v1` | SGL GeoJSON cache |
| `waypoint-sheds-gps-denied-v1` | sticky denial flag (reconciled with Permissions API) |
| `waypoint-sheds-ethics-seen-v1` | ethics ack |
| validation store | local validation marks |

### 2.7 Network third parties (privacy surface)

| Request | Sends | Purpose |
| --- | --- | --- |
| CARTO / Esri tiles | tile xyz (approx location) | Basemap |
| Open-Meteo forecast | lat/lng ~4 decimals | Searchability |
| Open-Meteo elevation | lat/lng grid | Legacy elev (less central when GIS pack present) |
| PASDA SGL query | bbox | Access context |
| Bundled GIS pack fetch | pack URL (no user coords in query) | Habitat |

**No IndexedDB. No cloud accounts. Export JSON is user-initiated download.**

---

## 3. Gaps for Phase 3

1. Search Areas are **session-ephemeral** — lose work when clearing SEARCH or refreshing without a save action.  
2. Observations are global device notes — **not scoped** to a Search Area (harder to reopen “last year’s north ridge”).  
3. Sessions exist but UX is “Track,” not a clear field ritual; not tied to Search Area.  
4. MODEL vs OBSERVED distinction exists technically (`heatMode`, GIS factors) but is **easy to miss** in the field.  
5. Observation types include useful categories; missing explicit **rub/scrape** (could be `deer_sign` subtypes or new ids — decide carefully).  
6. Photos are reminder strings only — correct for privacy; do not silently add uploads in Phase 3.  
7. Offline: packs/obs/sessions work; basemap/weather/SGL do not without cache.

---

## 4. Privacy audit summary

| Risk | Severity | Mitigation for Phase 3 |
| --- | --- | --- |
| Precise obs coords in localStorage | Medium (device theft / shared device) | Keep local-first; export opt-in; no URL embedding; optional future lock (out of MVP) |
| Weather/elev/tile requests leak approx location | Medium (expected for weather/map) | Disclose in ethics; allow offline/limited-data mode |
| Full GPS track in sessions | Medium | Cap points; jitter filter; disclose; never auto-share |
| photoRef free text | Low | No binary; warn users not to paste cloud photo URLs with EXIF location |
| Export JSON | Low if user-controlled | Keep private-local banner; no default cloud sync |
| SGL/cache | Low | Context only; not habitat |

**Must not store:** cloud accounts, public hotspot maps, shared links with coords, unredacted photo binaries with EXIF in MVP.

---

## 5. Offline capability matrix

| Data / feature | Offline if cached? | Notes |
| --- | --- | --- |
| Saved Search Areas (proposed) | Yes | localStorage |
| Observations / sessions / coverage | Yes | already local |
| Habitat GIS pack | Yes if previously fetched | Pike pack ~128 KB |
| Habitat bands / explain | Yes with pack + SEARCH | |
| Timing (lat rules) | Yes | no network |
| Searchability / weather | **No** (degrades) | honest unavailable |
| Basemap tiles | **Partial** | browser HTTP cache only; not guaranteed |
| SGL overlay | **Partial** | cache if previously loaded bbox |
| Planner TARGET | Yes if habitat grid available | |

---

## 6. MODEL vs OBSERVED — recon recommendation

**Recommendation:** Keep observation influence on Habitat GIS **optional and off by default for Field Plan / primary Habitat map**, with an explicit toggle:

- **MODEL (default):** NLCD + edge + slope only  
- **OBSERVED layer:** markers + optional observed-only heat  
- **Optional “Include my notes in Habitat score”:** opt-in; still capped + decayed; labeled WAYPOINT_HEURISTIC  

Rationale: Phase 2 already proved silent mixing confuses “landscape structure” with “my find hotspot.” Owner Phase 3 goal explicitly asks to compare without silently feeding every observation back into the model.

Preserve Phase 1 Bio caps if any legacy path remains; do not raise caps.

---

## 7. Defensible observation categories (Phase 3)

**Keep / emphasize:**

- shed found  
- deer sign (optional subtypes: tracks, scat, rub, scrape — as **details**, not certainty)  
- trail / crossing  
- bedding evidence  
- feeding evidence  
- fence crossing  
- habitat / field note  
- access issue  
- hunting / hiking pressure (searchability context, not habitat biology)  
- search completed (effort)  

**Handle carefully:**

- deer seen — useful notebook; not density proof  
- winter concentration — label as user judgment  
- rub/scrape — OK as **deer_sign detail**, not automatic “buck bedding hotspot”

**Do not claim:** category ⇒ high shed probability in nearby cells.

---

## 8. Search Area identity (design sketch for architecture doc)

Proposed local store: `waypoint-sheds-search-areas-v1`

Minimal record:

- `id` (uuid)  
- `name` (user string)  
- `center` `{ lat, lng }`  
- `radiusKey` / `radiusM`  
- `createdAt`, `updatedAt`, `archivedAt` null|iso  
- `mapView` optional `{ lat, lng, zoom }`  
- `gisPackId` last known covering pack or null  
- `gisStatus` cached enum: `available` | `unavailable` | `unknown`  
- `notes` short user string  
- `privacy: "private"`  

**Do not store:** predicted find %, shared public ids, other users’ data.

---

## 9. Risks if Phase 3 is done poorly

- Saved areas become “hotspot list” theater  
- Sessions become fitness gamification  
- Photos → cloud → privacy breach  
- Observations auto-paint entire GIS band as Stronger  
- Coarse GPS auto-tags precise shed finds without honesty  

---

## 10. Recon verdict (input to architecture)

**GO for Phase 3 MVP** if scoped to: Saved Search Areas + MODEL/OBSERVED clarity + productized sessions + simple Field Plan + privacy/offline honesty — **without** new GIS weights, statewide packs, sync, or social.

Companion: [`SHEDS-2-PHASE-3-ARCHITECTURE.md`](./SHEDS-2-PHASE-3-ARCHITECTURE.md)
