#!/usr/bin/env node
/**
 * Cyber Terrain Map & Intelligence Explorer V0.1 — contract + behavior smoke tests.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = join(root, "design-system/signalterrain/intelligence/cyber/explorer");
const cyber = join(root, "design-system/signalterrain/intelligence/cyber");
let failed = 0;

function ok(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else {
    console.log("ok:", msg);
  }
}

function readJson(rel, base = pkg) {
  const p = join(base, rel);
  ok(existsSync(p), `exists ${rel}`);
  return JSON.parse(readFileSync(p, "utf8"));
}

function loadSandbox() {
  const localStore = new Map();
  const sandbox = {
    console,
    Date,
    JSON,
    Math,
    prompt: () => null,
    fetch: async () => {
      throw new Error("fetch not used in unit path");
    },
    localStorage: {
      setItem(k, v) {
        localStore.set(k, String(v));
      },
      getItem(k) {
        return localStore.has(k) ? localStore.get(k) : null;
      },
      removeItem(k) {
        localStore.delete(k);
      }
    },
    location: { hash: "" },
    addEventListener() {}
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.document = { addEventListener() {} };
  for (const rel of [
    "design-system/js/signalterrain/wds-signalterrain-cyber-graph.js",
    "design-system/js/signalterrain/wds-signalterrain-research.js",
    "design-system/js/signalterrain/wds-signalterrain-cyber-explorer.js"
  ]) {
    vm.runInNewContext(readFileSync(join(root, rel), "utf8"), sandbox);
  }
  return sandbox;
}

const docs = [
  "docs/CYBER-EXPLORER.md",
  "docs/CYBER-GRAPH-UI.md",
  "docs/CYBER-TIMELINE.md",
  "docs/CYBER-MAP.md"
];
for (const d of docs) ok(existsSync(join(root, d)), `doc ${d}`);

ok(existsSync(join(root, "apps/signalterrain/cyber/explorer.html")), "explorer UI");
ok(
  existsSync(join(root, "design-system/js/signalterrain/wds-signalterrain-cyber-explorer.js")),
  "explorer runtime"
);
ok(
  existsSync(join(root, "design-system/js/signalterrain/wds-signalterrain-research.js")),
  "research runtime"
);

const index = readJson("index.json");
ok(index.philosophy?.some((p) => /news feed/i.test(p)), "not a news feed");
ok(index.philosophy?.some((p) => /shared cyber graph/i.test(p)), "reuses shared graph");
ok(index.notInScopeV01?.some((x) => /victim/i.test(x)), "no precise victims");

const nav = readJson("navigation.json");
const required = [
  "overview",
  "graph",
  "timeline",
  "map",
  "organizations",
  "products",
  "vulnerabilities",
  "campaigns",
  "research",
  "collections"
];
ok(
  required.every((id) => nav.panels.some((p) => p.id === id)),
  "required explorer panels"
);

const mapDoc = readJson("map-layers.json");
ok(mapDoc.meta?.purpose && /Never precise victim/i.test(mapDoc.meta.purpose), "map purpose");
ok((mapDoc.layers || []).length >= 4, "independent map layers");
const markers = mapDoc.layers.flatMap((l) => l.markers || []);
ok(
  markers.every((m) => m.neverPreciseVictim === true),
  "all markers neverPreciseVictim"
);
ok(
  markers.every((m) => ["global", "continental", "regional", "country-coarse"].includes(m.precision)),
  "coarse precision only"
);

const sandbox = loadSandbox();
const Graph = sandbox.WDS.signalTerrainCyberGraph;
const Explorer = sandbox.WDS.signalTerrainCyberExplorer;
const Research = sandbox.WDS.signalTerrainResearch;
ok(!!Graph?.createGraph, "graph API");
ok(!!Explorer?.explainEdge, "explainEdge export");
ok(!!Explorer?.collectTimeline, "collectTimeline export");
ok(!!Explorer?.filterTimeline, "filterTimeline export");
ok(!!Research?.toggleBookmark, "research bookmark API");

const bundle = JSON.parse(readFileSync(join(cyber, "samples/cyber-intelligence.sample.json"), "utf8"));
const graph = Graph.createGraph(bundle);

// Graph navigation via shared API (no duplicate logic)
const neighbors = graph.neighbors("cy_cve-2021-44228", { bidirectional: true });
ok(neighbors.length > 0, "graph navigation neighbors");
const edge = neighbors[0].edge;
const ex = Explorer.explainEdge(edge, graph.get(edge.from), graph.get(edge.to));
ok(/Connected because/i.test(ex.whyConnected), "relationship explanation");
ok(!!ex.confidence, "edge confidence exposed");
ok(ex.type === edge.type, "explanation uses real edge type");

const timeline = Explorer.collectTimeline(graph);
ok(timeline.length >= 8, "timeline events collected");
ok(timeline.every((e) => e.eventKind && e.at != null), "timeline fields");

const filtered = Explorer.filterTimeline(timeline, { eventKind: "disclosure" });
ok(filtered.every((e) => e.eventKind === "disclosure"), "timeline filter by kind");

const sevFiltered = Explorer.filterTimeline(timeline, { severity: "notice" });
ok(sevFiltered.every((e) => e.severity === "notice"), "timeline filter by severity");

// Map projection sanity
const p = Explorer.projectLonLat(0, 0, 720, 360);
ok(Math.abs(p.x - 360) < 1 && Math.abs(p.y - 180) < 1, "map projection center");

// Research bookmarks integrate
Research.loadSeed(
  JSON.parse(readFileSync(join(cyber, "samples/research-workspace.sample.json"), "utf8")).items
);
const bm = Research.toggleBookmark("cy_software-log4j", "Apache Log4j 2");
ok(bm.bookmarked && Research.isBookmarked("cy_software-log4j"), "bookmark on");
Research.toggleBookmark("cy_software-log4j", "Apache Log4j 2");
ok(!Research.isBookmarked("cy_software-log4j"), "bookmark off");
Research.ensureCollection("rw_test_col", "Test", ["cy_cve-2021-44228"]);
ok(Research.get("rw_test_col")?.memberIds?.includes("cy_cve-2021-44228"), "collection members");

// Product / campaign entities exist for detail pages
ok(!!graph.get("cy_software-log4j"), "product sample");
ok(!!graph.get("cy_campaign-notpetya"), "campaign sample");

// Docs mention shared graph consumption
const explorerDoc = readFileSync(join(root, "docs/CYBER-EXPLORER.md"), "utf8");
ok(/does \*\*not\*\* re-implement|does not re-implement|shared cyber graph/i.test(explorerDoc), "doc architecture");
ok(/```/.test(explorerDoc), "architecture diagram present");

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nAll cyber explorer tests passed.");
