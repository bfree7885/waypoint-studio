#!/usr/bin/env node
/**
 * Global Signals Relationship Explorer tests.
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

const htmlPath = "side-trails/global-signals/relationships/index.html";
const cssPath = "design-system/css/wds-global-signals-relationships.css";
const jsPath = "design-system/js/global-signals/wds-gs-relationships.js";
const dataPath = "data/global-signals/relationships/relationships.json";

assert.ok(exists(htmlPath), "relationships route missing");
assert.ok(exists(cssPath), "relationships CSS missing");
assert.ok(exists(jsPath), "relationships JS missing");
assert.ok(exists(dataPath), "relationships data missing");

const html = read(htmlPath);
assert.match(html, /<title>Relationship Explorer — Global Signals<\/title>/);
assert.match(html, /id="gsr-app"/);
assert.match(html, /data-gsr-app/);
assert.match(html, /What depends on this/);
assert.match(html, /wds-gs-relationships\.js/);
assert.match(html, /relationships\.json/);
assert.match(html, /href="\.\.\/"/);
assert.match(html, /Back to Global Signals/);
assert.match(html, /articles\//);
assert.doesNotMatch(html, /Coming soon/i);
assert.doesNotMatch(html, /cytoscape|d3\.force|vis-network|sigma\.js/i);

const css = read(cssPath);
assert.match(css, /\.gsr-app/);
assert.match(css, /\.gsr-cascade/);
assert.match(css, /@media \(max-width:\s*40rem\)/);
assert.match(css, /prefers-reduced-motion/);

const data = JSON.parse(read(dataPath));
assert.equal(data.mode, "sample-demo");
assert.ok(data.honesty && data.honesty.banner);
assert.ok(Array.isArray(data.entities));
assert.ok(Array.isArray(data.relationships));
assert.ok(Array.isArray(data.cascades));
assert.ok(data.entities.length >= 15, "enough entities");
assert.ok(data.relationships.length >= 12, "enough edges");
assert.ok(data.cascades.length >= 6, "enough cascades");

const requiredTypes = [
  "country",
  "industry",
  "commodity",
  "port",
  "company",
  "conflict",
  "tariff",
  "policy",
  "weather"
];
const presentTypes = new Set(data.entities.map((e) => e.type));
for (const t of requiredTypes) {
  assert.ok(presentTypes.has(t), "missing entity type " + t);
}

const selectable = data.entities.filter((e) => e.selectable);
assert.ok(selectable.length >= 8, "several selectable roots");
const selectableTypes = new Set(selectable.map((e) => e.type));
for (const t of requiredTypes) {
  assert.ok(selectableTypes.has(t), "selectable root missing type " + t);
}

const entityIds = new Set(data.entities.map((e) => e.id));
const relIds = new Set();
for (const r of data.relationships) {
  assert.ok(r.id && r.from && r.to && r.why);
  assert.ok(r.confidence);
  assert.ok(r.timeHorizon);
  assert.ok(r.evidence && (r.evidence.label || r.evidence.url));
  assert.ok(entityIds.has(r.from), "from missing " + r.from);
  assert.ok(entityIds.has(r.to), "to missing " + r.to);
  assert.notEqual(
    r.confidence,
    "Observed",
    "relationship hops must not use Observed in seed data: " + r.id
  );
  relIds.add(r.id);
}

for (const c of data.cascades) {
  assert.ok(c.id && c.rootId && Array.isArray(c.edgeIds));
  assert.ok(entityIds.has(c.rootId), "cascade root missing " + c.rootId);
  assert.ok(c.edgeIds.length >= 1);
  for (const eid of c.edgeIds) {
    assert.ok(relIds.has(eid), "cascade edge missing " + eid);
  }
}

// Taiwan cascade shape (product example)
const taiwan = data.cascades.find((c) => c.rootId === "gsn_taiwan");
assert.ok(taiwan, "Taiwan cascade required");
assert.equal(taiwan.edgeIds.length, 4);

await import(pathToFileURL(path.join(root, jsPath)).href);
const api = globalThis.WDS.globalSignals.relationships;
assert.ok(api);

assert.equal(api.normalizeConfidence(null), "Unknown");
assert.equal(api.normalizeConfidence("moderate"), "Medium");
assert.equal(api.normalizeConfidence("Observed"), "Observed");
assert.equal(api.normalizeConfidence("Observed", { predicted: true }), "Unknown");
assert.equal(api.normalizeConfidence("nope"), "Unknown");
assert.equal(api.normalizeTimeHorizon("weeks"), "Weeks");
assert.equal(api.normalizeTimeHorizon("long term"), "Long-term");
assert.equal(api.normalizeTimeHorizon("bogus"), "Unknown");
assert.equal(api.typeLabel("weather"), "Weather Event");
assert.equal(api.typeLabel("country"), "Country");

const bundle = api.normalizeBundle(data);
assert.equal(bundle.entities.length, data.entities.length);
assert.equal(bundle.relationships.length, data.relationships.length);

// Predicted coerce on relationship normalize
const badRel = api.normalizeRelationship({
  id: "gsr_bad",
  from: "gsn_taiwan",
  to: "gsn_semiconductors",
  why: "x",
  confidence: "Observed",
  timeHorizon: "days",
  evidence: { kind: "sample-demo", label: "demo", url: "https://example.invalid/x" }
});
assert.equal(badRel.confidence, "Unknown");

const malformed = api.normalizeRelationship({ id: "x" });
assert.equal(malformed, null);
assert.equal(api.normalizeEntity(null), null);
assert.equal(api.normalizeEntity({}), null);

const cascade = api.findCascadeForRoot(bundle, "gsn_taiwan");
const steps = api.buildCascadeSteps(bundle, cascade);
assert.equal(steps[0].kind, "root");
assert.equal(steps[0].entity.label, "Taiwan");
assert.equal(steps[1].entity.label, "Semiconductors");
assert.equal(steps[2].entity.label, "Electronics");
assert.equal(steps[3].entity.label, "Automotive");
assert.equal(steps[4].entity.label, "Consumer Products");
for (let i = 1; i < steps.length; i++) {
  assert.notEqual(steps[i].relationship.confidence, "Observed");
  assert.ok(steps[i].relationship.why);
  assert.ok(steps[i].relationship.evidence);
}

const cascadeHtml = api.renderCascade(bundle, "gsn_taiwan");
assert.match(cascadeHtml, /gsr-cascade/);
assert.match(cascadeHtml, /Taiwan/);
assert.match(cascadeHtml, /Semiconductors/);
assert.match(cascadeHtml, /Why/);
assert.match(cascadeHtml, /Confidence/);
assert.match(cascadeHtml, /Time horizon/);
assert.match(cascadeHtml, /Evidence/);
assert.match(cascadeHtml, /Sample \/ demo/);
assert.doesNotMatch(cascadeHtml, /cytoscape|d3\.force/i);

const missingCascade = api.renderCascade(bundle, "gsn_automotive");
assert.match(missingCascade, /No curated cascade|not mapped/i);

const missingEntity = api.renderCascade(bundle, "gsn_does_not_exist");
assert.match(missingEntity, /Entity not found/i);

const picker = api.renderPicker(bundle, "gsn_taiwan", "country");
assert.match(picker, /data-gsr-type/);
assert.match(picker, /data-gsr-entity/);
assert.match(picker, /gsn_taiwan/);
assert.match(picker, /gsr-chip--active/);

const filtered = api.selectableEntities(bundle, "tariff");
assert.ok(filtered.every((e) => e.type === "tariff"));
assert.ok(filtered.some((e) => e.id === "gsn_steel_tariff"));

const banner = api.renderBanner(bundle);
assert.match(banner, /Sample \/ demo/);

assert.equal(api.isSafeHttpUrl("https://example.invalid/x"), true);
assert.equal(api.isSafeHttpUrl("javascript:alert(1)"), false);

// Landing + Articles integration
const landing = read("side-trails/global-signals/index.html");
assert.match(landing, /\.\/relationships\//);
assert.match(landing, /Cascade Explorer|Relationship Explorer/);
assert.match(landing, /\.\/relationship-graph\//);

const articles = read("side-trails/global-signals/articles/index.html");
assert.match(articles, /relationships\//);

// Side Trails docs mention
assert.ok(exists("docs/side-trails/global-signals.md"));

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

const page = await get("/side-trails/global-signals/relationships/");
assert.equal(page.status, 200);
assert.match(page.text, /wds-gs-relationships\.js/);

const selected = await get("/side-trails/global-signals/relationships/?entity=gsn_taiwan");
assert.equal(selected.status, 200);

const json = await get("/data/global-signals/relationships/relationships.json");
assert.equal(json.status, 200);
assert.match(json.text, /gsn_taiwan/);

const js = await get("/design-system/js/global-signals/wds-gs-relationships.js");
assert.equal(js.status, 200);
const cssRes = await get("/design-system/css/wds-global-signals-relationships.css");
assert.equal(cssRes.status, 200);

const landingPage = await get("/side-trails/global-signals/");
assert.equal(landingPage.status, 200);
assert.match(landingPage.text, /relationships\//);

const articlesPage = await get("/side-trails/global-signals/articles/");
assert.equal(articlesPage.status, 200);
assert.match(articlesPage.text, /relationships\//);

// No regression: Articles still live; Relationship Graph is primary (not a coming-soon shell)
assert.doesNotMatch(read("side-trails/global-signals/articles/index.html"), /Coming soon/i);
assert.doesNotMatch(read("side-trails/global-signals/relationship-graph/index.html"), /Coming soon/i);
assert.match(read("side-trails/global-signals/relationship-graph/index.html"), /gsg-app/);

server.close();
console.log("Global Signals Relationship Explorer checks passed.");
