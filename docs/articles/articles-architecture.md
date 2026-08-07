# Waypoint Articles — Architecture

## Purpose

Waypoint Articles is a **curated outdoor reading feed**. It collects trustworthy RSS/Atom items about outdoor observation, environmental science, wildlife, weather, astronomy, geology, conservation, photography, and regional nature — then presents:

1. Original headline
2. Source + date
3. Category + geographic relevance
4. Concise neutral summary (feed-metadata based in this sprint)
5. **Waypoint’s Take**
6. Related Waypoint action
7. Prominent link to the **original publisher**

Waypoint does **not** republish full articles, scrape article HTML bodies, or pretend to be the publisher.

## Canonical route

`/articles/`

Supporting artifacts:

| Path | Role |
|------|------|
| `data/articles/feed-registry.json` | Maintainable feed registry |
| `data/articles/articles.json` | Normalized curated article set (static) |
| `data/articles/health.json` | Feed health / freshness |
| `feeds/waypoint-articles.xml` | Curated RSS export |
| `feeds/waypoint-local.xml` | Regional subset |
| `feeds/waypoint-photography.xml` | Photography / visual nature subset |
| `feeds/waypoint-science.xml` | Science / conservation subset |
| `articles/manifest.json` | Editorial sample index (preserved) |
| `scripts/articles-refresh.mjs` | Refresh CLI |
| `scripts/articles/*` | Pipeline modules |
| `design-system/js/platform/wds-articles-feed.js` | Hub + related-content UI |
| `design-system/js/platform/wds-take.js` | Official Waypoint’s Take component |
| `design-system/css/wds-articles-feed.css` | Feed styles (WDS tokens) |

**Reusable / Side Trails–ready architecture:** [reusable-articles-architecture.md](./reusable-articles-architecture.md)  
**Take component:** [waypoint-take.md](./waypoint-take.md)  
**Design modernization owner review:** [articles-modernization-owner-review.md](./articles-modernization-owner-review.md)

## What was reused

- Canonical `/articles/` route, nav entry, and app-shell page pattern
- Editorial sample `articles/samples/reading-todays-conditions.html` and category pages
- `articles/manifest.json` as the editorial sample index
- Dashboard deepeners surface (repurposed as **Field Notes**)
- Static GitHub Pages data pattern from the live engine / cyber engines
- RSS/Atom parsing lessons from `scripts/signalterrain-cyber-live-engine.mjs` (outdoor pipeline is separate)

## What was replaced / superseded

- Hub UI no longer renders only the thin category-card scaffold as the primary experience
- Deepeners no longer list only the single Sample essay as “Latest Articles”
- Placeholder catalog `design-system/content/articles.json` remains unused by this product (still IA demos only)

## Pipeline

```text
feed-registry.json
        │
        ▼
 fetch enabled feeds (timeouts, continue on failure)
        │
        ▼
 parse RSS/Atom → sanitize → normalize canonical records
        │
        ▼
 reject unsupported topics → classify category/geo
        │
        ▼
 dedupe (URL / GUID / hash / title) → score relevance
        │
        ▼
 summary + Waypoint’s Take (deterministic fallback)
        │
        ▼
 articles.json + health.json + feeds/*.xml
```

Run:

```bash
node scripts/articles-refresh.mjs
```

Scheduled: `.github/workflows/articles-refresh.yml` every 12 hours. Commits only when artifacts change.

## Deployment model

No new production backend. Generated JSON and RSS are committed static files suitable for GitHub Pages.

## Honesty states

The UI surfaces:

- no articles
- feeds temporarily unavailable
- summary unavailable / material too limited
- Waypoint’s Take unavailable
- stale data
- partial refresh (via health badge)

## Integrations

- **Dashboard:** Field Notes deepener shows local / seasonal / conditions picks
- **Scenes:** one quiet related-reading mount (photography / astronomy / seasonal topics)
- **Sheds:** one quiet related-reading mount (wildlife / habitat / conservation only)

## Tests

- Default: `node automation/test-articles-rss.mjs` (fixtures)
- Optional live: `node automation/check-articles-live-feeds.mjs`
