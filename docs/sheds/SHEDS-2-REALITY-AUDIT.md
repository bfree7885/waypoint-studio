# Sheds 2.0 — Reality Audit

**Audit date:** 2026-08-23  
**Production truth:** `origin/main` @ `88bf9c83`  
**Audit branch:** `docs/sheds-2-reality-audit`  
**Audit worktree:** `/home/bryan/projects/waypoint-scenes/.worktrees/sheds-2-reality-audit`  
**Scope:** Audit + architecture only. No Phase 1 implementation. No merge. No deploy.  
**Companion:** [`SHEDS-2-ARCHITECTURE.md`](./SHEDS-2-ARCHITECTURE.md)

---

## Executive verdict (owner)

**HOLD — resolve prediction truth, location truth, and explanation honesty before adding GIS intelligence.**

Sheds today is a **working local-first field map companion** with a transparent but **collapsed heuristic score**, real basemap tiles, live weather/elevation from Open-Meteo, private observations, and a planner. It is **not** a scientifically calibrated predictor of when/where antlers exist. Code often labels scores as “relative search priority / not find probability,” but UI confidence language and a single heat surface still invite over-trust. Phase 1 must separate **timing / habitat / searchability / confidence** and stop presenting one blended score as spatial intelligence.

---

## 1. What Sheds really does today

### Product surfaces (production)

| Surface | Path | Role | Classification |
| --- | --- | --- | --- |
| Marketing / entry | `/apps/shed-hunting/` | “Where should I search?” CTA → map | WORKING |
| Field map | `/apps/shed-hunting/map/` | Primary product | WORKING |
| Redirect | `/map/` (site) | Historical shorthand (per readiness docs) | WORKING (documented) |

### Owner-visible capabilities

1. **Basemap navigation** — Leaflet + vendored assets; CARTO Voyager default; Esri topo optional; OSMF public raster refused.
2. **GPS locate / track** — `getCurrentPosition` + optional `watchPosition`; denial memory; approximate styling when accuracy > 80 m.
3. **Private observations** — localStorage types (shed found, deer sign, bedding, feeding, fences, pressure, search completed, etc.).
4. **Biological heat overlay** — viewport grid scored by Whitetail Biological Model v1.1 → canvas heat.
5. **Observed-only heat** — kernels from private notes only; empty when no matching notes.
6. **Today’s Search briefing** — morning/midday/evening window scores from weather + daylight + season heuristics.
7. **Next-search planner** — picks a high-priority cell near the user; draws a labeled “Next” marker.
8. **Coverage marks / sessions / validation hooks** — local effort tracking; no learning yet.
9. **Explain sheet** — factor breakdown, taxonomy, confidence channels.

### What it does **not** do (despite UI gravity)

- Does **not** predict the probability an antler is present.
- Does **not** load land-cover / NLCD / deer density / PA wildlife GIS.
- Does **not** geocode place names (no Nominatim/Photon/search box).
- Does **not** learn from validation events (`treatAsBiologicalTruth: false`; calibration hooks only).
- Does **not** separate shed-timing vs habitat vs human searchability into distinct owner outputs.

---

## 2. Feature inventory (production classification)

Legend: **WORKING** · **PARTIAL** · **PROTOTYPE** · **PLACEHOLDER** · **STATIC** · **SYNTHETIC** · **BROKEN** · **DOCUMENTATION ONLY** · **DUPLICATED** · **LEGACY**

