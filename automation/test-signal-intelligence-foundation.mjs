#!/usr/bin/env node
/**
 * Signal Intelligence Foundation V1 — contract smoke tests.
 * Architecture only: no collectors, no live feeds.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = join(root, "design-system/signal-intelligence");
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
  "docs/SIGNAL-INTELLIGENCE-VISION.md",
  "docs/SIGNAL-INTELLIGENCE-ARCHITECTURE.md",
  "docs/SIGNAL-INTELLIGENCE-ROADMAP.md",
  "docs/SIGNAL-INTELLIGENCE-ENGINE.md",
  "docs/SIGNAL-INTELLIGENCE-INTEGRATIONS.md",
];
for (const d of docs) {
  ok(existsSync(join(root, d)), `doc ${d}`);
}

ok(
  existsSync(join(root, "design-system/patterns/signal-intelligence-dashboard.html")),
  "dashboard wireframe"
);

const index = readJson("index.json");
ok(index.meta?.foundation === "V1", "index foundation V1");
ok(index.meta?.runtime === "none", "runtime none");
ok(index.artifacts?.signalCardSchema === "schema-v1.json", "signal card artifact");
ok(index.primaryHome === "signalterrain", "primary home SignalTerrain");
ok(
  Array.isArray(index.notInScopeV1) && index.notInScopeV1.some((x) => /scan|SOC|Exploit/i.test(x)),
  "notInScope includes scanner/SOC/exploit class"
);

const modules = readJson("modules.json");
ok(modules.modules?.length >= 14, "modules catalog has expected breadth");
ok(
  modules.modules.every((m) => m.id && m.status && m.domain),
  "modules have id/status/domain"
);

const nav = readJson("navigation.json");
ok(nav.studioNavPolicy?.forbidSeparateCyberProduct === true, "no parallel Cyber product");
ok(nav.primaryNav?.some((n) => n.id === "about-limits"), "About & Limits in IA");

const sources = readJson("sources-catalog.json");
ok(sources.sources?.some((s) => s.id === "noaa-space-weather"), "NOAA in sources catalog");
ok(sources.sources?.every((s) => s.status === "designed"), "sources designed only");

const schema = readJson("schema-v1.json");
ok(schema.$id?.includes("signal-card/v1"), "schema-v1 signal card id");
ok(schema.required?.includes("waypointPerspective"), "perspective required");
ok(schema.required?.includes("verification"), "verification required");
ok(schema.required?.includes("unknowns"), "unknowns required");

const sample = readJson("samples/signal-card.sample.json");
ok(sample.meta?.status === "sample", "sample labeled sample");
ok(sample.unknowns?.length >= 1, "sample has unknowns");
ok(sample.verification?.status === "educational-sample", "sample verification");
ok(sample.trustConfidenceLabel === "preliminary", "trust label crosswalk on sample");

const design = readJson("design-language.json");
ok(design.antiMetaphor?.some((x) => /SOC|Hollywood|matrix/i.test(x)), "anti-SOC design language");

const vision = readFileSync(join(root, "docs/SIGNAL-INTELLIGENCE-VISION.md"), "utf8");
ok(/vulnerability scanner/i.test(vision) && /not/i.test(vision), "vision rejects scanner framing");
ok(/park ranger/i.test(vision), "vision uses ranger metaphor");

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nSignal Intelligence Foundation V1 contracts OK");
