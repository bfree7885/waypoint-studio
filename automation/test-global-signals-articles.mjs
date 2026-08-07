#!/usr/bin/env node
/**
 * Global Signals Articles — Sprint 1 (Prompts 1–3).
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
const dataPath = "data/global-signals/articles/articles.json";

assert.ok(exists(htmlPath), "articles route missing");
assert.ok(exists(cssPath), "articles CSS missing");
assert.ok(exists(jsPath), "articles JS missing");
assert.ok(exists(dataPath), "articles data missing");

const html = read(htmlPath);
assert.match(html, /<title>Articles — Global Signals<\/title>/);
assert.match(html, /id="gsa-feed"/);
assert.match(html, /data-gsa-feed/);
assert.match(html, /Global Signals articles will appear here as verified sources are added\./);
assert.match(html, /href="\.\.\/"/);
assert.match(html, /Back to Global Signals/);
assert.match(html, /wds-gs-articles\.js/);
assert.match(html, /articles\.json/);
assert.doesNotMatch(html, /Coming soon/i);

const css = read(cssPath);
assert.match(css, /\.gsa-feed/);
assert.match(css, /\.gsa-card/);
assert.match(css, /@media \(max-width:\s*40rem\)/);

const data = JSON.parse(read(dataPath));
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
  assert.equal(a.confidence, undefined);
  assert.equal(a.impactPath, undefined);
}

const withTake = data.articles.filter((a) => a.waypointsTake);
const withoutTake = data.articles.filter((a) => !a.waypointsTake);
assert.equal(withTake.length, 4);
assert.equal(withoutTake.length, 1);
for (const a of withTake) {
  const body = [a.waypointsTake.whyItMatters, a.waypointsTake.analysis].filter(Boolean).join(" ");
  assert.ok(body.length > 40, "take should have substance");
  assert.notEqual(body.trim(), a.factualSummary.trim(), "take must not restate summary");
}


// Unit: card renderer + missing fields + source links
await import(pathToFileURL(path.join(root, jsPath)).href);
const api = globalThis.WDS.globalSignals.articles;
assert.equal(api.isSafeHttpUrl("https://example.invalid/x"), true);
assert.equal(api.isSafeHttpUrl("javascript:alert(1)"), false);
assert.equal(api.isSafeHttpUrl(null), false);

const full = api.normalizeArticle(data.articles[0]);
const card = api.renderCard(full);
assert.match(card, /gsa-card/);
assert.match(card, /Factual summary/);
assert.match(card, /href="https:\/\/example\.invalid\/sample\/canal-drought-notice"/);
assert.match(card, /rel="noopener noreferrer"/);

const sparse = api.normalizeArticle({ id: "gsa_sparse" });
const sparseCard = api.renderCard(sparse);
assert.match(sparseCard, /Untitled brief/);
assert.match(sparseCard, /Publisher unavailable/);
assert.match(sparseCard, /Factual summary unavailable/);
assert.match(sparseCard, /Event type unavailable/);
assert.match(sparseCard, /Date unavailable/);
assert.doesNotMatch(sparseCard, /href="/);

// Waypoint's Take rendering
const takeCard = api.renderCard(api.normalizeArticle(withTake[0]));
assert.match(takeCard, /gsa-card__facts/);
assert.match(takeCard, /gsa-card__take/);
assert.match(takeCard, /Waypoint.s Take/);
assert.match(takeCard, /Analysis · interpretation, not established fact/);
assert.match(takeCard, /Observed \/ reported facts from sources/);

const emptyTakeCard = api.renderCard(api.normalizeArticle(withoutTake[0]));
assert.match(emptyTakeCard, /gsa-card__take--empty/);
assert.match(emptyTakeCard, /We will not invent one/);

const missingTake = api.renderTake(null);
assert.match(missingTake, /gsa-card__take--empty/);

// HTTP smoke
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
const json = await get("/data/global-signals/articles/articles.json");
assert.equal(json.status, 200);
assert.match(json.text, /gsa_demo-canal-slots/);
const js = await get("/design-system/js/global-signals/wds-gs-articles.js");
assert.equal(js.status, 200);
const cssRes = await get("/design-system/css/wds-global-signals-articles.css");
assert.equal(cssRes.status, 200);

server.close();
console.log("Global Signals Articles Prompt 3 (Waypoint\u2019s Take) checks passed.");
