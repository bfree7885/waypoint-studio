# Waypoint Southwest Color System

**Authoritative tokens:** `design-system/css/wds-tokens.css`  
**API:** `--waypoint-*` (locked brand) → `--wp-*` (semantics) → `--wds-*` / `--ws-*` (compat)

## Locked family

| Token | Hex | Role |
|-------|-----|------|
| `--waypoint-aubergine-dark` | `#241B25` | Primary dark background |
| `--waypoint-aubergine` | `#3A243D` | Secondary dark surface |
| `--waypoint-purple` | `#70446F` | Primary accent |
| `--waypoint-orange` | `#C9653D` | Secondary accent / CTA |
| `--waypoint-burnt-orange` | `#A94E32` | Earth / sheds accent |
| `--waypoint-gold` | `#D8A72E` | Highlight / focus / important data chrome |
| `--waypoint-sand` | `#D9C3A3` | Warm neutral surface |
| `--waypoint-tan` | `#B88A5A` | Warm neutral accent |
| `--waypoint-brown` | `#6B4937` | Earth accent |
| `--waypoint-bone` | `#F0E2C9` | Light text |

Derived scale (`--waypoint-aubergine-950` … inset, orange/purple brights) exists only for hierarchy.

## Semantic roles (do not redefine per app)

| Role | Token |
|------|--------|
| Primary dark background | `--wp-bg` → aubergine-dark |
| Secondary dark surface | `--wp-surface` / `--wp-elevated` |
| Primary accent | `--wp-warm` / product purple where editorial |
| Secondary accent | `--wp-accent` → orange (default studio) |
| Highlight | `--wp-focus` → gold |
| Warm neutrals | sand / tan |
| Earth | brown |
| Light text | `--wp-text` → bone |

Product `data-product` blocks may pick **which** SW accent leads (orange vs purple vs gold vs burnt-orange) but must stay inside this family.

## Natural data exception

Blue / green / red / cyan remain allowed for hydrology, vegetation, alerts, and scientific layers. They must not become general nav, button, or card chrome.

## Contrast notes

Bone / sand on aubergine-dark meet WCAG AA for body text. Orange on aubergine is AA-large; use bone text on orange buttons (`--wp-on-accent`). Avoid tan-on-sand and gold-on-bone for small copy.

## Cleanup scope (this pass)

- Consolidated `--waypoint-*` as SoT; remapped `--wp-*` primitives
- DFD accent: sage → purple (+ orange warm)
- Dashboard chrome: charcoal/dusty-rose → aubergine + orange/gold (instrument data hues kept)
- Scenes / Sheds / Volunteer / Photo Coach neon-navy fallbacks remapped
- `apps/waypoint-scenes/css/main.css` local palette aliased to tokens
