#!/usr/bin/env node
/**
 * Side Trails URL — Deck is the only public destination.
 * /side-trails/ is a silent redirect; discontinued projects are not catalogued.
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
  "docs/PRODUCT-DIRECTION.md",
  "sitemap.xml"
]) {
  assert.ok(exists(rel), "missing " + rel);
}

const index = read("side-trails/index.html");
assert.match(index, /noindex/i);
assert.match(index, /location\.replace/);
assert.match(index, /side-trails\/waypoint-deck/);
assert.doesNotMatch(index, /OpenRoad|SignalTerrain|Global Signals|Archive · past experiments/i);

const deckPage = read("side-trails/waypoint-deck/index.html");
assert.match(deckPage, /Waypoint Deck/);
assert.match(deckPage, /[Ii]n development|early-stage|planned|exploring|intended/i);
assert.match(deckPage, /offline-first|Offline-first|local-first|Local-first/);
assert.match(deckPage, /not a Studio subscription|Not a Studio app/i);
assert.doesNotMatch(deckPage, /Global Signals|archived Cyber|derived from/i);
assert.doesNotMatch(deckPage, /ships Deck OS|already works|fully working/i);

const catalog = JSON.parse(read("data/side-trails/catalog.json"));
assert.ok(Array.isArray(catalog.projects));
assert.equal(catalog.projects.length, 1, "catalog must only list Deck");
assert.equal(catalog.projects[0].id, "waypoint-deck");
assert.equal(
  catalog.projects.some((p) => p.id === "civic-trails" || p.id === "openroad-pa" || p.id === "signalterrain"),
  false,
  "discontinued projects must not remain in the public catalog"
);

const sitemap = read("sitemap.xml");
assert.match(sitemap, /side-trails\/waypoint-deck\//);
assert.doesNotMatch(sitemap, /side-trails\/openroad-pa|side-trails\/signalterrain|side-trails\/global-signals/);

console.log("Side Trails / Deck public routing checks passed.");
