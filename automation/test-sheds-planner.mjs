#!/usr/bin/env node
/**
 * Sheds v0.2 — sessions, coverage, search planner regressions.
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

function load(rel) {
  const storeMap = new Map();
  const sandbox = {
    console,
    localStorage: {
      getItem: (k) => (storeMap.has(k) ? storeMap.get(k) : null),
      setItem: (k, v) => storeMap.set(k, String(v)),
      removeItem: (k) => storeMap.delete(k)
    }
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
  const files = [
    "apps/shed-hunting/js/sheds-observation-store.js",
    "apps/shed-hunting/js/sheds-session-store.js",
    "apps/shed-hunting/js/sheds-biological-model.js",
    "apps/shed-hunting/js/sheds-likelihood-model.js",
    "apps/shed-hunting/js/sheds-search-planner.js"
  ];
  files.forEach((f) => {
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sandbox);
  });
  return sandbox;
}

const S = load();
const Store = S.WaypointShedsObservations;
const Sessions = S.WaypointShedsSessions;
const Model = S.WaypointShedsLikelihood;
const Planner = S.WaypointShedsPlanner;

assert("modules loaded", !!(Store && Sessions && Model && Planner));

const FakeBounds = {
  getWest() { return -91.35; },
  getEast() { return -91.15; },
  getSouth() { return 44.05; },
  getNorth() { return 44.2; }
};

const prefs = Store.defaultModelPrefs();
let grid = Model.buildGrid(FakeBounds, 10, 10, {
  date: new Date("2026-02-20T12:00:00Z"),
  prefs: prefs,
  observations: [],
  elevations: null,
  sessions: Sessions
});
assert("grid builds", grid.cells.length === 100);

let plan = Planner.plan({
  grid: grid,
  userLatLng: { lat: 44.12, lng: -91.25 },
  sessions: Sessions,
  observations: [],
  model: Model
});
assert("recommendation generated", plan.ok && plan.recommendation);
assert("recommendation has why", plan.recommendation.why && plan.recommendation.why.length);
assert("recommendation has radius", plan.recommendation.suggestedRadiusM > 0);
assert("explanation denies certainty", /not mean an antler|not a prediction|guidance/i.test(
  plan.recommendation.explanation + " " + plan.disclaimer
));

const session = Sessions.startSession({ speciesId: Store.SPECIES_WHITETAIL });
assert("session start", session && session.status === "active");
Sessions.appendTrackPoint(session.id, 44.12, -91.25, Date.now());
Sessions.appendTrackPoint(session.id, 44.121, -91.251, Date.now() + 5000);
const active = Sessions.getActiveSession();
assert("track persists distance", active && active.distanceM > 0);
assert("coverage from track", Sessions.listCoverage().length >= 1);

const bed = Store.create({ type: "bedding_area", location: { lat: 44.13, lng: -91.22 } });
const bed2 = Store.create({ type: "bedding_area", location: { lat: 44.131, lng: -91.221 } });
assert("bedding obs", bed.ok && bed2.ok);
Sessions.attachObservation(session.id, bed.observation.id, "bedding_area");

grid = Model.buildGrid(FakeBounds, 10, 10, {
  date: new Date("2026-02-20T12:00:00Z"),
  prefs: prefs,
  observations: Store.list(),
  sessions: Sessions
});
const planAfterObs = Planner.plan({
  grid: grid,
  userLatLng: { lat: 44.12, lng: -91.25 },
  sessions: Sessions,
  observations: Store.list(),
  model: Model
});
assert("plan after observations", planAfterObs.ok);
assert(
  "explanation can mention bedding",
  /bedding|cover|season|priority|Influenced|Chosen/i.test(planAfterObs.recommendation.explanation)
);

// Mark thorough at recommendation and ensure planner moves or score drops
const rec = planAfterObs.recommendation;
Sessions.markCoverage(rec.lat, rec.lng, "thorough", { source: "test" });
grid = Model.buildGrid(FakeBounds, 10, 10, {
  date: new Date("2026-02-20T12:00:00Z"),
  prefs: prefs,
  observations: Store.list(),
  sessions: Sessions
});
const planAfterSearch = Planner.plan({
  grid: grid,
  userLatLng: { lat: 44.12, lng: -91.25 },
  sessions: Sessions,
  observations: Store.list(),
  model: Model
});
assert("plan after thorough mark", planAfterSearch.ok);
const sameCell = Math.abs(planAfterSearch.recommendation.lat - rec.lat) < 1e-6 &&
  Math.abs(planAfterSearch.recommendation.lng - rec.lng) < 1e-6;
assert(
  "thorough area deprioritized or replaced",
  !sameCell || planAfterSearch.recommendation.coverageLevel === "thorough" ||
    planAfterSearch.recommendation.plannerScore < rec.plannerScore
);

Sessions.endSession(session.id, { notes: "test walk" });
assert("session ended persists", Sessions.getSession(session.id).status === "ended");
assert("history summary", Sessions.summarizeHistory(Store.list()).sessionCount >= 1);

const shed = Store.create({ type: "shed_found", location: { lat: 44.14, lng: -91.2 } });
assert("shed create", shed.ok);
const atShed = Model.scoreCell({
  lat: 44.14,
  lng: -91.2,
  date: new Date("2026-02-20T12:00:00Z"),
  prefs: prefs,
  observations: Store.list(),
  terrain: { slope: null, aspect: null, source: "unavailable" }
});
assert("shed boost part exists", atShed && atShed.parts.shedBoost > 0.1);

// Persistence: reload modules against seeded localStorage keys
function loadWith(seed) {
  const storeMap = new Map(Object.entries(seed || {}));
  const sandbox = {
    console,
    localStorage: {
      getItem: (k) => (storeMap.has(k) ? storeMap.get(k) : null),
      setItem: (k, v) => storeMap.set(k, String(v)),
      removeItem: (k) => storeMap.delete(k)
    }
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
  ["apps/shed-hunting/js/sheds-observation-store.js",
    "apps/shed-hunting/js/sheds-session-store.js",
    "apps/shed-hunting/js/sheds-biological-model.js",
    "apps/shed-hunting/js/sheds-likelihood-model.js",
    "apps/shed-hunting/js/sheds-search-planner.js"].forEach((f) => {
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sandbox);
  });
  return { sandbox, storeMap };
}

// Capture storage from first sandbox via export + re-import through real keys
const seed = {};
seed["waypoint-sheds-sessions-v1"] = JSON.stringify(Sessions.listSessions());
seed["waypoint-sheds-coverage-v1"] = JSON.stringify(Sessions.listCoverage());
seed["waypoint-sheds-observations-v1"] = JSON.stringify(Store.list());
const reloaded = loadWith(seed);
assert(
  "persistence after reload",
  reloaded.sandbox.WaypointShedsSessions.listSessions().length >= 1 &&
    reloaded.sandbox.WaypointShedsObservations.list().length >= 1 &&
    reloaded.sandbox.WaypointShedsSessions.listCoverage().length >= 1
);

const planWhy = Planner.plan({
  grid: grid,
  userLatLng: { lat: 44.12, lng: -91.25 },
  sessions: Sessions,
  observations: Store.list(),
  model: Model
});
assert(
  "recommendation explanations present",
  planWhy.ok && Array.isArray(planWhy.recommendation.why) && planWhy.recommendation.why.length >= 2
);

// Offline-friendly: planner works with no elevation/weather
assert("offline grid plan ok", plan.ok);

assert("gps track API present", typeof Sessions.appendTrackPoint === "function");
assert("start/stop session API", typeof Sessions.startSession === "function" && typeof Sessions.endSession === "function");

const html = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/map/index.html"), "utf8");
assert("planner card in html", /id="plan-card"/.test(html));
assert("track button in html", /id="btn-track"/.test(html));
assert("history sheet in html", /id="sheet-history"/.test(html));
assert("session scripts included", /sheds-session-store/.test(html) && /sheds-search-planner/.test(html));
assert("session note for mobile", /id="session-note"/.test(html));
assert("aria-live planner", /id="plan-card"[^>]*aria-live/.test(html));
assert("confidence overlay control", /id="confidence-overlay"/.test(html));
assert("coverage mark controls", /btn-mark-partial/.test(html) && /btn-mark-thorough/.test(html));

const css = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/css/sheds-map.css"), "utf8");
assert("reduced-motion css", /prefers-reduced-motion/.test(css));
assert("mobile toolbar safe area", /safe-area-inset-bottom/.test(css));

if (failures.length) {
  console.error("\nSheds planner tests failed (" + failures.length + ").");
  process.exit(1);
}
console.log("\nAll sheds planner tests passed (" + passed + ").");
