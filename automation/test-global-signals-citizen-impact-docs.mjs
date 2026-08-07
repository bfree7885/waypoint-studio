#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

const design = read("docs/GLOBAL-SIGNALS-CITIZEN-IMPACT-DASHBOARD.md");
assert.match(design, /Design only|not implemented/i);
assert.match(design, /What could this mean for ordinary people/);
assert.match(design, /\bFood\b/);
assert.match(design, /\bGasoline\b/);
assert.match(design, /\bUtilities\b/);
assert.match(design, /\bHealthcare\b/);
assert.match(design, /\bInsurance\b/);
assert.match(design, /\bEmployment\b/);
assert.match(design, /\bHousing\b/);
assert.match(design, /\bTechnology\b/);
assert.match(design, /\bTravel\b/);
assert.match(design, /Consumer Goods/);
assert.match(design, /\bEducation\b/);
assert.match(design, /Current Events/);
assert.match(design, /Potential Impacts/);
assert.match(design, /Industries Involved/);
assert.match(design, /\bWhy\b/);
assert.match(design, /Confidence/);
assert.match(design, /Time Horizon/);
assert.match(design, /Relationship Engine/);
assert.match(design, /Cascading Impact/);
assert.match(design, /Articles/);
assert.match(design, /could mean|may notice|might/i);
assert.match(design, /No surveillance|surveillance/i);
assert.doesNotMatch(design, /you will be targeted|surveil citizens|guaranteed to rise/i);

const review = read("docs/product/global-signals-citizen-impact-owner-review.md");
assert.match(review, /Implementation:\*\* None/);
assert.match(review, /Push-only|Approve design/i);
assert.match(review, /not implemented|documentation only/i);

const svg = read("assets/images/global-signals/citizen-impact-dashboard.svg");
assert.match(svg, /SCHEMATIC|NOT A LIVE/i);
assert.match(svg, /Citizen Impact/);
assert.match(svg, /Food/);
assert.match(svg, /Education/);

const playbook = read("docs/ENGINEERING-PLAYBOOK.md");
assert.match(playbook, /Citizen Impact Dashboard/);

const readme = read("docs/side-trails/README.md");
assert.match(readme, /GLOBAL-SIGNALS-CITIZEN-IMPACT-DASHBOARD|Citizen Impact/);

// Cross-links from sibling Global Signals docs when present on disk
const siblingDocs = [
  "docs/GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md",
  "docs/GLOBAL-SIGNALS-CASCADING-IMPACT-EXPLORER.md",
  "docs/GLOBAL-SIGNALS-ARTICLES.md",
  "docs/side-trails/global-signals.md",
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

console.log("Global Signals Citizen Impact design checks passed.");
