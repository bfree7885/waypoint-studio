# Sheds 2.0 — Phase 4 Direction Audit

**Status:** Direction only — **do not implement Phase 4 from this document without a separate implementation brief**  
**Date:** 2026-08-24  
**Inspected:** Phase 3 HEAD `8a12d061` on `feat/sheds-2-phase-3-field-workflow`  
**Product state:** [`SHEDS-2-PRODUCT-STATE-AFTER-PHASE-3.md`](./SHEDS-2-PRODUCT-STATE-AFTER-PHASE-3.md)

Principles preserved: Timing / Habitat MODEL / Searchability / Observed / Evidence support; YOU≠SEARCH≠TARGET≠OBS; MODEL vs OBSERVED separate; obs influence default OFF; no find %; no public hotspots; local-first.

---

## 1. Product walkthrough — friction points

### Before leaving home

| Step | Works? | Friction |
| --- | --- | --- |
| Open Sheds | Yes | Ethics + many pills on first paint |
| Choose area | Yes (tap / My Areas) | Must learn SEARCH ≠ map center ≠ YOU |
| Timing | Yes | Buried until Today’s Search expanded |
| Habitat | Only in pack | Outside Pike → unavailable (honest but empty product) |
| Today’s conditions | Yes online | Fails offline with weak explanation vs Field Plan |
| Prior observations | Yes | Not surfaced as “last trip here” story |
| Field Plan | Yes | **Tools → Field Plan** — easy to miss |

### In the field

| Step | Works? | Friction |
| --- | --- | --- |
| Reopen area | Yes | Behind Tools |
| YOU vs SEARCH | Yes if trained | Visually dense; TARGET appears/disappears |
| Start Search | Yes | FAB label “Search” vs Tools “Start Search” |
| Navigate | Basemap dependent | Offline = gray tiles feel like app failure |
| Record obs / shed | Yes | Long form; many types; GPS honesty good |
| Poor network | Partial | Local data OK; weather/SGL/tiles not |
| End Search | Yes | Summary OK but not memorable |

### After

| Step | Works? | Friction |
| --- | --- | --- |
| Session review | Thin | History sheet is dump-like |
| MODEL vs OBSERVED | Technically yes | Compare / include-obs not obvious |
| Reopen later | Yes | No “what changed / what I learned” |
| Learning | Weak | Validation sheet exists but not productized as learning loop |

**Core diagnosis:** Architecture is trustworthy; **product storytelling and task hierarchy are not yet hunter-first.** Expanding GIS before fixing that multiplies a confusing surface.

---

## 2. Candidate A — Expanded PA GIS coverage

### Would it improve the product *now*?

**Mostly geographic reach, not new product depth.** For hunters already validating in Pike, statewide packs do little until UX is clear. For hunters outside the pack, Habitat is the missing table-stakes feature.

### Architecture sketch (not built)

- Keep compact JSON packs (NLCD + edgeM + slopeDeg).  
- Prefer **county or AOI tiles** (~0.5–2 MB each at current density estimates) over one statewide blob.  
- Manifest + version/sha invalidation (already patterned).  
- Download on demand when SEARCH enters uncovered bounds; cache in localStorage/IndexedDB with quota honesty.  
- NE PA (Pike/Monroe/Wayne) as first expansion band; statewide only with tiling + pack catalog UI.

**Rough sizes (order-of-magnitude @ current ~90 m cells):** Pike/Monroe ~1 MB each; Wayne ~1.5 MB; statewide naive = tens of MB → must tile.

### Estimate

| Dimension | Assessment |
| --- | --- |
| Value | High for non-Pike users; **medium for current owner loop** |
| Complexity | Medium–high (pipeline, catalog, quota, UX for missing packs) |
| Storage / download | Manageable if tiled; risky if statewide monolithic |
| Maintenance | Ongoing (NLCD year bumps, rebuilds) |
| Risk | Scope creep; localStorage quota; “more map = better sheds” misconception |

### Recommendation

**Later — after UX clarity and a small field validation.** Do not make Phase 4 “build all PA.” Optional micro-follow-on: one additional validation county pack only if Phase 4 polish proves the loop.

---

## 3. Candidate B — Offline / field resilience

### What breaks offline today

| Feature | Offline |
| --- | --- |
| App shell (if already loaded) | Usually yes |
| Saved areas / obs / sessions | Yes |
| Timing | Yes |
| Cached GIS pack + MODEL | Yes if previously fetched |
| Field Plan (local parts) | Yes |
| Basemap tiles | **Often no** |
| Weather / Searchability | **No** |
| SGL | Only if bbox cached |
| First pack download | **No** |

