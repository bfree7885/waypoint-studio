#!/usr/bin/env node
/**
 * Sheds V1.5 — Hunt Plans store, honesty, import/export, Scout Spot cleanup.
 * Run: node automation/test-sheds-v1-5-hunt-plans.mjs
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
  const files = opts.files || [
    "apps/shed-hunting/js/sheds-today-hunt.js",
    "apps/shed-hunting/js/sheds-search-priority.js",
    "apps/shed-hunting/js/sheds-scout-spot-store.js",
    "apps/shed-hunting/js/sheds-hunt-plan-store.js",
    "apps/shed-hunting/js/sheds-observation-store.js",
    "apps/shed-hunting/js/sheds-session-store.js",
    "apps/shed-hunting/js/sheds-search-area-store.js",
    "apps/shed-hunting/js/sheds-validation-store.js",
    "apps/shed-hunting/js/sheds-models.js",
    "apps/shed-hunting/js/sheds-import-json.js"
  ];
  files.forEach(function (rel) {
    vm.runInNewContext(read(rel), sandbox, { filename: rel });
  });
  sandbox.storage = storage;
  return sandbox;
}

const html = read("apps/shed-hunting/map/index.html");
const css = read("apps/shed-hunting/css/sheds-map.css");
const app = read("apps/shed-hunting/js/sheds-map-app.js");
const storeSrc = read("apps/shed-hunting/js/sheds-hunt-plan-store.js");

assert("map loads hunt plan store", /sheds-hunt-plan-store\.js/.test(html));
assert("Hunt Plans in More", /id="btn-hunt-plans"/.test(html) && /Hunt Plans/.test(html));
assert("Create Hunt Plan controls", /id="btn-hunt-select-create"/.test(html) && /id="btn-hunt-plans-create"/.test(html));
assert("Hunt Plan HUD exists", /id="hunt-plan-hud"/.test(html));
assert("status Planned Active Completed", /data-hunt-plan-status="Planned"/.test(html) && /data-hunt-plan-status="Active"/.test(html) && /data-hunt-plan-status="Completed"/.test(html));
assert("Add to Hunt Plan on Scout card", /id="btn-scout-add-plan"/.test(html));
assert("field note not a route", /not a route and not evidence that sheds are present/.test(html));
assert("map-app wires Hunt Plan create", /startHuntSelect/.test(app) && /openHuntPlan/.test(app));
assert("export includes huntPlans", /huntPlans:\s*HuntPlans/.test(app));
assert("import refreshes hunt plan list", /refreshHuntPlanList/.test(app));
assert("status buttons are 44px", /sheds-hunt-plan-row__moves[\s\S]{0,80}min-height:\s*2\.75rem/.test(css) || /sheds-hunt-plan-status/.test(css));
assert("no routing copy in store", !/optimized route|fastest route|hiking distance|driving distance/.test(storeSrc));
assert("no certainty copy", !/sheds are likely|find probability|deer are here/.test(storeSrc));
assert("numbered markers only when plan open", /huntPlanId/.test(app) && /sheds-scout-order/.test(app));
assert("no hunt-plan routing copy", !/optimized route|fastest route|recommended route/.test(app));
assert("refreshScoutSpots clears scout layer", /scoutLayer\.clearLayers/.test(app));
assert("PLAN vs current vs saved headings", /hunt-plan-list-heading/.test(html) && /hunt-plan-today-heading/.test(html) && /hunt-plan-saved-heading/.test(html));
assert("docs file present", fs.existsSync(path.join(ROOT, "docs/sheds/SHEDS-V1-5-HUNT-PLANS.md")));

const sb = load();
const S = sb.WaypointShedsScoutSpots;
const P = sb.WaypointShedsHuntPlans;
const Hunt = sb.WaypointShedsTodayHunt;

assert("store present", !!P && P.SCHEMA_VERSION === 1 && P.MAX_PLANS === 40 && P.MAX_SPOTS_PER_PLAN === 20);

const emptyCreate = P.create({ name: "Nope" });
assert("create without spots fails honestly", !emptyCreate.ok && /Scout Spot/i.test(emptyCreate.error));

const a = S.create({ location: { lat: 39.64, lng: -105.82 }, name: "Creek" });
const b = S.create({ location: { lat: 39.65, lng: -105.81 }, name: "Ridge" });
const c = S.create({ location: { lat: 39.66, lng: -105.80 }, name: "Bench" });
assert("three scout spots", a.ok && b.ok && c.ok);

const created = P.create({ scoutSpotIds: [a.spot.id, b.spot.id], name: "Saturday south" });
assert("create hunt plan", created.ok && created.plan.status === "Planned", created.error);
assert("order preserved", created.plan.scoutSpotIds.join(",") === a.spot.id + "," + b.spot.id);
assert("persists", P.list().length === 1 && P.getById(created.plan.id).name === "Saturday south");
const stored = JSON.parse(sb.storage.getItem(P.STORAGE_KEY));
assert("persist wraps schemaVersion", stored && stored.schemaVersion === 1 && Array.isArray(stored.huntPlans));

const renamed = P.rename(created.plan.id, "Sunday benches");
assert("rename", renamed.ok && renamed.plan.name === "Sunday benches");
assert("blank rename rejected", !P.rename(created.plan.id, "   ").ok);
assert("blank keeps previous", P.getById(created.plan.id).name === "Sunday benches");

const noted = P.setNote(created.plan.id, "Walk ridge last.");
assert("note", noted.ok && /ridge/.test(noted.plan.note));
const longNote = P.setNote(created.plan.id, Array(500).fill("n").join(""));
assert("note max 400", longNote.ok && longNote.plan.note.length === 400);

assert("status Active", P.setStatus(created.plan.id, "Active").ok && P.getById(created.plan.id).status === "Active");
assert("status Completed", P.setStatus(created.plan.id, "Completed").ok && P.getById(created.plan.id).status === "Completed");
assert("status Planned", P.setStatus(created.plan.id, "Planned").ok && P.getById(created.plan.id).status === "Planned");
assert("unknown status rejected", !P.setStatus(created.plan.id, "Hotspot").ok);
assert("status remains Planned", P.getById(created.plan.id).status === "Planned");
assert("plan status did not change scout status", S.getById(a.spot.id).status === "Plan");

const dup = P.addSpot(created.plan.id, a.spot.id);
assert("duplicate scout in plan rejected", !dup.ok);

const added = P.addSpot(created.plan.id, c.spot.id);
assert("add third spot", added.ok && added.plan.scoutSpotIds.length === 3);
const moved = P.moveSpot(created.plan.id, c.spot.id, -1);
assert("move up", moved.ok && moved.plan.scoutSpotIds[1] === c.spot.id);
const down = P.moveSpot(created.plan.id, c.spot.id, 1);
assert("move down", down.ok && down.plan.scoutSpotIds[2] === c.spot.id);

const second = P.create({ scoutSpotIds: [a.spot.id], name: "Also Creek" });
assert("same scout in multiple plans", second.ok && P.getById(created.plan.id).scoutSpotIds.indexOf(a.spot.id) >= 0 && P.getById(second.plan.id).scoutSpotIds.indexOf(a.spot.id) >= 0);

const spotsBefore = S.list().length;
const delPlan = P.remove(second.plan.id);
assert("delete plan", delPlan.ok && !P.getById(second.plan.id));
assert("delete plan keeps scout spots", S.list().length === spotsBefore && !!S.getById(a.spot.id));

S.remove(b.spot.id);
assert("deleting scout cleans plan references", P.getById(created.plan.id).scoutSpotIds.indexOf(b.spot.id) < 0);
assert("remaining ids kept", P.getById(created.plan.id).scoutSpotIds.indexOf(a.spot.id) >= 0);

const ghost = P.normalize({
  id: "plan_ghost",
  name: "Ghost",
  scoutSpotIds: ["spot_gone", a.spot.id]
});
assert("plan can list missing ids without fabricating spots", ghost.scoutSpotIds.indexOf("spot_gone") >= 0 && !S.getById("spot_gone"));
const ghostEntries = P.resolveEntries(ghost, S);
assert("missing reference marked unavailable", ghostEntries.some(function (e) { return e.missing && e.name === "Scout Spot unavailable"; }));
assert("present reference still resolved", ghostEntries.some(function (e) { return e.id === a.spot.id && !e.missing; }));

const loc = P.planLocation(P.getById(created.plan.id), S);
assert("plan location is centroid source", loc && loc.source === "hunt-plan-centroid" && /not conditions at every point/i.test(loc.disclaimer));

const seq = P.sequenceDistance([
  { lat: 39.64, lng: -105.82 },
  { lat: 39.65, lng: -105.81 }
]);
assert("straight-line distance labeled", seq.label === "Straight-line distance" && seq.sequenceLabel === "Approx. straight-line sequence" && seq.totalMeters > 0);

const live = ScoutStoreFormatUnavailable(Hunt, S);
assert("today unavailable stays unavailable", live.available === false);
const liveFmt = S.formatLiveToday(Hunt.compose({ location: null, weather: null }));
assert("live today need-location is honest", /Need location/i.test((liveFmt.lines || []).join(" ")) && !/Very good|confirmed/.test((liveFmt.lines || []).join(" ")));

function ScoutStoreFormatUnavailable(HuntMod, ScoutMod) {
  const need = HuntMod.compose({ location: null, weather: null });
  return ScoutMod.snapshotFromHunt(need);
}

const quota = memoryStorage();
quota.setItem = function () { throw new Error("QuotaExceededError"); };
const fullSb = load({ storage: quota });
fullSb.WaypointShedsScoutSpots.create({ location: { lat: 1, lng: 2 }, name: "Q" });
const fullPlan = fullSb.WaypointShedsHuntPlans.create({
  scoutSpotIds: ["spot_x"],
  name: "Full"
});
assert("storage full is honest or scout create failed first", !fullPlan.ok);

const legacy = load();
legacy.storage.setItem(legacy.WaypointShedsHuntPlans.STORAGE_KEY, JSON.stringify({ not: "an array" }));
assert("legacy non-array yields empty", legacy.WaypointShedsHuntPlans.list().length === 0);
legacy.storage.setItem(legacy.WaypointShedsHuntPlans.STORAGE_KEY, "not-json");
assert("corrupt JSON yields empty", legacy.WaypointShedsHuntPlans.list().length === 0);
legacy.storage.setItem(legacy.WaypointShedsHuntPlans.STORAGE_KEY, JSON.stringify([
  { id: "plan_legacy", name: "Pre-wrap", scoutSpotIds: ["spot_legacy"] }
]));
assert("legacy array still loads", legacy.WaypointShedsHuntPlans.list().length === 1 && legacy.WaypointShedsHuntPlans.list()[0].status === "Planned");

const capSb = load();
const capSpots = [];
let i;
for (i = 0; i < 3; i += 1) {
  capSpots.push(capSb.WaypointShedsScoutSpots.create({
    location: { lat: 39 + i * 0.01, lng: -105 },
    name: "Cap " + i
  }).spot.id);
}
const Cap = capSb.WaypointShedsHuntPlans;
const capBatch = [];
for (i = 0; i < 40; i += 1) {
  capBatch.push({
    id: "plan_cap_" + i,
    name: "Cap plan " + i,
    scoutSpotIds: [capSpots[0]]
  });
}
const filled = Cap.importList(capBatch);
assert("import can fill to 40", filled.ok && filled.added === 40 && Cap.list().length === 40);
const overflow = Cap.importList([
  { id: "plan_cap_0", name: "Renamed existing", scoutSpotIds: [capSpots[0]] },
  { id: "plan_new_a", name: "Overflow A", scoutSpotIds: [capSpots[1]] }
]);
assert("over-cap skips new ids", overflow.ok && overflow.added === 0 && overflow.skipped === 1 && overflow.replaced === 1);
assert("over-cap keeps 40", Cap.list().length === 40);

const malformed = P.importList([
  null,
  "nope",
  { id: created.plan.id, name: "Replaced", scoutSpotIds: [a.spot.id] }
]);
assert("malformed skipped and replace counted", malformed.ok && malformed.skipped >= 2 && malformed.replaced >= 1);

const Imp = sb.WaypointShedsImport;
const parsed = Imp.parseExport(JSON.stringify({
  format: "waypoint-sheds-field-private-v1",
  huntPlans: {
    huntPlans: [
      { id: "plan_import", name: "Imported", scoutSpotIds: [a.spot.id] }
    ]
  }
}));
assert("hunt-plan-only payload parses", parsed.ok && parsed.huntPlans.length === 1);
const imported = Imp.importPayload(parsed);
assert("hunt plan import ok", imported.ok && imported.counts.huntPlans.added >= 1);

const round = P.importList(P.exportJson().huntPlans);
assert("round-trip does not duplicate", round.ok && round.added === 0 && P.list().length === P.exportJson().huntPlans.length);

const terrain = S.create({
  location: { lat: 40, lng: -106 },
  name: "No terrain",
  terrain: S.emptyTerrain()
});
const planTerrain = P.create({ scoutSpotIds: [terrain.spot.id], name: "Unavailable terrain" });
const resolved = P.resolveEntries(planTerrain.plan, S)[0];
assert("scout terrain unavailable stays unavailable", resolved.searchPriority == null && !resolved.missing);

if (failures.length) {
  console.error("\n" + failures.length + " failure(s):\n" + failures.join("\n"));
  process.exit(1);
}
console.log("\nSheds V1.5 Hunt Plans tests passed (" + passed + ").");