| Feature | Status | Evidence |
| --- | --- | --- |
| Home page CTA / identity | WORKING | `apps/shed-hunting/index.html` |
| Field map shell + sheets | WORKING | `map/index.html`, `sheds-map-app.js` |
| Basemap tiles (CARTO/Esri) | WORKING | `sheds-tile-provider.js`; map-reliability owner review |
| OSMF public tiles | LEGACY / refused | Provider refuses OSMF hosts |
| GPS locate | WORKING | `locateUser()` |
| GPS watch / track session | WORKING | `startTracking()` |
| Approximate GPS styling | WORKING | `GPS_APPROX_M = 80` |
| GPS denial memory | WORKING | `waypoint-sheds-gps-denied-v1` |
| User location marker | WORKING | `upsertUserMarker` circleMarker |
| Accuracy circle | WORKING | `L.circle` around user |
| Heading line | PARTIAL | Only when precise + heading present |
| Search-target (“Next”) marker | WORKING | `drawPlanOnMap` — distinct class/tooltip |
| Observation markers | WORKING | DivIcon letter markers |
| Coverage marks | WORKING | Session store + coverage layer |
| Track polyline | WORKING | Session path |
| Biological model scorer | WORKING (heuristic) | `sheds-biological-model.js` v1.1 |
| Likelihood grid wrapper | WORKING | `sheds-likelihood-model.js` (delegates to Bio) |
| Heat canvas overlay | WORKING | `sheds-heat-layer.js` |
| Observed heat mode | WORKING | `sheds-observation-patterns.js` |
| Elevation samples | PARTIAL | Open-Meteo elevation grid for viewport; fails → terrain unavailable |
| Slope / aspect / microform | PARTIAL / SYNTHETIC | Finite-diff + 3×3 elev hints — coarse proxies |
| Land cover | PLACEHOLDER | Catalog exists; production passes none (`Land cover: unavailable`) |
| Weather (Open-Meteo) | WORKING | Current + daily snow/sunrise/sunset; single anchor point |
| Season phase | WORKING (heuristic) | Latitude + DOY formula |
| Today’s Search windows | WORKING (heuristic) | `sheds-todays-search.js` |
| Planner recommendation | WORKING (heuristic) | `sheds-search-planner.js` |
| Model presets / weight UI | WORKING | `sheds-model-presets.js` |
| Explain / taxonomy | WORKING | Explain sheet in map-app |
| Field validation store | PROTOTYPE | Stores feedback; no model update |
| Finds store (multi-species list) | PARTIAL / LEGACY | `sheds-models.js` species list unused by Bio (whitetail-only) |
| Geocoding / place search | ABSENT | No geocoder in app |
| Photo attach | PLACEHOLDER | Deferred per readiness |
| Offline tiles pack | PARTIAL | Banner honesty; no full offline tile pack |
| ML / calibrated probability | ABSENT | Explicitly not ML |
| Stale docs claiming readiness | DOCUMENTATION ONLY / risk | `SHEDS-READINESS-ASSESSMENT.md` “closed beta” vs commercial honesty |

---

## 3. Prediction trace (every owner-visible score / label)

### 3.1 Biological heat cell `priority` (0–1) and band (`lower` / `moderate` / `higher`)

| Field | Content |
| --- | --- |
| **Inputs** | Date + lat → season; optional elev grid → slope/aspect/morphology; user observations (kernels); single weather blob; coverage marks; optional land-cover category (unused in prod); user weight prefs |
| **Formula** | Additive factor contributions = `baseShare × weightScale × score01`, capped so one factor ≤ 28% of sum; `biologicalSuitability = clamp(additive/0.85)`; then multiply search-history, weather, coverage, access; `priority = clamp(afterSearch/0.85)`; band thresholds 0.45 / 0.72 |
| **UI claim** | “Estimated opportunity / relative walk priority”; legend “Lower → higher”; plan “Priority” band |
| **Scientific support** | **PARTIAL** — season photoperiod framing has STRONG literature; winter cover / snow energy have MODERATE support; weights, ideal slope 8°, soft south-aspect bias, morphology hints, and share table are **Waypoint heuristics** |
| **Problems** | Single score collapses timing + habitat + searchability; numeric priority can be misread as probability; without elev/obs, adjacent cells are nearly identical (season-dominated) → **decorative spatial variation** |

**If an owner sees something like “0.82” or mentally maps it to “82%”:** that is a **weighted heuristic relative rank**, not a calibrated find probability. Say so explicitly in Phase 1 UI.

### 3.2 Confidence channels (`biological`, `environmentalData`, `observationDensity`, `overallRecommendation`)

