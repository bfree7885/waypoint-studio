# Waypoint Studio Design System 2.0

**Identity:** Contemporary Field Station · Desert Sunset · Southwest Landscape · Waypoint  
**Feel:** high-contrast southwestern — purple + orange + gold + tan + brown + bone on aubergine  
**Authoritative brand:** `--waypoint-*` in `design-system/css/wds-tokens.css`  
**Canonical semantics:** `--wp-*` (derived from `--waypoint-*`)  
**Compatibility:** `--wds-*` / `--ws-*` alias onto `--wp-*` (do not invent parallel values)  
**Living reference:** [`design-system/patterns/waypoint-2.0.html`](../design-system/patterns/waypoint-2.0.html)  
**Palette cleanup:** [`docs/SOUTHWEST-COLOR-SYSTEM.md`](./SOUTHWEST-COLOR-SYSTEM.md)

## Mission for agents

One coherent Waypoint shell (logo/wordmark, header, nav, active states, mobile nav, footer, spacing) while each application keeps a **distinct accent** drawn from the **same locked Southwestern family**.

Do **not** reintroduce neon lime, corporate blue, cool gray UI, cyber cyan glow, Inter-as-default body, or white-dominant SaaS chrome.

## Canonical palette

| Role | Token | Hex | Notes |
|------|-------|-----|-------|
| Deepest ground | `--waypoint-aubergine-dark` / `--wp-bg` | `#241B25` | Page background |
| Surface | `--waypoint-aubergine` / `--wp-elevated` | `#3A243D` | Panels |
| Bone / primary text | `--waypoint-bone` / `--wp-bone` | `#F0E2C9` | AA on aubergine |
| Sand | `--waypoint-sand` | `#D9C3A3` | Warm secondary |
| Tan | `--waypoint-tan` | `#B88A5A` | Warm neutral accent |
| Orange | `--waypoint-orange` | `#C9653D` | Default studio CTA |
| Burnt orange | `--waypoint-burnt-orange` | `#A94E32` | Sheds / earth |
| Purple | `--waypoint-purple` | `#70446F` | Primary brand accent / DFD |
| Gold | `--waypoint-gold` | `#D8A72E` | Focus / highlight |
| Brown | `--waypoint-brown` | `#6B4937` | Earth |
| Sage / slate / info blues | `--wp-sage`, `--wp-slate`, `--wp-info` | — | **Data / status only**, not general chrome |

## Semantic color purpose

| Token group | Purpose |
|-------------|---------|
| `--wp-bg`, `--wp-surface`, `--wp-elevated`, `--wp-inset` | Spatial hierarchy (aubergine field station) |
| `--wp-text`, `--wp-text-secondary`, `--wp-text-tertiary`, `--wp-text-muted` | High-contrast bone/sand hierarchy |
| `--wp-border`, `--wp-border-subtle` | Visible purple fog strokes |
| `--wp-accent`, `--wp-accent-dim`, `--wp-accent-bright`, `--wp-on-accent` | Product CTA / active |
| `--wp-warm`, `--wp-warm-dim` | Secondary emphasis (usually purple) |
| `--wp-focus`, `--wp-focus-ring` | Keyboard focus (gold) |
| `--wp-success` / `--wp-warning` / `--wp-danger` / `--wp-info` | Status — **never color alone**; pair with label or icon |

## Product accents (`data-product`)

| Product | `data-product` | Accent character |
|---------|----------------|------------------|
| Home | `studio-home` / `studio` | Orange |
| Dashboard | `dashboard` | Orange + gold framing on aubergine (data hues separate) |
| Scenes | `scenes` | Gold |
| Sheds | `shed-hunting` / `sheds` | Burnt orange |
| Articles | `articles` | Purple |
| Deep Forest Dispatch | `deep-forest-dispatch` | Purple (+ orange warm) |
| Side Trails | `side-trails` | Purple bright |
| Waypoint Deck | `waypoint-deck` | Purple bright |

## Typography

- **Display:** Cormorant Garamond (editorial atlas)
- **Body:** Source Sans 3 (scientific, not Inter)
- **Mono:** IBM Plex Mono / JetBrains Mono

## Shared shell

Use App Shell classes (`was-global`, `was-brand`, `was-primary-nav`, `was-local`, `was-footer`) from `wds-app-shell.css` + aurora bridge helpers. Active nav uses accent color **and** underline inset — color is not the sole indicator.

## ONE APP = ONE PRODUCT SURFACE

Critical architecture rule (full detail: [`docs/APP-SURFACE-ARCHITECTURE.md`](./APP-SURFACE-ARCHITECTURE.md)):

- **Waypoint Studio** = parent platform (global nav + shared chrome).
- Each app body (Dashboard, Scenes, Sheds, Articles, …) = **one product job**.
- Cross-product discovery belongs in **global nav only** — not in-app promo grids or studio directories inside app bodies.
- App-local nav sits under global nav for **in-app** destinations (e.g. Dashboard Workspace · Customize).
- **Homepage exception:** `/` may introduce multiple products; apps must not become mini Studio homepages.

Regression gates: `automation/test-app-surface-isolation.mjs`, `automation/test-dashboard-instrument-panel.mjs`.

## Dashboard instruments

Field-guide illustrations, quiet illumination, and surface rules:
[`docs/DASHBOARD-VISUAL-LANGUAGE.md`](./DASHBOARD-VISUAL-LANGUAGE.md).
Gate: `automation/test-dashboard-visual-refinement.mjs`.
Instrument **data** colors (precip blue, AQI greens, alert reds) stay meaningful; **chrome** stays Southwest.

## Adoption checklist

1. Set `data-product` on `<html>` (and shell if present).
2. Link `design-system/css/wds.css` before product CSS.
3. Prefer `--waypoint-*` / `--wp-*` in new CSS; leave `--wds-*` only for existing call sites.
4. Replace hardcoded `#c8f055` / `#0c1628` / cool navy / Inter with tokens / Source Sans 3.
5. Status UI: label + color (or icon + color).
6. Verify 375 / 430 / 768 / 1440 / 1728 and keyboard focus.

## Legacy

| Legacy | Status |
|--------|--------|
| Navy / lime brand primitives | Remapped via aliases; neon fallbacks cleaned on major CSS |
| Dusty-rose dashboard chrome | Remapped to orange/gold on aubergine |
| DFD sage “separate brand” accent | Remapped to purple |
| Aurora RC3 lime/morning-blue product overrides | Bridge aliases to WP 2.0 |
| `--wds-*` API | Supported indefinitely as compatibility layer |

## Related

- Token source: `design-system/css/wds-tokens.css`
- Token notes: `design-system/docs/TOKENS.md`
- Product theming: `design-system/docs/PRODUCTS.md`
- App surfaces: `docs/APP-SURFACE-ARCHITECTURE.md`
- Field UI philosophy: `docs/WAYPOINT-FIELD-DESIGN-SYSTEM.md`
- Engineering playbook: `docs/ENGINEERING-PLAYBOOK.md`
