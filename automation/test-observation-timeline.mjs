import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stores = new Map();
const localStorage = {
  getItem(key) { return stores.has(key) ? stores.get(key) : null; },
  setItem(key, value) { stores.set(key, String(value)); },
  removeItem(key) { stores.delete(key); }
};
function put(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

put("waypoint-fieldry-observations-v1", [
  {
    id: "bird-1",
    meta: {
      createdAt: "2026-08-05T10:01:00Z",
      updatedAt: "2026-08-05T10:02:00Z",
      fieldry: { category: "birds", observationType: "bird-sighting" }
    },
    taxon: { label: "Great blue heron", commonName: "Great blue heron", scientificName: "Ardea herodias" },
    observedAt: { date: "2026-08-05", time: "10:00:00", recordedAt: "2026-08-05T10:00:00Z" },
    location: { latitude: 41.7, longitude: -73.9, county: "Dutchess", stateCode: "NY", privacy: { precision: "county" } },
    record: { notes: "Fishing along the marsh edge." },
    privacy: { retention: "local-only" }
  },
  {
    id: "fungus-1",
    meta: {
      createdAt: "2026-08-04T09:01:00Z",
      fieldry: { category: "fungi", observationType: "fungus" }
    },
    taxon: { label: "Turkey tail", commonName: "Turkey tail" },
    observedAt: { date: "2026-08-04", recordedAt: "2026-08-04T09:00:00Z" },
    location: { county: "Ulster", stateCode: "NY", privacy: { precision: "county" } }
  }
]);
put("waypoint-sheds-observations-v1", [{
  id: "shed-1",
  type: "trail_crossing",
  speciesId: "odocoileus-virginianus",
  observedAt: "2026-08-03T08:00:00Z",
  location: { lat: 41.8, lng: -74.0, precision: "exact" },
  note: "Muddy crossing.",
  createdAt: "2026-08-03T08:01:00Z"
}]);
put("foragecast.journal.v1", [{
  id: "journal-1",
  text: "First chanterelle flush after rain.",
  speciesId: "chanterelle",
  at: "2026-08-02T07:00:00Z"
}]);
put("waypoint-photo-library-index-v1", [{
  id: "photo-1",
  filename: "marsh-heron.jpg",
  captureDate: "2026-08-05T09:55:00Z",
  importDate: "2026-08-05T11:00:00Z",
  gps: { latitude: 41.7, longitude: -73.9 },
  camera: { make: "Olympus", model: "E-M10" },
  tags: ["bird"],
  media: { thumbnailDataUrl: "data:image/jpeg;base64,abc" }
}]);
put("waypoint-photo-coach-shoots-v1", [{
  id: "shoot-1",
  title: "Marsh morning",
  startedAt: "2026-08-05T09:30:00Z",
  createdAt: "2026-08-05T11:15:00Z"
}]);
put("waypoint-sheds-sessions-v1", [{
  id: "trip-1",
  startedAt: "2026-08-01T06:00:00Z",
  endedAt: "2026-08-01T09:00:00Z",
  distanceM: 3218,
  status: "complete",
  createdAt: "2026-08-01T06:00:00Z"
}]);

let fetchCount = 0;
const articlePayload = {
  articles: [{
    id: "article-1",
    title: "Watching migration from the river",
    summary: "A field guide to migration observation.",
    publishedAt: "2026-08-05T08:00:00Z",
    discoveredAt: "2026-08-05T08:05:00Z",
    sourceName: "Example Publisher",
    canonicalUrl: "https://example.org/migration",
    categories: ["Birds"],
    geographicScopes: ["Hudson Valley"]
  }]
};
const platform = {
  meta: { hydratedAt: "2026-08-05T12:00:00Z" },
  location: { label: "Hudson Valley", latitude: 41.7, longitude: -73.9 },
  weatherRef: {
    meta: { provider: "test-weather", fetchedAt: "2026-08-05T12:00:00Z" },
    current: {
      observedAt: "2026-08-05T12:00:00Z",
      conditions: { summary: "Light rain" },
      temperature: { value: 68, unit: "°F" }
    }
  },
  trailConditions: {
    summary: "Wet tread",
    updatedAt: "2026-08-05T11:50:00Z",
    provider: "test-trails",
    closures: []
  }
};

const sandbox = {
  console,
  Date,
  Promise,
  localStorage,
  isFinite,
  encodeURIComponent,
  setTimeout,
  clearTimeout,
  addEventListener() {},
  dispatchEvent() {},
  CustomEvent: function CustomEvent(type, options) { this.type = type; this.detail = options && options.detail; },
  fetch: async () => {
    fetchCount += 1;
    return { ok: true, async json() { return articlePayload; } };
  },
  WDS: {
    outdoorIntelligence: { getLast() { return platform; } }
  }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

for (const relative of [
  "design-system/js/platform/wds-platform-observations.js",
  "design-system/js/platform/wds-observation-timeline.js"
]) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  vm.runInNewContext(source, sandbox, { filename: relative });
}

const service = sandbox.WDS.platformObservations;
const timeline = sandbox.WDS.observationTimeline;
assert.equal(service.version, "2.0.0");
assert.equal(service.schema, "https://waypointstudio.org/schemas/platform-observation/v2");
assert.deepEqual(
  Array.from(service.kinds),
  ["photo", "journal", "sighting", "weather", "trip", "article", "species", "trail-condition", "general"]
);

const local = service.list({ limit: 50 });
const localKinds = new Set(local.map((item) => item.kind));
for (const kind of ["photo", "journal", "sighting", "weather", "trip", "trail-condition"]) {
  assert.ok(localKinds.has(kind), `local timeline should contain ${kind}`);
}
assert.ok(local.every((item) => service.validate(item).ok));
assert.equal(local[0].kind, "weather", "current weather should lead by observed time");

const heron = local.find((item) => item.id === "fieldry:sighting:bird-1");
assert.ok(heron);
assert.equal(heron.subject.label, "Great blue heron");
assert.equal(heron.sourceApp, "fieldry", "legacy alias remains available");
assert.equal(heron.locationLabel, "Dutchess, NY");
assert.equal(heron.taxonLabel, "Great blue heron");

const trail = local.find((item) => item.id === "shed-hunting:trail-condition:shed-1");
assert.ok(trail);
assert.equal(trail.kind, "trail-condition");

const species = service.fromSpecies({
  id: "species-1",
  commonName: "Wood thrush",
  scientificName: "Hylocichla mustelina",
  observedAt: "2026-08-05T07:00:00Z",
  sourceId: "field-guide"
});
assert.equal(species.kind, "species");
assert.ok(service.validate(species).ok);

const queried = await service.query({
  limit: 50,
  articlesUrl: "/data/articles/articles.json",
  extra: [species]
});
const queriedKinds = new Set(queried.map((item) => item.kind));
assert.ok(queriedKinds.has("article"));
assert.ok(queriedKinds.has("species"));
assert.equal(fetchCount, 1);
await service.loadArticlePayload("/data/articles/articles.json");
assert.equal(fetchCount, 1, "article payload should be shared across consumers");
const kindLimited = await service.query({
  articlesUrl: "/data/articles/articles.json",
  maxPerKind: { sighting: 1 },
  limit: 50
});
assert.equal(kindLimited.filter((item) => item.kind === "sighting").length, 1);

const sightings = await service.query({
  kinds: ["sighting"],
  includeArticles: false,
  limit: 20
});
assert.ok(sightings.length >= 2);
assert.ok(sightings.every((item) => item.kind === "sighting"));

const ids = queried.map((item) => item.id);
assert.equal(new Set(ids).size, ids.length, "timeline ids must be unique");
assert.deepEqual(
  queried.map((item) => item.observedAt),
  queried.map((item) => item.observedAt).slice().sort().reverse(),
  "timeline should sort by observation time descending"
);

const rendered = timeline.render([heron, local.find((item) => item.kind === "photo")], {
  heading: "Recent observations"
});
assert.match(rendered, /Recent observations/);
assert.match(rendered, /Great blue heron/);
assert.match(rendered, /Photo/);
assert.match(rendered, /exact coordinates are never shown/i);
assert.doesNotMatch(rendered, /41\.7|-73\.9/, "rendered timeline must not expose coordinates");
assert.doesNotMatch(rendered, /data:image/, "rendered timeline must not embed private thumbnails");

for (const relative of [
  "articles/index.html",
  "apps/scenes/index.html",
  "apps/shed-hunting/index.html"
]) {
  const html = fs.readFileSync(path.join(root, relative), "utf8");
  assert.match(html, /wds-observation-timeline\.js/);
  assert.match(html, /observationTimeline\.mount/);
}
const dashboard = fs.readFileSync(
  path.join(root, "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-deepeners.js"),
  "utf8"
);
assert.match(dashboard, /data-deepen-body="timeline"/);
assert.match(dashboard, /observationTimeline/);
const loader = fs.readFileSync(path.join(root, "design-system/js/wds.js"), "utf8");
assert.match(loader, /platform\/wds-observation-timeline\.js/);

console.log("Observation timeline tests passed.");
