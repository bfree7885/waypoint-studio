#!/usr/bin/env node
/**
 * Sheds field tools — distance / bearing / area formatting.
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

const sandbox = { window: {}, console };
sandbox.global = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(
  fs.readFileSync(path.join(ROOT, "apps/shed-hunting/js/sheds-map-field-tools.js"), "utf8"),
  sandbox
);
const FT = sandbox.window.WaypointShedsFieldTools || sandbox.WaypointShedsFieldTools;
assert("module loads", !!FT);

const d = FT.distanceM(40.0, -75.0, 40.001, -75.0);
assert("short north distance ~111m", d > 100 && d < 120, String(d));
assert("feet format for short", /ft$/.test(FT.formatFieldDistance(30)));
assert("yards format mid", /yd$/.test(FT.formatFieldDistance(400)));
assert("miles format long", /mi$/.test(FT.formatFieldDistance(5000)));

const brg = FT.bearingDeg(40, -75, 41, -75);
assert("northish bearing", brg < 5 || brg > 355, String(brg));
assert("cardinal N", FT.cardinalFromBearing(0) === "N");

const pathLen = FT.pathLengthM([
  { lat: 40, lng: -75 },
  { lat: 40.001, lng: -75 },
  { lat: 40.001, lng: -74.999 }
]);
assert("path length positive", pathLen > 150);

const area = FT.polygonAreaM2([
  { lat: 40, lng: -75 },
  { lat: 40.01, lng: -75 },
  { lat: 40.01, lng: -74.99 },
  { lat: 40, lng: -74.99 }
]);
assert("polygon area computed", area != null && area > 0);
assert("area format", !!FT.formatFieldArea(area));

const app = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/js/sheds-map-app.js"), "utf8");
assert("measure ignores SEARCH while active", /if \(state\.measureActive\)/.test(app));
assert("inspect ignores SEARCH while armed", /if \(state\.inspectArmed\)/.test(app));

if (failures.length) {
  console.error("\nField tools tests failed (" + failures.length + ").");
  process.exit(1);
}
console.log("\nAll sheds field tools tests passed (" + passed + ").");
