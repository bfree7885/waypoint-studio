#!/usr/bin/env node
/**
 * SignalTerrain is not a public Waypoint product.
 * Engineering may remain; public routing must not present ST identity.
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

const catalog = JSON.parse(read("data/side-trails/catalog.json"));
assert.equal(catalog.projects.some((p) => p.id === "signalterrain"), false);

const nav = loadNavConfig();
assert.equal(nav.homePrimary.includes("signalterrain"), false);
assert.equal(nav.studioPrimaryNav.some((item) => item.id === "signalterrain" || item.label === "SignalTerrain"), false);
assert.equal((nav.apps || []).some((a) => a.id === "signalterrain"), false);

const platform = loadPlatformCatalog();
assert.equal(platform.byId("signalterrain"), null);

const incubator = read("incubator/index.html");
assert.match(incubator, /noindex/i);
assert.doesNotMatch(incubator, /SignalTerrain/);

const about = read("about.html");
assert.doesNotMatch(about, /SignalTerrain/);
assert.match(about, /Waypoint Deck/);

const support = read("support.html");
assert.match(support, /waypoint-deck/);
assert.doesNotMatch(support, /SignalTerrain/);

const sitemap = read("sitemap.xml");
assert.doesNotMatch(sitemap, /\/apps\/signalterrain\/|\/side-trails\/signalterrain\//);

console.log("SignalTerrain public-identity removal checks passed.");
