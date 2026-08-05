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

**Important:** `defaultGeographicScope` is a soft fallback only when article text lacks place signals. Narrow scopes (Hudson Valley, Catskills, Poconos, Northern New Jersey, Tri-State, Adirondacks) demote to **Northeast** unless place references appear in the item — publisher headquarters never force a local label.

## Current registry posture (release gate)

Enabled working sources:

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
- NWS Albany (soft default Northeast)
- Adirondack Explorer (regional nonprofit newsroom)
- NWS Burlington (soft default Northeast)

Disabled with explicit classifications (see `articles-release-gate.md`):

- USGS, NPS, Smithsonian Smart News (403), Cornell All About Birds (403), NOAA SWPC rss.xml, NY DEC, NJ DEP, PA DCNR (HTML), National Geographic environment RSS, Times Union outdoors RSS, NASA spaceweather blog HTML shell, USDA Forest Service (500)

## Regional coverage gaps

- **Hudson Valley / Poconos / Northern New Jersey:** no durable dedicated outdoor RSS verified at release gate without scraping or general-news noise
- Highlands Current considered but not added as a primary source (high non-outdoor volume)
- NWS Philadelphia channel returned empty items

## Maintenance

1. Prefer fixing `feedUrl` over inventing scrapers.
2. If a feed fails repeatedly, set `enabled: false` and classify in `notes`.
3. Re-run `node scripts/articles-refresh.mjs`.
4. Keep request cadence ≥ 4–6 hours; honor timeouts and User-Agent identity.
