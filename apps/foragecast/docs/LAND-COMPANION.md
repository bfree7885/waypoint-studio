# ForageCast — Seasonal Land Companion

Leafturn is **not** a separate app. Its vision lives inside ForageCast as land-care pillars beside wild foraging.

## Mission

**Understand the season. Care for your land. Harvest at the right time.**

Core questions:

1. What can I find today?
2. What should I do today?

Equation:

**Location × Weather × Season × Property × User Intent = Today's Action Plan**

## Pillars

| Pillar | Path |
|--------|------|
| Today | `apps/foragecast/` |
| Foraging | `apps/foragecast/foraging.html` (+ season table) |
| Orchard | `apps/foragecast/pillar.html?id=orchard` |
| Garden | `apps/foragecast/pillar.html?id=garden` |
| Food forest | `apps/foragecast/pillar.html?id=food-forest` |
| Permaculture | `apps/foragecast/pillar.html?id=permaculture` |
| Property | `apps/foragecast/property.html` |

Catalog: `data/pillars.json`.

## Architecture

| Module | Role |
|--------|------|
| `foragecast-profile.js` | Property v2 inventory + derived features + local photos |
| `foragecast-property-wizard.js` | Skippable first-run / edit setup |
| `foragecast-property-overview.js` | Property Overview dashboard |
| `foragecast-today.js` | Deterministic action planner |
| `foragecast-land.js` | Pillar pages |
| `foragecast-home.js` | Today-first home |
| Existing model/heat/boot | Unchanged foraging intelligence |

See also `docs/PROPERTY-PROFILES.md`.

No remote model calls. Guidance is synthesized locally from OIP weather/calendar when available, plus property/intent.

## Privacy

- Property and goals never leave the browser (`waypoint-foragecast-property-v1`, `waypoint-foragecast-intent-v1`).
- Recommendations only use features the user enabled.

## Future signals

Soil conditions and growing degree days are listed in `pillars.json` as future inputs — not required for this expansion.
