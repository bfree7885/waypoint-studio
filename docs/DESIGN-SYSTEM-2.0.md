# Waypoint Studio Design System 2.0

**Identity:** Contemporary Field Station · Topographic Atlas · High-Desert / Southwestern Landscape  
**Feel:** natural, warm, restrained, scientific, editorial, outdoor, premium, calm, geographic, modern  
**Canonical tokens:** `--wp-*` in `design-system/css/wds-tokens.css`  
**Compatibility:** `--wds-*` / `--ws-*` alias onto `--wp-*` (do not invent parallel values)  
**Living reference:** [`design-system/patterns/waypoint-2.0.html`](../design-system/patterns/waypoint-2.0.html)

## Mission for agents

One coherent Waypoint shell (logo/wordmark, header, nav, active states, mobile nav, footer, spacing) while each application keeps a **distinct accent** drawn from the shared muted Southwestern palette.

Do **not** reintroduce neon lime, corporate blue, cyber cyan glow, Inter-as-default body, or tourist-Southwest kitsch.

## Canonical palette

| Role | Token | Hex | Notes |
|------|-------|-----|-------|
| Deepest ground | `--wp-aubergine-950` | `#17131c` | Page background |
| Surface | `--wp-aubergine-900` | `#1f1a26` | Panels |
| Elevated | `--wp-aubergine-800` | `#2a2432` | Raised chrome |
| Bone / primary text | `--wp-bone` | `#f2ebe0` | AA on aubergine |
| Sand | `--wp-sand-200` | `#e0d3c0` | Soft secondary surfaces |
| Terracotta | `--wp-terracotta` | `#c17a5a` | Default studio accent |
| Clay red | `--wp-clay` | `#a85d52` | Sheds / warm alert adjacent |
| Dusty plum | `--wp-plum` | `#8b6f82` | Editorial warmth |
| Muted purple | `--wp-purple` | `#7a6b8a` | Side Trails (Dashboard uses dusty rose; purple is astronomy only) |
| Sage | `--wp-sage` | `#7d8f72` | Scenes / civic / success |
| Slate | `--wp-slate` | `#7a8a9a` | SignalTerrain / info |
| Dust gold | `--wp-dust-gold` | `#c4a46a` | Focus ring / caution |

## Semantic color purpose

| Token group | Purpose |
|-------------|---------|
| `--wp-bg`, `--wp-surface`, `--wp-elevated`, `--wp-inset` | Spatial hierarchy (field station dusk) |
| `--wp-text`, `--wp-text-secondary`, `--wp-text-tertiary`, `--wp-text-muted` | Readable bone/sand hierarchy |
| `--wp-border`, `--wp-border-subtle` | Quiet plum fog strokes |
| `--wp-accent`, `--wp-accent-dim`, `--wp-accent-bright`, `--wp-on-accent` | Product CTA / active — product-specific |
| `--wp-warm`, `--wp-warm-dim` | Secondary emphasis (never neon) |
| `--wp-focus`, `--wp-focus-ring` | Keyboard focus (dust gold) |
| `--wp-success` / `--wp-warning` / `--wp-danger` / `--wp-info` | Status — **never color alone**; pair with label or icon |
| `--wp-space-*` | 4px spacing scale |
| `--wp-radius-*` | Soft field radii (not pill-everywhere) |
| `--wp-shadow-*` | Warm charcoal elevation |
| `--wp-header-h`, `--wp-max-content`, `--wp-max-reading` | Shared layout rails |
| `--wp-duration-*`, `--wp-ease-*`, `--wp-transition-calm` | Calm motion |

## Product accents (`data-product`)

| Product | `data-product` | Accent character |
|---------|----------------|------------------|
| Home | `studio-home` / `studio` | Terracotta |
| Dashboard | `dashboard` | Dusty rose / peach on charcoal dusk (lavender is astronomy only) |
| Scenes | `scenes` | Sage |
| Sheds | `shed-hunting` / `sheds` | Clay red |
| Articles | `articles` | Dusty plum |
| Side Trails | `side-trails` | Muted purple |
| SignalTerrain | `signalterrain` | Slate + clay (ST may deepen chrome; keep token rails) |
| Global Signals | `global-signals` | Terracotta bright + plum |
| Civic Trails | `civic-trails` | Sage |

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

## Adoption checklist

1. Set `data-product` on `<html>` (and shell if present).
2. Link `design-system/css/wds.css` before product CSS.
3. Prefer `--wp-*` in new CSS; leave `--wds-*` only for existing call sites.
4. Replace hardcoded `#c8f055` / `#0c1628` / Inter with tokens / Source Sans 3.
5. Status UI: label + color (or icon + color).
6. Verify 375 / 430 / 768 / 1440 / 1728 and keyboard focus.

## Legacy

| Legacy | Status |
|--------|--------|
| Navy / lime brand primitives | Remapped via aliases; hex fallbacks cleaned on major CSS |
| Aurora RC3 lime/morning-blue product overrides | Bridge now aliases to WP 2.0; accents owned by tokens |
| `--wds-*` API | Supported indefinitely as compatibility layer |
| Inter body font on major routes | Migrated to Source Sans 3 |

## Related

- Token source: `design-system/css/wds-tokens.css`
- Token notes: `design-system/docs/TOKENS.md`
- Product theming: `design-system/docs/PRODUCTS.md`
- App surfaces: `docs/APP-SURFACE-ARCHITECTURE.md`
- Field UI philosophy: `docs/WAYPOINT-FIELD-DESIGN-SYSTEM.md`
- Engineering playbook: `docs/ENGINEERING-PLAYBOOK.md`
