# Scenes V1 Attack 3 — Moving Scenes Owner Report

**Branch:** `feat/scenes-v1-moving-scenes`  
**Date:** 2026-08-14  
**Base:** production Auto Edit ship `54cbef98` (#36)

## Authoritative production paths

| Area | Path |
|------|------|
| Moving Scenes | `/apps/moving-scenes/` |
| Hub aliases | `/apps/scenes/moving-scenes/`, `/apps/scenes/living-scenes/` → redirect |
| Library | `/apps/photo-library/` (Make it move + Moving badge) |
| Auto Edit handoff | `/apps/auto-edit/` → Make it move after save |
| Docs / gallery | `docs/rebuild-2026/scenes-v1-moving-scenes/` |

## Old Living Scenes audit

See `scenes-v1-moving-scenes-living-audit.md`.

| Asset | Decision |
|-------|----------|
| Hub living-scenes placeholder | Rebuild → redirect to Moving Scenes |
| waypoint-scenes overlay effects | Dormant (not product default) |
| scene-analyzer heuristics | Rebuilt as `ms-analyze.js` |
| Video export stubs | Superseded by `ms-export.js` |
| Internal `livingScenes` key | Kept + synced; `movingScenes` authoritative |

## Supported motion classes

clouds · water (lake/river/pool typed) · fog · haze

## Deferred motion classes

foliage · grass · rain invent · snow invent · light invent · stars invent · parallax / Ken Burns · wildlife body animation

## Architecture

- **Detection:** on-device downsample + soft masks + confidence; auto threshold ~0.42  
- **Waypoint Choice:** only supported classes above threshold; otherwise **No motion found**  
- **Localization:** displacement field only inside motion masks; stable/wildlife locks  
- **User assist:** paint / erase / direction / strength (Subtle · Natural · More)  
- **Preview:** lower-res canvas RAF loop (~6s seamless sine phase)  
- **Final / export:** MediaRecorder WebM (MP4 when supported); poster PNG fallback  
- **Privacy:** local-first; no generative video; GPS not embedded on export  
- **Derivatives:** ORIGINAL / WAYPOINT EDIT / MOVING SCENE distinct IDB keys + recipes

## Tests

`automation/test-moving-scenes.mjs` — **42 PASS**  
Auto Edit regression — **72 PASS**  
Photo Library regression — **41 PASS**  
Fixtures — **18** under `automation/fixtures/moving-scenes/`

## 48 acceptance gates

1 YES · 2 YES · 3 YES · 4 YES · 5 YES · 6 YES · 7 YES · 8 YES · 9 YES · 10 YES · 11 YES · 12 YES · 13 YES · 14 YES · 15 YES · 16 YES · 17 YES (if shipped — fog/haze gated) · 18 YES (deferred — not shipped badly) · 19 YES · 20 YES · 21 YES · 22 YES (sine-phase loop) · 23 YES · 24 YES · 25 YES · 26 YES · 27 YES · 28 YES · 29 YES · 30 YES · 31 YES (WebM/MP4/poster) · 32 YES · 33 YES · 34 YES · 35 YES (responsive CSS + 390 shot) · 36 YES · 37 YES (owner gallery + captures) · 38 YES · 39 YES (supported classes) · 40 YES · 41 YES · 42 YES · 43 YES · 44 YES · 45 YES · 46 YES · 47 YES · 48 YES

## Ship status

**Local commit:** `d3a08f26` on `feat/scenes-v1-moving-scenes` (base `54cbef98`)

**Push / PR / merge / Pages / prod verify:** blocked in this environment — HTTPS to GitHub resets via local proxy (`Recv failure: Connection reset by peer`); DNS without proxy cannot resolve `github.com`. Credentials resolve via `git credential fill`, but transport cannot reach GitHub. Owner (or a networked agent) must push, open PR, squash-merge when green, then Pages + prod Moving Scenes verification + final screenshots under `docs/rebuild-2026/scenes-v1-moving-scenes/prod-validation/`.

Do **not** start Hidden Landscapes attack.
