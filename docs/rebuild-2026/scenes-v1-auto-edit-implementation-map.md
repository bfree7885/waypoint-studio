# Scenes V1 Attack 2 — Auto Edit Implementation Map

**Branch:** `feat/scenes-v1-auto-edit`  
**Base:** Attack 1 Coach + Library excellence (local `300f80d2`; production claimed `91601b4` / PR #35)  
**Scope:** Waypoint Auto Edit finishing studio + minimal Coach/Library/nav integration.  
**Dashboard:** FROZEN. Moving Scenes = Attack 3 (preserved; not built here).

## Authoritative paths

| Concern | Path |
|---------|------|
| Auto Edit UI | `apps/auto-edit/index.html`, `css/auto-edit.css` |
| Signals / strategy / ops | `apps/auto-edit/js/ae-signals.js`, `ae-strategy.js`, `ae-ops.js`, `ae-restraint.js` |
| Pipeline / recipe / store | `ae-pipeline.js`, `ae-models.js`, `ae-store.js` |
| Compare / export / UI | `ae-compare.js`, `ae-export.js`, `ae-ui.js`, `ae-boot.js` |
| Worker (optional) | `apps/auto-edit/workers/ae-worker.js` |
| Hub redirect | `apps/scenes/auto-edit/index.html` |
| Coach analysis signals (reuse) | `apps/waypoint-scenes/js/photo-coach-analysis-demo.js` |
| Edit *suggestions* (not apply) | `apps/waypoint-scenes/js/photo-coach-edit-intelligence.js` |
| Library SoT | `apps/photo-library/js/pl-*.js` + IDB `waypoint-photo-library-media-v1` |
| Library client handoff | `apps/waypoint-scenes/js/photo-library-client.js` |
| EXIF | `apps/waypoint-scenes/js/exif-reader.js` |
| HL pixel remaps (creative; do not reuse as finish) | `apps/hidden-landscapes/js/hl-transforms.js` |
| Living / Moving prototypes | `apps/waypoint-scenes/`, `apps/scenes/living-scenes/` — **leave intact** |

## Storage (additive)

| Key | Role |
|-----|------|
| `waypoint-auto-edit-recipes-v1` | Recipe index (localStorage) |
| IDB media id `edit-{originalId}-v{n}` | Waypoint Edit blob (`kind: waypoint-edit`) |
| Library `moduleRefs.autoEdit` | Link from ORIGINAL → edit metadata |
| Library image `role: "waypoint-edit"` | Optional sibling catalog row (never replaces original) |

## Reuse decisions

- **Reuse** Coach luminance/histogram/color/edge ideas via Auto Edit’s own `ae-signals` (same math family; no second Library).
- **Reuse** Library media IDB for edit blobs (`putMedia` with distinct keys).
- **Do not** treat Hidden Landscapes transforms as photographic finishing.
- **Do not** overwrite original blob keys.
- **Do not** delete or repurpose Living Scenes into Auto Edit.

## Product promise

> Waypoint automatically finishes outdoor photographs while keeping results natural and preserving originals.  
> Processed on this device. JPEG/PNG V1 — not RAW.

## Intents (V1)

Waypoint Choice (default), Natural, Field Guide, Atmospheric, Wildlife, Landscape, Monochrome.

## Attack 3 handoff

Moving Scenes (formerly Living Scenes) remains the next approved attack. Library may say “Make it move — coming next” without a dead button that pretends the feature ships.
