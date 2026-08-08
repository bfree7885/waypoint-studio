#!/usr/bin/env node
/**
 * Global Signals foundation smoke checks (dashboard + live modules + placeholders).
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
  "design-system/css/wds-global-signals-home.css",
  "design-system/js/global-signals/wds-gs-home.js",
  "data/global-signals/home/home.json",
  "assets/images/side-trails/global-signals-globe.svg",
  "docs/side-trails/global-signals.md",
  "docs/GLOBAL-SIGNALS-ARCHITECTURE.md",
  "docs/GLOBAL-SIGNALS-ROADMAP.md",
  "docs/GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md",
  "docs/product/global-signals-owner-review.md",
  "side-trails/global-signals/articles/index.html",
  "side-trails/global-signals/relationships/index.html",
  "side-trails/global-signals/countries/index.html",
  "side-trails/global-signals/industries/index.html",
  "side-trails/global-signals/explain/index.html",
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
assert.match(html, /What matters today\?/);
assert.match(html, /gsh-board|data-gsh-board/);
assert.match(html, /wds-gs-home\.js/);
assert.match(html, /wds-global-signals-home\.css/);
assert.match(html, /relationship intelligence platform/i);
assert.match(html, /not a news website/i);
assert.match(html, /not financial advice/i);
assert.match(html, /Experimental/);
assert.match(html, /Part of Side Trails\./);
assert.match(html, /\.\/articles\//);
assert.match(html, /\.\/relationships\//);
assert.match(html, /\.\/countries\//);
assert.match(html, /\.\/industries\//);
assert.match(html, /Industry Intelligence/);
assert.match(html, /\.\/explain\//);
assert.match(html, /\.\/relationship-graph\//);
assert.match(html, /\.\/citizen-impact\//);
assert.doesNotMatch(html, /Coming soon/i);
assert.doesNotMatch(html, /Future modules/i);
assert.doesNotMatch(html, /WebSocket|maplibre|live feed/i);
// Roadmap shells stay off the primary dashboard surface.
assert.doesNotMatch(html, /\.\/waypoint-take\//);
assert.doesNotMatch(html, /\.\/supply-chains\//);
assert.doesNotMatch(html, /\.\/scenario-explorer\//);
assert.doesNotMatch(html, /\.\/global-dashboard\//);

const homeJs = read("design-system/js/global-signals/wds-gs-home.js");
assert.match(homeJs, /Current Events/);
assert.match(homeJs, /Featured Waypoint/);
assert.match(homeJs, /Featured Relationship/);
assert.match(homeJs, /Most Affected Countries/);
assert.match(homeJs, /Industries Under Pressure/);
assert.match(homeJs, /Citizen Impact Summary/);
assert.match(homeJs, /Latest Articles/);
assert.match(homeJs, /Relationship Explorer search/);
assert.match(homeJs, /GS\.home\s*=/);

const homeData = JSON.parse(read("data/global-signals/home/home.json"));
assert.equal(homeData.mode, "sample-demo");
assert.ok(homeData.featuredTake && homeData.featuredTake.articleId);
assert.ok(homeData.featuredRelationship && homeData.featuredRelationship.rootEntityId);
assert.ok(Array.isArray(homeData.mostAffectedCountrySlugs));
assert.ok(Array.isArray(homeData.industriesUnderPressureSlugs));

const articlesPage = read("side-trails/global-signals/articles/index.html");
assert.match(articlesPage, /Articles/);
assert.match(articlesPage, /gsa-feed/);
assert.doesNotMatch(articlesPage, /Coming soon/i);

const relationshipsPage = read("side-trails/global-signals/relationships/index.html");
assert.match(relationshipsPage, /Relationship Explorer/);
assert.match(relationshipsPage, /gsr-app/);
assert.doesNotMatch(relationshipsPage, /Coming soon/i);

const citizenImpactPage = read("side-trails/global-signals/citizen-impact/index.html");
assert.match(citizenImpactPage, /Citizen Impact/);
assert.match(citizenImpactPage, /gsc-board|data-gsc-board/);
assert.doesNotMatch(citizenImpactPage, /Coming soon/i);

const countriesPage = read("side-trails/global-signals/countries/index.html");
assert.match(countriesPage, /Country Intelligence/);
assert.match(countriesPage, /gsc-root/);
assert.doesNotMatch(countriesPage, /Coming soon/i);

const industriesPage = read("side-trails/global-signals/industries/index.html");
assert.match(industriesPage, /Industry Intelligence/);
assert.match(industriesPage, /gsi-index|data-gsi-index/);
assert.doesNotMatch(industriesPage, /Coming soon/i);

const graphPage = read("side-trails/global-signals/relationship-graph/index.html");
assert.match(graphPage, /Relationship Graph/);
assert.match(graphPage, /gsg-app/);
assert.doesNotMatch(graphPage, /Coming soon/i);

const explainPage = read("side-trails/global-signals/explain/index.html");
assert.match(explainPage, /Explain This/);
assert.match(explainPage, /gse-app/);
assert.doesNotMatch(explainPage, /Coming soon/i);

for (const slug of ["waypoint-take", "supply-chains", "scenario-explorer"]) {
  const page = read(`side-trails/global-signals/${slug}/index.html`);
  assert.doesNotMatch(page, /Coming soon/i);
  assert.doesNotMatch(page, /not implemented/i);
  assert.doesNotMatch(page, /honest empty shell/i);
  assert.match(page, /Part of Side Trails\./);
  assert.match(page, /gs-cta--primary/);
}

const globalDashboardRedirect = read("side-trails/global-signals/global-dashboard/index.html");
assert.match(globalDashboardRedirect, /meta[^>]+http-equiv=["']refresh/i);
assert.match(globalDashboardRedirect, /url=\.\.\//);
assert.match(globalDashboardRedirect, /location\.replace\(\s*["']\.\.\/["']\s*\)/);
assert.doesNotMatch(globalDashboardRedirect, /Coming soon/i);

const aboutPage = read("side-trails/global-signals/about/index.html");
assert.match(aboutPage, /About/);
assert.match(aboutPage, /Open dashboard/i);
assert.match(aboutPage, /href="\.\.\/"/);
assert.match(html, /\.\/about\//); // secondary About in dashboard footer

const catalog = JSON.parse(read("data/side-trails/catalog.json"));
const gs = catalog.projects.find((p) => p.id === "global-signals");
assert.ok(gs, "global-signals missing from catalog");
assert.equal(gs.title, "Global Signals");
assert.equal(gs.tagline, "Understanding how world events shape everyday life.");
assert.equal(gs.status, "experimental");
assert.equal(gs.url, "side-trails/global-signals/");

console.log("Global Signals foundation checks passed.");
