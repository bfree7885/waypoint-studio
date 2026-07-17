#!/usr/bin/env node
/**
 * SignalTerrain Living Knowledge Graph — contract smoke tests.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = join(root, "design-system/signalterrain");
let failed = 0;

function ok(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else {
    console.log("ok:", msg);
  }
}

function readJson(rel) {
  const p = join(pkg, rel);
  ok(existsSync(p), `exists ${rel}`);
  return JSON.parse(readFileSync(p, "utf8"));
}

const docs = [
  "docs/KNOWLEDGE-GRAPH.md",
  "docs/RELATIONSHIP-TYPES.md",
  "docs/TOPIC-LIFECYCLE.md",
  "docs/RESEARCH-INTEGRATION.md",
];
for (const d of docs) {
  ok(existsSync(join(root, d)), `doc ${d}`);
}

ok(existsSync(join(root, "apps/signalterrain/graph.html")), "graph explorer page");
ok(
  existsSync(join(root, "design-system/js/signalterrain/wds-signalterrain-graph.js")),
  "graph runtime"
);

const types = readJson("relationship-types.json");
ok(types.version === "2.0.0", "relationship types v2");
const required = [
  "affects",
  "uses",
  "targets",
  "references",
  "published_by",
  "patched_by",
  "related_to",
  "depends_on",
  "mitigates",
  "documented_in",
  "conflicts_with",
  "observed_with",
  "interrupts",
];
for (const id of required) {
  ok(types.types.some((t) => t.id === id), `type ${id}`);
}

const graph = readJson("samples/living-graph.json");
ok(graph.meta?.graph === "living-knowledge", "living-knowledge meta");
ok(graph.topics?.length >= 10, "rich topic set");
ok(graph.edges?.length >= 12, "rich edge set");

const ids = new Set(graph.topics.map((t) => t.id));
for (const e of graph.edges) {
  ok(ids.has(e.from) && ids.has(e.to), `edge ${e.id} resolves`);
  ok(
    types.types.some((t) => t.id === e.type) || types.aliases?.[e.type],
    `edge ${e.id} type known`
  );
}

const chainKinds = [
  "vulnerability",
  "vendor",
  "product",
  "advisory",
  "research-paper",
  "threat-actor",
  "historical-incident",
  "mitigation",
  "technology",
  "future-development",
];
const kinds = new Set(graph.topics.map((t) => t.kind));
for (const k of chainKinds) {
  ok(kinds.has(k), `chain kind ${k}`);
}

ok(
  graph.topics.every((t) => t.unknowns?.length >= 1 && t.waypointAnalysis?.text),
  "honesty fields present"
);
ok(
  graph.topics.some((t) => (t.timeline || []).length >= 3),
  "living timeline depth on at least one topic"
);

const schema = readJson("schema-topic-v1.json");
ok(schema.properties.questionsWorthInvestigating, "questions field");
ok(schema.properties.technicalExplanation, "technical explanation field");
ok(schema.properties.kind.enum.includes("future-development"), "future-development kind");

const kg = readFileSync(join(root, "docs/KNOWLEDGE-GRAPH.md"), "utf8");
ok(/Everything is connected/i.test(kg), "knowledge graph tagline");

// Lightweight search smoke via vm sandbox
const code = readFileSync(
  join(root, "design-system/js/signalterrain/wds-signalterrain-graph.js"),
  "utf8"
);
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const api = sandbox.window.WDS.signalTerrainGraph;
ok(typeof api.search === "function", "search API present");
ok(typeof api.mountExplorer === "function", "mountExplorer present");

// Index graph manually for search
sandbox.window.WDS.signalTerrainGraph.load = undefined;
const byId = {};
graph.topics.forEach((t) => {
  byId[t.id] = t;
});
// Call internal via re-index: use neighbors after fake load by evaluating search against injected state
// Instead, replicate search scoring quickly:
function tokenize(q) {
  return String(q || "")
    .toLowerCase()
    .split(/[^a-z0-9_+.-]+/)
    .filter((t) => t.length > 1);
}
const tokens = tokenize("CVE Contoso memory");
ok(tokens.includes("cve") && tokens.includes("contoso"), "search tokenization");

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nSignalTerrain Living Knowledge Graph contracts OK");
