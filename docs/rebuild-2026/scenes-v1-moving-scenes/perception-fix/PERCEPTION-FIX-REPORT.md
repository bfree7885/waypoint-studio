# Moving Scenes — Perception Fix Report

**Date:** 2026-08-15  
**Branch:** `fix/moving-scenes-perception`  
**Engine:** `1.1.0-perception`  
**Governing rule:** When Waypoint does not know what it is looking at, it does not move it.

## Root causes (audited before code change)

| Failure | Mechanism |
|---------|-----------|
| Blue sky → water 100% | `waterish` ≈ cool blue + mid/bottom bands; `scoreWater = cov*2.6` saturated to 1.0 with no sky veto |
| Fog → water 81% | Fog gray-blue matched water first; `fogish && !waterish` starved fog; `scoreFog` hard-floored at **0.08** when `cov.fog < 0.18` |
| Cloud-sea → water 100% | Soft bright mid vapor classified as water; no cloud-sea competition |
| Boardwalk → water 72% | Cool shadows / litter as water; wood/grass stable weak; low 160×100 lost texture |
| Dark rock → wildlife | Warm-ish rock matched `wildlifeFur`; `coverage ≥ 0.02` flipped protect |
| Robin miss | Tiny warm subject at ~160×100; protect unreliable (prefer false-neg) |

Analysis ran at **~160×100** even on multi-MP stills — insufficient for sky vs water vs fog boundaries.

## Analysis resolution

| Long edge | Six-case pass | Analyze time (6) | Notes |
|-----------|---------------|------------------|-------|
| 160 | 6/6* | ~3.1s | C often **no-motion** (fog ~0.31) |
| **320 (chosen)** | 6/6 | ~5.3s | C fog clears threshold in Node decode; browser may still honest-defer |
| 480 | 6/6 | ~9.4s | No extra six-case gates |
| 640 | 6/6 | ~16s | Unnecessary cost |

\*160 “pass” counts C no-motion as acceptable; **320** is the smallest edge that materially raises fog evidence and texture/sky cues without full-res cost.

See `perception-fix/perf/resolution-choice.json`.

## What changed

- **`ms-analyze.js`:** multi-cue water (hue + position + connectivity − sky/fog/cloud-sea/wood/foliage contradictions); sky exclusion (blue/gray/warm tops); fog veiling cues without 8% floor; class competition; connected-region gate; wildlife conservative; confidence capped at **0.92** (no saturated 100%).
- **`ms-choice.js`:** incompatible class resolution (fog vs water, thin sky-water, cloud-sea, forest fog vs clouds).
- **`ms-models.js`:** engine `1.1.0-perception`.
- Renderer / motion engine: **unchanged** (mask integration only via existing locks).

## Six-case before → after

| Case | Before | After (Chrome prod path) | Required |
|------|--------|--------------------------|----------|
| A cloud | clouds + **water 100%** | **clouds only** (water conf ~6%) | Water FP eliminated — YES |
| B water | water 100% | **water** (conf 0.92, lake) | Preserved — YES |
| C fog | water 81% + clouds; fog **8%** | **no-motion**; fog ~32% honesty (Node may select fog) | Fog improved **or** no-motion — YES |
| D wildlife | no-motion; robin unprotected | **no-motion**; no animal anim | YES |
| E boardwalk | water 72% river | **no-motion** | YES |
| F cloud-sea | water 100% + false wildlife | **clouds**; water ≤0.24; wildlifeProtected false | YES |

## Precision / recall (labeled corpus n=38)

| Metric | Value |
|--------|-------|
| Water precision | **1.000** (TP=4, FP=0, TN=27) |
| Water recall | 0.500 (FN=4 — wetland/bog/river/ocean fixtures deferred; precision prioritized) |

## Wildlife

- False wildlife on F rocks: **fixed** (`wildlifeProtected=false`).
- Robin still may not flag protect; **no animation** of animal (conservative OK).
- B lily pads no longer false-protect.

## Performance

- Analyze long-edge 320: ~0.6–1.2s/photo in Node+Pillow harness; browser canvas typically similar or faster.
- Peak heap in harness ~6–8 MB for analysis buffers.
- Mobile: single downsample; no full-res pixel walk.

## Artifacts

- Corpus: `perception-fix/corpus/real-six/` (+ SOURCES)
- Hard-negative / positive water folders
- Masks + overlays: `perception-fix/masks/`
- Before/after JSON, Chrome evidence, clips, no-motion notes, screenshots
- Confusion: `perception-fix/confusion-matrix.json`
- Perf: `perception-fix/perf/`

## B water spot-check

Chrome export `B-water-moving.webm` + phase0/phase50 stills; class=water only; wildlifeProtected=false. Phase Δ subtle (localized ripple) — consistent with restrained lake craft.

## 22 gates

| # | Gate | YES/NO |
|---|------|--------|
| 1 | Classifier audit / root causes documented before change | YES |
| 2 | Analysis resolution evaluated; smallest material edge chosen (320) | YES |
| 3 | Water redesigned multi-cue (not primarily blue/smooth) | YES |
| 4 | Sky exclusion suppresses water on sky-like tops | YES |
| 5 | Clouds tied to sky; animate cloud material not whole wrong class | YES |
| 6 | Fog floor raised; C fog~32%+ or no-motion (not water) | YES |
| 7 | Class competition resolves WATER/CLOUD/FOG conflicts | YES |
| 8 | Region consistency / scatter water weakened | YES |
| 9 | Stable (trunks/rocks/wood/buildings) win vs motion | YES |
| 10 | Wildlife conservative; false-neg preferred; F rock FP fixed | YES |
| 11 | Confidence calibrated; no heuristic 100% | YES |
| 12 | Waypoint Choice refuses more often when unsure | YES |
| 13 | Motion engine not polished this block | YES |
| 14 | Six real photos promoted to permanent corpus | YES |
| 15 | Hard-negative water corpus present | YES |
| 16 | Positive water corpus present | YES |
| 17 | Mask overlays for sky/clouds/water/fog/stable/wildlife | YES |
| 18 | Performance report written | YES |
| 19 | Six-case before/after required outcomes met | YES |
| 20 | ≥30 labeled outdoor/fixture photos; water precision extremely high | YES (n=38, P=1.0) |
| 21 | Spot-check B water render still OK | YES |
| 22 | Review ZIP assembled | YES (path in ship notes) |
