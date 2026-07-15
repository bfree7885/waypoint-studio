#!/usr/bin/env node
/**
 * Sheds field map — observation store + likelihood model regressions.
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

let passed = 0;
const failures = [];

function pass(name) {
  console.log("PASS", name);
  passed += 1;
}

function assert(name, cond, detail) {
  if (cond) pass(name);
  else {
    failures.push(name + (detail ? ": " + detail : ""));
    console.error("FAIL", name, detail || "");
  }
}

function loadStore() {
  const sandbox = {
    window: {},
    localStorage: (function () {
      const m = new Map();
      return {
        getItem: (k) => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => m.set(k, String(v)),
        removeItem: (k) => m.delete(k)
      };
    })()
  };
  sandbox.global = sandbox;
  sandbox.window = sandbox;
  vm.runInNewContext(
    fs.readFileSync(path.join(ROOT, "apps/shed-hunting/js/sheds-observation-store.js"), "utf8"),
    sandbox
  );
  return sandbox.WaypointShedsObservations;
}

function loadModel() {
  const sandbox = { window: {}, console };
  sandbox.global = sandbox;
  sandbox.window = sandbox;
  vm.runInNewContext(
    fs.readFileSync(path.join(ROOT, "apps/shed-hunting/js/sheds-likelihood-model.js"), "utf8"),
    sandbox
  );
  return sandbox.WaypointShedsLikelihood;
}

const Store = loadStore();
const Model = loadModel();

assert("store loaded", !!(Store && Store.create));
assert("model loaded", !!(Model && Model.buildGrid));
assert("whitetail species id", Store.SPECIES_WHITETAIL === "odocoileus-virginianus");

const created = Store.create({
  type: "feeding_area",
  location: { lat: 44.1, lng: -91.2 },
  note: "south alfalfa"
});
assert("observation create", created.ok && created.observation.id);
assert("observation persists", Store.list().length === 1);
assert("observation private", created.observation.privacy === "private");

const edited = Store.update(created.observation.id, { note: "updated edge" });
assert("observation edit", edited.ok && edited.observation.note === "updated edge");

const shed = Store.create({
  type: "shed_found",
  location: { lat: 44.11, lng: -91.21 },
  details: { side: "left", freshness: "fresh", antlerCount: 1, collected: false }
});
assert("shed_found details", shed.ok && shed.observation.details.side === "left");

const search = Store.create({
  type: "search_completed",
  location: { lat: 44.1, lng: -91.2 }
});
assert("search observation", search.ok);

const filtered = Store.list().filter((o) => o.type === "feeding_area");
assert("filter by type", filtered.length === 1);

const removed = Store.remove(edited.observation.id);
assert("observation delete", removed.ok && Store.list().every((o) => o.id !== edited.observation.id));

const prefs = Store.defaultModelPrefs();
assert("default prefs balanced", prefs.weights.season === "balanced");

const FakeBounds = {
  getWest() { return -91.3; },
  getEast() { return -91.1; },
  getSouth() { return 44.0; },
  getNorth() { return 44.2; }
};

const baseGrid = Model.buildGrid(FakeBounds, 8, 8, {
  date: new Date("2026-02-15T12:00:00Z"),
  prefs: prefs,
  observations: Store.list(),
  elevations: null
});
assert("grid builds without elevation", baseGrid.cells.length === 64);
assert("coverage limited without terrain/wx", baseGrid.coverage.level === "limited" || baseGrid.coverage.level === "moderate");

const center = baseGrid.cells[Math.floor(baseGrid.cells.length / 2)];
const withSearchStrong = Model.buildGrid(FakeBounds, 8, 8, {
  date: new Date("2026-02-15T12:00:00Z"),
  prefs: Object.assign({}, prefs, { weights: Object.assign({}, prefs.weights, { searchHistory: "strong", feeding: "strong" }) }),
  observations: Store.list()
});
const midStrong = withSearchStrong.cells.find((c) =>
  Math.abs(c.lat - 44.1) < 0.03 && Math.abs(c.lng - (-91.2)) < 0.03
) || withSearchStrong.cells[0];

const prefsOffSearch = Object.assign({}, prefs, {
  weights: Object.assign({}, prefs.weights, { searchHistory: "off", feeding: "strong" })
});
const withoutSearchPenalty = Model.buildGrid(FakeBounds, 8, 8, {
  date: new Date("2026-02-15T12:00:00Z"),
  prefs: prefsOffSearch,
  observations: Store.list()
});
const midOff = withoutSearchPenalty.cells.find((c) =>
  Math.abs(c.lat - midStrong.lat) < 0.001 && Math.abs(c.lng - midStrong.lng) < 0.001
) || withoutSearchPenalty.cells[0];

assert(
  "search-completed reduces priority when enabled",
  midStrong.priority <= midOff.priority + 0.0001,
  "strong=" + midStrong.priority + " off=" + midOff.priority
);

const prefsAspect = Object.assign({}, prefs, {
  weights: Object.assign({}, prefs.weights, { aspect: "strong", slope: "strong" })
});
const elev = [];
for (let r = 0; r < 8; r++) {
  for (let c = 0; c < 8; c++) elev.push(200 + r * 3 + c * 0.5);
}
const withElev = Model.buildGrid(FakeBounds, 8, 8, {
  date: new Date("2026-02-15T12:00:00Z"),
  prefs: prefsAspect,
  observations: [],
  elevations: elev
});
const flatPrefs = Object.assign({}, prefs, {
  weights: Object.assign({}, prefs.weights, { aspect: "off", slope: "off", season: "balanced" })
});
const flatElev = Model.buildGrid(FakeBounds, 8, 8, {
  date: new Date("2026-02-15T12:00:00Z"),
  prefs: flatPrefs,
  observations: [],
  elevations: elev
});
assert(
  "heat changes when terrain weights change",
  withElev.cells.some((c, i) => Math.abs(c.priority - flatElev.cells[i].priority) > 0.01)
);

const explained = Model.explain(center.result, { coverage: baseGrid.coverage });
assert("explanation is textual", typeof explained === "string" && explained.length > 40);
assert("explanation avoids antler certainty", !/antler here|90%|guaranteed/i.test(explained));
assert("explanation mentions guidance or priority", /priority|guidance|season|observation/i.test(explained));

const reset = Store.defaultModelPrefs();
assert("reset defaults heat visible", reset.heatVisible === true);

// Neutral view / no Kansas sentinel in source
const appSrc = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/js/sheds-map-app.js"), "utf8");
assert("no US geographic center leak", !/39\.8283/.test(appSrc) && !/-98\.5795/.test(appSrc));
assert("neutral view labeled in source", /Neutral starting view|NEUTRAL/.test(appSrc));
assert("map shell progressive note", /Map shell ready/.test(
  fs.readFileSync(path.join(ROOT, "apps/shed-hunting/map/index.html"), "utf8")
));
assert("hidden overlay pattern for sheets", /\.sheds-sheet\.is-open/.test(
  fs.readFileSync(path.join(ROOT, "apps/shed-hunting/css/sheds-map.css"), "utf8")
));

const html = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/map/index.html"), "utf8");
assert("leaflet css present", /leaflet@1\.9\.4/.test(html));
assert("opentopo attribution path ready", /OpenTopoMap|opentopomap/.test(appSrc) || /OpenTopoMap/.test(html));
assert("ethics sheet present", /Field ethics/.test(html));

if (failures.length) {
  console.error("\nSheds map tests failed (" + failures.length + ").");
  process.exit(1);
}
console.log("\nAll sheds map tests passed (" + passed + ").");
