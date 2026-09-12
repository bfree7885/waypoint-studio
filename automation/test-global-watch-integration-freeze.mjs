#!/usr/bin/env node
/**
 * Global Watch ↔ Studio integration freeze guardrails.
 * Docs + IA assertions only — no product redesign.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const product = read("docs/PRODUCT-DIRECTION.md");
assert.match(product, /TEMPORARY field-test discovery/i);
assert.match(product, /legacy\/unlisted infrastructure/i);
assert.match(product, /Merged.*deployed.*discoverable|deployed.*does not mean.*discoverable/i);
assert.match(product, /live Home page/i);
assert.match(product, /LOCAL/i);
assert.match(product, /architecturally independent/i);

const bridgeDoc = read("docs/global-watch-studio-bridge.md");
assert.match(bridgeDoc, /TEMPORARY field-test discovery/i);
assert.match(bridgeDoc, /standalone repository/i);
assert.match(bridgeDoc, /127\.0\.0\.1:4173/);
assert.match(bridgeDoc, /LOCAL/);

const stReadme = read("docs/side-trails/README.md");
assert.match(stReadme, /Not a current Waypoint Studio product section|legacy\/unlisted/i);
assert.doesNotMatch(stReadme, /Side Trails is an active public catalog/i);

const stIndex = read("side-trails/index.html");
assert.match(stIndex, /noindex/i);
assert.match(stIndex, /not a product section|legacy|unlisted/i);
assert.doesNotMatch(stIndex, /Active Side Trails/i);
assert.doesNotMatch(stIndex, /Side Trails are separate products/i);
assert.doesNotMatch(stIndex, /Studio flagships remain Dashboard, Scenes, and Sheds/i);

const support = read("support.html");
assert.match(support, /Temporary field-test discovery/i);
assert.match(support, /LOCAL/i);
assert.match(support, /not publicly hosted/i);
assert.match(support, /not Global Watch.s permanent product|not.*permanent product/i);

const home = read("index.html");
assert.doesNotMatch(home, /Global Watch/i);
assert.doesNotMatch(home, /href=["'][^"']*\/side-trails\/["']|href=["']side-trails\/["']/);

const nav = JSON.parse(read("design-system/ecosystem/nav-registry.json"));
const labels = (nav.studioPrimaryNav || []).map((i) => i.label);
assert.equal(labels.includes("Side Trails"), false, "Side Trails must not be primary nav");
assert.equal(
  (nav.studioPrimaryNav || []).some((i) => /global-watch/i.test(JSON.stringify(i))),
  false,
  "Global Watch must not be in primary nav",
);
assert.ok(Array.isArray(nav.homeSideTrails));
assert.equal(nav.homeSideTrails.length, 0, "homeSideTrails must stay empty");

const gw = read("side-trails/global-watch/index.html");
assert.match(gw, /127\.0\.0\.1:4173/);
assert.match(gw, /not publicly hosted/i);
assert.match(gw, /LOCAL|local field test|local host/i);
assert.doesNotMatch(gw, /publicly available|public cloud host|production cloud deployment/i);
assert.doesNotMatch(gw, /this is a public deployment/i);

console.log("Global Watch integration freeze guardrails passed.");
