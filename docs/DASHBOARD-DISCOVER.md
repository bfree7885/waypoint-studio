# Dashboard Discover

**Canonical product role:** Dashboard = Discover (see `docs/PRODUCT-DIRECTION.md`).  
**Live surface:** `/apps/dashboard/` (rebuild shell via `home-boot.js` → `WDS.dashboardRebuild`).

## Question

> **What should I notice outside today, tonight, and soon?**

Weather is one instrument. Discover synthesizes the few things genuinely worth noticing. A quiet category may remain absent.

## Hierarchy (v1)

| Layer | Surface | Behavior |
|-------|---------|----------|
| **Coming soon / tonight / happening** | Natural events (`data-wdb-r-events`) | Significant location-relevant events within the horizon. Temporal kicker is truthful — never labels a +2-day event “Right now.” |
| **Right now** | Happening Now (`data-wdb-r-hn`) | Ranked **live weather / air / light / alert** signals from `dashboardRebuildIntel` (min score 25, max 4). Empty → **no HN DOM**. |
| **Quiet day** | `data-wdb-r-discover-quiet` | Only when live weather is hydrated **and** every supported Discover category is empty (HN **and** natural events). The events catalog must have loaded — missing or still-loading catalog is not a confirmed empty category. Honest “nothing unusually strong” — never invents events. A quiet **weather** state is not automatically a quiet **Discover** state. |
| **Outside today** | Today Outside (`data-wdb-r-today`) | Synthesized takeaways (sky, light, alerts, notable air) — not a dump of Conditions numbers. Provider provenance. Calendar season is computed; phenology only when fresh and possible. |
| **Look up** | Instruments (Conditions, light, astronomy, UV, …) | Raw readings. Moon/daylight from live weather + daylight utils. |
| **Explore** | Deepeners “Go deeper” | Links to Articles, Scenes, Deep Forest Dispatch. Understand this only when `publishingMatch` finds a justified story — no filler. |

## Calendar season vs phenology

These are not the same thing.

- **Calendar season** is deterministic from local date + hemisphere (meteorological months; early / mid / late by day-of-month). Source: `computed-calendar`. High confidence.
- **Phenology** (mushrooms, bloom, migration, leaf change) is editorial or environmental and geographically variable. It must carry `weekOf` / `editorialValidUntil`, expire, and be **omitted** when stale or impossible for the date (e.g. morels / “late spring” in Pennsylvania in August).

Dashboard must never display obviously impossible seasonal language. If phenology cannot be provided confidently, omit it. Do not replace it with generic filler.

Guard implementation: `WDS.dashboardSeason` (`design-system/js/dashboard/wds-dashboard-season.js`). Applied when OIP/RI packages normalize, and again at Today render.

## Natural events

Bounded curated catalog: `design-system/js/dashboard/natural-events/events.json`.

Not a full astronomy calendar. Surface only events worth noticing, with:

- structured type / UTC windows / magnitude
- local timezone display (never UTC as the primary viewing time)
- geographic visibility (do not recommend local viewing outside the visibility region)
- lifecycle: **upcoming → tonight → happening → ended** (ended is not promoted)
- provenance in a Why / “Based on what?” panel
- optional weather context from existing Open-Meteo cloud cover (no invented viewing scores)

**Horizon:** 72 hours for `significance: major` (e.g. a locally visible lunar eclipse). Two to three days of advance notice is appropriate when it improves actionability. Minor events are not listed for a week.

Failed or missing catalog → omit events. Never invent times. Transient fetch failures are retried on later hydrate; they are not cached for the page session.

## Ranking (deterministic)

`WDS.dashboardRebuildIntel.analyze(platform, location, now)` ranks **weather-family** signals.

`WDS.naturalEvents.activeDiscoverEvents(...)` ranks **natural events** independently.

Both may appear together. Neither silently erases the other.

**Deterministic** thresholds and evidence. Never fabricates wildlife, social trends, or sensor readings we do not have.

## Real data sources

- Open-Meteo forecast (+ NWS recovery where wired)
- Open-Meteo air quality
- NWS alerts
- Browser / IP geolocation (`wds-location.js`)
- Daylight / moon derived from weather + daylight helpers
- Computed calendar season (date + hemisphere)
- Editorial phenology only when fresh and date-possible
- Curated natural-event catalog (eclipse contacts from NASA GSFC / Espenak EclipseWise)

## Honesty rules

- No fake discoveries to avoid empty UI.
- Quiet days are valid product outcomes **after** all Discover categories are checked.
- Editorial vs live vs computed vs forecast must stay readable.
- Publishing links are pathways into understanding — not sibling-product ads. No relevant story → show the event without a deepener.

## Known limitations

- No live wildlife / trail crowd feeds on rebuild Discover.
- Event catalog is curated, not an ephemeris generator.
- Solar eclipses, meteor showers, and conjunctions are supported as catalog types but not populated beyond the current lunar-eclipse acceptance event.
- Location denied → place waits honestly; local event visibility cannot be claimed.

## Intentionally not built (this phase)

Full celestial calendar · notifications · subscriptions · AI-generated event discovery · Global Signals · Cyber · Sheds V3.2 · Deck OS · social · accounts overhaul.
