#!/usr/bin/env node
/**
 * RC4 Sprint 1 — Platform unity regression checks
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

let n = 0;
function assert(name, cond, detail) {
  if (!cond) {
    console.error("FAIL", name, detail || "");
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log("PASS", name);
  n += 1;
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const unity = read("design-system/css/wds-platform-unity.css");
const wds = read("design-system/css/wds.css");
const scenesFoundation = read("apps/waypoint-scenes/css/scenes-foundation.css");
const scenesHome = read("apps/scenes/css/scenes-home.css");
const dashV2 = read("design-system/css/wds-dashboard-v2.css");
const scenesIndex = read("apps/waypoint-scenes/index.html");
const dashIndex = read("apps/dashboard/index.html");
const shedsIndex = read("apps/shed-hunting/index.html");
const articlesIndex = read("articles/index.html");
const coachIndex = read("apps/photo-coach/index.html");

assert("wds.css imports platform unity", /wds-platform-unity\.css/.test(wds));
assert("unity defines shared status badges", /\.wds-status--live/.test(unity) && /\.wds-status--estimated/.test(unity));
assert("unity densifies dashboard widgets", /min-height:\s*0/.test(unity));
assert("scenes foundation has no legacy --sf-charcoal palette", !/--sf-charcoal:/.test(scenesFoundation));
assert("scenes foundation uses WDS tokens", /--wds-bg/.test(scenesFoundation) && /--wds-accent/.test(scenesFoundation));
assert("scenes-home no longer forces Source Sans 3", !/Source Sans 3/.test(scenesHome));
assert("scenes-home maps chrome to WDS topbar", /--wds-topbar-bg/.test(scenesHome));
assert("dashboard widgets no forced 8.5rem min-height", !/min-height:\s*8\.5rem/.test(dashV2));
assert("scenes landing uses Inter", /family=Inter/.test(scenesIndex));
assert("dashboard uses was-shell", /data-wds-app-shell/.test(dashIndex) && /was-shell/.test(dashIndex));
assert("scenes uses was-shell", /data-wds-app-shell/.test(scenesIndex) && /was-shell/.test(scenesIndex));
assert("sheds uses was-shell + Inter", /was-shell/.test(shedsIndex) && /family=Inter/.test(shedsIndex));
assert("articles uses was-shell + Inter", /was-shell/.test(articlesIndex) && /family=Inter/.test(articlesIndex));
assert("photo coach uses Inter", /family=Inter/.test(coachIndex));
assert("photo coach uses was-shell", /was-shell/.test(coachIndex));
assert("unity hides legacy topbar inside shell", /\.was-shell \.topbar/.test(unity) || /was-shell \.topbar/.test(unity));

console.log("\nAll RC4 platform unity tests passed (" + n + ").");
