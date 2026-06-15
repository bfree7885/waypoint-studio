# WDS Product Theming

Each Waypoint Studio product shares the same structure, spacing, typography, and components. **Product identity** comes from accent color, glow atmosphere, copy voice, and domain-specific page patterns — not from reinventing buttons or layout.

## Setting the product

```html
<html data-product="foragecast">
```

```js
WDS.core.setProduct("steepleaf");
```

## Accent tokens (per product)

| Token | Purpose |
|-------|---------|
| `--wds-accent` | Primary interactive accent, step numbers, active chips |
| `--wds-accent-dim` | Tinted backgrounds, toggle on-state |
| `--wds-warm` | Italic emphasis, rules, hearth glow |
| `--wds-product-glow` | Top radial atmosphere on `body::before` |

Defaults in `:root` match **Waypoint Scenes** (sage + hearth).

## Product personalities

### Waypoint Scenes (`scenes`)
**Domain:** Living photographs, parallax depth, field education, export.  
**Voice:** Homecoming after a shoot — "Unpack a frame", "Let the day breathe."  
**Key patterns:** Hero upload, workspace tabs, export stage, field guide lessons.

### ForageCast (`foragecast`)
**Domain:** Foraging seasons, weather, species timing.  
**Voice:** Patient, seasonal, grounded in place.  
**Key patterns:** Species pages, map + coords, educational lessons, collection galleries.

### Shed Hunting (`shed-hunting`)
**Domain:** Antler sheds, trails, observation logs.  
**Voice:** Quiet pursuit, reward in patience.  
**Key patterns:** Map waypoints, gallery grids, empty states for "no finds yet."

### Fieldry (`fieldry`)
**Domain:** Field notes, gear, journal workflows.  
**Voice:** Craftsmanship, leather-and-paper tactility.  
**Key patterns:** Forms, sidebar inspectors, export/share.

### Steepleaf (`steepleaf`)
**Domain:** Botany, plant identification, habitat.  
**Voice:** Curious naturalist, precise but welcoming.  
**Key patterns:** Species heroes, tags, lesson steps, search across taxa.

### Savant Sommelier (`savant-sommelier`)
**Domain:** Wine, terroir, tasting notes.  
**Voice:** Refined, sensory, unhurried.  
**Key patterns:** Collection pages, cards, educational content blocks.

### SignalTerrain (`signalterrain`)
**Domain:** Terrain analysis, signals, coordinates.  
**Voice:** Clear, technical, horizon-focused.  
**Key patterns:** Map chrome, mono coords, data-dense sidebars.

### Terrainbound (`terrainbound`)
**Domain:** Endurance, routes, terrain challenges.  
**Voice:** Steady, resilient, minimal.  
**Key patterns:** Export pages, map stages, strong empty states.

## What stays shared

- Ink/parchment neutral palette (`--wds-ink-*`, `--wds-parchment-*`)
- Display font: Cormorant Garamond
- Body font: Inter
- Spacing scale, radius, shadows, motion durations
- All `wds-*` components

## What varies per product

- `data-product` accent overrides
- Hero copy and eyebrow
- Which page patterns dominate (gallery vs map vs lessons)
- Optional product-specific CSS layer **after** `wds.css` (keep thin)

## Anti-patterns

- ❌ Forking button or card styles per product
- ❌ Different font families per app
- ❌ Bright saturated brand colors that break dark atmosphere
- ❌ Separate spacing or radius systems
- ✅ Thin product CSS that only handles domain layout (e.g. map provider overrides)

## Brand lockup

```html
<a class="wds-brand" href="https://waypoint.studio">
  <span class="wds-brand__mark" aria-hidden="true"></span>
  <span class="wds-brand__name">Product Name</span>
</a>
```

Mark gradient always uses `var(--wds-accent)` → `var(--wds-moss)` for ecosystem recognition.
