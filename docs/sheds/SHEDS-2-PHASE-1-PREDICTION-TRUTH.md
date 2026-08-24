# Sheds 2.0 — Phase 1: Prediction Truth + Location Truth

**Owner review only — do not merge/deploy from this doc alone.**  
**Branch:** `feat/sheds-2-phase-1-prediction-truth`  
**Worktree:** `/home/bryan/projects/waypoint-scenes/.worktrees/sheds-2-phase-1-prediction-truth`  
**Base:** `origin/main` @ `88bf9c8319b9a9218b571cc26aa9373fc385d58a`  
**Companions:** [`SHEDS-2-REALITY-AUDIT.md`](./SHEDS-2-REALITY-AUDIT.md) · [`SHEDS-2-ARCHITECTURE.md`](./SHEDS-2-ARCHITECTURE.md) · [`SHEDS-2-PHASE-1-VALIDATION.json`](./SHEDS-2-PHASE-1-VALIDATION.json)

---

## Product decision (locked)

Sheds helps a shed hunter decide when a regional search season is open, where their notes and defensible habitat cues suggest walking next, and whether today’s field conditions favor searching — using separated guidance and explicit uncertainty, never a fake probability of finding an antler.

Phase 1 fixes: (1) prediction truth (2) location truth (3) explanation truth. **No GIS habitat intelligence.**

---

## Old → new

| Before (production) | After (Phase 1) |
| --- | --- |
| One blended `priority` hero (easy to read as find %) | Four channels: Timing / Habitat / Searchability / Evidence support |
| Season + weather painted into spatial heat | Habitat heat from notes (+ optional weak elev only); else empty |
| Today’s Search mixed season into window scores | Windows = searchability only; season is Timing badge |
| “Estimated opportunity” / priority bands as glance metric | Walk interest demoted; empty habitat honesty |
| Competing location concepts | Canonical `selectedLocation` SOT |
| YOU vs Next easy to confuse | Permanent YOU / TARGET labels + distinct chrome |
| Layout/timer `setView` storms | `invalidateSize` without resetView; recenter only on Locate / Recenter / Go to plan |
| Async overwrites possible | Generation tokens for locate / weather / elev / recompute |
| Confidence “High” theater | Low / Moderate / High as evidence support only; windows never High alone |

---

## Channels

### A. SHED TIMING (`sheds-timing.js`)

- Coarse regional categories: Early / Building / Peak / Late / Mostly past / Outside / Unknown.
- Photoperiod + latitude heuristic (`seasonProfile`); optional user override labeled preference.
- Weather does **not** act as cast trigger here.
- No day-level fake precision.

### B. HABITAT / WHERE TO WALK (`sheds-habitat.js` + likelihood habitat mode)

- Private observations (kernels) + optional weak elev/terrain heuristics (labeled weak).
- If neither: **“No habitat-specific guidance yet”** — blank > fake.
- Observed-only mode remains “Your observations,” not “Where sheds are.”
- Prior-find interest capped (`SHED_FIND_INTEREST_CAP = 0.35`).

### C. SEARCHABILITY (`sheds-searchability.js` + Today’s Search)

- Field conditions: precip, snowfall water-eq if known, footing/visibility heuristics, daylight.
- Answers: “Is today a good day to go search?”
- Season excluded from window scores (separate Timing channel).

### D. CONFIDENCE / EVIDENCE SUPPORT (`sheds-confidence.js`)

- Low / Moderate / High only with documented rules.
- Decreases when data missing, no habitat evidence, coarse timing, env failed.
- **Not** chance of finding a shed.

---

## Model provenance (Phase 1 inputs)

| Input | Class | Notes |
| --- | --- | --- |
| Date / DOY | SOURCE FACT | Clock/calendar |
| Latitude | SOURCE FACT | From selectedLocation / map |
| Season phase curve (peak DOY = f(lat)) | MODEL ASSUMPTION | Photoperiod literature; curve is heuristic |
| Season phase labels / windows | WAYPOINT HEURISTIC | Product categories |
| Open-Meteo temp/wind/precip/pressure/snowfall_sum | SOURCE FACT | Provider point forecast |
| Snow *depth* | — | **Unavailable** — never invented from temp/precip |
| Sunrise/sunset | SOURCE FACT | Provider daily |
| Browser geolocation | SOURCE FACT | Device GPS |
| Private observations | SOURCE FACT | localStorage |
| Observation kernels / radii / half-lives | WAYPOINT HEURISTIC | Documented in `INFLUENCE` |
| Elev samples (Open-Meteo) | SOURCE FACT | Point samples |
| Slope / aspect / morphology | WAYPOINT HEURISTIC | Finite-diff + 3×3 proxies; weak |
| BASE_SHARE weights | WAYPOINT HEURISTIC | Explicit table; not calibrated |
| Today’s Search window deltas | WAYPOINT HEURISTIC | Searchability practice |
| Evidence-support confidence blend | WAYPOINT HEURISTIC | Coverage of inputs, not find % |
| CARTO / Esri tiles | SOURCE FACT | Basemap only |

