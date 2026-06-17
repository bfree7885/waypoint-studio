# Field Guide Design System (FGDS)

Peterson-style educational page templates for every Waypoint Studio product.

**Standard:** [`docs/FIELD-GUIDE-STANDARDS.md`](../../docs/FIELD-GUIDE-STANDARDS.md)

## Quick start

```html
<link rel="stylesheet" href="path/to/design-system/css/wds.css">
```

FGDS is included automatically via `wds-field-guide.css`.

## Templates

| Template | Path |
|----------|------|
| Species Guide | [`templates/species-guide.html`](templates/species-guide.html) |
| Habitat Guide | [`templates/habitat-guide.html`](templates/habitat-guide.html) |
| Ecosystem Guide | [`templates/ecosystem-guide.html`](templates/ecosystem-guide.html) |
| Weather Guide | [`templates/weather-guide.html`](templates/weather-guide.html) |
| Geology Guide | [`templates/geology-guide.html`](templates/geology-guide.html) |
| Photography Guide | [`templates/photography-guide.html`](templates/photography-guide.html) |
| Equipment Guide | [`templates/equipment-guide.html`](templates/equipment-guide.html) |
| Research Brief | [`templates/research-brief.html`](templates/research-brief.html) |
| Outdoor Challenge | [`templates/outdoor-challenge.html`](templates/outdoor-challenge.html) |
| Seasonal Journal | [`templates/seasonal-journal.html`](templates/seasonal-journal.html) |
| Field Investigation | [`templates/field-investigation.html`](templates/field-investigation.html) |

Browse all: [`index.html`](index.html) (serve from repo root).

## Regenerate templates

```bash
python3 design-system/scripts/generate-foundation.py
```
