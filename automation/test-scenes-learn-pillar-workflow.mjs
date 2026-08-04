#!/usr/bin/env node
/**
 * Learn pillar workflow wiring smoke — no browser required.
 * Checks shared module + key surfaces reference the rail / redirect.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function ok(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else {
    print("ok:", msg);
  }
}

function print(...args) {
  console.log(...args);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

ok(exists("apps/scenes/js/learn-pillar-workflow.js"), "shared workflow module");
ok(exists("apps/scenes/css/learn-pillar-workflow.css"), "shared workflow css");
ok(exists("docs/scenes/learn-pillar-owner-review.md"), "owner review doc");

const modSrc = read("apps/scenes/js/learn-pillar-workflow.js");
const sandbox = { window: {}, console };
sandbox.window = sandbox;
vm.runInNewContext(modSrc, sandbox);
const WF = sandbox.WaypointLearnPillarWorkflow;
ok(WF && Array.isArray(WF.STEPS) && WF.STEPS.length === 8, "eight learn steps");
ok(WF.LIBRARY_INDEX_KEY === "waypoint-photo-library-index-v1", "library index key");
ok(WF.STEPS[0].id === "importer" && WF.STEPS[7].id === "portfolio-health", "step order");

const surfaces = [
  "apps/photo-library/index.html",
  "apps/waypoint-scenes/index.html",
  "apps/waypoint-scenes/library/index.html",
  "apps/scenes/index.html",
  "apps/scenes/portfolio/index.html",
  "apps/scenes/portfolio/assistant.html",
  "apps/scenes/portfolio/builder.html",
  "apps/scenes/portfolio/health.html"
];

for (const rel of surfaces) {
  const html = read(rel);
  ok(html.includes("lpw-rail"), `${rel} has workflow rail mount`);
  ok(html.includes("learn-pillar-workflow"), `${rel} loads workflow assets`);
}

const stub = read("apps/waypoint-scenes/portfolio/index.html");
ok(stub.includes("scenes/portfolio"), "portfolio stub redirects to suite");

const detail = read("apps/waypoint-scenes/js/scene-library/scene-detail-ui.js");
ok(detail.includes("/apps/scenes/portfolio/"), "scene detail links to portfolio suite");

const libUi = read("apps/waypoint-scenes/js/scene-library/scene-library-ui.js");
ok(libUi.includes("ingestFromPhotoLibrary"), "scene library can ingest from photo library");

const nav = read("design-system/js/platform/wds-app-nav-config.js");
ok(nav.includes("portfolio-suite") && nav.includes("apps/photo-library/"), "nav points at library + portfolio suite");

const flows = read("design-system/js/platform/wds-platform-workflows.js");
ok(flows.includes("learn-pillar-"), "platform workflows include learn handoffs");

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
print("\nLearn pillar workflow smoke passed.");
