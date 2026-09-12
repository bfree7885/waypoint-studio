#!/usr/bin/env node
/**
 * /side-trails/ legacy shell + Deck/GW entries.
 * This path is unlisted infrastructure — not a current Studio product section.
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
  "docs/side-trails/README.md",
  "sitemap.xml",
]) {
  assert.ok(exists(rel), "missing " + rel);
}

const index = read("side-trails/index.html");
assert.match(index, /noindex/i);
assert.match(index, /wds-side-trails-app/);
assert.match(index, /wst-grid-active/);
assert.match(index, /not a product section|legacy|unlisted/i);
assert.doesNotMatch(index, /location\.replace/);
assert.doesNotMatch(index, /Active Side Trails/i);
assert.doesNotMatch(index, /Side Trails are separate products/i);
assert.doesNotMatch(index, /OpenRoad|SignalTerrain|Global Signals/i);

const home = read("index.html");
assert.doesNotMatch(
  home,
  /href=["'][^"']*\/side-trails\/["']|href=["']side-trails\/["']/,
  "Home must not link the /side-trails/ index",
);
assert.doesNotMatch(home, /Global Watch/i);

const catalog = JSON.parse(read("data/side-trails/catalog.json"));
assert.ok(Array.isArray(catalog.projects));
assert.equal(catalog.projects.some((p) => p.id === "waypoint-deck"), true);
const gw = catalog.projects.find((p) => p.id === "global-watch");
assert.ok(gw, "catalog must include global-watch");
assert.match(
  String(gw.url),
  /^https?:\/\//,
  "Global Watch catalog URL must be absolute (standalone / LOCAL host)",
);
assert.match(String(gw.url), /127\.0\.0\.1:4173/, "catalog must point at LOCAL field-test host");
assert.equal(
  catalog.projects.some((p) => p.id === "civic-trails" || p.id === "openroad-pa" || p.id === "signalterrain"),
  false,
  "discontinued projects must not remain in the catalog",
);

const gwLanding = read("side-trails/global-watch/index.html");
assert.match(gwLanding, /noindex/i);
assert.match(gwLanding, /127\.0\.0\.1:4173/);
assert.match(gwLanding, /Open local field-test host|Launch Global Watch/);
assert.match(gwLanding, /not publicly hosted/i);

const sitemap = read("sitemap.xml");
assert.match(sitemap, /side-trails\/waypoint-deck\//);
assert.doesNotMatch(sitemap, /side-trails\/openroad-pa|side-trails\/signalterrain|side-trails\/global-signals/);
assert.doesNotMatch(sitemap, /side-trails\/global-watch/);

const stReadme = read("docs/side-trails/README.md");
assert.match(stReadme, /legacy\/unlisted|Not a current/i);

console.log("Legacy /side-trails/ shell + Global Watch LOCAL catalog checks passed.");
