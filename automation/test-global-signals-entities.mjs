#!/usr/bin/env node
/**
 * Global Signals — Entity System.
 * Shared shell sections across types, honest empties, graph focus links,
 * module aliases, Articles non-regression.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

const REQUIRED_TYPES = [
  "country",
  "industry",
  "article",
  "citizen-impact",
  "port",
  "company",
  "commodity",
  "policy",
  "conflict",
  "tariff",
  "weather"
];

const REQUIRED_SECTIONS = [
  "gse-overview",
  "gse-waypoints-take",
  "gse-relationship-graph",
  "gse-related-articles",
  "gse-dependencies",
  "gse-dependent-entities",
  "gse-current-risks",
  "gse-time-horizon",
  "gse-confidence"
];

const indexHtml = "side-trails/global-signals/entities/index.html";
const cssPath = "design-system/css/wds-global-signals-entities.css";
const jsPath = "design-system/js/global-signals/wds-gs-entities.js";
const dataPath = "data/global-signals/entities/entities.json";
const dataModelPath = "docs/global-signals/entity-system-data-model.md";
const ownerReviewPath = "docs/global-signals/entity-system-owner-review.md";

assert.ok(exists(indexHtml), "entities index missing");
assert.ok(exists(cssPath), "entities CSS missing");
assert.ok(exists(jsPath), "entities JS missing");
assert.ok(exists(dataPath), "entities data missing");
assert.ok(exists(dataModelPath), "data model doc missing");
assert.ok(exists(ownerReviewPath), "owner review missing");

const html = read(indexHtml);
assert.match(html, /Entity System/);
assert.match(html, /id="gse-root"/);
assert.match(html, /data-gse-root/);
assert.match(html, /wds-gs-entities\.js/);
assert.match(html, /entities\.json/);
assert.doesNotMatch(html, /Coming soon/i);

const css = read(cssPath);
assert.match(css, /\.gse-detail/);
assert.match(css, /\.gse-section/);
assert.match(css, /\.gse-take/);
assert.match(css, /\.gse-graph-panel/);
assert.match(css, /@media \(max-width:\s*40rem\)/);
assert.match(css, /prefers-reduced-motion/);

const data = JSON.parse(read(dataPath));
assert.equal(data.mode, "sample-demo");
assert.ok(data.honesty && data.honesty.banner);
assert.ok(Array.isArray(data.sectionOrder));
for (const s of [
  "overview",
  "waypoints-take",
  "relationship-graph",
  "related-articles",
  "dependencies",
  "dependent-entities",
  "current-risks",
  "time-horizon",
  "confidence"
]) {
  assert.ok(data.sectionOrder.includes(s), "missing sectionOrder " + s);
}

for (const t of REQUIRED_TYPES) {
  assert.ok((data.counts[t] || 0) >= 1, "need at least one entity of type " + t);
  assert.ok(exists(`side-trails/global-signals/entities/${t}/index.html`), "type index " + t);
}

assert.ok(data.counts.country >= 15);
assert.ok(data.counts.industry >= 11);
assert.ok(data.counts.article >= 5);
assert.ok(data.counts["citizen-impact"] >= 8);

const byTypeSlug = new Map();
for (const e of data.entities) {
  assert.ok(e.id && e.type && e.slug && e.name);
  byTypeSlug.set(`${e.type}::${e.slug}`, e);
  assert.ok(exists(`side-trails/global-signals/entities/${e.type}/${e.slug}/index.html`));
  const page = read(`side-trails/global-signals/entities/${e.type}/${e.slug}/index.html`);
  assert.match(page, /wds-gs-entities\.js/);
  assert.match(page, new RegExp(`data-gse-type="${e.type}"`));
  assert.match(page, new RegExp(`data-gse-slug="${e.slug}"`));
}

// Seeded interconnect samples
assert.ok(byTypeSlug.get("country::taiwan"));
assert.ok(byTypeSlug.get("industry::semiconductors"));
assert.ok(byTypeSlug.get("article::demo-canal-slots"));
assert.ok(byTypeSlug.get("citizen-impact::food"));
const taiwan = byTypeSlug.get("country::taiwan");
assert.ok(taiwan.relationshipGraph?.entityId === "gsn_taiwan" || taiwan.id === "gsn_taiwan");
assert.match(String(taiwan.relationshipGraph?.href || ""), /focus=gsn_taiwan|entity=gsn_taiwan/);

// Module aliases use shared shell
const countryAlias = read("side-trails/global-signals/countries/taiwan/index.html");
assert.match(countryAlias, /wds-gs-entities\.js/);
assert.match(countryAlias, /entities\/country\/taiwan/);
assert.match(countryAlias, /canonical" href="https:\/\/waypointstudio\.org\/side-trails\/global-signals\/entities\/country\/taiwan\//);

const industryAlias = read("side-trails/global-signals/industries/semiconductors/index.html");
assert.match(industryAlias, /wds-gs-entities\.js/);
assert.match(industryAlias, /data-gse-type="industry"/);

// Relationships accept ?focus=
const relJs = read("design-system/js/global-signals/wds-gs-relationships.js");
assert.match(relJs, /params\.get\("focus"\)/);
assert.match(relJs, /searchParams\.set\("focus"/);

// Unit: renderer sections + empty honesty
await import(pathToFileURL(path.join(root, jsPath)).href);
const api = globalThis.WDS.globalSignals.entities;
assert.ok(api);
assert.equal(api.normalizeConfidence(null), "Unknown");
assert.equal(api.normalizeConfidence("Observed", { predicted: true }), "Unknown");
assert.equal(api.normalizeTimeHorizon("weeks"), "Weeks");

const bundle = api.normalizeBundle(data);
assert.ok(bundle.entities.length >= 40);

const detail = api.renderDetail(bundle.byKey["country::taiwan"], bundle, 5);
for (const id of REQUIRED_SECTIONS) {
  assert.match(detail, new RegExp(`id="${id}"`));
}
assert.match(detail, /Waypoint.s Take/);
assert.match(detail, /Relationship Graph/);
assert.match(detail, /Dependent Entities/);
assert.match(detail, /Time Horizon/);
assert.match(detail, /Confidence/);
assert.match(detail, /focus=gsn_taiwan/);

const sparse = api.normalizeEntity({
  id: "gsn_sparse",
  type: "company",
  slug: "sparse",
  name: "Sparse Co"
});
const sparseHtml = api.renderDetail(sparse, bundle, 5);
assert.match(sparseHtml, /will not invent/i);
assert.match(sparseHtml, /No related articles tagged/i);
assert.match(sparseHtml, /No dependencies tagged/i);
assert.match(sparseHtml, /No dependent entities tagged/i);
assert.match(sparseHtml, /No current risks tagged/i);
for (const id of REQUIRED_SECTIONS) {
  assert.match(sparseHtml, new RegExp(`id="${id}"`));
}

const indexOut = api.renderIndex(bundle, null);
assert.match(indexOut, /Entity System/);
assert.match(indexOut, /Country/);
assert.match(indexOut, /Industry/);
assert.match(indexOut, /Article/);

// Landing link
const landing = read("side-trails/global-signals/index.html");
assert.match(landing, /\.\/entities\//);
assert.match(landing, /Entity System/);

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
  fs.createReadStream(file).pipe(res);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

async function get(urlPath) {
  const res = await fetch(base + urlPath);
  return { status: res.status, text: await res.text() };
}

const idx = await get("/side-trails/global-signals/entities/");
assert.equal(idx.status, 200);
assert.match(idx.text, /gse-root/);

const tw = await get("/side-trails/global-signals/entities/country/taiwan/");
assert.equal(tw.status, 200);
assert.match(tw.text, /wds-gs-entities\.js/);

const alias = await get("/side-trails/global-signals/countries/taiwan/");
assert.equal(alias.status, 200);
assert.match(alias.text, /wds-gs-entities\.js/);

const entJson = await get("/data/global-signals/entities/entities.json");
assert.equal(entJson.status, 200);

const relPage = await get("/side-trails/global-signals/relationships/?focus=gsn_taiwan");
assert.equal(relPage.status, 200);
assert.match(relPage.text, /gsr-app|Relationship Explorer/);

// Articles non-regression
const articlesPage = await get("/side-trails/global-signals/articles/");
assert.equal(articlesPage.status, 200);
assert.match(articlesPage.text, /gsa-feed/);
assert.match(articlesPage.text, /wds-gs-articles\.js/);
assert.doesNotMatch(articlesPage.text, /Coming soon/i);
const articlesData = await get("/data/global-signals/articles/articles.json");
assert.equal(articlesData.status, 200);
assert.equal(JSON.parse(articlesData.text).articles.length, 5);

server.close();
console.log("test-global-signals-entities: ok");
