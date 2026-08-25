#!/usr/bin/env node
/**
 * Side Trails — Deck featured; archive subordinate; truthful statuses.
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
  "side-trails/openroad-pa/index.html",
  "data/side-trails/catalog.json",
  "design-system/js/side-trails/wds-side-trails.js",
  "design-system/js/side-trails/wds-side-trails-app.js",
  "design-system/css/wds-side-trails.css",
  "assets/images/side-trails/waypoint-deck.svg",
  "assets/images/side-trails/signalterrain-network.svg",
  "assets/images/side-trails/openroad-pa.svg",
  "assets/images/side-trails/global-signals-globe.svg",
  "docs/side-trails/README.md",
  "docs/PRODUCT-DIRECTION.md",
  "sitemap.xml"
]) {
  assert.ok(exists(rel), "missing " + rel);
}

const html = read("side-trails/index.html");
assert.match(html, /id="wst-grid-active"/);
assert.match(html, /id="wst-grid"/);
assert.match(html, /wds-side-trails-app\.js/);
assert.match(html, /Waypoint Deck/);
assert.match(html, /Active Side Trail/);
assert.match(html, /Archive|past experiments/i);
assert.match(html, /OpenRoad PA/);
assert.doesNotMatch(html, /Civic Trails|civic-trails|CivicTrails/i);
assert.doesNotMatch(html, /Explore SignalTerrain/);
assert.doesNotMatch(html, /sister projects beside Waypoint Studio’s primary outdoor tools/i);

const deckPage = read("side-trails/waypoint-deck/index.html");
assert.match(deckPage, /Waypoint Deck/);
assert.match(deckPage, /[Ii]n development|early-stage|planned|exploring|intended/i);
assert.match(deckPage, /offline-first|Offline-first/);
assert.match(deckPage, /not a Studio subscription|Not a Studio app/i);
assert.doesNotMatch(deckPage, /ships Deck OS|already works|fully working/i);
assert.doesNotMatch(deckPage, /\.(png|jpg|webp)"[^>]*hardware|product render/i);

const openroadPage = read("side-trails/openroad-pa/index.html");
assert.match(openroadPage, /OpenRoad PA/);
assert.match(openroadPage, /Retired/);
assert.match(openroadPage, /Tracking Pennsylvania's public road projects/);
assert.match(openroadPage, /never a guilt score/i);
assert.doesNotMatch(openroadPage, /In development/);
assert.doesNotMatch(openroadPage, /\b(corrupt|wasteful|criminal)\b/i);

const catalog = JSON.parse(read("data/side-trails/catalog.json"));
assert.ok(Array.isArray(catalog.projects));
assert.ok(catalog.projects.length >= 4, "expected Deck + archive projects");
assert.equal(
  catalog.projects.some((p) => p.id === "civic-trails"),
  false,
  "civic-trails must not remain in the public catalog"
);

const deck = catalog.projects.find((p) => p.id === "waypoint-deck");
const openroad = catalog.projects.find((p) => p.id === "openroad-pa");
const signal = catalog.projects.find((p) => p.id === "signalterrain");
const globalSignals = catalog.projects.find((p) => p.id === "global-signals");
assert.ok(deck, "waypoint-deck missing");
assert.ok(openroad, "openroad-pa missing");
assert.ok(signal, "signalterrain missing");
assert.ok(globalSignals, "global-signals missing");

assert.equal(deck.title, "Waypoint Deck");
assert.equal(deck.status, "in-development");
assert.equal(deck.url, "side-trails/waypoint-deck/");
assert.equal(deck.featured, true);
assert.ok(exists(deck.icon), deck.icon);
assert.match(deck.description, /[Pp]lanned|Early-stage|do not assume/i);

assert.equal(openroad.title, "OpenRoad PA");
assert.match(openroad.tagline, /[Rr]etired/);
assert.equal(openroad.status, "retired");
assert.equal(openroad.url, "side-trails/openroad-pa/");
assert.ok(exists(openroad.icon), openroad.icon);

assert.equal(signal.title, "SignalTerrain");
assert.equal(signal.status, "archived");
assert.match(signal.description + " " + signal.tagline, /[Nn]ot a standalone|archived|Deck/i);
assert.equal(signal.url, "side-trails/signalterrain/");

assert.equal(globalSignals.title, "Global Signals");
assert.equal(globalSignals.status, "archived");
assert.equal(globalSignals.url, "side-trails/global-signals/");
assert.match(globalSignals.description + " " + globalSignals.tagline, /Deck|archived|not a standalone/i);

assert.ok(deck.order < signal.order, "Deck must order before archive projects");
assert.ok(signal.order < globalSignals.order, "Global Signals should follow SignalTerrain by order");
assert.ok(globalSignals.order < openroad.order, "OpenRoad retired last among archive");

const about = read("about.html");
assert.match(about, /side-trails\//);
assert.match(about, /Side Trails/);
assert.match(about, /Waypoint Deck/);
assert.match(about, /OpenRoad PA/);
assert.match(about, /[Rr]etired/);
assert.match(about, /[Pp]aused/);
assert.doesNotMatch(about, /Civic Trails|civic-trails/i);

const home = read("index.html");
assert.match(home, /Side Trails/);
assert.match(home, /Waypoint Deck|waypoint-deck/);
assert.doesNotMatch(home, /side-trails\/openroad-pa/);
assert.doesNotMatch(home, /Civic Trails|civic-trails/i);
assert.doesNotMatch(home, /side-trails\/signalterrain\/|side-trails\/global-signals\//);

const support = read("support.html");
assert.match(support, /side-trails\//);

const sitemap = read("sitemap.xml");
assert.match(sitemap, /side-trails\/waypoint-deck\//);

const loader = read("design-system/js/side-trails/wds-side-trails.js");
assert.match(loader, /retired:\s*true/);
assert.match(loader, /archived:\s*true/);

const app = read("design-system/js/side-trails/wds-side-trails-app.js");
assert.match(app, /Retired|Archived|In development/);
assert.match(app, /wst-grid-active|isActiveStatus/);

const direction = read("docs/PRODUCT-DIRECTION.md");
assert.match(direction, /OpenRoad PA/);
assert.match(direction, /[Rr]etired/);
assert.match(direction, /Fieldry/);
assert.match(direction, /[Pp]aused/);
assert.match(direction, /Waypoint Deck/);
assert.match(direction, /\*\*active\*\* Side Trail|active Side Trail/i);

const navCfg = read("design-system/js/platform/wds-app-nav-config.js");
assert.match(navCfg, /"homeSideTrails":\s*\[[^\]]*waypoint-deck/);
assert.doesNotMatch(navCfg, /"homeSideTrails":\s*\[[^\]]*signalterrain/);
assert.doesNotMatch(navCfg, /"homeSideTrails":\s*\[[^\]]*global-signals/);

console.log("Side Trails checks passed (" + catalog.projects.length + " projects; Deck featured).");
