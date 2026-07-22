# Dashboard V2 — Briefing Engine

**Module:** `design-system/js/dashboard/v2/wds-dashboard-v2-briefing.js`

## Design

- **Deterministic** rule engine over normalized model
- **No remote LLM** — every sentence maps to `traces[]` with `rule` id
- Reuses existing intel where appropriate (`outdoorWeatherIntel`, `skyDashboardIntel`, `photographyConditions`)

## Sections

| Section | Primary inputs |
|---------|----------------|
| What it feels like | temp band, conditions text, cloud, wind, humidity, recent rainfall |
| What changes today | hourly POP, cloud trend, max temp/UV, sunset |
| Best opportunities | activity engine (excellent/good only) |
| Use caution | NWS items, heat/cold/wind/AQI/UV thresholds, river trend keywords |
| Worth noticing | photography, golden hour, moon, visibility, season, fog potential |

## Uncertainty

- If weather not live: explicit loading copy; cached briefing may show with `partial: true`
- Never invents species, gauges, or alerts

## Cache

Briefing snapshot stored per location key when live weather available (`waypoint-dashboard-v2-cache-v1`).
