# Moving Scenes — Natural Motion Fix 2 Report

**Date:** 2026-08-15  
**Branch:** `fix/moving-scenes-natural-motion`  
**Engine:** `1.2.0-natural-motion`  
**Perception base:** Fix 1 OWNER-APPROVED (analyze/choice frozen)

## Objective

Make cloud / atmospheric motion feel like atmospheric material through time — advection + slow internal evolution + subtle differential motion — not warped photograph pixels.

## Root cause

Legacy renderer applied large sinusoidal UV displacement with a secondary cross-axis wave, resampling still pixels → rubber reverse, ripple, and sliding-sheet “living photo” look.

## What changed

- **`ms-render.js` only** (plus tests / export harness / docs): mode-tagged field; cloud advection architecture; cloud-sea vapor recipe; clear-sky + foliage locks.
- **`ms-models.js`:** engine `1.2.0-natural-motion`.
- **Not changed:** `ms-analyze.js`, `ms-choice.js`, water recipe math, wildlife/no-motion policy, UI, Library/Auto Edit.

## Grades

| Photo | Grade |
|-------|-------|
| A cloud | A− / strong B |
| B water | B+ (no regression) |
| F cloud-sea | B / strong B |

## ZIP

`/home/bryan/Moving-Scenes-Natural-Motion-Review.zip`

## Tests

- `automation/test-moving-scenes.mjs` — 68 PASS  
- `automation/test-moving-scenes-perception.mjs` — 6/6  

See `natural-motion/qc/NATURAL-MOTION-QC.md` for all 30 gates.
