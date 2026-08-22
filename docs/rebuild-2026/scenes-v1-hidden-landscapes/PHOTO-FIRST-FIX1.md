# Hidden Landscapes — Photo-First Discovery (Fix 1)

**Branch:** `fix/hidden-landscapes-photo-first`  
**Base:** production `main` @ `b21bcb7` (Attack 4)  
**Date:** 2026-08-16  

## Objective

Repair product experience so Hidden Landscapes feels like **museum + field guide + light table** — photograph and discovery first; science when wanted.

## Root causes

1. Attack 4 shipped honest science with a **workstation hierarchy** (copy + panels before the photo).
2. Scenes local nav used long labels (`Other ways of seeing`) with mobile `nowrap` + overflow patterns that clipped or invited page h-scroll.
3. Epistemic methodology led the UI; progressive disclosure was missing.
4. Empty state still exposed analysis chrome (“Light table”) without a photograph.

## What changed (smallest surface)

| Area | Change |
|------|--------|
| HTML | Import-only empty state; discovery stage with photo first; Why? `<details>` |
| CSS | Immersive stage; compact loaded hero; `[hidden]` respected; mobile photo order |
| UI JS | Immediate photo paint; discovery copy; quiet badges; animal Human↔species compare |
| Discoveries | Pillar-filtered; max 1+2 |
| Nav | Label **Hidden Landscapes**; shortLabels; wrap (no clip / no page h-scroll) |
| Science | **Frozen** — transforms, epistemic labels, UNAVAILABLE UV/IR/thermal unchanged |

## Tests

```bash
node automation/test-hidden-landscapes.mjs   # 45 PASS
node automation/test-animal-vision.mjs       # 23 PASS
node automation/test-hl-science-claims.mjs   # 20 PASS
```

Capture: `node automation/capture-hidden-landscapes-review.mjs` — 20/20 fixtures OK; navQc390 `pageHScroll: false`.

## Owner visual questions (1–16)

1. **Does the empty state invite a photograph first?** Yes — large import plane; no analysis chrome.
2. **Is the product named Hidden Landscapes?** Yes — H1 + Scenes nav (not “Other ways of seeing”).
3. **Is the promise one line?** Yes — “Look again — light, color, structure, and animal vision…”
4. **Photo → choose → see → discover → optionally why?** Yes.
5. **Light/Color/Structure feel observational?** Yes — short leads; science in Why?.
6. **Structure read as bones of the photo?** Yes — edges default + copy.
7. **Animal Vision photo-first Human↔Deer/Canine?** Yes — desktop side-by-side; mobile toggle.
8. **What Changed photo-specific, 1–3?** Yes.
9. **SIMULATED DEER/CANINE VISION labels?** Yes.
10. **Methodology not leading?** Yes — Why? disclosure.
11. **Provenance badges quiet?** Yes — `hl-ep--quiet`.
12. **UV/IR/thermal educational UNAVAILABLE?** Yes — bee/bird + spectral section.
13. **One primary + optional discoveries?** Yes — capped 3, pillar-filtered.
14. **Region highlight when practical?** Yes — Highlight control when region exists.
15. **Mobile 390/430: photo near top; nav no page h-scroll?** Yes — QC: `pageHScroll: false`; compact labels wrap.
16. **Feels like Waypoint discovery, not GIS?** Improved — remaining chrome is intentional compare + lenses.

## 50 gates (applicable → YES)

| # | Gate | Result |
|---|------|--------|
| 1 | Science methods frozen (luminance/tonal/structure) | YES |
| 2 | Inferred-depth labeling preserved | YES |
| 3 | Original default when edit exists | YES |
| 4 | Deer/canine transforms unchanged | YES |
| 5 | SIMULATED/COMPUTED/INFERRED/UNAVAILABLE vocabulary | YES |
| 6 | No fabricated UV/IR/thermal | YES |
| 7 | Local-first / never uploaded | YES |
| 8 | Privacy concise | YES |
| 9 | No new species/modes/AI/cloud | YES |
| 10 | Photo hero once loaded | YES |
| 11 | Library entry: title + promise + photo + lenses | YES |
| 12 | Import-only empty (no analysis UI) | YES |
| 13 | Product name Hidden Landscapes | YES |
| 14 | Simple discovery lenses | YES |
| 15 | No scientific params in primary UI | YES |
| 16 | Light: large visual + 1–2 observations | YES |
| 17 | Color: large visual + 1–2 observations | YES |
| 18 | Structure: bones of photo | YES |
| 19 | Animal Vision compare photo-first | YES |
| 20 | What Changed 1–3 | YES |
| 21 | SIMULATED DEER/CANINE VISION | YES |
| 22 | Don’t lead with methodology | YES |
| 23 | Quiet provenance badges | YES |
| 24 | Why? progressive disclosure | YES |
| 25 | UNAVAILABLE UV educational | YES |
| 26 | One primary discovery + optional | YES |
| 27 | Region highlight practical | YES |
| 28 | Workstation clutter reduced | YES |
| 29 | Immersive 1440 | YES |
| 30 | Immersive 1728 | YES |
| 31 | Mobile 390 photo near top | YES |
| 32 | Mobile 430 photo near top | YES |
| 33 | Nav overflow fixed (no clip) | YES |
| 34 | No page h-scroll | YES |
| 35 | Compact Scenes nav | YES |
| 36 | Concise privacy | YES |
| 37 | Short curious copy / Waypoint voice | YES |
| 38 | Existing design system | YES |
| 39 | Subtle transitions | YES |
| 40 | Photo visible during load | YES |
| 41 | a11y: skip link, labels, aria-pressed, busy | YES |
| 42 | Same Attack 4 real-photo corpus | YES |
| 43 | Owner examples A–F in matrix | YES |
| 44 | Regression-only Coach/Auto Edit/Moving/Library/Dashboard | YES (nav shortLabels only) |
| 45 | No Moving Scenes reopen | YES |
| 46 | Review ZIP produced | YES |
| 47 | Tests pass | YES |
| 48 | Screenshots 390/430/1440/1728 | YES |
| 49 | One coherent PR | YES |
| 50 | STOP after this fix | YES |

## Risks

- Global Scenes nav shortLabels affect all Scenes children (intentional compact pattern).
- Synthetic fixtures look flat in luminance; owner A–F and real matrix remain the visual truth.
