# Minimum Acceptable V1 Review — Waypoint Studio

**Date:** July 2026  
**Reviewer scope:** Read-only audit against the defined V1 bar  
**V1 definition:** *A working outdoor dashboard for **any location in the United States**.*

**Method:** Code and content inspection of location resolution, OIP/weather pipelines, dashboard catalog, regional bundles, and UI labeling. No runtime changes were made for this review.

**Verdict preview:** **Does not meet minimum acceptable V1** under a strict reading. Live weather and astronomy at user coordinates work nationally; regional intelligence, county resolution, and most non-weather widgets do not.

---

## Executive summary

Waypoint Studio today is a **Pike County Preview dashboard** with **national live weather** layered on top. Browser geolocation returns real latitude/longitude and Open-Meteo serves arbitrary U.S. coordinates well. Everything else — county naming, phenology, species, trails, water, conservation copy, morning-brief “watch for” cues — is sourced from a **single editorial bundle** (`pike-county-pa.json`) mapped through **10 indexed counties** in PA, NJ, and NY.

For ~99% of U.S. locations, the app assigns a **wrong county name**, loads **Pocono/Delaware River editorial content**, and presents it under a header that implies local relevance. That fails the honesty requirement implicit in “working dashboard for any U.S. location.”

---

## 1. Location detection

| Aspect | Current behavior | V1 gap |
|--------|------------------|--------|
| Browser geolocation | Supported via `navigator.geolocation` in `wds-location.js` | OK |
| Stored preference | `localStorage` key `wds-location-v1` persists choice | OK |
| Initial prompt | Modal: “Use my location”, default region button, county search | OK for UX; limited geography |
| Coordinate capture | Real `lat`/`lng` stored on geo success | OK |
| County assignment | **Always** `nearestRegion()` over **10 fixed counties** in `regions-index.json` | **Critical gap** — no U.S.-wide county lookup |
| Distance awareness | `distanceKm` computed and shown when geo source | Shown but **no threshold** to reject bad matches |
| US boundary check | None — coordinates outside the U.S. would still resolve | Minor for V1 (U.S.-only scope) |

**Finding:** Geolocation detects coordinates correctly but **mislabels** them as the nearest indexed county, even when that county is hundreds or thousands of kilometers away.

---

## 2. Manual location entry

| Aspect | Current behavior | V1 gap |
|--------|------------------|--------|
| UI | County search with `<datalist>` on boot prompt and location bar | OK |
| Search logic | `searchRegions()` — exact/partial match against **10 indexed counties only** | **Critical gap** |
| Unknown county | “County not found — try Monroe County, PA or use your location.” | Fails for almost all U.S. counties |
| Coordinate entry | **Not supported** — no lat/lng or ZIP input | Gap |
| State-only selection | **Not supported** | Gap |

**Finding:** Manual entry works only for the 10 counties in `regions-index.json`. A user in Portland, Maine; Denver, Colorado; or Miami, Florida **cannot set their location** except via geolocation (which still misassigns county).

---

## 3. County / state resolution

| Component | Behavior |
|-----------|----------|
| `regions-index.json` | 10 regions; `defaultRegionId`: `pike-county-pa`; **all** `contentBundle` values point to `pike-county-pa` |
| Content bundles on disk | **One file:** `design-system/content-engine/regions/pike-county-pa.json` |
| `lookupCounty()` | Delegates to same 10-county search — not a national county database |
| `resolveFromCoords()` | Nearest of 10 counties by haversine distance; actual coords preserved |
| `applyToBundle()` | Rewrites bundle `region.name` / state to selected county; **does not change species, trails, or phenology text** |
| OIP `buildFromLocation()` | Uses county name, bioregion, elevation from **matched indexed county**, not reverse geocoding |

**Finding:** There is **no real county/state resolution** for arbitrary U.S. points. There is **nearest-preview-county** resolution against a Pike-centric index.

