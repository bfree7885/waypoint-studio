# Sheds 2.0 — Phase 3 Field Workflow Architecture

**Status:** Design only — **do not implement yet**  
**Date:** 2026-08-24  
**Baseline:** Phase 2 `537d9ad8`  
**Recon:** [`SHEDS-2-PHASE-3-FIELD-WORKFLOW-RECON.md`](./SHEDS-2-PHASE-3-FIELD-WORKFLOW-RECON.md)

---

## 1. Product definition (Phase 3)

**Sheds helps a hunter prepare a private search of a saved area, walk it with honest GPS, record what they personally saw, and review MODEL landscape guidance beside OBSERVED notes — without turning notes into fake shed probability.**

### Owner flow

```
SAVE / OPEN SEARCH AREA
        ↓
FIELD PLAN (Timing · Habitat MODEL · Searchability · Evidence · inspect suggestions · my notes)
        ↓
START SEARCH (session)
        ↓
RECORD OBSERVATIONS (OBSERVED channel)
        ↓
END SEARCH → simple summary
        ↓
COMPARE MODEL vs OBSERVED (toggle / dual view — no silent merge)
```

---

## 2. Non-negotiables (carry forward)

From Phase 1 / 2 — **must not regress:**

1. Timing / Habitat / Searchability / Evidence support remain separate.  
2. No find %, shed probability, or presence certainty.  
3. YOU ≠ SEARCH LOCATION ≠ TARGET ≠ OBSERVATION.  
4. Coarse YOU does not drive fine GIS; accuracy gate remains.  
5. Weather/season/SGL/OSM are not Habitat weights.  
6. Observation influence capped + decayed if enabled at all.  
7. Empty / unavailable GIS stays honest.  
8. No surprise map recenter (weather/date/model).  
9. Private local-first default; no cloud accounts/sync.  
10. Whitetail only; no multi-species.

---

## 3. Saved Search Areas

### 3.1 Store

New module (proposed): `sheds-search-area-store.js`  
Key: `waypoint-sheds-search-areas-v1`  
Max: ~40 active + archived soft-delete (cap e.g. 80 total).

### 3.2 Record schema

```text
{
  schemaVersion: 1,
  id: "area_…",
  name: string,                 // required, user-facing
  center: { lat, lng },
  radiusKey: "small"|"medium"|"large",
  radiusM: number,              // denormalized from key
  mapView: { lat, lng, zoom } | null,
  notes: string,                // short plan notes
  gisPackId: string | null,
  gisStatus: "available"|"unavailable"|"unknown",
  status: "active"|"archived",
  privacy: "private",
  createdAt, updatedAt, archivedAt?
}
```

### 3.3 Identification

- Primary: opaque `id`  
- Display: user `name` (not auto “Hotspot near…”)  
- Optional subtitle: radius + GIS status (“Habitat pack available” / “Habitat data unavailable”)  
- **Do not** identify areas by predicted quality scores in the name

### 3.4 UX

- **Save current SEARCH** → prompt name  
- **My Search Areas** list → open (restores center, radius, mapView; re-runs GIS if pack present)  
- Rename / archive / delete (delete confirms; archive hides from default list)  
- Opening an area does **not** move YOU  
- Clearing SEARCH does not delete saved areas

### 3.5 What NOT to store on a Search Area

- Find probability / “quality score” as truth  
- Aggregated public density  
- Other users’ observations  
- Full session GPS paths (sessions stay separate; optional `lastSessionId` link only)  
- Photo binaries

---

## 4. Observations ↔ Search Areas

### 4.1 Relation

Add optional foreign key:

`searchAreaId: string | null`

Rules:

- Creating an obs while a Search Area (or ephemeral SEARCH) is active **offers** “Link to [Area name]” (default on if area open).  
- Obs without area remain valid (global notebook).  
- Filtering: “In this Search Area” = linked id **or** point inside radius (compute at query time; do not rewrite history silently).  
- Deleting/archiving an area does **not** delete observations (unlink or keep id for history).

### 4.2 GPS uncertainty on observation placement

