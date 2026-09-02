#!/usr/bin/env node
/**
 * Sheds V1.7 — Hunt Track, observations, Hunt Records, field JSON.
 * Run: node automation/test-sheds-v1-7-hunt-track.mjs
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

const html = read("apps/shed-hunting/map/index.html");
const css = read("apps/shed-hunting/css/sheds-map.css");
const app = read("apps/shed-hunting/js/sheds-map-app.js");
const activitySrc = read("apps/shed-hunting/js/sheds-hunt-activity-store.js");
const recordSrc = read("apps/shed-hunting/js/sheds-hunt-record-store.js");
const sessionSrc = read("apps/shed-hunting/js/sheds-hunt-session-store.js");

assert("map loads hunt activity store", /sheds-hunt-activity-store\.js/.test(html));
assert("map loads hunt record store", /sheds-hunt-record-store\.js/.test(html));
assert("+ Observation control", /id="btn-field-hunt-obs"/.test(html) && /\+ Observation/.test(html));
assert("observation sheet exists", /id="sheet-field-hunt-obs"/.test(html));
assert("Shed Found chooser", /data-field-hunt-obs="shed_found"/.test(html));
assert("hunt time + searched distance", /id="field-hunt-time-value"/.test(html) && /id="field-hunt-searched-value"/.test(html));
assert("tracking status element", /id="field-hunt-tracking"/.test(html));
assert("observation types are the V1.7 set", [
  "shed_found", "deer_sign", "trail_crossing", "bedding", "feeding", "access_obstacle", "other"
].every(function (t) { return html.indexOf("data-field-hunt-obs=\"" + t + "\"") !== -1; }));
assert("touch-sized observation types", /sheds-field-hunt-obs-types[\s\S]{0,180}min-height:\s*2\.75rem/.test(css));
assert("hunt track style is distinct", /sheds-hunt-track/.test(css) && /#b89a62/.test(css + app));
assert("shed found marker distinct", /sheds-hunt-obs-mark--shed/.test(css));
assert("map-app persist then finish", /persistHuntActivityRecord/.test(app) && /HuntSession\.finish/.test(app));
assert("map-app hunt watch is separate", /huntWatchId/.test(app) && /startHuntTracking/.test(app));
assert("export includes finished Hunt Records", /huntRecords: HuntRecords/.test(app));
assert("export omits Hunt Session", /Hunt Session is transient/.test(app) && !/huntSession:/.test(app));
assert("export omits in-progress activity", !/huntActivity:/.test(app));
assert("closeAllSheets includes observation sheet", /function closeAllSheets[\s\S]{0,1200}sheet-field-hunt-obs/.test(app));
assert("no turn-by-turn / route optimization copy", !/turn-by-turn|optimized route|trail routing/.test(activitySrc + recordSrc));
assert("no find-probability copy", !/find probability|deer are here|predicted shed/.test(activitySrc + recordSrc));
assert("activity is not stuffed into hunt session", !/trackPoints/.test(sessionSrc));
assert("privacy local keys", /waypoint-sheds-hunt-activity-v1/.test(activitySrc) && /waypoint-sheds-hunt-records-v1/.test(recordSrc));
assert("no server upload of hunt track", !/fetch\(.*trackPoints|XMLHttpRequest|navigator\.sendBeacon/.test(activitySrc + recordSrc + app));
assert("docs file present", fs.existsSync(path.join(ROOT, "docs/sheds/SHEDS-V1-7-HUNT-TRACK-OBSERVATIONS.md")));
assert("V1.6 session store still present", /waypoint-sheds-hunt-session-v1/.test(sessionSrc));

const sb = load();
const S = sb.WaypointShedsScoutSpots;
const P = sb.WaypointShedsHuntPlans;
const H = sb.WaypointShedsHuntSession;
const A = sb.WaypointShedsHuntActivity;
const R = sb.WaypointShedsHuntRecords;
const Imp = sb.WaypointShedsImport;

assert("activity store present", !!A && A.STORAGE_KEY === "waypoint-sheds-hunt-activity-v1");
assert("record store present", !!R && R.STORAGE_KEY === "waypoint-sheds-hunt-records-v1");

const scoutA = S.create({ location: { lat: 41.325, lng: -74.802 }, name: "Oak Bench" });
const scoutB = S.create({ location: { lat: 41.327, lng: -74.798 }, name: "South slope" });
assert("scout spots for hunt", scoutA.ok && scoutB.ok);
const plan = P.create({ scoutSpotIds: [scoutA.spot.id, scoutB.spot.id], name: "Ridge North" });
assert("hunt plan for hunt", plan.ok);

const started = H.start({ huntPlanId: plan.plan.id });
assert("start Hunt with location path still uses session", started.ok && started.session.sessionId);

const actNoGeo = A.start({
  sessionId: started.session.sessionId,
  huntPlanId: plan.plan.id,
  huntPlanName: plan.plan.name,
  startedAt: started.session.startedAt,
  scoutSpotIds: plan.plan.scoutSpotIds,
  trackingState: "unavailable"
});
assert("start Hunt without location still creates activity", actNoGeo.ok && actNoGeo.activity.trackingState === "unavailable");
assert("activity bound to session", actNoGeo.activity.sessionId === started.session.sessionId);

const first = A.addTrackPoint({ lat: 41.3200, lng: -74.8000, t: 1_000_000, acc: 12, alt: 410 });
assert("accepted first track point", first.ok && first.accepted && first.reason === "first", JSON.stringify(first));
assert("altitude kept when valid", first.activity.trackPoints[0].alt === 410);
assert("accuracy kept when supplied", first.activity.trackPoints[0].acc === 12);

const dup = A.addTrackPoint({ lat: 41.3200, lng: -74.80001, t: 1_000_500 });
assert("duplicate/jitter near-identical rejected", dup.ok && !dup.accepted && (dup.reason === "duplicate" || dup.reason === "jitter"), dup.reason);

const jitter = A.addTrackPoint({ lat: 41.32004, lng: -74.8000, t: 1_002_000 });
assert("small GPS jitter rejected", jitter.ok && !jitter.accepted && (jitter.reason === "jitter" || jitter.reason === "duplicate" || jitter.reason === "too_frequent"), jitter.reason);

const freq = A.addTrackPoint({ lat: 41.3202, lng: -74.8000, t: 1_002_500 });
assert("pathological update frequency rejected unless burst move", !freq.accepted, freq.reason);

const okMove = A.addTrackPoint({ lat: 41.3210, lng: -74.8000, t: 1_006_000, acc: 18 });
assert("accepted track point after interval", okMove.ok && okMove.accepted, JSON.stringify(okMove));

const malformed = A.addTrackPoint({ lat: "nope", lng: -74.8, t: 1_020_000 });
assert("malformed coordinate rejected", malformed.ok && !malformed.accepted && malformed.reason === "malformed");

const impossible = A.addTrackPoint({ lat: 99.5, lng: -74.8, t: 1_021_000 });
assert("impossible coordinate rejected", impossible.ok && !impossible.accepted && impossible.reason === "impossible");

const jump = A.addTrackPoint({ lat: 42.5, lng: -75.5, t: 1_007_000 });
assert("unreasonable jump rejected", jump.ok && !jump.accepted && jump.reason === "jump", jump.reason);

const farLater = A.addTrackPoint({ lat: 41.3220, lng: -74.8000, t: 1_020_000, acc: 20 });
assert("later reasonable point accepted", farLater.ok && farLater.accepted);

const dist = A.trackDistance(A.get().trackPoints);
assert("distance accumulation available", dist.available && dist.meters > 100, JSON.stringify(dist));
assert("distance is not labeled route in formatter", /m|km/.test(A.formatDistance(dist)));

const emptyDist = A.trackDistance([]);
assert("distance unavailable without GPS track", !emptyDist.available);

const poor = A.trackDistance([
  { lat: 41.32, lng: -74.80, t: 1, acc: 400 },
  { lat: 41.33, lng: -74.80, t: 20000, acc: 400 }
]);
assert("poor accuracy legs skipped honestly", !poor.available && poor.reason === "poor_accuracy");

const dur = A.durationMs("2026-09-02T12:00:00.000Z", Date.parse("2026-09-02T13:24:00.000Z"));
assert("duration from timestamps", dur === 84 * 60 * 1000, String(dur));
assert("duration format HH:MM", A.formatDuration(dur) === "01:24", A.formatDuration(dur));
assert("short duration MM:SS", A.formatDuration(84 * 1000) === "01:24");

const reloaded = load({ storage: sb.storage });
assert("reload recovers track points", reloaded.WaypointShedsHuntActivity.get().trackPoints.length >= 3);
assert("reload recovers same huntRecordId", reloaded.WaypointShedsHuntActivity.get().huntRecordId === A.get().huntRecordId);
assert("reload duration still computed from startedAt", reloaded.WaypointShedsHuntActivity.durationMs(reloaded.WaypointShedsHuntActivity.get().startedAt, Date.now()) >= 0);

const obsLoc = A.addObservation({ type: "deer_sign", lat: 41.321, lng: -74.800, note: "Rub line" });
assert("observation with location", obsLoc.ok && obsLoc.mapped && obsLoc.observation.lat === 41.321);
assert("observation note persistence", obsLoc.observation.note === "Rub line");

const obsNone = A.addObservation({ type: "bedding" });
assert("observation without location allowed", obsNone.ok && obsNone.mapped === false && obsNone.observation.lat == null);
assert("unmapped observation has no invented coords", obsNone.observation.lng == null);

const shed = A.addObservation({ type: "shed_found", lat: 41.322, lng: -74.800, note: "Right side" });
assert("Shed Found observation", shed.ok && shed.observation.type === "shed_found" && shed.observation.label === "Shed Found");

const more = A.addObservation({ type: "other", note: "Fence" });
assert("multiple observations", A.get().observations.length === 4);

const sameStart = A.start({ sessionId: started.session.sessionId, huntPlanId: plan.plan.id });
assert("reload/start same session does not duplicate activity", sameStart.ok && sameStart.restored && sameStart.activity.huntRecordId === A.get().huntRecordId);

P.rename(plan.plan.id, "Renamed Ridge");
const rec = A.toRecord({ finishedAt: "2026-09-02T14:00:00.000Z" });
assert("record snapshot keeps original plan name", rec.huntPlanNameSnapshot === "Ridge North", rec.huntPlanNameSnapshot);
assert("record has track + observations", rec.trackPoints.length >= 3 && rec.observations.length === 4);
assert("record scout ids not giant objects", Array.isArray(rec.scoutSpotIds) && typeof rec.scoutSpotIds[0] === "string");

const saved = R.persist(rec);
assert("finish persist creates Hunt Record", saved.ok && saved.record.huntRecordId === rec.huntRecordId);
assert("exactly one Hunt Record after finish persist", R.list().length === 1);
R.persist(rec);
assert("re-persist same huntRecordId does not duplicate", R.list().length === 1);

P.remove(plan.plan.id);
assert("Hunt Record survives Hunt Plan delete", R.getById(rec.huntRecordId).huntPlanNameSnapshot === "Ridge North");
assert("deleted plan is gone", !P.getById(plan.plan.id));

const sb2 = load();
const S2 = sb2.WaypointShedsScoutSpots;
const P2 = sb2.WaypointShedsHuntPlans;
const H2 = sb2.WaypointShedsHuntSession;
const A2 = sb2.WaypointShedsHuntActivity;
const R2 = sb2.WaypointShedsHuntRecords;
const s2 = S2.create({ location: { lat: 40.1, lng: -105.2 }, name: "Solo" });
const p2 = P2.create({ scoutSpotIds: [s2.spot.id], name: "Empty walk" });
const sess2 = H2.start({ huntPlanId: p2.plan.id });
A2.start({
  sessionId: sess2.session.sessionId,
  huntPlanId: p2.plan.id,
  huntPlanName: "Empty walk",
  startedAt: sess2.session.startedAt,
  trackingState: "unavailable"
});
const recEmpty = A2.toRecord({ finishedAt: "2026-09-02T15:00:00.000Z" });
assert("finish without GPS track", recEmpty.trackPoints.length === 0 && recEmpty.trackDistanceAvailable === false);
assert("finish without observations", recEmpty.observations.length === 0);
assert("empty hunt still persists", R2.persist(recEmpty).ok && R2.list().length === 1);

const quotaStore = memoryStorage();
const quota = load({ storage: quotaStore });
quota.WaypointShedsHuntActivity.start({
  sessionId: "hsess_quota",
  huntPlanId: "plan_q",
  huntPlanName: "Quota",
  startedAt: "2026-09-02T12:00:00.000Z"
});
const quotaRec = quota.WaypointShedsHuntActivity.toRecord({ finishedAt: "2026-09-02T13:00:00.000Z" });
const origSet = quotaStore.setItem;
quotaStore.setItem = function (k, v) {
  if (k === "waypoint-sheds-hunt-records-v1") throw new Error("quota");
  return origSet.call(quotaStore, k, v);
};
const quotaFail = quota.WaypointShedsHuntRecords.persist(quotaRec);
assert("quota/write failure is honest", !quotaFail.ok && /not discarded/i.test(quotaFail.error || ""));
assert("failed finish did not store a record", quota.WaypointShedsHuntRecords.list().length === 0);
assert("activity still present after record write failure", !!quota.WaypointShedsHuntActivity.get());

const malStore = memoryStorage();
malStore.setItem("waypoint-sheds-hunt-activity-v1", "{not json");
malStore.setItem("waypoint-sheds-hunt-records-v1", "{not json");
const mal = load({ storage: malStore });
assert("malformed stored active data yields no activity", mal.WaypointShedsHuntActivity.get() == null);
assert("malformed stored Hunt Record yields empty list", mal.WaypointShedsHuntRecords.list().length === 0);

const v16Store = memoryStorage();
v16Store.setItem("waypoint-sheds-hunt-session-v1", JSON.stringify({
  schemaVersion: 1,
  session: {
    kind: "hunt-session",
    sessionId: "hsess_old",
    huntPlanId: plan.plan.id,
    startedAt: "2026-09-01T12:00:00.000Z",
    status: "active",
    activeScoutSpotId: scoutA.spot.id
  }
}));
const v16 = load({ storage: v16Store });
assert("old V1.6 storage has session, no activity", !!v16.WaypointShedsHuntSession.normalize);
assert("old V1.6 has no hunt activity", v16.WaypointShedsHuntActivity.get() == null);
const fromOld = v16.WaypointShedsHuntActivity.start({
  sessionId: "hsess_old",
  huntPlanId: "plan_x",
  huntPlanName: "Legacy",
  startedAt: "2026-09-01T12:00:00.000Z"
});
assert("activity can attach to old V1.6 session", fromOld.ok && fromOld.activity.sessionId === "hsess_old");

const exp = load();
const expRec = {
  schemaVersion: 1,
  kind: "hunt-record",
  huntRecordId: "hrec_export",
  huntPlanId: "plan_gone",
  huntPlanNameSnapshot: "Saturday benches",
  startedAt: "2026-09-02T10:00:00.000Z",
  finishedAt: "2026-09-02T12:00:00.000Z",
  trackPoints: [{ lat: 41.32, lng: -74.80, t: 1 }, { lat: 41.321, lng: -74.80, t: 20000 }],
  trackDistanceM: 111,
  trackDistanceAvailable: true,
  observations: [{
    id: "hobs_1",
    type: "shed_found",
    createdAt: "2026-09-02T11:00:00.000Z",
    lat: 41.321,
    lng: -74.80,
    note: "Left side"
  }],
  scoutSpotIds: ["spot_keep"]
};
assert("seed export record", exp.WaypointShedsHuntRecords.persist(expRec).ok);
const parsed = Imp.parseExport(JSON.stringify({
  format: "waypoint-sheds-field-private-v1",
  huntRecords: exp.WaypointShedsHuntRecords.exportJson(),
  scoutSpots: [{ id: "spot_keep", location: { lat: 41.32, lng: -74.80 }, name: "Keep" }]
}));
assert("field export with Hunt Records parses", parsed.ok && parsed.huntRecords.length === 1);

const dest = load();
const imported = dest.WaypointShedsImport.importPayload(parsed);
assert("field import Hunt Records", imported.ok && imported.counts.huntRecords.added === 1, JSON.stringify(imported));
assert("imported record keeps plan name snapshot", dest.WaypointShedsHuntRecords.getById("hrec_export").huntPlanNameSnapshot === "Saturday benches");
assert("imported Shed Found", dest.WaypointShedsHuntRecords.getById("hrec_export").observations[0].type === "shed_found");

const oldPayload = dest.WaypointShedsImport.parseExport(JSON.stringify({
  format: "waypoint-sheds-field-private-v1",
  scoutSpots: [{ id: "spot_legacy", location: { lat: 40.1, lng: -105.2 }, name: "Old" }]
}));
assert("old payload without Hunt Records still parses", oldPayload.ok && oldPayload.huntRecords.length === 0);
const oldImp = dest.WaypointShedsImport.importPayload(oldPayload);
assert("old payload import succeeds", oldImp.ok && dest.WaypointShedsScoutSpots.getById("spot_legacy"));

const sessionOnly = Imp.parseExport(JSON.stringify({
  format: "waypoint-sheds-field-private-v1",
  huntSession: { sessionId: "hsess_should_ignore", status: "active" }
}));
assert("transient Hunt Session alone is not a valid export body", !sessionOnly.ok);

const badRec = dest.WaypointShedsHuntRecords.importList([
  null,
  "nope",
  { kind: "hunt-record", huntRecordId: "hrec_ok2", huntPlanNameSnapshot: "OK", startedAt: "2026-09-02T10:00:00.000Z", finishedAt: "2026-09-02T11:00:00.000Z", trackPoints: [], observations: [] }
]);
assert("malformed Hunt Record skipped", badRec.ok && badRec.skipped >= 2 && badRec.added === 1);

assert("map-app never auto-checks from hunt GPS", /Never auto-check Scout Spots from GPS/.test(app));
assert("observation chooser usable without location copy", /Location unavailable — this observation will still save/.test(app));

if (failures.length) {
  console.error("\n" + failures.length + " failure(s).");
  process.exit(1);
}
console.log("\n" + passed + " passed.");
