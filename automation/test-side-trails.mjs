#!/usr/bin/env node
/**
 * Side Trails — Deck + Global Watch field-test catalog.
 * /side-trails/ is a catalog (noindex). Global Watch launches standalone via absolute URL.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

for (const rel of [
  "side-trails/index.html",
  "side-trails/waypoint-deck/index.html",
  "side-trails/global-watch/index.html",
  "data/side-trails/catalog.json",
  "docs/PRODUCT-DIRECTION.md",
  "sitemap.xml",
]) {
  assert.ok(exists(rel), "missing " + rel);
}

const index = read("side-trails/index.html");
assert.match(index, /noindex/i);
assert.match(index, /wds-side-trails-app/);
assert.match(index, /wst-grid-active/);
assert.doesNotMatch(index, /location\.replace/);
assert.doesNotMatch(index, /OpenRoad|SignalTerrain|Global Signals/i);

// Catalog may list Global Watch, but primary discovery must not depend on /side-trails/ nav.
const home = read("index.html");
assert.doesNotMatch(
  home,
  /href=["'][^"']*\/side-trails\/["']|href=["']side-trails\/["']/,
  "Home must not link the Side Trails catalog index",
);

const catalog = JSON.parse(read("data/side-trails/catalog.json"));
assert.ok(Array.isArray(catalog.projects));
assert.equal(catalog.projects.some((p) => p.id === "waypoint-deck"), true);
const gw = catalog.projects.find((p) => p.id === "global-watch");
assert.ok(gw, "catalog must include global-watch");
assert.match(
  String(gw.url),
  /^https?:\/\//,
  "Global Watch must launch as standalone absolute URL (not in-Studio embed)",
);
assert.equal(
  catalog.projects.some((p) => p.id === "civic-trails" || p.id === "openroad-pa" || p.id === "signalterrain"),
  false,
  "discontinued projects must not remain in the public catalog",
);

const gwLanding = read("side-trails/global-watch/index.html");
assert.match(gwLanding, /noindex/i);
assert.match(gwLanding, /127\.0\.0\.1:4173/);
assert.match(gwLanding, /Open local field-test host|Launch Global Watch/);
assert.match(gwLanding, /not publicly hosted/i);

const sitemap = read("sitemap.xml");
assert.match(sitemap, /side-trails\/waypoint-deck\//);
assert.doesNotMatch(sitemap, /side-trails\/openroad-pa|side-trails\/signalterrain|side-trails\/global-signals/);

console.log("Side Trails catalog + Global Watch field-test checks passed.");
