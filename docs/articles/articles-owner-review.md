# Waypoint Articles — Owner Review

**Branch:** `review/waypoint-articles-release-gate` (from `feature/waypoint-articles-rss-feed`)  
**Starting SHA (Articles tip):** `aeccb76363a33941d37d18c43b8a9c7964332c7d`  
**Production base:** `origin/main` `@ 59c09debbe8d9c7d36acf74607bd4ebfa55359fc`  
**Ending SHA:** see release-gate tip after push  
**Release gate:** [`articles-release-gate.md`](./articles-release-gate.md) — **APPROVE WITH CONDITIONS**

## Product summary

First usable Waypoint Articles experience: curated RSS/Atom outdoor reading feed with summaries, **Waypoint’s Take**, geographic/category filters, Dashboard Field Notes, quiet Scenes/Sheds related reading, and curated RSS export. Original publishers remain the destination. Full articles are not republished.

Release-gate refinements: category-varied Takes, narrower geo defaults (no false Hudson Valley from office location), tighter classification, last-good retention on total feed failure, Adirondack Explorer + NWS Burlington sources, workflow empty-dataset guard, and classified disabled-feed notes.

## Canonical route

`/articles/`

## Feed counts (release-gate refresh)

| Metric | Value |
|--------|------:|
| Configured feeds | 25 |
| Enabled feeds | 13 |
| Successfully processed feeds | 13 |
| Disabled feeds | 12 (classified; none hidden) |
| Failing enabled feeds | 0 |
| Normalized articles | 120 |
| Local / regional articles | 15 |

## Categories supported

Weather, Climate, Wildlife, Birds, Forests and Plants, Fungi, Geology, Rivers and Water, Astronomy and Night Sky, Hiking and Trails, Outdoor Safety, Conservation, Environmental Science, Nature Photography, Hidden Landscapes, Seasonal Nature, Regional News

## Geographic regions supported

Hudson Valley, Catskills, Poconos, Northern New Jersey, Tri-State, Adirondacks, Northeast, National, Global

**Coverage honesty:** After fixing false local labels, demonstration volume is strongest nationally and in Northeast/Adirondacks. Hudson Valley, Poconos, and Northern New Jersey remain weak until reputable regional RSS appears.

## Summary generation method

Deterministic **feed-description** summarizer (`summaryProvenance`: `feed-description` | `unavailable`). No production AI summarizer.

## Waypoint’s Take generation method

Deterministic **fallback** templates with **category variation** (`takeProvenance`: `fallback` | `unavailable`). Does not restate the summary.

## Refresh process

```bash
node scripts/articles-refresh.mjs
```

GitHub Action: `.github/workflows/articles-refresh.yml` (every 6 hours). Commits only when artifacts change and article count > 0. Retains last-good dataset if every enabled feed fails.

## RSS output routes

- `/feeds/waypoint-articles.xml`
- `/feeds/waypoint-local.xml`
- `/feeds/waypoint-photography.xml`
- `/feeds/waypoint-science.xml`

## Integrations

| Surface | Status |
|---------|--------|
| Dashboard | Field Notes deepener |
| Scenes | One quiet related-reading mount |
| Sheds | One quiet habitat / wildlife / conservation mount |

## Screenshots

- `docs/articles/screenshots/`
- Release gate: `docs/articles/screenshots/release-gate/`

## Test results

- `automation/test-articles-rss.mjs` — pass
- Field Notes deepener assertion — pass
- Dashboard reliability — pass
- Pre-existing unrelated platform failures on `origin/main` — unchanged

## Known limitations

See release-gate document.

## Production requirements

- Refresh static artifacts on schedule or before release
- Do not scrape HTML when feeds fail
- Identifiable User-Agent; ≥15s timeouts; ≥4–6 hour cadence
- Empty refresh must not commit empty artifacts

## Copyright & attribution safeguards

Feed metadata only; canonical publisher URLs; no full republication; script stripping; http(s)-only links; provenance labels. Policy: `copyright-attribution-and-content-policy.md`.

## Merge / deploy

Not merged. Not deployed. Owner decision via release gate.