### Offline essential vs nice vs network-inherent

- **Essential:** shell, areas, obs, sessions, Timing, cached pack MODEL, Field Plan local sections, honest degradation copy.  
- **Nice to cache:** last-view basemap tiles, prior SGL bbox.  
- **Inherently network:** live weather, fresh tiles for new pans, first GIS pack, live SGL.

### Credible offline without enormous offline maps?

**Yes, partially:** service worker / light PWA caching of app shell + GIS packs + last N tile URLs; never promise full statewide offline imagery. Make offline mode a first-class “notebook + habitat if cached” experience so gray basemap doesn’t read as total failure.

### Estimate

| Dimension | Assessment |
| --- | --- |
| Value | High in real woods; medium until UX hierarchy fixed |
| Complexity | Medium (SW/PWA, cache policy, quota, testing) |
| Maintenance | Medium (cache busting with releases) |
| Risk | Over-promising “offline maps”; storage bloat |

### Recommendation

**Strong Phase 5 candidate** after hunters can find Field Plan / Start Search without training. Include **copy + limited-data UX** improvements inside Phase 4 polish without full PWA.

---

## 4. Candidate C — Validation + UX polish

### Can a new user answer the six questions in ~30 seconds today?

| Question | Today |
| --- | --- |
| Reasonable time of year? | Only after expanding Today’s Search |
| Where am I planning to search? | After learning to tap SEARCH / open area |
| What does landscape suggest? | Only inside Pike pack + after SEARCH |
| Today’s conditions? | Same sheet; needs network |
| What have I observed here? | Not summarized on primary surface |
| What should I do next? | Split across TARGET / Field Plan / FABs |

**Verdict:** Technically correct features are **practically confusing**. Highest user impact fix.

### Polish themes (design-only here)

1. One primary “Trip” surface: Timing · Habitat MODEL · Searchability · Observed · Next action.  
2. Promote Save / Open Area / Field Plan / Start Search; demote Model weights / Validate / Export.  
3. Stronger marker legend (YOU / SEARCH / TARGET / OBS) always visible when relevant.  
4. First-run 3-step coach (tap SEARCH → save → Start Search) — not architecture lecture.  
5. Empty/offline/GPS states in hunter language.  
6. Mobile one-thumb: fewer FABs; Field Plan reachable without hunting Tools.

### Estimate

| Dimension | Assessment |
| --- | --- |
| Value | **Highest now** |
| Complexity | Medium (UX + copy; avoid big refactors) |
| Maintenance | Lower if it deletes/hides expert chrome |
| Risk | Low if no new scoring/GIS |

### Recommendation

**PRIMARY PHASE 4.**

---

## 5. Candidate D — Real-world validation

### Purpose

Prove **decision support usefulness**, not antler prediction.

### Protocol sketch (do not conduct in this audit)

**Sites:** Pike AOI (pack coverage) + at least one “unavailable GIS” site for honesty.  
**Sessions:** ≥5 half-day walks; record plan before leaving; photos of landscape (optional private).  
**Measures (non-find-centric):**

- Did Timing match hunter’s sense of season?  
- Did MODEL structure match what they walked (forest/edge/slope)?  
- Did Searchability change go/no-go?  
- Did they walk different places because of inspect suggestions?  
- Time to plan (minutes before/after Sheds)?  
- Could they explain MODEL vs OBSERVED?  
- Usefulness when zero sheds found (Likert)?  
- Friction list (free text).

**Do not** use shed count as primary KPI. Sheds found are optional secondary anecdotes only.

### Estimate

| Dimension | Assessment |
| --- | --- |
| Value | High for product truth; needs usable UX to avoid false negatives |
| Complexity | Low–medium (protocol + logging; mostly human time) |
| Risk | Bias if only inventor tests; weather/season confounds |

### Recommendation

**Run as acceptance gate inside/after Phase 4 polish**, not as a standalone engineering phase that freezes the confusing UI. Pure “D-only” Phase 4 risks validating the wrong surface.

---

## 6. Candidate E — Additional intelligence

### Potentially defensible later

- Trails/roads as **Searchability / access** (never Habitat weight).  
- Hydrology / wetness as structure context (careful wording).  
- Agriculture adjacency as edge-like structure (if from NLCD already partial).  
- Snow as Searchability (already weather-ish).  
- Stronger public-land **context** (not habitat score).