Remaining numeric weights: see `BASE_SHARE`, `WEIGHT_SCALE`, `MAX_FACTOR_FRACTION`, `SHED_FIND_INTEREST_CAP`, Today’s Search deltas in `sheds-todays-search.js`.

---

## Weather & snow roles

- Weather → **Searchability** primarily.
- Soft habitat concentration via weather multipliers **removed from habitat spatial heat**.
- No cold/snowfall-as-cast-today claims.
- Snow → searchability-first; depth unavailable; water-equivalent snowfall disclosed honestly.

---

## selectedLocation

```js
{ lat, lng, displayName?, source: 'geolocation'|'map'|..., updatedAt? }
```

- Set on successful GPS apply; weather/timing/searchability consume it (fallback: map center).
- Debug: `window.__SHEDS_LOCATION__`.

### Owner review bug — location not found (2026-08-24)

**Root cause (reproduced via CDP):**

1. **Sticky denial memory outranked live permission.** `localStorage` key `waypoint-sheds-gps-denied-v1` caused boot to skip `locateUser` entirely and show “Location off,” even when `navigator.permissions` reported `granted`. A prior deny (or failed prompt) left the flag set; later Allow did not clear it on reload.
2. **Contributing:** boot used `locateUser({ center: !Store.loadMapView() })`, so a leftover Midwest/saved view could succeed GPS without centering — YOU could sit off-screen.
3. **Contributing:** GPS error path rewrote some failures to `manual` / “Exploring the map,” which looked like intentional map-center use rather than a failed locate.

**Repair:**

- `probeGeolocationPermission()` + reconcile before honoring sticky denial (`granted`/`prompt` clears memory and locates).
- Boot always `locateUser({ center: true })` (still respects `userPanned` so manual pan is preserved).
- Honest chip copy for denied / timeout / unavailable / unsupported — never fake success via map center.
- Explicit Locate still `force: true` with `maximumAge: 0`.

### Live owner validation — location truth PASS (2026-08-24)

Owner live browser retest after the sticky-denial repair:

| Observation | Result |
| --- | --- |
| Geolocation acquired | Yes — browser-provided fix received and applied |
| Reported accuracy | Approximately **±4,753 m** (device/browser limitation) |
| General area | Correct region for the owner’s session |
| Uncertainty display | Labeled **“approximate — not precise”**; accuracy circle rendered |
| Marker semantics | Explicitly **YOU** and **not a search target** |
| Habitat channel | Remained **empty** — did not treat coarse YOU as fine-scale habitat evidence |
| Evidence support | **Low** with explicit **“(not find %)”** |

**Interpretation:** Multi-kilometer uncertainty is a property of the browser/device fix, not a Sheds processing failure. Phase 1 correctly consumed the fix, exposed uncertainty, distinguished YOU from TARGET, and refused to invent habitat precision.

**Coordinates:** Not recorded in docs (privacy). Only accuracy magnitude and honesty behavior are archived.

**Phase 1 location-truth requirement:** **PASS.**

---

## Markers (YOU vs TARGET)

| Marker | Meaning |
| --- | --- |
| YOU (lime/hollow circle + permanent tip) | User GPS / approximate GPS |
| Accuracy ring | Uncertainty — not a second “you are here” peer |
| TARGET (amber diamond + permanent tip) | Planner suggested walk — only when habitat signal exists |
| Observation letters | Private notes |

Prefer fewer markers; target cleared when no plan.

---

## Recenter policy

**Allowed:** initial GPS acquisition on boot (centers unless the user already panned this session); explicit Locate / Here / Recenter; explicit Go to plan.

**Never:** weather load, model recalc, date change, panel open/close, resize/`invalidateSize`, delayed timers, rerender, unrelated async.

If user pans/zooms: preserve viewport until explicit recenter/new locate. Layout uses `invalidateSize` without `setView`.

A prior session’s saved map view is a **fallback when GPS fails**, not a reason to skip centering on a successful initial GPS fix.

Policy mirror: `window.__SHEDS_RECENTER_POLICY__`.

---

## Async state safety

Generation tokens: `locateGen`, `weatherFetchGen`, `elevFetchGen`, `recomputeGen`. Stale responses cannot overwrite newer work.

---

## Explainability & limitations

UI channel panel includes:

- Why this timing?
- Why these search conditions?
- Habitat why (or honest empty)
- Concise limitations: no individual bucks, density, exact cast dates, presence certainty

