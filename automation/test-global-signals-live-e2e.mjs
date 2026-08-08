#!/usr/bin/env node
/**
 * End-to-end live path (uses previously written production artifacts from a real ingest).
 * Chain: events → graph activation → impacts → articles → take.
 *
 * Run after: node scripts/global-signals/run-live-pipeline.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readJson(rel) {
  const p = path.join(root, rel);
  assert.ok(fs.existsSync(p), `missing ${rel}`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const status = readJson("data/global-signals/ingestion/status.json");
const events = readJson("data/global-signals/production/events/events.json");
const graph = readJson("data/global-signals/production/graph/graph.json");
const impacts = readJson("data/global-signals/production/impacts/impacts.json");
const articles = readJson("data/global-signals/articles/articles.json");

assert.ok(status.activeSources > 0, "need at least one successful source");
assert.ok(events.mode === "live" || events.mode === "live-empty");
assert.notEqual(events.mode, "sample-demo");
assert.ok((events.events || []).length > 0, "need real ingested events for e2e");
assert.equal(graph.mode, "live");
assert.ok(graph.counts.entities > 0);
assert.ok(graph.counts.relationships > 0);
assert.ok(articles.mode === "live");
assert.ok((articles.articles || []).length > 0);
assert.ok(articles.freshness?.state === "LIVE");

// Prefer a trade/export/tariff brief with graph-backed industry exposure for owner review.
const withTake = articles.articles.filter((a) => a.waypointsTake);
assert.ok(withTake.length > 0, "expected at least one Waypoint Take");
const example =
  withTake.find(
    (a) =>
      (a.affectedIndustries || []).length > 0 &&
      /tariff|export|sanction|section 232|section 301|duties|aluminum|steel/i.test(
        `${a.headline} ${a.eventType}`
      )
  ) ||
  withTake.find((a) => (a.affectedIndustries || []).length > 0) ||
  withTake[0];
assert.ok(example.sourceUrl.startsWith("http"));
assert.ok(example.factualSummary.length > 20);
assert.ok(example.waypointsTake.verifiedFacts?.length);
assert.notEqual(example.waypointsTake.analysis, example.factualSummary);

// Related impacts for same event
const related = (impacts.impacts || []).filter((i) => i.originEvent === example.relatedEventId);
for (const imp of related) {
  assert.notEqual(imp.confidence, "Observed");
  assert.ok(imp.whyThisIsShowing);
  assert.ok(imp.path?.length);
}

console.log(
  JSON.stringify(
    {
      e2eExample: {
        articleId: example.id,
        headline: example.headline,
        publisher: example.publisher,
        publishedAt: example.publishedAt,
        sourceUrl: example.sourceUrl,
        relatedEventId: example.relatedEventId,
        industries: example.affectedIndustries,
        citizenImpacts: example.citizenImpacts,
        takeGenerated: Boolean(example.waypointsTake)
      },
      counts: {
        events: events.events.length,
        articles: articles.articles.length,
        takes: withTake.length,
        graphEntities: graph.counts.entities,
        graphEdges: graph.counts.relationships,
        activeEntities: graph.counts.activeEntities,
        impacts: impacts.counts
      },
      status: {
        lastSuccessfulIngestion: status.lastSuccessfulIngestion,
        activeSources: status.activeSources,
        failures: status.sourceFailures?.length || 0
      }
    },
    null,
    2
  )
);

// Render smoke
await import(pathToFileURL(path.join(root, "design-system/js/global-signals/wds-gs-articles.js")).href);
const api = globalThis.WDS.globalSignals.articles;
const detail = api.renderDetail(api.normalizeArticle(example));
assert.match(detail, /Waypoint/);
assert.match(detail, /VERIFIED|ANALYSIS|Waypoint/);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};
const server = http.createServer((req, res) => {
  let rel = decodeURIComponent((req.url || "/").split("?")[0]).replace(/^\//, "");
  if (!rel || rel.endsWith("/")) rel += "index.html";
  const file = path.join(root, rel);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  res.end(fs.readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const page = await fetch(`http://127.0.0.1:${port}/side-trails/global-signals/articles/`);
assert.equal(page.status, 200);
const json = await fetch(`http://127.0.0.1:${port}/data/global-signals/articles/articles.json`);
const body = await json.text();
assert.match(body, /"mode": "live"/);
assert.doesNotMatch(body, /sample-demo/);
server.close();

// Persist example for owner review
const outDir = path.join(root, "docs/global-signals");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "live-e2e-example.json"),
  JSON.stringify(
    {
      documentedAt: new Date().toISOString(),
      exampleArticle: example,
      relatedImpactCount: related.length,
      ingestionStatus: status
    },
    null,
    2
  ) + "\n"
);

console.log("Global Signals live e2e checks passed.");
