# Shared Observation Timeline

Status: implemented on `feature/outdoor-intelligence-engine`
Schema version: `2.0.0`
Schema ID: `https://waypointstudio.org/schemas/platform-observation/v2`

## Purpose

Everything meaningful that happens across Waypoint Studio becomes an Observation on one shared timeline:

- photo
- journal
- bird sighting / fungus / other field sightings
- weather
- trip / outing
- article
- species
- trail condition

Dashboard, Articles, Scenes, and Sheds all consume the same service.

This is a read model. Source apps keep their own stores. The timeline never invents detections and never becomes a second private database.

## Layering

```text
Source stores remain authoritative
  Fieldry · Sheds · ForageCast · Photo Library · Scenes shoots · Volunteer · OIP · Articles
                         |
                         v
Adapters project source records into one observation schema
                         |
                         v
WDS.platformObservations.query()
                         |
                         v
WDS.observationTimeline.mount()
                         |
                         v
Dashboard · Articles · Scenes · Sheds
```

Related layers:

| Layer | Responsibility |
|-------|----------------|
| WOS (`WDS.observations`) | Research-grade biological observation package |
| Shared timeline (`WDS.platformObservations`) | Cross-product chronology for every observation kind |
| Outdoor recommendations (`WDS.outdoorRecommendations`) | Deterministic next-step guidance from available context |

## Observation schema

```js
{
  schema: "https://waypointstudio.org/schemas/platform-observation/v2",
  schemaVersion: "2.0.0",
  id: "fieldry:sighting:bird-1",
  kind: "sighting",
  title: "Great blue heron",
  summary: "Fishing along the marsh edge.",
  observedAt: "2026-08-05T10:00:00.000Z",
  recordedAt: "2026-08-05T10:01:00.000Z",
  updatedAt: "2026-08-05T10:02:00.000Z",
  source: {
    id: "fieldry",
    label: "Fieldry",
    recordId: "bird-1",
    provider: null
  },
  subject: {
    kind: "birds",
    id: null,
    label: "Great blue heron",
    scientificName: "Ardea herodias"
  },
  location: {
    label: "Dutchess, NY",
    latitude: null,
    longitude: null,
    precision: "county",
    sensitive: false
  },
  media: [],
  context: {
    tags: ["birds"],
    categories: [],
    season: null,
    weather: null
  },
  privacy: {
    visibility: "private",
    retention: "local-only",
    locationPrecision: "county",
    localOnly: true
  },
  provenance: {
    method: "source-adapter",
    sourceRef: { store: "waypoint-fieldry-observations-v1", id: "bird-1" },
    canonicalUrl: null,
    attribution: null
  },
  links: {
    primary: "/apps/fieldry/#/obs/bird-1",
    external: false
  },
  honesty: "Private Fieldry observation on this device. Identification reflects the saved record."
}
```

### Kind contract

| Kind | Examples |
|------|----------|
| `photo` | Photo Library images |
| `journal` | ForageCast notes, free-form field notes |
| `sighting` | Fieldry birds/fungi/wildlife, Sheds deer/sign |
| `weather` | Current OIP weather package |
| `trip` | Sheds search sessions, Scenes shoots |
| `article` | Curated Articles feed |
| `species` | Explicit species records passed by callers |
| `trail-condition` | Trail/access notes and current trail context |
| `general` | Saved Volunteer opportunities and similar |

## Public API

```js
const Obs = WDS.platformObservations;

Obs.create(partial);
Obs.normalize(raw);
Obs.validate(observation);

Obs.list({ kinds, sources, since, until, limit, maxPerKind, extra });
Obs.query({ kinds, sources, since, until, limit, maxPerKind, includeArticles, articlesUrl, depth });
Obs.recent(12);
Obs.forApp("fieldry");
Obs.stats();
Obs.wildlifeContext();

Obs.registerAdapter("my-app", () => [Obs.create(...)]);
Obs.subscribe((detail) => { /* storage/source change */ });
Obs.loadArticlePayload("/data/articles/articles.json");

WDS.observationTimeline.mount(element, {
  kinds,
  limit,
  maxPerKind,
  includeArticles,
  heading,
  intro
});
```

`list` is synchronous for local stores and already-hydrated conditions.
`query` adds the static Articles feed when requested.

## Source adapters

| Source | Store / package | Timeline kinds |
|--------|-----------------|----------------|
| Fieldry | `waypoint-fieldry-observations-v1` | sighting |
| Sheds observations | `waypoint-sheds-observations-v1` | sighting, trail-condition, journal |
| Sheds sessions | `waypoint-sheds-sessions-v1` | trip |
| ForageCast | `foragecast.journal.v1` | journal |
| Photo Library | `waypoint-photo-library-index-v1` | photo |
| Scenes shoots | `waypoint-photo-coach-shoots-v1` | trip |
| Volunteer | `waypoint-volunteer-planning-v1` | general |
| Weather / trails | `WDS.outdoorIntelligence.getLast()` | weather, trail-condition |
| Articles | `data/articles/articles.json` | article |

Adapters project; they do not copy records into a new store. Broken source stores are ignored so one bad local key cannot empty the timeline.

## Privacy

- Private source records remain private.
- Exact coordinates are never rendered by the timeline UI.
- Photo thumbnails are not embedded into the shared timeline cards.
- Articles remain publisher-owned; the timeline links out.
- Weather and trail cards are ephemeral derived conditions, not claimed detections.
- Storage change events only announce that a source changed; they do not broadcast record contents across origins.

## Surface policy

### Dashboard
Mounts a recent observation timeline in Rebuild deepeners before Field Notes. Caps weather, trail-condition, and article kinds so personal records remain visible.

### Articles
Shows private/contextual observations without article duplicates above the curated feed.

### Scenes
Shows photos, trips, sightings, weather, and at most one article.

### Sheds
Shows sightings, journals, trips, weather, trail conditions, and at most one article. Exact find coordinates stay in the Sheds app.

## Compatibility

Legacy consumers still work:

- `sourceApp`
- `subtitle`
- `locationLabel`
- `lat` / `lng`
- `taxonLabel`
- `href`
- `rawRef`

These aliases keep search, graph derivation, settings, and recommendation adapters working while the richer schema becomes the forward contract.

## Verification

```bash
node automation/test-observation-timeline.mjs
node automation/test-outdoor-recommendations.mjs
node automation/test-articles-rss.mjs
```

Coverage includes all declared kinds, unique ids, chronological sort, shared article caching, kind caps, privacy rendering constraints, and surface mounts.
