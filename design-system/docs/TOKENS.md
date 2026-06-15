# WDS Design Tokens

Canonical CSS custom properties. Import via `wds-tokens.css` or `wds.css`.

## Color primitives

| Token | Value / role |
|-------|----------------|
| `--wds-ink-950` … `--wds-ink-600` | Dark neutrals (background stack) |
| `--wds-parchment` | Primary text |
| `--wds-parchment-muted` | Secondary text |
| `--wds-parchment-dim` | Tertiary text |
| `--wds-sage`, `--wds-hearth`, `--wds-clay`, `--wds-moss` | Nature palette |
| `--wds-fog`, `--wds-fog-subtle` | Borders |
| `--wds-danger*` | Error states |

## Semantic

| Token | Role |
|-------|------|
| `--wds-bg` | Page background |
| `--wds-surface` | Panels |
| `--wds-elevated` | Raised controls |
| `--wds-inset` | Inputs, tab wells |
| `--wds-border`, `--wds-border-subtle` | Strokes |
| `--wds-text`, `--wds-text-secondary`, `--wds-text-tertiary` | Copy hierarchy |
| `--wds-accent`, `--wds-accent-dim` | Product accent |
| `--wds-warm`, `--wds-warm-dim` | Hearth / emphasis |
| `--wds-focus` | Focus ring |
| `--wds-on-accent` | Text on inverted buttons |

## Typography

| Token | Size |
|-------|------|
| `--wds-font-display` | Cormorant Garamond |
| `--wds-font-body` | Inter |
| `--wds-font-mono` | JetBrains Mono |
| `--wds-text-xs` … `--wds-text-3xl` | Type scale |
| `--wds-leading-*` | Line heights |
| `--wds-tracking-*` | Letter spacing |

## Spacing (4px base)

`--wds-space-1` (4px) through `--wds-space-16` (64px)

## Radius

`--wds-radius-sm` (6px) → `--wds-radius-2xl` (24px), `--wds-radius-pill`

## Elevation

`--wds-shadow-sm`, `--wds-shadow-md`, `--wds-shadow-lg`, `--wds-shadow-stage`

## Layout

| Token | Default |
|-------|---------|
| `--wds-max-content` | 1320px |
| `--wds-max-reading` | 42rem |
| `--wds-max-narrow` | 32rem |
| `--wds-topbar-h` | 3.25rem |
| `--wds-sidebar-w` | min(340px, 30vw) |

## Motion

| Token | Value |
|-------|-------|
| `--wds-ease-out` | cubic-bezier(0.22, 1, 0.36, 1) |
| `--wds-ease-in-out` | cubic-bezier(0.45, 0, 0.55, 1) |
| `--wds-duration-instant` | 120ms |
| `--wds-duration-calm` | 280ms |
| `--wds-duration-slow` | 480ms |

## Z-index

`--wds-z-base` (1) → `--wds-z-toast` (400)

## Product overrides

Set on `<html data-product="…">`:

- `--wds-accent`
- `--wds-accent-dim`
- `--wds-warm`
- `--wds-product-glow`

## Legacy aliases (Waypoint Scenes)

`--ws-*` and `--font-display` / `--font-body` map to `--wds-*` in `wds-tokens.css`.
