# Waypoint Studio Design System (WDS)

**Design System 2.0** — Contemporary Field Station · Topographic Atlas · High-Desert / Southwestern Landscape.

Canonical tokens: `--wp-*` (`css/wds-tokens.css`). Compatibility: `--wds-*`.  
Guide: [`../docs/DESIGN-SYSTEM-2.0.md`](../docs/DESIGN-SYSTEM-2.0.md) · Reference: [`patterns/waypoint-2.0.html`](patterns/waypoint-2.0.html)

The official shared design language for every Waypoint Studio product.


**North star:** *Bring Nature to Life* — tools that feel like returning home from a day outdoors: warm, quiet, precise, and respectful of the subject.

## Products

Public architecture is **Dashboard (Waypoint Studio) · Shed Hunting · Deck · Publishing**.
Scenes photography tools remain in the repo but are unpublished. See `docs/PRODUCT-DIRECTION.md`.

| Product | `data-product` | Public | Accent character |
|---------|----------------|--------|------------------|
| Waypoint Studio / Dashboard | `dashboard`, `studio-home` | yes | Terracotta / ochre |
| Shed Hunting | `shed-hunting` | yes (sibling) | Terracotta / sage |
| Waypoint Scenes | `scenes` | unpublished | Ochre |
| Articles / DFD | `articles`, `deep-forest-dispatch` | yes | Terracotta / ochre |
| Waypoint Deck | `waypoint-deck` | yes (distinct project) | Terracotta / desert purple |

See [STRATEGIC-DIRECTION.md](../docs/STRATEGIC-DIRECTION.md).

## Quick start

```html
<html lang="en" data-product="scenes">
<head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="design-system/css/wds.css">
</head>
<body>
  <div class="wds-app">…</div>
  <script src="design-system/js/wds-core.js" defer></script>
</body>
</html>
```

Or load all JS modules:

```html
<script src="design-system/js/wds.js" defer></script>
```

## Package structure

```
design-system/
├── css/
│   ├── wds-tokens.css      # --wds-* variables + product accents
│   ├── wds-base.css        # Reset, typography, atmosphere
│   ├── wds-components.css  # Buttons, cards, tabs, pages…
│   └── wds.css             # Single import
├── js/
│   ├── wds-core.js         # Motion, a11y, validation
│   ├── wds-tabs.js         # Accessible tablist
│   ├── wds-upload.js       # File + drag-drop
│   ├── wds-search.js       # Search + filter
│   └── wds.js              # Loader bundle
├── docs/
│   ├── PATTERNS.md         # HTML patterns
│   ├── PRODUCTS.md         # Per-product guidance
│   └── MOTION.md           # Animation philosophy
└── patterns/
    └── reference.html      # Living component gallery
```

## Design principles

1. **One family, not eight clones** — Shared tokens and components; product accents via `data-product`, not separate design stacks.
2. **Nature first** — Photography and field content lead; chrome stays quiet.
3. **Calm motion** — Slow, intentional transitions; respect `prefers-reduced-motion`.
4. **Local-first dignity** — Copy and UI assume the user's work stays on their machine.
5. **Accessible by default** — Focus rings, ARIA tab patterns, live regions, keyboard paths.

## Tokens

All products consume `--wds-*` custom properties. Waypoint Scenes also maps legacy `--ws-*` aliases in `wds-tokens.css`.

Key groups: color primitives, semantic surfaces, typography scale, 4px spacing grid, radius, elevation, motion durations, z-index stack.

## Class naming

- **Canonical:** `wds-*` (e.g. `wds-btn`, `wds-hero`, `wds-gallery`)
- **Legacy aliases:** Existing Scenes classes (`.btn`, `.hero`, `.workspace-tab`) map to the same styles for gradual migration.

## Documentation

- [HTML patterns](docs/PATTERNS.md)
- [Product theming](docs/PRODUCTS.md)
- [Motion philosophy](docs/MOTION.md)
- [Reference gallery](patterns/reference.html)
- [Education Framework](education/README.md) — shared Learn engine (WEF) · [nine pillars](../docs/WAYPOINT-EDUCATIONAL-FRAMEWORK.md)
- [Field Guide Design System](field-guide/README.md) — Peterson-style page templates (FGDS)
- [Homepage components](homepage/README.md) — reusable ecosystem home sections
- [Shared content library](content/README.md) — placeholder cards (50×6)
- [Field Guide Standards](../docs/FIELD-GUIDE-STANDARDS.md) — official educational page standard
- [Product FGDS Audit](../docs/PRODUCT-FGDS-AUDIT.md) — per-product inheritance
- [Content Engine](content-engine/README.md) — regional publishing (`WDS.contentEngine`)
- [Ecosystem Blueprint](../docs/ECOSYSTEM-BLUEPRINT.md) — master IA: Home, Learn, Gallery, Field Notes, News, Videos, Tools
- [Unified Roadmap](../docs/ROADMAP.md)
- [Constitution](../docs/WAYPOINT-STUDIO-CONSTITUTION.md) · [Waypoint Method](../docs/WAYPOINT-METHOD.md)
- [Waypoint Observation Standard (WOS)](../docs/WAYPOINT-OBSERVATION-STANDARD.md) · [schema](observations/schema-v1.json)
- [Research Integrity](../docs/RESEARCH-INTEGRITY.md) · `WDS.researchIntegrity`
- [Outdoor Ethics (WOES)](../docs/WAYPOINT-OUTDOOR-ETHICS-STANDARD.md) · `WDS.outdoorEthics`
- [Product shell template](patterns/product-shell.html)

## Adoption checklist

- [ ] Set `data-product` on `<html>`
- [ ] Link `wds.css` before product-specific CSS
- [ ] Replace ad-hoc colors with `--wds-*` tokens
- [ ] Use `WDS.tabs`, `WDS.upload`, `WDS.search` where applicable
- [ ] Verify keyboard navigation and reduced-motion behavior