---

## 4. Incorrect fallback to Pike County

| Trigger | Falls back to Pike? | Honest? |
|---------|---------------------|---------|
| User clicks “Use Pike County, PA” (default button) | Yes — explicit | Yes |
| Bootstrap / index load failure | `defaultState()` → Pike | Acceptable with error context |
| Geolocation denied on retry | `requestGeolocationAndSave` catch → `defaultState()` + `geoDenied` | **Risky** — silently stores Pike as location |
| Geo success outside indexed area | Nearest indexed county + Pike bundle; coords stay real | **Misleading** — wrong county label |
| Manual search miss | No change / error message | OK |
| `home-boot.js` catch path | `defaultState(index)` | Falls back to Pike on location bootstrap failure |

**Finding:** Pike is the **only** content bundle and the **default region**. Fallback to Pike on errors is understandable; assigning a **random northeastern county name** to a Florida user while loading Pike editorial is **not** an acceptable “national” fallback.

The bundle itself discloses this (`platformScope.detail`: *“Locations outside this bundle may show nearest editorial content”*), but **`renderPlatformScope()` is only used in legacy `renderHomeHero`**, not in the default `renderOutdoorDashboard` path. Most users never see that disclaimer on the live homepage.

---

## 5. Weather API behavior for arbitrary U.S. coordinates

| Aspect | Status |
|--------|--------|
| Provider | Open-Meteo (`home-boot.js`: `provider: "open-meteo"`, `fallback: false`) |
| Coordinate source | User `lat`/`lng` from location state — **not** county centroid when geo succeeds |
| Coverage | Open-Meteo serves continental U.S., Alaska, Hawaii, and territories |
| Data returned | Current, hourly, daily, UV, wind, precip, WMO codes |
| Failure mode | No placeholder fallback on homepage — widgets may error or show educational panels |
| Editorial weather in index | Static strings in `regions-index.json` used only when live path unavailable |

**Finding:** **Weather is the strongest nationally working layer.** It genuinely adapts to user coordinates anywhere Open-Meteo reaches.

**Caveat:** `fallback: false` means offline or API failure produces errors rather than a calm degraded state — reliability issue, not geography issue.

---

## 6. Sunrise / sunset behavior

| Aspect | Status |
|--------|--------|
| Primary source | Open-Meteo daily `sunrise` / `sunset` at request coordinates |
| Enrichment | `wds-daylight-utils.js` → `enrichFromWeather()` computes golden hour, blue hour, twilight, day length |
| Fallback | Editorial times from Pike bundle if weather package is placeholder |
| Timezone | Open-Meteo `timezone: auto` |

**Finding:** **Live and location-correct** when Open-Meteo succeeds. This meets V1 for sun times nationally.

**Caveat:** Twilight offset math uses latitude heuristics (`twilightOffsets`) — acceptable approximation, not astronomical-grade polar-edge modeling for far-north Alaska.

---

## 7. Moon / astronomy behavior

| Aspect | Status |
|--------|--------|
| Moon phase | Open-Meteo daily `moon_phase`, `moonrise`, `moonset` when live |
| Fallback phase | `moonPhaseFromDate()` local calculation if no daily row |
| Sky / photo widgets | `wds-sky-dashboard-intel.js` — sunrise/sunset quality from live weather + daylight |
| Milky Way / aurora | Explicitly “coming soon” / no provider |

**Finding:** **Moon and sun widgets are nationally viable** on live weather path. Advanced astronomy (aurora, Milky Way forecasts) is correctly deferred.

---

## 8. Wildlife content outside Pike County

| Aspect | Status |
|--------|--------|
| Data source | Pike bundle `seasonalWatch`, `thisWeekOutdoors`, regional field notes |
| Intelligence layer | `wds-wildlife-dashboard-intel.js` — season/month heuristics + Pike species lists |
| Live connection | eBird migration marked `futureProvider` — not connected |
| Labeling | Cards show “Educational” / “Expected” / “Regional intelligence”; footer cites region label |
| Outside Pike | Same black bear, warbler, morel, laurel narratives regardless of user state |

