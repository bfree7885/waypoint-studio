#!/usr/bin/env node
/**
 * Global Signals — Industry Intelligence.
 * Covers index, detail, missing fields, nav, interconnect, Articles non-regression.
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

const REQUIRED_SLUGS = [
  "semiconductors",
  "energy",
  "agriculture",
  "food",
  "transportation",
  "shipping",
  "healthcare",
  "automotive",
  "construction",
  "retail",
  "technology"
];

const indexHtml = "side-trails/global-signals/industries/index.html";
const cssPath = "design-system/css/wds-global-signals-industries.css";
const jsPath = "design-system/js/global-signals/wds-gs-industries.js";
const dataPath = "data/global-signals/industries/industries.json";
const dataModelPath = "docs/global-signals/industry-intelligence-data-model.md";
const ownerReviewPath = "docs/global-signals/industry-intelligence-owner-review.md";

assert.ok(exists(indexHtml), "industries index missing");
assert.ok(exists(cssPath), "industries CSS missing");
assert.ok(exists(jsPath), "industries JS missing");
assert.ok(exists(dataPath), "industries data missing");
assert.ok(exists(dataModelPath), "data model doc missing");
assert.ok(exists(ownerReviewPath), "owner review missing");

for (const slug of REQUIRED_SLUGS) {
  assert.ok(
    exists(`side-trails/global-signals/industries/${slug}/index.html`),
    `detail page missing: ${slug}`
  );
}

const html = read(indexHtml);
assert.match(html, /<title>Industry Intelligence — Global Signals<\/title>/);
assert.match(html, /id="gsi-index"/);
assert.match(html, /data-gsi-index/);
assert.match(html, /wds-gs-industries\.js/);
assert.match(html, /industries\.json/);
assert.match(html, /Back to Global Signals/);
assert.doesNotMatch(html, /Coming soon/i);
assert.doesNotMatch(html, /placeholder industry/i);

const css = read(cssPath);
assert.match(css, /\.gsi-grid/);
assert.match(css, /\.gsi-detail/);
assert.match(css, /\.gsi-take/);
assert.match(css, /@media \(max-width:\s*40rem\)/);
assert.match(css, /prefers-reduced-motion/);

const data = JSON.parse(read(dataPath));
assert.equal(data.mode, "curated-baseline");
assert.ok(data.honesty && data.honesty.banner);
assert.ok(data.crossLinks);
assert.equal(data.industries.length, 11);

const bySlug = new Map();
const byId = new Map();
for (const raw of data.industries) {
  assert.ok(raw.id && raw.id.startsWith("gsi_"), "stable gsi_* id");
  assert.ok(raw.slug);
  assert.ok(raw.name);
  assert.ok(raw.whatIsHappening && raw.whatIsHappening.text);
  assert.ok(raw.why && raw.why.text);
  assert.ok(Array.isArray(raw.threats) && raw.threats.length >= 2);
  assert.ok(Array.isArray(raw.opportunities) && raw.opportunities.length >= 2);
  assert.ok(Array.isArray(raw.majorCountries) && raw.majorCountries.length >= 4);
  assert.ok(raw.supplyChain && Array.isArray(raw.supplyChain.nodes) && raw.supplyChain.nodes.length >= 4);
  assert.ok(Array.isArray(raw.relatedArticles) && raw.relatedArticles.length >= 1);
  assert.ok(raw.waypointsTake && raw.waypointsTake.analysis);
  assert.ok(Array.isArray(raw.citizenImpacts) && raw.citizenImpacts.length >= 2);
  assert.ok(Array.isArray(raw.topDependencies) && raw.topDependencies.length >= 3);
  assert.notEqual(
    String(raw.waypointsTake.analysis).trim(),
    String(raw.whatIsHappening.text).trim(),
    "Take must not restate what-is-happening"
  );
  for (const t of raw.threats) {
    assert.notEqual(t.confidence, "Observed", "threats are predictive");
  }
  for (const o of raw.opportunities) {
    assert.notEqual(o.confidence, "Observed", "opportunities are predictive");
  }
  for (const c of raw.citizenImpacts) {
    assert.notEqual(c.confidence, "Observed", "citizen impacts predictive");
    assert.ok(c.id && c.id.startsWith("gsci_"), "citizen impact stable id");
  }
  for (const c of raw.majorCountries) {
    assert.ok(c.id && c.id.startsWith("gsc_"), "country stable id");
    assert.ok(c.slug);
  }
  for (const a of raw.relatedArticles) {
    assert.ok(a.id && a.id.startsWith("gsa_"));
  }
  bySlug.set(raw.slug, raw);
  byId.set(raw.id, raw);
}

for (const slug of REQUIRED_SLUGS) {
  assert.ok(bySlug.has(slug), `missing industry slug ${slug}`);
}

// Interconnect: every industry links to at least one other known industry
for (const raw of data.industries) {
  const deps = raw.topDependencies || [];
  const related = raw.relatedIndustries || [];
  const linked = new Set([
    ...deps.map((d) => d.industryId).filter(Boolean),
    ...related
  ]);
  assert.ok(linked.size >= 2, `${raw.slug} should interconnect`);
  for (const id of linked) {
    assert.ok(byId.has(id), `unknown industry link ${id} from ${raw.slug}`);
  }
}

// Taxonomy map covers Articles labels used in sample set
const map = data.taxonomies.articleIndustryLabelMap;
assert.equal(map.Energy, "gsi_energy");
assert.equal(map.Retail, "gsi_retail");
assert.equal(map.Logistics, "gsi_shipping");
assert.equal(map.Food, "gsi_food");
assert.equal(map.Agriculture, "gsi_agriculture");
assert.equal(map.Automotive, "gsi_automotive");
assert.equal(map.Construction, "gsi_construction");
assert.equal(map.Transportation, "gsi_transportation");

// Landing nav
const landing = read("side-trails/global-signals/index.html");
assert.match(landing, /\.\/industries\//);
assert.match(landing, /Industry Intelligence/);

// Detail page shells
for (const slug of REQUIRED_SLUGS) {
  const page = read(`side-trails/global-signals/industries/${slug}/index.html`);
  assert.match(page, new RegExp(`data-gsi-slug="${slug}"`));
  assert.match(page, /wds-gs-industries\.js/);
  assert.match(page, /industries\.json/);
  assert.match(page, /All industries/);
  assert.doesNotMatch(page, /Coming soon/i);
  assert.doesNotMatch(page, /TODO|lorem ipsum/i);
}

// Unit: renderer + missing fields
await import(pathToFileURL(path.join(root, jsPath)).href);
const api = globalThis.WDS.globalSignals.industries;
assert.equal(api.normalizeConfidence(null), "Unknown");
assert.equal(api.normalizeConfidence("Observed", { predicted: true }), "Unknown");
assert.equal(api.normalizeConfidence("moderate"), "Medium");
assert.equal(api.normalizeTimeHorizon("weeks"), "Weeks");
assert.equal(api.normalizeTimeHorizon("bogus"), "Unknown");

const full = api.normalizeIndustry(data.industries[0]);
assert.ok(full);
assert.ok(full.threats.length >= 2);

const indexHtmlOut = api.renderIndex(data);
assert.match(indexHtmlOut, /gsi-banner/);
assert.match(indexHtmlOut, /Curated baseline/);
assert.match(indexHtmlOut, /Semiconductors/);
assert.match(indexHtmlOut, /Energy/);
assert.match(indexHtmlOut, /href="\.\/shipping\/"/);
assert.match(indexHtmlOut, /Explore connections/);
assert.match(indexHtmlOut, /href="\.\.\/articles\/"/);

const byIdNorm = {};
for (const ind of data.industries.map(api.normalizeIndustry)) {
  byIdNorm[ind.id] = ind;
}
const detail = api.renderDetail(full, data, byIdNorm);
assert.match(detail, /What is happening/);
assert.match(detail, /Why\?/);
assert.match(detail, /Current threats/);
assert.match(detail, /Current opportunities/);
assert.match(detail, /Major countries involved/);
assert.match(detail, /Supply chain/);
assert.match(detail, /Related articles/);
assert.match(detail, /Waypoint.s Take/);
assert.match(detail, /Analysis · interpretation, not established fact/);
assert.match(detail, /Citizen impacts/);
assert.match(detail, /Top dependencies/);
assert.match(detail, /data-entity="article"/);
assert.match(detail, /data-entity="country"/);
assert.match(detail, /data-entity="citizen-impact"/);
assert.match(detail, /data-entity="industry"/);
assert.match(detail, /href="\.\.\/\.\.\/articles\/"/);
assert.match(detail, /href="\.\.\/\.\.\/citizen-impact\/"/);
assert.match(detail, /relationship-graph/);

// Missing fields honesty
const sparse = api.normalizeIndustry({ id: "gsi_sparse", slug: "sparse", name: "Sparse" });
const sparseDetail = api.renderDetail(sparse, { honesty: data.honesty, modeLabel: data.modeLabel, crossLinks: data.crossLinks }, {});
assert.match(sparseDetail, /What-is-happening unavailable|unavailable/i);
assert.match(sparseDetail, /Threats not tagged|not tagged/i);
assert.match(sparseDetail, /gsi-take--empty|will not invent/i);
assert.match(sparseDetail, /Countries not tagged|not tagged/i);

const emptyTake = api.renderTake(null);
assert.match(emptyTake, /will not invent/i);

assert.equal(api.normalizeIndustry(null), null);
assert.equal(api.normalizeIndustry({}), null);

// Empty index
const emptyIndex = api.renderIndex({ industries: [], honesty: data.honesty, modeLabel: data.modeLabel });
assert.match(emptyIndex, /will not invent|when curated baselines/i);

// HTTP smoke — index + one detail + articles non-regression
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
  const text = await res.text();
  return { status: res.status, text };
}

const idx = await get("/side-trails/global-signals/industries/");
assert.equal(idx.status, 200);
assert.match(idx.text, /Industry Intelligence/);

const semi = await get("/side-trails/global-signals/industries/semiconductors/");
assert.equal(semi.status, 200);
assert.match(semi.text, /data-gsi-slug="semiconductors"/);

const ship = await get("/side-trails/global-signals/industries/shipping/");
assert.equal(ship.status, 200);

const jsonRes = await get("/data/global-signals/industries/industries.json");
assert.equal(jsonRes.status, 200);
assert.match(jsonRes.text, /gsi_semiconductors/);

// Articles non-regression
const articlesPage = await get("/side-trails/global-signals/articles/");
assert.equal(articlesPage.status, 200);
assert.match(articlesPage.text, /gsa-feed/);
assert.match(articlesPage.text, /wds-gs-articles\.js/);
assert.doesNotMatch(articlesPage.text, /Coming soon/i);

const articlesData = await get("/data/global-signals/articles/articles.json");
assert.equal(articlesData.status, 200);
const articlesJson = JSON.parse(articlesData.text);
assert.equal(articlesJson.articles.length, 5);

server.close();

// Run articles suite for non-regression
const { spawnSync } = await import("node:child_process");
const articlesTest = spawnSync(process.execPath, ["automation/test-global-signals-articles.mjs"], {
  cwd: root,
  encoding: "utf8"
});
assert.equal(articlesTest.status, 0, articlesTest.stdout + articlesTest.stderr);

const foundation = spawnSync(process.execPath, ["automation/test-global-signals.mjs"], {
  cwd: root,
  encoding: "utf8"
});
assert.equal(foundation.status, 0, foundation.stdout + foundation.stderr);

console.log("Global Signals Industry Intelligence checks passed.");
