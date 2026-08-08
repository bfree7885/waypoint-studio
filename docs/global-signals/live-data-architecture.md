# Global Signals — Live Data Architecture

**Branch:** `feature/global-signals-live-data-architecture`  
**Status:** Owner review (not merged)  
**Cadence:** Every 6 hours via `.github/workflows/global-signals-ingest.yml`

## Mission

Convert Global Signals from demo/sample datasets to a production system designed around continuously refreshed real-world data — **architecture + shared interfaces first**, honest empty states, no fabricated events.

## Canonical layers

```
SOURCE DATA
    ↓  (independent adapters; approved public APIs/RSS only)
NORMALIZED EVENTS
    ↓  (dedupe; preserve multiple sourceRefs)
ENTITIES
    ↓  (canonical knowledge graph nodes)
RELATIONSHIPS
    ↓  (evidence-backed edges; activation from events)
IMPACT ASSESSMENT
    ↓  (rule/graph propagation; confidence decay by order)
GLOBAL SIGNALS UI
    (Articles, Graph, Explorer, Industry, Citizen Impact)
```

## Provenance (every record)

Required fields:

- `source`
- `sourceUrl`
- `publisher`
- `publishedAt` (when known)
- `retrievedAt`
- `lastVerifiedAt`

## Relationships (every edge)

Required fields:

- `evidence` (label/url/notes)
- `confidence`
- `derivationMethod` (`authoritative_dataset` · `documented_trade_structure` · `known_infrastructure_dependency` · `coded_rule`)
- `updatedAt` / `lastVerifiedAt`
- `direction` · `relationshipType`

**No unsupported AI guesses.** Edges come from authoritative structured facts, documented trade structure, known infrastructure dependencies, verified public sources, or explicitly coded rules.

## Impacts

Orders:

1. **FIRST-ORDER** — direct coded edge from an activated entity  
2. **SECOND-ORDER** — one additional verified dependency  
3. **THIRD-ORDER** — further dependency; lower confidence by distance decay  

Impact fields: `originEvent` · `path` · `affectedEntity` · `impactDirection` · `confidence` · `timeHorizon` · `evidence` · `updatedAt` · `whyThisIsShowing`

Predicted impacts **must never** be labeled `Observed`.

## Articles + Waypoint’s Take

- Production path: `data/global-signals/articles/articles.json` (`mode: live` | `live-empty`)
- Fixtures only: `data/global-signals/fixtures/articles/articles.json` (`mode: sample-demo`)
- Summaries are truncated source text — **full copyrighted articles are not republished**
- Waypoint’s Take is **deterministic template assembly** over event provenance + graph impacts
- Take separates **VERIFIED** vs **ANALYSIS**; no take when evidence is insufficient

## Production paths

| Artifact | Path |
| --- | --- |
| Events | `data/global-signals/production/events/events.json` |
| Graph | `data/global-signals/production/graph/graph.json` |
| Impacts | `data/global-signals/production/impacts/impacts.json` |
| Articles | `data/global-signals/production/articles/articles.json` (+ compat `articles/articles.json`) |
| Ingestion status | `data/global-signals/ingestion/status.json` |
| Source registry | `data/global-signals/sources/registry.json` |
| Schemas | `data/global-signals/schema/*.schema.json` |
| Fixtures | `data/global-signals/fixtures/**` |

Compat mirrors under `data/global-signals/{events,relationship-graph,relationships,impacts}/` keep existing module URL assumptions working without new UI features.

## Loader gate

`design-system/js/global-signals/wds-gs-loader.js` and articles `loadArticles()` refuse `sample-demo` / fixture modes unless `allowFixture: true` (tests only).

## Connected sources (v1 adapters)

| Adapter | Kind | Notes |
| --- | --- | --- |
| `federal-register` | JSON API | OFAC, BIS, USTR, CBP agency docs |
| `usgs-earthquakes` | GeoJSON | Significant earthquakes (M≥6) |
| `noaa-news` | RSS | Weather/climate/oceans features (filtered) |
| `state-dept` | RSS | Filtered conflict/sanctions/security items |

CISA advisory XML returned HTTP 403 from this environment — left disconnected (honest failure, not scraped). Direct OFAC SDN XML timed out — sanctions coverage via Federal Register instead.

## Ingestion blockers (real)

1. Many IO/port authority feeds lack stable public machine APIs or prohibit bulk scraping.  
2. CISA feed blocked (403) without alternate licensed access.  
3. Full OFAC SDN download is large / slow for hourly static Pages commits.  
4. GitHub Actions `GITHUB_TOKEN` commits can trigger Pages rebuilds when on the Pages source branch — keep cadence ≥6h and prefer feature-branch dry runs until merge.  
5. Entity resolution is rule/keyword based — not a full NER stack; unmatched events activate nothing (honest).  
6. No EU/UK/UN adapters in v1 yet — add as licensed/public endpoints are confirmed.

## Pipeline entrypoints

```bash
node scripts/global-signals/run-live-pipeline.mjs
# or stages:
node scripts/global-signals/ingest/run.mjs
node scripts/global-signals/graph/build.mjs
node scripts/global-signals/impacts/propagate.mjs
node scripts/global-signals/articles/build.mjs
```

## Status exposure

`data/global-signals/ingestion/status.json` includes:

- `lastSuccessfulIngestion`
- `activeSources` / `sourcesAttempted`
- `eventsIngested`
- `sourceFailures[]`
- adapter breakdown

Articles freshness UI consumes the articles payload `freshness` object (LIVE · age · source count · health).

## Product standards

Trust is the product. Never fabricate events. Facts vs estimates vs placeholders must be clear. Empty is honest.
