#!/usr/bin/env node
/**
 * Defensive Knowledge Platform V0.1 — contract + interconnection smoke tests.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = join(root, "design-system/signalterrain/intelligence/cyber/knowledge");
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
    fetch: async () => {
      throw new Error("no fetch");
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
    addEventListener() {},
    document: { addEventListener() {}, getElementById() { return null; } }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  for (const rel of [
    "design-system/js/signalterrain/wds-signalterrain-cyber-graph.js",
    "design-system/js/signalterrain/wds-signalterrain-research.js",
    "design-system/js/signalterrain/wds-signalterrain-cyber-knowledge.js"
  ]) {
    vm.runInNewContext(readFileSync(join(root, rel), "utf8"), sandbox);
  }
  return sandbox;
}

const docs = [
  "docs/KNOWLEDGE-PLATFORM.md",
  "docs/CYBER-ENCYCLOPEDIA.md",
  "docs/PLAYBOOKS.md",
  "docs/INCIDENT-LIBRARY.md",
  "docs/LEARNING-PATHS.md"
];
for (const d of docs) ok(existsSync(join(root, d)), `doc ${d}`);

ok(existsSync(join(root, "apps/signalterrain/cyber/knowledge.html")), "knowledge UI");
ok(
  existsSync(join(root, "design-system/js/signalterrain/wds-signalterrain-cyber-knowledge.js")),
  "knowledge runtime"
);

const index = readJson("index.json");
ok(index.philosophy?.some((p) => /shared cyber graph/i.test(p)), "shared graph philosophy");
ok(index.notInScopeV01?.some((x) => /Offensive/i.test(x)), "no offense");
ok(index.notInScopeV01?.some((x) => /Duplicated/i.test(x)), "no duplicated models");

const enc = readJson("encyclopedia/index.json");
ok(enc.articles.length >= 15, "encyclopedia articles");
ok(enc.articles.every((a) => a.id.startsWith("enc_")), "enc_ ids");
ok(enc.articles.every((a) => a.lastReviewed && a.learningLevel), "reviewed + level");

const pbs = readJson("playbooks/index.json");
ok(pbs.playbooks.length >= 12, "playbooks");
ok(pbs.playbooks.every((p) => p.forbidOffense === true), "playbooks forbid offense");
ok(
  !JSON.stringify(pbs).match(/exploit payload|metasploit|weaponize/i),
  "no offensive playbook language"
);

const incs = readJson("incidents/index.json");
ok(incs.incidents.length >= 6, "incidents");
ok(incs.incidents.every((i) => (i.lessonsLearned || []).length > 0), "lessons learned");

const paths = readJson("learning-paths.json");
ok(paths.paths.length >= 8, "learning paths");
ok(paths.paths.every((p) => p.estimatedHours && p.steps?.length), "path estimates + steps");

const sandbox = loadSandbox();
const Graph = sandbox.WDS.signalTerrainCyberGraph;
const Knowledge = sandbox.WDS.signalTerrainCyberKnowledge;
const Research = sandbox.WDS.signalTerrainResearch;
ok(!!Knowledge?.createIndex, "createIndex");

const bundle = JSON.parse(readFileSync(join(cyber, "samples/cyber-intelligence.sample.json"), "utf8"));
const graph = Graph.createGraph(bundle);
graph.entities = bundle.entities;
Research.loadSeed(
  JSON.parse(readFileSync(join(cyber, "samples/research-workspace.sample.json"), "utf8")).items
);

const idx = Knowledge.createIndex({
  encyclopedia: enc,
  playbooks: pbs,
  incidents: incs,
  learningPaths: paths,
  graph
});

const article = idx.getArticle("enc_cve-log4shell");
ok(!!article, "log4shell article");
const links = idx.crossLinks(article);
ok(links.articles.length + links.playbooks.length + links.cves.length + links.products.length > 0, "cross-links");
ok(links.graphNeighbors.length > 0, "graph neighbors via shared model");
ok(
  article.subjectIds.every((id) => !!graph.get(id)),
  "article subjects resolve in shared graph"
);

const pb = idx.getPlaybook("pb_patch-management");
ok(!!pb && pb.practices.length > 0, "playbook practices");
const pbLinks = idx.crossLinks(pb);
ok(pbLinks.articles.length > 0 || (pb.relatedArticleIds || []).length > 0, "playbook links knowledge");

const hits = idx.search("log4j", { limit: 20 });
ok(hits.some((h) => h.contentType === "article"), "search finds articles");
ok(hits.some((h) => h.contentType === "intelligence"), "search indexes intelligence");
ok(hits.some((h) => h.contentType === "incident" || h.contentType === "playbook"), "search multi-type");

const relHits = idx.search("related:affects", { limit: 20 });
ok(relHits.some((h) => h.contentType === "relationship"), "relationship search");

const map = idx.knowledgeMap("enc_cve-log4shell");
ok(map.nodes.length >= 3 && map.edges.length >= 1, "visual map understandable");
ok(map.nodes.every((n) => n.id && n.label), "map nodes labeled");

const path = idx.getPath("lp_developer-security");
ok(path.steps.every((s) => s.refId), "learning path refs");
ok(
  path.steps.every((s) => {
    if (s.refType === "article") return !!idx.getArticle(s.refId);
    if (s.refType === "playbook") return !!idx.getPlaybook(s.refId);
    if (s.refType === "incident") return !!idx.getIncident(s.refId);
    if (s.refType === "entity") return !!graph.get(s.refId);
    return false;
  }),
  "learning path refs resolve"
);

const arch = readFileSync(join(root, "docs/KNOWLEDGE-PLATFORM.md"), "utf8");
ok(/subjectIds|do \*\*not\*\* fork|shared graph/i.test(arch), "docs sync model");
ok(/```/.test(arch), "architecture diagram");

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nAll defensive knowledge platform tests passed.");
