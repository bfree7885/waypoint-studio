# Sheds 2.0 — Architecture

**Companion audit:** [`SHEDS-2-REALITY-AUDIT.md`](./SHEDS-2-REALITY-AUDIT.md)  
**Production truth:** `origin/main` @ `88bf9c83`  
**Audit branch / worktree:** `docs/sheds-2-reality-audit` · `/home/bryan/projects/waypoint-scenes/.worktrees/sheds-2-reality-audit`  
**Constraint:** Architecture and phase plan only. Do **not** implement Phase 1 in this task.

---

## 1. Sheds 2.0 definition

**Sheds helps a shed hunter decide when a regional search season is open, where their notes and habitat cues suggest walking next, and whether today’s field conditions favor searching — using honest, separated guidance with explicit uncertainty — never a fake probability of finding an antler.**

### Core capabilities (3–5 only)

1. **Season timing coach** — coarse regional casting window from date + latitude (+ optional user override labeled as preference).
2. **Local search notebook** — private observations, coverage, sessions; observed-only heat that stays empty when empty.
3. **Searchability briefing** — Today’s conditions (weather, daylight, footing/visibility heuristics) as *search conditions*, not cast triggers.
4. **Next-walk suggestion** — only when habitat signals exist (notes and/or later GIS); otherwise ask the hunter to place notes / choose land.
5. **Explainability & privacy** — every guidance line cites inputs; finds stay on-device by default.

*(GIS habitat intelligence is Phase 2+, not a core Phase 1 capability.)*

---

## 2. Minimum trustworthy architecture

Four **separate** owner-visible channels (do not collapse):