**Finding:** **Not location-valid outside the Pike bioregion.** A Florida user may see “Late warblers along Delaware Water Gap” and “Yellow morel below 1,200 ft” in morning brief `lookFor` and species widgets. Tags say editorial/educational in places, but **content is actively misleading** when paired with a non-Pike header.

---

## 9. Plant / foraging content outside Pike County

| Aspect | Status |
|--------|--------|
| Data source | Pike bundle phenology, ForageCast preview blocks, species records |
| Widgets | Flora and foraging dashboard intel read `platform.species` / `platform.phenology` from Pike bundle |
| Live connection | No live fruiting/habitat API |
| Educational fallback | Generic foraging/flora panels when mount fails — **location-agnostic** (good) |
| Default path | Editorial Pike species (morel, laurel, chanterelle timing) with county label swapped |

**Finding:** **Fails V1 outside Pike.** Tropical or desert foraging context is absent; northeastern species timing is presented as regional intelligence.

---

## 10. Trail / water / safety behavior outside Pike County

### Trails (`wds-trail-dashboard-intel.js`)
- Mixes **live weather** (mud, rain impact) with **Pike editorial** (DWGNRA, Pawling/Milford climbs, Delaware ravines).
- Park alerts, closures, parking — editorial or “no live feed” slots.
- **Weather-derived trail cues work nationally; named trails and closures do not.**

### Water (`wds-water-dashboard-intel.js`)
- USGS gauge registry defined but **not connected** — “No live gauge connected” everywhere.
- Watershed names from Pike bundle (Delaware, Lackawaxen, Wallenpaupack).
- Rain/flood hints partially use live precip when available.

### Safety (`wds-safety-dashboard-intel.js`)
- **Heat, storm, UV** — live from Open-Meteo → **works nationally**.
- **Ticks** — month-based heuristics biased to northeastern season (“April through October”) — weak for Gulf Coast / mild climates.
- Air quality, fire danger — pending providers.

**Finding:** Safety and trail **weather-linked** widgets partially meet V1. **Named-place editorial** (DWGNRA, Delaware River gauges) fails nationally.

---

## 11. Educational fallback behavior outside Pike County

| Aspect | Status |
|--------|--------|
| Module | `wds-educational-fallback.js` — generic, topic-based panels |
| Labeling | “Educational · not live data” badge; widget tags → “Educational” |
| Trigger | Widget mount failure, missing intel, preview stubs |
| Geography | **Location-agnostic** — same copy nationwide |

**Finding:** Educational fallbacks **do meet** the “teach instead of fail” philosophy and are safe anywhere. They are **not the default** for most widgets when Pike bundle loads successfully — editorial Pike content shows instead.

---

## 12. Broken links outside Pike County

| Area | Status |
|------|--------|
| Homepage top nav hashes | Fixed in Phase 1 — `#outdoor-dashboard`, section IDs resolve |
| ForageCast / Fieldry entry | Load; content remains Pike-scoped |
| Species profile hard link | `profile.html?id=morchella-americana` — works; species is northeastern |
| In-content references | DWGNRA, Matamoras, Milford — valid URLs conceptually but **irrelevant** outside region |
| Raw `.md` links | Largely cleaned in Phase 1 |

**Finding:** **Navigation links are not broken**, but **semantic links** (trail alerts, conservation projects, species profiles) point to **Pike/Delaware River context** that is wrong for most U.S. users — a trust problem, not a 404 problem.

---

## 13. Mobile usability for field use

