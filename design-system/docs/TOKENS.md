# WDS Design Tokens (Design System 2.0)

Canonical CSS custom properties live in `wds-tokens.css`.

**Brand primitives:** `--waypoint-*`  
**Canonical API:** `--wp-*` (derived from `--waypoint-*`)  
**Compatibility:** `--wds-*` and `--ws-*` map onto `--wp-*`.

Full agent guide: [`docs/DESIGN-SYSTEM-2.0.md`](../../docs/DESIGN-SYSTEM-2.0.md) · Palette: [`docs/SOUTHWEST-COLOR-SYSTEM.md`](../../docs/SOUTHWEST-COLOR-SYSTEM.md) · Reference: [`patterns/waypoint-2.0.html`](../patterns/waypoint-2.0.html)

## Color primitives (locked Southwestern)

| Token | Role |
|-------|------|
| `--waypoint-aubergine-dark` / `--wp-aubergine-*` | Aubergine ground stack |
| `--waypoint-bone`, `--waypoint-sand`, `--waypoint-tan` | Text / warm neutrals |
| `--waypoint-orange`, `--waypoint-burnt-orange` | Warm accents / CTAs |
| `--waypoint-purple` | Primary brand / editorial accent |
| `--waypoint-gold` | Focus / highlight |
| `--waypoint-brown` | Earth |
| `--wp-sage`, `--wp-slate`, `--wp-info` | Data / status only |
| `--wp-fog`, `--wp-fog-subtle` | Borders |
| `--wp-success` / `--wp-warning` / `--wp-danger` / `--wp-info` | Status (never color-only) |

## Semantic

| Token | Role |
|-------|------|
| `--wp-bg` | Page background |
| `--wp-surface` | Panels |
| `--wp-elevated` | Raised controls |
| `--wp-inset` | Inputs, tab wells |
| `--wp-border`, `--wp-border-subtle` | Strokes |
| `--wp-text`, `--wp-text-secondary`, `--wp-text-tertiary`, `--wp-text-muted` | Copy hierarchy |
| `--wp-accent`, `--wp-accent-dim`, `--wp-accent-bright` | Product accent |
| `--wp-warm`, `--wp-warm-dim` | Secondary emphasis |
| `--wp-focus`, `--wp-focus-ring` | Focus |
| `--wp-on-accent` | Text on primary buttons |
| `--wp-header-h` / `--wp-topbar-h` | Shared header height |

## Typography / spacing / radius / elevation / motion / z-index

Same scale as WDS 1.x, now owned by `--wp-*` (`--wp-font-display` = Cormorant Garamond, `--wp-font-body` = Source Sans 3).

## Product overrides

Set on `<html data-product="…">` — see Design System 2.0. Accents stay inside the locked purple/orange/gold/tan/brown family.

## Legacy aliases

`--wds-*` and `--ws-*` remain supported. Do not assign neon lime/navy hex to them in new code.
