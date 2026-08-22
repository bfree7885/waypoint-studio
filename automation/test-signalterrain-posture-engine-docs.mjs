#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const arch = read("docs/SIGNALTERRAIN-DYNAMIC-DEFENSIVE-POSTURE-ENGINE.md");
assert.match(arch, /What should I do differently today\?/);
assert.match(arch, /Architecture only|not implemented/i);
assert.match(arch, /New zero-days/);
assert.match(arch, /Copycat attacks/);
assert.match(arch, /Active ransomware/);
assert.match(arch, /Exploited vulnerabilities/);
assert.match(arch, /Vendor advisories/);
assert.match(arch, /Technology stack/);
assert.match(arch, /Region/);
assert.match(arch, /Industry/);
assert.match(arch, /doDifferently/);
assert.ok(!/AI-powered recommendations/i.test(arch));
assert.ok(!/as your AI co-pilot/i.test(arch));

const review = read("docs/product/signalterrain-dynamic-defensive-posture-owner-review.md");
assert.match(review, /Implementation:\*\* None/);
assert.match(review, /Approve/);

console.log("Dynamic Defensive Posture Engine doc checks passed.");
