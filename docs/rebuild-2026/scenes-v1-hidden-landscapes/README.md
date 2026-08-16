# Hidden Landscapes + Animal Vision — Attack 4 + Photo-First Fix 1

**Mission:** Reveal outdoor information human vision often misses — science + photography + discovery — without inventing UV/IR/thermal into RGB photos.

**Product experience:** Photograph first. Choose what to reveal. See it. Discover. Optionally learn why.

## Routes

- Production studio: `/apps/hidden-landscapes/`
- Animal Vision entry: `/apps/animal-vision/` → `?pillar=animal`
- Library handoff: `/apps/hidden-landscapes/?libraryId=…`

## Pillars (discovery lenses)

1. **Light** — luminance, tonal structure, light concentration  
2. **Color** — families, warm/cool, saturation  
3. **Structure** — edges, texture, local contrast, estimated depth (INFERRED)  
4. **Animal Vision** — deer + canine SIMULATED; bee/bird UV UNAVAILABLE  

## Docs in this folder

- `PHOTO-FIRST-FIX1.md` — Fix 1 report + 50 gates + owner questions  
- `AUDIT.md` — KEEP/REBUILD/REMOVE/DORMANT  
- `SCIENCE-AUDIT.md` — epistemic feature audit  
- `OWNER-VISUAL-QUESTIONS.md`  
- `BEFORE/` — Attack 4 screenshots (pre photo-first)  
- `screenshots/` — AFTER photo-first viewports  
- `real-photo-matrix/` — per-fixture visualization outputs  
- `capture-report.json`  

## Tests

```bash
node automation/test-hidden-landscapes.mjs
node automation/test-animal-vision.mjs
node automation/test-hl-science-claims.mjs
node automation/capture-hidden-landscapes-review.mjs
```

## Review ZIP

`/home/bryan/Hidden-Landscapes-Photo-First-Review.zip`