| Field | Content |
| --- | --- |
| **Inputs** | Average of factor `biologicalConfidence` constants; env bits (terrain/weather/edge); observation counts |
| **Formula** | `overall = 0.34·bio + 0.28·env + 0.38·obs` (clamped), then mild penalties |
| **UI claim** | Explain sheet: “Confidence (not probability)”; optional hatch when limited |
| **Scientific support** | **WEAK** as probability; **MODERATE** as input-coverage honesty if labeled strictly |
| **Problems** | Constants (0.72, 0.55, …) are author-assigned; “High/Medium/Low” in Today’s Search is separate and also heuristic |

### 3.3 Today’s Search window score (morning / midday / evening)

| Field | Content |
| --- | --- |
| **Inputs** | Open-Meteo temp/wind/snow/precip/pressure trend; sunrise/sunset; season phase; clock proximity |
| **Formula** | Starts ~0.42; additive deltas (±0.02…0.12); clamp 0.08–0.92; bands favorable/moderate/limited/uncertain |
| **UI claim** | Best window headline; “Confidence: High/Medium/Low”; areas to favor |
| **Scientific support** | Weather facts are real; **interpretation for shed finding is mostly field heuristic / hunting practice**, not peer-reviewed shed-timing prediction |
| **Problems** | Mixing shed-season phase into a **searchability** window score; “High confidence” overstates |

### 3.4 Planner recommendation / “Next” pocket

| Field | Content |
| --- | --- |
| **Inputs** | Heat grid priorities + coverage + distance bias from user |
| **Formula** | Sort by plannerScore (= cell.priority × distanceBias × revisit tweak); skip thorough cells |
| **UI claim** | Suggested next search; walking hint with bearing/distance |
| **Scientific support** | Only as good as underlying heat — **not** independent habitat science |
| **Problems** | Marker can look like a second “you are here” if labels ignored; centers map on recommendation when “Go” pressed |

### 3.5 Coverage “X% of visible cells have some search mark”

| Field | Content |
| --- | --- |
| **Inputs** | User coverage marks vs grid cells |
| **Formula** | Simple share |
| **UI claim** | Effort coverage — not emptiness of sheds |
| **Scientific support** | N/A (honest effort metric) |
| **Problems** | Fine if labeled; do not imply biological clearance |

### 3.6 Heat opacity “42%”

UI control only — not a prediction.

---

## 4. Timing vs habitat vs searchability (critical finding)

| Question | Can current Sheds answer responsibly? | Current behavior |
| --- | --- | --- |
| **SHED TIMING** — are bucks in this region plausibly in shedding season? | **Partially** — coarse seasonal phases from date+latitude are defensible as *heuristic windows*, not day-precise forecasts | Embedded as `season_timing` share (0.18) inside the same heat score; also boosts Today’s Search windows |
| **HABITAT / SEARCH LOCATION** — where are antlers more likely to occur/be encountered? | **Weakly** — only where user logged observations + coarse elev morphology; **no** land cover/edge GIS | Blended into heat `priority` |
| **SEARCHABILITY** — how favorable is it for a human to search *now*? | **Partially** — weather/daylight/snow depth heuristics in Today’s Search; snow/cold also multiply heat | Partially duplicated into heat via weather multipliers |

**Conclusion:** Production incorrectly **collapses** three questions into one heat priority (and partially again into Today’s Search). Architecture must split them (see companion doc).

---

## 5. Biological evidence review

Sources used for this audit include model-cited agency/extension/peer-reviewed items (MU Extension G9486; NH assessment; Bubenik reviews; Armstrong 1983; Schmitz 1991; MN DNR WSI; Moen 1976; DelGiudice et al.; Peterson 2011; Pauley 1988 disagreement) plus cross-checks with university/agency shed-timing summaries. Hunting-marketing claims were not treated as primary evidence.

