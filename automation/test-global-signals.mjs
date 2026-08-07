#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

for (const rel of [
  "side-trails/global-signals/index.html",
  "design-system/css/wds-global-signals-landing.css",
  "assets/images/side-trails/global-signals-globe.svg",
  "assets/images/global-signals/landing/relationships.svg",
  "docs/side-trails/global-signals.md",
  "docs/product/global-signals-owner-review.md"
]) {
  assert.ok(exists(rel), "missing " + rel);
}

const html = read("side-trails/global-signals/index.html");
assert.match(html, /Understanding how world events shape everyday life\./);
assert.match(html, /Experimental/);
assert.match(html, /Mission/);
assert.match(html, /Philosophy/);
assert.match(html, /Why Relationships Matter/);
assert.match(html, /Why Headlines Are Not Enough/);
assert.match(html, /How Global Signals Works/);
assert.match(html, /Why Citizens Should Care/);
assert.match(html, /Roadmap/);
assert.match(html, /Part of Side Trails/);
assert.match(html, /NOT a news|not a news/i);
assert.match(html, /intelligence platform/i);
assert.doesNotMatch(html, /breaking news feed|doom scroll CTA/i);

const catalog = JSON.parse(read("data/side-trails/catalog.json"));
const project = catalog.projects.find((p) => p.id === "global-signals");
assert.ok(project, "global-signals missing from catalog");
assert.equal(project.title, "Global Signals");
assert.equal(project.tagline, "Understanding how world events shape everyday life.");
assert.equal(project.status, "experimental");
assert.equal(project.ctaLabel, "Explore Global Signals");
assert.equal(project.url, "side-trails/global-signals/");
assert.ok(exists(project.icon), project.icon);

console.log("Global Signals checks passed.");
