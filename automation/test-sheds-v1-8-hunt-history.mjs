#!/usr/bin/env node
/**
 * Sheds V1.8 — Hunt History (finished Hunt Records, no heat map).
 * Run: node automation/test-sheds-v1-8-hunt-history.mjs
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
    removeItem: function (k) { delete data[k]; },
    _data: data
  };
}

const STORE_FILES = [
  "apps/shed-hunting/js/sheds-today-hunt.js",
  "apps/shed-hunting/js/sheds-search-priority.js",
  "apps/shed-hunting/js/sheds-scout-spot-store.js",
  "apps/shed-hunting/js/sheds-hunt-plan-store.js",
  "apps/shed-hunting/js/sheds-hunt-session-store.js",
  "apps/shed-hunting/js/sheds-hunt-activity-store.js",
  "apps/shed-hunting/js/sheds-hunt-record-store.js",
  "apps/shed-hunting/js/sheds-observation-store.js",
  "apps/shed-hunting/js/sheds-session-store.js",
  "apps/shed-hunting/js/sheds-search-area-store.js",
  "apps/shed-hunting/js/sheds-validation-store.js",
  "apps/shed-hunting/js/sheds-models.js",
  "apps/shed-hunting/js/sheds-import-json.js"
];

function load(opts) {
  opts = opts || {};
  const storage = opts.storage || memoryStorage();
  const sandbox = {
    console,
    localStorage: storage,
    crypto: { randomUUID: function () { return "test-" + Math.random().toString(16).slice(2); } }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  (opts.files || STORE_FILES).forEach(function (rel) {
    vm.runInNewContext(read(rel), sandbox, { filename: rel });
  });
  sandbox.storage = storage;
  return sandbox;
}

function sampleRecord(overrides) {
  return Object.assign({
    schemaVersion: 1,
    kind: "hunt-record",
    huntRecordId: "hrec_a",
    huntPlanId: "plan_ridge",
    huntPlanNameSnapshot: "Ridge North",
    startedAt: "2026-09-01T10:00:00.000Z",
    finishedAt: "2026-09-01T12:00:00.000Z",
    trackPoints: [
      { lat: 41.325, lng: -74.802, t: 1 },
      { lat: 41.326, lng: -74.802, t: 20000 }
    ],
    trackDistanceM: 111,
    trackDistanceAvailable: true,
    observations: [{
      id: "hobs_shed",
      type: "shed_found",
      createdAt: "2026-09-01T11:00:00.000Z",
      lat: 41.326,
      lng: -74.802,
      note: "Left side"
    }],
    scoutSpotIds: ["spot_keep"],
    privacy: "private-local"
  }, overrides || {});
}

const html = read("apps/shed-hunting/map/index.html");
const css = read("apps/shed-hunting/css/sheds-map.css");
const app = read("apps/shed-hunting/js/sheds-map-app.js");
const recordSrc = read("apps/shed-hunting/js/sheds-hunt-record-store.js");
const sessionSrc = read("apps/shed-hunting/js/sheds-hunt-session-store.js");
const activitySrc = read("apps/shed-hunting/js/sheds-hunt-activity-store.js");

assert("Hunt History control labeled", /id="btn-history"/.test(html) && />Hunt History</.test(html));
assert("Hunt History sheet title", /id="history-title">Hunt History</.test(html));
assert("empty Hunt History copy", /No hunts recorded yet/i.test(html));
assert("empty state is not an error", /Finish a Field Hunt to build your private Hunt History/.test(html));
assert("Hunt Detail sheet", /id="sheet-hunt-detail"/.test(html));
assert("Shed Found history tab", /id="btn-history-sheds"/.test(html) && /id="shed-found-history-list"/.test(html));
assert("Show on map control", /id="btn-hunt-detail-map"/.test(html));
assert("delete Hunt Record control", /id="btn-hunt-detail-delete"/.test(html));
assert("historical track legend", /PREVIOUS SEARCH/.test(html) && /sheds-marker-legend__swatch--history-track/.test(css));
assert("historical track style is subordinate", /sheds-history-track/.test(css) && /#6d7a6c/.test(css + app));
assert("live hunt track remains sand", /sheds-hunt-track/.test(css) && /#b89a62/.test(css + app));
assert("history layers added before live hunt layers",
  /historyTrackLayer = L\.layerGroup\(\)\.addTo\(map\);[\s\S]{0,180}huntTrackLayer = L\.layerGroup\(\)\.addTo\(map\)/.test(app));
assert("closeAllSheets includes Hunt Detail", /function closeAllSheets[\s\S]{0,1400}sheet-hunt-detail/.test(app));
assert("no parallel history store key", !/waypoint-sheds-hunt-history-v1/.test(recordSrc + app));
assert("canonical records key unchanged", /waypoint-sheds-hunt-records-v1/.test(recordSrc));
assert("no heat score stored on records", !/heatScore|predictedShed|findProbability|magic heat/.test(recordSrc));
assert("no heat-map from history tracks", !/blur.*track|probability surface|heat map from/.test(app + recordSrc));
assert("docs file present", fs.existsSync(path.join(ROOT, "docs/sheds/SHEDS-V1-8-HUNT-HISTORY.md")));
assert("privacy: no upload of Hunt Records", !/fetch\(.*huntRecords|XMLHttpRequest|navigator\.sendBeacon/.test(recordSrc + app));
assert("no accounts / sync / share in V1.8 history", !/cloud sync|social share|leaderboard/.test(html));
assert("history not stuffed into Field Hunt HUD", !/id="btn-field-hunt-history"/.test(html));
assert("export still omits Hunt Session", /Hunt Session is transient/.test(app) && !/huntSession:/.test(app));
assert("export still omits in-progress activity", !/huntActivity:/.test(app));
assert("V1.6 session store unchanged key", /waypoint-sheds-hunt-session-v1/.test(sessionSrc));
assert("V1.7 activity store still present", /waypoint-sheds-hunt-activity-v1/.test(activitySrc));
assert("IndexedDB not introduced in V1.8", !/indexedDB|IDBFactory/.test(recordSrc + app));
assert("history list newest-first helper", /listNewestFirst/.test(recordSrc) && /listShedFounds/.test(recordSrc));
assert("record delete helper", /remove: removeRecord/.test(recordSrc));
assert("touch-sized history cards", /sheds-history-card[\s\S]{0,280}min-height:\s*2\.75rem/.test(css));
assert("touch-sized history tabs", /sheds-history-tabs__btn[\s\S]{0,80}min-height:\s*2\.75rem/.test(css));
assert("map-app history public API", /openHuntHistory/.test(app) && /openHuntDetail/.test(app) && /showHistoricalHunt/.test(app));
assert("delete does not mention Scout Spot wipe", /Scout Spots and Hunt Plans are kept/.test(app));

const empty = load();
const R0 = empty.WaypointShedsHuntRecords;
assert("empty Hunt History list", R0.list().length === 0 && R0.listNewestFirst().length === 0);
assert("empty Shed Found history", R0.listShedFounds().length === 0);
assert("same storage key as V1.7", R0.STORAGE_KEY === "waypoint-sheds-hunt-records-v1");
assert("schema version still 1", R0.SCHEMA_VERSION === 1);
assert("localStorage cap raised for history UI, still bounded", R0.MAX_RECORDS === 24);

const one = load();
assert("one completed hunt persists", one.WaypointShedsHuntRecords.persist(sampleRecord()).ok);
assert("one hunt list length", one.WaypointShedsHuntRecords.list().length === 1);
const oneRow = one.WaypointShedsHuntRecords.listNewestFirst()[0];
assert("one hunt summary fields", !!(oneRow.startedAt && oneRow.huntPlanNameSnapshot && oneRow.trackDistanceAvailable));
assert("one hunt Shed Found count", oneRow.summary.shedFoundCount === 1);
assert("duration from timestamps", one.WaypointShedsHuntRecords.durationMs(oneRow) === 2 * 60 * 60 * 1000);

const multi = load();
multi.WaypointShedsHuntRecords.persist(sampleRecord({
  huntRecordId: "hrec_old",
  huntPlanNameSnapshot: "Older walk",
  startedAt: "2026-08-01T10:00:00.000Z",
  finishedAt: "2026-08-01T11:00:00.000Z",
  observations: []
}));
multi.WaypointShedsHuntRecords.persist(sampleRecord({
  huntRecordId: "hrec_new",
  huntPlanNameSnapshot: "Newer walk",
  startedAt: "2026-09-03T10:00:00.000Z",
  finishedAt: "2026-09-03T11:30:00.000Z",
  observations: []
}));
multi.WaypointShedsHuntRecords.persist(sampleRecord({
  huntRecordId: "hrec_mid",
  huntPlanNameSnapshot: "Mid walk",
  startedAt: "2026-08-20T10:00:00.000Z",
  finishedAt: "2026-08-20T12:00:00.000Z",
  observations: []
}));
const newest = multi.WaypointShedsHuntRecords.listNewestFirst().map(function (r) { return r.huntRecordId; });
assert("multiple completed hunts", newest.length === 3);
assert("newest-first ordering", newest[0] === "hrec_new" && newest[1] === "hrec_mid" && newest[2] === "hrec_old", JSON.stringify(newest));

const detail = load();
detail.WaypointShedsHuntRecords.persist(sampleRecord({
  huntRecordId: "hrec_detail",
  observations: [
    { id: "hobs_s", type: "shed_found", createdAt: "2026-09-01T11:00:00.000Z", lat: 41.326, lng: -74.802, note: "Left side" },
    { id: "hobs_u", type: "deer_sign", createdAt: "2026-09-01T11:10:00.000Z", note: "Tracks in mud" }
  ]
}));
const rec = detail.WaypointShedsHuntRecords.getById("hrec_detail");
assert("Hunt Detail record has start/finish", rec.startedAt && rec.finishedAt);
assert("Hunt Detail duration available", detail.WaypointShedsHuntRecords.formatDuration(detail.WaypointShedsHuntRecords.durationMs(rec)) !== "Unavailable");
assert("Hunt Detail distance available", detail.WaypointShedsHuntRecords.formatDistanceM(rec.trackDistanceM, rec.trackDistanceAvailable) !== "Unavailable");
assert("unmapped observation kept without invented coords", rec.observations[1].mapped === false && rec.observations[1].lat == null);
assert("mapped observation keeps coordinates", rec.observations[0].mapped === true && rec.observations[0].lat === 41.326);
assert("observation summary counts", rec.summary.observationCount === 2 && rec.summary.unmappedObservationCount === 1);

const nogps = load();
nogps.WaypointShedsHuntRecords.persist(sampleRecord({
  huntRecordId: "hrec_nogps",
  huntPlanNameSnapshot: "Fog morning",
  trackPoints: [],
  trackDistanceM: null,
  trackDistanceAvailable: false,
  observations: []
}));
const bare = nogps.WaypointShedsHuntRecords.getById("hrec_nogps");
assert("no-GPS hunt still stored", !!bare);
assert("no-GPS hunt has no track", bare.trackPoints.length === 0 && bare.trackDistanceAvailable === false);
assert("no-GPS distance honest", nogps.WaypointShedsHuntRecords.formatDistanceM(bare.trackDistanceM, bare.trackDistanceAvailable) === "Unavailable");
assert("zero observations honest", bare.summary.observationCount === 0 && bare.summary.shedFoundCount === 0);

const finds = load();
finds.WaypointShedsHuntRecords.persist(sampleRecord({ huntRecordId: "hrec_f1", finishedAt: "2026-09-01T12:00:00.000Z" }));
finds.WaypointShedsHuntRecords.persist(sampleRecord({
  huntRecordId: "hrec_f2",
  huntPlanNameSnapshot: "Creek",
  startedAt: "2026-09-02T10:00:00.000Z",
  finishedAt: "2026-09-02T11:00:00.000Z",
  observations: [{
    id: "hobs_unmapped_shed",
    type: "shed_found",
    createdAt: "2026-09-02T10:40:00.000Z",
    note: "Found at the truck — no GPS"
  }]
}));
const shedList = finds.WaypointShedsHuntRecords.listShedFounds();
assert("Shed Found history lists both finds", shedList.length === 2, JSON.stringify(shedList.length));
assert("Shed Found newest-first", shedList[0].observationId === "hobs_unmapped_shed");
assert("Shed Found keeps hunt relationship", shedList[0].huntRecordId === "hrec_f2" && shedList[0].huntPlanNameSnapshot === "Creek");
assert("unmapped Shed Found has no invented coords", shedList[0].mapped === false && shedList[0].lat == null);
assert("mapped Shed Found keeps coords", shedList[1].mapped === true && shedList[1].lat === 41.326);
assert("Shed Found note preserved", shedList[0].note === "Found at the truck — no GPS");
assert("Shed Found has no species/score fields", shedList.every(function (f) {
  return f.species == null && f.score == null && f.trophy == null && f.age == null;
}));

const persistReload = load();
persistReload.WaypointShedsHuntRecords.persist(sampleRecord({ huntRecordId: "hrec_reload" }));
const reloaded = load({ storage: persistReload.storage });
assert("reload persistence", reloaded.WaypointShedsHuntRecords.getById("hrec_reload").huntPlanNameSnapshot === "Ridge North");

const scoutKeep = load();
const scout = scoutKeep.WaypointShedsScoutSpots.create({ location: { lat: 41.32, lng: -74.80 }, name: "Keep me" });
const plan = scoutKeep.WaypointShedsHuntPlans.create({ scoutSpotIds: [scout.spot.id], name: "Keep plan" });
scoutKeep.WaypointShedsHuntRecords.persist(sampleRecord({
  huntRecordId: "hrec_del",
  huntPlanId: plan.plan.id,
  scoutSpotIds: [scout.spot.id]
}));
const removed = scoutKeep.WaypointShedsHuntRecords.remove("hrec_del");
assert("individual Hunt Record delete", removed.ok && !scoutKeep.WaypointShedsHuntRecords.getById("hrec_del"));
assert("delete does not remove Scout Spots", !!scoutKeep.WaypointShedsScoutSpots.getById(scout.spot.id));
assert("delete does not remove Hunt Plans", !!scoutKeep.WaypointShedsHuntPlans.getById(plan.plan.id));
assert("delete missing id is honest", !scoutKeep.WaypointShedsHuntRecords.remove("hrec_missing").ok);

const heat = load();
heat.WaypointShedsHuntRecords.persist(sampleRecord({
  huntRecordId: "hrec_heat",
  heatScore: 9.4,
  predictedShedProbability: 0.87,
  likelyDeerLocation: { lat: 41.3, lng: -74.8 }
}));
const stored = JSON.parse(heat.storage.getItem("waypoint-sheds-hunt-records-v1"));
assert("imported heat scores are not persisted", stored.huntRecords[0].heatScore == null && stored.huntRecords[0].predictedShedProbability == null);
assert("likely deer location is not persisted", stored.huntRecords[0].likelyDeerLocation == null);

const mal = load();
mal.storage.setItem("waypoint-sheds-hunt-records-v1", "{not json");
const malLoad = load({ storage: mal.storage });
assert("malformed records yield empty history", malLoad.WaypointShedsHuntRecords.list().length === 0);
assert("malformed records skip bad kinds", malLoad.WaypointShedsHuntRecords.importList([
  { kind: "not-a-record", huntRecordId: "x" },
  { huntRecordId: "" },
  sampleRecord({ huntRecordId: "hrec_ok_mal" })
]).skipped >= 2);
assert("valid record after malformed still saves", !!malLoad.WaypointShedsHuntRecords.getById("hrec_ok_mal"));

const live = load();
live.WaypointShedsHuntRecords.persist(sampleRecord({ huntRecordId: "hrec_finished" }));
const liveScout = live.WaypointShedsScoutSpots.create({ location: { lat: 41.32, lng: -74.80 }, name: "Live" });
const livePlan = live.WaypointShedsHuntPlans.create({ scoutSpotIds: [liveScout.spot.id], name: "Live plan" });
const sess = live.WaypointShedsHuntSession.start({ huntPlanId: livePlan.plan.id });
live.WaypointShedsHuntActivity.start({
  sessionId: sess.ok ? sess.session.sessionId : "hsess_live",
  huntPlanId: livePlan.plan.id,
  huntPlanName: "Live plan",
  startedAt: sess.ok ? sess.session.startedAt : "2026-09-03T10:00:00.000Z"
});
assert("active Field Hunt can coexist with Hunt History", live.WaypointShedsHuntRecords.list().length === 1 && !!live.WaypointShedsHuntSession.get() && !!live.WaypointShedsHuntActivity.get());
const exported = JSON.stringify({
  format: "waypoint-sheds-field-private-v1",
  huntRecords: live.WaypointShedsHuntRecords.exportJson()
});
assert("export omits active Hunt Session object", !/"huntSession"/.test(exported));
assert("export omits Hunt Activity", !/"huntActivity"/.test(exported) && !/waypoint-sheds-hunt-activity/.test(exported));

const Imp = live.WaypointShedsImport;
const v17 = Imp.parseExport(JSON.stringify({
  format: "waypoint-sheds-field-private-v1",
  huntRecords: {
    schemaVersion: 1,
    kind: "hunt-records",
    huntRecords: [sampleRecord({ huntRecordId: "hrec_v17" })]
  },
  scoutSpots: [{ id: "spot_keep", location: { lat: 41.32, lng: -74.80 }, name: "Keep" }]
}));
assert("V1.7 export with Hunt Records parses", v17.ok && v17.huntRecords.length === 1);
const dest = load();
const imported = dest.WaypointShedsImport.importPayload(v17);
assert("V1.7 Hunt Records import", imported.ok && imported.counts.huntRecords.added === 1);
const again = dest.WaypointShedsImport.importPayload(v17);
assert("re-import does not duplicate Hunt Records", again.ok && again.counts.huntRecords.added === 0 && again.counts.huntRecords.replaced === 1);
assert("Hunt Record id remains stable", dest.WaypointShedsHuntRecords.getById("hrec_v17").huntRecordId === "hrec_v17");
assert("Hunt Records survive export/import", dest.WaypointShedsHuntRecords.list().length === 1);

const oldExp = dest.WaypointShedsImport.parseExport(JSON.stringify({
  format: "waypoint-sheds-field-private-v1",
  scoutSpots: [{ id: "spot_legacy2", location: { lat: 40.1, lng: -105.2 }, name: "Old" }]
}));
assert("old export without Hunt Records still imports", oldExp.ok && oldExp.huntRecords.length === 0);
const oldImp = dest.WaypointShedsImport.importPayload(oldExp);
assert("legacy import keeps existing Hunt Records", oldImp.ok && dest.WaypointShedsHuntRecords.list().length === 1);

assert("history UI does not invent GPS for unmapped obs", /Not mapped — no invented position/.test(app));
assert("history copy is search history only", /not a heat map/.test(html) && /not a prediction/.test(html));

if (failures.length) {
  console.error("\n" + failures.length + " failure(s).");
  process.exit(1);
}
console.log("\n" + passed + " passed.");
