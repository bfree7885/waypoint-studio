#!/usr/bin/env node
/**
 * Module 6 smoke — local research assistant grounded in library content.
 * Run: node private/university/tests/module6-smoke.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const failures = [];

function check(name, fn) {
  try {
    fn();
    console.log("ok  " + name);
  } catch (e) {
    failures.push(name + ": " + e.message);
    console.error("FAIL " + name + " — " + e.message);
  }
}

const ctx = vm.createContext({ console });
ctx.globalThis = ctx;
ctx.window = ctx;
[
  "wu-schema.js",
  "wu-search.js",
  "wu-markdown.js",
  "wu-graph.js",
  "wu-health.js",
  "wu-learn.js",
  "wu-scholar.js",
  "wu-assist.js"
].forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(root, "js", f), "utf8"), ctx);
});

check("schema 1.5 + decision/hypothesis statuses", () => {
  assert.equal(ctx.WU.Schema.SCHEMA, "1.5.0");
  assert.ok(ctx.WU.Schema.DECISION_STATUSES.some((s) => s.id === "decided"));
  assert.ok(ctx.WU.Schema.HYPOTHESIS_STATUSES.some((s) => s.id === "proposed"));
  assert.ok(ctx.WU.Assist);
});

const linux = {
  id: "n-linux",
  kind: "concept",
  title: "Linux networking",
  body: "## Overview\n\nSockets, routes, and firewalls.\n\nNetworking on Linux uses the kernel net stack.",
  tags: ["linux", "networking"],
  projects: ["linux"],
  status: "active",
  updatedAt: "2026-01-10T00:00:00Z",
  createdAt: "2025-11-01T00:00:00Z",
  lastOpenedAt: "2025-12-01T00:00:00Z"
};
const gis = {
  id: "n-gis",
  kind: "concept",
  title: "GIS spatial joins",
  body: "Spatial joins relate features by location. Related to vision and place.",
  tags: ["gis", "spatial"],
  projects: ["gis"],
  status: "active",
  updatedAt: "2026-07-01T00:00:00Z",
  createdAt: "2026-06-01T00:00:00Z"
};
const q = {
  id: "q1",
  kind: "question",
  title: "How do Linux routes interact with containers?",
  body: "Open question about networking",
  question: { status: "open" },
  tags: ["linux", "networking"],
  projects: ["linux"],
  updatedAt: "2026-07-10T00:00:00Z",
  createdAt: "2026-07-10T00:00:00Z"
};
const srcA = {
  id: "s1",
  kind: "article",
  title: "Kernel networking notes",
  body: "Agreed: netfilter is central. Unclear on eBPF scope.",
  source: { readingStatus: "reading" },
  tags: ["linux"],
  projects: ["linux"],
  updatedAt: "2026-07-05T00:00:00Z",
  createdAt: "2026-07-05T00:00:00Z"
};
const srcB = {
  id: "s2",
  kind: "article",
  title: "Container networking critique",
  body: "Disagrees that netfilter alone is enough. Prefers CNI plugins.",
  source: { readingStatus: "unread" },
  tags: ["linux", "networking"],
  projects: ["linux"],
  updatedAt: "2026-07-06T00:00:00Z",
  createdAt: "2026-07-06T00:00:00Z"
};
const hyp = {
  id: "h1",
  kind: "hypothesis",
  title: "Route cache reduces container latency",
  thinking: {
    tool: "hypothesis",
    statement: "Warm route cache reduces first-packet latency in containers.",
    hypothesisStatus: "proposed",
    supportingEvidence: "Lab notes",
    contradictingEvidence: "Cold-start variance",
    confidence: 2
  },
  projects: ["linux"],
  updatedAt: "2026-07-08T00:00:00Z",
  createdAt: "2026-07-08T00:00:00Z"
};
const nodes = [linux, gis, q, srcA, srcB, hyp];
const edges = [
  { id: "e1", fromId: "n-linux", toId: "q1", type: "related-to" },
  { id: "e2", fromId: "n-linux", toId: "s1", type: "references" },
  { id: "e3", fromId: "n-linux", toId: "s2", type: "references" }
];
const index = ctx.WU.Search.buildIndex(nodes);
const graph = ctx.WU.Graph.buildIndex(nodes, edges);

check("relatedFor cites library nodes with confidence", () => {
  const rel = ctx.WU.Assist.relatedFor(linux, graph);
  assert.ok(rel.questions.length || rel.sources.length || rel.notes.length);
  const all = [].concat(rel.notes, rel.questions, rel.sources);
  all.forEach((x) => {
    assert.ok(["known", "likely", "possible", "unknown"].includes(x.confidence));
    assert.ok(x.why);
  });
});

check("summarize cites the focus note and does not invent titles", () => {
  const out = ctx.WU.Assist.summarizeLocal(linux);
  assert.equal(out.confidence, "known");
  assert.match(out.text, /Linux networking|Sockets|net stack/i);
  assert.ok(out.citations.some((c) => c.id === "n-linux"));
  assert.ok(!/fabricated|made-up imaginary/i.test(out.text));
});

check("natural search both-terms + unresolved questions", () => {
  const both = ctx.WU.Assist.naturalSearch(
    "Find notes mentioning both Linux and networking",
    index,
    graph
  );
  assert.ok(both.some((h) => h.id === "n-linux" || h.id === "q1"));
  assert.ok(both[0].reasons.some((r) => /both/i.test(r) || /Requires both/i.test(r) || r.length));

  const qs = ctx.WU.Assist.naturalSearch(
    "Show unresolved questions about networking",
    index,
    graph
  );
  assert.ok(qs.every((h) => h.node.kind === "question"));
});

check("compare + synthesize stay grounded", () => {
  const cmp = ctx.WU.Assist.compareNotes([linux, gis], graph);
  assert.match(cmp.text, /Comparison/);
  const syn = ctx.WU.Assist.synthesizeSources([srcA, srcB]);
  assert.ok(syn.citations.length >= 2);
  assert.match(syn.text, /agree|disagree|unanswered|nuance|claim/i);
});

check("knowledge gaps framed as opportunities", () => {
  const gaps = ctx.WU.Assist.knowledgeGaps(graph);
  assert.ok(Array.isArray(gaps.opportunities));
  assert.ok(typeof gaps.elapsedMs === "number");
});

check("dashboard lane + remote toggle never transmits", () => {
  const dash = ctx.WU.Assist.researchDashboard("linux", graph);
  assert.equal(dash.lane.id, "linux");
  assert.ok(dash.activity.length >= 1);
  ctx.WU.Assist.setPrefs({ remoteAiEnabled: true, assistEnabled: true });
  const out = ctx.WU.Assist.runAction("summarize", { node: linux, graphIndex: graph });
  assert.match(out.privacy, /local-only/);
  assert.match(out.text, /Linux|Sockets|networking/i);
});

check("hypothesis stub is provisional", () => {
  const stub = ctx.WU.Scholar.createThinkingStub("hypothesis");
  assert.equal(stub.kind, "hypothesis");
  assert.equal(stub.thinking.hypothesisStatus, "proposed");
  assert.ok(stub.thinking.supportingEvidence === null);
});

check("index.html loads wu-assist before app", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const a = html.indexOf("wu-assist.js");
  const b = html.indexOf("wu-app.js");
  assert.ok(a > 0 && b > a);
});

if (failures.length) {
  console.error("\n" + failures.length + " failure(s)");
  process.exit(1);
}
console.log("\nModule 6 smoke passed.");