| Factor | Current model use | Evidence strength | Useful for | Recommendation |
| --- | --- | --- | --- | --- |
| Photoperiod / date | Season phase via DOY | **STRONG** (cycle driver) | Timing | Keep as **Timing** output only; never as find % |
| Latitude / regional window | Peak DOY = f(lat) heuristic | **MODERATE** (direction known; exact curve arbitrary) | Timing | Publish as coarse regional window + uncertainty |
| Testosterone cycle | Implied via season narrative | **STRONG** mechanism; **not measured** | Timing | Explain; do not pretend sensed |
| Nutrition / body condition | Mentioned in notes only | **MODERATE** (can advance cast) | Timing | Out of scope until herd/condition data exist |
| Winter severity / snow | Weather snowInfluence + WSI-inspired notes | **MODERATE** for movement/energy; **WEAK** as direct cast trigger | Timing (weak) + Searchability + Habitat concentration | Searchability/habitat; not fake cast date |
| Temperature | Soft cold factor ≤ −18°C; Today’s Search | **WEAK** for cast timing; **MODERATE** for search comfort/contrast | Searchability | Keep out of timing claims |
| Deer age / dominance | Not modeled | **MODERATE** literature (older often earlier) | Timing | Do not invent; optional future user note |
| Habitat / thermal cover | Only if user observations | **STRONG** winter ecology; **data missing** | Habitat | Phase 2 GIS (NLCD/conifer) — not Phase 1 fake heat |
| Elevation / slope / aspect | Map-derived when elev loads | Slope walkability **WEAK–MODERATE**; aspect **WEAK** (regional disagreement E14) | Habitat / Searchability | Soften weights; show disagreement; don’t oversell |
| Terrain microforms | 3×3 elev hints | **WEAK** | Habitat | Label as coarse proxy or gate until DEM quality justified |
| Edge / agriculture / water | Land-cover map unused | Edge concept **MODERATE**; currently **UNKNOWN** in prod | Habitat | Phase 2 |
| Deer density | Not used | **MODERATE** for encounter rate; hard to get honestly | Habitat | Do not invent |
| Human disturbance | User pressure notes | **MODERATE** for behavior | Habitat / Searchability | Keep as observed-only |
| Fence / trail crossings | User notes | **MODERATE** (site fidelity / gaps) | Habitat | Keep observed |
| Prior shed finds | Soft interest boost | **WEAK** as predictor of more finds | Habitat interest | Cap hard; never “hotspot = more antlers guaranteed” |
| Arbitrary BASE_SHARE weights | All additive factors | **UNKNOWN / heuristic** | — | Treat as product knobs; expose as such |
| Today’s Search dawn/dusk bias | +0.12 morning/evening | **WEAK** scientific; **common field practice** | Searchability | Label as searchability heuristic |

**Responsible answers to owner questions:**

12. **Can Sheds responsibly predict *when* antlers are likely shed?**  
    **Coarse regional season only** (e.g., “early/peak/late window for this latitude”) with explicit uncertainty. **Not** day-precise or percent-likely-cast-today.

13. **Can Sheds responsibly help decide *where* to search?**  
    **Yes, narrowly:** (a) user observations, (b) later real habitat GIS, (c) effort coverage so you don’t rewalk the same cell. **Not** via synthetic season-painted heat alone.

14. **Should timing, habitat, searchability be separate?**  
    **Yes — mandatory for Sheds 2.0 trust.**

---

## 6. Map truth

### Marker inventory

| Marker / graphic | Meaning | Source |
| --- | --- | --- |
| User circleMarker | You (GPS) | Browser geolocation |
| User circleMarker (hollow) | Approximate you | GPS accuracy > 80 m |
| Accuracy dashed circle | Uncertainty radius | `coords.accuracy` |
| Heading polyline | Facing direction | `coords.heading` when precise |
| “Next” search-target DivIcon | Planner suggestion | Highest plannerScore cell |
| Polyline you → Next | Walking cue | Derived |
| Observation DivIcons | Private notes | User taps / GPS pin |
| Coverage marks | Effort cells | User marks |
| Track polyline | Session path | watchPosition samples |
| Map center | View only | Pan/zoom / saved view / locate / goto-plan |
| Weather query point | Not drawn | GPS if present else map center |
| Elevation sample points | Not drawn | 18×18 (or coarse 10×10) viewport lattice |
| Neutral start | Midwest overview | `NEUTRAL {44.5,-92.5,z6}` if no saved view |
| UI `nav-dot` | Status chrome (not map) | Location state |

