# Owner review — Waypoint Coach blurry / ribbon photograph previews

**Branch:** `fix/waypoint-coach-blurry-preview`  
**Date:** 2026-07-25  
**Product surface:** Photo Coach shoot summary — Strongest compositions / Best of session / Favorite (“View photograph”)

---

## Exact root cause

Two stacked defects, not “CSS-only”:

1. **CSS cascade conflict (ribbon shape)**  
   `apps/photo-coach/css/photo-coach-folio.css` (loaded last) forced:

   - `.pc-shoot-summary__thumb { width: 100%; aspect-ratio: 4/3; object-fit: cover; }`

   while `photo-coach-shell.css` kept recommendation rows as **horizontal flex** (`.pc-shoot-summary__strong` / `.pc-bestof__item`).  
   A `width: 100%` image beside a narrow text column in a flex row collapsed into a **wide, extremely short strip**. `object-fit: cover` then cropped whatever remained. Fixed heights / 3rem squares in older base CSS amplified the “banner” look.

2. **120px JPEG thumbnails used as the primary preview source (blur)**  
   `photo-coach-shoot.js` generated `THUMB_MAX = 120` data URLs and used them for:

   - recommendation cards  
   - **“View photograph”** / stage preview (`showShootImage` set `previewImg.src = img.thumbnail`)

   Upscaling a ~120px JPEG into a large desktop card produced severe blur. This is not Next.js `Image` (Coach is static HTML/JS); the equivalent failure mode was canvas thumbnail + wrong CSS.

No incorrect Next.js `fill` / `sizes` configuration applies — Photo Coach does not use Next.js.

---

## Implementation summary

| Area | Change |
|------|--------|
| Preview pipeline | Added `PREVIEW_MAX = 1280` JPEG generation (`makePreview` / `makeSizedJpeg`), EXIF-aware via `createImageBitmap({ imageOrientation: "from-image" })` with manual orientation fallback. Filmstrip stays on small thumbs (`THUMB_MAX = 160`). Never upscales. |
| Image records | Store `preview`, `previewWidth`, `previewHeight`, session `objectUrl`. Summary picks prefer `preview`. |
| Markup | Recommendation cards use `.pc-reco` grid: media + body; `aspect-ratio` from real dimensions; `object-fit: contain`. |
| Stage / View photograph | Prefers `objectUrl` → `preview` → `thumbnail`. |
| CSS | Removed folio `4/3` + `cover` primary thumb rules; grid layout; tighter row spacing; mobile stacks photo-first. |
| Tests | `automation/test-coach-blurry-preview.mjs` — CSS/HTML guards + deterministic multi-viewport / multi-aspect layout model that fails on ribbon collapse. |
| Fixtures / shots | Layout fixture + before/after screenshots under `docs/scenes/screenshots/coach-blurry-preview/`. |

---

## Files changed

- `apps/waypoint-scenes/js/photo-coach-shoot.js` — preview pipeline, reco markup  
- `apps/waypoint-scenes/js/photo-coach.js` — generate preview; stage uses sharp source  
- `apps/photo-coach/css/photo-coach-folio.css` — fix cascade / reco layout  
- `apps/photo-coach/css/photo-coach-shell.css` — grid, contain, spacing  
- `apps/waypoint-scenes/css/photo-coach.css` — align base thumb rules  
- `automation/test-coach-blurry-preview.mjs` — regression tests  
- `automation/capture-coach-preview-layout.mjs` — screenshot helper  
- `docs/scenes/fixtures/coach-preview-layout-fixture.html`  
- `docs/scenes/fixtures/coach-preview-layout-probe.html`  
- `docs/scenes/screenshots/coach-blurry-preview/*`  
- `docs/scenes/waypoint-coach-blurry-preview-owner-review.md` (this file)

---

## Before / after screenshots

All paths relative to repo root: `docs/scenes/screenshots/coach-blurry-preview/`

| Width | Before | After |
|-------|--------|-------|
| 1440 | `before-desktop-1440.png` | `after-desktop-1440.png` |
| 1024 | `before-tablet-1024.png` | `after-tablet-1024.png` |
| 768 | `before-tablet-768.png` | `after-tablet-768.png` |
| 430 | `before-mobile-430.png` | `after-mobile-430.png` |
| 390 | `before-mobile-390.png` | `after-mobile-390.png` |
| 375 | `before-mobile-375.png` | `after-mobile-375.png` |

**Before:** Strongest compositions showed three thin horizontal ribbons (fixture labels still readable inside crushed strips).  
**After:** Landscape / portrait / square cards show full compositions with natural aspect ratios; coaching text beside (desktop) or below (≤720px); “View photograph” remains.

---

## Test commands and results

```bash
node automation/test-coach-blurry-preview.mjs
# → All Coach blurry-preview regression tests passed (17).

node automation/test-photo-coach-shoot-review.mjs
# → All Photo Coach Shoot Review tests passed (41).
```

Optional live Chrome DOM probe (best-effort; dump-dom from Node is flaky in this environment):

```bash
COACH_LAYOUT_BROWSER=1 node automation/test-coach-blurry-preview.mjs
```

Manual Chrome measurements on the light SVG probe page confirmed ratios ≈ `0.666` (landscape), `1.501` (portrait), `1.0` (square) at 1440px — not ribbons.

---

## Responsive widths verified

1440, 1024, 768, 430, 390, 375 — screenshots captured; layout model asserts each width × landscape/portrait/square.

---

## Performance considerations

- Filmstrip still uses small thumbs (~160px) — no change to contact-sheet cost.  
- Recommendation / stage uses a **single** 1280 long-edge JPEG (q≈0.84), generated once per analyze alongside the thumb.  
- Never upscales below-source pixels.  
- `decoding="async"` on reco images; grid layout avoids fixed min-heights that cause CLS.  
- Preview data URLs increase localStorage payload vs 120px thumbs — mitigated by long-edge cap and existing shoot quota / save fallbacks. Session `objectUrl` used when still in memory for the sharpest “View photograph”.

---

## Remaining risks

- **Older saved shoots** that only have 120px `thumbnail` (no `preview`) will still look soft until re-analyzed; layout will no longer ribbon them.  
- **Very tall portraits** in a wide media column can make rows long (intentional — composition stays visible).  
- Chrome `--dump-dom` via Node spawn remains unreliable here; rely on deterministic layout tests + screenshots for CI gates.  
- Sprint 4 scene-native Coach work was stashed separately (`wip-sprint4-scene-native`) and is not included in this fix branch.

---

## Verdict

Root cause fixed permanently: correct preview resolution + EXIF-aware generation, and recommendation layout that preserves natural aspect ratio with `object-fit: contain`. Ribbon regression is covered by automated tests.
