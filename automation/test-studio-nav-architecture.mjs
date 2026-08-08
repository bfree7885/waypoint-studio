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

function loadNavSandbox() {
  const sandbox = { globalThis: {} };
  sandbox.global = sandbox;
  sandbox.window = sandbox;
  sandbox.location = { pathname: "/", hash: "" };
  vm.runInNewContext(read("design-system/js/platform/wds-app-nav-config.js"), sandbox, {
    filename: "wds-app-nav-config.js"
  });
  vm.runInNewContext(read("design-system/js/platform/wds-app-nav.js"), sandbox, {
    filename: "wds-app-nav.js"
  });
  return sandbox;
}

const navSandbox = loadNavSandbox();
const cfg = navSandbox.WDS.APP_NAV_CONFIG;

function sandboxDepth(path) {
  navSandbox.location.pathname = path;
  return navSandbox.WDS.appNav.depthFromPath(path);
}

function sandboxResolve(route, depth) {
  return navSandbox.WDS.appNav.resolveRoute(route, depth);
}
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
assert("nav-registry includes Side Trails href", /\/side-trails\//.test(JSON.stringify(navReg.studioPrimaryNav)));
assert(
  "primary nav hrefs are site-root absolute",
  (cfg.studioPrimaryNav || []).every(function (i) {
    return typeof i.href === "string" && i.href.charAt(0) === "/";
  }),
  (cfg.studioPrimaryNav || []).map(function (i) { return i.href; }).join("|")
);

// Depth-aware resolution: /articles/ and /side-trails/ must not emit peer-relative dead ends.
const depthArticles = sandboxDepth("/articles/");
const depthSideTrails = sandboxDepth("/side-trails/");
const depthScenes = sandboxDepth("/apps/scenes/");
const depthRoot = sandboxDepth("/");
assert("depth /articles/ is 1", depthArticles === 1, String(depthArticles));
assert("depth /side-trails/ is 1", depthSideTrails === 1, String(depthSideTrails));
assert("depth /apps/scenes/ is 2", depthScenes === 2, String(depthScenes));
assert("depth / is 0", depthRoot === 0, String(depthRoot));
assert(
  "resolve Side Trails from /articles/ is absolute",
  sandboxResolve("side-trails/", depthArticles) === "/side-trails/" ||
    sandboxResolve("/side-trails/", depthArticles) === "/side-trails/",
  sandboxResolve("/side-trails/", depthArticles)
);
assert(
  "resolve relative articles from /side-trails/ uses parent",
  sandboxResolve("articles/", depthSideTrails) === "../articles/",
  sandboxResolve("articles/", depthSideTrails)
);

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
assert(
  "quiet chrome still renders primary nav",
  !/var primary = quiet\s*\n\s*\?/.test(shell) && /studioPrimaryNav/.test(shell)
);
assert("quiet chrome hides Explore only", /hideExplore/.test(shell));

const stLanding = read("side-trails/signalterrain/index.html");
assert("SignalTerrain landing links Side Trails", /href="\/side-trails\/"/.test(stLanding));
assert("SignalTerrain landing links Articles", /href="\/articles\/"/.test(stLanding));
const gsLanding = read("side-trails/global-signals/index.html");
assert("Global Signals landing links Side Trails", /href="\/side-trails\/"/.test(gsLanding));
assert("Global Signals landing links Home", /href="\/"/.test(gsLanding));

const quietCss = read("design-system/css/wds-app-shell.css");
assert("quiet chrome styles primary nav", /\.was-global--quiet \.was-primary-nav/.test(quietCss));

if (failures.length) {
  console.error("\n" + failures.length + " failure(s).");
  process.exit(1);
}
console.log("\nStudio nav architecture checks passed (" + passed + ").");
