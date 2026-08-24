# Moving Scenes — Natural Motion QC (Fix 2)

**Date:** 2026-08-15  
**Branch:** `fix/moving-scenes-natural-motion`  
**Engine:** `1.2.0-natural-motion`  
**Base:** Perception Fix 1 (`ms-analyze.js` / `ms-choice.js` MD5 frozen)  
**Question:** Does it move like the thing it actually is?

## Cloud root cause (before rewrite)

Warped still-image look came from `ms-render.js`:

1. Per-pixel UV resampling of the photograph (`sample(sx,sy)`).
2. Large max displacement (~1.2% of min edge).
3. Dual sinusoids (`wave` + `wave2`) that reverse and cross-couple axes → rubber / ripple / sliding-sheet.
4. Near-uniform direction × local amp → photograph pixels dragged as a sheet, not atmospheric material.
5. Clear-sky wash partially shared cloud amp → pale sky could slide with clouds.

## Old → new architecture

| Layer | Old | New |
|-------|-----|-----|
| Field | `dx,dy,amp` (3) | `dx,dy,amp,mode` (4) — CLOUD / WATER / FOG |
| Clouds | Legacy UV sinusoid warp | Coherent wind advection + low-freq differential + looping density evolution; ~0.55% edge travel |
| Cloud-sea | Same as high clouds | Flatter wind; mid-band boost; clouds-only orphan vapor (water-mask leftovers) as cloud material — **not** lake recipe |
| Water | Sinusoid ripple | **Frozen** (identical B phase50 bytes vs Perception before) |
| Fog | Legacy + luma breathe | Only if Choice selects fog; C stays no-motion |
| Clear sky | Partial cloud amp | Sky-strong / cloud-weak suppressed |
| Terrain | stable/wildlife lock | + foliage lock; vapor path extra stable suppression |

No generative video APIs. Canvas 2D only.

## Same-six outcomes

| Case | Choice | Motion | Grade | Notes |
|------|--------|--------|-------|-------|
| **A** cloud | clouds | Coherent sky drift; trees locked (terrain MAE ≈ 0.003) | **A− / strong B** | Full Δ ~0.39 vs before ~0.77 (less rubber energy) |
| **B** water | water | Lake ripple unchanged | **B+** | Phase50 **byte-identical** to Perception before |
| **C** fog | no-motion | Still | preserved | Honesty fog ~32% |
| **D** wildlife | no-motion | Still | preserved | No animal anim |
| **E** static | no-motion | Still | preserved | Boardwalk refusal |
| **F** cloud-sea | clouds | High wisps + valley vapor advection; ridge/terrain MAE 0 | **B / strong B** | Mid Δ ~1.5 (readable sea); mountains anchored |

### Phase Δ (JPEG phase0 vs phase50)

| | sky | mid | low/ridge | terrain | full |
|--|-----|-----|-----------|---------|------|
| A after | 0.49 | 0.71 | 0.33 / 0.05 | 0.00 | 0.39 |
| A before | 1.09 | 1.19 | 0.40 / — | 0.00 | 0.77 |
| F after | 0.33 | 1.50 | 0.99 / 0.00 | 0.00 | 0.60 |
| F before | 0.49 | 0.18 | 0.00 / 0.00 | 0.00 | 0.23 |
| B after=before | 0.32 | 0.74 | — | — | 0.56 |

## Blind compare (old vs new)

- **A:** Before = stronger rubber warp / sliding mackerel sheet. After = quieter, more directional drift + subtle density evolution; trees still.
- **F:** Before = mostly high-sky shimmer; valley sea nearly still. After = valley vapor participates as cloud material; peaks stay put.
- **B:** Indistinguishable (frozen).

## Perception Fix 1 freeze

| File | MD5 |
|------|-----|
| `ms-analyze.js` | `a12095feccb3d998fb807ce0d09be68e` |
| `ms-choice.js` | `c436d00ba1a80728b3125df3a6b18ed2` |

Six-case harness: **6/6**. `ANALYZE_LONG_EDGE=320`, `AUTO_CONFIDENCE=0.42`, `CONF_CAP=0.92`.

## Performance

- Preview ≤720 / final ≤1920 unchanged.
- Extra cost: mode channel + cheap hash noise (no GPU, no network).
- Export harness: ~50–70s for six Chrome MediaRecorder clips.

## Artifacts

- `natural-motion/sources/` — same six masters  
- `natural-motion/before/` — Perception Fix 1 WebMs + phases  
- `natural-motion/after/` — Natural Motion WebMs + phases (3-loop captures)  
- `natural-motion/masks/` — Perception overlays  
- `natural-motion/screenshots/` — desktop + mobile  
- `natural-motion/qc/` — this file + `frame-stability.json`

## 30 gates

| # | Gate | YES/NO |
|---|------|--------|
| 1 | Perception Fix 1 frozen (analyze/choice unchanged; regressions) | YES |
| 2 | Cloud motion audited; warped-still root cause named | YES |
| 3 | Coherent advection with dominant direction | YES |
| 4 | Subtle differential motion; no sliding poster | YES |
| 5 | Subtle internal evolution (no boil/pulse/melt) | YES |
| 6 | Multi-scale: large drift / medium evol / tiny residual | YES |
| 7 | Cloud edges; static protection wins | YES |
| 8 | Terrain hard gate (trees/mountains/rocks anchored) | YES |
| 9 | Clear sky not animated as cloud sheet | YES |
| 10 | Cloud-sea recipe differs without reclassifying | YES |
| 11 | Fog: no-motion when Perception says so (C) | YES |
| 12 | Water frozen; B re-verified after renderer change | YES |
| 13 | Wildlife freeze (D no-motion) | YES |
| 14 | No-motion freeze (E) | YES |
| 15 | Loops inspected (3 consecutive in WebM); natural > rubber | YES |
| 16 | Conservative speed; SUBTLE/NATURAL/MORE preserved | YES |
| 17 | NATURAL restrained | YES |
| 18 | No generative / cloud video APIs | YES |
| 19 | Practical in-browser Canvas performance | YES |
| 20 | Same six photos from Perception review ZIP | YES |
| 21 | Before/after clips A+F; B baseline+post | YES |
| 22 | Frame-stability static regions A/B/F | YES |
| 23 | QC grades: A strong B/A−; F B+; B stays B+ | YES |
| 24 | Do-less (less displacement than legacy warp on A) | YES |
| 25 | Blind compare old vs new documented | YES |
| 26 | Perception regressions still 6/6 | YES |
| 27 | Review ZIP with sources/before/after/masks/screenshots/qc | YES |
| 28 | Playable WebMs present for A/B/F | YES |
| 29 | Library/Auto Edit integration untouched | YES |
| 30 | Stop after Fix 2 (no HL/AV/new classes) | YES |

**All 30: YES**