| Condition | Behavior |
| --- | --- |
| User taps map to place | `precision: "map-tap"` — preferred |
| Use YOU when accuracy ≤ 50–80 m | `precision: "gps"` + store `accuracyM` if available |
| Use YOU when accuracy coarse | Block auto-place; prompt “Tap map — YOU is approximate (±X m)” |
| Edit later | Allowed; updatedAt changes |

Never imply meter-true biology from multi-hundred-meter GPS.

---

## 5. MODEL vs OBSERVED architecture

### 5.1 Channels on map

| Layer | Content | Default |
| --- | --- | --- |
| **MODEL** | Phase 2 GIS bands (structure/edge/slope) | On when SEARCH/area + pack |
| **OBSERVED** | Observation markers (+ optional observed-only heat) | Markers on; heat off |
| **Include notes in Habitat score** | Opt-in boolean | **Off by default** in Phase 3 |

When opt-in is off: Habitat GIS score uses structure+terrain only (renormalize or set `W_OBSERVED = 0` with explicit UI copy).

When opt-in is on: keep Phase 2 caps (`OBS_CAP ≤ 0.35`) + decay; explain sheet lists Observed as separate factor.

### 5.2 Compare UI

Simple Field Compare (Tools or Field Plan):

- Side-by-side bullets, not blended rainbow:  
  - **Model says:** structure / transition / slope summary for SEARCH  
  - **You recorded:** counts by type in area (or “none yet”)  
- Explicit line: “Your finds do not prove nearby cells hold antlers.”

Reuse existing `heatMode === "observed"` and `compareMode` prefs where possible; make labels unmistakable.

---

## 6. Observation categories (Phase 3 MVP)

### Keep as first-class types

Existing list is largely defensible. Phase 3 MVP:

1. Emphasize field-primary types in the form (shed found, deer sign, trail/crossing, bedding, feeding, habitat note, access issue).  
2. Add **optional detail enums** under `deer_sign` / notes: `tracks | scat | rub | scrape | other_sign` — **not** new biological certainty.  
3. Do **not** invent “shed hotspot” type.  
4. Pressure / search_completed remain effort & searchability context.

### Wording

Every type remains **user-reported evidence**, confidence-tagged (`uncertain` / `probable` / `confirmed`).

---

## 7. Search Session (productize existing store)

Reuse `waypoint-sheds-sessions-v1` — do not build a second tracker.

### 7.1 Ritual

| Step | Action |
| --- | --- |
| Start Search | `startSession` + optional `searchAreaId` |
| During | elapsed time UI; distance only if GPS track points exist; attach obs ids |
| End Search | `endSession` + summary sheet |

### 7.2 Session should record

- start/end timestamps  
- duration  
- optional path + distance (honest GPS; jitter filter already exists)  
- observationIds + shedsFound count  
- linked `searchAreaId`  
- optional short notes  
- optional weather snapshot at start/end if online  

### 7.3 Session must NOT record

- calories, pace goals, leaderboards  
- “areas cleared of sheds”  
- automatic public share  
- continuous background tracking when user did not Start Search  
- heart-rate / fitness APIs  

### 7.4 Summary (end)

Plain language:

- Area name (if any)  
- Duration · distance (or “distance unavailable”)  
- Observations logged (by type counts)  
- Sheds logged  
- Reminder: “Past search does not prove the area is empty.”

---

## 8. Field Plan (pre-search)

Bound to an opened Saved Search Area (or current SEARCH).

### Contents (one screen)

1. **Area** — name, radius, GIS available/unavailable  
2. **Timing** — Phase 1 channel (regional)  
3. **Habitat (MODEL)** — categorical summary inside area; empty if no pack  
4. **Searchability** — weather/daylight or honest unavailable  
5. **Evidence support** — not find %  
6. **Suggested inspect focus** — from GIS bands / planner TARGET **inside area only**; phrased as “worth inspecting,” never “sheds here”  
7. **Your notes** — area.notes + recent OBSERVED counts  
8. CTA: **Start Search**

### Explicitly out of Field Plan MVP

- Multi-stop route optimization  
- Turn-by-turn navigation  
- “Best hour guaranteed”  
- New prediction weights  

---