**No geocoder result markers** in production.

### Why the owner saw a static dot + a moving dot

Code intentionally maintains **two distinct map points** after planner runs:

1. **Moving:** user GPS marker (updates on locate/watch; jitter-filtered at 8 m).
2. **Static:** “Next” search-target marker at the recommended cell (tooltip: “Suggested next search (not your location)”).

Additional lookalikes that can read as a second “you”:

- Accuracy ring around the user (soft blue circle).
- Observation pin placed at last click / GPS.
- Historical CSS pulse class on user marker (mostly retired).

**Root cause:** dual location concepts (USER_GPS vs SEARCH_TARGET) rendered as similar-scale dots before the owner fully reads labels — not a second GPS feed. `LOCATION_KIND` comments in `sheds-map-app.js` show this was a known SOT problem.

### Why the map jumps / recenters

Documented `setView` / layout paths:

1. **Boot locate** — `locateUser({ center: !savedView })` recenters when no saved map view.
2. **Locate / Here buttons** — `center: true` → `setView(ll, max(zoom,13))`.
3. **Recenter FAB** — returns to user after pan (`followUser`).
4. **Go to plan** — `setView(recommendation, max(zoom,14))` and clears follow.
5. **forceMapLayout({ resetView: true })** — `invalidateSize` + `setView(same center/zoom)` on basemap load, ResizeObserver, delayed timers (120/480/1200/1800 ms) — can feel like a jump/flicker even when center unchanged.
6. **Drag** sets `followUser = false` (good) but later locate/plan actions recenter again.

**Do not fix in this audit** — Phase 1 should define a single location SOT and minimize automatic `setView`.

---

## 7. Heat-map truth

### How a cell gets its color

1. Viewport bounds → N×M lattice (coarse 10×10 then refine 18×18).
2. Optional elevation fetch for each cell center → slope/aspect/morphology.
3. `Biological.scoreCell` per cell with **shared** weather + **shared** season + **local** observation kernels + coverage.
4. Canvas bilinear sample of cell priorities → color wash.

### Why does this pixel differ from the next?

| Cause of adjacent-cell difference | Real? | Defensible? |
| --- | --- | --- |
| Different elev → slope/aspect/morphology | Yes, when elev succeeds | Partially (coarse DEM samples; morphology is heuristic) |
| Different distance to user observations | Yes | Yes as *user-evidence heat*, not antler census |
| Coverage penalty | Yes | Yes as effort |
| Season score | **No** (same for all cells) | Timing only — should not paint spatial heat alone |
| Weather multipliers | **No** (one regional blob) | Searchability — not micro-spatial |
| Land cover / forest edge / water / roads | **Not in production** | N/A |
| Random / noise | No | — |

**Classification:**

- With **elev + observations:** PARTIAL spatial intelligence (terrain proxies + user notes).
- With **neither:** SYNTHETIC / decorative — essentially a flat regional priority wash.
- Smooth rendering can **look** more precise than the 18×18 source grid (fake precision visually).

---

## 8. Data-source truth

| Provider | Data | Freshness | Resolution | Retrieval | Cache | Failure | Model role | Biology vs search |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CARTO | Basemap raster | CDN | Tile z/x/y | Leaflet | Browser | Honest tile status banner | Navigation | Neither (map) |
| Esri | Topo raster | CDN | Tile | Leaflet | Browser | Same | Navigation | Neither |
| Open-Meteo Elevation | Elev samples | On demand | Viewport cell centers | Chunked GET | Bounds key in memory | Terrain → unavailable/neutral | Habitat proxies | Habitat (weak) |
| Open-Meteo Forecast | Temp, wind, precip, pressure, snow, sunrise/sunset | Current + short forecast + past day | Point (~GPS or map center); refresh if moved >~0.5° | GET | In-state until move | Weather unavailable; briefing degrades | Searchability + soft heat mul | **Search** primarily; not cast trigger |
| Browser Geolocation | Lat/lng/accuracy/heading | Live | Device-dependent | get/watch | Denial flag in localStorage | Map remains usable | User marker; weather anchor; planner distance | Search logistics |
| localStorage observations/sessions/coverage/prefs/validation | User notes | Local | Point notes | Sync API | Device only | Empty features | Strongest local habitat signal | Habitat interest + effort |
| Land cover | None loaded | — | — | — | — | Explicit unavailable | Neutral edge factor | — |
| PA Game Commission / deer mgmt GIS | Not integrated | — | — | — | — | — | — | Future habitat |
| NLCD / DEM / hydro | Not integrated | — | — | — | — | — | — | Future Phase 2+ |

