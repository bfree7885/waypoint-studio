#!/usr/bin/env node
/**
 * Module 5 smoke tests — auth crypto + knowledge model + search + export shape.
 * Run: node private/university/tests/module5-smoke.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  writeOwnerEnv,
  loadEnvFile
} from "../server/auth.mjs";

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

check("password hash verifies", () => {
  const { salt, hash } = hashPassword("correct-horse-battery-staple");
  assert.equal(verifyPassword("correct-horse-battery-staple", salt, hash), true);
  assert.equal(verifyPassword("wrong-password-xx", salt, hash), false);
});

check("session token round-trip", () => {
  const secret = "a".repeat(64);
  const token = createSessionToken(secret, "owner");
  const data = verifySessionToken(secret, token);
  assert.equal(data.sub, "owner");
  assert.ok(data.exp > Math.floor(Date.now() / 1000));
  assert.equal(verifySessionToken("b".repeat(64), token), null);
});

check("writeOwnerEnv creates loadable file", () => {
  const tmp = path.join(__dirname, ".tmp-env-test");
  writeOwnerEnv(tmp, { password: "twelve-chars-min", ownerEmail: "bryan@example.com" });
  const env = loadEnvFile(tmp);
  assert.equal(env.WU_OWNER_EMAIL, "bryan@example.com");
  assert.ok(env.WU_PASSWORD_HASH);
  assert.ok(verifyPassword("twelve-chars-min", env.WU_PASSWORD_SALT, env.WU_PASSWORD_HASH));
  fs.unlinkSync(tmp);
});

check("client modules load + Spatial Computing workflow model", () => {
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
    "wu-scholar.js"
  ].forEach((f) => {
    vm.runInContext(fs.readFileSync(path.join(root, "js", f), "utf8"), ctx);
  });
  assert.equal(ctx.WU.Schema.SCHEMA, "1.4.0");
  assert.ok(ctx.WU.Schema.KINDS.some((k) => k.id === "journal"));

  const note = {
    id: "n1",
    kind: "concept",
    title: "Spatial Computing",
    body: "## Overview\n\n**Spatial computing** blends *vision* and place.\n\n- Point clouds\n- [Link](https://example.com)\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n",
    tags: ["spatial", "vision"],
    projects: ["waypoint-studio"],
    pathId: "p1",
    status: "active",
    updatedAt: "2026-07-19T00:00:00Z",
    createdAt: "2026-07-19T00:00:00Z"
  };
  const pathNode = {
    id: "p1",
    kind: "path",
    title: "Spatial Computing Path",
    body: "Lane",
    meta: { slug: "spatial-computing" },
    updatedAt: "2026-07-19T00:00:00Z",
    createdAt: "2026-07-19T00:00:00Z"
  };
  const q = {
    id: "q1",
    kind: "question",
    title: "How does depth sensing inform UX?",
    body: "Open",
    question: { status: "open" },
    projects: ["waypoint-studio"],
    updatedAt: "2026-07-19T00:00:00Z",
    createdAt: "2026-07-19T00:00:00Z"
  };
  const src = {
    id: "s1",
    kind: "article",
    title: "Intro to Spatial Computing",
    body: "Notes",
    source: { authors: "Example", readingStatus: "reading" },
    reliability: { authority: 3, evidence: 3, bias: 1, recency: 4, confidence: 3 },
    projects: ["waypoint-studio"],
    updatedAt: "2026-07-19T00:00:00Z",
    createdAt: "2026-07-19T00:00:00Z"
  };
  const nodes = [note, pathNode, q, src];
  const edges = [
    { id: "e1", fromId: "n1", toId: "p1", type: "part-of", createdAt: "2026-07-19T00:00:00Z" },
    { id: "e2", fromId: "q1", toId: "n1", type: "questions", createdAt: "2026-07-19T00:00:00Z" },
    { id: "e3", fromId: "s1", toId: "n1", type: "references", createdAt: "2026-07-19T00:00:00Z" }
  ];
  const gi = ctx.WU.Graph.buildIndex(nodes, edges);
  assert.equal((gi.adj.n1 || []).length, 3);
  const idx = ctx.WU.Search.buildIndex(nodes);
  const hits = ctx.WU.Search.search(idx, "Spatial Computing");
  assert.ok(hits.length >= 1);
  assert.equal(hits[0].node.title, "Spatial Computing");
  assert.ok(hits[0].reasons.length >= 1);
  const html = ctx.WU.Markdown.render(note.body);
  assert.ok(html.includes("<strong>"));
  assert.ok(html.includes("<table"));
  const hub = ctx.WU.Scholar.projectResearchHub("waypoint-studio", gi);
  assert.ok(hub.related.some((n) => n.id === "n1"));
  assert.ok(hub.questions.some((n) => n.id === "q1"));
  assert.ok(hub.references.some((n) => n.id === "s1"));
});

check("start.sh and ACCESS exist", () => {
  assert.ok(fs.existsSync(path.join(root, "start.sh")));
  assert.ok(fs.existsSync(path.join(root, "ACCESS.md")));
});

if (failures.length) {
  console.error("\n" + failures.length + " failure(s)");
  process.exit(1);
}
console.log("\nAll Module 5 smoke checks passed.");
