# Waypoint Articles — Relevance & Recommendation Model

## Goals

Show stories that help outdoor observers understand place, season, conditions, wildlife, science, and craft.

Do **not** optimize for outrage, clicks, controversy, or sensational headlines.

## Score (0–100)

Weighted blend:

| Signal | Weight | Notes |
|--------|--------|-------|
| Geographic proximity | 0.24 | Hudson Valley → Catskills → Poconos → N. NJ → Tri-State → Adirondacks → Northeast → National → Global |
| Category fit | 0.16 | Outdoor/science categories preferred |
| Recency | 0.18 | Days decay after ~2 / 7 / 21 / 45 / 90 |
| Seasonal relevance | 0.10 | Seasonal Nature + season-aligned categories |
| Source trust | 0.12 | From registry `trustTier` |
| Conditions relation | 0.10 | Weather, safety, astronomy, water |
| Waypoint product links | 0.10 | Quiet related actions |
| Sensational penalty | − up to 0.50 | ALL CAPS, “shocking”, clickbait |

Each article stores:

- `relevanceScore`
- `relevanceBreakdown`
- `relevanceReasons` (human-readable)

The Articles UI exposes the score tooltip so readers can see why a story ranked.

## Geographic labeling

Labels are derived from **article title/description/place references** first.

Publisher locale is never sufficient to claim “Hudson Valley” (etc.).

## Feed views

| View | Rule |
|------|------|
| For You | Highest relevance (local prefs may refine later; sensible default without account) |
| Local | Regional scopes only |
| Latest | `publishedAt` descending |
| Seasonal | Seasonal Nature / high seasonal breakdown |
| Photography | Photography / Hidden Landscapes / Astronomy |
| Science | Science, climate, geology, conservation, wildlife, etc. |

## Dashboard Field Notes picks

`dashboardPicks` selects up to three ids:

1. Strong local/regional article
2. Timely seasonal article
3. Conditions-related article (weather / safety / astronomy / water)

Shown below Today Outside — never replaces weather, alerts, or core observational tiles.

## Scenes / Sheds

One quiet related card only when topic overlap is genuine. Sheds stays limited to habitat / seasonal movement / conservation / wildlife framing — not general hunting filler.
