# Waypoint Articles — Production Review

**Date:** 2026-08-05  
**Merged from:** `review/waypoint-articles-release-gate` (includes `feature/waypoint-articles-rss-feed`)  
**Merge commit:** `39ea0929d3a56cc6fd7c2c3d858a26849fac6e63`  
**Production base before merge:** `59c09debbe8d9c7d36acf74607bd4ebfa55359fc`  
**Release gate:** APPROVE WITH CONDITIONS (`docs/articles/articles-release-gate.md`)

## Production build

| Item | Value |
|------|--------|
| Deployment SHA | `39ea0929d3a56cc6fd7c2c3d858a26849fac6e63` |
| Short SHA | `39ea092` |
| Pages workflow | [Deploy GitHub Pages #31046683758](https://github.com/bfree7885/waypoint-studio/actions/runs/31046683758) — **success** |
| `data/build-info.json` | `commit` = `39ea092…`, `source` = `github-pages`, `builtAt` = `2026-08-05T21:00:03.483Z` |
| Site | https://waypointstudio.org |

Refresh cadence on production: **every 12 hours** (`.github/workflows/articles-refresh.yml`).

## Production verification

| Surface | Result |
|---------|--------|
| https://waypointstudio.org/articles/ | **200** — curated hub, feed UI mounts, freshness badge, filters, first cards render |
| https://waypointstudio.org/feeds/waypoint-articles.xml | **200** — valid RSS; curator language; original publisher links; Waypoint’s Take present |
| https://waypointstudio.org/feeds/waypoint-local.xml | **200** |
| https://waypointstudio.org/data/articles/articles.json | **200** — 120 articles |
| https://waypointstudio.org/data/articles/health.json | **200** — `status: ok`, 13 feeds OK |
| Dashboard Field Notes | Live deepeners JS serves **Field Notes** from `data/articles/articles.json` / `dashboardPicks` |
| Scenes related reading | Mount present in production `apps/scenes/index.html` + `wds-articles-feed.js` |
| Sheds related reading | Mount present in production `apps/shed-hunting/index.html` |

### Live Field Notes picks (production data)

1. NWS Albany — Mountain Forecasts (Adirondacks / Catskills / …)
2. Audubon — Driving Cattle, Restoration, and Research
3. USFWS — Human Bear Incidents / Alligator River

### Feed health (production)

```json
{
  "status": "ok",
  "articleCount": 120,
  "ok": 13,
  "checkedAt": "2026-08-05T13:40:45.420Z"
}
```

Configured 25 · enabled 13 · disabled 12 · failing enabled 0 · local/regional 15.

## Screenshots

`docs/articles/screenshots/production/`

- `articles-desktop.png`
- `articles-mobile.png`
- `dashboard-desktop.png`
- `build-info.json` / `health.json` / `rss-head.txt` snapshots

## Test summary

| Suite | Result | Notes |
|-------|--------|-------|
| `automation/test-articles-rss.mjs` | **PASS** (local, pre- and post-merge) | |
| Field Notes deepener assertion (`test-home-rc1`) | **PASS** | Unrelated pre-existing FAIL remains: “support experiences are Home architecture” |
| Dashboard reliability | **PASS** | |
| Pages deploy + verify job | **PASS** | Critical routes / fingerprint |
| CI `test` job on merge | **FAIL** | Pre-existing `home single primary lead` in `test-production-repair.mjs` — not Articles-introduced |
| Full articles republished? | **No** | Feed metadata / excerpts only |

## Release-gate conditions (accepted on merge)

1. Thin Hudson Valley / Poconos / Northern New Jersey volume under honest geo rules.
2. Twelve disabled feeds remain disabled with classified notes.
3. Summaries stay deterministic feed-description; Takes stay category-varied fallbacks.
4. Refresh-triggered Pages redeploys bounded by **12-hour** schedule (reduced from 6 hours before merge).
5. Pre-existing platform CI failures do not gate Articles.

## Known limitations

- No AI summarization in production.
- Weak true-local coverage for HV / Poconos / N. NJ.
- `articles/index.html` was not on the build-metadata inject list at first deploy (meta may still show `local` until follow-up inject commit); `data/build-info.json` and dashboard scripts already fingerprint `39ea092`.
- Some national aggregator noise still passes classification.
- Saved-articles view omitted.
- CI red on unrelated production-repair home assertion.

## Follow-ups (non-blocking)

1. Confirm `articles/index.html` is included in `scripts/inject-build-metadata.mjs` HTML list (committed with this review if not already live).
2. Monitor first 12-hour refresh commit on `main`.
3. Add regional RSS only when reputable feeds exist — do not scrape HTML newsrooms.

## Merge / deploy confirmation

- Merged to `main`: **yes** (`39ea092`)
- Deployed via GitHub Pages: **yes** (workflow success)
- Production `/articles/` and `/feeds/waypoint-articles.xml` verified live: **yes**
- Dashboard Field Notes data path verified live: **yes**
