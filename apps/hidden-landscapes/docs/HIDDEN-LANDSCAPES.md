# Hidden Landscapes

Long-term Waypoint Studio initiative inside **Waypoint Scenes**.

**Mission:** Reveal the invisible worlds that exist all around us.  
**Approach:** Education through beauty — not a filter gallery.

This directory is **scaffold only**. No capture, compare, or AI pipelines are implemented yet.

## Architecture

```
apps/hidden-landscapes/
  index.html                 # Home — mission + section map
  gallery.html               # Gallery placeholder
  learn.html                 # Learn placeholder
  css/hidden-landscapes.css  # Mobile-first layout
  data/
    sections.json            # Home section copy
    vision-modes.json        # VisionMode catalog
    species.json             # Species catalog
    camera-systems.json      # CameraSystem catalog
    filters.json             # Filter catalog
    wavelengths.json         # Wavelength bands
    image-sets.json          # ImageSet examples (empty frames)
  js/
    hl-models.js             # Factories: VisionMode, Species, CameraSystem, Filter, Wavelength, ImageSet
    hl-store.js              # Catalog load + localStorage drafts
    hl-home.js               # Home / placeholder renderers
    hl-boot.js               # Boot
  docs/HIDDEN-LANDSCAPES.md  # this file
```

| Concern | Module |
|---------|--------|
| Domain shapes | `hl-models.js` |
| Catalog JSON | `data/*.json` via `hl-store.js` |
| Local drafts | `localStorage` key `waypoint-hidden-landscapes-drafts-v1` |
| Home sections | `data/sections.json` → `hl-home.js` |
| Species simulations (future) | Prefer `apps/animal-vision/` |
| AI analysis | **TODO** — local-only; never upload image bytes by default |
| Rendering pipelines | **TODO** — IR / UV / full-spectrum / polarization / night |
| Compare UI | **TODO** — ImageSet viewer (side-by-side, slider, mode toggle) |

## Core types

### VisionMode
A named way of seeing (human, infrared, UV, full spectrum, polarization, species, macro, night, seasonal, weather).

### Species
Organism record for educational simulations; may link to Animal Vision ids.

### CameraSystem / Filter / Wavelength
Gear and spectral vocabulary for ImageSet metadata.

### ImageSet
One place/moment with optional frames:

- Human, infrared, UV, full spectrum
- Species simulations (`speciesId` + frame)
- Metadata: GPS (local-only privacy default), date, weather, camera, lens, filters
- `scientificExplanation`, `photographyNotes`
- Local media refs only

## Privacy

- Local-first where practical.
- Drafts stay in the browser unless a future sync option is explicitly enabled.
- GPS default privacy: `local-only`.

## Status

Scaffold. Wire into Scenes local nav; expand catalogs and pipelines in later milestones.

## Related

- [Animal Vision](../../animal-vision/docs/ANIMAL-VISION.md)
- Waypoint Scenes hub: `/apps/scenes/`
