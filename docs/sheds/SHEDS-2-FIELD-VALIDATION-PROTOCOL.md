# Sheds 2.0 — Field Validation Protocol

**Purpose:** Evaluate whether Sheds is **understandable and usable** in real field conditions.  
**Not a test of:** whether Sheds predicts sheds, find rates, or biological accuracy of the landscape MODEL.

**Status:** Protocol only. Do **not** invent walk results. Record real walks in [`SHEDS-2-FIELD-VALIDATION-LOG.md`](./SHEDS-2-FIELD-VALIDATION-LOG.md).

**Minimum sample:** at least **3** real protocol walks (separate trips or distinct Search Areas / days).

---

## Success definition

Sheds passes a walk when a hunter (or owner proxy) can complete the primary loop **without needing architecture knowledge** (phases, channel internals, weights, validation machinery).

Sheds does **not** pass or fail based on number of sheds found.

---

## Useful metrics (record these)

| Metric | How to capture |
| --- | --- |
| Time to establish Search Area | Stopwatch from map open → SEARCH set |
| Time to understand current guidance | Until user can state When / Where / Landscape / Today / Observations / Next |
| Wrong interpretation count | Each time user confuses YOU/SEARCH/INSPECT/OBS, MODEL vs OBSERVED, Timing as cast-date certainty, or landscape as find % |
| Navigation lost count | Times user cannot find Field Plan, Start/End Search, My Areas, or observation entry |
| Observation-entry friction | Seconds from intent → saved note; count of blockers (GPS honesty, form length, etc.) |
| Network failure comprehension | After airplane mode / forced offline: can user state what still works? |
| Planning change | Did Sheds change where/when they planned to walk? (yes/no + brief note) |
| Planning time saved | Subjective: helped / neutral / slowed |

Optional notes: coarse GPS honesty, legend clarity, one-handed mobile use.

---

## BEFORE FIELD

| # | Check | Pass if |
| --- | --- | --- |
| B1 | Establish Search Area | User taps map (or Analyze at YOU when accurate) and sees SEARCH distinct from YOU |
| B2 | Understand Timing | User states a seasonal category (e.g. Outside main window / Main search window) — not “bucks have shed today” |
| B3 | Understand Landscape MODEL | User sees MODEL / landscape guidance (or honest unavailable) — not find % |
| B4 | Understand today’s conditions | User reads field/search conditions (weather/daylight), not cast-today claims |
| B5 | Understand prior observations | My Observations visible for the Search Area without digging only in Layers |

---

## IN FIELD

| # | Check | Pass if |
| --- | --- | --- |
| F1 | Reopen area | Saved Search Area restores SEARCH (not YOU) |
| F2 | Marker distinction | User can name YOU / SEARCH / AREA TO INSPECT / OBS using legend or labels |
| F3 | Start Search | Primary Start Search is discoverable with an active Search Area |
| F4 | Add observation quickly | Note saved with honest placement (map tap preferred; coarse YOU blocked when too approximate) |
| F5 | Weak GPS honesty | Approximate YOU labeled; SEARCH remains deliberate |
| F6 | Weak network | Calm degraded state; saved area + notes still work; not “app broken” |

---

## AFTER FIELD

| # | Check | Pass if |
| --- | --- | --- |
| A1 | End Search | End Search clear during session; summary factual |
| A2 | Summary understandable | Duration / notes / observation counts without find-probability language |
| A3 | MODEL vs OBSERVED | User can switch or compare without believing observations silently changed MODEL (default OFF) |
| A4 | Reopen later | Same Search Area usable on a later open |

---

## Walk procedure (suggested)

1. Start from a clean comprehension mindset (or a first-time proxy).
2. Open Sheds on phone; note first-run coach (dismiss or keep).
3. Complete BEFORE FIELD checks before leaving the truck/trailhead.
4. Walk with Start Search active for a short, real segment.
5. Add at least one observation.
6. Toggle airplane mode briefly; confirm F6.
7. End Search; complete AFTER FIELD checks.
8. Log everything in the validation log — **facts only**.

---

## What not to optimize during walks

- Do not change model weights to “look better.”
- Do not treat shed finds as product success.
- Do not invent GIS coverage outside the loaded pack.

---

## Related docs

- [`SHEDS-2-PHASE-4-UX-POLISH.md`](./SHEDS-2-PHASE-4-UX-POLISH.md)
- [`SHEDS-2-PHASE-4-DIRECTION-AUDIT.md`](./SHEDS-2-PHASE-4-DIRECTION-AUDIT.md)
- [`SHEDS-2-PRODUCT-STATE-AFTER-PHASE-3.md`](./SHEDS-2-PRODUCT-STATE-AFTER-PHASE-3.md)
