# Moving Scenes — REAL PHOTO QC

Generated: 2026-08-15  
Engine: as-shipped local `/apps/moving-scenes/` (git `c43dec4d`; Moving Scenes path last touched `ff8c1d70`)  
Production reference: https://waypointstudio.org/apps/moving-scenes/ (owner-noted SHA ~2f02e6e6)  
Constraint: **no algorithm / threshold / motion-code changes**. Synthetic fixtures retained for automated tests.

## Engine facts (truthful)

| Fact | Value |
|------|-------|
| Classification sample | **~160×100** (`SAMPLE_W`/`SAMPLE_H`) even on multi-megapixel photos |
| Auto-accept threshold | **0.42** |
| Final render long edge | **≤1920** (`FINAL_MAX`) |
| Preview long edge | ≤720 |

**Export note:** Stock `exportLoop` + `renderer.play()` under headless Chrome recorded **near-static** WebMs (kept as `exports/*-moving.headless-play-backup.webm`). Owner clips for visual motion QC were re-captured with the **same production renderer** (`renderAt(phase)`) + `MediaRecorder` + `CanvasCaptureMediaStreamTrack.requestFrame`. Phase 0 vs 0.5 stills are also under `exports/frames/`.

## Photographs tested

| Case | Source | Provenance | Native res |
|------|--------|------------|------------|
| A cloud | `sources/A-cloud-DSC00745.JPG` | SONY ILCE-6700, Waypoint Library 2026-07-26 | 6192×4128 |
| B water | `sources/B-water-DSC00314.JPG` | SONY ILCE-6700, Waypoint Library 2026-07-20 | 6192×4128 |
| C fog | `sources/C-fog-fogforest.jpg` | Panasonic DMC-LX7, Waypoint field asset 2018-08-09 | 3776×2520 |
| D wildlife | `sources/D-wildlife-Robin.JPG` | SONY ILCE-6700, owner camera roll 2026-06-07 | 6192×4128 |
| E static | `sources/E-static-Edited-8190413.JPG` | Olympus E-M10, Waypoint field asset 2018-08-19 | 4529×3397 |
| F complex | `sources/F-complex-mist-valley.jpg` | Unsplash landscape (repo-documented licensed asset) | 1600×1067 |

Not used: synthetic Attack-3 fixtures; AI images; diagrams.

---

## Case A — REAL cloud landscape

- **SOURCE:** `A-cloud-DSC00745.JPG` (Sony A6700)
- **RESOLUTION:** 6192×4128 → analysis ~150×100 → render 1920×1280
- **DETECTED CLASSES (selected):** clouds, water
- **CONFIDENCES:** clouds=91%, **water=100%**, fog=8%, haze=6%, foliage≈0%, grass=10%
- **SELECTED MOTION:** Clouds · Water (waterType=lake)
- **REJECTED / DEFERRED:** foliage, grass, rain, snow, light, stars, parallax
- **FALSE POSITIVES:** **sky/clouds → water (100%, typed as lake)** — major
- **STATIC STABILITY:** Tree silhouettes mostly excluded from water mask; fine twigs at ~160×100 are blocky
- **MASK QUALITY:** Coarse; water mask covers large cloud/sky band
- **MOTION REALISM:** Measurable warp (phase Δ mean≈7.6 / movedFrac≈0.23); reads as digital cloud/water shimmer, not real wind
- **LOOP QUALITY:** Sinusoidal; seams not catastrophic but effect is artificial
- **WILDLIFE:** n/a (`wildlifeProtected=false`)
- **Grade: C** — correct that clouds can move, but **water at 100% on a dry sky** and obvious warp keep this below “convincing”

### Visual inspection (10)

1. Localized? Partially — trees darker, but water class wrongly covers sky.  
2. Feels like photo? No — shimmer reads digital.  
3. Edges stable? Mostly coarse.  
4. Wrong class? **Yes — water.**  
5. Over-strong? Moderate–strong on clouds.  
6. Loop honest? Mechanically looping.  
7. Confidence honest? UI shows Water 100% lake — confident but wrong.  
8. Still vs moving clear? UI labels present.  
9. Mobile readable? Yes (screenshot).  
10. Would trust outdoors? No for classification.

---

## Case B — REAL water (lily pads)

