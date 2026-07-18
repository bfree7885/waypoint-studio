#!/usr/bin/env node
/**
 * Cyber Intelligence Ingestion Pipeline V0.1 — contract + behavior smoke tests.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = join(root, "design-system/signalterrain/intelligence/cyber/ingestion");
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

function loadPipelineSandbox() {
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
    }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(
    readFileSync(join(root, "design-system/js/signalterrain/wds-signalterrain-cyber-ingest.js"), "utf8"),
    sandbox
  );
  vm.runInNewContext(
    readFileSync(join(root, "design-system/js/signalterrain/wds-signalterrain-cyber-connectors.js"), "utf8"),
    sandbox
  );
  return sandbox;
}

const docs = [
  "docs/CYBER-INGESTION-ARCHITECTURE.md",
  "docs/CYBER-NORMALIZATION.md",
  "docs/CYBER-PROVENANCE.md",
  "docs/CYBER-CACHE.md"
];
for (const d of docs) ok(existsSync(join(root, d)), `doc ${d}`);

ok(existsSync(join(root, "apps/signalterrain/cyber/ingest-health.html")), "health UI");
ok(
  existsSync(join(root, "design-system/js/signalterrain/wds-signalterrain-cyber-ingest.js")),
  "ingest runtime"
);
ok(
  existsSync(join(root, "design-system/js/signalterrain/wds-signalterrain-cyber-connectors.js")),
  "connectors runtime"
);

const index = readJson("index.json");
ok(index.principles?.some((p) => /No source knows/i.test(p)), "isolation principle");
ok(index.notInScopeV01?.some((x) => /IDS/i.test(x)), "IDS out of scope");

const connectorSchema = readJson("schema-connector-v0.1.json");
for (const f of [
  "name",
  "category",
  "refreshInterval",
  "reliability",
  "lastSuccessfulUpdate",
  "lastFailure",
  "version",
  "supportedDataTypes",
  "rateLimits",
  "attribution"
]) {
  ok(!!connectorSchema.properties[f], `connector field ${f}`);
}

const categories = [
  "security-advisory",
  "vendor-advisory",
  "vulnerability-database",
  "government-advisory",
  "security-news",
  "ransomware-tracking",
  "patch-bulletin",
  "threat-intel-blog",
  "academic-publication"
];
const connectorsDoc = readJson("connectors.json");
ok(connectorsDoc.connectors?.length >= 9, "nine connector scaffolds");
ok(
  categories.every((c) => connectorsDoc.connectors.some((x) => x.category === c)),
  "all categories present"
);
ok(
  connectorsDoc.connectors.every(
    (c) =>
      c.honesty?.neverFabricate === true &&
      c.honesty?.noExploitPayloads === true &&
      c.normalizeContract?.output === "normalized-record[]"
  ),
  "connectors honesty + normalize contract"
);

const rawDir = join(pkg, "samples/raw");
const rawFiles = readdirSync(rawDir).filter((f) => f.endsWith(".json") && !f.includes(".v2"));
ok(rawFiles.length >= 9, "raw fixtures for connectors");

readJson("schema-normalized-record-v0.1.json");
readJson("schema-provenance-v0.1.json");
readJson("schema-change-event-v0.1.json");
readJson("schema-cache-entry-v0.1.json");
readJson("schema-connector-health-v0.1.json");

const sand = loadPipelineSandbox();
const I = sand.WDS.signalTerrainCyberIngest;
const Conn = sand.WDS.signalTerrainCyberConnectors;
ok(!!I, "ingest API");
ok(!!Conn, "connectors API");

const registry = Conn.createRegistry(connectorsDoc);
ok(registry.normalizers.length >= 9, "normalizer per connector category set");

const nvdRaw = JSON.parse(readFileSync(join(rawDir, "conn_nvd-cve.json"), "utf8"));
const cisaRaw = JSON.parse(readFileSync(join(rawDir, "conn_cisa-gov.json"), "utf8"));
const curatedRaw = JSON.parse(readFileSync(join(rawDir, "conn_security-advisories-curated.json"), "utf8"));

const nvdConn = registry.get("conn_nvd-cve");
const cisaConn = registry.get("conn_cisa-gov");
const curatedConn = registry.get("conn_security-advisories-curated");

const normNvd = Conn.NORMALIZERS["conn_nvd-cve"](nvdConn, nvdRaw);
const normCisa = Conn.NORMALIZERS["conn_cisa-gov"](cisaConn, cisaRaw);
const normCurated = Conn.NORMALIZERS["conn_security-advisories-curated"](curatedConn, curatedRaw);

ok(normNvd.every((r) => r.recordType === "shared-vulnerability"), "NVD → shared-vulnerability");
ok(normNvd.every((r) => r.provenance?.length >= 1), "NVD provenance");
ok(normCisa.some((r) => r.advisoryIds?.length), "CISA advisory ids");
ok(
  normNvd.every((r) => !("cvssMetricV31" in r) && !("configurations" in r)),
  "no NVD-specific fields leaked"
);

const flat = normNvd.concat(normCisa, normCurated);
const deduped = I.dedupePreserveAttribution(flat);
const log4 = deduped.records.find((r) => (r.cveIds || []).includes("CVE-2021-44228"));
ok(!!log4, "Log4Shell cluster exists");
ok(log4.provenance.length >= 2, "dedupe keeps multi-source provenance");
const provQ = I.answerProvenanceQuestions(log4);
ok(provQ.independentSources >= 2, "independent source count");
ok(provQ.confidence && provQ.severity, "confidence separate from severity fields present");

const before = {
  id: "nir_x",
  severity: "high",
  products: ["a"],
  references: ["u1"],
  advisoryIds: [],
  verified: false,
  recordType: "shared-vulnerability",
  title: "t",
  provenance: [
    { connectorId: "conn_nvd-cve", retrievedAt: "2026-07-18T00:00:00Z", sourceLabel: "NVD", verified: true }
  ]
};
const after = {
  ...before,
  severity: "critical",
  products: ["a", "b"],
  references: ["u1", "u2"],
  advisoryIds: ["KEV-1"],
  verified: true
};
const changes = I.detectChanges(before, after);
ok(changes.some((c) => c.changeType === "severity-revised"), "severity change");
ok(changes.some((c) => c.changeType === "affected-products-added"), "products change");
ok(changes.some((c) => c.changeType === "exploitation-confirmed"), "kev change");
ok(changes.every((c) => c.summary && c.provenance?.length), "change summaries + provenance");

const cacheEntry = I.writeCache(nvdConn, { records: normNvd }, { latencyMs: 12 });
ok(cacheEntry.connectorId === "conn_nvd-cve" && cacheEntry.ok, "cache write");
const cacheRead = I.readCache("conn_nvd-cve");
ok(cacheRead.hit && cacheRead.payload.records.length === normNvd.length, "cache read");
const health = I.buildHealth(nvdConn, {
  objectsIngested: normNvd.length,
  objectsNormalized: normNvd.length,
  objectsRejected: 0,
  averageLatencyMs: 12
});
ok(health.trustLevel && health.objectsNormalized >= 1, "health row");

const bad = I.finalizeNormalized(
  I.baseRecord({
    id: "nir_bad",
    recordType: "research-item",
    title: "bad",
    summary: "includes exploit payload instructions",
    publishedAt: null,
    retrievedAt: new Date().toISOString(),
    severity: "high",
    confidence: "low",
    provenance: [I.makeProvenance(nvdConn, { retrievedAt: new Date().toISOString() })],
    identityKeys: {}
  })
);
ok(bad.meta.status === "rejected", "reject exploit language");

const arch = readFileSync(join(root, "docs/CYBER-INGESTION-ARCHITECTURE.md"), "utf8");
ok(/independently/i.test(arch), "architecture isolation");
ok(/mermaid|flowchart|Data flow/i.test(arch), "architecture diagram");

const healthHtml = readFileSync(join(root, "apps/signalterrain/cyber/ingest-health.html"), "utf8");
ok(/noindex/i.test(healthHtml), "health page noindex");
ok(/maintenance only|Development/i.test(healthHtml), "health page internal");

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nCyber Intelligence Ingestion Pipeline V0.1 contracts OK");
