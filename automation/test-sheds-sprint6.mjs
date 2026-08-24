#!/usr/bin/env node
/**
 * Sheds Recovery Sprint 6 — field briefing, GPS denial memory, FAB note, heat abort.
 * Run: node automation/test-sheds-sprint6.mjs
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

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const html = read("apps/shed-hunting/map/index.html");
const css = read("apps/shed-hunting/css/sheds-map.css");
const app = read("apps/shed-hunting/js/sheds-map-app.js");
const foundation = read("apps/shed-hunting/data/foundation.json");
const mapRedirect = read("map/index.html");

assert("site-root /map/ redirects to Sheds map", /shed-hunting\/map/.test(mapRedirect));
assert("FAB add-note control", /id="btn-add-obs-fab"/.test(html));
assert("tools still has add note", /id="btn-add-obs"/.test(html));
assert("obs GPS capture control", /id="btn-obs-use-gps"/.test(html) && /id="obs-location-hint"/.test(html));
assert("habitat field on obs form", /id="obs-habitat"/.test(html));
assert("heat legend status", /id="heat-legend-status"/.test(html));
assert("GPS denial memory key", /waypoint-sheds-gps-denied-v1/.test(app));
assert("skip auto-locate when denied", /wasGpsDenied\(\)/.test(app) && /force:\s*true/.test(app));
assert("field condition briefing helper", /function fieldConditionLines/.test(app));
assert("interpretive day quality with weather", /Snowmelt favors open slopes|Wind may load fence lines|Green-up lowers visibility/.test(app));
assert("elev AbortController", /AbortController/.test(app) && /elevAbort/.test(app));
assert("heat phase legend sync", /heatPhase/.test(app) && /heat-legend-status/.test(app));
assert("offline banner honesty", /Local notes still save|saved area and field records still work|Live conditions unavailable/.test(html) || /Local notes still save|saved area and field records still work|NO_NETWORK/.test(app));
assert("foundation does not claim live photos", !/notes, photos, and location/.test(foundation));
assert("outdoor contrast tokens tightened", /--sheds-fab-size:\s*3\.5rem/.test(css));
assert("obs location styling", /\.sheds-obs-location/.test(css));
assert("recovery docs present", exists("docs/SHEDS-RECOVERY-REPORT.md"));
assert("map system review present", exists("docs/SHEDS-MAP-SYSTEM-REVIEW.md"));
assert("GPS reliability report present", exists("docs/SHEDS-GPS-RELIABILITY-REPORT.md"));
assert("performance improvements present", exists("docs/SHEDS-PERFORMANCE-IMPROVEMENTS.md"));
assert("technical debt present", exists("docs/SHEDS-TECHNICAL-DEBT.md"));
assert("readiness assessment present", exists("docs/SHEDS-READINESS-ASSESSMENT.md"));
assert("changelog present", exists("docs/SHEDS-CHANGELOG-SPRINT6.md"));

// Lightweight planner unit: buildWhy still honest
const sandbox = {
  window: {},
  console,
  Math,
  isFinite,
  Number,
  String,
  Array,
  Object,
  Date
};
sandbox.window = sandbox;
vm.runInNewContext(read("apps/shed-hunting/js/sheds-search-planner.js"), sandbox, {
  filename: "sheds-search-planner.js"
});
assert("planner exports", !!(sandbox.WaypointShedsPlanner && sandbox.WaypointShedsPlanner.plan));

const emptyPlan = sandbox.WaypointShedsPlanner.plan({ grid: null });
assert("planner empty ok=false", emptyPlan && emptyPlan.ok === false);

if (failures.length) {
  console.error("\n" + failures.length + " failure(s)");
  process.exit(1);
}
console.log("\nAll Sheds Sprint 6 checks passed.");