- **SOURCE:** `B-water-DSC00314.JPG`
- **RESOLUTION:** 6192×4128 → analysis ~150×100 → render 1920×1280
- **DETECTED CLASSES:** water
- **CONFIDENCES:** water=100%, clouds=5%, fog=8%, haze=6%, foliage=1%
- **SELECTED MOTION:** Water (lake)
- **FALSE POSITIVES:** None primary (wildlife coverage ~1% unused)
- **STATIC STABILITY:** Pads partially in stable/wildlife masks; some bleed risk at pad edges
- **MASK QUALITY:** Water dominate; acceptable for class identity, soft on pad edges
- **MOTION REALISM:** Subtle (phase Δ mean≈1.6 / movedFrac≈0.028) — restrained ripple
- **LOOP QUALITY:** Acceptable for subtle water
- **Grade: B** — right class, subtle motion; still short of “could be real footage”

### Visual inspection (10)

1. Localized to water? Mostly.  
2. Photograph preserved? Better than A/C/E.  
3. Pad edges? Soft at sample res.  
4. Wrong class? No.  
5. Strength? Appropriately quiet.  
6. Loop? OK.  
7. Confidence? Honest high water.  
8. UI? Clear.  
9. Mobile? OK.  
10. Trust? Conditional — best of the six for class match.

---

## Case C — REAL fog forest

- **SOURCE:** `C-fog-fogforest.jpg` (Panasonic LX7, genuine fog)
- **RESOLUTION:** 3776×2520 → analysis ~150×100 → render 1920×1281
- **DETECTED CLASSES:** clouds, water
- **CONFIDENCES:** clouds=62%, **water=81%**, **fog=8%**, haze=6%, foliage=11%
- **SELECTED MOTION:** Clouds · Water — **fog never selected**
- **FALSE POSITIVES:** **fog → water (81%, lake)**; **fog → clouds (62%)**; fog class stuck at floor ~8%
- **STATIC STABILITY:** Trunks partially held; understory/fog band wrongly animated as water
- **MASK QUALITY:** Water mask fills fog and floor; noisy
- **MOTION REALISM:** Strong warp (phase Δ≈7.8) on wrong material
- **LOOP QUALITY:** Visibly digital
- **Grade: D** — genuine fog photograph animated as lake/clouds; fog confidence never rises

### Visual inspection (10)

1. Localized? Wrong regions.  
2. Feels real? No.  
3. Trunks stable? Partially.  
4. Wrong class? **Yes — water + clouds instead of fog.**  
5. Over-strong? Yes.  
6. Loop? Artificial.  
7. Confidence? Fog honesty missing (never deferred with a fog note).  
8. UI would show Clouds·Water.  
9. Mobile OK structurally.  
10. Trust? No.

---

## Case D — REAL wildlife (robin)

- **SOURCE:** `D-wildlife-Robin.JPG`
- **RESOLUTION:** 6192×4128 → analysis ~150×100 → render poster 1920×1280
- **DETECTED CLASSES:** *(none selected)*
- **CONFIDENCES:** water=31% (below 0.42), foliage=24%, clouds=5%, fog=8%, haze=6%
- **SELECTED MOTION:** **No motion** — refused
- **FALSE POSITIVES:** Water 31% on grass/fence (deferred); wildlife coverage only ~0.4%
- **WILDLIFE PROTECTION:** **`wildlifeProtected=false`** — bird not recognized as protected subject
- **STATIC STABILITY:** N/A (still)
- **MASK QUALITY:** Wildlife mask nearly empty
- **MOTION REALISM / LOOP:** n/a — poster only (`D-wildlife-poster.png`)
- **Grade: A** — correct automatic refusal; honesty note about low water confidence is clear. (Wildlife detection itself failed, but no harmful animation.)

### Visual inspection (10)

1–6. N/A motion.  
7. Honesty notes good.  
8. Refusal evidence preserved.  
9. Mobile OK.  
10. Trust for “do nothing”: yes.

---

## Case E — REAL static landscape (boardwalk forest)

- **SOURCE:** `E-static-Edited-8190413.JPG`
- **RESOLUTION:** 4529×3397 → analysis ~133×100 → render 1920×1440
- **DETECTED CLASSES:** water
- **CONFIDENCES:** **water=72%**, foliage=18%, clouds=5%, fog=8%, haze=6%
- **SELECTED MOTION:** Water (typed **river**) — **should have refused**
- **FALSE POSITIVES:** **boardwalk / sunlit grass / litter → water (72%)** — severe
- **STATIC STABILITY:** Broken — path and understory receive water motion (phase Δ mean≈4.5, movedFrac≈0.15)
- **MASK QUALITY:** Large white water blob on ground/path
- **MOTION REALISM:** Obvious digital crawl on dry forest
- **LOOP QUALITY:** Bad (wrong subject)
- **Grade: D** — no-motion case wrongly animated

