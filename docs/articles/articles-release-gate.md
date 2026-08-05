# Waypoint Articles — Release Gate

**Branch:** `review/waypoint-articles-release-gate`  
**Starting SHA:** `aeccb76363a33941d37d18c43b8a9c7964332c7d` (Articles tip / `feature/waypoint-articles-rss-feed`)  
**Ending SHA:** _(filled at commit)_  
**Fresh refresh timestamp:** `2026-08-05T13:40:45.420Z`  
**Authoritative base:** Articles branch derived from `origin/main` `@ 59c09debbe8d9c7d36acf74607bd4ebfa55359fc`

## Recommendation

**APPROVE WITH CONDITIONS**

The Articles experience is production-capable as a curated static feed: honest attribution, working refresh, durable disabled-feed notes, improved Takes, safer last-good retention, and validated RSS. Conditions are coverage and operational, not blockers to merge readiness of this branch.

### Conditions

1. Accept that Hudson Valley / Poconos / Northern New Jersey **article volume remains thin** until stable regional RSS sources appear (do not scrape HTML newsrooms).
2. Accept that **12 feeds stay disabled** with classified reasons; do not treat green-all-feeds as a launch requirement.
3. Accept that summaries remain **deterministic feed-description** (no AI) and Takes remain **fallback** templates with category variation.
4. When the 6-hour refresh workflow lands on `main`, artifact commits may trigger Pages (~4/day). This is bounded, not a loop; monitor first week after merge.
5. Pre-existing `origin/main` platform test failures (home/support architecture, Outside/OS CSS) remain unrelated and should not gate Articles.

## Counts (post release-gate refresh)

| Metric | Value |
|--------|------:|
| Configured feeds | 25 |
| Enabled working feeds | 13 |
| Disabled feeds | 12 |
| Failing enabled feeds | 0 |
| Generated articles | 120 |
| Local / regional articles | 15 |

### Failure classifications (disabled feeds)

| Feed ID | Classification |
|---------|----------------|
| usgs-news | invalid URL (404) |
| nps-news | invalid URL (404); no scrape |
| smithsonian-science | blocked request (403) |
| cornell-lab-allaboutbirds | blocked request (403) |
| spaceweather-noaa | invalid URL (404); JSON API unsupported here |
| ny-dec-news | invalid URL (404) |
| pa-dcnr-news | no RSS/Atom (HTML newsroom) |
| nj-dep-news | invalid URL (404 on recheck) |
| national-geographic-environment | invalid URL / SPA shell |
| nasa-space-weather | unsupported format (HTML shell, no items) |
| times-union-outdoors | invalid URL (HTML shell) |
| forest-service-news | other (HTTP 500 on recheck) |

### Working feeds

NASA IOTD, NOAA News, Audubon, Nature Conservancy blog, AMC Outdoors, EarthSky, Science News Earth, USFWS News, ScienceDaily Earth & Climate, Phys.org Earth, NWS Albany, **Adirondack Explorer** (added), **NWS Burlington** (added).

## Distributions

### Categories (article tagging frequency)

Wildlife 24 · Birds 22 · Conservation 20 · Nature Photography 19 · Astronomy 32 · Environmental Science 26 · Climate 24 · Weather 16 · Geology 16 · Rivers and Water 13 · Hiking 8 · Forests 5 · Seasonal 4 · Outdoor Safety 3 · Regional News 3 · Fungi 1 · Hidden Landscapes 1

### Regions

National 69 · Global 37 · Northeast 12 · Adirondacks 4 · Catskills 1 · Hudson Valley 0 · Poconos 0 · Northern New Jersey 0 · Tri-State 0

**Coverage note:** Narrow local labels now require place signals in item text. NWS Albany no longer stamps Hudson Valley from office location alone (demotes to Northeast). That removed false locals and also reduced HV-labeled volume. Poconos / N. NJ still lack a trustworthy dedicated outdoor RSS source after candidates were checked (empty NWS PHI channel; Highlands Current too general/obituary-heavy; Pocono Record RSS not usable XML).

### Provenance

| Field | Distribution |
|-------|----------------|
| Summary | feed-description 116 · unavailable 4 |
| Waypoint’s Take | fallback 120 (category-varied; unavailable path covered by tests) |

