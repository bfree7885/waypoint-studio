# Waypoint Studio Design System 2.0

**Identity:** Southwestern field technology at dusk · dark desert + topographic field tool  
**Feel:** dark earth + sand/cream + burnt orange + ochre + restrained desert purple  
**Authoritative brand:** `--waypoint-*` in `design-system/css/wds-tokens.css`  
**Canonical semantics:** `--wp-*` (derived from `--waypoint-*`)  
**Compatibility:** `--wds-*` / `--ws-*` alias onto `--wp-*` (do not invent parallel values)  
**Living reference:** [`design-system/patterns/waypoint-2.0.html`](../design-system/patterns/waypoint-2.0.html)  
**Palette:** [`docs/SOUTHWEST-COLOR-SYSTEM.md`](./SOUTHWEST-COLOR-SYSTEM.md)

## Mission for agents

One coherent Waypoint shell (logo/wordmark, terracotta square, header, nav, active states, mobile nav, footer, spacing) while each application keeps a **distinct pairing** drawn from the **same locked dusk-desert family**.

Do **not** reintroduce neon lime, corporate blue, cool gray UI, cyber cyan glow, Inter-as-default body, white-dominant SaaS chrome, or purple-as-the-ground.

## Canonical palette

| Role | Token | Hex | Notes |
|------|-------|-----|-------|
| Deepest ground | `--waypoint-charcoal` / `--wp-bg` | `#181513` | Warm charcoal |
| Raised surface | `--waypoint-espresso` / `--wp-elevated` | `#251C20` | Espresso / plum-brown |
| Bone / primary text | `--waypoint-bone` / `--wp-text` | `#F0E1C3` | AA on charcoal |
| Tan / secondary text | `--waypoint-tan` | `#BFA98C` | Desert tan |
| Sand | `--waypoint-sand` | `#D9C3A3` | Warm secondary |
| **Terracotta** | `--wp-brand` / `--waypoint-orange` | `#D46A3A` | Waypoint signature |
| Ochre | `--wp-accent-gold` | `#D7A72E` | Secondary highlight |
| Desert purple | `--wp-accent-purple` | `#79506F` | Supporting only |
| Sage | `--wp-accent-field` | `#73806A` | Field context; not chrome |
| Slate / info blues | `--wp-slate`, `--wp-info` | — | **Data / status only** |

`--waypoint-aubergine-*` is a compatibility alias for the earth stack — do not paint large surfaces purple.

## Semantic color purpose

| Token group | Purpose |
|-------------|---------|
| `--wp-bg`, `--wp-surface`, `--wp-elevated`, `--wp-inset` | Spatial hierarchy (charcoal field station) |
| `--wp-text`, `--wp-text-secondary`, `--wp-text-tertiary`, `--wp-text-muted` | High-contrast bone/tan hierarchy |
| `--wp-border`, `--wp-border-subtle` | Warm tan fog strokes |
| `--wp-brand` | Locked terracotta — header square, shared signature |
| `--wp-accent`, `--wp-accent-dim`, `--wp-accent-bright`, `--wp-on-accent` | Product pairing / CTA (on-accent is charcoal, not cream) |
| `--wp-accent-gold` / `--wp-accent-purple` / `--wp-accent-field` | Ochre / desert purple / sage |
| `--wp-warm`, `--wp-warm-dim` | Secondary emphasis (usually ochre) |
| `--wp-focus`, `--wp-focus-ring` | Keyboard focus (ochre) |
| `--wp-success` / `--wp-warning` / `--wp-danger` / `--wp-info` | Status — **never color alone**; pair with label or icon |

## Product accents (`data-product`)

| Product | `data-product` | Accent character |
|---------|----------------|------------------|
| Home | `studio-home` / `studio` | Terracotta |
| Dashboard | `dashboard` | Terracotta + ochre (data hues separate) |
| Scenes | `scenes` | Ochre + terracotta |
| Sheds | `shed-hunting` / `sheds` | Terracotta + sage |
| Articles | `articles` | Terracotta + ochre (editorial) |
| Deep Forest Dispatch | `deep-forest-dispatch` | Same as Articles |
| Waypoint Deck | `waypoint-deck` | Terracotta + desert purple (public shell) |

## Typography

- **Display:** Cormorant Garamond (editorial atlas)
- **Body:** Source Sans 3 (scientific, not Inter)
- **Mono:** IBM Plex Mono / JetBrains Mono

## Shared shell

Use App Shell classes (`was-global`, `was-brand`, `was-primary-nav`, `was-local`, `was-footer`) from `wds-app-shell.css` + aurora bridge helpers. The brand square uses `--wp-brand` (terracotta) on every page. Active global nav uses cream type + terracotta underline — color is not the sole indicator.

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
