#!/usr/bin/env node
/**
 * Sprint 9 — Volunteer + Landscape Interpretation recovery checks.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL", msg);
    failed += 1;
  } else {
    console.log("PASS", msg);
  }
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function exists(rel) {
  return existsSync(join(root, rel));
}

/* —— Landscape Interpretation —— */
assert(exists("apps/landscape-interpretation/index.html"), "LI field route");
assert(exists("apps/landscape-interpretation/learn.html"), "LI learn route");
assert(exists("apps/landscape-interpretation/js/lie-app.js"), "LI app js");
assert(exists("apps/landscape-interpretation/css/lie.css"), "LI css");
assert(
  exists("design-system/js/landscape-interpretation/wds-lie-engine.js"),
  "LI engine"
);

const engineCode = read("design-system/js/landscape-interpretation/wds-lie-engine.js");
const sandbox = { console, window: {}, setTimeout, clearTimeout };
vm.createContext(sandbox);
vm.runInContext(engineCode, sandbox);
const Engine = sandbox.window.WDS.landscapeInterpretation;
assert(!!Engine && typeof Engine.evaluate === "function", "Engine.evaluate");

const pack = JSON.parse(
  read("design-system/landscape-interpretation/rules/samples/northeast-land-use.sample.json")
);
assert(pack.rules.length >= 10, "expanded process rules");

const pasture = Engine.evaluate({
  packs: [pack],
  observations: [
    { tag: "stone-wall-present" },
    { tag: "barbed-wire-or-fence-remnant" },
    { tag: "dense-young-stems" }
  ]
});
assert(
  pasture.interpretations.some((i) => i.taxonomyId === "land-use.former-pasture"),
  "pasture rule fires"
);
assert(
  /abandonment|pasture/i.test(pasture.interpretations[0].statement),
  "plain-language pasture story"
);

const flood = Engine.evaluate({
  packs: [pack],
  observations: [
    { tag: "flood-debris-or-scour" },
    { tag: "seasonal-standing-water" }
  ]
});
assert(
  flood.interpretations.some((i) => /flood/i.test(i.statement)),
  "flood valley story"
);

const empty = Engine.evaluate({ packs: [pack], observations: [] });
assert(empty.honesty.confidenceCeiling === "insufficient", "empty → insufficient");

const lieApp = read("apps/landscape-interpretation/js/lie-app.js");
assert(/platformBoot\.watch/.test(lieApp), "LI boot watch");
assert(/Why does this place look/.test(lieApp), "mission question");
assert(/Fieldry/.test(lieApp) && /Volunteer/.test(lieApp), "LI cross-links");

const learn = read("apps/landscape-interpretation/learn.html");
assert(/Glaciation/.test(learn) && /Historic agriculture/.test(learn), "learn processes");
assert(/viewport-fit=cover/.test(read("apps/landscape-interpretation/index.html")), "LI viewport-fit");

const nav = read("design-system/js/platform/wds-app-nav-config.js");
assert(/"id": "landscape-interpretation"/.test(nav), "nav registers LI");

const registry = read("design-system/ecosystem/product-registry.json");
assert(/"status": "experimental"/.test(registry) && /landscape-interpretation/.test(registry), "registry experimental");

/* —— Volunteer —— */
const discover = read("design-system/js/volunteer/wds-volunteer-discover.js");
assert(/resolveOrigin/.test(discover), "volunteer location origin");
assert(/platformBoot\.watch/.test(discover), "volunteer boot watch");
assert(/data-f="q"/.test(discover) || /state\.q/.test(discover), "text search");
assert(/BRIDGE_APPS/.test(discover) && /landscape-interpretation/.test(discover), "bridge apps");
assert(/Citizen science nearby/.test(discover), "citizen science strip");
assert(/LOC_DENIED_KEY/.test(discover), "location denial memory");

const css = read("design-system/css/wds-volunteer.css");
assert(/wv-search/.test(css) && /min-height: 44px/.test(css), "mobile touch/search css");
assert(/viewport-fit=cover/.test(read("apps/waypoint-volunteer/discover.html")), "volunteer viewport");

const schema = JSON.parse(read("design-system/volunteer/schema-opportunity-v0.1.json"));
assert(
  schema.properties.bridgeApps.items.enum.includes("landscape-interpretation"),
  "schema bridge LI"
);
assert(schema.properties.bridgeApps.items.enum.includes("sheds"), "schema bridge sheds");

const bundle = JSON.parse(read("design-system/volunteer/samples/demo-bundle.json"));
const bird = bundle.opportunities.find((o) => o.id === "vo_sample-bird-survey");
assert(
  bird.bridgeApps.includes("landscape-interpretation") && bird.bridgeApps.includes("sheds"),
  "bird survey bridges"
);

assert(exists("apps/waypoint-volunteer/index.html"), "volunteer overview");
assert(/Citizen science bridges/.test(read("apps/waypoint-volunteer/index.html")), "foundation CS copy");

/* —— Docs —— */
[
  "docs/VOLUNTEER-RECOVERY-REPORT-SPRINT9.md",
  "docs/LANDSCAPE-INTERPRETATION-REVIEW-SPRINT9.md",
  "docs/VOLUNTEER-LANDSCAPE-KNOWLEDGE-ARCHITECTURE-SPRINT9.md",
  "docs/VOLUNTEER-LANDSCAPE-PERFORMANCE-SPRINT9.md",
  "docs/VOLUNTEER-LANDSCAPE-TECHNICAL-DEBT-SPRINT9.md",
  "docs/VOLUNTEER-LANDSCAPE-READINESS-SPRINT9.md",
  "docs/VOLUNTEER-LANDSCAPE-CHANGELOG-SPRINT9.md"
].forEach((d) => assert(exists(d), d));

if (failed) {
  console.error("\n" + failed + " failure(s)");
  process.exit(1);
}
console.log("\nAll Sprint 9 checks passed.");
