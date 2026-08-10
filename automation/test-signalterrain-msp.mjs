#!/usr/bin/env node
/**
 * SignalTerrain MSP regression checks (frozen campaign scope).
 * Ensures home → live brief path, sample labeling, and freshness honesty.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

// --- Home / MSP entry ---
assert.ok(exists("apps/signalterrain/index.html"), "home exists");
const home = read("apps/signalterrain/index.html");
assert.match(home, /cyber\/live\.html#brief/, "primary CTA to live brief");
assert.match(home, /Today.?s cyber brief/i, "brief wording");
assert.match(home, /\(samples\)/, "sample routes labeled");
assert.match(home, /privacy\.html/, "privacy link");
assert.doesNotMatch(home, /lorem ipsum|TODO:\s*(replace|implement)/i);

// --- Live surface ---
const liveHtml = read("apps/signalterrain/cyber/live.html");
assert.match(liveHtml, /data\/cyber\/live\.json/, "live artifact path");
assert.doesNotMatch(liveHtml, /sample-threat|mock.?live|fixture.?live/i);
assert.match(liveHtml, /Teaching \(samples\)/, "teaching labeled samples");

// --- Live artifact freshness ---
assert.ok(exists("data/cyber/live.json"), "live.json present");
const live = JSON.parse(read("data/cyber/live.json"));
assert.ok(live.meta?.generatedAt, "generatedAt");
assert.ok(Array.isArray(live.records) && live.records.length > 0, "records");
assert.ok(live.meta.trustState, "trustState");
const ageMs = Date.now() - Date.parse(live.meta.generatedAt);
assert.ok(Number.isFinite(ageMs), "parseable generatedAt");
// Local MSP bar: artifact should be refreshable to under 48h for a trustworthy Live claim.
if (live.meta.trustState === "Live") {
  assert.ok(
    ageMs < 48 * 3600 * 1000,
    "Live trust requires artifact younger than 48h (got " +
      Math.round(ageMs / 3600000) +
      "h). Run: CYBER_REFRESH_ENABLED=true node scripts/signalterrain-cyber-live-engine.mjs"
  );
}
for (const r of live.records.slice(0, 20)) {
  assert.ok(r.source, "record source");
  assert.ok(r.retrievedAt, "record retrievedAt");
  const blob = JSON.stringify(r.source).toLowerCase();
  assert.doesNotMatch(blob, /sample|fixture|mock/, "no sample sources in live");
}

// --- Client effectiveTrust honesty ---
const jsPath = path.join(
  root,
  "design-system/js/signalterrain/wds-signalterrain-cyber-live.js"
);
const code = fs.readFileSync(jsPath, "utf8");
assert.match(code, /effectiveTrust/, "effectiveTrust exported");
assert.match(code, /LIVE_MAX_AGE_MS/, "LIVE_MAX_AGE_MS present");
assert.match(code, /Stale/, "Stale downgrade present");

const sandbox = { window: {}, console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(code, sandbox);
const api = sandbox.WDS.signalTerrainCyberLive;
assert.equal(typeof api.effectiveTrust, "function");
const staleDoc = {
  meta: {
    trustState: "Live",
    generatedAt: new Date(Date.now() - 40 * 3600 * 1000).toISOString()
  }
};
const stale = api.effectiveTrust(staleDoc);
assert.equal(stale.trustState, "Stale", "40h Live → Stale");
assert.equal(stale.stale, true);
const freshDoc = {
  meta: {
    trustState: "Live",
    generatedAt: new Date().toISOString()
  }
};
const fresh = api.effectiveTrust(freshDoc);
assert.equal(fresh.trustState, "Live", "fresh stays Live");
assert.equal(fresh.stale, false);

console.log("SignalTerrain MSP regression checks passed.");