### Reject

Deer density / WMU pop heat, cast-date precision, find %, NDVI theater, AI hotspotting, multi-species expansion, decorative layers.

### Estimate

| Dimension | Assessment |
| --- | --- |
| Value | Low–medium until coverage + UX mature |
| Complexity | Medium–high per layer |
| Risk | Fake-science creep |

### Recommendation

**Defer.** No Phase 4 intelligence expansion.

---

## 7. Subscription / product value check

**Distinctive today:** honest separated channels + private map notebook + real landscape structure (in-pack) with MODEL≠OBSERVED.

**Not distinctive yet:** coverage, first-run clarity, offline map presence, proven field outcome.

**Would you pay for current version?** **NOT YET.**

**Free utility:** Timing + private notes + (in-pack) structure for owners who already know the product.

**Potential paid value (future):** reliable PA packs + polished trip workflow + credible offline notebook — still without find %. Subscription only if that bundle is consistently useful; do not invent paywall now.

---

## 8. Product complexity — remove/simplify later (do not delete in this audit)

| Item | Issue |
| --- | --- |
| `sheds-models.js` multi-species + `finds-v1` | Conflicts with whitetail-only product |
| Exposed **Model weights** UI | Expert; undermines “honest simple channels” |
| `biological-model` + `likelihood-model` + legacy elev heat path | Layered under GIS; hard to explain |
| Today’s Search **and** Field Plan | Overlapping briefings |
| Validate sheet | Engineering-facing; not hunter learning loop |
| Diagnostic compare / many heat modes | Power-user density |
| Tools grid (~12 actions) | Button farm |
| `sheds-map-app.js` ~3.5k LOC | God-module; future split after UX settles |

**Recommend (later):** hide/retire expert chrome; merge briefings; keep one Habitat path (GIS-first); archive multi-species stubs.

---

## 9. Phase 4 recommendation (single primary)

### Choice

**PHASE 4: VALIDATION + UX POLISH**

### Why highest value *now*

Phases 1–3 built a trustworthy engine. The bottleneck is **comprehension and field ritual**, not missing prediction. Expanding GIS or heavy offline before hunters can answer the six questions in 30 seconds wastes engineering and risks validating the wrong product. Polish + a lightweight real-world protocol compounds every later investment.

### Phase 4 objective

Make Sheds **understandable and usable in the field** with the current Pike pack, and gather structured evidence that the loop improves planning decisions — without new GIS layers, new weights, or find %.

### User-visible result

A hunter can open Sheds and, without architecture training, see: season → Search Area → landscape MODEL → today’s conditions → my notes → Start Search — and complete a trip with clear End summary and MODEL vs OBSERVED clarity.

### Exact MVP (when implemented later)

1. Trip-first UI hierarchy (promote Field Plan / Areas / Start Search; demote expert tools).  
2. Always-visible marker legend when relevant.  
3. First-run coach (3 steps).  
4. Stronger empty / offline / coarse GPS language.  
5. Observed summary on primary trip surface for active area.  
6. Optional: hide Model weights / Validate behind “Advanced”.  
7. Lightweight field validation checklist + log format (owner/protocol).  
8. Tests for UI/copy contracts + regressions; **no** new habitat weights.

### Phase 4 will NOT build

Expanded PA packs; PWA full offline maps; new intelligence layers; subscriptions; social; density; AI; multi-species; find %; route optimization; photo vault; Phase 5 scope.

### Acceptance gate

- New-user timed walkthrough: 6 questions answerable in ≤30–60s on mobile.  
- Owner completes ≥3 real walks with protocol log; MODEL structure judged reasonable; usefulness rated without requiring sheds found.  
- Phase 1–3 suites still green; no architecture regressions.

---

## 10. What comes later (order)

1. **Offline / field resilience** (essential cache + honest offline mode; limited tiles).  
2. **Expanded PA GIS** (NE counties → tiled statewide catalog).  
3. **Real-world validation scale-up** (more sites/users) once UX stable.  
4. **Additional intelligence** only if field evidence demands a specific gap (access/trails first).

---

## 11. Product verdict

**CONTINUE** — Sheds has a credible product direction (honest decision support + private notebook + real landscape structure). It does **not** need a rethink; it needs to become obviously usable and then prove field value before more GIS.

---

## 12. Phase 4 verdict line

**PHASE 4: VALIDATION + UX POLISH**