```
┌─────────────────────────────────────────────────────────────┐
│                     Sheds 2.0 guidance                       │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   TIMING     │   HABITAT    │ SEARCHABILITY│  CONFIDENCE    │
│  (when)      │  (where)     │  (now/how)   │  (support)     │
├──────────────┼──────────────┼──────────────┼────────────────┤
│ Season phase │ Observations │ Weather      │ Input coverage │
│ Lat window   │ (+ GIS later)│ Daylight     │ Data kinds     │
│ Uncertainty  │ Coverage gap │ Access/footing│ “Not find %”  │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

| Channel | May influence | Must not claim |
| --- | --- | --- |
| **Timing** | Regional “in window / early / late / outside” | Exact drop day; herd % cast |
| **Habitat** | Relative walk interest from notes (+ GIS later) | Antler GPS; density certainty |
| **Searchability** | Best time-of-day / snow-visibility / storm settle | That sheds appear because weather changed |
| **Confidence** | How complete inputs are for *guidance* | Probability of a find |

### Mapping from today’s code

| Today | Tomorrow |
| --- | --- |
| `Biological.scoreCell` → one `priority` | Split into Timing module + Habitat module + Searchability multipliers applied only to Searchability (and optionally soft habitat concentration), never sold as one % |
| Heat overlay | Habitat-only surface; hide or flatten when habitat inputs absent |
| Today’s Search | Pure Searchability (+ Timing as a separate badge, not mixed into window score silently) |
| Planner “Next” | Requires Habitat signal; else empty state |
| `confidence.*` | Keep as coverage confidence; ban “High” without missing-input disclosure |

### Location source-of-truth (map)

| Kind | Marker | May recenter map? |
| --- | --- | --- |
| `user_gps` / `user_approximate` | Distinct “You” | Only on explicit Locate / Recenter |
| `search_target` | Distinct “Suggested walk” | Only on explicit “Go to suggestion” |
| `map_center` | No marker | Never implied as “you” |
| `weather_anchor` | No marker | Never |
| Observation | Type icon | Never auto |

Eliminate layout-driven `setView` storms where possible (invalidateSize without resetView).

---

## 3. Code reuse vs stop

### Reuse (high value)

- `sheds-biological-model.js` — factor catalog, evidence IDs, seasonProfile, observation kernels, explain taxonomy (refactor, don’t rewrite).
- `sheds-observation-store.js` / sessions / coverage / validation hooks.
- `sheds-todays-search.js` — reframe as Searchability-only.
- `sheds-tile-provider.js` + vendored Leaflet — map reliability.
- `sheds-heat-layer.js` — rendering; feed habitat-only grids.
- Privacy / ethics sheets; local-first export.

### Port selectively

- Planner distance bias (logistics, not biology).
- Presets — only after channels split (timing presets ≠ habitat presets).
- Map-reliability docs under `docs/sheds/map-reliability/`.

### Stop / supersede

- Single blended `priority` as the hero metric.
- Spatial heat when only season+weather exist.
- “Subscriber ready” / commercial chrome until trust gates pass.
- Orphan remote sheds feature branches (see audit archaeology) — do not merge.

---

## 4. Phase plan (~5 phases)

### Phase 1 — Prediction truth + location truth + explanation

**Objective:** Make Sheds trustworthy without new GIS.

**Reuse:** Bio season + observations; Today’s Search; map markers; explain sheet; tests.

**New work:**

- Split UI into Timing / Habitat / Searchability / Confidence.
- Habitat heat only from observations (+ optional elev morphology **labeled as weak**); otherwise honest empty/flat.
- Marker visual system: You vs Suggested vs Note.
- Recenter policy: user-initiated only.
- Language pass: ban percent-like find implications; demote numeric scores.
- Update `BIOLOGICAL_MODEL.md` + in-app copy to match.

**Risks:** Feels “less magical”; heat often empty until notes exist (correct).

**Owner-visible result:** Clear season card; empty habitat heat until notes; weather as search conditions; two unambiguous map points.

**Review gate:**

- [ ] Owner cannot reasonably read any primary metric as find probability.
- [ ] No auto-recenter except Locate/Recenter/explicit Go.
- [ ] You vs Next visually distinct in screenshots.
- [ ] Automated tests assert channel separation + empty habitat honesty.
- [ ] Audit companion still accurate vs code.

**Do not:** NLCD, DEM pipelines, subscriptions, multi-species Bio expansion.

---

### Phase 2 — Habitat GIS (where to search)

**Objective:** Add defensible spatial habitat layers.

**Reuse:** Grid scorer structure; heat layer; factor catalog hooks for land cover.

**New work:** NLCD (or equivalent) + quality DEM; forest-edge distance; access/roads as searchability overlays; PA context as regional education, not micro-heat.

**Mandatory location gate (non-negotiable):** Fine-scale GIS must use **SEARCH LOCATION / SEARCH AREA**, not blindly the center of a coarse **YOU** browser fix. Distinguish YOU (device estimate) from SEARCH LOCATION (place the hunter wants analyzed). When YOU accuracy is poor (e.g. multi-kilometer), require an explicit search location (map tap, saved area, planner target, future geocoder, or precise GPS). Never treat a ±km YOU radius as identifying a specific ridge, edge, or habitat patch. Keep uncertainty visible. See `SHEDS-2-PHASE-1-PREDICTION-TRUTH.md` (owner live ±~4.8 km validation).

**Risks:** Overclaiming; tile cost; privacy (query locations); confusing YOU with SEARCH LOCATION.

**Owner-visible result:** Habitat map that answers “why does this cell differ?” with land-cover/terrain reasons tied to an explicit search area.

**Review gate:** Each cell difference has a documented spatial source; disagreement (e.g., aspect) disclosed; coarse YOU cannot silently drive micro-habitat scoring.

---

### Phase 3 — Regional timing quality

**Objective:** Better Timing without fake precision.

**Reuse:** `seasonProfile`, evidence index, validation store.

**New work:** Agency/extension regional windows; optional county/WMU tips; user override UX; validation pass/fail on season language (not ML).

**Risks:** Jurisdiction sprawl.

**Owner-visible result:** “For your region, typical window is …” with citations.

**Review gate:** Timing copy cites sources; no day-level certainty.

---

### Phase 4 — Field loop & reliability

**Objective:** Make the notebook the product’s memory.

**Reuse:** Sessions, coverage, validation, export.

**New work:** Photo attach (deferred historically); offline tile strategy; sync optional privacy-preserving backup; soak-test fixes.

**Risks:** Scope creep into social/leaderboards (reject).

**Owner-visible result:** Reliable phone companion hunters keep using.

**Review gate:** Outdoor LTE session checklist; no console errors; denial/offline honest.

---

### Phase 5 — Commercial packaging (only if gates pass)

**Objective:** Charge for durable value (offline, sync, GIS packs, regional packs) — not for Open-Meteo re-skin.

**Reuse:** Trust architecture from Phases 1–4.

**New work:** Packaging, pricing honesty, entitlement.

**Risks:** Selling heat magic again.

**Owner-visible result:** Clear paid vs free; free tier still honest.

**Review gate:** Subscription checklist from audit § Commercial; owner sign-off.

---

## 5. Phase 1 must-fix list (before more GIS)

1. Split collapsed score into Timing / Habitat / Searchability / Confidence.
2. Stop decorative regional heat.
3. Location SOT + marker clarity + recenter policy.
4. Today’s Search = searchability; season = separate badge.
5. Owner language: relative guidance only; no High-certainty theater.
6. Align stale readiness/commercial docs with HOLD verdict.
7. Regression tests for honesty behaviors.
8. Decide product promise: **notebook + season coach** first; GIS later.

---

## 6. Suggested module boundaries (future code — not implementing now)

```
apps/shed-hunting/js/
  sheds-timing.js          # seasonProfile façade + regional copy
  sheds-habitat.js         # observation kernels (+ GIS adapters later)
  sheds-searchability.js   # today’s windows / weather modifiers
  sheds-confidence.js      # coverage confidence only
  sheds-biological-model.js# shared evidence + kernels (slim over time)
  sheds-map-app.js         # composition / SOT / no scoring policy
```

Keep one evidence catalog; do not duplicate E01–E14.

---

## 7. Success metrics (non-vanity)

| Metric | Good | Bad |
| --- | --- | --- |
| Owner can state what each panel means | Pass | “The map says 82% chance” |
| Empty habitat state rate for new users | Expected high | Fake full-map green |
| Recenter surprise reports | Zero | Boot/layout jumps |
| Validation notes collected | Rising | Unused store |
| Paid conversion narrative | Offline/GIS/sync | “AI finds sheds” |

---

## 8. Explicit non-goals (Sheds 2.0)

- Machine-learning find probability without labeled ground truth.
- Public find heatmaps / leaderboards.
- Guaranteed shed locations.
- Hunting-marketing “hotspot” language.
- Merging superseded sheds branches into main as a substitute for Phase 1.

---

## 9. Handoff checklist for a future Phase 1 agent

1. Work only on a **new** Phase 1 branch/worktree from then-current `origin/main` (not this audit branch’s docs-only tip unless instructed).
2. Read this file + the reality audit end-to-end.
3. Do not implement Phase 2 GIS in the same PR.
4. Prefer smallest honesty fixes first (copy + heat gating + markers + recenter).
5. Update tests and `docs/BIOLOGICAL_MODEL.md`.
6. Append Lessons Learned to `docs/ENGINEERING-PLAYBOOK.md`.
7. Stop for owner review at Phase 1 gate — no deploy/merge without ask.
