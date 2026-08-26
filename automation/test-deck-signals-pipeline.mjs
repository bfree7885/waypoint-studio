#!/usr/bin/env node
/**
 * Deck signals real-data pipeline — contract + honesty gates.
 * Rejects sample/mock/fixture leakage in Deck-internal artifacts.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDashboardViews } from "../scripts/deck-signals/lib/dashboard-views.mjs";

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

const FORBIDDEN = [
  /CVE-SAMPLE/i,
  /\bSAMPLE DATA\b/i,
  /Mockup only/i,
  /Not live intelligence/i,
  /cyber-intelligence\.sample\.json/i,
  /fixture.?threat/i,
  /demo-threat/i,
  /illustrative placeholders/i
];

function assertNoForbidden(blob, label) {
  for (const re of FORBIDDEN) {
    ok(!re.test(blob), `${label} free of ${re}`);
  }
}

// --- Artifacts present ---
ok(existsSync(join(root, "data/cyber/live.json")), "live.json present");
ok(existsSync(join(root, "data/cyber/health.json")), "health.json present");
ok(existsSync(join(root, "data/cyber/dashboard.json")), "dashboard.json present");
ok(existsSync(join(root, "scripts/deck-signals/live-engine.mjs")), "deck signals live engine");
ok(existsSync(join(root, ".github/workflows/deck-signals-refresh.yml")), "refresh workflow present");

const live = JSON.parse(read("data/cyber/live.json"));
const health = JSON.parse(read("data/cyber/health.json"));
const dash = JSON.parse(read("data/cyber/dashboard.json"));

ok(Array.isArray(live.records) && live.records.length > 0, "live records non-empty");
ok(live.meta?.dataState === "REAL" || live.meta?.dataState === "CACHED REAL" || live.meta?.trustState, "honesty/trust present");
assertNoForbidden(JSON.stringify(live.records.slice(0, 30)), "live record sample");
assertNoForbidden(JSON.stringify(dash), "dashboard artifact");

const kev = live.records.filter((r) => r.source?.providerId === "cisa-kev");
const nvd = live.records.filter((r) => r.source?.providerId === "nvd");
const adv = live.records.filter((r) => r.source?.providerId === "cisa-advisories");

ok(kev.length > 0, "KEV records present (real)");
ok(nvd.length > 0, "NVD records present (real)");
ok(adv.length > 0, "CISA advisory records present (real)");

ok(
  kev.every((r) => /^CVE-\d{4}-\d+$/i.test((r.identifiers?.cves || [])[0] || "")),
  "KEV CVE IDs match CVE pattern"
);
ok(
  kev.every((r) => r.exploitation?.knownExploited === true),
  "KEV marked knownExploited"
);
ok(
  kev.every((r) => /cisa\.gov/i.test(r.source?.sourceUrl || "")),
  "KEV source links to CISA"
);

const enriched = kev.filter((r) => r.nvdEnrichment?.enriched);
ok(
  enriched.length > 0 || (live.meta?.nvdEnrichment?.attempted || 0) === 0,
  "NVD enrichment ran or was skipped explicitly"
);
if (enriched.length) {
  ok(
    enriched.every((r) => (r.identifiers?.cves || [])[0] && r.nvdEnrichment.sourceUrl.includes(r.identifiers.cves[0])),
    "enriched KEV CVEs match NVD detail URLs"
  );
  ok(
    enriched.some((r) => r.nvdEnrichment.cvssScore != null || r.nvdEnrichment.description),
    "enriched KEV carry CVSS or NVD description"
  );
}

ok(
  adv.every((r) => r.title && r.source?.sourceUrl),
  "advisories have title + source link"
);
ok(
  !adv.some((r) => /sample advisory|illustrative/i.test(r.title + (r.summary || ""))),
  "advisories are not sample-labeled"
);

ok(Array.isArray(dash.activelyExploitedKev) && dash.activelyExploitedKev.length > 0, "dashboard KEV panel data");
ok(Array.isArray(dash.newUpdatedNvd) && dash.newUpdatedNvd.length > 0, "dashboard NVD panel data");
ok(Array.isArray(dash.cisaAdvisories) && dash.cisaAdvisories.length > 0, "dashboard advisories panel data");
ok(Array.isArray(dash.sourceHealth) && dash.sourceHealth.length > 0, "dashboard source health");
ok(dash.absences?.threatLevel && /NO CURRENT DATA/i.test(dash.absences.threatLevel), "no fake threat level");
ok(dash.absences?.worldAttackMap && /NO CURRENT DATA/i.test(dash.absences.worldAttackMap), "no fake world map");
ok(
  dash.ransomwareSignal?.dataState === "REAL" ||
    dash.ransomwareSignal?.dataState === "CACHED REAL" ||
    dash.ransomwareSignal?.dataState === "NO CURRENT DATA",
  "ransomware honesty state"
);

const rebuilt = buildDashboardViews(live, health);
ok(rebuilt.activelyExploitedKev.length === dash.activelyExploitedKev.length, "dashboard views rebuild stably (KEV count)");

const sweepFiles = [
  "data/cyber/live.json",
  "data/cyber/health.json",
  "data/cyber/dashboard.json"
];
const HARD_SAMPLE = /CVE-SAMPLE-\d+|SAMPLE DATA|Mockup only|Not live intelligence/i;
const hitFiles = [];
for (const rel of sweepFiles) {
  const text = read(rel);
  if (HARD_SAMPLE.test(text)) hitFiles.push(rel);
}
ok(hitFiles.length === 0, "deck-signal artifacts free of sample markers" + (hitFiles.length ? ": " + hitFiles.join(", ") : ""));

ok(!/cyber-intelligence\.sample\.json/.test(read("data/cyber/dashboard.json")), "dashboard.json does not reference sample bundle");
ok(!/cyber-intelligence\.sample\.json/.test(read("data/cyber/live.json").slice(0, 5000)), "live.json head does not reference sample bundle");

// Provider health timestamps
const kevHealth = (health.providers || []).find((p) => p.providerId === "cisa-kev");
ok(kevHealth && (kevHealth.lastSuccessfulAt || kevHealth.status === "cached"), "KEV health timestamp");
ok(health.generatedAt, "health generatedAt for UI timestamps");

if (failed) {
  console.error(`\n${failed} real-data pipeline test(s) failed`);
  process.exit(1);
}
console.log("\nDeck-signals real-data pipeline tests passed.");
