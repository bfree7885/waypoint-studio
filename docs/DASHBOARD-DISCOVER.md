# Dashboard Discover

**Canonical product role:** Dashboard = Discover (see `docs/PRODUCT-DIRECTION.md`).  
**Live surface:** `/apps/dashboard/` (rebuild shell via `home-boot.js` → `WDS.dashboardRebuild`).

## Question

> What is interesting in the world around me right now?

Every major module should help the user notice something outdoors — not fill a widget grid.

## Hierarchy (v1)

| Layer | Surface | Behavior |
|-------|---------|----------|
| **A. Right now** | Happening Now (`data-wdb-r-hn`) | Ranked live signals from `dashboardRebuildIntel` (min score 25, max 4). Empty → **no HN DOM**. |
| **Quiet day** | `data-wdb-r-discover-quiet` | Only when platform is hydrated and HN is empty. Honest “nothing unusually strong” — never invents events. |
| **B / D. Outside today** | Today Outside (`data-wdb-r-today`) | Interpreted day lines + place/time/trust; provider provenance; optional **editorial** seasonal note. |
| **C. Look up** | Instruments (`ph-light`, `ph-astronomy`, UV) + HN light/astro signals | Moon/daylight derived from live weather + daylight utils — not fabricated events. |
| **E. Seasonal** | Editorial season line on Today | From OIP `calendar.season` / `phenology.stage`, labeled **editorial**. |
| **F. Explore** | Deepeners “Go deeper” | Links to Articles, Scenes, Deep Forest Dispatch. Take prefers live `beforeYouGo.brief`. |
| **G. Sheds** | Contextual only | Not promoted on Discover v1. HN may link Scenes when intel supplies a justified `toolLinks` entry; Sheds remains dormant until a go-relevant signal exists. |

## Ranking (deterministic)

`WDS.dashboardRebuildIntel.analyze(platform, location, now)`:

1. Normalize platform facts (weather, air, alerts, daylight, moon).
2. Derive candidate signals with evidence rows + category + severity.
3. Score by immediacy, unusualness, observability, and data confidence (threshold rules — not ML).
4. Emit `happeningNow` (filtered) and `beforeYouGo` brief.

**Deterministic** thresholds and evidence. **Inferred** only where labeled (e.g. photo-opportunity language tied to light windows). Never fabricates wildlife, social trends, or sensor readings we do not have.

## Real data sources

- Open-Meteo forecast (+ NWS recovery where wired)
- Open-Meteo air quality
- NWS alerts
- Browser / IP geolocation (`wds-location.js`)
- Daylight / moon derived from weather + daylight helpers
- OIP calendar / phenology (editorial season labels)

## Honesty rules

- No fake discoveries to avoid empty UI.
- Quiet days are valid product outcomes.
- Editorial vs live vs estimate must stay readable (trust chips + “Based on” / “Seasonal note (editorial)”).
- Publishing links are pathways into understanding — not sibling-product ads.

## Known limitations

- No live wildlife / trail crowd feeds on rebuild Discover.
- Sheds not yet contextually ranked into HN.
- Regional content-bundle seasonal lists are not surfaced as live discoveries.
- Location denied → place waits honestly; instruments degrade without inventing coords.

## Intentionally not built (this phase)

Waypoint Deck · Global Signals · Cyber · OpenRoad · Fieldry · Savant · Sheds V3.2 · accounts/preferences overhaul · social · standalone AI chatbot · Scenes rewrite.
