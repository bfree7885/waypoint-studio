# Sheds 2.0 — Phase 3 Field Workflow

**Status:** Implementation complete — ready for owner review  
**Date:** 2026-08-24  
**Branch:** `feat/sheds-2-phase-3-field-workflow`  
**Worktree:** `.worktrees/sheds-2-phase-2-habitat-gis` (Phase 3 branch)  
**Base:** Phase 2 `537d9ad852a6c53933aef5cde03be7e1498825ee`  
**Design:** [`SHEDS-2-PHASE-3-FIELD-WORKFLOW-RECON.md`](./SHEDS-2-PHASE-3-FIELD-WORKFLOW-RECON.md), [`SHEDS-2-PHASE-3-ARCHITECTURE.md`](./SHEDS-2-PHASE-3-ARCHITECTURE.md)

---

## Mission

Turn Sheds into a usable **field workflow**: save Search Areas, plan a walk, Start/End Search, record observations, and keep **MODEL** (GIS) distinct from **OBSERVED** (your notes).

---

## Storage schemas

| Store | Key | Version |
| --- | --- | --- |
| Search Areas | `waypoint-sheds-search-areas-v1` | 1 |
| Observations | `waypoint-sheds-observations-v1` | **2** (adds `searchAreaId`, `accuracyM`) |
| Sessions | `waypoint-sheds-sessions-v1` | 1 (+ optional `searchAreaId` / `searchAreaName`) |
| Model prefs | `waypoint-sheds-model-prefs-v1` | **2** (`includeObservationsInHabitat` default **false**) |

All: `privacy: "private"` / export `privacy: "private-local"`. No IndexedDB. No cloud.

### Search Area record

`id`, `name`, `center`, `radiusKey`, `radiusM`, `mapView?`, `notes`, `gisPackId`, `gisStatus`, `status` active|archived, `privacy`, `createdAt`, `updatedAt`, `archivedAt?`

### Observation (v2)

Prior fields + optional `searchAreaId`, `location.accuracyM`, `details.signDetail` for deer_sign (tracks/scat/rub/scrape).

### Session

Prior fields + optional `searchAreaId`, `searchAreaName`. Summary via `summarizeSession` — never claims area empty of sheds.

---

## Migrations

- **Observations:** `migrateIfNeeded()` reads raw JSON; normalizes missing `searchAreaId` → `null`, bumps `schemaVersion` to 2, **keeps ids**.  
- **Sessions:** `migrateSessionsIfNeeded()` adds `searchAreaId`/`searchAreaName` null if absent.  
- Old records remain valid. Deleting a Search Area does **not** delete obs/sessions.

---

## MODEL vs OBSERVED

| Mode | Behavior |
| --- | --- |
| **MODEL (default)** | Habitat GIS = NLCD + edge + slope only (`includeObservations: false`) |
| **OBSERVED** | Markers / observed-only heat mode |
| **COMBINED (opt-in)** | Checkbox “Include my observations in guidance” → capped `OBS_CAP` + decay |

Default pref: `includeObservationsInHabitat: false`. One find cannot dominate the Search Area.

---

## Sessions (Start / End Search)

Productizes existing session store. FAB: **Start Search** / **End Search**. Tracking never starts without explicit Start. Distance only when GPS path has ≥2 points; otherwise summary says distance unavailable.

---

## Field Plan

Tools → Field Plan: Search Area + GIS status, Timing, Habitat MODEL, Searchability, Evidence support, Observed summary, Areas to inspect (if planner has TARGET), user notes, Start Search. Offline/weather degradations listed honestly. No route optimization.

---

## Privacy

Local-first Search Areas, observations, sessions, GIS pack cache. No coords in share URLs. No photo upload (`photoRef` string only). Weather/tiles/SGL may reveal approximate location when online.

---

## Offline

**Works:** saved areas, obs, sessions, Timing, cached GIS MODEL, Field Plan from those.  
**Degrades:** live weather, uncached basemap, fresh SGL, first pack download.

---

## Tests

```bash
cd .worktrees/sheds-2-phase-2-habitat-gis
node automation/test-sheds-phase3-field-workflow.mjs
node automation/test-sheds-phase2-habitat-gis.mjs
node automation/test-sheds-phase1-prediction-truth.mjs
```

Validation artifact: `docs/sheds/SHEDS-2-PHASE-3-VALIDATION.json`

---

## Owner local review

```bash
cd /home/bryan/projects/waypoint-scenes/.worktrees/sheds-2-phase-2-habitat-gis
python3 -m http.server 8080
```

Open: http://127.0.0.1:8080/apps/shed-hunting/map/

Workflow: tap SEARCH near Milford → Save Search Area → reopen from My Search Areas → confirm MODEL → add note (MODEL unchanged) → toggle Include observations → Start Search → End Search → Field Plan → optional limited-data/offline.

---

## Limitations

- Single device localStorage (quota / shared device risk)  
- Pike pack still the only GIS AOI  
- Basemap offline not guaranteed  
- photoRef is not a media library  
- No sync / multi-device  
- Planner inspect suggestions remain heuristic, not shed claims  

---

## Not built (by design)

Subscriptions, social, public hotspots, cloud accounts/sync, AI, multi-species, statewide GIS, new habitat weights, find %, route optimization, gamification, photo vault, fitness tracking, Phase 4.
