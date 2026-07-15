# Hidden Landscapes

Long-term Waypoint Studio initiative inside **Waypoint Scenes**.

**Mission:** Reveal the invisible worlds that exist all around us.  
**Approach:** Education through beauty — with calm scientific honesty.

## Prototype scope (Studio V0.1)

`/apps/hidden-landscapes/` is a **local-first Hidden Landscapes Studio**:

- Upload JPEG / PNG (WebP and a few other browser-decodable formats when supported)
- Apply an extensible registry of **creative nature transformations**
- Compare original vs transformation (slider / side-by-side / toggle)
- Adjust intensity, reset, download a local preview
- Read mode explanations, capture requirements, and “How real is this?”

Processing uses **Canvas 2D** pixel remaps in the browser. Large images are downscaled for safe preview processing (max edge 1600px). Nothing is uploaded. HEIF/RAW are not claimed as supported.

## Scientific honesty

A normal RGB photograph **cannot** become genuine infrared, ultraviolet, full-spectrum, thermal, or scientifically exact animal vision after capture.

| Category | Meaning |
|----------|---------|
| Visible-light original | Typical visible-light RGB |
| Creative false-color interpretation | Artistic remaps (this prototype) |
| Research-informed approximation | Educational reconstructions (e.g. Animal Vision companion) |
| Specialized capture required | Needs converted cameras / filters for real spectral data |

Never label a simple RGB color remap as genuine IR, UV, full spectrum, thermal, or authentic animal vision.

## Transformation registry

Source of truth: `data/transformations.json`

Each record includes: `id`, `name`, `shortDescription`, `longDescription`, `category`, `accuracyType`, `requiresSpecialCapture`, `defaultIntensity`, `processingParameters`, `futureEngineId`, `educationalNotes`.

Initial modes: Original, Infrared Dream, Crimson Canopy, Violet Wilds, Ghost Forest, Electric Meadow, Nocturnal World, Monochrome Infrared.

Processors live in `js/hl-transforms.js` and are selected by id — UI must not hard-code mode math. Every transformation starts from the unchanged original buffer.

## VisionEngine

Implemented in `js/hl-vision-engine.js` (factory also registered for Scenes):

- `loadImage()` / `createProcessingSource()` · `renderOriginal()` · `applyTransformation()` · `updateIntensity()`
- `renderComparison()` (state + canvases) · `reset()` · `exportImage()` · `dispose()`

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
  learn.html / gallery.html  # Education + future gallery scaffolds
  data/transformations.json  # Mode registry + honesty + education
  data/image-sets.json       # ImageSet scaffolds (no fabricated spectral metadata)
  js/hl-transforms.js        # Pixel processors
  js/hl-vision-engine.js     # Local processing lifecycle
  js/hl-studio.js            # UI
  docs/HIDDEN-LANDSCAPES.md
```

## Related

- Platform shell: `/apps/scenes/` · module landing: `/apps/scenes/hidden-landscapes/`
- Animal Vision companion: `/apps/animal-vision/`
