# Dashboard Visual Language

Authority for Dashboard instrument tiles: field-guide atmosphere, quiet illumination,
Waypoint aubergine family. Complements `docs/DESIGN-SYSTEM-2.0.md` and
`docs/APP-SURFACE-ARCHITECTURE.md`.

## Principles

1. **Measurements first.** Illustrations are atmospheric context in negative space — never
   centered giant icons competing with facts.
2. **One product surface.** Twelve instruments on one screen must read as one field panel,
   not twelve unrelated widgets.
3. **Palette discipline.** Aubergine / Bone / Sand / Terracotta / Clay / Sage / Plum /
   Dust gold / Slate only. No neon cyan, lime, pink, or rainbow category outlines.
4. **Honest state.** Illumination follows weather / AQI / alert state — not category
   marketing color.

## Illustration system

| Layer | Role |
| --- | --- |
| Module | `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-graphics.js` |
| Markup | `.wdb-r-widget__atmosphere` → `.wdb-r-graphic` → SVG `viewBox="0 0 96 56"` |
| CSS | `wds-dashboard-rebuild.css` — atmosphere absolute top-right; content z-index above |

### Sky / weather states

`normalizeSkyState` + `sky()` cover:

clear · partly · cloudy · rain · heavy-rain · storm · snow · fog · wind · clear-night

### Moon phase

`moonPhaseKey(phase, illum)` maps calculated phase name (preferred) or illumination %
to: new · waxing-crescent · first-quarter · waxing-gibbous · full · waning-gibbous ·
last-quarter · waning-crescent.

### Light / photography

sunrise · sunset · golden · blue-hour — via `sunPath` / Light tile adapter.

### Other instruments

AQI atmospheric haze · alert triangle · UV rays · wind · precip · hours bars · doorway ·
comfort · day range — same stroke weight and horizon language.

**Do not:** emoji, cartoon fills, glossy gradients, enlarged Lucide-style UI icons as the
tile hero.

## Illumination (`data-illum`)

Set on widget article and body from graphic `data-illum` / `illumFromGraphic`.

| Token | Intent |
| --- | --- |
| `quiet` | Default — no wash |
| `clear-day` / `partly` | Soft dust-gold inset |
| `golden` | Warm dust-gold wash |
| `blue` | Quiet purple wash |
| `rain` / `cloudy` / `fog` / `snow` / `wind` | Cool slate wash |
| `storm` | Stronger clay wash + quieter clay border |
| `night` | Deep aubergine inset |
| `alert` | Clay border + stronger wash (`data-alert-active`) |
| `aqi-good` → `aqi-unhealthy` | Progressive sage → gold → terracotta → clay |

Borders stay **quiet** (`--wdb-r-line-strong`). Category tokens tint surface gradients
lightly — they do **not** draw neon full-card outlines or outer glow rings.

## Surface / depth

- Subtle top-to-bottom aubergine gradients on cards
- Soft inset highlight + deep ambient shadow (`--wdb-r-shadow`)
- Premium field-instrument night — not glassmorphism for its own sake
- Reduced motion: keep shadow; drop decorative transitions / lower atmosphere opacity

## Category tokens (presence, not neon)

`--category-weather|light|nature|astronomy|photography|water|hiking|earth|alerts|travel`
map to `--wp-slate|dust-gold|sage|purple|plum|terracotta|clay` — muted family accents only.

## Accessibility

- Graphics are `aria-hidden="true"`; facts remain the accessible content
- Trust chips and fact labels keep contrast on aubergine surfaces
- Responsive: atmosphere shrinks on ≤47.99rem; content reserves right padding so values
  do not collide with the illustration

## Change rule

Visual refinement must not expand the tile catalog or change Dashboard architecture
(customize / persistence / real data / ONE APP = ONE PRODUCT SURFACE).
