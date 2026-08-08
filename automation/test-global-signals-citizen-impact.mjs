#!/usr/bin/env node
/**
 * Global Signals Citizen Impact — sections, confidence, nav, Side Trails integration.
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

const htmlPath = "side-trails/global-signals/citizen-impact/index.html";
const cssPath = "design-system/css/wds-global-signals-citizen-impact.css";
const jsPath = "design-system/js/global-signals/wds-gs-citizen-impact.js";
const dataPath = "data/global-signals/citizen-impact/citizen-impact.json";

assert.ok(exists(htmlPath), "citizen-impact route missing");
assert.ok(exists(cssPath), "citizen-impact CSS missing");
assert.ok(exists(jsPath), "citizen-impact JS missing");
assert.ok(exists(dataPath), "citizen-impact data missing");

const html = read(htmlPath);
assert.match(html, /<title>Citizen Impact — Global Signals<\/title>/);
assert.match(html, /id="gsc-board"/);
assert.match(html, /data-gsc-board/);
assert.match(html, /wds-gs-citizen-impact\.js/);
assert.match(html, /citizen-impact\.json/);
assert.match(html, /Back to Global Signals/);
assert.match(html, /href="\.\.\/"/);
assert.match(html, /href="\.\.\/\.\.\//);
assert.match(html, /Side Trails/);
assert.match(html, /href="\.\.\/articles\/"/);
assert.doesNotMatch(html, /Coming soon/i);

const css = read(cssPath);
assert.match(css, /\.gsc-board/);
assert.match(css, /\.gsc-section/);
assert.match(css, /\.gsc-statement/);
assert.match(css, /@media \(max-width:\s*40rem\)/);

const data = JSON.parse(read(dataPath));
assert.equal(data.mode, "sample-demo");
assert.ok(data.honesty && data.honesty.banner);
assert.deepEqual(data.sectionOrder, [
  "food",
  "fuel",
  "utilities",
  "housing",
  "travel",
  "healthcare",
  "insurance",
  "technology"
]);
assert.equal(data.sections.length, 8);

const REQUIRED = [
  "food",
  "fuel",
  "utilities",
  "housing",
  "travel",
  "healthcare",
  "insurance",
  "technology"
];
const sectionIds = data.sections.map((s) => s.id);
assert.deepEqual(sectionIds, REQUIRED);

for (const section of data.sections) {
  assert.ok(section.label, "section label required");
  assert.ok(Array.isArray(section.statements), "statements array required");
  assert.ok(section.statements.length >= 1, "each section needs ≥1 demo statement");
  for (const st of section.statements) {
    assert.ok(st.id && String(st.id).startsWith("gsc_"), "statement id gsc_*");
    assert.ok(st.whatChanged, "whatChanged required");
    assert.ok(st.why, "why required");
    assert.ok(st.causedBy, "causedBy required");
    assert.ok(st.confidence, "confidence required");
    assert.ok(st.timeHorizon, "timeHorizon required");
    assert.ok(Array.isArray(st.entityIds) && st.entityIds.length, "entityIds required");
    assert.ok(Array.isArray(st.evidence) && st.evidence.length, "evidence required");
    assert.ok(Array.isArray(st.causeChain) && st.causeChain.length >= 3, "causeChain ≥3");
    // Statement-level confidence is an impact claim → never Observed in demo data
    assert.notEqual(st.confidence, "Observed", "impact statements must not be Observed");
    for (const step of st.causeChain) {
      assert.ok(step.label);
      assert.ok(step.type);
      assert.ok(step.confidence);
      assert.ok(step.timeframe);
      assert.ok(step.explanation);
      assert.ok(step.entityId && String(step.entityId).startsWith("gsn_"));
      assert.notEqual(step.confidence, "Observed", "predicted chain hops must not be Observed");
    }
    for (const ev of st.evidence) {
      assert.ok(ev.id);
      assert.ok(ev.label);
      assert.ok(ev.url);
      assert.match(ev.url, /^https:\/\/example\.invalid\//);
    }
  }
}

const entityIds = new Set((data.entities || []).map((e) => e.id));
for (const section of data.sections) {
  for (const st of section.statements) {
    for (const id of st.entityIds) {
      assert.ok(entityIds.has(id), "entity id registered: " + id);
    }
  }
}

// Unit: renderer + missing fields + confidence
await import(pathToFileURL(path.join(root, jsPath)).href);
const api = globalThis.WDS.globalSignals.citizenImpact;
assert.ok(api);
assert.deepEqual(api.REQUIRED_SECTIONS, REQUIRED);

assert.equal(api.normalizeConfidence(null), "Unknown");
assert.equal(api.normalizeConfidence(""), "Unknown");
assert.equal(api.normalizeConfidence("moderate"), "Medium");
assert.equal(api.normalizeConfidence("Observed"), "Observed");
assert.equal(api.normalizeConfidence("Observed", { predicted: true }), "Unknown");
assert.equal(api.normalizeConfidence("nope"), "Unknown");
assert.equal(api.normalizeTimeHorizon("weeks"), "Weeks");
assert.equal(api.normalizeTimeHorizon("long term"), "Long-term");
assert.equal(api.normalizeTimeHorizon("bogus"), "Unknown");

assert.equal(api.isSafeHttpUrl("https://example.invalid/x"), true);
assert.equal(api.isSafeHttpUrl("javascript:alert(1)"), false);

const bundle = api.normalizeBundle(data);
assert.equal(bundle.sections.length, 8);
assert.equal(bundle.mode, "sample-demo");

const foodHtml = api.renderSection(bundle.sections[0], bundle.entities);
assert.match(foodHtml, /data-gsc-section="food"/);
assert.match(foodHtml, /What changed\?/);
assert.match(foodHtml, /Why\?/);
assert.match(foodHtml, /What caused it\?/);
assert.match(foodHtml, /How confident are we\?/);
assert.match(foodHtml, /Expected time horizon/);
assert.match(foodHtml, /gsc_demo-food-port-perishables/);
assert.match(foodHtml, /gsn_port_complex|gsn_household_food/);

for (const section of bundle.sections) {
  const htmlSec = api.renderSection(section, bundle.entities);
  assert.match(htmlSec, new RegExp(`data-gsc-section="${section.id}"`));
  assert.match(htmlSec, /What changed\?/);
  assert.match(htmlSec, /Cause chain/);
  assert.match(htmlSec, /Evidence/);
}

// Missing fields render honest empties
const sparse = api.normalizeStatement({ id: "gsc_sparse" });
const sparseHtml = api.renderStatement(sparse, {});
assert.match(sparseHtml, /What changed is unavailable/);
assert.match(sparseHtml, /Why is unavailable/);
assert.match(sparseHtml, /Cause summary unavailable/);
assert.match(sparseHtml, /Evidence not tagged/);
assert.match(sparseHtml, /No entity ids tagged/);
assert.match(sparseHtml, /Cause chain not tagged/);
assert.match(sparseHtml, /Confidence · Unknown/);
assert.match(sparseHtml, /Horizon · Unknown/);

// Malformed chain: Observed coerced on predicted hops
const malformed = api.normalizeStatement({
  id: "gsc_bad",
  confidence: "Observed",
  timeHorizon: "whenever",
  causeChain: [
    {
      entityId: "gsn_steel",
      label: "X",
      type: "citizen-impact",
      confidence: "Observed",
      timeframe: "days",
      explanation: "y"
    },
    { label: "", type: "event" },
    null
  ]
});
assert.equal(malformed.confidence, "Unknown"); // predicted statement surface
assert.equal(malformed.timeHorizon, "Unknown");
assert.equal(malformed.causeChain.length, 1);
assert.equal(malformed.causeChain[0].confidence, "Unknown");

assert.equal(api.normalizeStatement(null), null);
assert.equal(api.normalizeSection(null), null);

const banner = api.renderBanner(bundle);
assert.match(banner, /Sample \/ demo/);
assert.match(banner, /not a live citizen-impact feed/i);

// Landing + Side Trails integration
const landing = read("side-trails/global-signals/index.html");
assert.match(landing, /\.\/citizen-impact\//);
assert.match(landing, /Citizen Impact/);
assert.match(landing, /sample\/demo literacy shell/i);

const sideTrails = read("side-trails/index.html");
assert.match(sideTrails, /global-signals|Global Signals/i);

const catalog = JSON.parse(read("data/side-trails/catalog.json"));
const gs = catalog.projects.find((p) => p.id === "global-signals");
assert.ok(gs);
assert.equal(gs.url, "side-trails/global-signals/");

// No Articles regression
const articlesHtml = read("side-trails/global-signals/articles/index.html");
assert.match(articlesHtml, /gsa-feed/);
assert.match(articlesHtml, /wds-gs-articles\.js/);
assert.ok(exists("data/global-signals/articles/articles.json"));
assert.ok(exists("design-system/js/global-signals/wds-gs-articles.js"));

const outdoor = read("articles/index.html");
assert.match(outdoor, /Waypoint Studio Articles|Articles — Waypoint Studio/);
assert.doesNotMatch(outdoor, /gsc-board|citizen-impact\.json/);

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

const page = await get("/side-trails/global-signals/citizen-impact/");
assert.equal(page.status, 200);
assert.match(page.text, /wds-gs-citizen-impact\.js/);

const json = await get("/data/global-signals/citizen-impact/citizen-impact.json");
assert.equal(json.status, 200);
assert.match(json.text, /gsc_demo-food-port-perishables/);

const js = await get("/design-system/js/global-signals/wds-gs-citizen-impact.js");
assert.equal(js.status, 200);
const cssRes = await get("/design-system/css/wds-global-signals-citizen-impact.css");
assert.equal(cssRes.status, 200);

const articlesPage = await get("/side-trails/global-signals/articles/");
assert.equal(articlesPage.status, 200);
assert.match(articlesPage.text, /wds-gs-articles\.js/);

const landingPage = await get("/side-trails/global-signals/");
assert.equal(landingPage.status, 200);
assert.match(landingPage.text, /citizen-impact/);

server.close();
console.log("Global Signals Citizen Impact checks passed.");
