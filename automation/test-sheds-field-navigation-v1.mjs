/**
 * Field navigation V1 — GPS course marker.
 * Pure course rules plus source contracts for the map watch and follow behavior.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadCourse() {
  const src = fs.readFileSync(path.join(root, "apps/shed-hunting/js/sheds-nav-course.js"), "utf8");
  const sandbox = { console, module: { exports: {} }, exports: {} };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.runInNewContext(src, sandbox, { filename: "sheds-nav-course.js" });
  return sandbox.WaypointShedsNavCourse || sandbox.module.exports;
}

const C = loadCourse();
assert.equal(C.GPS_APPROX_M, 80);
assert.equal(C.SPEED_MIN_MPS, 0.5);

function near(a, b, eps) {
  assert.ok(Math.abs(a - b) <= (eps || 1e-9), `${a} ≈ ${b}`);
}

assert.equal(C.normalizeHeading(0), 0, "0° is north");
assert.equal(C.normalizeHeading(90), 90, "90° is east");
assert.equal(C.normalizeHeading(360), 0);
assert.equal(C.normalizeHeading(400), 40);
assert.equal(C.normalizeHeading(-10), 350);
assert.equal(C.normalizeHeading(null), null);
assert.equal(C.normalizeHeading(NaN), null);

assert.equal(C.courseHeading(90, 10, 1), 90, "valid course is an arrow input");
assert.equal(C.courseHeading(null, 10, 1), null, "null heading clears");
assert.equal(C.courseHeading(NaN, 10, 1), null, "NaN heading clears");
assert.equal(C.courseHeading(90, 81, 1), null, "poor accuracy is not a course");
assert.equal(C.courseHeading(90, 80, 1), 90, "80 m is still precise enough");
assert.equal(C.courseHeading(90, 10, 0.49), null, "speed under 0.5 m/s is stopped");
assert.equal(C.courseHeading(90, 10, 0), null, "speed 0 clears");
assert.equal(C.courseHeading(90, 10, 0.5), 90, "speed 0.5 keeps the arrow");
assert.equal(C.courseHeading(90, 10, null), 90, "null speed does not reject heading");
assert.equal(C.courseHeading(90, 10, undefined), 90, "missing speed does not reject heading");
assert.equal(C.resolveDisplayedHeading(45, null, 8, 1), null, "stale heading clears");
assert.equal(C.resolveDisplayedHeading(45, NaN, 8, null), null, "invalid heading clears");

const eased = C.smoothHeading(359, 1);
near(eased, 359 + 2 / 3, 1e-9);
assert.ok(eased > 359 && eased < 360, "ease across 359/0 stays near north, not 180");
near(C.circularDelta(359, 0), 1);
near(C.circularDelta(0, 359), -1);
assert.equal(C.smoothHeading(10, 90), 90, "large turn snaps");
assert.equal(C.smoothHeading(null, 90), 90, "first course snaps");
near(C.smoothHeading(10, 20), 10 + 10 / 3);

const app = fs.readFileSync(path.join(root, "apps/shed-hunting/js/sheds-map-app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "apps/shed-hunting/map/index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "apps/shed-hunting/css/sheds-map.css"), "utf8");
const hunt = fs.readFileSync(path.join(root, "apps/shed-hunting/js/sheds-hunt-activity-store.js"), "utf8");

function fnBody(name) {
  const start = app.indexOf("function " + name);
  assert.ok(start >= 0, name);
  return app.slice(start, start + 1800);
}

assert.ok(html.indexOf("sheds-nav-course.js") < html.indexOf("sheds-map-app.js"), "course module before map");
assert.ok(!/DeviceOrientation|deviceorientation|webkitCompass|wakeLock/.test(app + html), "no compass or wake lock");

const apply = fnBody("applyUserPosition");
assert.ok(apply.indexOf("state.headingDeg = displayedCourse(") < apply.indexOf("var suppressed"), "heading updates before the movement gate");
assert.ok(/upsertUserMarker\(state\.userLatLng/.test(apply), "suppressed movement still redraws the marker");
assert.ok(/followUser && map && !opts\.force/.test(apply) && /panTo\(/.test(apply), "follow recenters on an accepted move");
assert.ok(/!opts\.navigation/.test(apply), "navigation fixes skip hunt ingest");

const nav = fnBody("startNavWatch");
assert.ok(!/ingestHuntTrackPoint/.test(nav), "normal navigation watch does not create hunt-track points");
assert.ok(/navigation:\s*true/.test(nav), "nav fixes are marked navigation");
assert.ok(/enableHighAccuracy:\s*true,\s*timeout:\s*15000,\s*maximumAge:\s*1000/.test(nav), "nav watch options");
assert.ok(/navWatchBlocked\(\)/.test(nav), "nav watch yields when another watch owns the stream");

const huntStart = fnBody("startHuntTracking");
assert.ok(huntStart.indexOf("stopNavWatch()") < huntStart.indexOf("watchPosition"), "Field Hunt stops the nav watch before its own watch");
assert.ok(/function navWatchBlocked[\s\S]*state\.fieldHunting/.test(app), "Field Hunt blocks a second nav watch");

const vis = app.slice(app.indexOf('addEventListener("visibilitychange"'), app.indexOf('addEventListener("visibilitychange"') + 280);
assert.ok(/document\.hidden/.test(vis) && /stopNavWatch\(\)/.test(vis) && /startNavWatch\(\)/.test(vis), "hidden page stops only the nav watch and visible resumes it");

const locateClick = app.slice(app.indexOf('$("btn-locate").addEventListener'), app.indexOf('$("btn-locate").addEventListener') + 240);
assert.ok(/state\.userPanned = false/.test(locateClick) && /locateUser\(\{\s*center:\s*true,\s*force:\s*true\s*\}\)/.test(locateClick), "Locate after a pan clears userPanned and recenters");
assert.ok(/dragstart[\s\S]{0,120}state\.followUser = false/.test(app), "pan disables follow");
assert.ok(/function recenterToUser[\s\S]{0,180}state\.followUser = true/.test(app), "Recenter resumes follow");

assert.ok(/id="btn-locate"/.test(html) && /id="btn-map-layers"/.test(html) && /id="btn-more"/.test(html), "map-first controls remain");
assert.ok(/id="layer-shed-radar"/.test(html) && /Weather Radar — Coming later/.test(html), "layers hierarchy remains");
const wash = fnBody("setRadarWashVisible");
assert.ok(!/scheduleRecompute/.test(wash), "radar on/off does not recompute");

assert.equal((css.match(/\.sheds-user-arrow \{[^}]*width:\s*32px/) || []).length, 1, "arrow box is 32px");
assert.ok(/points=\\"16,3 25,29 16,22 7,29\\"/.test(app), "arrow geometry points north at 0°");
assert.ok(/iconAnchor: \[half, half\]/.test(app), "marker anchor is the coordinate");
assert.ok(/MIN_MOVE_M = 3/.test(hunt), "hunt-track filter unchanged");
assert.ok(/GPS_MOVE_MIN_M = 8/.test(app), "marker movement gate unchanged");

const prep = fs.readFileSync(path.join(root, "scripts/prepare-shed-hunting-host.mjs"), "utf8");
assert.ok(prep.includes("sheds-nav-course.js"));

console.log("PASS sheds field navigation v1");
