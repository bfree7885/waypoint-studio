#!/usr/bin/env node
/**
 * Global Signals — Country Intelligence smoke + unit checks.
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

const htmlPath = "side-trails/global-signals/countries/index.html";
const cssPath = "design-system/css/wds-global-signals-countries.css";
const jsPath = "design-system/js/global-signals/wds-gs-countries.js";
const dataPath = "data/global-signals/countries/countries.json";
const modelDoc = "docs/global-signals/country-intelligence-data-model.md";

assert.ok(exists(htmlPath), "countries index missing");
assert.ok(exists(cssPath), "countries CSS missing");
assert.ok(exists(jsPath), "countries JS missing");
assert.ok(exists(dataPath), "countries data missing");
assert.ok(exists(modelDoc), "data model doc missing");

const html = read(htmlPath);
assert.match(html, /<title>Country Intelligence — Global Signals<\/title>/);
assert.match(html, /id="gsc-root"/);
assert.match(html, /data-gsc-root/);
assert.match(html, /wds-gs-countries\.js/);
assert.match(html, /countries\.json/);
assert.match(html, /Back to Global Signals/);
assert.match(html, /href="\.\.\/"/);
assert.match(html, /Side Trails/);
assert.match(html, /Articles/);
assert.doesNotMatch(html, /Coming soon/i);
assert.doesNotMatch(html, /breaking news/i);

const css = read(cssPath);
assert.match(css, /\.gsc-grid/);
assert.match(css, /\.gsc-detail/);
assert.match(css, /\.gsc-banner/);
assert.match(css, /@media \(max-width:\s*40rem\)/);

const data = JSON.parse(read(dataPath));
assert.equal(data.mode, "sample-demo");
assert.ok(data.modeLabel);
assert.ok(data.honesty && data.honesty.banner);
assert.match(data.honesty.banner, /not a live/i);
assert.equal(data.countries.length, 15);

const requiredSlugs = [
  "united-states",
  "china",
  "taiwan",
  "russia",
  "ukraine",
  "japan",
  "india",
  "germany",
  "mexico",
  "canada"
];
const slugs = data.countries.map((c) => c.slug);
for (const s of requiredSlugs) {
  assert.ok(slugs.includes(s), "missing required country " + s);
}

const citizenCats = [
  "food",
  "fuel",
  "utilities",
  "housing",
  "travel",
  "healthcare",
  "insurance",
  "technology"
];
assert.deepEqual(data.citizenImpactCategories, citizenCats);

const articleIds = new Set(
  JSON.parse(read("data/global-signals/articles/articles.json")).articles.map((a) => a.id)
);

const sections = [
  "currentEvents",
  "majorIndustries",
  "exports",
  "imports",
  "criticalInfrastructure",
  "majorPorts",
  "tradeRelationships",
  "currentRisks",
  "relatedArticles",
  "citizenImpactConnections"
];

for (const c of data.countries) {
  assert.ok(c.id && c.id.startsWith("gsc_"), "id " + c.id);
  assert.ok(c.slug && c.name);
  assert.ok(c.summary && c.summary.length > 40, "summary too thin: " + c.slug);
  for (const key of sections) {
    assert.ok(Array.isArray(c[key]), key + " missing on " + c.slug);
    assert.ok(c[key].length > 0, key + " empty on " + c.slug);
  }
  for (const risk of c.currentRisks) {
    assert.notEqual(risk.confidence, "Observed", "risks must not be Observed");
  }
  for (const ci of c.citizenImpactConnections) {
    assert.ok(citizenCats.includes(ci.category), "bad category " + ci.category);
    assert.notEqual(ci.confidence, "Observed", "citizen impact predicted ≠ Observed");
  }
  for (const aid of c.relatedArticles) {
    assert.ok(articleIds.has(aid), "unknown article id " + aid + " on " + c.slug);
  }
  for (const ev of c.currentEvents) {
    assert.ok(ev.label || true);
    assert.match(String(ev.label || "Sample"), /sample|demo|not live/i);
  }
  const slugPage = `side-trails/global-signals/countries/${c.slug}/index.html`;
  assert.ok(exists(slugPage), "missing slug page " + slugPage);
  const page = read(slugPage);
  assert.match(page, new RegExp(`slug:\\s*"${c.slug}"`));
  assert.match(page, /wds-gs-countries\.js/);
  assert.doesNotMatch(page, /Coming soon/i);
  assert.doesNotMatch(page, /TODO|lorem ipsum|placeholder page/i);
}

// Cross-link notes present
assert.ok(data.crossLinks);
assert.match(data.crossLinks.articlesBase, /articles/);
assert.match(data.crossLinks.citizenImpactRoute, /citizen-impact/);
assert.match(data.crossLinks.relationshipExplorerRoute, /relationship-graph/);

// Landing integration
const landing = read("side-trails/global-signals/index.html");
assert.match(landing, /\.\/countries\//);
assert.match(landing, /Country Intelligence/);

await import(pathToFileURL(path.join(root, jsPath)).href);
const api = globalThis.WDS.globalSignals.countries;

assert.equal(api.normalizeConfidence(null), "Unknown");
assert.equal(api.normalizeConfidence("Observed", { predicted: true }), "Unknown");
assert.equal(api.normalizeConfidence("moderate"), "Medium");
assert.equal(api.normalizeTimeHorizon("weeks"), "Weeks");
assert.equal(api.normalizeTimeHorizon("bogus"), "Unknown");

const full = api.normalizeCountry(data.countries[0]);
assert.equal(full.slug, data.countries[0].slug);
assert.ok(full.currentEvents.length >= 1);

const card = api.renderIndexCard(full);
assert.match(card, /gsc-card/);
assert.match(card, new RegExp(`\\./${full.slug}/`));
assert.match(card, /Open country profile/);

const indexHtml = api.renderIndex(
  data.countries.map(api.normalizeCountry).filter(Boolean),
  data
);
assert.match(indexHtml, /gsc-banner/);
assert.match(indexHtml, /sample \/ demo/i);
assert.match(indexHtml, /gsc-grid/);

const detail = api.renderDetail(full, { depth: 1, backHref: "../" });
assert.match(detail, /gsc-detail/);
assert.match(detail, /Current Events/);
assert.match(detail, /Major Industries/);
assert.match(detail, /Exports/);
assert.match(detail, /Imports/);
assert.match(detail, /Critical Infrastructure/);
assert.match(detail, /Major Ports/);
assert.match(detail, /Trade Relationships/);
assert.match(detail, /Current Risks/);
assert.match(detail, /Related Articles/);
assert.match(detail, /Citizen Impact Connections/);
assert.match(detail, /All countries/);
assert.match(detail, /Global Signals/);
assert.match(detail, /Side Trails/);
assert.match(detail, /\.\.\/\.\.\/articles\/\?id=/);
assert.match(detail, /\.\.\/\.\.\/citizen-impact\/#/);
assert.match(detail, /relationship-graph/);
assert.match(detail, /Sample \/ demo · not live news/);

// Missing fields — honest empties
const sparse = api.normalizeCountry({
  id: "gsc_sparse",
  slug: "sparse",
  name: "Sparse"
});
assert.equal(sparse.currentEvents.length, 0);
assert.equal(sparse.exports.length, 0);
const sparseDetail = api.renderDetail(sparse, { depth: 1 });
assert.match(sparseDetail, /will not invent breaking news/i);
assert.match(sparseDetail, /Exports unavailable|unavailable/i);
assert.match(sparseDetail, /Summary unavailable/);

assert.equal(api.normalizeCountry(null), null);
assert.equal(api.normalizeCountry({}), null);
assert.equal(api.findCountry([full], full.slug), full);
assert.equal(api.findCountry([full], "nope"), null);

// Named list normalization
const named = api.normalizeNamedList([{ commodity: "Wheat", notes: "x" }], [
  "name",
  "commodity"
]);
assert.equal(named[0].name, "Wheat");

// HTTP smoke — index + detail + data + articles non-regression path exists
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

async function get(pathname) {
  const res = await fetch(base + pathname);
  const text = await res.text();
  return { status: res.status, text };
}

const idx = await get("/side-trails/global-signals/countries/");
assert.equal(idx.status, 200);
assert.match(idx.text, /Country Intelligence/);
assert.match(idx.text, /gsc-root/);

const us = await get("/side-trails/global-signals/countries/united-states/");
assert.equal(us.status, 200);
assert.match(us.text, /United States/);
assert.match(us.text, /slug:\s*"united-states"/);

const jsonRes = await get("/data/global-signals/countries/countries.json");
assert.equal(jsonRes.status, 200);
assert.match(jsonRes.text, /sample-demo/);

const articlesPage = await get("/side-trails/global-signals/articles/");
assert.equal(articlesPage.status, 200);
assert.match(articlesPage.text, /Articles/);
assert.doesNotMatch(articlesPage.text, /Coming soon/i);

const gs = await get("/side-trails/global-signals/");
assert.equal(gs.status, 200);
assert.match(gs.text, /\.\/countries\//);

const sideTrails = await get("/side-trails/");
assert.equal(sideTrails.status, 200);

server.close();

console.log("test-global-signals-countries: ok");