### Visual inspection (10)

1. Localized? To wrong “water.”  
2. Feels like photo? No.  
3. Boardwalk edges? Disturbed.  
4. Wrong class? **Yes.**  
5. Over-strong? Yes for a dry scene.  
6. Loop? Artificial.  
7. Confidence? High and wrong.  
8. UI claims Water.  
9. Mobile OK.  
10. Trust? No.

---

## Case F — COMPLEX mixed (cloud-sea + mountains)

- **SOURCE:** `F-complex-mist-valley.jpg` (Unsplash, repo asset)
- **RESOLUTION:** 1600×1067 → analysis ~150×100 → render 1600×1067
- **DETECTED CLASSES:** clouds, water
- **CONFIDENCES:** clouds=53%, **water=100%**, fog=8%, haze=6%
- **SELECTED MOTION:** Clouds · Water (lake)
- **FALSE POSITIVES:** **cloud-sea → water 100%** (matches prior synthetic cloud-mountain water issue); **`wildlifeProtected=true`** with wildlife coverage ~5% on dark rock (false wildlife)
- **STATIC STABILITY:** Peaks partly held; sea of clouds treated as lake
- **MASK QUALITY:** Water dominates valley cloud layer
- **MOTION REALISM:** Noticeable digital flow (phase Δ≈5.0)
- **LOOP QUALITY:** Artificial lake-like crawl on clouds
- **Grade: C** — clouds partially correct, water FP dominates

### Visual inspection (10)

1. Localized? To cloud-sea (as water).  
2. Real? No — lake motion on vapor.  
3. Mountain edges? Rough but present.  
4. Wrong class? **Water + false wildlife protect.**  
5. Strength? Moderate–high.  
6. Loop? Digital.  
7. Confidence? Water overconfident.  
8. UI shows Clouds·Water.  
9. Mobile OK.  
10. Trust? No.

---

## Classification audit — every false positive observed

| Case | False positive | Confidence | Selected? |
|------|----------------|------------|-----------|
| A | sky/clouds → water (lake) | 100% | **yes** |
| C | fog → water (lake) | 81% | **yes** |
| C | fog → clouds | 62% | **yes** |
| C | fog class never rises | 8% | no |
| D | grass/fence → water (sub-threshold) | 31% | deferred |
| D | robin not detected as wildlife | coverage ~0.4% | `wildlifeProtected=false` |
| E | dry boardwalk/grass → water (river) | 72% | **yes** |
| F | cloud-sea → water (lake) | 100% | **yes** |
| F | dark rock → wildlife protect | coverage ~5% | `wildlifeProtected=true` |

No snow↔cloud or blue-siding cases in this set beyond A’s blue-sky→water.

## Grade summary

| Case | Grade | One-line |
|------|-------|----------|
| A cloud | **C** | Clouds OK-ish; water FP ruins trust |
| B water | **B** | Right class, subtle motion |
| C fog | **D** | Fog ignored; water/clouds animate vapor |
| D wildlife | **A** | Correct no-motion refusal |
| E static | **D** | Dry forest forced to “river” |
| F complex | **C** | Classic cloud-sea→water 100% |

## Artifacts

- `sources/` — real photographs + `SOURCES.md`
- `detection/*-detection.json`, `engine-meta.json`, `motion-phase-diff.json`, `webm-reexport.json`
- `exports/*-moving.webm`, posters, evidence JSON, phase compare frames
- `masks/*`
- `screenshots/desktop-1440.png`, `screenshots/mobile-390.png`
- This file: `REAL-PHOTO-QC.md`

## Major defects (do not fix in this block)

1. Classification still runs at **~160×100** on real multi-MP photos.  
2. **Water false positives** dominate: sky, fog, cloud-sea, dry boardwalk.  
3. **Fog confidence floor (~8%)** never selects genuine fog.  
4. **No-motion refusal fails** on static forest (E).  
5. **Wildlife protect** unreliable (misses robin; false-triggers on F rocks).  
6. Headless stock `exportLoop`/`play()` path can emit **static WebMs** — capture path risk for automation.
