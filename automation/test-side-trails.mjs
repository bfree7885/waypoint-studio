#!/usr/bin/env node
/**
 * Side Trails production smoke — two cards, no search/filters, required fields.
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
  "side-trails/signalterrain/index.html",
  "data/side-trails/catalog.json",
  "design-system/js/side-trails/wds-side-trails.js",
  "design-system/js/side-trails/wds-side-trails-app.js",
  "design-system/css/wds-side-trails.css",
  "assets/images/side-trails/signalterrain-network.svg",
  "assets/images/side-trails/civic-trails-map.svg",
  "docs/side-trails/README.md",
  "docs/product/side-trails-production-integration-owner-review.md"
]) {
  assert.ok(exists(rel), "missing " + rel);
}

const html = read("side-trails/index.html");
assert.match(html, /id="wst-grid"/);
assert.match(html, /wds-side-trails-app\.js/);
assert.doesNotMatch(html, /SignalTerrain<\/h2>|Civic Trails<\/h2>/);
assert.doesNotMatch(html, /\b(search|filter|category|categories)\b/i);
assert.doesNotMatch(html, /type="search"|role="search"|wst-filter|wst-search/i);

const appJs = read("design-system/js/side-trails/wds-side-trails-app.js");
assert.doesNotMatch(appJs, /\b(search|filter|filters)\b/i);
assert.match(appJs, /wst-card__icon/);
assert.match(appJs, /was-home__card-title/);
assert.match(appJs, /wst-card__tagline/);
assert.match(appJs, /was-home__status/);
assert.match(appJs, /wds-btn--primary/);
assert.match(appJs, /"Open"|'Open'/);

const catalog = JSON.parse(read("data/side-trails/catalog.json"));
assert.ok(Array.isArray(catalog.projects));
assert.equal(catalog.projects.length, 2, "expected exactly two Side Trails projects");
assert.equal(
  catalog.projects.some((p) => p.id === "global-signals"),
  false,
  "Global Signals must not be in the primary production card set"
);

const ids = catalog.projects.map((p) => p.id).sort();
assert.deepEqual(ids, ["civic-trails", "signalterrain"]);

const civic = catalog.projects.find((p) => p.id === "civic-trails");
const signal = catalog.projects.find((p) => p.id === "signalterrain");

for (const project of [civic, signal]) {
  assert.ok(project.title, project.id + " missing title");
  assert.ok(project.tagline, project.id + " missing tagline");
  assert.ok(project.description, project.id + " missing description");
  assert.ok(project.status, project.id + " missing status");
  assert.ok(project.icon, project.id + " missing icon");
  assert.ok(exists(project.icon), project.icon);
  assert.equal(project.ctaLabel, "Open", project.id + " CTA must be Open");
  assert.ok(project.url, project.id + " missing url");
}

assert.equal(civic.title, "Civic Trails");
assert.match(civic.url, /github\.com\/bfree7885\/civic-trails/);
assert.equal(civic.status, "beta");

assert.equal(signal.title, "SignalTerrain");
assert.equal(signal.tagline, "Adaptive cyber intelligence for defenders.");
assert.match(signal.description, /trusted public intelligence/);
assert.equal(signal.status, "experimental");
assert.equal(signal.url, "side-trails/signalterrain/");
assert.match(read(signal.icon), /circle|network|svg/i);

assert.equal(civic.order < signal.order, true, "SignalTerrain should be second by order");

const about = read("about.html");
assert.match(about, /side-trails\//);
assert.match(about, /Side Trails/);

const support = read("support.html");
assert.match(support, /side-trails\//);

const notFound = read("404.html");
assert.match(notFound, /side-trails\//);

console.log("Side Trails production checks passed (2 projects, no search/filters).");
