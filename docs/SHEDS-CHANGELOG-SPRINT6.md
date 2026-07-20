# Sheds Changelog — Production Recovery Sprint 6

DO NOT COMMIT / DO NOT PUSH was requested for this sprint; this file records work in the tree.

## Field-first map

- FAB **Add note** (`#btn-add-obs-fab`) for one-tap observation entry; Tools keeps a duplicate
- Larger FAB / touch targets and higher-contrast HUD chips for bright outdoor use
- Offline / limited-data banner clarifies that local notes still save

## GPS reliability

- Remembers permission denial (`waypoint-sheds-gps-denied-v1`) and skips auto-locate on boot
- Locate / Here chip use `force: true` so the user can retry after denial
- Clearer denied / timeout / unavailable copy; accuracy shown as approximate when >80 m
- Observation sheet **Use my GPS** + live “Saving at …” hint

## Today’s Search (field briefing)

- `fieldConditionLines` interprets snowmelt, wind, green-up, freeze, and season phase
- Plan title / body / why / meta prefer briefing language over raw mm / kph / %
- Confidence remains relative walk guidance — never find probability

## Heat maps

- Elevation fetches use `AbortController`; pan/zoom aborts stale Open-Meteo work
- Legend status: coarse refining → updated / zoom / offline scoring
- Elev notes describe offline vs unavailable without provider jargon in the card

## Observations

- Default confidence **probable**; optional habitat select; species labeled Whitetail
- Location precision stored as `gps` or `map`
- Foundation copy no longer claims photos on the field map

## Routing

- Confirmed site-root `map/index.html` redirects to `/apps/shed-hunting/map/` (P0 from live QA)

## Testing & docs

- `automation/test-sheds-sprint6.mjs`
- Field UX test updated for FAB add-note
- Recovery, map, GPS, performance, debt, readiness docs + this changelog
