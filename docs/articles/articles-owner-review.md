# Waypoint Articles — Owner Review

**Branch:** `feature/waypoint-articles-rss-feed`  
**Starting SHA:** `59c09debbe8d9c7d36acf74607bd4ebfa55359fc` (`origin/main`)  
**Ending SHA:** `PLACEHOLDER`

## Product summary

First usable Waypoint Articles experience: curated RSS/Atom outdoor reading feed with summaries, **Waypoint’s Take**, geographic/category filters, Dashboard Field Notes, quiet Scenes/Sheds related reading, and curated RSS export. Original publishers remain the destination. Full articles are not republished.

## Canonical route

`/articles/`

## Feed counts

| Metric | Value |
|--------|------:|
| Configured feeds | 23 |
| Enabled feeds | 11 |
| Successfully processed feeds (last refresh) | 11 |
| Disabled / failing feeds | 12 (explicit notes in registry) |
| Normalized articles in demonstration dataset | 120 |
| Local / regional articles | 16 |

## Categories supported

Weather, Climate, Wildlife, Birds, Forests and Plants, Fungi, Geology, Rivers and Water, Astronomy and Night Sky, Hiking and Trails, Outdoor Safety, Conservation, Environmental Science, Nature Photography, Hidden Landscapes, Seasonal Nature, Regional News

## Geographic regions supported

Hudson Valley, Catskills, Poconos, Northern New Jersey, Tri-State, Adirondacks, Northeast, National, Global

## Summary generation method

Deterministic **feed-description** summarizer from sanitized RSS/Atom metadata (`summaryProvenance`: `feed-description` | `unavailable`). No production AI summarizer in this sprint.

## Waypoint’s Take generation method

Deterministic **fallback** templates grounded in categories, geography, and related products (`takeProvenance`: `fallback` | `unavailable`). Not a repeat of the summary.

## Refresh process

```bash
node scripts/articles-refresh.mjs
```

GitHub Action: `.github/workflows/articles-refresh.yml` (every 6 hours + manual). Commits only when artifacts change.

Optional live check: `node automation/check-articles-live-feeds.mjs`

## RSS output routes

- `/feeds/waypoint-articles.xml`
- `/feeds/waypoint-local.xml`
- `/feeds/waypoint-photography.xml`
- `/feeds/waypoint-science.xml`

## Integrations

| Surface | Status |
|---------|--------|
| Dashboard | **Shipped** — Field Notes deepener with local / seasonal / conditions picks linking to publishers + Articles hub |
| Scenes | **Shipped** — one quiet related-reading mount (photography / astronomy / seasonal topics) |
| Sheds | **Shipped** — one quiet related-reading mount (wildlife / habitat / conservation) |

## Screenshots

See `docs/articles/screenshots/` (desktop + mobile captures from local static server).

## Test results

- `node automation/test-articles-rss.mjs` — pass (fixtures)
- Home RC1 deepener assertion updated for Field Notes
- Dashboard / platform suites run in this branch before push

## Known limitations

- No AI summarization backend yet
- Several desirable agency feeds disabled (404/403) — documented, not hidden
- Geographic coverage still thinner than national science coverage; NWS Albany helps regional weather
- “For You” uses relevance ranking + localStorage view prefs; no account graph yet
- Saved articles view omitted (platform local-save pattern not cleanly shared yet)
- Remote feed images are retained in data when permitted but not emphasized in cards

## Production requirements

- Commit/refresh static `data/articles/*` and `feeds/*` on the 6-hour Action (or manual refresh before release)
- Do not scrape HTML bodies when feeds fail — disable and note instead
- Keep User-Agent identifiable; timeout ≥ 15s; avoid sub-hourly polling
- Prevent refresh-only loops: Action commits only on artifact diff

## Copyright & attribution safeguards

- Feed metadata / permitted excerpts only
- Canonical publisher URLs on every card and RSS item
- Explicit curator language in RSS channel + item descriptions
- Script/style stripped; non-http(s) URLs rejected
- Provenance labels prevent pretending truncated excerpts are full summaries
- Policy doc: `docs/articles/copyright-attribution-and-content-policy.md`

## Audit reuse notes

**Reused:** `/articles/` route, editorial sample + categories, manifest, deepeners mount point, static Pages data pattern, cyber RSS parsing lessons.  
**Replaced as primary UX:** scaffold-only hub cards; Sample-only “Latest Articles” deepener list.

## Merge / deploy

Not merged. Not deployed. Owner review only.