| Aspect | Status |
|--------|--------|
| Touch targets | Phase 1 pass — 44px on primary dashboard controls and top nav |
| Top nav | Horizontal scroll on narrow viewports — usable |
| Cold load | ~67 sequential scripts, ~698 KB JS — slow on mobile networks (`PERFORMANCE_BASELINE.md`) |
| Offline | Boot error or educational panels; no service worker |
| Location prompt | Modal works on mobile; county datalist awkward for long lists (only 10 options today) |
| Customize panel | Dialog, toggles, drag — functional |

**Finding:** **Usable but not field-optimized** for national V1. Performance and slow boot undermine “open every morning anywhere.” Touch target work helps; loader weight does not.

---

## 14. What data is truly live

| Domain | Live source | National? |
|--------|-------------|-----------|
| Current temperature, feels-like, humidity | Open-Meteo | Yes |
| Hourly / 7-day forecast | Open-Meteo | Yes |
| Wind, gusts, precip probability | Open-Meteo | Yes |
| UV index | Open-Meteo | Yes |
| Sunrise, sunset, moonrise, moonset, moon phase | Open-Meteo | Yes |
| Morning brief go/caution/wait (weather-driven) | Derived from live wx | Yes |
| Hiking comfort / outdoor weather intel | Derived from live wx | Mostly yes |
| Sky photo conditions (cloud, fog hints) | Derived from live wx + daylight | Mostly yes |
| Heat / storm / UV safety cards | Derived from live wx | Yes |
| Trail mud / rain impact (partial) | Live wx + editorial | Partial |
| eBird migration | Not connected | No |
| USGS water gauges | Not connected | No |
| NWS alerts (in-app) | Not connected | No |
| Air quality / fire danger | Not connected | No |
| Tick model | Heuristic, not live API | No |

**Live share of ~69 catalog widgets:** Majority of **conditions / sun-moon / safety** widgets can show live data. Most **wildlife, foraging, flora, water, trails, conservation** widgets are editorial or educational.

---

## 15. What data is editorial

| Source | Scope |
|--------|-------|
| `pike-county-pa.json` | Single Pike County / Pocono narrative |
| `regions-index.json` weather strings | Per indexed county — **not live**; superseded when Open-Meteo loads |
| Species watch lists, happening now, weekend prompts | Pike phenology |
| Conservation update | DWGNRA / Delaware River project |
| Regional field notes, teachers notebook (partially unrendered) | Pike |
| Trail/park named references | Northeastern PA / DWGNRA |
| Watershed names | Delaware River basin |
| Elevation / bioregion on location state | From **nearest indexed county**, not user terrain |
| Wildlife/foraging/flora dashboard cards | Pike species embedded in intel builders |

**Editorial content is high quality for Pike Preview but is incorrectly scoped** when `applyToBundle` renames the region to the user’s pseudo-county.

---

## 16. What data is educational fallback

| Source | When shown |
|--------|------------|
| `wds-educational-fallback.js` topic panels | Widget empty, error, or stub paths |
| Generic safety/tick copy | When live wx insufficient |
| “Educational” widget tags | Placeholder catalog paths |
| Integrity footnotes | Some domain UIs |

Educational fallback is **honest and national** but is **secondary** to Pike editorial when the bundle loads.

---

## 17. What could mislead a user

1. **Dashboard H1 shows wrong county** — e.g. “Orange County, NY” for a user in Miami with ~2,000 km distance buried in subtext.
2. **Morning brief “Watch for Mountain laurel / Yellow morel”** — driven by Pike `platform.species` even when live weather is Floridian.
3. **“Good day to go outside”** reads as locally authoritative while species cues are northeastern.
4. **Missing `platformScope` banner** on default dashboard — disclosure exists in JSON but is not rendered on the hot path.
5. **`usingNearestBundle` note** appears for non-Pike indexed counties but does not say “content is Pike County, PA.”
6. **Elevation and bioregion** from nearest indexed county — wrong for Rocky Mountains, coasts, etc.
7. **Trail/conservation widgets** name DWGNRA and Delaware River projects as if local.
8. **ForageCast / species links** deep-link to Pike-scoped species profiles.
9. **Geo denial silently stores Pike** as the active region in localStorage.
10. **Widget tags inconsistently** — some domains mark “Regional” or “Live” when only weather is live.

