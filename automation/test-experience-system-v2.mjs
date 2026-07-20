#!/usr/bin/env node
/**
 * Experience System V2 — cohesion smoke (no network).
 * Run: node automation/test-experience-system-v2.mjs
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

const tokens = fs.readFileSync(path.join(ROOT, "design-system/css/wds-tokens.css"), "utf8");
const wds = fs.readFileSync(path.join(ROOT, "design-system/css/wds.css"), "utf8");
const exp = fs.readFileSync(path.join(ROOT, "design-system/css/wds-experience-v2.css"), "utf8");
const dashHome = fs.readFileSync(path.join(ROOT, "design-system/css/wds-dashboard-home.css"), "utf8");

assert("experience-v2 imported in wds.css", /wds-experience-v2\.css/.test(wds));
assert("experience-v2 imported in dashboard-home", /wds-experience-v2\.css/.test(dashHome));
assert("dashboard product accent", /data-product="dashboard"/.test(tokens));
assert("volunteer product accent", /data-product="waypoint-volunteer"/.test(tokens));
assert("landscape product accent", /data-product="landscape-interpretation"/.test(tokens));
assert("studio-home product accent", /data-product="studio-home"/.test(tokens));
assert("touch min token", /--wds-touch-min/.test(tokens));
assert("empty-page styles", /wds-empty-page/.test(exp));
assert("xcard styles", /wds-xcard/.test(exp));
assert("badge styles", /wds-badge--live/.test(exp));
assert("sheds-skip alias", /\.sheds-skip/.test(exp));

const sandbox = { window: {}, globalThis: {}, console, navigator: { onLine: true } };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.WDS = {};
vm.runInNewContext(
  fs.readFileSync(path.join(ROOT, "design-system/js/platform/wds-platform-ui.js"), "utf8"),
  sandbox
);
const UI = sandbox.WDS.platformUi;
assert("platformUi v2", UI && UI.version === "2.0.0");
assert("emptyPageHtml exists", typeof UI.emptyPageHtml === "function");
const emptyPage = UI.emptyPageHtml({
  title: "No observations yet",
  text: "Capture your first note in Fieldry.",
  actionHref: "../fieldry/",
  actionLabel: "Open Fieldry"
});
assert("empty page has guidance", /No observations yet/.test(emptyPage) && /Open Fieldry/.test(emptyPage));
const err = UI.errorHtml({ kind: "offline", text: "Weather paused.", cached: true, retry: true });
assert("error mentions cache", /cached/i.test(err));
assert("error has retry", /data-wds-retry/.test(err));
const load = UI.loadingHtml("Building outdoor summary", { skeleton: true, detail: "Using cache first." });
assert("loading with skeleton", /wds-skeleton/.test(load) && /Building outdoor summary/.test(load));

const coach = fs.readFileSync(path.join(ROOT, "apps/photo-coach/index.html"), "utf8");
assert("photo-coach uses wds-btn", /wds-btn wds-btn--primary/.test(coach));
assert("photo-coach no legacy btn-primary class", !/class="btn btn-primary"/.test(coach));

const about = fs.readFileSync(path.join(ROOT, "about.html"), "utf8");
assert("about has no duplicate app-shell css", !/wds-app-shell\.css/.test(about));
assert("about still has wds.css", /wds\.css/.test(about));

const dash = fs.readFileSync(path.join(ROOT, "apps/dashboard/index.html"), "utf8");
assert("dashboard no duplicate app-shell link", !/wds-app-shell\.css/.test(dash));
assert("dashboard keeps experience via dashboard-home", /wds-dashboard-home/.test(dash));

const sheds = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/map/index.html"), "utf8");
assert("sheds map has wds-skip", /wds-skip/.test(sheds));
assert("sheds map loads experience-v2", /wds-experience-v2\.css/.test(sheds));

const pcProfile = fs.readFileSync(path.join(ROOT, "apps/photo-coach/profile/index.html"), "utf8");
const pcGuide = fs.readFileSync(path.join(ROOT, "apps/photo-coach/guide/index.html"), "utf8");
assert("photo-coach profile shell product", /data-wds-app-shell[^>]*data-product="photo-coach"/.test(pcProfile));
assert("photo-coach guide shell product", /data-wds-app-shell[^>]*data-product="photo-coach"/.test(pcGuide));

console.log("\n" + passed + " passed, " + failures.length + " failed");
if (failures.length) {
  failures.forEach((f) => console.error(" -", f));
  process.exit(1);
}
