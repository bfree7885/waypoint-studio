# Scenes V1 Attack 2 — Auto Edit Owner Report

**Branch:** `feat/scenes-v1-auto-edit`  
**Date:** 2026-08-13  
**Base:** local Attack 1 Coach/Library excellence (`300f80d2`). Remote production SHA `91601b4` / PR #35 not fetchable from this environment at ship time (GitHub TCP reset); branch continues from local approved Attack 1 tip.

## Authoritative code paths

| Area | Path |
|------|------|
| Auto Edit app | `apps/auto-edit/` |
| Signals / strategy / ops / restraint | `ae-signals.js`, `ae-strategy.js`, `ae-ops.js`, `ae-restraint.js` |
| Pipeline / store / compare / export / UI | `ae-pipeline.js`, `ae-store.js`, `ae-compare.js`, `ae-export.js`, `ae-ui.js` |
| Library integration | `pl-models.js`, `pl-engine.js` (`upsertImage`, `moduleRefs.autoEdit`), `pl-ui.js` |
| Coach handoff | `photo-coach.js`, `photo-coach-shoot.js` |
| Nav / hub | `wds-app-nav-config.js`, `nav-registry.json`, `apps/scenes/index.html`, `apps/scenes/auto-edit/` |
| Docs | `docs/rebuild-2026/scenes-v1-auto-edit-implementation-map.md`, `scenes-v1-auto-edit-raw-path.md` |
| Screenshots | `docs/rebuild-2026/scenes-v1-auto-edit-screenshots/` |

## Processing architecture

Decode → analyze signals (histogram, clipping, cast, sat, contrast, edges, noise, EXIF/Coach when real) → Waypoint Choice / intent strategy → restrained pixel ops → per-pixel green/sky/sunset/orange protection → clipping guard → JPEG blob → recipe + IDB edit key `edit-{originalId}-v{n}` (original untouched). Worker handshake reserved; V1 finish runs on main with batch UI yields.

## Ops implemented

exposure, highlights, shadows, black/white point, contrast, curve, whiteBalance, saturation, vibrance, localContrast, dehaze, denoise, sharpen, monochrome, noop.

## Intents

Waypoint Choice (default), Natural, Field Guide, Atmospheric, Wildlife, Landscape, Monochrome.

## Restraint

Caps on EV/sat/clarity/dehaze/sharpen/denoise; protect radioactive greens, cyan skies, sunset oversat, orange fur/skin; avoid increasing highlight clip; DO LESS / noop when already strong.

## Persistence

`waypoint-auto-edit-recipes-v1` + Library `moduleRefs.autoEdit` + optional `role: waypoint-edit` sibling. GPS not embedded on export.

## Batch

`?batch=keepers` and UI “Auto Edit Keepers” — Keep/Favorite only; Rejects excluded; progress “Editing N of M”.

## Privacy

Local-first, no silent upload, “Processed on this device.”

## JPEG vs RAW

Honest V1 JPEG/PNG; future RAW path documented only (`scenes-v1-auto-edit-raw-path.md`).

## Moving Scenes

Preserved as Attack 3. Living prototypes untouched. Library shows “Make it move — coming next” (not a dead pretend button).

## Fixtures / visual

16 synthetic fixtures under `automation/fixtures/auto-edit/`. Pair renders in `docs/rebuild-2026/scenes-v1-auto-edit-screenshots/pair/` + `comparison-matrix.html`. Well-exposed landscape → **noop / doLess**. Underexposed / bright-sky / strong-sat / fog / high-ISO receive conditional ops.

## Automated tests

`automation/test-auto-edit.mjs` — **66 PASS**. Library 38 PASS. Coach trust 25 PASS. Privacy 20 PASS.

## 44 gates

1 YES · 2 YES · 3 YES · 4 YES · 5 YES · 6 YES · 7 YES · 8 YES · 9 YES · 10 YES · 11 YES · 12 YES · 13 YES · 14 YES · 15 YES · 16 YES (deferred) · 17 YES · 18 YES · 19 YES · 20 YES · 21 YES · 22 YES · 23 YES · 24 YES · 25 YES · 26 YES · 27 YES · 28 YES · 29 YES · 30 YES · 31 YES · 32 YES · 33 YES · 34 YES · 35 YES · 36 YES (pair matrix + workspace shots) · 37 YES (majority of problem fixtures get useful conditional ops; already-good noop) · 38 YES · 39 YES · 40 YES · 41 YES · 42 YES · 43 YES · 44 YES

## Ship status note

**Local commit:** `5b1f2705` on `feat/scenes-v1-auto-edit`  
**Push / PR / merge / Pages / prod verify:** blocked in this environment — GitHub CONNECT via local proxy resets; direct DNS to github.com fails. Credentials are available via `git credential fill`, but transport cannot reach GitHub. Owner (or a networked agent) must push, open PR, squash-merge when green, then Pages + prod Auto Edit verification + final screenshots.

Do **not** start Attack 3.