---

## 18. State-by-state failure analysis

Assumptions: user allows geolocation; Open-Meteo reachable; default Morning dashboard preset.

### Maine
- **Manual entry:** Fails (no Maine counties indexed).
- **Geo:** Nearest indexed county likely Sullivan County, NY or Wayne County, PA (~400–600 km). Pike editorial. Live wx/sun/moon for actual Maine coords: **OK**.
- **Misleading:** High — boreal/coastal phenology absent; tick/heuristic seasons wrong for northern Maine timing.

### New York
- **Manual entry:** Works only for Sullivan and Orange counties.
- **Geo (NYC):** Nearest indexed county; Pike editorial; live wx for NYC: **OK**.
- **Geo (Adirondacks / Buffalo):** Wrong county assignment; Pike editorial.
- **Misleading:** Moderate in indexed counties; high elsewhere.

### Pennsylvania
- **Manual entry:** 7 of 67 counties supported (Pike, Monroe, Wayne, Lackawanna, Susquehanna, Carbon, Northampton).
- **Geo (Philadelphia / Pittsburgh):** Nearest indexed county; still Pike bundle for all.
- **Live wx:** OK statewide.
- **Misleading:** Lower for supported counties (closer geography) but **still Pike narrative** for all — Monroe does not get Monroe content.

### Florida
- **Manual entry:** Fails.
- **Geo:** Nearest indexed county ~1,200–1,800 km away (PA/NY). Absurd distance shown in bar if user reads it.
- **Live wx / sun / moon:** OK for Florida coords.
- **Species/trails/foraging:** Pike morels, laurel, black bear campgrounds, DWGNRA — **severely misleading**.

### Colorado
- **Manual entry:** Fails.
- **Geo:** Same nearest-county problem; elevation from wrong county (e.g. ~500–1,400 ft indexed vs 5,000+ ft actual).
- **Live wx:** OK.
- **Alpine/desert context:** Absent; northeastern forest editorial — **misleading**.

### California
- **Manual entry:** Fails.
- **Geo:** Nearest eastern county thousands of km away.
- **Live wx:** OK (coastal fog, heat, fire weather not in editorial layers).
- **Chaparral / Mediterranean phenology:** Absent — **misleading**.

### Alaska
- **Manual entry:** Fails.
- **Geo:** Nearest indexed county in PA/NY — nonsensical label.
- **Live wx / sun:** Open-Meteo supports Alaska; long summer daylight largely correct.
- **Polar twilight edge cases:** Approximate only.
- **Arctic/subarctic ecology:** Absent — **misleading** for regional widgets; weather layer still useful.

### Hawaii
- **Manual entry:** Fails.
- **Geo:** Nearest mainland county ~4,000+ km away.
- **Live wx / sun:** Open-Meteo supports Hawaii.
- **Tropical ecology vs temperate Pike copy:** **Maximum mismatch** — editorial layer is harmful if read as local.

---

## Final answers

### 1. Does Waypoint Studio currently meet minimum acceptable V1?

**No.**

It meets V1 only for a **narrow subset**: live weather, sun/moon times, and weather-derived safety/brief widgets at real U.S. coordinates. It does **not** meet V1 for **county resolution**, **honest regional labeling**, or **non-misleading outdoor intelligence** outside the Pike preview footprint.

---

### 2. If not, what exactly blocks it?

