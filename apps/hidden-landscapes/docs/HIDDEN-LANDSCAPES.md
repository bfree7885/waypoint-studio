# Hidden Landscapes

Long-term Waypoint Studio initiative inside **Waypoint Scenes**.

**Mission:** Reveal the invisible worlds that exist all around us.  
**Approach:** Education through beauty — with calm scientific honesty.

## Prototype scope (Studio)

`/apps/hidden-landscapes/` is a **local-first Hidden Landscapes Studio**:

- Upload JPEG / PNG / WebP (HEIF when the browser can decode it)
- Apply an extensible registry of **creative nature transformations**
- Compare original vs transformation (slider / side-by-side / toggle)
- Adjust intensity, reset, download a local preview
- Read mode explanations, capture requirements, and “How real is this?”

Processing uses **Canvas 2D** pixel remaps in the browser. Large images are downscaled for safe preview processing (max edge 1600px). Nothing is uploaded.

## Scientific honesty

A normal RGB photograph **cannot** become genuine infrared, ultraviolet, full-spectrum, thermal, or scientifically exact animal vision after capture.

| Category | Meaning |
|----------|---------|
| Original capture | Typical visible-light RGB |
| Creative simulation | Artistic false-color / mood remaps (this prototype) |
| Research-informed approximation | Educational reconstructions (e.g. Animal Vision) |
| Specialized capture required | Needs converted cameras / filters for real spectral data |

Never label a simple RGB color filter as genuine IR, UV, full spectrum, thermal, or authentic animal vision.

## Transformation registry

Source of truth: `data/transformations.json`

Each record includes: `id`, `name`, `shortDescription`, `longDescription`, `category`, `accuracyType`, `requiresSpecialCapture`, `defaultIntensity`, `processingParameters`, `futureEngineId`, `educationalNotes`.

Processors live in `js/hl-transforms.js` and are selected by id — UI must not hard-code mode math.

## VisionEngine

Implemented in `js/hl-vision-engine.js` (factory also registered for Scenes):

- `loadImage()` · `renderOriginal()` · `applyTransformation()` · `updateIntensity()`
- `reset()` · `exportImage()` · `dispose()`

Shared stub: `apps/scenes/js/engines/vision-engine.js`

## Creative simulations vs spectral captures

| Today | Future |
|-------|--------|
| Artistic remaps of visible RGB | `ImageSet` with visible / IR / UV / full-spectrum / polarized / night frames |
| Download preview JPEG | Specialized capture workflows + honest metadata |
| Animal Vision companion app | Optional species renders on ImageSets |

## Architecture

```
apps/hidden-landscapes/
  index.html                 # Studio
  gallery.html / learn.html  # Placeholders
  data/transformations.json  # Mode registry + education
  data/image-sets.json       # Future capture sets
  js/hl-transforms.js
  js/hl-vision-engine.js
  js/hl-studio.js
  js/hl-models.js            # ImageSet + catalogs
  css/hidden-landscapes.css
  docs/HIDDEN-LANDSCAPES.md
```

## Related

- Waypoint Scenes architecture: `apps/scenes/docs/ARCHITECTURE.md`
- Animal Vision: `apps/animal-vision/`
