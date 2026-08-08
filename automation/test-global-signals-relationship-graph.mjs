#!/usr/bin/env node
/**
 * Global Signals Relationship Graph tests.
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

const htmlPath = "side-trails/global-signals/relationship-graph/index.html";
const cssPath = "design-system/css/wds-global-signals-relationship-graph.css";
const jsPath = "design-system/js/global-signals/wds-gs-relationship-graph.js";
const dataPath = "data/global-signals/relationship-graph/graph.json";

assert.ok(exists(htmlPath), "graph route missing");
assert.ok(exists(cssPath), "graph CSS missing");
assert.ok(exists(jsPath), "graph JS missing");
assert.ok(exists(dataPath), "graph data missing");
assert.ok(exists("docs/global-signals/relationship-graph-owner-review.md"));
assert.ok(exists("docs/global-signals/relationship-graph-data-model.md"));

const html = read(htmlPath);
assert.match(html, /<title>Relationship Graph — Global Signals<\/title>/);
assert.match(html, /id="gsg-app"/);
assert.match(html, /data-gsg-app/);
assert.match(html, /wds-gs-relationship-graph\.js/);
assert.match(html, /graph\.json/);
assert.match(html, /radial-from-focus|expand nearby/i);
assert.match(html, /href="\.\.\/"/);
assert.match(html, /Back to Global Signals/);
assert.match(html, /articles\//);
assert.match(html, /relationships\//);
assert.doesNotMatch(html, /Coming soon/i);
// Assert against layout libraries — honest copy may say "not a force-directed…"
assert.doesNotMatch(html, /cytoscape|d3\.force|vis-network|sigma\.js/i);

const landing = read("side-trails/global-signals/index.html");
assert.match(landing, /relationship-graph\//);
assert.match(landing, /Relationship Graph/);
assert.doesNotMatch(
  landing,
  /Relationship Graph<\/strong><\/a> — typed nodes and evidenced edges \(future graph surface/
);

const css = read(cssPath);
assert.match(css, /\.gsg-app/);
assert.match(css, /\.gsg-canvas/);
assert.match(css, /\.gsg-neighbor-list/);
assert.match(css, /@media \(max-width:\s*40rem\)/);
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /display:\s*none/); // mobile hides canvas for stacked panels

const data = JSON.parse(read(dataPath));
assert.equal(data.mode, "sample-demo");
assert.ok(data.honesty && data.honesty.banner);
assert.equal(data.layout.forceDirected, false);
assert.equal(data.layout.approach, "radial-from-focus");
assert.ok(Array.isArray(data.nodes));
assert.ok(Array.isArray(data.edges));
assert.ok(data.nodes.length >= 40, "enough nodes");
assert.ok(data.edges.length >= 40, "enough edges");

const requiredTypes = [
  "country",
  "industry",
  "commodity",
  "port",
  "conflict",
  "policy",
  "company",
  "citizen_impact"
];
const presentTypes = new Set(data.nodes.map((n) => n.type));
for (const t of requiredTypes) {
  assert.ok(presentTypes.has(t), "missing node type " + t);
}

const nodeIds = new Set(data.nodes.map((n) => n.id));
assert.ok(nodeIds.has("gsn_taiwan"));
assert.ok(nodeIds.has("gsci_food") || [...nodeIds].some((id) => id.startsWith("gsci_")));

for (const e of data.edges) {
  assert.ok(e.id && e.from && e.to && e.why);
  assert.ok(e.confidence);
  assert.ok(e.timeHorizon);
  assert.ok(e.evidence && (e.evidence.label || e.evidence.url));
  assert.ok(nodeIds.has(e.from), "from missing " + e.from);
  assert.ok(nodeIds.has(e.to), "to missing " + e.to);
  assert.notEqual(
    e.confidence,
    "Observed",
    "graph edges must not use Observed in seed data: " + e.id
  );
}

// Source datasets present for integration honesty
for (const src of [
  "data/global-signals/relationships/relationships.json",
  "data/global-signals/citizen-impact/citizen-impact.json",
  "data/global-signals/industries/industries.json",
  "data/global-signals/countries/countries.json"
]) {
  assert.ok(exists(src), "source dataset missing " + src);
  assert.ok(data.sourceDatasets.includes(src), "sourceDatasets should list " + src);
}

await import(pathToFileURL(path.join(root, jsPath)).href);
const api = globalThis.WDS.globalSignals.relationshipGraph;
assert.ok(api);

assert.equal(api.normalizeConfidence(null), "Unknown");
assert.equal(api.normalizeConfidence("moderate"), "Medium");
assert.equal(api.normalizeConfidence("Observed"), "Observed");
assert.equal(api.normalizeConfidence("Observed", { predicted: true }), "Unknown");
assert.equal(api.normalizeConfidence("nope"), "Unknown");
assert.equal(api.normalizeTimeHorizon("weeks"), "Weeks");
assert.equal(api.normalizeTimeHorizon("long term"), "Long-term");
assert.equal(api.normalizeTimeHorizon("bogus"), "Unknown");
assert.equal(api.typeLabel("citizen_impact"), "Citizen Impact");
assert.equal(api.typeLabel("country"), "Country");

const bundle = api.normalizeBundle(data);
assert.equal(bundle.nodes.length, data.nodes.length);
assert.equal(bundle.edges.length, data.edges.length);

const badEdge = api.normalizeEdge({
  id: "gsr_bad",
  from: "gsn_taiwan",
  to: "gsn_semiconductors",
  why: "x",
  confidence: "Observed",
  timeHorizon: "days",
  evidence: { kind: "sample-demo", label: "demo", url: "https://example.invalid/x" }
});
assert.equal(badEdge.confidence, "Unknown");
assert.equal(api.normalizeEdge({ id: "x" }), null);
assert.equal(api.normalizeNode(null), null);
assert.equal(api.normalizeNode({}), null);

const nbrs = api.neighborsOf(bundle, "gsn_taiwan", null);
assert.ok(nbrs.length >= 1, "taiwan should have neighbors");

const state = {
  focusId: "gsn_taiwan",
  typeFilter: "all",
  expandedIds: { gsn_taiwan: true },
  selectedEdgeId: null
};
const vg = api.visibleGraph(bundle, state);
assert.ok(vg.nodes.some((n) => n.id === "gsn_taiwan"));
assert.ok(vg.nodes.length >= 2, "focus + neighbors visible");
assert.ok(vg.positions.gsn_taiwan);
assert.ok(vg.edges.length >= 1);

// Expand a neighbor adds more nodes when available
if (nbrs[0]) {
  const expandState = {
    focusId: "gsn_taiwan",
    typeFilter: "all",
    expandedIds: { gsn_taiwan: true, [nbrs[0].node.id]: true },
    selectedEdgeId: nbrs[0].edge.id
  };
  const vg2 = api.visibleGraph(bundle, expandState);
  assert.ok(vg2.nodes.length >= vg.nodes.length);
  assert.ok(api.renderEdgeFacets(nbrs[0].edge).includes("Why connected"));
  assert.ok(api.renderEdgeFacets(nbrs[0].edge).includes(nbrs[0].edge.confidence));
}

// Empty / missing focus
const emptyVg = api.visibleGraph(bundle, {
  focusId: null,
  typeFilter: "all",
  expandedIds: {},
  selectedEdgeId: null
});
assert.equal(emptyVg.nodes.length, 0);

const missing = api.neighborsOf(bundle, "gsn_does_not_exist", null);
assert.equal(missing.length, 0);

// A11y basics in render
const banner = api.renderBanner(bundle);
assert.match(banner, /role="status"/);
assert.match(banner, /Sample \/ demo/i);
assert.match(api.renderEvidence(null), /Evidence unavailable/);

// HTTP smoke
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      let rel = urlPath.replace(/^\//, "");
      if (rel.endsWith("/")) rel += "index.html";
      const file = path.join(root, rel);
      if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end("missing");
        return;
      }
      const ext = path.extname(file);
      const types = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".json": "application/json"
      };
      res.writeHead(200, { "Content-Type": types[ext] || "text/plain" });
      res.end(fs.readFileSync(file));
    });
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

function get(port, p) {
  return new Promise((resolve, reject) => {
    http
      .get({ hostname: "127.0.0.1", port, path: p }, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode, body }));
      })
      .on("error", reject);
  });
}

const { server, port } = await startServer();
try {
  const page = await get(port, "/side-trails/global-signals/relationship-graph/");
  assert.equal(page.status, 200);
  assert.match(page.body, /gsg-app/);
  const graph = await get(port, "/data/global-signals/relationship-graph/graph.json");
  assert.equal(graph.status, 200);
  const parsed = JSON.parse(graph.body);
  assert.ok(parsed.nodes.length >= 40);
  const articles = await get(port, "/side-trails/global-signals/articles/");
  assert.equal(articles.status, 200);
  assert.match(articles.body, /Articles — Global Signals/);
  assert.doesNotMatch(articles.body, /Coming soon/i);
} finally {
  server.close();
}

console.log("test-global-signals-relationship-graph: ok");