Decision-support framing throughout.

---

## Today’s Search & planner

- Today’s Search = search conditions, not “deer more likely to drop today.”
- Planner target = guidance requiring habitat signal; else empty reason.

---

## Privacy / mobile / scope

- Local-first observations; GPS not placed in share URLs/analytics.
- Third parties documented: Open-Meteo (weather/elev), CARTO/Esri (tiles).
- Mobile priority order in field sheet: selected area → season/timing → today’s conditions → map → habitat → explanation.
- Whitetail only. No paywall / subscription.

---

## Tests

Primary suite: `automation/test-sheds-phase1-prediction-truth.mjs` — see latest run counts in owner report (includes sticky-GPS-denial regressions).

Related regressions (this worktree):

| Suite | PASS | FAIL |
| --- | ---: | ---: |
| test-sheds-phase1-prediction-truth.mjs | 68 | 0 |
| test-sheds-biological-model.mjs | 33 | 0 |
| test-sheds-planner.mjs | 41 | 0 |
| test-sheds-todays-search.mjs | 33 | 0 |
| test-sheds-observation-heat.mjs | 40 | 0 |
| test-sheds-integration-v1.1.mjs | 31 | 0 |
| test-sheds-tile-provider.mjs | 15 | 0 |
| test-sheds-map.mjs | 42 | 0 |
| test-sheds-field-ux.mjs | 33 | 0 |
| test-sheds-sprint6.mjs | 25 | 0 |
| **Total** | **361** | **0** |

---

## Real-world validation (coarse timing)

See `SHEDS-2-PHASE-1-VALIDATION.json`. Offline matrix (no live weather):

| Place | 2025-11-01 | 2026-02-10 | 2026-04-15 |
| --- | --- | --- | --- |
| Milford PA | Outside · Habitat empty · Conf Low | **Peak** · Habitat empty · Conf Low | Outside · Habitat empty · Conf Low |
| State College PA | Outside · empty · Low | **Peak** · empty · Low | Outside · empty · Low |
| Denver CO | Outside · empty · Low | **Peak** · empty · Low | Outside · empty · Low |

**Honest note:** Mid-latitude coarse photoperiod windows can report the **same Timing category** across distant US sites on the same date. That is expected for Phase 1 — not micro-regional precision. Habitat stays empty without notes. Searchability degrades honestly without weather.

---

## Local owner review

```bash
cd /home/bryan/projects/waypoint-scenes/.worktrees/sheds-2-phase-1-prediction-truth
python3 -m http.server 8080
```

Open: [http://127.0.0.1:8080/apps/shed-hunting/map/](http://127.0.0.1:8080/apps/shed-hunting/map/)

Also: [http://127.0.0.1:8080/apps/shed-hunting/](http://127.0.0.1:8080/apps/shed-hunting/)

---

## Phase 2 dependencies / readiness

Phase 1 must remain honest before GIS:

- Channel separation stays non-negotiable.
- Habitat empty state must survive GIS (GIS fills habitat; does not revive blended find %).
- Location SOT + recenter policy stay.

### Mandatory Phase 2 location gate (non-negotiable)

**Fine-scale habitat/GIS guidance requires a sufficiently precise SEARCH LOCATION.**

Do **not** assume browser YOU location is precise enough.

Phase 2 must distinguish:

| Concept | Meaning |
| --- | --- |
| **YOU LOCATION** | Device/browser estimate of the user’s position (may be multi-kilometer approximate). |
| **SEARCH LOCATION** | The specific place/area the user wants Sheds to analyze for habitat/GIS. |

These may coincide when device accuracy is sufficient, but they are **conceptually different**.

When YOU accuracy is poor, Sheds must allow the user to establish SEARCH LOCATION explicitly, for example by:

- clicking/tapping the map
- selecting a saved search area
- selecting a planner target
- entering/searching for a place if an appropriate geocoder is later adopted
- using sufficiently accurate device GPS

A multi-kilometer browser accuracy radius must **not** be used as if it identifies the exact ridge, field, forest edge, drainage, trail, road, or habitat patch the user intends to search.

Future GIS calculations must be based on **SEARCH LOCATION / SEARCH AREA**, not blindly on the center point of a coarse YOU fix.

The UI must continue exposing uncertainty rather than hiding it.

*(Phase 2 features above are documented only — not implemented in Phase 1.)*

**Verdict for Phase 2 GIS design:** Phase 1 prediction/location honesty is owner-validated. GIS may proceed only behind the YOU vs SEARCH LOCATION gate above.

---

## Phase 1 verdict

**PASS — Phase 1 complete; ready to design Phase 2** (not merged, not deployed).
