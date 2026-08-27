#!/usr/bin/env node
/**
 * Studio nav architecture alignment — smoke checks.
 * Authority: docs/product/waypoint-studio-nav-architecture-owner-review.md
 *
 * Asserts shared nav config + directory surfaces expose the current
 * five-effort architecture labels (Dashboard, Scenes, Sheds, Deck,
 * Articles, Support, About) and do not present discontinued products
 * as architecture equals.
 *
 * Run: node automation/test-studio-nav-architecture.mjs
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REQUIRED = ["Dashboard", "Scenes", "Sheds", "Deck", "Articles", "Support", "About"];
const OLD_PRIMARY_PEERS = ["Volunteer", "SignalTerrain", "Steepleaf", "Savant", "Fieldry", "ForageCast", "Side Trails"];

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
assert("Deck in primary nav", labels.includes("Deck"));
assert("Side Trails catalog not a primary nav label", !labels.includes("Side Trails"));
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
assert("nav-registry includes Deck href", /\/side-trails\/waypoint-deck\//.test(JSON.stringify(navReg.studioPrimaryNav)));
assert(
  "primary nav hrefs are site-root absolute",
  (cfg.studioPrimaryNav || []).every(function (i) {
    return typeof i.href === "string" && i.href.charAt(0) === "/";
  }),
  (cfg.studioPrimaryNav || []).map(function (i) { return i.href; }).join("|")
);

// Depth-aware resolution: /articles/ and /side-trails/ must not emit peer-relative dead ends.
const depthArticles = sandboxDepth("/articles/");
const depthDeck = sandboxDepth("/side-trails/waypoint-deck/");
const depthScenes = sandboxDepth("/apps/scenes/");
const depthRoot = sandboxDepth("/");
assert("depth /articles/ is 1", depthArticles === 1, String(depthArticles));
assert("depth /side-trails/waypoint-deck/ is 2", depthDeck === 2, String(depthDeck));
assert("depth /apps/scenes/ is 2", depthScenes === 2, String(depthScenes));
assert("depth / is 0", depthRoot === 0, String(depthRoot));
assert(
  "resolve Deck from /articles/ is absolute",
  sandboxResolve("/side-trails/waypoint-deck/", depthArticles) === "/side-trails/waypoint-deck/",
  sandboxResolve("/side-trails/waypoint-deck/", depthArticles)
);
assert(
  "resolve relative articles from /side-trails/waypoint-deck/ uses parent",
  sandboxResolve("articles/", depthDeck) === "../../articles/" ||
    sandboxResolve("/articles/", depthDeck) === "/articles/",
  sandboxResolve("/articles/", depthDeck)
);

const productReg = JSON.parse(read("design-system/ecosystem/product-registry.json"));
assert("product-registry core includes waypoint-deck", productReg.portfolio.core.includes("waypoint-deck"));
assert("product-registry core includes scenes", productReg.portfolio.core.includes("scenes"));
assert(
  "product-registry demotes foragecast from core",
  !productReg.portfolio.core.includes("foragecast")
);
assert(
  "product-registry demotes volunteer from core",
  !productReg.portfolio.core.includes("waypoint-volunteer")
);
assert(
  "product-registry does not list side-trails as core catalog",
  !productReg.portfolio.core.includes("side-trails")
);

const about = read("about.html");
REQUIRED.forEach((label) => {
  assert("about mentions " + label, about.includes(label));
});
assert("about links Deck", /side-trails\/waypoint-deck\//.test(about));
assert(
  "about does not list Volunteer as primary peer heading",
  !/<strong>Volunteer<\/strong>/.test(about)
);

const support = read("support.html");
REQUIRED.forEach((label) => {
  assert("support experiences include " + label, new RegExp("<strong>" + label + "</strong>").test(support));
});
assert("support links Deck", /side-trails\/waypoint-deck\//.test(support));
assert("support demotes Coming later from peer cards", !/<strong>Coming later<\/strong>/.test(support));

const notFound = read("404.html");
REQUIRED.forEach((label) => {
  assert("404 includes " + label, notFound.includes(">" + label + "<"));
});
assert("404 omits old primary peers", !OLD_PRIMARY_PEERS.some((p) => notFound.includes(">" + p + "<")));

const incubator = read("incubator/index.html");
assert("incubator is a silent redirect", /noindex/i.test(incubator) && /location\.replace/.test(incubator));
assert("incubator does not catalog experiments", !/Steepleaf|Savant|Fieldry|Volunteer/.test(incubator));

const sitemap = read("sitemap.xml");
assert("sitemap includes waypoint-deck", /waypointstudio\.org\/side-trails\/waypoint-deck\//.test(sitemap));
assert("sitemap omits incubator", !/\/incubator\//.test(sitemap));
assert("sitemap omits discontinued apps", !/\/apps\/fieldry\/|\/apps\/foragecast\/|\/side-trails\/openroad-pa\//.test(sitemap));
assert("sitemap includes support", /support\.html/.test(sitemap));

const catalog = read("design-system/js/platform/wds-platform-catalog.js");
assert("platform catalog includes Deck", /id:\s*"deck"/.test(catalog));
assert("platform catalog omits public ForageCast", !/id:\s*"foragecast"/.test(catalog));
assert("platform catalog omits public SignalTerrain", !/id:\s*"signalterrain"/.test(catalog));

const studioHome = read("js/studio-home.js");
assert("studio-home lists Deck", /side-trails\/waypoint-deck\//.test(studioHome));
assert("studio-home omits Volunteer as home peer", !/waypoint-volunteer/.test(studioHome));
assert("studio-home is front door (no dashboard boot)", !/home-boot\.js|wds-dashboard-rebuild/.test(studioHome));
assert("studio-home mounts Useful now panel", /data-was-home-now|was-home-now/.test(studioHome));
assert("index is front door HTML", /was-home-hero/.test(read("index.html")) && !/home-boot\.js/.test(read("index.html")));


const shell = read("design-system/js/platform/wds-app-shell.js");
assert("shell marks Deck active", /waypoint-deck/.test(shell));
assert("shell marks Support active", /support\\.html/.test(shell));
assert(
  "quiet chrome still renders primary nav",
  !/var primary = quiet\s*\n\s*\?/.test(shell) && /studioPrimaryNav/.test(shell)
);
assert("quiet chrome hides Explore only", /hideExplore/.test(shell));

const stLanding = read("side-trails/signalterrain/index.html");
assert("SignalTerrain landing is a silent redirect", /noindex/i.test(stLanding) && /location\.replace/.test(stLanding));
assert("SignalTerrain landing does not keep product identity", !/SignalTerrain/.test(stLanding));
const gsLanding = read("side-trails/global-signals/index.html");
assert("Global Signals landing is a silent redirect", /noindex/i.test(gsLanding) && /location\.replace/.test(gsLanding));
assert("Global Signals landing does not keep product identity", !/Global Signals/.test(gsLanding));

const quietCss = read("design-system/css/wds-app-shell.css");
assert("quiet chrome styles primary nav", /\.was-global--quiet \.was-primary-nav/.test(quietCss));

if (failures.length) {
  console.error("\n" + failures.length + " failure(s).");
  process.exit(1);
}
console.log("\nStudio nav architecture checks passed (" + passed + ").");
