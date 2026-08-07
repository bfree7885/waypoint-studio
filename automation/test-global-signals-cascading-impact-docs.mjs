#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

const design = read("docs/GLOBAL-SIGNALS-CASCADING-IMPACT-EXPLORER.md");
assert.match(design, /Design only|not implemented/i);
assert.match(design, /Cascading Impact Explorer/);
assert.match(design, /Tariffs/);
assert.match(design, /Imports/);
assert.match(design, /Manufacturing/);
assert.match(design, /Retail/);
assert.match(design, /Consumers/);
assert.match(design, /Conflict/);
assert.match(design, /Oil/);
assert.match(design, /Transportation/);
assert.match(design, /Food/);
assert.match(design, /Inflation/);
assert.match(design, /\breason\b/i);
assert.match(design, /confidence/i);
assert.match(design, /evidence/i);
assert.match(design, /timeframe/i);
assert.match(design, /Never imply certainty/i);
assert.match(design, /Expand|expand-on-demand|Interaction model/i);
assert.match(design, /GLOBAL-SIGNALS-RELATIONSHIP-ENGINE/);
assert.match(design, /SIGNALTERRAIN-RELATIONSHIP-MODEL/);
assert.match(design, /RELATIONSHIP-TYPES/);
assert.match(design, /articles-architecture/);
assert.match(design, /surveillance/i);
assert.match(design, /reason.*why|why.*reason/i);
assert.doesNotMatch(design, /AI-powered cascade|as your AI co-pilot/i);
assert.doesNotMatch(design, /will definitely cause|guaranteed to raise prices/i);

for (const rel of [
  "assets/images/global-signals/cascading-impact/tariffs-cascade.svg",
  "assets/images/global-signals/cascading-impact/conflict-oil-cascade.svg",
  "assets/images/global-signals/cascading-impact/interaction-model.svg",
]) {
  assert.ok(exists(rel), `missing visual ${rel}`);
  const svg = read(rel);
  assert.match(svg, /SCHEMATIC|DESIGN ONLY|NOT A LIVE/i);
  assert.match(svg, /<svg[\s>]/i);
}

const review = read("docs/product/global-signals-cascading-impact-owner-review.md");
assert.match(review, /Implementation:\*\* None/);
assert.match(review, /Push-only|Approve/);
assert.match(review, /reason/);
assert.match(review, /confidence/);
assert.match(review, /evidence/);
assert.match(review, /timeframe/);

assert.ok(exists("docs/GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md"));
assert.ok(exists("docs/SIGNALTERRAIN-RELATIONSHIP-MODEL.md"));
assert.ok(exists("docs/RELATIONSHIP-TYPES.md"));
assert.ok(exists("docs/articles/articles-architecture.md"));

const playbook = read("docs/ENGINEERING-PLAYBOOK.md");
assert.match(playbook, /Cascading Impact Explorer/);

const re = read("docs/GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md");
assert.match(re, /GLOBAL-SIGNALS-CASCADING-IMPACT-EXPLORER/);

console.log("Global Signals Cascading Impact Explorer design checks passed.");
