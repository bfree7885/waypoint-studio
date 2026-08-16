# Hidden Landscapes + Animal Vision — Attack 4 README

**Mission:** Reveal outdoor information human vision often misses — science + photography + discovery — without inventing UV/IR/thermal into RGB photos.

## Routes

- Production studio: `/apps/hidden-landscapes/`
- Animal Vision entry: `/apps/animal-vision/` → `?pillar=animal`
- Library handoff: `/apps/hidden-landscapes/?libraryId=…`

## Pillars

1. **Light** — luminance, tonal structure, light concentration  
2. **Color** — families, warm/cool, saturation  
3. **Structure** — edges, texture, local contrast, estimated depth (INFERRED)  
4. **Animal Vision** — deer + canine SIMULATED; bee/bird UV UNAVAILABLE  

## Docs in this folder

- `AUDIT.md` — KEEP/REBUILD/REMOVE/DORMANT  
- `SCIENCE-AUDIT.md` — epistemic feature audit  
- `OWNER-VISUAL-QUESTIONS.md`  
- `real-photo-matrix/` — per-fixture visualization outputs  
- `screenshots/` — desktop/mobile  
- `capture-report.json`  

## Tests

```bash
node automation/test-hidden-landscapes.mjs
node automation/test-animal-vision.mjs
node automation/test-hl-science-claims.mjs
node automation/capture-hidden-landscapes-review.mjs
```

## Review ZIP

`/home/bryan/Hidden-Landscapes-Animal-Vision-Review.zip`
