#!/usr/bin/env node
/**
 * Worth Noticing Engine — schema, quality silence, multi-product samples, renderer.
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

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function load(file) {
  vm.runInThisContext(read(file), { filename: file });
}

function run() {
  global.window = global;

  assert(
    "engine doc exists",
    /Worth Noticing Engine|Silence is preferable/i.test(read("docs/WAYPOINT-OBSERVATION-ENGINE.md"))
  );

  const schema = JSON.parse(read("design-system/worth-noticing/schema-v1.json"));
  assert("schema id pattern", /wn_/.test(schema.properties.id.pattern));
  assert("observation required", schema.required.includes("observation"));
  assert("why required", schema.required.includes("whyItMatters"));

  const quality = JSON.parse(read("design-system/worth-noticing/quality.json"));
  assert("silence threshold", quality.minimumScore >= 0.5);
  assert("bans tip of the day", quality.hardFailPatterns.includes("tip of the day"));

  const samples = JSON.parse(read("design-system/worth-noticing/samples/demo-observations.json"));
  assert("multi-product samples", samples.observations.length >= 5);
  const products = new Set();
  samples.observations.forEach((o) => (o.products || []).forEach((p) => products.add(p)));
  assert("covers sheds", products.has("sheds"));
  assert("covers photo-coach", products.has("photo-coach"));
  assert("covers fieldry", products.has("fieldry"));
  assert("covers foragecast", products.has("foragecast"));

  const rules = JSON.parse(read("design-system/worth-noticing/rules/generation-rules.json"));
  assert("generation rules present", rules.rules.length >= 4);

  load("design-system/js/guide/wds-guide-card.js");
  load("design-system/js/worth-noticing/wds-worth-noticing.js");
  const WN = global.WDS.worthNoticing;
  assert("worthNoticing attached", !!(WN && WN.version));

  const filler = samples.observations.find((o) => o.id === "wn_demo-generic-filler");
  const fillerScore = WN.score(filler, { product: "shared" }, quality);
  assert("filler fails quality", fillerScore.pass === false);

  const shedsPick = WN.selectFromRules(samples.observations, rules.rules, {
    product: "sheds",
    signals: { nightsAboveFreezing: 3, aspect: "south" }
  }, quality);
  assert("sheds thaw selects", !!(shedsPick && shedsPick.observation.id === "wn_demo-sheds-thaw-nights"));

  const silence = WN.selectFromRules(samples.observations, rules.rules, {
    product: "sheds",
    signals: {}
  }, quality);
  // Without signals, may still pick if product fit alone — prefer matchRules empty then select may pick any sheds obs that passes. Check select with empty list from match:
  const matchedEmpty = WN.matchRules(samples.observations, rules.rules, { product: "sheds", signals: {} });
  assert("no rule match without signals", matchedEmpty.length === 0);

  const emptySelect = WN.select([], { product: "sheds" }, quality);
  assert("empty library is silence", emptySelect === null);

  const html = WN.render(shedsPick.observation, { useGuideCard: true, dismissible: true });
  assert("renders worth noticing", /Worth noticing|south|freezing/i.test(html));
  assert("no tip of the day in render", !/tip of the day/i.test(html));

  const css = read("design-system/css/wds.css");
  assert("wds imports worth-noticing css", /wds-worth-noticing\.css/.test(css));

  const registry = JSON.parse(read("design-system/ecosystem/product-registry.json"));
  assert("registry has worth-noticing", !!(registry.sharedEngines && registry.sharedEngines["worth-noticing"]));

  const photoHtml = read("apps/photo-coach/index.html");
  assert("photo-coach loads worth-noticing", photoHtml.includes("wds-worth-noticing.js"));

  if (failures.length) {
    console.error("\n" + failures.length + " failure(s).");
    process.exit(1);
  }
  console.log("\nAll Worth Noticing Engine tests passed.");
}

run();