| Blocker | Severity |
|---------|----------|
| **Only 10 counties indexed; no U.S.-wide county or coordinate labeling** | Critical |
| **Single content bundle (`pike-county-pa`) for all locations** | Critical |
| **`nearestRegion()` assigns wrong county with no distance cutoff** | Critical |
| **Editorial Pike content rendered under swapped county names** | Critical |
| **`platformScope` disclaimer not on default dashboard** | High |
| **Morning brief and species widgets pull Pike phenology regardless of coords** | High |
| **Manual location impossible for most U.S. counties** | High |
| **Geo failure silently persists Pike as user location** | Medium |
| **Mobile cold-load performance** (trust/speed, not geography) | Medium |

---

### 3. What are the smallest tasks required to reach V1?

Ordered for minimum scope — no redesign, no new apps:

1. **National coordinate mode** — When `distanceKm` to nearest indexed county exceeds a threshold (e.g. 80 km), stop assigning a fake county name; show coordinates or “Your location” + state if derivable; set `contentBundle` to none or `national-educational`.
2. **Dashboard scope banner on hot path** — Render `platformScope` (or stronger copy) in `renderOutdoorDashboard` whenever editorial bundle ≠ user location.
3. **Suppress Pike-specific editorial outside bundle** — If not in supported region, force wildlife/foraging/flora/trails/water/conservation widgets to **educational fallback only** (already built).
4. **Fix morning brief `lookFor`** — Do not cite Pike `platform.species` when location is out-of-bundle; use generic or weather-only cues.
5. **US-wide manual location minimum** — At least: free-text state picker + “use my location”, or ZIP → lat/lng (single free geocoder), or expanded county index with honest “educational only” labeling for counties without bundles.
6. **Geo-deny path** — Do not write Pike to localStorage without explicit user consent; show educational national dashboard instead.
7. **Tag audit** — Ensure widgets outside live domains show **Educational**, never **Regional** or implied local live, when Pike bundle is active out-of-area.

*Optional for “working” but not strictly required for honest V1:* performance R1/R2 loader trim (already documented).

---

### 4. What is the highest-priority fix?

**Stop misrepresenting location and regional intelligence outside the supported bundle.**

Concretely: implement **distance-threshold coordinate mode** + **suppress Pike editorial widgets out-of-area** + **visible scope banner on the default dashboard**. Without this, national live weather is undermined by false local narratives — the single worst trust failure for V1.

---

### 5. What should absolutely wait until after V1?

| Defer | Reason |
|-------|--------|
| Second/regional content bundles (Monroe, Wayne, etc.) | Phase 2; not required if educational national mode is honest |
| eBird, USGS, NWS live adapters | Phase 2 live domains |
| 65-script loader rewrite / bundling | Performance; dashboard works without it |
| ForageCast prediction engine expansion | Separate instrument |
| Fieldry / accounts / cloud sync | Post–Phase 4 |
| Photography coach / Scenes product direction | Phase 5 |
| Full U.S. county bundle library | Long-term; V1 needs honesty first, not coverage |
| Tick/air-quality/fire live providers | Enhance safety after core location honesty |
| Redesign, new apps, branding changes | Explicitly out of scope |

---

## Appendix — key files reviewed

| File | Relevance |
|------|-----------|
| `design-system/js/wds-location.js` | Geolocation, nearest county, manual search |
| `design-system/content-engine/regions-index.json` | 10-county index, all → Pike bundle |
| `design-system/content-engine/regions/pike-county-pa.json` | Sole editorial source |
| `design-system/js/weather/wds-weather-providers.js` | Open-Meteo global fetch |
| `design-system/js/weather/wds-daylight-utils.js` | Sun/moon enrichment |
| `design-system/js/wds-content-engine.js` | Dashboard render path; scope banner gap |
| `design-system/js/dashboard/wds-dashboard-brief.js` | Pike species in `lookFor` |
| `design-system/js/dashboard/wds-educational-fallback.js` | National-safe fallback |
| `design-system/js/outdoor-intelligence/wds-oip-sources.js` | Bundle → platform merge |
| `js/home-boot.js` | Weather config, boot fallback |

---

*This document is audit-only. No repository files were modified.*
