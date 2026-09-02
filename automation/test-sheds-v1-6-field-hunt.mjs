#!/usr/bin/env node
/**
 * Sheds V1.6 — Field Hunt Session store, honesty, Start/Resume/Finish.
 * Run: node automation/test-sheds-v1-6-field-hunt.mjs
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
    "apps/shed-hunting/js/sheds-hunt-session-store.js",
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
const storeSrc = read("apps/shed-hunting/js/sheds-hunt-session-store.js");
const v15 = read("apps/shed-hunting/js/sheds-hunt-plan-store.js");
const scoutSrc = read("apps/shed-hunting/js/sheds-scout-spot-store.js");

assert("map loads hunt session store", /sheds-hunt-session-store\.js/.test(html));
assert("Start Hunt control", /id="btn-hunt-plan-start"/.test(html) && /Start Hunt/.test(html));
assert("Field Hunt HUD exists", /id="field-hunt-hud"/.test(html));
assert("Finish Hunt control", /id="btn-field-hunt-finish"/.test(html));
assert("Checked Revisit Quick Note Next", /id="btn-field-hunt-checked"/.test(html) && /id="btn-field-hunt-revisit"/.test(html) && /id="btn-field-hunt-note"/.test(html) && /id="btn-field-hunt-next"/.test(html));
assert("field note not navigation", /not navigation and not evidence that sheds are present/.test(html));
assert("touch-sized field controls", /sheds-field-hunt-hud__touch[\s\S]{0,80}min-height:\s*2\.75rem/.test(css));
assert("map remains primary in field hunt CSS", /is-field-hunting/.test(css) && /max-height:\s*min\(52vh/.test(css));
assert("map-app wires Start Hunt", /startFieldHuntFromPlan/.test(app) && /enterFieldHuntMode/.test(app));
assert("export omits Hunt Session", /Hunt Session is transient/.test(app) && !/huntSession:/.test(app));
assert("no auto-check from GPS in session store", !/proximity|geofence|autoCheck|auto-check/.test(storeSrc));
assert("applyUserPosition does not set Scout status", !/applyUserPosition[\s\S]{0,400}setStatus/.test(app));
assert("GPS refresh comment forbids auto-check", /Never auto-check Scout Spots from GPS/.test(app));
assert("no routing copy in session store", !/optimized route|turn-by-turn|hiking distance|walking distance/.test(storeSrc));
assert("no find-probability copy", !/find probability|deer are here|sheds are likely/.test(storeSrc));
assert("V1.5 store still present", /waypoint-sheds-hunt-plans-v1/.test(v15));
assert("V1.4 store still present", /waypoint-sheds-scout-spots-v1/.test(scoutSrc));
assert("docs file present", fs.existsSync(path.join(ROOT, "docs/sheds/SHEDS-V1-6-FIELD-HUNT-MODE.md")));

const sb = load();
const S = sb.WaypointShedsScoutSpots;
const P = sb.WaypointShedsHuntPlans;
const H = sb.WaypointShedsHuntSession;

assert("session store present", !!H && H.SCHEMA_VERSION === 1 && H.STORAGE_KEY === "waypoint-sheds-hunt-session-v1");

assert("start without plan fails", !H.start({}).ok);
assert("start missing plan fails", !H.start({ huntPlanId: "plan_gone" }).ok);

const a = S.create({ location: { lat: 39.64, lng: -105.82 }, name: "Creek", terrain: { status: "ready", searchPriority: "Higher", featureLabel: "bench" } });
const b = S.create({ location: { lat: 39.65, lng: -105.81 }, name: "Ridge" });
const c = S.create({ location: { lat: 39.66, lng: -105.80 }, name: "Bench" });
assert("three scout spots", a.ok && b.ok && c.ok);
const terrainBefore = JSON.stringify(S.getById(a.spot.id).terrain);
const plan = P.create({ scoutSpotIds: [a.spot.id, b.spot.id, c.spot.id], name: "Ridge North" });
assert("hunt plan", plan.ok);
const planStatusBefore = P.getById(plan.plan.id).status;
const scoutStatusBefore = S.getById(a.spot.id).status;

const started = H.start({ huntPlanId: plan.plan.id });
assert("Start Hunt", started.ok && started.session.status === "active", started.error);
assert("selects first available Scout Spot", started.session.activeScoutSpotId === a.spot.id);
assert("Scout Spot unchanged on start", S.getById(a.spot.id).status === scoutStatusBefore);
assert("terrain unchanged on start", JSON.stringify(S.getById(a.spot.id).terrain) === terrainBefore);
assert("Hunt Plan status unchanged on start", P.getById(plan.plan.id).status === planStatusBefore);

const restored = H.start({ huntPlanId: plan.plan.id });
assert("restore active Hunt", restored.ok && restored.restored && restored.session.sessionId === started.session.sessionId);

const checked = S.setStatus(a.spot.id, "Checked");
assert("Checked mutation", checked.ok && S.getById(a.spot.id).status === "Checked");
const prog = H.progress(P.getById(plan.plan.id), S);
assert("progress count", prog.checked === 1 && prog.total === 3 && /1 of 3/.test(prog.label), JSON.stringify(prog));

const revisit = S.setStatus(b.spot.id, "Revisit");
assert("Revisit mutation", revisit.ok && S.getById(b.spot.id).status === "Revisit");
assert("Revisit is not counted as Checked", H.progress(P.getById(plan.plan.id), S).checked === 1);

const noted = H.appendScoutNote(a.spot.id, "Willow edge.");
assert("Quick Note mutation", noted.ok && /Willow/.test(S.getById(a.spot.id).note));

const next = H.nextSpot();
assert("next spot", next.ok && next.session.activeScoutSpotId === b.spot.id);
const prev = H.previousSpot();
assert("previous spot", prev.ok && prev.session.activeScoutSpotId === a.spot.id);
const pick = H.setActiveSpot(c.spot.id);
assert("select spot", pick.ok && H.get().activeScoutSpotId === c.spot.id);

const noLoc = H.distanceToActive(null);
assert("missing location", !noLoc.available && noLoc.reason === "location_unavailable" && /Location unavailable/.test(noLoc.label));
const badLoc = H.distanceToActive({ lat: "x", lng: 1 });
assert("malformed location", !badLoc.available && badLoc.reason === "location_unavailable");
const dist = H.distanceToActive({ lat: 39.64, lng: -105.82 });
assert("valid straight-line distance", dist.available && dist.meters > 0 && dist.label === "Straight-line distance", JSON.stringify(dist));
assert("distance not walking", !/walking|hiking|route distance/.test(dist.display));

S.setStatus(a.spot.id, "Plan");
const near = H.distanceToActive({ lat: 39.64, lng: -105.82 });
assert("no auto-check from GPS proximity", S.getById(a.spot.id).status === "Plan" && near.available !== null);

S.remove(c.spot.id);
const healed = H.resume();
assert("deleted active Scout heals", healed.ok && healed.session.activeScoutSpotId !== c.spot.id && healed.session.activeScoutSpotId, JSON.stringify(healed.session));
assert("session stays alive after Scout delete", H.get() && H.get().huntPlanId === plan.plan.id);

const finished = H.finish();
assert("Finish Hunt", finished.ok && !H.get());
assert("Hunt Plan unchanged on finish", P.getById(plan.plan.id).status === planStatusBefore && P.getById(plan.plan.id).name === "Ridge North");
assert("Scout edits preserved on finish", S.getById(a.spot.id).status === "Plan" && /Willow/.test(S.getById(a.spot.id).note));
assert("Revisit preserved on finish", S.getById(b.spot.id).status === "Revisit");

const again = H.start({ huntPlanId: plan.plan.id });
assert("restart after finish", again.ok && !again.restored);
P.remove(plan.plan.id);
const orphan = H.resume();
assert("deleted Hunt Plan ends session", orphan.ended && !H.get(), JSON.stringify(orphan));

sb.storage.setItem(H.STORAGE_KEY, "not-json");
assert("malformed session storage", H.get() == null);
sb.storage.setItem(H.STORAGE_KEY, JSON.stringify({ foo: 1 }));
assert("session object without huntPlanId is empty", H.get() == null);

const quota = memoryStorage();
const qsb = load({ storage: quota });
const qs = qsb.WaypointShedsScoutSpots.create({ location: { lat: 1, lng: 2 }, name: "Q" });
const qp = qsb.WaypointShedsHuntPlans.create({ scoutSpotIds: [qs.spot.id], name: "Q plan" });
const origSet = quota.setItem.bind(quota);
quota.setItem = function (k, v) {
  if (k === qsb.WaypointShedsHuntSession.STORAGE_KEY) throw new Error("QuotaExceededError");
  return origSet(k, v);
};
const qStart = qsb.WaypointShedsHuntSession.start({ huntPlanId: qp.plan.id });
assert("quota/write failure", !qStart.ok && /full or unavailable/i.test(qStart.error || ""), qStart.error);

const oneSb = load();
const oneSpot = oneSb.WaypointShedsScoutSpots.create({ location: { lat: 40, lng: -106 }, name: "Only" });
const onePlan = oneSb.WaypointShedsHuntPlans.create({ scoutSpotIds: [oneSpot.spot.id], name: "One" });
const oneStart = oneSb.WaypointShedsHuntSession.start({ huntPlanId: onePlan.plan.id });
const oneNext = oneSb.WaypointShedsHuntSession.nextSpot();
assert("one-spot plan starts", oneStart.ok && oneStart.session.activeScoutSpotId === oneSpot.spot.id);
assert("one-spot next stays", oneNext.ok && oneNext.session.activeScoutSpotId === oneSpot.spot.id);

const many = load();
const ids20 = [];
let i;
for (i = 0; i < 20; i += 1) {
  ids20.push(many.WaypointShedsScoutSpots.create({
    location: { lat: 39 + i * 0.01, lng: -105 },
    name: "S" + i
  }).spot.id);
}
const p20 = many.WaypointShedsHuntPlans.create({ scoutSpotIds: ids20, name: "Twenty" });
const s20 = many.WaypointShedsHuntSession.start({ huntPlanId: p20.plan.id });
assert("20-spot plan starts", s20.ok && s20.session.activeScoutSpotId === ids20[0]);
for (i = 0; i < 19; i += 1) many.WaypointShedsHuntSession.nextSpot();
assert("20-spot walks to last", many.WaypointShedsHuntSession.get().activeScoutSpotId === ids20[19]);
const past = many.WaypointShedsHuntSession.nextSpot();
assert("20-spot does not wrap", past.ok && past.session.activeScoutSpotId === ids20[19]);

const ghostSb = load();
const gSpot = ghostSb.WaypointShedsScoutSpots.create({ location: { lat: 41, lng: -74 }, name: "Live" });
const gPlan = ghostSb.WaypointShedsHuntPlans.create({
  scoutSpotIds: [gSpot.spot.id, "spot_missing_v16"],
  name: "Ghost"
});
const gStart = ghostSb.WaypointShedsHuntSession.start({ huntPlanId: gPlan.plan.id });
assert("missing Scout id is not selected first", gStart.ok && gStart.session.activeScoutSpotId === gSpot.spot.id);
const gProg = ghostSb.WaypointShedsHuntSession.progress(ghostSb.WaypointShedsHuntPlans.getById(gPlan.plan.id), ghostSb.WaypointShedsScoutSpots);
assert("unavailable ids are not Checked", gProg.checked === 0 && gProg.total === 1 && gProg.missing === 1, JSON.stringify(gProg));

ghostSb.WaypointShedsHuntPlans.importList([{ id: "plan_empty_v16", name: "Empty", scoutSpotIds: [] }]);
const emptyStart = ghostSb.WaypointShedsHuntSession.start({ huntPlanId: "plan_empty_v16" });
assert("empty Hunt Plan cannot start", !emptyStart.ok && /no available Scout Spots/i.test(emptyStart.error || ""));

const Imp = sb.WaypointShedsImport;
const parsed = Imp.parseExport(JSON.stringify({
  format: "waypoint-sheds-field-private-v1",
  huntPlans: P.exportJson(),
  scoutSpots: S.exportJson()
}));
assert("field JSON still has Hunt Plans not sessions", parsed.ok && parsed.huntPlans && !parsed.huntSession);

assert("Inspect still in map HTML", /id="btn-inspect-point"/.test(html));
assert("Measure still in map HTML", /id="btn-measure"/.test(html));
assert("Import JSON still in map HTML", /id="btn-import"/.test(html));
assert("Search Areas still in map HTML", /id="btn-search-areas"/.test(html));
assert("Esri World Street still default", /World_Street_Map|sheds-tile-provider/.test(read("apps/shed-hunting/js/sheds-tile-provider.js")));

if (failures.length) {
  console.error("\n" + failures.length + " failure(s):\n" + failures.join("\n"));
  process.exit(1);
}
console.log("\nSheds V1.6 Field Hunt Mode tests passed (" + passed + ").");
