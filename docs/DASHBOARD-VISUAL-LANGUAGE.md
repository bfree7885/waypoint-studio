# Dashboard Visual Language

Authority for Dashboard instrument tiles: atmospheric outdoor art, luminous field-instrument edges,
Waypoint aubergine family + restrained environmental glow. Complements `docs/DESIGN-SYSTEM-2.0.md`.

## Principles

1. **Measurements first.** Art lives behind data with darkening overlays.
2. **One product surface.** Twelve instruments read as one night field panel.
3. **Luminous edges.** Crisp card border + soft outer diffusion (`--wdb-r-glow`) — premium, not RGB gaming.
4. **Data-honest art.** Imagery matches actual sky / AQI / alert / moon / light state.

## Illumination

## Semantic glow domains

| Domain | Token | Color intent |
| --- | --- | --- |
| Weather / forecast | `--wdb-r-glow-weather` | Cool atmospheric cyan |
| Precip | `--wdb-r-glow-precip` | Cool blue |
| Light | `--wdb-r-glow-light` | Warm amber |
| Astronomy | `--wdb-r-glow-astronomy` | Twilight violet |
| Air (by AQI) | `--wdb-r-glow-air-*` | Sage → gold → terracotta → clay |
| Alerts quiet / active | `--wdb-r-glow-alert-quiet` / `--wdb-r-glow-alert` | Slate → amber-clay |

State (`data-illum`) retunes `--wdb-r-glow` without rainbow category outlines.

## Illustration system

## Atmospheric art

Module: `wds-dashboard-rebuild-graphics.js` (v3 atmospheric).

Markup: `.wdb-r-widget__art` → full scene SVG (`viewBox="0 0 160 100"`) with gradient sky + ground.
Overlay gradient keeps text contrast. Mobile crops via `preserveAspectRatio="xMaxYMid slice"`.

### Sky states
clear · partly · cloudy · rain · heavy-rain · storm · snow · fog · wind · clear-night

### Moon phase
`moonPhaseKey(phase, illum)` drives shadow disc — must match calculated phase.

### Alerts
Calm subdued scene when clear; dramatic treatment only when `active`.

## Surface

Cards: tonal aubergine surface + atmospheric art + gradient overlay + luminous edge.

## Conditions hero

Large temperature + sky + feels-like + compact Wind / Humidity / Precip meta — not spreadsheet facts only.

## Mobile layout (non-negotiable)

At `max-width: 47.99rem` (375 / 390 / 430):

- **Always one column** (`grid-template-columns: 1fr`; workspace forces `columns = 1`)
- **No column-count control** in Customize (hidden in CSS; omitted in JS)
- Add / remove / reorder / favorites / restore / save remain

## Accessibility

Glow is not the sole meaning carrier. Labels + contrast + reduced-motion (static glow OK).

## Performance

Prefer inline SVG / CSS atmospheres — no large photo payloads.
