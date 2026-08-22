#!/usr/bin/env node
/**
 * Global Signals Citizen Impact — design doc + runtime cross-checks.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

const design = read("docs/GLOBAL-SIGNALS-CITIZEN-IMPACT-DASHBOARD.md");
assert.match(design, /sample\/demo runtime|eight-category/i);
assert.match(design, /What could this mean for ordinary people/);
assert.match(design, /\bFood\b/);
assert.match(design, /\bFuel\b|\bGasoline\b/);
assert.match(design, /\bUtilities\b/);
assert.match(design, /\bHealthcare\b/);
assert.match(design, /\bInsurance\b/);
assert.match(design, /\bHousing\b/);
assert.match(design, /\bTechnology\b/);
assert.match(design, /\bTravel\b/);
assert.match(design, /Confidence/);
assert.match(design, /Time Horizon/);
assert.match(design, /Relationship Engine/);
assert.match(design, /Articles/);
assert.match(design, /could mean|may notice|might/i);
assert.match(design, /No surveillance|surveillance/i);
assert.doesNotMatch(design, /you will be targeted|surveil citizens|guaranteed to rise/i);

assert.ok(exists("docs/global-signals/citizen-impact-data-model.md"));
const model = read("docs/global-signals/citizen-impact-data-model.md");
assert.match(model, /gsc_\*/);
assert.match(model, /gsn_\*/);
assert.match(model, /Observed/);
assert.match(model, /sample-demo/);

assert.ok(exists("docs/global-signals/citizen-impact-owner-review.md"));
const review = read("docs/global-signals/citizen-impact-owner-review.md");
assert.match(review, /do not merge/i);
assert.match(review, /Citizen Impact/);
assert.match(review, /sample\/demo/i);

const svg = read("assets/images/global-signals/citizen-impact-dashboard.svg");
assert.match(svg, /SCHEMATIC|NOT A LIVE/i);
assert.match(svg, /Citizen Impact/);
assert.match(svg, /Food/);

const playbook = read("docs/ENGINEERING-PLAYBOOK.md");
assert.match(playbook, /Citizen Impact/);

const readme = read("docs/side-trails/README.md");
assert.match(readme, /GLOBAL-SIGNALS-CITIZEN-IMPACT-DASHBOARD|Citizen Impact/);

const siblingDocs = [
  "docs/GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md",
  "docs/GLOBAL-SIGNALS-CASCADING-IMPACT-EXPLORER.md",
  "docs/side-trails/global-signals.md",
  "docs/global-signals/articles-data-model.md"
];
for (const rel of siblingDocs) {
  if (!exists(rel)) continue;
  const body = read(rel);
  assert.match(
    body,
    /CITIZEN-IMPACT|Citizen Impact/,
    `${rel} is present but missing Citizen Impact cross-link`
  );
}

assert.ok(exists("side-trails/global-signals/citizen-impact/index.html"));
assert.ok(exists("data/global-signals/citizen-impact/citizen-impact.json"));
assert.ok(exists("design-system/js/global-signals/wds-gs-citizen-impact.js"));

console.log("Global Signals Citizen Impact design checks passed.");
