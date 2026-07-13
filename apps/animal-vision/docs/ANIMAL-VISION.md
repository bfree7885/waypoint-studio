# Animal Vision

Research-informed educational visualizations inside **Waypoint Scenes**.

Photographers and nature enthusiasts can upload a local photograph and explore approximate visual translations for three species. This is not an artistic filter app and not AI image generation.

## Mission fit

**Observe. Understand. Create. Share.**

The aim is careful noticing — not entertainment, scores, or social features.

## Architecture

```
apps/animal-vision/
  index.html                 # page shell + App Shell mounts
  css/animal-vision.css
  data/species.json          # species + transform parameters (source of truth)
  js/
    animal-vision-species.js     # config loader
    animal-vision-transforms.js  # canvas pixel transforms
    animal-vision-export.js      # JPEG/PNG download
    animal-vision-app.js         # UI orchestration
    animal-vision-boot.js        # load config → init
  docs/ANIMAL-VISION.md      # this file
```

| Concern | Module |
|---------|--------|
| Upload handling | `animal-vision-app.js` (object URLs, revoke on reset) |
| Transform engine | `animal-vision-transforms.js` |
| Species configuration | `data/species.json` via `animal-vision-species.js` |
| Rendering / compare | `animal-vision-app.js` (side-by-side, slider, toggle) |
| Explanation copy | Rendered from species config fields |
| Export | `animal-vision-export.js` |

UI components must not hardcode the species list. Add species by editing `data/species.json` and registering a transform id in `animal-vision-transforms.js`.

## Privacy model

- Processing uses the Canvas API in the browser only.
- Uploaded files become `blob:` object URLs; they are never `fetch`ed to a remote host.
- Export uses `canvas.toBlob` + a local download link.
- No analytics hooks include image bytes.

Visible copy: **Processed locally. Your photographs are never uploaded.**

## Scientific limitations

Always use language such as:

- research-informed interpretation
- educational visualization
- approximate visual translation

Never claim exact animal vision, true UV recovery, or scientifically exact recreation.

Display under every interpretation:

> Animal Vision is a research-informed educational visualization. Animal perception is far more complex than can be reproduced on a human display.

### Honeybee / ultraviolet

Ordinary photographs have no ultraviolet channel. The honeybee mode is explicitly a **UV-inspired educational interpretation** — it remaps RGB tones; it does not recover UV reflectance.

### Still photographs

Motion sensitivity, temporal resolution, and true panoramic fields of view cannot be represented in a single still frame. Soft periphery and texture cues are suggestive only.

## MVP species

1. White-tailed Deer (*Odocoileus virginianus*)
2. Honeybee (*Apis mellifera*)
3. Eastern Box Turtle (*Terrapene carolina*)

## Adding a species later

1. Append an object to `data/species.json` with vision metadata and a `transform` block.
2. Implement `REGISTRY[transform.id]` in `animal-vision-transforms.js`.
3. Keep educational notes honest about what cannot be shown.
4. Extend `automation/test-animal-vision.mjs` with a transform smoke assertion.
5. Do not invent objects or use generative models.

## Navigation

Registered under Scenes in `design-system/ecosystem/nav-registry.json` (sync `wds-app-nav-config.js`). Hub card lives on `apps/scenes/index.html`.
