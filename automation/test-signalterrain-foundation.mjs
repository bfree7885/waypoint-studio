#!/usr/bin/env node
/**
 * SignalTerrain Foundation — topic/relationship contract smoke tests.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
  "docs/SIGNALTERRAIN-VISION.md",
  "docs/SIGNALTERRAIN-PLATFORM-ARCHITECTURE.md",
  "docs/SIGNALTERRAIN-TOPIC-MODEL.md",
  "docs/SIGNALTERRAIN-RELATIONSHIP-MODEL.md",
  "docs/SIGNALTERRAIN-EDITORIAL-STANDARDS.md",
];
for (const d of docs) {
  ok(existsSync(join(root, d)), `doc ${d}`);
}

ok(existsSync(join(root, "apps/signalterrain/topics.html")), "topics demo page");
ok(
  existsSync(join(root, "design-system/js/signalterrain/wds-signalterrain-topics.js")),
  "topics runtime"
);

const index = readJson("index.json");
ok(index.meta?.status === "foundation", "package foundation");
ok(index.artifacts?.demoGraph === "samples/demo-graph.json", "demo graph artifact");

const workspaces = readJson("workspaces.json");
ok(
  ["rf", "cyber", "infrastructure", "research"].every((id) =>
    workspaces.workspaces.some((w) => w.id === id)
  ),
  "four workspaces"
);

const systems = readJson("platform-systems.json");
ok(systems.systems?.length >= 12, "platform systems catalog");
ok(systems.privacyDefaults?.sync === "off-until-chosen", "sync opt-in default");

const types = readJson("relationship-types.json");
ok(types.types?.some((t) => t.id === "advises-on"), "advises-on type");
ok(types.types?.some((t) => t.id === "exploits-or-involves"), "literacy involves type");

const graph = readJson("samples/demo-graph.json");
ok(graph.meta?.status === "sample", "graph labeled sample");
ok(graph.topics?.length >= 6, "at least six sample topics");
ok(graph.edges?.length >= 6, "enough sample edges");

const topicIds = new Set(graph.topics.map((t) => t.id));
for (const e of graph.edges) {
  ok(topicIds.has(e.from) && topicIds.has(e.to), `edge ${e.id} endpoints resolve`);
}

const kinds = new Set(graph.topics.map((t) => t.kind));
ok(kinds.has("vulnerability"), "sample CVE topic");
ok(kinds.has("threat-actor"), "sample actor topic");
ok(kinds.has("advisory"), "sample advisory topic");
ok(kinds.has("frequency"), "sample frequency topic");
ok(kinds.has("propagation"), "sample propagation topic");
ok(kinds.has("research-paper"), "sample paper topic");

ok(
  graph.topics.every((t) => t.unknowns?.length >= 1 && t.waypointAnalysis?.text),
  "topics have unknowns + perspective"
);

const vision = readFileSync(join(root, "docs/SIGNALTERRAIN-VISION.md"), "utf8");
ok(/Understand the world's signals/i.test(vision), "vision tagline");
ok(/not.*SIEM|SIEM/i.test(vision), "vision rejects SIEM");

const studioArch = readFileSync(join(root, "docs/PLATFORM-ARCHITECTURE.md"), "utf8");
ok(/Waypoint Studio/i.test(studioArch), "studio PLATFORM-ARCHITECTURE preserved");

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nSignalTerrain Foundation contracts OK");
