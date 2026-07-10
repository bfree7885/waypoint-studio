# Photo Coach MVP Architecture

## Vertical slice

Upload → display → analyze → structured critique → local history.

No accounts, no cloud, no dashboard dependency.

## Modules

| Module | Responsibility |
|--------|----------------|
| `pc-image-loader.js` | File validation (JPEG/PNG), object URLs, dimension limits |
| `pc-image-metadata.js` | EXIF via shared `exif-reader.js`, capture metadata |
| `pc-pixel-sampler.js` | Canvas downsample and luminance/color signals |
| `pc-analysis-engine.js` | Heuristic critique from signals (honestly labeled) |
| `pc-critique-model.js` | Critique schema only |
| `pc-history-store.js` | localStorage + thumbnails |
| `pc-critique-renderer.js` | HTML presentation |
| `pc-app.js` | Orchestration and events |
| `pc-boot.js` | DOM ready |

## Capability today

- **Can determine:** brightness, contrast, warmth/coolness, highlight/shadow clip estimates, edge density, blur estimate, orientation, dimensions, optional EXIF (camera, ISO, focal length).
- **Cannot determine:** semantic subject ID, faces, specific objects, true focus plane, professional intent.
- All output is labeled **Heuristic analysis**.

## Future

Plug a vision API into `pc-analysis-engine.js` behind the same `PhotoCoachCritiqueModel` without changing UI modules.

## Legacy

Journey modules (`photo-coach-app.js`, conditions, opportunities, etc.) remain in the repo but are not loaded by the MVP entry point.
