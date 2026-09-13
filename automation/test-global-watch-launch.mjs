#!/usr/bin/env node
/**
 * Global Watch Studio bridge — Support / Deck discoverability;
 * launch target is the verified public field-test host.
 * Side Trails catalog is unlisted and must not be required for discovery.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_GW = "https://global-watch-nine.vercel.app";

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

for (const rel of [
  "support.html",
  "side-trails/waypoint-deck/index.html",
  "side-trails/global-watch/index.html",
  "data/side-trails/catalog.json",
  "docs/PRODUCT-DIRECTION.md",
]) {
  assert.ok(exists(rel), "missing " + rel);
}

const support = read("support.html");
assert.match(support, /side-trails\/global-watch\//);
assert.match(support, /Global Watch/);
assert.match(support, /Public Field Test/i);
assert.match(support, /global-watch-nine\.vercel\.app/);
assert.doesNotMatch(support, /127\.0\.0\.1:4173/);

const deck = read("side-trails/waypoint-deck/index.html");
assert.match(deck, /global-watch\//);
assert.match(deck, /Global Watch/);
assert.match(deck, /global-watch-nine\.vercel\.app/);
assert.doesNotMatch(deck, /127\.0\.0\.1:4173/);

const gw = read("side-trails/global-watch/index.html");
assert.match(gw, /noindex/i);
assert.match(gw, /Public Field Test/i);
assert.match(gw, /Launch Global Watch/);
assert.match(gw, new RegExp(PUBLIC_GW.replace(/\./g, "\\.")));
assert.doesNotMatch(gw, /127\.0\.0\.1:4173/);
assert.doesNotMatch(gw, /:4173/);
assert.doesNotMatch(gw, /production-hardened|continuous monitoring guaranteed/i);

const home = read("index.html");
assert.doesNotMatch(home, /href=["'][^"']*side-trails\/["']/);
assert.doesNotMatch(home, /Global Watch/i);

const nav = read("design-system/ecosystem/nav-registry.json");
assert.doesNotMatch(nav, /global-watch/i);
assert.match(nav, /waypoint-deck/);

const catalog = JSON.parse(read("data/side-trails/catalog.json"));
const entry = catalog.projects.find((p) => p.id === "global-watch");
assert.ok(entry);
assert.equal(String(entry.url).replace(/\/$/, ""), PUBLIC_GW);
assert.doesNotMatch(String(entry.url), /127\.0\.0\.1|:4173|localhost/i);

console.log(
  "Global Watch visible-launch checks passed (Support + Deck → public field-test host).",
);
