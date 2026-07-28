#!/usr/bin/env node
/**
 * Waypoint Guide Experience — Guide Card renderer + registry + wiring.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import vm from "vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const failures = [];

function fail(name, detail) {
  failures.push(name + ": " + detail);
  console.log("FAIL", name, "—", detail);
}

function pass(name) {
  console.log("PASS", name);
}

function assert(name, cond, detail) {
  if (cond) pass(name);
  else fail(name, detail || "assertion failed");
}

function load(file) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, file), "utf8"), { filename: file });
}

function run() {
  global.window = global;
  load("design-system/js/guide/wds-guide-card.js");

  const G = global.WDS && global.WDS.guideCard;
  assert("guideCard attached", !!(G && G.version));

  const html = G.render({
    seeing: "Overnight lows stayed above freezing.",
    noticing: "South-facing slopes are warming more quickly.",
    why: "Earlier warming can increase wildlife movement.",
    uncertainty: "Interpretation, not a guarantee.",
    curious: ["Terrain explanation", { label: "Research note", href: "/knowledge/" }],
    inset: true
  });

  assert("renders worth noticing", /Worth noticing/.test(html) && /South-facing/.test(html));
  assert("renders why it matters", /Why it matters/.test(html));
  assert("renders what we're seeing", /What we.re seeing/.test(html));
  assert("renders if you're curious", /If you.re curious/.test(html));
  assert("escapes HTML", !G.render({ noticing: "<script>" }).includes("<script>"));
  assert("empty returns empty", G.render({}) === "");
  assert("no grade language", !/grade|homework|assignment|next lesson/i.test(html));

  const css = fs.readFileSync(path.join(ROOT, "design-system/css/wds.css"), "utf8");
  assert("wds.css imports guide experience", /wds-guide-experience\.css/.test(css));

  const registry = JSON.parse(
    fs.readFileSync(path.join(ROOT, "design-system/ecosystem/product-registry.json"), "utf8")
  );
  assert(
    "registry has waypoint-guide-experience",
    !!(registry.sharedEngines && registry.sharedEngines["waypoint-guide-experience"])
  );

  const doc = fs.readFileSync(path.join(ROOT, "docs/WAYPOINT-GUIDE-EXPERIENCE.md"), "utf8");
  assert("guide experience doc", /Guide Pattern|Worth noticing|If you.re curious/i.test(doc));

  const photoHtml = fs.readFileSync(path.join(ROOT, "apps/photo-coach/index.html"), "utf8");
  assert("photo-coach loads guide-card", photoHtml.includes("wds-guide-card.js"));

  const scenesHtml = fs.readFileSync(path.join(ROOT, "apps/scenes/index.html"), "utf8");
  assert("scenes loads guide-card", scenesHtml.includes("wds-guide-card.js"));

  const pattern = fs.readFileSync(path.join(ROOT, "design-system/patterns/guide-card.html"), "utf8");
  assert("pattern page exists", /wds-guide-card/.test(pattern));

  if (failures.length) {
    console.error("\n" + failures.length + " failure(s).");
    process.exit(1);
  }
  console.log("\nAll Waypoint Guide Experience tests passed.");
}

run();