**Hard honesty rule:** Weather ≠ automatic shedding trigger. Production sometimes multiplies heat by snow/cold — acceptable only if framed as search/concentration heuristics, not cast prediction.

---

## 9. GIS Phase 2 feasibility (evaluate only — do not implement)

| Dataset | Class | Rationale |
| --- | --- | --- |
| NLCD / analogous land cover | **Likely useful** | Forest/shrub/ag/developed edges are core shed-search habitat structure |
| DEM (higher quality than Open-Meteo point samples) | **Likely useful** | Slope walkability, benches, drainages — with uncertainty labels |
| Slope / aspect from DEM | **Possibly useful** | Aspect has regional disagreement; use soft priors |
| Forest edge / ecotone distance | **Likely useful** | Feed–cover edges concentrate travel |
| Agriculture / food plots (land cover class) | **Possibly useful** | Winter feeding adjacency |
| Water / wetlands | **Possibly useful** | Travel edges; not “antlers in water” |
| Roads / trails / access | **Likely useful for searchability** | Access & disturbance; not cast biology |
| PA deer-management units / harvest reports | **Possibly useful** | Regional context / timing education — weak for micro-site heat |
| Deer density surfaces | **Weak / careful** | Often outdated, political, easy to overclaim |
| Pretty hillshade-only overlays | **Decorative** unless tied to scored factors |

**Gate:** No GIS in Phase 1. Phase 1 must fix truth architecture first.

---

## 10. Commercial reality

### What exists that feels “product-like”

- Real map, real GPS, real weather, private notes, explainable factors, ethics copy, local-first privacy.

### What is missing before charging is justified

1. **Honest separated outputs** (timing / habitat / searchability / confidence) — not one magic heat.
2. **No fake precision** (no High confidence that reads like certainty; no percent-like ranks without calibration).
3. **Location SOT** — one clear “you,” distinct suggestions, no surprise recenters.
4. **Habitat signal beyond user pins** *or* an explicit product promise that Sheds is a **notebook + season coach**, not GIS hunter.
5. **Field validation loop** that changes product language (even if not ML).
6. **Reliable outdoor mobile UX** soak (readiness already flags this).
7. Clear subscription value: offline packs, sync, richer regional timing, or GIS habitat — something durable beyond free Open-Meteo + Leaflet.

**Honest commercial stance today:** suitable for **closed beta / learning companion**, **not** yet subscription-worthy as “shed prediction intelligence.”

---

## 11. Branch / worktree archaeology

| Artifact | Classification | Notes |
| --- | --- | --- |
| `.worktrees/sheds-2-reality-audit` + `docs/sheds-2-reality-audit` | **KEEP/REUSE** | This audit; aligned to `origin/main` |
| `origin/fix/sheds-map-reliability` / `release/sheds-map-reliability` | **SUPERSEDED** | ahead=0 vs main — merged |
| `origin/fix/sheds-commercial-chrome-p1` | **SUPERSEDED** | ahead=0 |
| `origin/fix/sheds-board-false-positive` | **SUPERSEDED** | ahead=0 |
| `origin/adversarial/sheds-subscriber-ready` | **SUPERSEDED** | ahead=0; cold-start weather fix in main |
| `origin/feature/sheds-todays-search` | **SUPERSEDED / ARCHIVE** | Unique commit not ancestor of main, but `sheds-todays-search.js` is on main via other path — do not merge blindly |
| `origin/release/sheds-signalterrain-readiness` | **ARCHIVE** | Mixed Sheds+SignalTerrain docs; behind main |
| No Sheds Phase 1 implementation worktree found | — | Do not create one in this task |
| Stale `docs/SHEDS-*.md` sprawl | **PORT SELECTIVELY → ARCHIVE later** | Many predate v1.1 honesty; keep map-reliability folder |

