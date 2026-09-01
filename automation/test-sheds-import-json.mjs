#!/usr/bin/env node
/**
 * Shed Hunting field JSON import — compatible with Export JSON.
 * Run: node automation/test-sheds-import-json.mjs
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const failures = [];

function assert(name, cond, detail) {
  if (cond) {
    passed += 1;
    console.log("PASS", name);
  } else {
    failures.push(name + (detail ? ": " + detail : ""));
    console.error("FAIL", name, detail || "");
  }
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function memoryStorage() {
  const data = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem: function (k, v) { data[k] = String(v); },
    removeItem: function (k) { delete data[k]; }
  };
}

function loadStores() {
  const sandbox = {
    console,
    localStorage: memoryStorage(),
    crypto: { randomUUID: function () { return "test-" + Math.random().toString(16).slice(2); } }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  const files = [
    "apps/shed-hunting/js/sheds-models.js",
    "apps/shed-hunting/js/sheds-observation-store.js",
    "apps/shed-hunting/js/sheds-session-store.js",
    "apps/shed-hunting/js/sheds-search-area-store.js",
    "apps/shed-hunting/js/sheds-scout-spot-store.js",
    "apps/shed-hunting/js/sheds-validation-store.js",
    "apps/shed-hunting/js/sheds-import-json.js"
  ];
  files.forEach(function (rel) {
    vm.runInNewContext(read(rel), sandbox, { filename: rel });
  });
  return sandbox;
}

const html = read("apps/shed-hunting/map/index.html");
assert("map has Import JSON control", /id="btn-import"/.test(html));
assert("map has hidden file input", /id="import-json-file"/.test(html));
assert("map loads import module", /sheds-import-json\.js/.test(html));
assert("map loads finds model for import", /sheds-models\.js/.test(html));
assert("map-app wires import click", /btn-import/.test(read("apps/shed-hunting/js/sheds-map-app.js")));
assert("export includes finds", /listFinds/.test(read("apps/shed-hunting/js/sheds-map-app.js")));

const sb = loadStores();
const empty = sb.WaypointShedsImport.parseExport("{}");
assert("empty object rejected", !empty.ok);

const bogus = sb.WaypointShedsImport.parseExport("{not json");
assert("invalid json rejected", !bogus.ok);

const payload = {
  format: "waypoint-sheds-field-private-v1",
  observations: {
    observations: [
      {
        id: "obs_keep",
        type: "deer_sign",
        location: { lat: 41.32, lng: -74.8 },
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    ]
  },
  sessions: {
    sessions: [{ id: "sess_1", status: "active", startedAt: "2026-01-01T00:00:00.000Z" }],
    coverage: [{ cellKey: "41.3200,-74.8000", level: "partial" }]
  },
  searchAreas: {
    searchAreas: [
      {
        id: "area_1",
        name: "Ridge",
        center: { lat: 41.3226, lng: -74.8027 },
        radiusM: 600
      }
    ]
  },
  scoutSpots: {
    scoutSpots: [
      {
        id: "spot_1",
        name: "Creek bench",
        status: "Plan",
        location: { lat: 41.323, lng: -74.801 },
        terrain: { available: false, status: "unavailable", searchPriority: null }
      }
    ]
  },
  validations: [{ id: "val_1", lat: 41.32, lng: -74.8 }],
  finds: [{ id: "shed_1", speciesId: "odocoileus-virginianus" }],
  modelPrefs: { heatVisible: false }
};

const parsed = sb.WaypointShedsImport.parseExport(JSON.stringify(payload));
assert("parses nested export", parsed.ok && parsed.observations.length === 1 && parsed.sessions.length === 1);

const result = sb.WaypointShedsImport.importPayload(parsed);
assert("import ok", result.ok, JSON.stringify(result));
assert("observations added", result.counts.observations && result.counts.observations.added === 1);
assert("search areas added", result.counts.searchAreas && result.counts.searchAreas.added === 1);
assert("scout spots added", result.counts.scoutSpots && result.counts.scoutSpots.added === 1);
assert("sessions added", result.counts.sessions && result.counts.sessions.added === 1);
assert("active session not restored as active", sb.WaypointShedsSessions.listSessions()[0].status === "ended");
assert("coverage imported", result.counts.sessions.coverageAdded === 1);
assert("validations added", result.counts.validations && result.counts.validations.added === 1);
assert("finds added", result.counts.finds && result.counts.finds.added === 1);
assert("model prefs saved", sb.WaypointShedsObservations.loadModelPrefs().heatVisible === false);

const again = sb.WaypointShedsImport.importPayload(parsed);
assert("reimport replaces same ids", result.ok && again.counts.observations.replaced === 1 && again.counts.observations.added === 0);
assert("observation count stays 1", sb.WaypointShedsObservations.list().length === 1);

const htmlHonesty = read("apps/shed-hunting/js/sheds-map-app.js");
assert(
  "import copy does not claim antler presence",
  /does not prove a find/.test(htmlHonesty) && !/antler is here|confirmed antler/i.test(htmlHonesty)
);

const legacyNoScout = loadStores();
const legacyParsed = legacyNoScout.WaypointShedsImport.parseExport(JSON.stringify({
  format: "waypoint-sheds-field-private-v1",
  observations: [{
    id: "obs_legacy",
    type: "deer_sign",
    location: { lat: 40.1, lng: -105.2 }
  }]
}));
assert("legacy export without scoutSpots still parses", legacyParsed.ok && legacyParsed.observations.length === 1 && legacyParsed.scoutSpots.length === 0);
const legacyResult = legacyNoScout.WaypointShedsImport.importPayload(legacyParsed);
assert("legacy import without scoutSpots succeeds", legacyResult.ok && legacyNoScout.WaypointShedsObservations.list().length === 1);
assert("legacy import does not invent scout spots", legacyNoScout.WaypointShedsScoutSpots.list().length === 0);

const scoutOnly = loadStores();
const scoutOnlyParsed = scoutOnly.WaypointShedsImport.parseExport(JSON.stringify({
  format: "waypoint-sheds-field-private-v1",
  scoutSpots: [
    { id: "spot_solo", location: { lat: 39.5, lng: -105.1 }, name: "Solo" }
  ]
}));
assert("scout-only payload parses", scoutOnlyParsed.ok && scoutOnlyParsed.scoutSpots.length === 1);
const scoutOnlyResult = scoutOnly.WaypointShedsImport.importPayload(scoutOnlyParsed);
assert("scout-only import works", scoutOnlyResult.ok && scoutOnly.WaypointShedsScoutSpots.list().length === 1);

const mixed = loadStores();
mixed.WaypointShedsObservations.importList([{
  id: "obs_keep_malformed",
  type: "deer_sign",
  location: { lat: 41.1, lng: -74.9 }
}]);
const mixedParsed = mixed.WaypointShedsImport.parseExport(JSON.stringify({
  format: "waypoint-sheds-field-private-v1",
  observations: [{
    id: "obs_keep_malformed",
    type: "deer_sign",
    location: { lat: 41.1, lng: -74.9 }
  }, {
    id: "obs_new_ok",
    type: "deer_sign",
    location: { lat: 41.2, lng: -74.8 }
  }],
  scoutSpots: [
    { id: "spot_bad_coords", location: { lat: 999, lng: -105 }, name: "Nope" },
    { id: "spot_ok_mixed", location: { lat: 41.15, lng: -74.85 }, name: "Good" },
    null
  ]
}));
const mixedResult = mixed.WaypointShedsImport.importPayload(mixedParsed);
assert("malformed scout does not fail the import", mixedResult.ok);
assert("valid observations survive a malformed scout", mixed.WaypointShedsObservations.list().length === 2);
assert("malformed scout skipped, valid scout added", mixedResult.counts.scoutSpots.skipped >= 2 && mixedResult.counts.scoutSpots.added === 1);
assert("good scout stored", !!mixed.WaypointShedsScoutSpots.getById("spot_ok_mixed"));

const againScout = scoutOnly.WaypointShedsImport.importPayload(scoutOnlyParsed);
assert("reimport scout does not duplicate", againScout.ok && againScout.counts.scoutSpots.added === 0 && againScout.counts.scoutSpots.replaced === 1);
assert("scout count stays 1 after reimport", scoutOnly.WaypointShedsScoutSpots.list().length === 1);

if (failures.length) {
  console.error("\n" + failures.length + " failure(s).");
  process.exit(1);
}
console.log("\nShed Hunting import JSON checks passed (" + passed + ").");
