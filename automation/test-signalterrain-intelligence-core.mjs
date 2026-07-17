#!/usr/bin/env node
/**
 * SignalTerrain Intelligence Core V0.1 — contract smoke tests.
 * Architecture only: no IDS/IPS, no live ingestion.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = join(root, "design-system/signalterrain/intelligence");
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
  "docs/SIGNALTERRAIN-INTELLIGENCE-CORE.md",
  "docs/SIGNALTERRAIN-INTELLIGENCE-ROADMAP.md",
  "docs/SIGNALTERRAIN-CORRELATION-ENGINE.md",
  "docs/SIGNALTERRAIN-RECOMMENDATIONS.md",
];
for (const d of docs) {
  ok(existsSync(join(root, d)), `doc ${d}`);
}

ok(existsSync(join(root, "apps/signalterrain/summary.html")), "summary prototype");
ok(
  existsSync(join(root, "design-system/js/signalterrain/wds-signalterrain-summary.js")),
  "summary runtime"
);

const index = readJson("index.json");
ok(index.meta?.status === "architecture", "core architecture status");
ok(index.notInScopeV01?.some((x) => /IDS/i.test(x)), "IDS out of scope");
ok(index.notInScopeV01?.some((x) => /IPS/i.test(x)), "IPS out of scope");

const domains = readJson("domains.json");
ok(
  ["cyber", "infrastructure", "geopolitical", "radio"].every((id) =>
    domains.domains.some((d) => d.id === id)
  ),
  "four domains"
);

const uioSchema = readJson("schema-uio-v0.1.json");
ok(uioSchema.$id?.includes("uio/v0.1"), "uio schema id");
for (const f of [
  "affectedSystems",
  "industries",
  "geographicScope",
  "firstSeen",
  "updated",
  "expiration",
  "whyItMatters",
  "unknowns",
]) {
  ok(!!uioSchema.properties[f], `uio field ${f}`);
}

const recSchema = readJson("schema-recommendation-v0.1.json");
ok(recSchema.properties.autoExecute?.const === false, "autoExecute always false");
for (const f of ["why", "who", "priority", "evidence", "action", "expectedDuration", "dependencies"]) {
  ok(!!recSchema.properties[f], `rec field ${f}`);
}

const providers = readJson("providers.json");
ok(providers.providers?.every((p) => p.status === "designed"), "providers designed only");
ok(providers.providers?.every((p) => p.honesty?.noExploitPayloads === true), "no exploit payloads");

const patterns = readJson("correlation-patterns.json");
ok(patterns.patterns?.some((p) => p.id === "pattern_geo_shipping_cyber"), "geo chain pattern");
ok(patterns.patterns?.some((p) => p.id === "pattern_vuln_exploit_patch"), "vuln chain pattern");

const bundle = readJson("samples/uio-bundle.sample.json");
ok(bundle.events?.length >= 8, "uio sample breadth");
ok(bundle.events.every((e) => e.unknowns?.length >= 1 && e.whyItMatters), "uio honesty");

const recs = readJson("samples/recommendations.sample.json");
ok(recs.recommendations?.every((r) => r.autoExecute === false), "recs never auto-execute");

const summary = readJson("samples/intelligence-summary.sample.json");
ok(summary.bullets?.length >= 5, "summary has concise bullets");
ok(/not a feed/i.test(summary.meta?.subtitle || ""), "summary not a feed");

const core = readFileSync(join(root, "docs/SIGNALTERRAIN-INTELLIGENCE-CORE.md"), "utf8");
ok(/What changed\?/i.test(core) && /Who is affected\?/i.test(core), "four questions in core");
ok(/NOT.*IDS|not.*IDS|Do \*\*not\*\* build IDS/i.test(core) || /does \*\*not\*\* build IDS/i.test(core), "core rejects IDS");

const roadmap = readFileSync(join(root, "docs/SIGNALTERRAIN-INTELLIGENCE-ROADMAP.md"), "utf8");
ok(/Phase 5/i.test(roadmap) && /Passive IDS/i.test(roadmap), "IDS is late phase");
ok(/Phase 7/i.test(roadmap) && /IPS/i.test(roadmap), "IPS is late phase");
ok(/forbids implementing Phase 5/i.test(roadmap), "V0.1 forbids IDS/IPS impl");

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nSignalTerrain Intelligence Core V0.1 contracts OK");
