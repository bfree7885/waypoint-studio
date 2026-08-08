#!/usr/bin/env node
/**
 * Global Signals Articles — fixture unit tests + production gate.
 * Demo/sample data lives under fixtures/ only.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

const htmlPath = "side-trails/global-signals/articles/index.html";
const cssPath = "design-system/css/wds-global-signals-articles.css";
const jsPath = "design-system/js/global-signals/wds-gs-articles.js";
const loaderPath = "design-system/js/global-signals/wds-gs-loader.js";
const fixturePath = "data/global-signals/fixtures/articles/articles.json";
const prodPath = "data/global-signals/articles/articles.json";

assert.ok(exists(htmlPath), "articles route missing");
assert.ok(exists(cssPath), "articles CSS missing");
assert.ok(exists(jsPath), "articles JS missing");
assert.ok(exists(loaderPath), "shared loader missing");
assert.ok(exists(fixturePath), "fixture articles missing");

const html = read(htmlPath);
assert.match(html, /<title>Articles — Global Signals<\/title>/);
assert.match(html, /id="gsa-feed"/);
assert.match(html, /data-gsa-feed/);
assert.match(html, /Global Signals articles will appear here as verified sources are added\./);
assert.match(html, /wds-gs-articles\.js/);
assert.match(html, /wds-gs-loader\.js/);
assert.match(html, /articles\.json/);
assert.doesNotMatch(html, /Coming soon/i);

const css = read(cssPath);
assert.match(css, /\.gsa-feed/);
assert.match(css, /\.gsa-card/);
assert.match(css, /\.gsa-freshness/);

const data = JSON.parse(read(fixturePath));
assert.equal(data.mode, "sample-demo");
assert.equal(data.articles.length, 5);
for (const a of data.articles) {
  assert.ok(a.id, "id required");
  assert.ok(a.headline, "headline required");
  assert.ok(a.publisher, "publisher required");
  assert.ok(a.date || a.publishedAt, "date required");
  assert.ok(a.factualSummary, "factualSummary required");
  assert.ok(a.sourceUrl, "sourceUrl required");
  assert.ok(a.eventType, "eventType required");
  assert.ok(Array.isArray(a.affectedCountries));
  assert.ok(Array.isArray(a.affectedIndustries));
  assert.ok(Array.isArray(a.affectedCommodities));
  assert.ok(Array.isArray(a.citizenImpacts));
  assert.ok(a.timeHorizon);
  assert.ok(a.confidence);
  assert.ok(Array.isArray(a.likelyImpactPath));
  assert.ok(a.likelyImpactPath.length >= 3);
  for (const step of a.likelyImpactPath) {
    assert.ok(step.label);
    assert.ok(step.type);
    assert.ok(step.confidence);
    assert.ok(step.timeframe);
    assert.ok(step.explanation);
    assert.notEqual(step.confidence, "Observed", "predicted path hops must not be Observed");
  }
}

const withTake = data.articles.filter((a) => a.waypointsTake);
const withoutTake = data.articles.filter((a) => !a.waypointsTake);
assert.equal(withTake.length, 4);
assert.equal(withoutTake.length, 1);

// Production path must not be sample-demo
if (exists(prodPath)) {
  const prod = JSON.parse(read(prodPath));
  assert.notEqual(prod.mode, "sample-demo", "production articles must not be sample-demo");
  assert.ok(prod.mode === "live" || prod.mode === "live-empty", "production mode must be live*");
}

await import(pathToFileURL(path.join(root, loaderPath)).href);
await import(pathToFileURL(path.join(root, jsPath)).href);
const api = globalThis.WDS.globalSignals.articles;
const loader = globalThis.WDS.globalSignals.loader;

assert.equal(loader.isProductionMode("live"), true);
assert.equal(loader.isProductionMode("sample-demo"), false);
assert.equal(loader.gateDataset(data).ok, false);
assert.equal(loader.gateDataset(data, { allowFixture: true }).ok, true);

assert.equal(api.isSafeHttpUrl("https://example.invalid/x"), true);
assert.equal(api.isSafeHttpUrl("javascript:alert(1)"), false);

const full = api.normalizeArticle(data.articles[0]);
const card = api.renderCard(full);
assert.match(card, /gsa-card/);
assert.match(card, /Factual summary/);
assert.match(card, /href="https:\/\/example\.invalid\/sample\/canal-drought-notice"/);

const sparse = api.normalizeArticle({ id: "gsa_sparse" });
const sparseCard = api.renderCard(sparse);
assert.match(sparseCard, /Untitled brief/);
assert.doesNotMatch(sparseCard, /gsa-card__source" href=/);

const takeCard = api.renderCard(api.normalizeArticle(withTake[0]));
assert.match(takeCard, /Waypoint.s Take/);

const emptyTakeCard = api.renderCard(api.normalizeArticle(withoutTake[0]));
assert.match(emptyTakeCard, /gsa-card__take--empty/);

assert.equal(api.normalizeConfidence("Observed", { predicted: true }), "Unknown");
assert.equal(api.normalizeTimeHorizon("weeks"), "Weeks");

const detail = api.renderDetail(api.normalizeArticle(data.articles[0]));
assert.match(detail, /gsa-detail/);
assert.match(detail, /Likely impact path/);

// HTTP smoke with fixture allowFixture via direct JSON fetch; page uses production path
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  let rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\//, "");
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.join(root, rel);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  res.end(fs.readFileSync(file));
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

async function get(pathname) {
  const res = await fetch(`${base}${pathname}`);
  return { status: res.status, text: await res.text() };
}

const page = await get("/side-trails/global-signals/articles/");
assert.equal(page.status, 200);

const fixtureJson = await get("/data/global-signals/fixtures/articles/articles.json");
assert.equal(fixtureJson.status, 200);
assert.match(fixtureJson.text, /gsa_demo-canal-slots/);

const js = await get("/design-system/js/global-signals/wds-gs-articles.js");
assert.equal(js.status, 200);

const outdoor = read("articles/index.html");
assert.match(outdoor, /Waypoint Studio Articles|Articles — Waypoint Studio/);
assert.doesNotMatch(outdoor, /gsa-feed|global-signals\/articles\.json/);

server.close();
console.log("Global Signals Articles fixture + production-gate checks passed.");
