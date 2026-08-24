# Sheds 2.0 — Product State After Phase 3

**Date:** 2026-08-24  
**Branch:** `feat/sheds-2-phase-3-field-workflow`  
**HEAD:** `8a12d061a2aac817bec0ebe53e99c2c31433d302`  
**Tests:** 525 PASS / 0 FAIL (Phase 1+2+3 + Sheds regressions)  
**Companion:** [`SHEDS-2-PHASE-4-DIRECTION-AUDIT.md`](./SHEDS-2-PHASE-4-DIRECTION-AUDIT.md)

---

## 1. What Sheds is (plain language)

Sheds is a **private shed-hunting decision notebook** on a map. It separates **when** the regional season is open, **what the landscape looks like** inside a chosen search circle (public GIS), **whether today’s weather/footing favor going**, and **what you personally recorded** — without claiming it can predict where an antler is. You pick a Search Area, optionally save it, Start/End a search session, and keep notes on-device.

---

## 2. Committed capability stack

| Phase | Commit | Delivered |
| --- | --- | --- |
| 1 | `b38af8be` | Channel separation; no find %; YOU≠TARGET; coarse GPS honesty; empty habitat when no evidence |
| 2 | `537d9ad8` | SEARCH LOCATION/AREA; Pike/Milford NLCD+edge+slope pack; MODEL GIS; SGL context; capped obs in GIS (then Phase 3 default off) |
| 3 | `8a12d061` | Saved Search Areas; Field Plan; Start/End Search; MODEL vs OBSERVED default-off; obs↔area links |

---

## 3. Real user workflow (as implemented)

### Before leaving home

1. Open map → Locate / pan.  
2. Tap map → set **SEARCH** (or open **My Search Areas**).  
3. Expand **Today’s Search** sheet → Timing / Searchability / Habitat / Evidence.  
4. Optionally open **Tools → Field Plan** for a composed briefing.  
5. Review markers / prior notes if any.

**Friction:** Field Plan and Save Area live under **Tools** (many peers). Habitat GIS only if SEARCH is inside the Pike pack. “Model weights,” Validate, History compete for attention.

### In the field

1. Reopen saved area (SEARCH restores; YOU stays separate).  
2. **Start Search** FAB → session + optional GPS track.  
3. **Note** FAB / tap → observation form (map-tap preferred; coarse YOU blocked).  
4. Tap habitat cells → Explain.  
5. Limited-data / offline: local records + cached pack; weather/tiles/SGL degrade.

**Friction:** Dense FABs (Locate, Recenter, Zoom, Note, Search, More). Marker semantics require learning. Basemap often fails first offline, so map feels “broken” even when notebook works. MODEL vs OBSERVED toggle buried in Map & layers.

### After the search

1. **End Search** → summary (duration, distance if path, obs/shed counts).  
2. History / export JSON.  
3. Reopen area later; compare MODEL bands to markers if hunter knows where to look.

**Friction:** No first-class “what I learned here” narrative. Session summary is thin. Compare mode / include-obs are expert controls.

---

## 4. Channel model (non-negotiable)

| Channel | Meaning |
| --- | --- |
| Timing | Coarse regional season |
| Habitat MODEL | GIS landscape inside SEARCH |
| Searchability | Today’s field conditions |
| Observed | User notes (default not in MODEL score) |
| Evidence support | Input completeness — not find % |

Markers: **YOU · SEARCH · TARGET · OBS** remain distinct.

---

## 5. What is genuinely good (already real)

1. Honest uncertainty language and empty states.  
2. Explicit SEARCH ≠ YOU with accuracy gate.  
3. Real NLCD/edge/slope inside pack (not decorative heat).  
4. Private local observations + sessions + saved areas.  
5. Observation influence **defaults OFF**.  
6. Field Plan + Start/End Search give a real loop (when discovered).  
7. Strong automated regression surface (525 tests).

---

## 6. What still feels weak (by user impact)

1. **First-run comprehension** — architecture-aware UX; hunter must learn jargon.  
2. **Geographic coverage** — only Pike/Milford pack; elsewhere Habitat unavailable.  
3. **Offline map presence** — notebook works; map/weather often don’t.  
4. **Tool sprawl** — Tools sheet is a control panel, not a field ritual.  
5. **Dual briefings** — Today’s Search vs Field Plan overlap without clear hierarchy.  
6. **Expert remnants** — Model weights, Validate, diagnostic compare, multi-species stubs in `sheds-models.js`.

---

## 7. Storage / modules inventory (complexity snapshot)

**localStorage keys (active):** observations, search-areas, sessions, coverage, map-view, model-prefs, heat-ui, GIS pack cache, SGL cache, GPS denied, ethics, validation; plus legacy `waypoint-sheds-finds-v1` in `sheds-models.js`.

**JS modules:** 24 `sheds-*.js` files; `sheds-map-app.js` alone ~3.5k LOC. Parallel paths: `biological-model` + `likelihood-model` + `habitat` + `habitat-gis` + heat modes.

---

## 8. Distinctive value vs maps + weather + notes

| Need | Generic stack | Sheds today |
| --- | --- | --- |
| Season timing | Calendar / folklore | Coarse Timing channel (honest) |
| Landscape structure | Satellite eyeballing | GIS bands inside SEARCH (~30 m honesty) |
| Today go/no-go | Weather app | Searchability (when online) |
| Private notebook | Notes app | Map-linked obs + sessions + areas |
| Separated claims | Mixed in hunter’s head | Explicit MODEL vs OBSERVED |

**Honest gap:** Outside Pike pack, GIS advantage disappears. UX does not yet make the distinctive value obvious in ~30 seconds.

---

## 9. Paid value (honest)

**NOT YET.**

Credible free utility for an owner in the Pike AOI who understands the product. Not yet a paid product: thin coverage, discovery friction, and no proven field outcome study.

---

## 10. Ready for Phase 4 decision

See direction audit for candidate comparison and the single recommended Phase 4.