## 9. Photos

**Phase 3 MVP:** keep `photoRef` as local reminder string only.

| Allowed | Not allowed |
| --- | --- |
| Filename / album note | Upload to Waypoint servers |
| User says they took a phone photo | EXIF ingestion / gallery scrape |
| | Auto-attach binary to localStorage (quota + privacy risk) |

**Future (not Phase 3):** optional on-device blob in IndexedDB with EXIF strip — only if separately designed.

---

## 10. Privacy architecture

1. All new stores: `privacy: "private"`, localStorage (or same pattern).  
2. No coords in URLs, analytics, or share sheets.  
3. Export remains user-initiated JSON (areas + obs + sessions).  
4. Ethics sheet update: mention Saved Search Areas + session tracks.  
5. Third-party disclosure unchanged in spirit: tiles/weather/SGL may reveal approximate location when online.  
6. Limited-data / offline mode: Habitat from cached pack; Searchability degrades honestly.

---

## 11. Offline architecture

| Works offline | Degrades |
| --- | --- |
| Open saved areas | Fresh basemap tiles |
| Obs CRUD | Live weather / Searchability |
| Sessions start/end (distance only if GPS works) | SGL fetch (unless cached) |
| Cached GIS habitat | First-time pack download |
| Timing | |

UI must show: “Habitat from cached pack” vs “Habitat unavailable” vs “Map imagery may be incomplete offline.”

---

## 12. Implementation modules (proposed — not built yet)

| Module | Role |
| --- | --- |
| `sheds-search-area-store.js` | CRUD saved areas |
| Map app wiring | Save/Open UI; restore SEARCH from area |
| Session UX rename | Start/End Search; link `searchAreaId` |
| Habitat GIS flag | `includeObservations` default false |
| Field Plan panel | Compose channels + area metadata |
| Tests | See §14 |

No new GIS preprocessing required for MVP.

---

## 13. Exact Phase 3 MVP scope

**Build:**

1. Saved Search Areas (save/open/rename/archive/delete)  
2. Link observations ↔ areas (optional FK + in-radius filter)  
3. MODEL vs OBSERVED clarity; obs→Habitat **opt-in, default off**  
4. Productized Start/End Search session + summary (reuse session store)  
5. Simple Field Plan for saved/current area  
6. GPS honesty for obs placement  
7. Privacy/ethics/offline copy updates  
8. Tests for all of the above  

**Do not build:**

- Subscriptions, accounts, sync, social, public hotspots  
- Deer density / WMU population claims  
- AI, multi-species, statewide GIS expansion  
- New habitat prediction weights / find %  
- Gamification / leaderboards  
- Route optimization / navigation  
- Photo upload or IndexedDB media vault  
- Fitness tracking  
- Phase 4 features  

---

## 14. Required tests (acceptance sketch)

1. Save Search Area persists center/radius/name across reload.  
2. Open area restores SEARCH ≠ YOU.  
3. Archive/delete behaviors; obs not cascade-deleted.  
4. GIS available vs unavailable badge honest.  
5. Obs link to area; filter in-area works.  
6. Coarse YOU cannot auto-stamp precise obs.  
7. Default Habitat GIS excludes observation weight.  
8. Opt-in includes obs with cap + decay.  
9. MODEL and OBSERVED UI copy remain distinct.  
10. Start/End session duration; distance only with path.  
11. Session summary does not claim area empty.  
12. No find % language regressions.  
13. No coords in URLs.  
14. photoRef not uploaded / no binary in storage keys.  
15. Offline: cached pack + areas + obs work; weather degrades.  
16. Recenter policy unchanged.  
17. Phase 1 + Phase 2 suites still pass.  

---

## 15. Rollout / worktree guidance (when implementing)

- Branch from Phase 2 tip `537d9ad8` (or merge base once Phase 2 is on main).  
- New worktree at implementation time — **not now**.  
- Do not merge/deploy until owner PASS.

---

## 16. Architecture verdict

**GO** — Phase 3 is the right next product step: workflow over more GIS. Scope is implementable atop existing observation + session stores with one new Search Area store and clearer MODEL/OBSERVED defaults.