Take first-90-char uniqueness improved from ~5/120 to **38/120** after rule rewrite.

## Review sample findings

| Sample type | Finding | Action |
|-------------|---------|--------|
| Local/regional | False HV labels from NWS Albany soft default | Fixed — narrow defaults demote to Northeast without place refs |
| National wildlife | Useful; Takes were generic | Improved category-varied Takes |
| Weather / NWS title-only | Summary correctly unavailable; Take was still verbose boilerplate | Title-only path now restrained; summary provenance honest |
| Photography / NASA | Wind-tunnel & contest items mis-tagged via feed defaults / loose patterns | Reject patterns + defaults only when no text match |
| Astronomy | Over-applied via `\bnasa\b` / defaults | Tightened patterns |
| Geology | `\blake\b` false positives (Lake Placid) | Pattern tightened |
| Hiking | Mountain forecast title correctly labeled Catskills/Adirondacks | Preserved |
| Sparse vs rich | Provenance labels correct; condensed-feed note present on rich | Preserved |
| Adirondack Explorer | Initially all rejected because feed **notes** contained “obituaries” | Fixed — reject uses article text only |
| Related products | Mostly sensible; sheds not forced | Preserved |

## UI findings

Inspected at 375 / 430 / 768 / desktop (`docs/articles/screenshots/release-gate/`).

- Summaries readable; Take visually separated (left moss rule + panel)
- Source + date + “Read original article” CTA clear; publisher attribution note present
- Filters / search usable; freshness badge present
- Long headlines wrap (`overflow-wrap`)
- Empty / stale / partial states remain in UI code paths
- Keyboard: view tabs are buttons; selects and search are labeled
- Dashboard Field Notes / Scenes / Sheds mounts remain quiet single-card or three-pick patterns

No architecture redesign; no overloaded surfaces.

## RSS validation

| Feed | Result |
|------|--------|
| `/feeds/waypoint-articles.xml` | Valid XML; curator language; original links; item count ≤ 50 |
| `/feeds/waypoint-local.xml` | Valid XML |
| `/feeds/waypoint-photography.xml` | Valid XML |
| `/feeds/waypoint-science.xml` | Valid XML |

Checks: escaped content, publisher attribution, summary vs Take separation, no full-article bodies, GUID presence. Automated assertions in `automation/test-articles-rss.mjs`.

## Workflow safety findings

`.github/workflows/articles-refresh.yml`:

- Concurrency group `articles-refresh` (no overlapping runs)
- Commits only known artifact paths
- Skips commit when unchanged
- **New:** refuses commit when article count is 0
- Pipeline **retains last-good `articles.json`** when every enabled feed fails (`retainedPrevious`)
- Atomic temp+rename writes
- No secrets required
- 6-hour schedule bounds Pages redeploys if merged to main

## Test results

| Suite | Result | Notes |
|-------|--------|-------|
| `automation/test-articles-rss.mjs` | **PASS** | Parsing, sanitize, dedupe, scoring, geo demotion, take variation, RSS validity, UI contracts |
| `automation/test-home-rc1.mjs` Field Notes | **PASS** | Pre-existing unrelated FAIL: “support experiences are Home architecture” |
| `automation/test-dashboard-reliability.mjs` | **PASS** | |
| RSS XML parse | **PASS** | All four feeds |
| Pre-existing platform-experience / Outside OS failures on `origin/main` | Unchanged | Not introduced by Articles |

## Known limitations

- No AI summarization
- Weak HV / Poconos / N. NJ item volume under honest geo rules
- Some national science/aggregator noise still passes classification
- Adirondack Explorer includes community items; topic reject reduces but does not eliminate soft mismatches
- Saved-articles view still omitted
- Feed images not emphasized in cards

## Copyright / attribution

Unchanged safeguards: feed metadata only, canonical publisher URLs, no full republication, no HTML scrape of article bodies, script stripping, http(s)-only links.

## Screenshots

`docs/articles/screenshots/release-gate/`

- `articles-375.png`
- `articles-430.png`
- `articles-768.png`
- `articles-desktop.png`
- `dashboard-desktop.png`

## Merge / deploy

Not merged. Not deployed. Release-gate branch pushed for owner decision.
