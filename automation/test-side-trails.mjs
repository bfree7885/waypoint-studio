#!/usr/bin/env node
/**
 * Side Trails catalog + page smoke checks.
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
  "data/side-trails/catalog.json",
  "design-system/js/side-trails/wds-side-trails.js",
  "design-system/js/side-trails/wds-side-trails-app.js",
  "design-system/css/wds-side-trails.css",
  "assets/images/side-trails/signalterrain-network.svg",
  "assets/images/side-trails/civic-trails-map.svg",
  "assets/images/side-trails/global-signals-globe.svg",
  "docs/side-trails/README.md",
  "docs/side-trails/global-signals.md",
  "docs/product/side-trails-signalterrain-owner-review.md",
  "docs/product/global-signals-owner-review.md"
]) {
  assert.ok(exists(rel), "missing " + rel);
}

const html = read("side-trails/index.html");
assert.match(html, /id="wst-grid"/);
assert.match(html, /wds-side-trails-app\.js/);
assert.doesNotMatch(html, /SignalTerrain<\/h2>|Civic Trails<\/h2>/);
assert.doesNotMatch(html, /Explore SignalTerrain/);

const catalog = JSON.parse(read("data/side-trails/catalog.json"));
assert.ok(Array.isArray(catalog.projects));
assert.ok(catalog.projects.length >= 3, "expected at least three Side Trails projects");

const civic = catalog.projects.find((p) => p.id === "civic-trails");
const signal = catalog.projects.find((p) => p.id === "signalterrain");
const globalSignals = catalog.projects.find((p) => p.id === "global-signals");
assert.ok(civic, "civic-trails missing");
assert.ok(signal, "signalterrain missing");
assert.ok(globalSignals, "global-signals missing");

assert.equal(signal.title, "SignalTerrain");
assert.equal(signal.tagline, "Adaptive cyber intelligence for defenders.");
assert.match(signal.description, /trusted public intelligence/);
assert.equal(signal.status, "experimental");
assert.equal(signal.ctaLabel, "Explore SignalTerrain");
assert.equal(signal.url, "side-trails/signalterrain/");
assert.ok(exists(signal.icon), signal.icon);
assert.match(read(signal.icon), /circle|network|svg/i);

assert.equal(globalSignals.title, "Global Signals");
assert.equal(globalSignals.status, "experimental");
assert.equal(globalSignals.url, "side-trails/global-signals/");

assert.equal(civic.order < signal.order, true, "SignalTerrain should follow Civic Trails by order");
assert.equal(signal.order < globalSignals.order, true, "Global Signals should follow SignalTerrain by order");

const about = read("about.html");
assert.match(about, /side-trails\//);
assert.match(about, /Side Trails/);

const support = read("support.html");
assert.match(support, /side-trails\//);

console.log("Side Trails checks passed (" + catalog.projects.length + " projects).");
