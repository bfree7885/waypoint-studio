#!/usr/bin/env node
/**
 * Sheds — observation patterns + observation-only heat regressions.
 * Run: node automation/test-sheds-observation-heat.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function assert(name, cond, detail) {
  if (cond) console.log("PASS", name);
  else {
    failures.push(name + ": " + (detail || "failed"));
    console.log("FAIL", name, "—", detail || "");
  }
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const storeMap = new Map();
const sandbox = {
  console,
  Math,
  isFinite,
  Number,
  String,
  Array,
  Object,
  Date,
  localStorage: {
    getItem: (k) => (storeMap.has(k) ? storeMap.get(k) : null),
    setItem: (k, v) => storeMap.set(k, String(v)),
    removeItem: (k) => storeMap.delete(k)
  }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(read("apps/shed-hunting/js/sheds-observation-store.js"), sandbox);
vm.runInNewContext(read("apps/shed-hunting/js/sheds-observation-patterns.js"), sandbox);

const Store = sandbox.WaypointShedsObservations;
const Patterns = sandbox.WaypointShedsObservationPatterns;

assert("modules loaded", !!(Store && Patterns));

// Empty / no fake prod path
const emptyPatterns = Patterns.aggregatePatterns([]);
assert("empty not sufficient", emptyPatterns.sufficient === false);
assert("empty insufficiency reason", /need at least/i.test(emptyPatterns.insufficiencyReason));

const FakeBounds = {
  getWest() { return -91.3; },
  getEast() { return -91.2; },
  getSouth() { return 44.1; },
  getNorth() { return 44.18; }
};

const emptyGrid = Patterns.buildObservationHeatGrid(FakeBounds, 8, 8, [], Patterns.defaultHeatFilters());
assert("empty heat has zero priorities", emptyGrid.cells.every((c) => c.priority === 0));
assert("empty heat labeled observed", emptyGrid.layerLabel === "Observed activity");
assert("empty heat honest coverage", /no observations|empty/i.test(emptyGrid.coverage.label));
assert("empty heat disclaimer", /not a live wildlife map/i.test(emptyGrid.disclaimer));

// Create private observations via store (production path uses same store — no seed file)
const points = [
  { lat: 44.14, lng: -91.25, type: "deer_seen", hour: 7, dayOffset: 0, habitat: "edge" },
  { lat: 44.141, lng: -91.251, type: "deer_sign", hour: 7, dayOffset: 1, habitat: "edge" },
  { lat: 44.142, lng: -91.252, type: "bedding_area", hour: 18, dayOffset: 2, habitat: "conifer" },
  { lat: 44.143, lng: -91.253, type: "trail_crossing", hour: 8, dayOffset: 3, habitat: "edge" },
  { lat: 44.144, lng: -91.254, type: "deer_seen", hour: 17, dayOffset: 4, habitat: "ridge" },
  { lat: 44.12, lng: -91.28, type: "feeding_area", hour: 12, dayOffset: 5, habitat: "field" }
];

points.forEach((p, i) => {
  const d = new Date("2026-02-10T00:00:00");
  d.setDate(d.getDate() + p.dayOffset);
  d.setHours(p.hour, 15, 0, 0);
  const res = Store.create({
    type: p.type,
    location: { lat: p.lat, lng: p.lng, precision: "map" },
    observedAt: d.toISOString(),
    confidence: "probable",
    quantity: p.type === "deer_seen" ? 2 : 1,
    details: {
      habitat: p.habitat,
      sex: p.type === "deer_seen" ? "buck" : "unknown",
      class: p.type === "deer_seen" ? "mature" : "unknown"
    },
    weatherSnapshot: {
      capturedAt: d.toISOString(),
      source: "open-meteo",
      tempC: p.hour < 10 ? -2 : 4,
      windSpeedMs: i % 2 ? 7 : 2,
      snowMm: 1
    },
    photoRef: i === 0 ? "field-roll/IMG_001.jpg" : null,
    note: "test private note " + i
  });
  assert("create obs " + i, res.ok, res.error);
});

const listed = Store.list();
assert("store has 6 private obs", listed.length === 6);
assert("sex/class persisted", listed.some((o) => o.details && o.details.sex === "buck"));
assert("weather snapshot persisted", listed.every((o) => o.weatherSnapshot && typeof o.weatherSnapshot.tempC === "number"));
assert(
  "photoRef private string",
  listed.some((o) => o.photoRef === "field-roll/IMG_001.jpg")
);

const patterns = Patterns.aggregatePatterns(listed);
assert("patterns sufficient with 6 across days", patterns.sufficient === true);
assert("pattern summary present", /pattern derived/i.test(patterns.summary || ""));
assert("top time of day exists", patterns.topTimeOfDay.length >= 1);

const morningOnly = Patterns.filterObservations(listed, { timeOfDay: "morning" });
assert("morning filter reduces set", morningOnly.length > 0 && morningOnly.length < listed.length);
assert("morning filter buckets", morningOnly.every((o) => Patterns.timeOfDayBucket(Date.parse(o.observedAt)) === "morning"));

const windy = Patterns.filterObservations(listed, { weather: "windy" });
assert("weather filter uses snapshot", windy.length >= 1);
assert("weather filter excludes missing mismatch", windy.every((o) => o.weatherSnapshot.windSpeedMs >= 6));

const heat = Patterns.buildObservationHeatGrid(
  FakeBounds, 10, 10, listed, { timeOfDay: "all" }, { nowMs: Date.parse("2026-02-20T12:00:00Z") }
);
assert("heat has activity cells", heat.cells.some((c) => c.priority > 0));
assert("heat mode observed", heat.mode === "observed-activity");
assert("heat count matches filter", heat.observationCount === listed.filter(Patterns.isActivity).length);

const morningHeat = Patterns.buildObservationHeatGrid(
  FakeBounds, 10, 10, listed, { timeOfDay: "morning" }, { nowMs: Date.parse("2026-02-20T12:00:00Z") }
);
assert("filtered heat count", morningHeat.observationCount === morningOnly.length);
assert("filtered heat still no fake fill", morningHeat.cells.filter((c) => c.priority > 0).length >= 1);

// Ensure production map path does not ship seeded sightings
const mapHtml = read("apps/shed-hunting/map/index.html");
const mapApp = read("apps/shed-hunting/js/sheds-map-app.js");
const foundation = read("apps/shed-hunting/data/foundation.json");
assert("patterns script on map", /sheds-observation-patterns\.js/.test(mapHtml));
assert("heat mode control", /id="heat-mode"/.test(mapHtml));
assert("obs heat filters", /id="heat-tod"/.test(mapHtml) && /id="heat-season"/.test(mapHtml));
assert("deer sex/class fields", /id="obs-sex"/.test(mapHtml) && /id="obs-class"/.test(mapHtml));
assert("no seed observations in foundation", !/deer_seen|observations\s*:\s*\[/.test(foundation) || !/"lat"/.test(foundation));
assert("map app uses observation heat builder", /buildObservationHeatGrid/.test(mapApp));
assert("map app does not inject demo sightings", !/demoObservations|seedSightings|fakeSightings|SAMPLE_OBS/i.test(mapApp));

// Search source files for hard-coded fake production sightings
const prodJs = [
  "apps/shed-hunting/js/sheds-map-app.js",
  "apps/shed-hunting/js/sheds-observation-store.js",
  "apps/shed-hunting/js/sheds-observation-patterns.js",
  "apps/shed-hunting/js/sheds-todays-search.js"
];
prodJs.forEach((rel) => {
  const src = read(rel);
  assert("no fake prod seed in " + path.basename(rel), !/FAKE_SIGHTINGS|DEMO_SIGHTINGS|seedProductionObservations/i.test(src));
});

if (failures.length) {
  console.error("\n" + failures.length + " failure(s)");
  process.exit(1);
}
console.log("\nAll observation-heat checks passed.");
