#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const design = read("docs/SIGNALTERRAIN-INTELLIGENCE-MAP.md");
assert.match(design, /Design only|not implemented/i);
assert.match(design, /Current attacks/);
assert.match(design, /Campaign spread/);
assert.match(design, /Threat actor activity/);
assert.match(design, /Infrastructure incidents/);
assert.match(design, /BGP events/);
assert.match(design, /DNS outages/);
assert.match(design, /Cloud outages/);
assert.match(design, /Geographic clustering/);
assert.match(design, /Summary/);
assert.match(design, /Evidence/);
assert.match(design, /Timeline/);
assert.match(design, /Related CVEs/);
assert.match(design, /Official advisories/);
assert.match(design, /Defensive recommendations/);
assert.match(design, /source-backed|evidence/i);
assert.match(design, /No offensive|Offensive/i);
assert.doesNotMatch(design, /AI-powered map|as your AI co-pilot/i);

const review = read("docs/product/signalterrain-intelligence-map-owner-review.md");
assert.match(review, /Implementation:\*\* None/);
assert.match(review, /Push-only|Approve design/i);

console.log("SignalTerrain Intelligence Map design checks passed.");
