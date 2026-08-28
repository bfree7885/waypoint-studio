# WDS Design Tokens (Design System 2.0)

Canonical CSS custom properties live in `wds-tokens.css`.

**Brand primitives:** `--waypoint-*`  
**Canonical API:** `--wp-*` (derived from `--waypoint-*`)  
**Compatibility:** `--wds-*` and `--ws-*` map onto `--wp-*`.

Full agent guide: [`docs/DESIGN-SYSTEM-2.0.md`](../../docs/DESIGN-SYSTEM-2.0.md) · Palette: [`docs/SOUTHWEST-COLOR-SYSTEM.md`](../../docs/SOUTHWEST-COLOR-SYSTEM.md) · Reference: [`patterns/waypoint-2.0.html`](../patterns/waypoint-2.0.html)

## Color primitives (dusk-desert)

| Token | Role |
|-------|------|
| `--waypoint-charcoal` / `--wp-bg` | Warm charcoal ground |
| `--waypoint-espresso` / `--wp-elevated` | Raised espresso / plum-brown |
| `--waypoint-bone`, `--waypoint-sand`, `--waypoint-tan` | Text / warm neutrals |
| `--wp-brand` / `--waypoint-orange` | Terracotta signature (does not change per product) |
| `--wp-accent-gold` | Ochre |
| `--wp-accent-purple` | Desert purple (supporting) |
| `--wp-accent-field` | Sage (field context) |
| `--wp-sage`, `--wp-slate`, `--wp-info` | Data / status |
| `--wp-fog`, `--wp-fog-subtle` | Warm tan borders |
| `--wp-success` / `--wp-warning` / `--wp-danger` / `--wp-info` | Status (never color-only) |

`--waypoint-aubergine-*` is a compatibility alias for the earth stack.

## Semantic

| Token | Role |
|-------|------|
| `--wp-bg` | Page background |
| `--wp-surface` | Panels |
| `--wp-elevated` / `--wp-surface-raised` | Raised controls |
| `--wp-inset` | Inputs, tab wells |
| `--wp-border`, `--wp-border-subtle` | Strokes |
| `--wp-text`, `--wp-text-secondary`, `--wp-text-tertiary`, `--wp-text-muted` | Copy hierarchy |
| `--wp-brand` | Locked terracotta |
| `--wp-accent`, `--wp-accent-dim`, `--wp-accent-bright` | Product pairing |
| `--wp-warm`, `--wp-warm-dim` | Secondary emphasis |
| `--wp-focus`, `--wp-focus-ring` | Focus |
| `--wp-on-accent` | Charcoal text on terracotta fills |
| `--wp-header-h` / `--wp-topbar-h` | Shared header height |

## Typography / spacing / radius / elevation / motion / z-index

Same scale as WDS 1.x, now owned by `--wp-*` (`--wp-font-display` = Cormorant Garamond, `--wp-font-body` = Source Sans 3).

## Product overrides

Set on `<html data-product="…">` — see Design System 2.0. Accents stay inside the locked terracotta/ochre/purple/sage family. Do not recolor the brand square.

## Legacy aliases

`--wds-*` and `--ws-*` remain supported. Do not assign neon lime/navy hex to them in new code.
