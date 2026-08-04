#!/usr/bin/env node
/**
 * Scenes Remember pillar — foundation smoke (model + nav + routes).
 * Run: node automation/test-scenes-remember-pillar.mjs
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

const routes = [
  "apps/scenes/remember/index.html",
  "apps/scenes/remember/hiking-journals/index.html",
  "apps/scenes/remember/wildlife-journals/index.html",
  "apps/scenes/remember/mushroom-journals/index.html",
  "apps/scenes/remember/year-in-nature/index.html",
  "apps/scenes/remember/calendars/index.html",
  "apps/scenes/remember/books/index.html",
  "apps/waypoint-scenes/remember/index.html",
  "apps/scenes/remember/js/remember-model.js",
  "apps/scenes/remember/js/remember-print.js",
  "apps/scenes/remember/data/remember-catalog.json",
  "apps/scenes/js/engines/remember-engine.js",
  "docs/scenes/REMEMBER-PILLAR-ARCHITECTURE.md",
  "docs/scenes/REMEMBER-PILLAR-OWNER-REVIEW.md"
];

for (const rel of routes) {
  assert("exists " + rel, exists(rel));
}

const hub = read("apps/scenes/remember/index.html");
assert("hub marks remember pillar", /data-scenes-pillar="remember"/.test(hub));
assert("hub foundation note", /Foundation sprint/.test(hub));
assert("hub links hiking", /hiking-journals\//.test(hub));
assert("hub links wildlife", /wildlife-journals\//.test(hub));
assert("hub links mushroom", /mushroom-journals\//.test(hub));
assert("hub links year-in-nature", /year-in-nature\//.test(hub));
assert("hub links calendars", /calendars\//.test(hub));
assert("hub links books", /books\//.test(hub));
assert("hub disabled builder CTA", /not available yet/.test(hub));

const scenesHome = read("apps/scenes/index.html");
assert("scenes hub links remember", /href="remember\/"/.test(scenesHome));

const navConfig = read("design-system/js/platform/wds-app-nav-config.js");
assert("nav-config has remember feature", /"id": "remember"/.test(navConfig));
assert("nav-config remember href", /apps\/scenes\/remember\//.test(navConfig));

const navRegistry = read("design-system/ecosystem/nav-registry.json");
assert("nav-registry has remember feature", /"id": "remember"/.test(navRegistry));

const redirect = read("apps/waypoint-scenes/remember/index.html");
assert("legacy remember redirects", /scenes\/remember\//.test(redirect));

const registry = read("apps/scenes/js/engines/registry.js");
assert("engine registry lists RememberEngine", /RememberEngine/.test(registry));

const catalog = JSON.parse(read("apps/scenes/remember/data/remember-catalog.json"));
assert("catalog pillar remember", catalog.pillar === "remember");
assert("catalog has six leaf types", catalog.types.filter((t) => t.kind !== "hub").length === 6);

// Load model + print in a sandbox (CommonJS export path)
const sandbox = { module: { exports: {} }, exports: {}, console, Date, Math, JSON, Array, Object, String, Error };
vm.createContext(sandbox);
vm.runInContext(read("apps/scenes/remember/js/remember-model.js"), sandbox);
const model = sandbox.module.exports;
assert("model exports createDocument", typeof model.createDocument === "function");

const doc = model.createDocument({
  type: "hiking-journal",
  title: "Smoke hike",
  photoRefs: [{ id: "p1", libraryId: "lib-1" }],
  sections: [{ id: "s1", title: "Morning", body: "Mist on the ridge." }]
});
const valid = model.validateDocument(doc);
assert("model validates hiking doc", valid.ok, JSON.stringify(valid.errors));

sandbox.module.exports = {};
sandbox.WaypointScenesRemember = { model };
vm.runInContext(read("apps/scenes/remember/js/remember-print.js"), sandbox);
const print = sandbox.module.exports;
const job = print.createPrintJob(doc);
assert("print job ok", job.ok && job.job && job.job.id);
assert("print estimates pages", job.job.pageEstimate >= 1);
const pdf = print.exportPdfStub(doc);
assert("pdf stub not implemented", pdf.ok === false && pdf.implemented === false);
const html = print.renderPrintPreviewHtml(doc);
assert("print preview html has title", /Smoke hike/.test(html));

if (failures.length) {
  console.error("\n" + failures.length + " failure(s)");
  process.exitCode = 1;
} else {
  console.log("\nAll Remember foundation checks passed.");
}
