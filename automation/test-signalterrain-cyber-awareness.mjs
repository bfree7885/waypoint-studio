#!/usr/bin/env node
/**
 * SignalTerrain Cyber Awareness Intelligence Engine V0.1 — contract smoke tests.
 * Not IDS/SIEM/scanner/offense. Samples only.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = join(root, "design-system/signalterrain/intelligence/cyber");
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
  "docs/CYBER-INTELLIGENCE-MODEL.md",
  "docs/CYBER-GRAPH-ARCHITECTURE.md",
  "docs/CYBER-PRIORITY-ENGINE.md",
  "docs/CYBER-DATA-MODEL.md",
];
for (const d of docs) ok(existsSync(join(root, d)), `doc ${d}`);

ok(existsSync(join(root, "apps/signalterrain/cyber/index.html")), "cyber UI");
ok(
  existsSync(join(root, "design-system/js/signalterrain/wds-signalterrain-cyber-graph.js")),
  "graph runtime"
);
ok(
  existsSync(join(root, "design-system/js/signalterrain/wds-signalterrain-cyber-priority.js")),
  "priority runtime"
);
ok(existsSync(join(root, "design-system/signalterrain/research/index.json")), "shared research");

const index = readJson("index.json");
ok(index.meta?.domain === "cyber", "cyber domain");
ok(index.notInScopeV01?.some((x) => /IDS/i.test(x)), "IDS out of scope");
ok(index.notInScopeV01?.some((x) => /SIEM/i.test(x)), "SIEM out of scope");
ok(index.notInScopeV01?.some((x) => /scanner/i.test(x)), "scanner out of scope");
ok(index.notInScopeV01?.some((x) => /Offensive/i.test(x)), "offense out of scope");
ok(index.notInScopeV01?.some((x) => /mysterious AI/i.test(x)), "no mystery AI scores");

const kinds = readJson("entity-kinds.json");
const requiredKinds = [
  "threat",
  "threat-campaign",
  "malware-family",
  "ransomware-family",
  "vulnerability",
  "cve",
  "kev-entry",
  "vendor-advisory",
  "patch",
  "exploit-technique",
  "affected-software",
  "threat-actor",
  "mitigation",
  "indicator",
  "timeline-event",
  "source",
];
ok(
  requiredKinds.every((id) => kinds.kinds.some((k) => k.id === id)),
  "core entity kinds"
);

const entitySchema = readJson("schema-entity-v0.1.json");
for (const f of ["history", "relationships", "notes", "citations", "explainability", "ownerAnalysis"]) {
  ok(!!entitySchema.properties[f], `entity field ${f}`);
}

const expl = readJson("schema-explainability-v0.1.json");
for (const f of ["knownFacts", "likely", "possible", "unknown", "whatIsIt", "whyItMatters"]) {
  ok(!!expl.properties[f], `explain field ${f}`);
}

const factors = readJson("priority-factors.json");
ok(factors.factors?.length >= 9, "priority factors");
const rules = readJson("priority-rules.json");
ok(rules.caps?.urgentRequiresKnownExploitation === true, "urgent caps");

const bundle = readJson("samples/cyber-intelligence.sample.json");
ok(bundle.meta?.status === "sample", "bundle sample");
ok(bundle.entities?.length >= 30, "entity breadth");
ok(bundle.relationships?.length >= 20, "relationship breadth");
const caseNeedles = ["Heartbleed", "WannaCry", "NotPetya", "SolarWinds", "ProxyShell", "Log4Shell", "MOVEit", "EternalBlue"];
ok(
  caseNeedles.every((c) => (bundle.meta.cases || []).includes(c) || JSON.stringify(bundle).includes(c)),
  "teaching cases present"
);
ok(
  bundle.entities.every(
    (e) =>
      e.explainability?.knownFacts?.length >= 1 &&
      e.explainability?.unknown?.length >= 1 &&
      Array.isArray(e.explainability?.likely) &&
      Array.isArray(e.explainability?.possible)
  ),
  "explainability honesty on all entities"
);
ok(
  !/exploit payload|metasploit module|poc code|weaponize step/i.test(JSON.stringify(bundle)),
  "no exploit payloads in sample"
);

const research = readJson("samples/research-workspace.sample.json");
ok(research.items?.some((i) => i.domain === "radio"), "research shared with RF");
ok(research.items?.some((i) => i.domain === "cyber"), "research cyber items");

// Load graph + priority runtimes in vm
function loadBrowserScript(rel) {
  const code = readFileSync(join(root, rel), "utf8");
  const sandbox = { console, window: {}, globalThis: {} };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(code, sandbox);
  return sandbox.WDS;
}

const WDS = loadBrowserScript("design-system/js/signalterrain/wds-signalterrain-cyber-graph.js");
const WDS2 = loadBrowserScript("design-system/js/signalterrain/wds-signalterrain-cyber-priority.js");
Object.assign(WDS, WDS2);

const graph = WDS.signalTerrainCyberGraph.createGraph(bundle);
const chain = graph.traverseAttentionChain("cy_cve-2021-44228");
ok(chain.ok && chain.steps?.length >= 3, "log4shell attention chain");
const path = graph.findPath("cy_cve-2017-0144", "cy_ransomware-wannacry");
ok(path && path.includes("cy_cve-2017-0144") && path.includes("cy_ransomware-wannacry"), "eternalblue path");

const log4 = graph.get("cy_cve-2021-44228");
const score = WDS.signalTerrainCyberPriority.score(
  { ...log4.priorityInputs, subjectId: log4.id, id: "cyp_test" },
  factors,
  rules
);
ok(score.contributions?.every((c) => c.reason), "priority reasons present");
ok(typeof score.total === "number" && score.band, "priority total+band");
ok(score.summaryWhy?.length > 10, "priority summaryWhy");

const model = readFileSync(join(root, "docs/CYBER-INTELLIGENCE-MODEL.md"), "utf8");
ok(/NOT.*IDS|not.*IDS/i.test(model), "model rejects IDS");
ok(/Known Facts/i.test(model) && /Unknown/i.test(model), "model explainability");

const ui = readFileSync(join(root, "apps/signalterrain/cyber/index.html"), "utf8");
ok(/Not an IDS|not an IDS|Not IDS/i.test(ui) || /not an IDS, SIEM/i.test(ui), "UI non-claims");

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nCyber Awareness Intelligence Engine V0.1 contracts OK");
