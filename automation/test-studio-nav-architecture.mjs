#!/usr/bin/env node
/**
 * Studio nav architecture alignment — smoke checks.
 * Authority: docs/product/waypoint-studio-nav-architecture-owner-review.md
 *
 * Asserts shared nav config + directory surfaces expose the current
 * architecture labels, include Side Trails, and do not present retired
 * primary peers as architecture equals.
 *
 * Run: node automation/test-studio-nav-architecture.mjs
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REQUIRED = ["Dashboard", "Scenes", "Sheds", "Articles", "Side Trails", "Support", "About"];
const OLD_PRIMARY_PEERS = ["Volunteer", "SignalTerrain", "Steepleaf", "Savant", "Fieldry", "ForageCast"];

let passed = 0;
const failures = [];

function assert(name, cond, detail) {
  if (cond) {
    passed += 1;
    console.log("PASS", name);
  } else {
    failures.push(name + (detail ? ": " + detail : ""));
    console.error("FAIL", name, detail || "");
  }
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function loadNavConfig() {
  const sandbox = { globalThis: {} };
  sandbox.global = sandbox;
  sandbox.window = sandbox;
  vm.runInNewContext(read("design-system/js/platform/wds-app-nav-config.js"), sandbox, {
    filename: "wds-app-nav-config.js"
  });
  return sandbox.WDS.APP_NAV_CONFIG;
}

const cfg = loadNavConfig();
const labels = (cfg.studioPrimaryNav || []).map((i) => i.label);
assert(
  "studioPrimaryNav exact architecture set",
  labels.join("|") === REQUIRED.join("|"),
  labels.join("|")
);
assert(
  "architectureNavLabels matches primary",
  Array.isArray(cfg.architectureNavLabels) && cfg.architectureNavLabels.join("|") === REQUIRED.join("|"),
  String(cfg.architectureNavLabels)
);
assert("Side Trails in primary nav", labels.includes("Side Trails"));
assert(
  "old peers absent from primary nav labels",
  !OLD_PRIMARY_PEERS.some((p) => labels.includes(p)),
  labels.join("|")
);

const navReg = JSON.parse(read("design-system/ecosystem/nav-registry.json"));
assert(
  "nav-registry studioPrimaryNav matches",
  (navReg.studioPrimaryNav || []).map((i) => i.label).join("|") === REQUIRED.join("|")
);
assert("nav-registry includes Side Trails href", /side-trails\//.test(JSON.stringify(navReg.studioPrimaryNav)));

const productReg = JSON.parse(read("design-system/ecosystem/product-registry.json"));
assert("product-registry core includes side-trails", productReg.portfolio.core.includes("side-trails"));
assert("product-registry core includes scenes", productReg.portfolio.core.includes("scenes"));
assert(
  "product-registry demotes foragecast from core",
  !productReg.portfolio.core.includes("foragecast")
);
assert(
  "product-registry demotes volunteer from core",
  !productReg.portfolio.core.includes("waypoint-volunteer")
);

const about = read("about.html");
REQUIRED.forEach((label) => {
  assert("about mentions " + label, about.includes(label));
});
assert("about links Side Trails", /side-trails\//.test(about));
assert(
  "about does not list Volunteer as primary peer heading",
  !/<strong>Volunteer<\/strong>/.test(about)
);

const support = read("support.html");
REQUIRED.forEach((label) => {
  assert("support experiences include " + label, new RegExp("<strong>" + label + "</strong>").test(support));
});
assert("support links Side Trails", /side-trails\//.test(support));
assert("support demotes Coming later from peer cards", !/<strong>Coming later<\/strong>/.test(support));

const notFound = read("404.html");
REQUIRED.forEach((label) => {
  assert("404 includes " + label, notFound.includes(">" + label + "<"));
});
assert("404 omits old primary peers", !OLD_PRIMARY_PEERS.some((p) => notFound.includes(">" + p + "<")));

const incubator = read("incubator/index.html");
assert("incubator references Side Trails", /side-trails\//.test(incubator) && /Side Trails/.test(incubator));
assert("incubator lists architecture begin links", /Dashboard/.test(incubator) && /Articles/.test(incubator));
assert(
  "incubator does not call Volunteer primary",
  !/Dashboard, Scenes, Sheds, and Volunteer/.test(incubator)
);

const sitemap = read("sitemap.xml");
assert("sitemap includes side-trails", /waypointstudio\.org\/side-trails\//.test(sitemap));
assert("sitemap includes support", /support\.html/.test(sitemap));

const catalog = read("design-system/js/platform/wds-platform-catalog.js");
assert("platform catalog includes Side Trails", /id:\s*"side-trails"/.test(catalog));
assert("platform catalog ForageCast not core", /id:\s*"foragecast"[\s\S]*?tier:\s*"supporting"/.test(catalog));
assert("platform catalog SignalTerrain under side-trails", /id:\s*"signalterrain"[\s\S]*?tier:\s*"side-trails"/.test(catalog));

const studioHome = read("js/studio-home.js");
assert("studio-home fallback lists Side Trails", /side-trails\//.test(studioHome));
assert("studio-home fallback omits Volunteer peer", !/waypoint-volunteer/.test(studioHome.split("renderFallback")[1].slice(0, 600)));

const shell = read("design-system/js/platform/wds-app-shell.js");
assert("shell marks Side Trails active", /side-trails/.test(shell));
assert("shell marks Support active", /support\\.html/.test(shell));

if (failures.length) {
  console.error("\n" + failures.length + " failure(s).");
  process.exit(1);
}
console.log("\nStudio nav architecture checks passed (" + passed + ").");
