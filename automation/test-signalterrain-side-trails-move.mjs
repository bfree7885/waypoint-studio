#!/usr/bin/env node
/**
 * SignalTerrain → Side Trails IA move smoke checks.
 * Asserts catalog membership and non-peer architecture placement.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function loadNavConfig() {
  const code = read("design-system/js/platform/wds-app-nav-config.js");
  const sandbox = { console };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.WDS = {};
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.WDS.APP_NAV_CONFIG;
}

function loadPlatformCatalog() {
  const code = read("design-system/js/platform/wds-platform-catalog.js");
  const sandbox = { console };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.WDS = {};
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.WDS.platformCatalog;
}

for (const rel of [
  "apps/signalterrain/index.html",
  "side-trails/signalterrain/index.html",
  "side-trails/index.html",
  "data/side-trails/catalog.json",
  "docs/product/signalterrain-side-trails-move-owner-review.md",
  "docs/side-trails/README.md"
]) {
  assert.ok(exists(rel), "missing " + rel);
}

const catalog = JSON.parse(read("data/side-trails/catalog.json"));
const signal = catalog.projects.find((p) => p.id === "signalterrain");
assert.ok(signal, "SignalTerrain must appear in Side Trails catalog");
assert.equal(signal.title, "SignalTerrain");
assert.equal(signal.status, "experimental");
assert.match(String(signal.url), /apps\/signalterrain\/cyber\/live\.html|side-trails\/signalterrain\/?|apps\/signalterrain\/?/);

const nav = loadNavConfig();
assert.ok(Array.isArray(nav.homePrimary));
assert.ok(Array.isArray(nav.studioPrimaryNav));
assert.ok(Array.isArray(nav.homeIncubator));
assert.ok(Array.isArray(nav.homeSideTrails));

assert.equal(
  nav.homePrimary.includes("signalterrain"),
  false,
  "SignalTerrain must not be in homePrimary beside Dashboard/Scenes"
);
assert.equal(nav.homePrimary.includes("scenes"), true);
assert.ok(
  nav.homePrimary.includes("home") || nav.homePrimary.includes("dashboard"),
  "homePrimary should still list Home/Dashboard"
);
assert.equal(
  nav.studioPrimaryNav.some((item) => item.id === "signalterrain" || item.label === "SignalTerrain"),
  false,
  "SignalTerrain must not appear in studioPrimaryNav as a primary peer"
);
assert.equal(
  nav.homeIncubator.includes("signalterrain"),
  false,
  "SignalTerrain must not remain in homeIncubator"
);
assert.equal(nav.homeSideTrails.length, 1);
assert.equal(nav.homeSideTrails[0], "signalterrain");

const stApp = (nav.apps || []).find((a) => a.id === "signalterrain");
assert.ok(stApp, "nav apps entry for SignalTerrain must remain (app chrome)");
assert.equal(stApp.family, "side-trails");
assert.equal(stApp.route, "apps/signalterrain/cyber/live.html");
assert.ok(stApp.productLanding && /side-trails\/signalterrain/.test(stApp.productLanding.href));

const registry = JSON.parse(read("design-system/ecosystem/product-registry.json"));
assert.equal(
  (registry.portfolio.foundations || []).includes("signalterrain"),
  false,
  "SignalTerrain must not remain in portfolio.foundations"
);
assert.ok(
  (registry.portfolio.sideTrails || []).includes("signalterrain"),
  "SignalTerrain must be in portfolio.sideTrails"
);
assert.equal(registry.products.signalterrain.portfolioTier, "side-trails");
assert.match(registry.products.signalterrain.toolHref, /apps\/signalterrain\/?/);
assert.match(registry.products.signalterrain.studioHref, /side-trails\/signalterrain/);

const platform = loadPlatformCatalog();
const product = platform.byId("signalterrain");
assert.ok(product);
assert.equal(product.tier, "side-trails");
assert.equal(product.parent, "side-trails");
assert.equal(product.pathFromRoot, "apps/signalterrain/");

const incubator = read("incubator/index.html");
assert.doesNotMatch(
  incubator,
  /<h2>SignalTerrain<\/h2>/,
  "Incubator must not list SignalTerrain as a peer product section"
);
assert.match(incubator, /Looking for SignalTerrain/);
assert.match(incubator, /side-trails\//);

const about = read("about.html");
assert.match(about, /Side Trails/);
assert.match(about, /SignalTerrain/);
assert.match(about, /Side Trails → SignalTerrain/);

const support = read("support.html");
assert.match(support, /side-trails\//);
assert.match(support, /SignalTerrain/);

const studioHome = read("js/studio-home.js");
assert.match(studioHome, /homeSideTrails/);
assert.doesNotMatch(studioHome, /homeIncubator", \["signalterrain"/);

const sitemap = read("sitemap.xml");
assert.match(sitemap, /\/apps\/signalterrain\//);
assert.match(sitemap, /\/side-trails\/signalterrain\//);
assert.match(sitemap, /\/side-trails\//);

const navRegistry = read("design-system/ecosystem/nav-registry.json");
assert.match(navRegistry, /"family": "side-trails"/);

console.log("SignalTerrain Side Trails IA move checks passed.");
