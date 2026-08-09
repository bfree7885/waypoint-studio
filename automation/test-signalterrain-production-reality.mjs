#!/usr/bin/env node
/**
 * SignalTerrain Cyber — production reality regression gates.
 * Prevents sample/mock/demo intelligence from leaking into production mounts.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function ok(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else {
    console.log("ok:", msg);
  }
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const SAMPLE_MARKERS = [
  "cyber-intelligence.sample.json",
  "research-workspace.sample.json",
  "workspace.seed.json",
  "ingestion/samples/raw"
];

// --- Live dashboard isolation ---
const liveJs = read("design-system/js/signalterrain/wds-signalterrain-cyber-live.js");
ok(!/loadJson\([^)]*sample\.json/.test(liveJs), "live runtime does not loadJson sample files");
ok(!/fetch\([^)]*sample\.json/.test(liveJs), "live runtime does not fetch sample files");
ok(/BANNED_SAMPLE_PATHS/.test(liveJs), "live runtime bans sample paths");
ok(/Adaptive Defense/.test(liveJs), "live runtime includes Adaptive Defense");

const liveHtml = read("apps/signalterrain/cyber/live.html");
ok(/data\/cyber\/live\.json/.test(liveHtml), "live HTML points at live artifact");
ok(!/cyber-intelligence\.sample\.json/.test(liveHtml), "live HTML does not embed sample bundle");

// --- Production mounts must not silently fall back to samples ---
const workspaceJs = read("design-system/js/signalterrain/wds-signalterrain-cyber-workspace.js");
ok(
  !/loadBundle\(liveGraphUrl\)\.catch[\s\S]*cyber-intelligence\.sample\.json/.test(workspaceJs),
  "workspace does not catch-fallback to sample graph"
);
ok(/Sample data was not substituted/.test(workspaceJs), "workspace honest error on live failure");

const explorerJs = read("design-system/js/signalterrain/wds-signalterrain-cyber-explorer.js");
ok(/liveGraphUrl|data\/cyber\/graph\.json/.test(explorerJs), "explorer defaults toward live graph");
ok(
  /teaching[\s\S]*cyber-intelligence\.sample\.json/.test(explorerJs),
  "explorer samples gated behind teaching"
);
ok(/Sample data was not substituted/.test(explorerJs), "explorer honest error on live failure");

const knowledgeJs = read("design-system/js/signalterrain/wds-signalterrain-cyber-knowledge.js");
ok(/liveGraphUrl|data\/cyber\/graph\.json/.test(knowledgeJs), "knowledge defaults toward live graph");
ok(
  /teaching[\s\S]*cyber-intelligence\.sample\.json/.test(knowledgeJs),
  "knowledge samples gated behind teaching"
);

// --- Advisor production entry redirects to live Adaptive Defense ---
const advisorHtml = read("apps/signalterrain/cyber/advisor.html");
ok(/live\.html#adaptive/.test(advisorHtml), "advisor redirects/points to live Adaptive Defense");
ok(/teaching=1/.test(advisorHtml), "advisor teaching mode remains available");
ok(/Teaching samples only/i.test(advisorHtml), "advisor teaching banner present");

const cyberIndex = read("apps/signalterrain/cyber/index.html");
ok(/live\.html/.test(cyberIndex), "cyber index redirects to live");

const teachingHtml = read("apps/signalterrain/cyber/teaching.html");
ok(/Teaching samples only/i.test(teachingHtml), "teaching page labeled");
ok(/noindex/i.test(teachingHtml), "teaching page noindex");

const briefHtml = read("apps/signalterrain/cyber/brief.html");
ok(/Sample scenarios only/i.test(briefHtml), "brief scenarios labeled sample");
ok(/live\.html#brief/.test(briefHtml), "brief points to live brief");

// --- Nav: production Adaptive Defense / brief must not point at sample advisor/brief ---
const nav = read("design-system/js/platform/wds-app-nav-config.js");
ok(
  /"id":\s*"cyber-adaptive"[\s\S]*?live\.html#adaptive/.test(nav),
  "nav Adaptive Defense → live#adaptive"
);
ok(
  /"id":\s*"cyber-brief"[\s\S]*?live\.html#brief/.test(nav),
  "nav daily brief → live#brief"
);
ok(
  !/"id":\s*"cyber-advisor"[\s\S]*?advisor\.html"/.test(nav),
  "nav does not promote sample advisor as production Adaptive Defense"
);
ok(/Topics \(samples\)/.test(nav), "nav labels topic samples");
ok(/Teaching samples/.test(nav), "nav exposes teaching samples explicitly");

// --- Live artifact contract ---
const livePath = join(root, "data/cyber/live.json");
ok(existsSync(livePath), "live artifact present");
if (existsSync(livePath)) {
  const live = JSON.parse(readFileSync(livePath, "utf8"));
  ok(live.meta && live.meta.trustState, "live trustState present");
  ok(Array.isArray(live.records) && live.records.length > 0, "live records non-empty");
  ok(live.adaptiveDefense && live.adaptiveDefense.question, "adaptiveDefense present");
  ok(
    !live.records.some((r) =>
      /sample|fixture|demo-threat/i.test(JSON.stringify(r.source || {}))
    ),
    "no sample-labeled sources in live records"
  );
  for (const marker of SAMPLE_MARKERS) {
    ok(
      !JSON.stringify(live.records.slice(0, 5)).includes(marker),
      `live records do not reference ${marker}`
    );
  }
}

const graphPath = join(root, "data/cyber/graph.json");
ok(existsSync(graphPath), "live graph artifact present");
if (existsSync(graphPath)) {
  const graph = JSON.parse(readFileSync(graphPath, "utf8"));
  ok(graph.meta && graph.meta.status === "live", "graph meta status live");
  ok(Array.isArray(graph.entities) && graph.entities.length > 0, "graph entities non-empty");
  ok(
    !/cyber-intelligence\.sample/i.test(JSON.stringify(graph.meta || {})),
    "graph meta does not point at sample bundle"
  );
  ok(
    /not a teaching sample|Derived from live/i.test(String((graph.meta && graph.meta.disclaimer) || "")),
    "graph disclaimer identifies live derivation"
  );
}

// --- Side Trails landing points at live, not only mockup ---
const landing = read("side-trails/signalterrain/index.html");
ok(/apps\/signalterrain\/cyber\/live\.html/.test(landing), "ST landing links live cyber");
ok(/live\.html#adaptive/.test(landing), "ST landing links Adaptive Defense");
ok(/Dashboard mockup \(sample\)|mockups\/dashboard\.html/.test(landing), "mockup remains labeled");

if (failed) {
  console.error(`\n${failed} production-reality test(s) failed`);
  process.exit(1);
}
console.log("\nAll SignalTerrain production-reality tests passed.");
