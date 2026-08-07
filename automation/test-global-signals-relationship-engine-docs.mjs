#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

const design = read("docs/GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md");
assert.match(design, /Design only|not implemented/i);
assert.match(design, /Relationship Engine/i);
assert.match(design, /why connected|`why`/i);
assert.match(design, /strength/i);
assert.match(design, /confidence/i);
assert.match(design, /direction/i);
assert.match(design, /time delay|timeDelay/i);
assert.match(design, /First-order|1°/i);
assert.match(design, /Second-order|2°/i);
assert.match(design, /Third-order|3°/i);
assert.match(design, /Countries|country/i);
assert.match(design, /Ports|port/i);
assert.match(design, /Canals|canal/i);
assert.match(design, /Shipping lanes|shipping_lane/i);
assert.match(design, /Companies|company/i);
assert.match(design, /Industries|industry/i);
assert.match(design, /Commodities|commodity/i);
assert.match(design, /Energy|energy/i);
assert.match(design, /Policies|policy/i);
assert.match(design, /Tariffs|tariff/i);
assert.match(design, /Wars|war/i);
assert.match(design, /Sanctions|sanction/i);
assert.match(design, /Weather|weather/i);
assert.match(design, /Cyber|cyber_attack/i);
assert.match(design, /Currencies|currency/i);
assert.match(design, /Infrastructure|infrastructure/i);
assert.match(design, /Citizens|citizen/i);
assert.match(design, /impact literacy/i);
assert.match(design, /No offensive|offensive cyber/i);
assert.doesNotMatch(design, /AI-powered graph|as your AI co-pilot/i);

const review = read("docs/product/global-signals-relationship-engine-owner-review.md");
assert.match(review, /Implementation:\*\* None/);
assert.match(review, /Push-only|Approve design/i);

const assets = [
  "assets/images/global-signals/relationship-engine/cascade-overview.svg",
  "assets/images/global-signals/relationship-engine/cascade-maritime.svg",
  "assets/images/global-signals/relationship-engine/cascade-policy.svg",
  "assets/images/global-signals/relationship-engine/cascade-weather.svg",
  "assets/images/global-signals/relationship-engine/edge-anatomy.svg",
];
for (const rel of assets) {
  assert.ok(exists(rel), `missing asset: ${rel}`);
  const svg = read(rel);
  assert.match(svg, /<svg[\s>]/i);
  assert.match(svg, /Schematic|schematic|not live|Not live/i);
}

const sideTrails = read("docs/side-trails/README.md");
assert.match(sideTrails, /GLOBAL-SIGNALS-RELATIONSHIP-ENGINE|Relationship Engine/i);

console.log("Global Signals Relationship Engine design checks passed.");
