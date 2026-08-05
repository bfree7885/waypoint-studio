# Waypoint Articles — Feed Source Register

Registry file: [`data/articles/feed-registry.json`](../../data/articles/feed-registry.json)

## Selection principles

Prefer:

- government agencies
- universities / research labs
- museums and observatories
- established conservation nonprofits
- established regional newsrooms (when a stable RSS URL exists)
- reputable science and photography publications

Avoid:

- content farms and AI spam
- sensational outlets
- affiliate-heavy commerce sites
- feeds with unclear authorship
- HTML newsroom pages pretending to be feeds

## Record schema

Each feed supports:

- `id`, `name`, `publisher`
- `feedUrl`, `homepageUrl`
- `enabled`
- `trustTier` (`official` | `academic` | `nonprofit` | `established-newsroom` | `photography` | `community`)
- `defaultCategories`, `defaultGeographicScope`
- `updateIntervalMinutes`
- `notes`
- `lastSuccessfulFetch`, `lastFailure`, `failureCount`

**Important:** `defaultGeographicScope` is a soft fallback only when article text lacks place signals. Publisher headquarters never force a local label.

## Current registry posture (this sprint)

Enabled working sources (verified during implementation refresh):

- NASA Image of the Day
- NOAA News
- Audubon RSS
- Nature Conservancy blog
- Appalachian Mountain Club / Outdoors
- EarthSky
- Science News Earth
- U.S. Fish & Wildlife Service News
- ScienceDaily Earth & Climate
- Phys.org Earth
- NWS Albany products (Hudson Valley / eastern NY context)

Disabled with explicit notes (do not hide failures):

- USGS newsroom RSS (404)
- NPS news RSS (404)
- Smithsonian Smart News (403)
- Cornell All About Birds (403)
- NOAA SWPC rss.xml (404)
- NY DEC press RSS (404)
- NJ DEP newsroom (403)
- PA DCNR (HTML, not RSS)
- National Geographic environment RSS (unstable/unconfirmed)
- Times Union outdoors RSS (unverified)
- NASA spaceweather blog (no parseable items)
- USDA Forest Service news RSS (404)

## Maintenance

1. Prefer fixing `feedUrl` over inventing scrapers.
2. If a feed fails repeatedly, set `enabled: false` and explain in `notes`.
3. Re-run `node scripts/articles-refresh.mjs`.
4. Keep request cadence ≥ 4–6 hours; honor timeouts and User-Agent identity.
