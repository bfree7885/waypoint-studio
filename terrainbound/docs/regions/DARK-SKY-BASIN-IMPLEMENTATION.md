# Dark Sky Basin — Implementation (Phase 8C)

Phase 8B SHA `8a9503e1a8ca97a3c0b157e07fe75ff45b51a3b8` remains the DS-01/DS-02 foundation. This file records what 8C actually shipped, including places implementation diverged from the 8A architecture without rewriting that history.

**Not a deploy.** Atlas `implementationState` for Dark Sky is still `"future"`. Owner review: `http://127.0.0.1:<port>/terrainbound/?field=1&region=dark-sky-basin&summit=local&v=p79l`

## World implementation

Map stays 2480×1760, night-locked, spawn at North Rim Station.

| Place | Why the player must stand there |
| --- | --- |
| North Rim Station / dome / eyepiece / spectrograph / plate desk | Optical observation, inherited log, later galaxy plates, unlabeled envelope, remnant check |
| Lamp Bench | Known-light calibration away from dome wash (8B, preserved) |
| West Rim Stake / East Rim Stake | Walked parallax baseline. Season plates `A`/`B` reverse a nearby shift |
| Quiet Floor (pale pan) | Low-interference horn + basin silicate in hand |
| Unlabeled plot board | Player-built T vs brightness-after-distance diagram |
| Event poster | “Happening now” claim to refuse |
| Glow Notch / picnic | Optional atmosphere only; never clearance |

Trails connect station → lamp, west rim, east rim, floor, and the two optional wanders.

## Investigation mechanics

| ID | Player verbs (not a worksheet) |
| --- | --- |
| DS-01 | Observe, walk, calibrate, align traces (8B) |
| DS-02 | Mark peaks (8B) |
| DS-03 | Walk both rims, switch plates, mark which star reversed |
| DS-04 | Click-place three measured stars on unlabeled axes |
| DS-05 | Branch massive vs sun-like futures; match remnant plate |
| DS-06 | Pick up floor rock, mark a metal line present/absent, refuse “all in stars” |
| DS-07 | Align rest vs galaxy pattern, plot shift vs distance rank, reject equal-shift |
| DS-08 | Point horn zenith/wall/horizon, pin expansion + leftover + abundance |
| DS-09 | Read poster, later-tonight eyepiece jump, refuse present tense |
| DS-10 | Sort observed / inferred / unknown / refuse |

DS-01/DS-02 overlays were not rebuilt. Spectroscopy is still a bench overlay (accepted 8B compromise).

## Deterministic astronomy model

`data/darksky/catalog.json` v2 appends cairn stars, mass/remnant plates, metal-poor/rich traces, three galaxy plates with `restLines` + `redshiftNm`, a nearby variable with `laterVisual`, a distant burst, and an unlabeled envelope. No live catalog, n-body, or kelvin/magnitude invention.

Season plates are discrete `plateA`/`plateB`. Lookback is one authored `laterTonight` jump.

## Evidence architecture

The existing Field Tablet is extended, not replaced. Groups: What I saw / tested / the light showed, Pattern, Measurement, System / relationship, Revised explanation, What I can claim.

Cards are produced by player actions. AAR pins puzzle IDs `DS-01`…`DS-10` earned by those actions.

## Revision

If the player’s first cairn take is “equal brightness means equal distance,” DS-03 keeps that note and adds an explicit revision when only the nearer star shifts.

DS-02 folklore revision from 8B is unchanged.

## Summit truth

`buildDarkSkyTruth` / `darkSkyPacketFacts` now include rim visits, rock, redshift, origin, lookback, envelope, and Wren result. Hosted language still cannot invent nm values, visits, magnitudes, HR names, clearance, or present-tense distant weather.

Deterministic misconception replies cover: twins-by-eye, brighter=closer, red=hotter, redshift=red color, gravity burns stars, every star supernova, everything made in stars, light-year is time, seeing it now, Big Bang as explosion in space.

## AAR

`data/aar/dark-sky-basin.json`. Wren grades `dsState.aar` (not Cedar Hollow `puzzleState.aar`). Results: **FIELD CLEARANCE EARNED** or **MORE EVIDENCE NEEDED**. Tablet work is kept. Painted Badlands stays closed. Atlas travel is unchanged.

## Save state

Save **v6** is unchanged. `emptyDarkSkySave()` gained 8C fields; missing keys fill from empty on migrate. Dark Sky still cannot be the resume region.

## Accessibility

Plate stars have labels (Star 1 / Star 2), not color-only. Plot/redshift canvases take click and arrow keys. Horn is three coarse buttons plus a diagram. Peak/metal marks still have numeric nm. Night HUD contrast from 8B is kept. Envelope claims are text chips, not color keys.

## Known compromises

- DS-01/DS-02 still use the spectrograph overlay (accepted 8B).
- DS-07 reuses that overlay for rest-vs-shifted traces, then a separate plot board.
- Field guide can still repeat next-step language.
- Dome wash is still described more than visualized.
- Glow Notch / picnic are thin flavor, not systems.
- Field Record competencies use `ds-puzzle` requires that the shared mastery engine does not yet derive automatically; Wren AAR is the clearance authority.
- `later tonight` is a button on the eyepiece, not a sky-clock curriculum (on purpose).
- Several later investigations still open a geo-board overlay. Plate and horn **actions sit above the canvas** so they are not below the fold; the overlay itself remains an accepted compromise.

## Deferred polish

- Stronger dome-wash visualization
- Less procedural button labels
- Optional sky sketch of marked catalog objects
- Mastery-engine derivation for Dark Sky `ds-puzzle` records
- Any 8B spectrograph visual redesign

## Historical tests

`apps/terrainbound/` is a Studio redirect to waypointstudio.org. Older TerrainBound suites that still expect “Terrainbound is retired” copy (`phase6.test.mjs`, `phase7.test.mjs`) fail on that file. That is **not** an 8C regression.
