#!/usr/bin/env node
/**
 * Adaptive Defense — unit tests (fixtures) + live artifact contract checks.
 * Fixtures are for tests only; production loaders must refuse demo modes.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildAdaptiveDefense,
  actionToCategory,
  DEFENSE_CATEGORIES,
  ADAPTIVE_DEFENSE_VERSION
} from "../scripts/cyber-signal/adaptive-defense.mjs";
import { recommendAction, enrichRecord } from "../scripts/cyber-signal/signal-engine.mjs";

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

ok(ADAPTIVE_DEFENSE_VERSION === "1.0.0", "adaptive defense version");
ok(DEFENSE_CATEGORIES.includes("PATCH / UPDATE"), "PATCH category");
ok(DEFENSE_CATEGORIES.includes("MITIGATE"), "MITIGATE category");
ok(DEFENSE_CATEGORIES.includes("REVIEW"), "REVIEW category");
ok(DEFENSE_CATEGORIES.includes("WATCH"), "WATCH category");
ok(DEFENSE_CATEGORIES.includes("NO IMMEDIATE ACTION"), "NO IMMEDIATE ACTION category");

const fixtureKev = {
  id: "live_kev_cve-2099-0001",
  type: "exploited-vulnerability",
  title: "Example Vendor Edge Appliance RCE",
  summary: "Fixture-only record for unit tests — not used in production.",
  publishedAt: "2099-01-02T00:00:00.000Z",
  updatedAt: "2099-01-02T00:00:00.000Z",
  retrievedAt: "2099-01-02T00:00:00.000Z",
  source: {
    providerId: "cisa-kev",
    providerName: "CISA KEV (fixture)",
    sourceUrl: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
    authorityLevel: "official"
  },
  identifiers: { cves: ["CVE-2099-0001"] },
  entities: { vendors: ["ExampleVendor"], products: ["EdgeGate"] },
  severity: { label: "critical", cvssScore: 9.8 },
  exploitation: {
    knownExploited: true,
    exploitationEvidence: "official-confirmed",
    ransomwareLinked: true
  },
  remediation: { patchesAvailable: true, summary: "Apply vendor update" },
  confidence: "confirmed",
  priority: {
    score: 95,
    band: "Immediate",
    contributions: [
      { factorId: "kev_or_known_exploited", points: 35, maxPoints: 35, reason: "Official known-exploited evidence (e.g. CISA KEV)." },
      { factorId: "ransomware_linked", points: 12, maxPoints: 12, reason: "Source associates this with ransomware campaigns." }
    ],
    explanation: "Priority 95 — Immediate."
  }
};

const fixtureQuiet = {
  id: "live_status_fixture_ok",
  type: "service-outage",
  title: "Example Cloud — All Systems Operational",
  summary: "Fixture healthy status",
  retrievedAt: "2099-01-02T00:00:00.000Z",
  source: {
    providerId: "fixture-status",
    providerName: "Fixture Status",
    sourceUrl: "https://example.invalid/status",
    authorityLevel: "authoritative"
  },
  identifiers: { cves: [] },
  entities: {},
  severity: { label: "unknown" },
  exploitation: { knownExploited: false },
  remediation: {},
  confidence: "high",
  rawProviderMetadata: { healthy: true },
  priority: { score: 5, band: "Informational", contributions: [], explanation: "Quiet" }
};

const enriched = Object.assign({}, fixtureKev, { enrichment: enrichRecord(fixtureKev) });
enriched.recommendation = recommendAction(enriched, enriched.enrichment);
ok(enriched.recommendation.defenseCategory === "PATCH / UPDATE", "KEV+patch → PATCH / UPDATE");

const mitigated = JSON.parse(JSON.stringify(enriched));
mitigated.remediation = { patchesAvailable: false };
mitigated.enrichment = enrichRecord(mitigated);
mitigated.recommendation = recommendAction(mitigated, mitigated.enrichment);
ok(mitigated.recommendation.defenseCategory === "MITIGATE", "KEV without patch → MITIGATE");

ok(
  actionToCategory("monitor", {}, { priority: { score: 50 } }) === "WATCH",
  "monitor → WATCH"
);
ok(
  actionToCategory("ignore", {}, fixtureQuiet) === "NO IMMEDIATE ACTION",
  "ignore → NO IMMEDIATE ACTION"
);

const bundle = buildAdaptiveDefense([enriched, fixtureQuiet], {
  previousRecords: [],
  generatedAt: "2099-01-02T12:00:00.000Z"
});
ok(bundle.headline.length >= 1, "headline has items");
ok(bundle.headline[0].whyThisMovedUp.length >= 1, "whyThisMovedUp present");
ok(bundle.headline[0].evidence.length >= 1, "evidence present");
ok(bundle.headline[0].affectedProducts.includes("EdgeGate"), "affected products");
ok(bundle.headline[0].confidence && bundle.headline[0].confidence.level, "confidence");
ok(bundle.headline[0].lastUpdated, "lastUpdated");
ok(
  /has not inspected your devices/i.test(bundle.headline[0].disclaimer),
  "device non-inspection disclaimer on items"
);
ok(
  bundle.disclaimers.some((d) => /has not inspected your devices/i.test(d)),
  "bundle disclaimer"
);
ok(!JSON.stringify(bundle).includes("exploit payload"), "no exploit payload language");

const livePath = join(root, "data/cyber/live.json");
ok(existsSync(livePath), "live artifact present");
if (existsSync(livePath)) {
  const live = JSON.parse(readFileSync(livePath, "utf8"));
  ok(live.adaptiveDefense, "live.json includes adaptiveDefense");
  if (live.adaptiveDefense) {
    ok(live.adaptiveDefense.version, "adaptiveDefense.version");
    ok(Array.isArray(live.adaptiveDefense.headline), "adaptiveDefense.headline");
    ok(
      live.adaptiveDefense.disclaimers?.some((d) => /has not inspected your devices/i.test(d)),
      "live adaptiveDefense disclaimer"
    );
    ok(
      !/sample|fixture|demo-threat/i.test(JSON.stringify(live.adaptiveDefense.headline || []).slice(0, 5000)) ||
        (live.adaptiveDefense.headline || []).length === 0,
      "headline not sample-labeled"
    );
    const sample = (live.adaptiveDefense.headline || [])[0];
    if (sample) {
      ok(sample.whyThisMovedUp?.length >= 1, "live example has whyThisMovedUp");
      ok(sample.evidence?.length >= 1, "live example has evidence");
      ok(sample.category && DEFENSE_CATEGORIES.includes(sample.category), "live category valid");
      console.log(
        "live example:",
        sample.category,
        "|",
        String(sample.title).slice(0, 80),
        "| score",
        sample.priorityScore
      );
    }
  }
  ok(
    (live.records || []).every((r) => !r.recommendation || r.recommendation.defenseCategory),
    "records carry defenseCategory when recommended"
  );
}

const liveJs = readFileSync(
  join(root, "design-system/js/signalterrain/wds-signalterrain-cyber-live.js"),
  "utf8"
);
ok(/Adaptive Defense/.test(liveJs), "UI mentions Adaptive Defense");
ok(/has not inspected your devices/i.test(liveJs), "UI states devices not inspected");
ok(/#adaptive/.test(liveJs) || /\["adaptive"/.test(liveJs), "adaptive nav route");

const wf = join(root, ".github/workflows/signalterrain-cyber-refresh.yml");
ok(existsSync(wf), "GH Actions cyber refresh workflow");
ok(/cron: "15 \*\/6/.test(readFileSync(wf, "utf8")), "6-hour cadence documented in workflow");

if (failed) {
  console.error(`\n${failed} adaptive defense test(s) failed`);
  process.exit(1);
}
console.log("\nAll adaptive defense tests passed.");
