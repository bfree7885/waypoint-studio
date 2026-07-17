#!/usr/bin/env node
/**
 * Trust & Transparency Framework — docs, confidence map, Evidence Card.
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

function run() {
  global.window = global;

  ["docs/WAYPOINT-TRUST-FRAMEWORK.md", "docs/WAYPOINT-EVIDENCE-MODEL.md", "docs/WAYPOINT-CONFIDENCE-SYSTEM.md"].forEach(
    (p) => assert(p + " exists", fs.existsSync(path.join(ROOT, p)))
  );
  assert(
    "trust framework mission",
    /why we believe it|transparency/i.test(read("docs/WAYPOINT-TRUST-FRAMEWORK.md"))
  );
  assert(
    "confidence rejects fake precision",
    /fake precision|Prefer shared/i.test(read("docs/WAYPOINT-CONFIDENCE-SYSTEM.md"))
  );

  const schema = JSON.parse(read("design-system/trust/schema-v1.json"));
  assert("schema requires claim", schema.required.includes("claim"));
  assert("confidence enum has moderate", schema.properties.confidence.enum.includes("moderate"));

  const map = JSON.parse(read("design-system/trust/confidence-map.json"));
  assert("recommendation levels", map.recommendationLevels.length >= 6);
  assert("engine crosswalk speculative→preliminary", map.engineCrosswalk.speculative === "preliminary");
  assert("prefer labels", map.rules.preferLabelsOverPercentages === true);

  vm.runInThisContext(read("design-system/js/trust/wds-evidence-card.js"), {
    filename: "wds-evidence-card.js"
  });
  const E = global.WDS.evidenceCard;
  assert("evidenceCard attached", !!(E && E.render));

  const html = E.render({
    title: "Today’s search context",
    claim: "South aspects may warm earlier.",
    confidence: "moderate",
    basedOn: ["Weather", "Terrain"],
    uncertainty: ["Few local observations"],
    sources: [{ label: "Demo", kind: "unknown" }],
    reviewStatus: "demonstration",
    products: ["sheds"]
  });
  assert("renders confidence label", /Moderate/.test(html));
  assert("renders based on", /Based on/.test(html) && /Weather/.test(html));
  assert("renders uncertainty", /Uncertainty/.test(html));
  assert("renders sources", /Sources/.test(html));
  assert("no percent theater", !/%/.test(html));
  assert("demo marked", /Demonstration/.test(html));

  assert("normalize engine low→limited", E.normalizeConfidence("low", map) === "limited");
  assert("normalize wos likely→moderate", E.normalizeConfidence("likely", map) === "moderate");

  const css = read("design-system/css/wds.css");
  assert("wds imports evidence-card css", /wds-evidence-card\.css/.test(css));

  const registry = JSON.parse(read("design-system/ecosystem/product-registry.json"));
  assert("registry has waypoint-trust", !!(registry.sharedEngines && registry.sharedEngines["waypoint-trust"]));

  const pattern = read("design-system/patterns/evidence-card.html");
  assert("pattern page exists", /wds-evidence-card/.test(pattern));

  const ri = read("docs/RESEARCH-INTEGRITY.md");
  assert("RI links trust framework", /WAYPOINT-TRUST-FRAMEWORK/.test(ri));

  if (failures.length) {
    console.error("\n" + failures.length + " failure(s).");
    process.exit(1);
  }
  console.log("\nAll Trust & Transparency tests passed.");
}

run();
