#!/usr/bin/env node
/**
 * Cyber Operations Workspace V1.0 — contract + behavior smoke tests.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = join(root, "design-system/signalterrain/intelligence/cyber/workspace");
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
    addEventListener() {},
    document: { addEventListener() {}, getElementById() { return null; } }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  for (const rel of [
    "design-system/js/signalterrain/wds-signalterrain-util.js",
    "design-system/js/signalterrain/wds-signalterrain-cyber-graph.js",
    "design-system/js/signalterrain/wds-signalterrain-research.js",
    "design-system/js/signalterrain/wds-signalterrain-cyber-knowledge.js",
    "design-system/js/signalterrain/wds-signalterrain-cyber-workspace.js"
  ]) {
    vm.runInNewContext(readFileSync(join(root, rel), "utf8"), sandbox);
  }
  return sandbox;
}

const docs = [
  "docs/CYBER-WORKSPACE.md",
  "docs/INVESTIGATIONS.md",
  "docs/WATCHLISTS.md",
  "docs/NOTES.md",
  "docs/COLLECTIONS.md",
  "docs/READING-QUEUE.md"
];
for (const d of docs) ok(existsSync(join(root, d)), `doc ${d}`);

ok(existsSync(join(root, "apps/signalterrain/cyber/workspace.html")), "workspace UI");
ok(
  existsSync(join(root, "design-system/js/signalterrain/wds-signalterrain-cyber-workspace.js")),
  "workspace runtime"
);

const index = readJson("index.json");
ok(index.philosophy?.some((p) => /field notebook|understanding|Local-first/i.test(p)), "philosophy");
ok(index.notInScopeV1?.some((x) => /SOC/i.test(x)), "not a SOC");
ok(index.notInScopeV1?.some((x) => /SIEM/i.test(x)), "not a SIEM");
ok(index.storage?.content?.includes("st_research_workspace"), "shared research store");
ok(index.storage?.layout?.includes("st_cyber_workspace_layout"), "layout key separate");

const panels = readJson("panels.json");
ok(panels.panels.length >= 10, "dashboard panels");
const panelIds = panels.panels.map((p) => p.id);
for (const id of [
  "brief",
  "recent-intel",
  "investigations",
  "reading-queue",
  "pinned",
  "collections",
  "timeline",
  "watchlists",
  "learning",
  "notes"
]) {
  ok(panelIds.includes(id), `panel ${id}`);
}

const templates = readJson("investigation-templates.json");
ok(templates.templates.length >= 6, "investigation templates");
ok(templates.templates.some((t) => /Browser/i.test(t.title)), "browser template");

const seed = readJson("samples/workspace.seed.json");
ok(seed.items.some((i) => i.kind === "investigation"), "seed investigations");
ok(seed.items.some((i) => i.kind === "watchlist"), "seed watchlists");
ok(seed.items.some((i) => i.kind === "note" && (i.versions || []).length), "seed note versions");
ok(seed.items.some((i) => i.kind === "collection"), "seed collections");
ok(seed.items.some((i) => i.kind === "queue-item"), "seed queue");

const schema = JSON.parse(
  readFileSync(join(root, "design-system/signalterrain/research/schema-item-v0.1.json"), "utf8")
);
ok(schema.properties.kind.enum.includes("investigation"), "schema investigation");
ok(schema.properties.kind.enum.includes("watchlist"), "schema watchlist");
ok(schema.properties.kind.enum.includes("activity"), "schema activity");

const sandbox = loadSandbox();
const R = sandbox.WDS.signalTerrainResearch;
const Graph = sandbox.WDS.signalTerrainCyberGraph;
const WS = sandbox.WDS.signalTerrainCyberWorkspace;
ok(!!R?.createInvestigation, "createInvestigation");
ok(!!R?.createWatchlist, "createWatchlist");
ok(!!R?.matchWatchlist, "matchWatchlist");
ok(!!R?.updateNote, "updateNote");
ok(!!R?.addQueueItem, "addQueueItem");
ok(!!WS?.unifiedSearch, "unifiedSearch");
ok(!!WS?.buildPersonalTimeline, "buildPersonalTimeline");
ok(sandbox.WDS.signalTerrainUtil.STORAGE_KEYS.workspaceLayout, "util layout key");

const bundle = JSON.parse(
  readFileSync(join(cyber, "samples/cyber-intelligence.sample.json"), "utf8")
);
const graph = Graph.createGraph(bundle);
R.loadSeed(seed.items);

const inv = R.createInvestigation("Identity Protection", {
  tags: ["identity"],
  subjectIds: ["cy_cve-2021-44228"],
  tasks: [{ id: "t1", text: "Map accounts", done: false }]
});
ok(inv.kind === "investigation", "investigation created");
ok(inv.subjectIds.includes("cy_cve-2021-44228"), "investigation links intelligence");
ok(graph.get("cy_cve-2021-44228"), "linked entity resolves in graph");

const watch = R.createWatchlist("Products I care about", {
  watchKinds: ["affected-software"],
  watchTargetIds: ["cy_software-log4j"]
});
const hits = R.matchWatchlist(watch, graph.listEntities());
ok(hits.length > 0, "watchlists update / match");
ok(hits.some((h) => /Exact watched id|Watched kind/i.test(h.explanation)), "watch explanation");

const note = R.upsert({
  id: "rw_test_note_bidir",
  kind: "note",
  title: "Bidir note",
  body: "v1",
  subjectIds: ["cy_cve-2021-44228"],
  domain: "cyber",
  private: true
});
R.updateNote(note.id, "v2 body", "Bidir note");
const updated = R.get(note.id);
ok(updated.body === "v2 body", "note updated");
ok((updated.versions || []).some((v) => v.body === "v1"), "note version history");
ok(R.notesForSubject("cy_cve-2021-44228").some((n) => n.id === note.id), "notes link bidirectionally");

const col = R.ensureCollection("rw_test_col_linux", "Linux Security", [
  "cy_cve-2017-0144",
  inv.id
]);
ok(col.memberIds.includes("cy_cve-2017-0144"), "collections reuse shared models");
ok(col.memberIds.includes(inv.id), "collections hold investigations");

const queue = R.addQueueItem("Read Log4Shell", {
  subjectIds: ["cy_cve-2021-44228"],
  estimateMinutes: 20,
  difficulty: "intermediate",
  priority: "high"
});
ok(queue.kind === "queue-item", "queue item");
R.setReadingStatus(queue.id, "done");
ok(R.get(queue.id).readingStatus === "done", "queue status");

const searchHits = WS.unifiedSearch({
  query: "log4",
  graph,
  research: R,
  knowledge: null
});
ok(searchHits.length > 0, "workspace search indexes content");
ok(
  searchHits.some((h) => h.type === "intelligence" || /log4/i.test(h.title + h.id)),
  "search finds intelligence"
);
const invSearch = WS.unifiedSearch({
  query: "kind:investigation Identity",
  graph,
  research: R
});
ok(invSearch.some((h) => h.type === "investigation"), "search finds investigations");

const tl = WS.buildPersonalTimeline(R, 20);
ok(tl.length > 0, "personal timeline events");

const html = readFileSync(join(root, "apps/signalterrain/cyber/workspace.html"), "utf8");
ok(/Not a SOC|not a SOC/i.test(html), "UI disclaims SOC");
ok(/wds-signalterrain-cyber-workspace\.js/.test(html), "UI loads workspace runtime");
ok(/wds-signalterrain-research\.js/.test(html), "UI loads shared research");

if (failed) {
  console.error(`\n${failed} workspace test(s) failed`);
  process.exit(1);
}
console.log("\nAll cyber operations workspace tests passed.");
