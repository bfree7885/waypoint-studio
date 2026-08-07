#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const design = read("docs/GLOBAL-SIGNALS-ARTICLES.md");
assert.match(design, /Design only|not implemented/i);
assert.match(design, /Headline/);
assert.match(design, /Summary/);
assert.match(design, /Source/);
assert.match(design, /Evidence/);
assert.match(design, /Date/);
assert.match(design, /Topics/);
assert.match(design, /Affected Nodes/);
assert.match(design, /Waypoint.?s Take/i);
assert.match(design, /Likely Impacts/);
assert.match(design, /Confidence/);
assert.match(design, /never repeat|Must never[\s\S]*[Rr]epeat/i);
assert.match(design, /why this matters/i);
assert.match(design, /who is affected/i);
assert.match(design, /industries/i);
assert.match(design, /citizens may notice/i);
assert.match(design, /downstream/i);
assert.match(design, /Relationship Engine|affected nodes/i);
assert.match(design, /highlight/i);
assert.match(design, /No evidence|evidence.*no article/i);
assert.doesNotMatch(design, /breaking news feed|engagement farming approved/i);

const review = read("docs/product/global-signals-articles-owner-review.md");
assert.match(review, /Implementation:\*\* None/);
assert.match(review, /Push-only|Approve design/i);

const schema = read("design-system/global-signals/schema-article-v1.example.json");
const parsed = JSON.parse(schema);
assert.equal(parsed.id.startsWith("gsa_"), true);
assert.ok(parsed.headline && parsed.summary && parsed.source && parsed.evidence);
assert.ok(Array.isArray(parsed.affectedNodes) && parsed.affectedNodes.length > 0);
assert.ok(parsed.waypointTake && parsed.likelyImpacts && parsed.confidence);
assert.match(schema, /not a real event|Illustrative|illustrative/i);

const sideTrails = read("docs/side-trails/README.md");
assert.match(sideTrails, /GLOBAL-SIGNALS-ARTICLES/);

console.log("Global Signals Articles design checks passed.");
