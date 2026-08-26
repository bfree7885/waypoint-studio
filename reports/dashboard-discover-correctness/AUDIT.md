# Dashboard Discover Correctness Audit

**Date:** 2026-08-26  
**Starting production commit:** `4b344a74` (`origin/main`, merge of PR #54)  
**Branch:** `cursor/dashboard-discover-correctness-2eb7`  
**Scope:** Discover seasonal honesty + natural-event visibility. Not Sheds V3.2. Not a Dashboard redesign.

## Production failure (2026-08-25)

Westfall Township, PA Dashboard showed:

- Correct live weather
- Editorial seasonal note: **“late spring”**, ephemerals fading, mountain laurel opening, morels ending
- Happening Now quiet: **“Right Now — Nothing unusually strong”**
- No mention of the 27–28 August 2026 lunar eclipse (~two days later)

That seasonal copy is impossible for Pennsylvania in late August.

## Root cause — “late spring”

**Not** a month-mapping bug, latitude inversion, or LLM hallucination.

**Stale editorial content-bundle season/phenology is copied onto the OIP platform and rendered as Discover “Seasonal note (editorial)” with no date, hemisphere, or freshness guard.**

Exact source strings:

`design-system/content-engine/regions/pike-county-pa.json`

- `"season": "late spring"`
- `"phenologyStage": "Late spring transition — ephemerals may be fading, mountain laurel may be opening, morels may be ending below 1,200 ft"`
- `thisWeekOutdoors` morel / laurel / ephemeral copy
- `regionalIntelligenceProfile.daylight` hardcoded May-ish `05:42` / `20:18` (must not override live daylight)

Also:

- `design-system/regional-intelligence/snapshots/pike-county-pa.json` — `season.label: "late spring"`, `weekOf: "2026-05-30"`
- `design-system/content-engine/regions-index.json` — every region `seasonNote: "late spring"` (and variants)

Westfall Township is inside the Pike County local-bundle footprint, so Discover uses this bundle rather than the national educational path.

## How it reaches Discover

1. `wds-oip-sources.js` `fromContentBundle()` sets `calendar.season = bundle.season` and `phenology.stage = profile.phenologyStage` with **no validity window**.
2. `wds-regional-intelligence-engine.js` `enrichFromBundle()` / `buildFromLocation()` copy `bundle.season` and `loc.seasonNote` the same way.
3. `wds-oip-model.js` `applyFallback()` copies `defaults.season` from the regions index (`late spring`).
4. `wds-dashboard-rebuild-today.js` `seasonLine()` blindly prints `Seasonal note (editorial): {season} — {stage}`.

Calendar season and biological phenology are treated as the same string. There is no:

- date/month constraint
- Northern vs Southern Hemisphere check
- `weekOf` / `validUntil` expiration
- suppression of impossible season/date combinations

Replacing “late spring” with “late summer” in the JSON would hide the August 2025–26 failure and leave the same mechanism for the next season change.

## Quiet-day failure

`wds-dashboard-rebuild.js` `renderShell()` shows “Nothing unusually strong” when Happening Now is empty **and** live weather exists.

Happening Now comes only from `dashboardRebuildIntel` weather / air / light / alerts (`minScore: 25`).

**Natural events are not a Discover category.** An approaching locally visible eclipse cannot un-quiet the day. A quiet **weather** state is treated as a quiet **Discover** state.

## Missing event layer

No structured upcoming-natural-event ingest, lifecycle, timezone conversion, or location-visibility check exists on rebuild Discover.

## Moon / solar (screenshot audit)

- Moon graphic (`moonArt`) claims illumination-accurate clipping via `phaseValue`. Existing visual tests cover waxing vs waning keys. Phase/illumination are derived from Open-Meteo `daily.moonPhase` when live, else `moonPhaseFromDate`.
- Daylight: `wds-daylight-utils.js` evening golden hour = sunset − 60 minutes. Screenshot sunset 7:43 PM / golden hour 6:43 PM is **internally consistent** with that rule, not with the bundle’s editorial `20:18`. Live Open-Meteo sunrise/sunset should win; editorial `05:42`/`20:18` is a May snapshot and must not be used as a clock fallback.

## Outside Today duplication

`composeTodayLines()` repeats temperature, humidity, wind, next-hour temp, and cloud percentages that Conditions already shows. Discover should synthesize takeaways, not dump the instrument panel.

## Acceptance event (authoritative)

Partial lunar eclipse 27–28 August 2026. Espenak / NASA GSFC (EclipseWise) UT1 contacts:

| Contact | UT1 |
|---|---|
| Penumbral start (P1) | 2026-08-28 01:23:29Z |
| Partial start (U1) | 2026-08-28 02:33:21Z |
| Greatest | 2026-08-28 04:12:52Z |
| Partial end (U4) | 2026-08-28 05:52:09Z |
| Penumbral end (P4) | 2026-08-28 07:01:59Z |

Umbral magnitude ≈ 0.932. Visibility: eastern Pacific, Americas, Europe, Africa (Moon above horizon). Pennsylvania (EDT, UTC−4): maximum ~12:13 AM Friday 28 August.

Sources recorded on the event record; times are not LLM-invented.

## Fix direction (this pass)

1. Deterministic calendar season from date + hemisphere; never display conflicting editorial season.
2. Phenology separate, freshness-bounded, omitted when stale or geographically/seasonally impossible.
3. Reusable curated natural-event catalog + lifecycle (`upcoming` / `tonight` / `happening` / `ended`).
4. Quiet-day checks **all** supported Discover categories, including events within the horizon.
5. Reduce Outside Today instrument duplication.
6. Keep provenance accessible; do not invent fallbacks.
