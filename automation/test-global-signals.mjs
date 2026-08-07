#!/usr/bin/env node
/**
 * Global Signals foundation smoke checks (landing, placeholders, catalog, docs).
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

const required = [
  "side-trails/global-signals/index.html",
  "design-system/css/wds-global-signals-landing.css",
  "assets/images/side-trails/global-signals-globe.svg",
  "assets/images/global-signals/landing/relationships.svg",
  "assets/images/global-signals/landing/signal-flow.svg",
  "assets/images/global-signals/landing/citizen-impact.svg",
  "assets/images/global-signals/landing/modules-overview.svg",
  "assets/images/global-signals/architecture-layers.svg",
  "docs/side-trails/global-signals.md",
  "docs/GLOBAL-SIGNALS-ARCHITECTURE.md",
  "docs/GLOBAL-SIGNALS-ROADMAP.md",
  "docs/GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md",
  "docs/product/global-signals-owner-review.md",
  "side-trails/global-signals/articles/index.html",
  "side-trails/global-signals/countries/index.html",
  "side-trails/global-signals/industries/index.html",
  "side-trails/global-signals/waypoint-take/index.html",
  "side-trails/global-signals/relationship-graph/index.html",
  "side-trails/global-signals/supply-chains/index.html",
  "side-trails/global-signals/citizen-impact/index.html",
  "side-trails/global-signals/scenario-explorer/index.html",
  "side-trails/global-signals/global-dashboard/index.html"
];

for (const rel of required) {
  assert.ok(exists(rel), "missing " + rel);
}

const html = read("side-trails/global-signals/index.html");
assert.match(html, /Global Signals/);
assert.match(html, /Understanding how world events shape everyday life\./);
assert.match(html, /relationship intelligence platform/i);
assert.match(html, /not a news website/i);
assert.match(html, /not financial advice/i);
assert.match(html, /Experimental/);
assert.match(html, /Philosophy/);
assert.match(html, /Roadmap/);
assert.match(html, /Part of Side Trails\./);
assert.match(html, /relationships\.svg/);
assert.match(html, /signal-flow\.svg/);
assert.match(html, /citizen-impact\.svg/);
assert.match(html, /modules-overview\.svg/);
assert.match(html, /\.\/articles\//);
assert.match(html, /\.\/countries\//);
assert.match(html, /\.\/industries\//);
assert.match(html, /Industry Intelligence/);
assert.match(html, /\.\/waypoint-take\//);
assert.match(html, /\.\/relationship-graph\//);
assert.match(html, /\.\/supply-chains\//);
assert.match(html, /\.\/citizen-impact\//);
assert.match(html, /\.\/scenario-explorer\//);
assert.match(html, /\.\/global-dashboard\//);
assert.doesNotMatch(html, /fetch\(|WebSocket|maplibre|live feed/i);

// Articles + Country Intelligence ship live sample/demo shells; other modules remain placeholders.
const articlesPage = read("side-trails/global-signals/articles/index.html");
assert.match(articlesPage, /Articles/);
assert.match(articlesPage, /gsa-feed/);
assert.match(articlesPage, /Global Signals articles will appear here as verified sources are added\./);
assert.match(articlesPage, /Part of Side Trails\./);
assert.doesNotMatch(articlesPage, /Coming soon/i);
assert.doesNotMatch(articlesPage, /fetch\(|WebSocket|live data dashboard/i);

const countriesPage = read("side-trails/global-signals/countries/index.html");
assert.match(countriesPage, /Country Intelligence/);
assert.match(countriesPage, /gsc-root/);
assert.match(countriesPage, /Part of Side Trails\./);
assert.doesNotMatch(countriesPage, /Coming soon/i);
assert.doesNotMatch(countriesPage, /WebSocket|live data dashboard/i);

const industriesPage = read("side-trails/global-signals/industries/index.html");
assert.match(industriesPage, /Industry Intelligence/);
assert.match(industriesPage, /gsi-index|gsi-detail|Industry/);
assert.match(industriesPage, /Part of Side Trails\./);
assert.doesNotMatch(industriesPage, /Coming soon/i);
assert.doesNotMatch(industriesPage, /WebSocket|live data dashboard/i);

for (const slug of [
  "waypoint-take",
  "relationship-graph",
  "supply-chains",
  "citizen-impact",
  "scenario-explorer",
  "global-dashboard"
]) {
  const page = read(`side-trails/global-signals/${slug}/index.html`);
  assert.match(page, /Coming soon/i);
  assert.match(page, /not implemented/i);
  assert.match(page, /Part of Side Trails\./);
  assert.doesNotMatch(page, /fetch\(|WebSocket|live data dashboard/i);
}

const catalog = JSON.parse(read("data/side-trails/catalog.json"));
const gs = catalog.projects.find((p) => p.id === "global-signals");
assert.ok(gs, "global-signals missing from catalog");
assert.equal(gs.title, "Global Signals");
assert.equal(gs.tagline, "Understanding how world events shape everyday life.");
assert.equal(gs.status, "experimental");
assert.equal(gs.ctaLabel, "Explore Global Signals");
assert.equal(gs.url, "side-trails/global-signals/");
assert.ok(exists(gs.icon), gs.icon);
assert.match(gs.description, /relationship intelligence platform/i);
assert.match(gs.description, /Not a news website/i);
assert.match(gs.description, /Not financial advice/i);

const arch = read("docs/GLOBAL-SIGNALS-ARCHITECTURE.md");
assert.match(arch, /not implemented/i);
assert.match(arch, /relationship intelligence platform/i);

const roadmap = read("docs/GLOBAL-SIGNALS-ROADMAP.md");
assert.match(roadmap, /Articles/);
assert.match(roadmap, /Waypoint’s Take|Waypoint's Take/);
assert.match(roadmap, /Relationship Graph/);
assert.match(roadmap, /Supply Chains/);
assert.match(roadmap, /Citizen Impact/);
assert.match(roadmap, /Scenario Explorer/);
assert.match(roadmap, /Global Dashboard/);

console.log("Global Signals foundation checks passed.");
