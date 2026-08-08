#!/usr/bin/env node
/**
 * Global Signals — Relationship Graph as navigation backbone.
 * Cross-module deep links + focus alias resolution + Articles regression.
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

function loadJson(rel) {
  return JSON.parse(read(rel));
}

// --- files present ---
assert.ok(exists("design-system/js/global-signals/wds-gs-graph-links.js"));
assert.ok(exists("design-system/js/global-signals/wds-gs-relationship-graph.js"));
assert.ok(exists("data/global-signals/relationship-graph/graph.json"));
assert.ok(exists("docs/global-signals/graph-backbone-id-mapping.md"));

const graph = loadJson("data/global-signals/relationship-graph/graph.json");
const nodeIds = new Set(graph.nodes.map((n) => n.id));
assert.ok(graph.idAliases && graph.idAliases.gsc_taiwan === "gsn_taiwan");
assert.ok(nodeIds.has("gsn_taiwan"));
assert.ok(!nodeIds.has("gsc_taiwan"), "Taiwan country id must alias, not duplicate");

// --- shared link helper ---
await import(
  pathToFileURL(path.join(root, "design-system/js/global-signals/wds-gs-graph-links.js")).href
);
const links = globalThis.WDS.globalSignals.graphLinks;
assert.ok(links);
assert.equal(links.countryFocusId("gsc_taiwan"), "gsn_taiwan");
assert.equal(links.countryFocusId("gsc_china"), "gsc_china");
assert.equal(links.industryFocusId("gsi_semiconductors"), "gsi_semiconductors");
assert.equal(links.citizenFocusId("food"), "gsci_food");
assert.equal(links.citizenFocusId("gsci_fuel"), "gsci_fuel");
assert.match(
  links.focusUrl("gsi_energy"),
  /\/side-trails\/global-signals\/relationship-graph\/\?focus=gsi_energy$/
);
assert.match(links.ctaAnchor("gsci_food"), /Open in Relationship Graph/);
assert.match(links.ctaAnchor("gsci_food"), /data-gs-graph-focus="gsci_food"/);

// --- graph resolveFocusId + expand ---
await import(
  pathToFileURL(
    path.join(root, "design-system/js/global-signals/wds-gs-relationship-graph.js")
  ).href
);
const api = globalThis.WDS.globalSignals.relationshipGraph;
const bundle = api.normalizeBundle(graph);
assert.equal(api.resolveFocusId(bundle, "gsn_taiwan"), "gsn_taiwan");
assert.equal(api.resolveFocusId(bundle, "gsc_taiwan"), "gsn_taiwan");
assert.equal(api.resolveFocusId(bundle, "gsc_united-states"), "gsc_united-states");
assert.equal(api.resolveFocusId(bundle, "gsi_semiconductors"), "gsi_semiconductors");
assert.equal(api.resolveFocusId(bundle, "gsci_food"), "gsci_food");
assert.equal(api.resolveFocusId(bundle, "food"), "gsci_food");
assert.equal(api.resolveFocusId(bundle, "gsn_does_not_exist"), null);

function focusExpands(focusId) {
  const resolved = api.resolveFocusId(bundle, focusId);
  assert.ok(resolved, "focus should resolve: " + focusId);
  const state = {
    focusId: resolved,
    typeFilter: "all",
    expandedIds: { [resolved]: true },
    selectedEdgeId: null
  };
  const vg = api.visibleGraph(bundle, state);
  assert.ok(vg.nodes.some((n) => n.id === resolved));
  assert.ok(vg.nodes.length >= 2, "focus should reveal nearby nodes: " + focusId);
  return vg;
}

focusExpands("gsn_taiwan");
focusExpands("gsc_taiwan");
focusExpands("gsc_china");
focusExpands("gsi_semiconductors");
focusExpands("gsci_food");
focusExpands("gsn_steel_tariff");

// --- article → graph focus ids ---
const articles = loadJson("data/global-signals/articles/articles.json");
assert.ok(Array.isArray(articles.articles) && articles.articles.length >= 5);
for (const a of articles.articles) {
  assert.ok(
    Array.isArray(a.relatedGraphNodeIds) && a.relatedGraphNodeIds.length,
    "article missing relatedGraphNodeIds: " + a.id
  );
  for (const id of a.relatedGraphNodeIds) {
    assert.ok(nodeIds.has(id), a.id + " → missing graph node " + id);
  }
  const primary = links.articleFocusId(a);
  assert.ok(primary);
  focusExpands(primary);
}

const articlesJs = read("design-system/js/global-signals/wds-gs-articles.js");
assert.match(articlesJs, /relatedGraphNodeIds/);
assert.match(articlesJs, /articleGraphCta/);
assert.match(articlesJs, /Open in Relationship Graph/);

// --- country → graph ---
const countries = loadJson("data/global-signals/countries/countries.json");
for (const c of countries.countries) {
  const focus = links.countryFocusId(c.id);
  assert.ok(nodeIds.has(focus), "country focus missing: " + c.id + " → " + focus);
}
const countriesJs = read("design-system/js/global-signals/wds-gs-countries.js");
assert.match(countriesJs, /countryGraphCta/);
assert.match(countriesJs, /Open in Relationship Graph/);
assert.match(countriesJs, /gsn_taiwan/);

// --- industry → graph (fixed URL, not focus=industry) ---
const industries = loadJson("data/global-signals/industries/industries.json");
for (const ind of industries.industries) {
  assert.ok(nodeIds.has(ind.id), "industry node missing: " + ind.id);
}
const industriesJs = read("design-system/js/global-signals/wds-gs-industries.js");
assert.match(industriesJs, /Open in Relationship Graph/);
assert.doesNotMatch(industriesJs, /focus=industry&id=/);
assert.match(
  read("side-trails/global-signals/industries/semiconductors/index.html"),
  /focus=gsi_semiconductors/
);

// --- citizen → graph ---
const citizen = loadJson("data/global-signals/citizen-impact/citizen-impact.json");
for (const s of citizen.sections) {
  const focus = s.graphNodeId || links.citizenFocusId(s.id);
  assert.ok(nodeIds.has(focus), "citizen focus missing: " + s.id + " → " + focus);
}
const citizenJs = read("design-system/js/global-signals/wds-gs-citizen-impact.js");
assert.match(citizenJs, /sectionGraphCta/);
assert.match(citizenJs, /Open in Relationship Graph/);
assert.doesNotMatch(citizenJs, /Relationship Graph \(placeholder\)/);

// --- cascade explorer → graph ---
const relJs = read("design-system/js/global-signals/wds-gs-relationships.js");
assert.match(relJs, /Open in Relationship Graph/);
assert.match(relJs, /relationship-graph\/\?focus=/);

// --- landing promotes graph ---
const landing = read("side-trails/global-signals/index.html");
assert.match(landing, /gs-cta--primary" href="\.\/relationship-graph\/"/);
assert.match(landing, /primary exploration path/i);
assert.match(landing, /countries\//);
assert.match(landing, /industries\//);

// --- HTML loads graph-links helper ---
for (const page of [
  "side-trails/global-signals/articles/index.html",
  "side-trails/global-signals/citizen-impact/index.html",
  "side-trails/global-signals/countries/taiwan/index.html",
  "side-trails/global-signals/industries/semiconductors/index.html"
]) {
  assert.match(read(page), /wds-gs-graph-links\.js/);
}

// --- HTTP smoke: pages + focus query params served ---
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
  const checks = [
    ["/side-trails/global-signals/relationship-graph/?focus=gsc_taiwan", /gsg-app/],
    ["/side-trails/global-signals/relationship-graph/?focus=gsi_semiconductors", /gsg-app/],
    ["/side-trails/global-signals/relationship-graph/?focus=gsci_food", /gsg-app/],
    ["/side-trails/global-signals/articles/", /Articles — Global Signals/],
    ["/side-trails/global-signals/countries/taiwan/", /Taiwan/],
    ["/side-trails/global-signals/industries/semiconductors/", /Semiconductors/],
    ["/side-trails/global-signals/citizen-impact/", /Citizen Impact/],
    ["/data/global-signals/articles/articles.json", /relatedGraphNodeIds/],
    ["/data/global-signals/relationship-graph/graph.json", /idAliases/]
  ];
  for (const [pathName, re] of checks) {
    const res = await get(port, pathName);
    assert.equal(res.status, 200, "HTTP " + pathName);
    assert.match(res.body, re, "body " + pathName);
  }
  // Articles regression: feed still mounts, not coming soon
  const art = await get(port, "/side-trails/global-signals/articles/");
  assert.doesNotMatch(art.body, /Coming soon/i);
  assert.match(art.body, /wds-gs-articles\.js/);
  assert.match(art.body, /wds-gs-graph-links\.js/);
} finally {
  server.close();
}

console.log("test-global-signals-graph-backbone: ok");
