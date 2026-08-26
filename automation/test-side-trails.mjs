#!/usr/bin/env node
/**
 * Side Trails — Waypoint Deck only. No archive / old-product identities.
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
  "data/side-trails/catalog.json",
  "design-system/js/side-trails/wds-side-trails.js",
  "design-system/js/side-trails/wds-side-trails-app.js",
  "design-system/css/wds-side-trails.css",
  "assets/images/side-trails/waypoint-deck.svg",
  "docs/side-trails/README.md",
  "docs/PRODUCT-DIRECTION.md",
  "sitemap.xml"
]) {
  assert.ok(exists(rel), "missing " + rel);
}

assert.equal(exists("side-trails/openroad-pa/index.html"), false, "OpenRoad page must be gone");
assert.equal(exists("side-trails/signalterrain/index.html"), false, "SignalTerrain page must be gone");
assert.equal(exists("side-trails/global-signals/index.html"), false, "Global Signals page must be gone");
assert.equal(exists("apps/signalterrain/index.html"), false, "SignalTerrain app must be gone");
assert.equal(exists("assets/images/side-trails/openroad-pa.svg"), false);
assert.equal(exists("assets/images/side-trails/signalterrain-network.svg"), false);
assert.equal(exists("assets/images/side-trails/global-signals-globe.svg"), false);

const html = read("side-trails/index.html");
assert.match(html, /id="wst-grid-active"/);
assert.doesNotMatch(html, /id="wst-grid"/);
assert.doesNotMatch(html, /wst-archive|Archive · past experiments|past experiments/i);
assert.match(html, /wds-side-trails-app\.js/);
assert.match(html, /Waypoint Deck/);
assert.doesNotMatch(html, /OpenRoad|SignalTerrain|Global Signals/i);
assert.doesNotMatch(html, /Civic Trails|civic-trails|CivicTrails/i);
assert.doesNotMatch(html, /Explore SignalTerrain|laboratory of sister|archived below/i);

const deckPage = read("side-trails/waypoint-deck/index.html");
assert.match(deckPage, /Waypoint Deck/);
assert.match(deckPage, /[Ii]n development|early-stage|planned|exploring|intended/i);
assert.match(deckPage, /offline-first|Offline-first/);
assert.match(deckPage, /not a Studio subscription|Not a Studio app/i);
assert.doesNotMatch(deckPage, /ships Deck OS|already works|fully working/i);
assert.doesNotMatch(deckPage, /Global Signals|SignalTerrain|OpenRoad/i);
assert.doesNotMatch(deckPage, /href="\.\.\/global-signals\//);

const catalog = JSON.parse(read("data/side-trails/catalog.json"));
assert.ok(Array.isArray(catalog.projects));
assert.equal(catalog.projects.length, 1, "catalog must list only Waypoint Deck");
const ids = catalog.projects.map((p) => p.id);
assert.equal(ids.includes("civic-trails"), false);
assert.equal(ids.includes("openroad-pa"), false);
assert.equal(ids.includes("signalterrain"), false);
assert.equal(ids.includes("global-signals"), false);

const deck = catalog.projects.find((p) => p.id === "waypoint-deck");
assert.ok(deck, "waypoint-deck missing");
assert.equal(deck.title, "Waypoint Deck");
assert.equal(deck.status, "in-development");
assert.equal(deck.url, "side-trails/waypoint-deck/");
assert.equal(deck.featured, true);
assert.ok(exists(deck.icon), deck.icon);
assert.match(deck.description, /[Pp]lanned|Early-stage|do not assume/i);

const about = read("about.html");
assert.match(about, /side-trails\//);
assert.match(about, /Side Trails/);
assert.match(about, /Waypoint Deck/);
assert.doesNotMatch(about, /OpenRoad|SignalTerrain|Global Signals/i);
assert.doesNotMatch(about, /Civic Trails|civic-trails/i);

const home = read("index.html");
assert.match(home, /Side Trails/);
assert.match(home, /Waypoint Deck|waypoint-deck/);
assert.doesNotMatch(home, /side-trails\/openroad-pa|side-trails\/signalterrain|side-trails\/global-signals/);
assert.doesNotMatch(home, /OpenRoad|SignalTerrain|Global Signals/i);
assert.doesNotMatch(home, /Older work is archived/i);

const support = read("support.html");
assert.match(support, /side-trails\//);

const sitemap = read("sitemap.xml");
assert.match(sitemap, /side-trails\/waypoint-deck\//);
assert.doesNotMatch(sitemap, /side-trails\/openroad-pa/);
assert.doesNotMatch(sitemap, /side-trails\/signalterrain/);
assert.doesNotMatch(sitemap, /side-trails\/global-signals/);
assert.doesNotMatch(sitemap, /apps\/signalterrain/);

const app = read("design-system/js/side-trails/wds-side-trails-app.js");
assert.match(app, /FORBIDDEN_IDS/);
assert.match(app, /openroad-pa/);
assert.match(app, /signalterrain/);
assert.doesNotMatch(app, /wst-archive|past experiments/);

const direction = read("docs/PRODUCT-DIRECTION.md");
assert.match(direction, /Waypoint Deck/);
assert.match(direction, /Dashboard/);
assert.match(direction, /Fieldry/);
assert.doesNotMatch(direction, /OpenRoad PA|SignalTerrain|Global Signals/);
assert.doesNotMatch(direction, /retired projects|Archive · past/i);

const navCfg = read("design-system/js/platform/wds-app-nav-config.js");
assert.match(navCfg, /"homeSideTrails":\s*\[[^\]]*waypoint-deck/);
assert.doesNotMatch(navCfg, /"id": "signalterrain"/);
assert.doesNotMatch(navCfg, /"id": "global-signals"/);
assert.doesNotMatch(navCfg, /"id": "openroad-pa"/);

console.log("Side Trails checks passed (" + catalog.projects.length + " project; Deck only).");
