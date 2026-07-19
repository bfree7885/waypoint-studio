#!/usr/bin/env node
/**
 * Platform Design System consistency — Phase 1 recovery checks.
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

function load(rel) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), { filename: rel });
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

global.window = global;
global.fetch = () => Promise.reject(new Error("no network in unit test"));
global.matchMedia = function () {
  return { matches: false, addEventListener: function () {}, addListener: function () {} };
};

load("design-system/js/wds-core.js");
load("design-system/js/platform/wds-platform-ui.js");

assert("WDS.escapeHtml", typeof WDS.escapeHtml === "function");
assert("WDS.platformUi", !!WDS.platformUi);
assert("escape escapes", WDS.escapeHtml("<b>") === "&lt;b&gt;");
assert("loading html", /wds-loading/.test(WDS.platformUi.loadingHtml("Hang on")));
assert("empty html", /wds-state/.test(WDS.platformUi.emptyHtml({ title: "None", text: "Empty" })));
assert("error timeout kind", /timed out/i.test(WDS.platformUi.errorHtml({ kind: "timeout", text: "slow" })));
assert("skeleton", /wds-skeleton/.test(WDS.platformUi.skeletonHtml(3)));

const nav = WDS.platformUi.taskNav(
  [["a", "a.html", "A"], ["b", "b.html", "B"]],
  "b",
  { className: "wds-task-nav fc-task-nav" }
);
assert("task nav active", /aria-current="page"/.test(nav) && /is-active/.test(nav));
assert("task nav shared class", /wds-task-nav/.test(nav));

const wdsCss = read("design-system/css/wds.css");
assert("wds imports platform-ui css", /wds-platform-ui\.css/.test(wdsCss));

const platformCss = read("design-system/css/wds-platform-ui.css");
assert("shared task nav css", /\.wds-task-nav/.test(platformCss) && /\.fc-task-nav/.test(platformCss));
assert("shared empty aliases", /\.ss-empty/.test(platformCss) && /\.fc-empty/.test(platformCss));

const shellCss = read("design-system/css/wds-app-shell.css");
assert("local nav 44px", /was-local__nav a[\s\S]*?min-height:\s*44px/.test(shellCss));

const components = read("design-system/css/wds-components.css");
assert("btn min 44", /\.wds-btn\s*\{[\s\S]*?min-height:\s*44px/.test(components));
assert("map btn 44", /\.wds-map-btn\s*\{[\s\S]*?min-height:\s*44px/.test(components));

const savantIndex = read("apps/savant-sommelier/index.html");
assert("savant loads platform-ui", /wds-platform-ui\.js/.test(savantIndex));
assert("savant uses Inter", /family=Inter/.test(savantIndex) && !/Source\+Sans/.test(savantIndex));

const fcIndex = read("apps/foragecast/index.html");
assert("foragecast loads platform-ui", /wds-platform-ui\.js/.test(fcIndex));

const navReg = JSON.parse(read("design-system/ecosystem/nav-registry.json"));
const fc = navReg.apps.find((a) => a.id === "foragecast");
const ids = (fc.features || []).map((f) => f.id);
["overview", "conditions", "species", "map", "settings"].forEach((id) => {
  assert("fc nav " + id, ids.includes(id));
});

const volSaved = read("apps/waypoint-volunteer/saved/index.html");
assert("volunteer mini-nav removed", !/wv-nav-mini/.test(volSaved));

[
  "docs/PLATFORM-DESIGN-SYSTEM.md",
  "docs/PLATFORM-COMPONENT-INVENTORY.md",
  "docs/PLATFORM-UI-GUIDELINES.md",
  "docs/PLATFORM-CONSISTENCY-CHANGELOG.md",
  "docs/PLATFORM-CONSISTENCY-TECHNICAL-DEBT.md",
  "docs/PLATFORM-APPS-NEEDING-WORK.md"
].forEach((f) => assert("exists " + f, fs.existsSync(path.join(ROOT, f))));

if (failures.length) {
  console.log("\n" + failures.length + " failure(s)");
  process.exit(1);
}
console.log("\nAll platform consistency checks passed.");
