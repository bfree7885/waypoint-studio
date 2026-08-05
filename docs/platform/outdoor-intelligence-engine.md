# Shared Outdoor Intelligence Recommendation Engine

Status: implemented on `feature/outdoor-intelligence-engine`  
API version: `1.0.0`  
Runtime: browser, deterministic, local-first

## Purpose

The shared recommendation engine turns already-available outdoor context into a small, explainable set of next things worth noticing. It powers:

- Dashboard Field Notes ranking
- Articles contextual prompts
- Scenes practice, conditions, astronomy, and related reading
- Sheds safety, habitat-observation, and related reading

It does not predict wildlife, guarantee field outcomes, replace official alerts, or call an AI service.

The earlier Outdoor Brief engine remains responsible for Dashboard briefing statements. This engine sits one layer higher and chooses useful cross-product actions and reading.

## Architecture

```text
Existing trusted sources
  OIP weather/daylight/trails · observation ledger · local photo stores
  article feed · caller-supplied species/phenology/geology context · location
                         |
                         v
normalizeContext(input) -> stable 12-domain context envelope
                         |
                         v
deterministic rules -> evidence-bearing candidates
                         |
                         v
surface filter -> score sort -> duplicate removal -> limit
                         |
                         v
Dashboard · Articles · Scenes · Sheds
```

Canonical implementation:

- `design-system/js/outdoor-intelligence/wds-outdoor-recommendations.js`
- `design-system/css/wds-outdoor-recommendations.css`
- `automation/test-outdoor-recommendations.mjs`

The engine is loaded by the shared `design-system/js/wds.js` bundle. Articles, Scenes, and Sheds also load it directly because their landing pages use intentionally small script sets.

## Input contract

`normalizeContext(input)` accepts partial data. Every field is optional.

```js
{
  now,
  weather,
  season,
  species,
  phenology,
  astronomy,
  geology,
  trailConditions,
  cameraActivity,
  photoMetadata,
  recentObservations,
  articleCategories,
  articles,
  location,
  platform
}
```

The normalized domains are:

1. weather
2. season
3. species
4. phenology
5. astronomy
6. geology
7. trail conditions
8. camera activity
9. photo metadata
10. recent observations
11. article categories
12. location

Callers may provide a complete context or a sparse subset. Sparse input produces only recommendations justified by that input. Current season is derived from the date when absent.

`platform` is an optional existing Outdoor Intelligence Package. The normalizer reads its weather, calendar, daylight, species, phenology, geology, trails, observations, and location fields without changing the package.

## Output contract

Each recommendation includes:

```js
{
  id,
  version,
  kind,
  domains,
  surfaces,
  score,
  title,
  summary,
  action,
  evidence,
  reason,
  confidence,
  honesty,
  generatedAt
}
```

- `score` is a deterministic priority from 0–100, not a probability.
- `evidence` names the signals that caused the rule to match.
- `confidence` describes the evidence mode: observed, contextual, estimated, seasonal, personal, or curated.
- `honesty` states the limits of the guidance.
- Article recommendations retain the normalized source article as `article`.

## Public API

```js
const Engine = WDS.outdoorRecommendations;

Engine.normalizeContext(input);
Engine.recommend(input, { surface, limit, kinds, includeArticles });
Engine.recommendFor("scenes", input, { limit: 3 });
Engine.collectContext({ depth, articlesUrl, context });
Engine.render(recommendations, { heading });
Engine.mount(element, { surface, depth, limit, heading });
```

`recommend` and `recommendFor` are pure synchronous APIs. Identical input produces identical ordered output.

`collectContext` is the browser adapter. It:

- reads the current OIP package if already hydrated
- reads the current stored location
- queries the unified local observation ledger
- reads photo-library metadata, Photo Coach goals, and recent shoot count locally
- fetches the static Articles JSON

It does not request geolocation, trigger a weather refresh, upload local data, or write storage.

## Rules and ranking

Safety and time-sensitive field constraints rank above opportunities and learning:

- active official weather alert: 98
- closure/flood-related wet-trail context: up to 94
- strong wind: up to 93
- weather-related trail caution: 84
- astronomical event: 83
- cervid observation context for Sheds: 82
- clear, low-moon sky: 79
- phenology transition: 77
- recent species follow-up: 74
- recent camera practice: 73
- geology context: 68
- seasonal observation prompt: 55

Article candidates begin with the existing article relevance score. Matching article categories add 8 points. Exact geographic-scope alignment adds 10 points. Scores clamp to 0–100.

Ordering is score descending, then stable recommendation id. Duplicate source articles are removed by canonical action URL. Rule recommendations retain distinct safety meanings even when they lead to the same conditions page.

## Surface policy

### Dashboard

The shared engine ranks the three Field Notes articles. Existing `dashboardPicks` remain a fallback if the engine is unavailable or returns no article.

### Articles

A quiet “Observe before you choose a story” section uses contextual non-article rules. The full feed remains publisher-oriented and keeps its established filters and ordering.

### Scenes

The former topic-only related article mount is replaced by a mixed recommendation surface. Local photo metadata and practice goals can inform suggestions without leaving the device. When local photo context is absent, a seasonal observation prompt may appear with at most one photography/astronomy/geology-related article.

### Sheds

The former topic-only related article mount is replaced by safety, trail, cervid/habitat-observation, and tightly filtered habitat/wildlife reading. At most one related article is shown. Recommendations explicitly avoid guaranteeing finds.

## Privacy and trust

- Local observations, photo metadata, and practice goals stay in browser memory during evaluation.
- The engine makes no network request other than the existing static Articles JSON fetch.
- Exact observation coordinates are not rendered.
- Recommendation text does not claim live data when only seasonal or local context exists.
- Official warnings remain the authority for hazards and closures.
- No AI, model API, inferred identity, engagement optimization, or behavioral tracking is present.

## Failure behavior

- Missing domains are normal and do not throw.
- Failed Articles fetch yields context-only recommendations.
- Sparse context yields a seasonal observation prompt.
- If no rule is justified, the renderer says so instead of fabricating a suggestion.
- Mount errors render an honest unavailable state and clear `aria-busy`.

## Accessibility and responsive behavior

- Recommendations use headings, articles, links, and an explicit region label supplied by the host page.
- Action links retain a 44px minimum target.
- The responsive grid collapses through `auto-fit` and `minmax`.
- Long titles wrap.
- No motion is required to understand or use the recommendations.

## Extending the engine

Add a rule only when:

1. its inputs already exist in the normalized contract
2. its trigger can be tested deterministically
3. it names its evidence
4. it states uncertainty honestly
5. it declares eligible surfaces
6. it does not duplicate a domain engine’s calculations

Provider fetching, species models, trail analysis, article ingestion, and photo processing remain outside this layer. This engine composes their outputs; it does not replace them.

## Verification

```bash
node automation/test-outdoor-recommendations.mjs
node automation/test-articles-rss.mjs
node automation/test-home-rc1.mjs
```

The dedicated suite covers all 12 declared domains, deterministic ordering, safety priority, surface filtering, article/location scoring, sparse-state honesty, direct page integrations, and the absence of AI integration.
