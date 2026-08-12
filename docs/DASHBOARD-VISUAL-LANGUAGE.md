# Dashboard Visual Language

Authority for Dashboard instrument tiles: high-desert dusk, Southwestern pastel
atmospheric light, luminous field-instrument edges, unique data-driven art per
instrument. Complements `docs/DESIGN-SYSTEM-2.0.md`.

## Identity

**High desert + southwestern sunset + field guide + pastel atmospheric light.**

Dark foundations (charcoal, volcanic brown-black, desert plum, dusty blue-violet,
warm slate) carry the page. Southwestern pastels (dusty rose, adobe, terracotta,
peach, coral, sand, sage, turquoise, dusty sky, lavender dusk, pale amber) catch
edges, art, and accents — not pastel panels everywhere. Purple/lavender dusk is
**one astronomy ingredient**, not the whole UI.

## Principles

1. **Measurements first.** Art lives behind data with darkening overlays.
2. **One product surface.** Twelve instruments read as one dusk field panel.
3. **Luminous edges.** Domain-colored corner washes + soft outer diffusion
   (`--wdb-r-glow` + `--wdb-r-glow-strength`) — desert sunset catching the
   instrument edge, not uniform neon rectangles.
4. **Data-honest art.** Imagery matches actual sky / AQI / alert / moon / light /
   precip / wind state. Never contradict live weather.
5. **Art diversity.** Same mountains + a tint / haze / moon / CSS color **does not
   count as unique.** Each instrument composes reusable primitives differently.

## Illumination

## Semantic glow domains

| Domain | Token | Color intent |
| --- | --- | --- |
| Weather / forecast | `--wdb-r-glow-weather` | Dusty sky |
| Precip | `--wdb-r-glow-precip` | Turquoise |
| Light | `--wdb-r-glow-light` | Pale amber |
| Astronomy | `--wdb-r-glow-astronomy` | Lavender dusk (one ingredient) |
| Air (by AQI) | `--wdb-r-glow-air-*` | Sage → gold → terracotta → clay |
| Alerts quiet / active | `--wdb-r-glow-alert-quiet` / `--wdb-r-glow-alert` | Slate → coral |
| Default | `--wdb-r-glow-default` | Dusty rose |

State (`data-illum`) retunes `--wdb-r-glow` without rainbow category outlines.

## Illustration system

## Unique instrument scenes (v5)

Reusable SVG primitives in `wds-dashboard-rebuild-graphics.js`, composed
**differently** per instrument:

| Instrument | Subject | Primitives | Live drivers |
| --- | --- | --- | --- |
| Conditions | High-desert weather | Flat-topped **mesas**, canyon floor, sage | Sky state (clear/partly/rain/storm/snow/fog/…) |
| Light | Sun + horizon | **Horizon bands**, sun disc — no mesas | Sunrise / day / golden / sunset / blue hour |
| Air | Depth / visibility | Receding **haze planes** | US AQI band |
| Moon | Textured lunar disc | Close-up **luna** + craters + terminator | Phase, illumination %, waxing/waning |
| Precipitation | Amount / probability | Vertical **rain curtain** or virga | Probability, intensity, precip type |
| Wind | Movement / direction | Sage **grass** + flow ribbons | Speed, direction |
| Snow (Conditions) | Winter | **Drifts** + flakes — not recolored rain | Snow sky state |
| UV | Intensity rings | High sun + concentric rings on horizon | UV index |
| Alerts | Restrained | Quiet slate vs lightning only when active | Active flag |

Art diversity rule: mesa + tint is Conditions only. Light is a flat horizon.
Air is visibility depth. Moon is a large cratered disc. Wind is motion. Precip
is a curtain. Snow is winter form.

Markup: `.wdb-r-widget__art` → full scene SVG (`viewBox="0 0 160 100"`).
Overlay gradient keeps text contrast. Mobile crops via
`preserveAspectRatio="xMaxYMid slice"`.

### Sky states
clear · partly · cloudy · rain · heavy-rain · storm · snow · fog · wind · clear-night

### Moon phase
`moonPhaseKey(phase, illum, phaseValue)` drives terminator geometry — must match
calculated phase. Illumination % alone cannot choose waxing vs waning.

### Alerts
Calm subdued scene when clear; dramatic treatment only when `active`.

## Surface

Cards: charcoal/volcanic surface + atmospheric art + gradient overlay + luminous
edge. Page foundation is charcoal + warm black + dark plum + dusty blue.
Header is dark neutral; active nav is dusty rose / peach (no glowing nav bars).
Today Outside: subtle twilight charcoal → plum → adobe → peach — data dominant.

## Conditions hero

Large temperature + sky + feels-like + compact Wind / Humidity / Precip meta — not spreadsheet facts only.

## Mobile layout (non-negotiable)

At `max-width: 48rem` (320–768 inclusive):

- **Always one column** (`grid-template-columns: 1fr`; workspace forces `columns = 1`)
- Quiet site header stays in **document flow** (not sticky over Conditions)
- Atmospheric art recomposes right/quieter; Moon / Light / Air / Wind / Precip
  subjects stay on-canvas
- Customize omits column picker entirely
- **No column-count control** in Customize (hidden in CSS; omitted in JS)
- Add / remove / reorder / favorites / restore / save remain

## Accessibility

Glow is not the sole meaning carrier. Labels + contrast + reduced-motion (static glow OK).
Art stays behind data.

## Performance

Prefer inline SVG / CSS atmospheres — no large photo payloads.