**Do not merge any of the above in this task.**

---

## 12. Remove / consolidate / stop working on (recommendations only — do not delete)

1. **Stop presenting one blended heat as “opportunity %.”** Split outputs.
2. **Stop spatializing pure season/weather** when elev+obs absent — show regional timing card instead of fake micro-heat.
3. **Retire or hide numeric priority** in owner glance; prefer bands + plain language.
4. **Differentiate markers more aggressively** (iconography/size/color) — Next vs You.
5. **Reduce automatic setView storms** (layout timers + boot locate).
6. **Do not build more presets / weight knobs** until outputs are separated — more knobs ≠ more science.
7. **Do not ship land-cover “category” fakery** without real polygons.
8. **Consolidate docs** into `docs/sheds/` (this audit + architecture); mark old SHEDS_* as historical.
9. **Pause subscription / “subscriber ready” framing** until Phase 1 trust gates pass.
10. **Multi-species list in `sheds-models.js`** — either wire honestly or hide; Bio is whitetail-only.
11. **Meaningless animation** — respect reduced-motion; avoid pulse that implies live tracking when approximate.
12. **Arbitrary BASE_SHARE as “biological confidence”** — rename author confidence vs literature strength.

---

## 13. Tests & docs as evidence

Present under `automation/test-sheds-*.mjs` (biological model, map, tiles, planner, observation heat, today’s search, live weather cold start, visual board, etc.). These support **engineering regression**, not scientific calibration.

Canonical model doc: `docs/BIOLOGICAL_MODEL.md` (largely aligned with code; still embeds collapsed scoring).

---

## 14. Answers to the fifteen mission questions (short)

1. **What does Sheds do?** Local-first shed-hunting field map: notes, heuristic heat, weather briefing, next-pocket planner.  
2. **What does the score mean?** Relative walk-priority heuristic 0–1, not find probability.  
3. **Scientifically defensible?** Season mechanism yes; combined score **no** as probability.  
4. **Fake precision?** Yes — weights, morphology, smooth heat, High confidence.  
5. **Real spatial heat?** Only from elev derivatives + user notes; else synthetic.  
6. **Static + moving dots?** User GPS vs planner “Next” (plus accuracy ring).  
7. **Map jump?** Locate/boot recenter, goto-plan, layout `setView` storms.  
8. **Inputs that influence prediction?** Season, elev terrain, observations, weather, coverage, prefs.  
9. **Biologically justified?** Photoperiod season; winter cover/snow literature; user habitat notes.  
10. **Waypoint heuristics?** BASE_SHARE, slope ideal, aspect soft bias, morphology, Today’s Search deltas.  
11. **Arbitrary weights?** Yes — documented but not calibrated.  
12. **Predict when?** Only coarse regional windows.  
13. **Help where?** Narrowly via notes (+ future GIS); not season wash alone.  
14. **Separate outputs?** Yes.  
15. **Phase 1 before GIS?** Prediction truth + location truth + explanation honesty.

---

## 15. Session notes (audit process)

- Reused existing worktree `.worktrees/sheds-2-reality-audit` (branch `docs/sheds-2-reality-audit`).
- Aligned audit branch to current `origin/main` (`88bf9c83`).
- **Incident:** an early `git reset --hard origin/main` was mistakenly run against the owner’s primary `main` checkout (left `main` at `88bf9c83`, matching origin). Pre-incident tip was `e691fb40`. Uncommitted WIP copies for a few files were salvaged to `/tmp/sheds-audit-main-wip-recovery/` from Cursor local history where available. **No further main mutation** after discovery; audit writes confined to this worktree.
- No Phase 1 implementation, no merge, no deploy performed.
