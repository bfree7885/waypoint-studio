#!/usr/bin/env node
/**
 * Adaptive Cyber Defense Advisor V1.0 — contract + reasoning smoke tests.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = join(root, "design-system/signalterrain/intelligence/cyber/advisor");
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
    fetch: async (url) => {
      const path = String(url).replace(/^\.\.\//g, "").replace(/^(\.\.\/)+/, "");
      // Not used when we pass factors/rules directly
      throw new Error("fetch: " + url);
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
    "design-system/js/signalterrain/wds-signalterrain-cyber-priority.js",
    "design-system/js/signalterrain/wds-signalterrain-inventory.js",
    "design-system/js/signalterrain/wds-signalterrain-cyber-advisor.js"
  ]) {
    vm.runInNewContext(readFileSync(join(root, rel), "utf8"), sandbox);
  }
  return sandbox;
}

const docs = [
  "docs/ADAPTIVE-DEFENSE-ADVISOR.md",
  "docs/SECURITY-PROFILES.md",
  "docs/EXPOSURE-ANALYSIS.md",
  "docs/CYBER-SEASONS.md",
  "docs/REASONING-ENGINE.md"
];
for (const d of docs) ok(existsSync(join(root, d)), `doc ${d}`);

ok(existsSync(join(root, "apps/signalterrain/cyber/advisor.html")), "advisor UI");
ok(
  existsSync(join(root, "design-system/js/signalterrain/wds-signalterrain-cyber-advisor.js")),
  "advisor runtime"
);
ok(
  existsSync(join(root, "design-system/js/signalterrain/wds-signalterrain-inventory.js")),
  "inventory runtime"
);

const index = readJson("index.json");
ok(index.philosophy?.some((p) => /noise/i.test(p)), "reduce noise philosophy");
ok(index.notInScopeV1?.some((x) => /Offensive/i.test(x)), "no offense");
ok(index.notInScopeV1?.some((x) => /Hidden scoring/i.test(x)), "no hidden scoring");

const profiles = readJson("security-profiles.json");
ok(profiles.environments.length >= 15, "environment catalog");
ok(profiles.environments.some((e) => e.id === "developer"), "developer env");
ok(profiles.environments.some((e) => e.id === "home-lab"), "home-lab env");

const seasons = readJson("cyber-seasons.json");
ok(seasons.seasons.some((s) => s.id === "season_ransomware"), "ransomware season");
ok(seasons.seasons.some((s) => s.id === "season_quiet"), "quiet season");

const sim = readJson("simulation-architecture.json");
ok(sim.status === "architecture-only", "simulation architecture-only");
ok((sim.questions || []).length >= 4, "simulation questions designed");

const invDev = readJson("samples/inventory.developer-homelab.json");
ok(invDev.items.some((i) => i.linkedEntityId === "cy_software-log4j"), "log4j inventory link");

const posture = readJson("posture-categories.json");
ok(posture.categories.length >= 9, "posture categories");

const sandbox = loadSandbox();
const Graph = sandbox.WDS.signalTerrainCyberGraph;
const Priority = sandbox.WDS.signalTerrainCyberPriority;
const Inventory = sandbox.WDS.signalTerrainInventory;
const Advisor = sandbox.WDS.signalTerrainCyberAdvisor;
ok(!!Advisor?.generateDailyAdvisor, "generateDailyAdvisor");
ok(!!Advisor?.analyzeExposure, "analyzeExposure");
ok(!!Advisor?.simulateDefensiveChange, "simulate stub");

const bundle = JSON.parse(readFileSync(join(cyber, "samples/cyber-intelligence.sample.json"), "utf8"));
const factors = JSON.parse(readFileSync(join(cyber, "priority-factors.json"), "utf8"));
const rules = JSON.parse(readFileSync(join(cyber, "priority-rules.json"), "utf8"));
const graph = Graph.createGraph(bundle);

Inventory.loadSample(invDev.items);
const profile = {
  id: "spf_test",
  environments: ["developer", "home-lab", "linux-desktop"],
  riskTolerance: "balanced"
};

const exposures = Advisor.analyzeExposure(graph, invDev.items, profile, { factors, rules });
const matched = exposures.filter((e) => e.match.status === "matched" || e.match.status === "possible");
ok(matched.length > 0, "profiles/inventory link to intelligence graph");
ok(
  matched.some((e) => /matters because/i.test((e.explanation.mattersBecause || []).join(" "))),
  "matters-because explanation"
);
const unlikely = exposures.filter((e) => e.safeToIgnoreCandidate);
ok(unlikely.length > 0, "safe-to-ignore candidates explained");
ok(
  unlikely.every((e) => (e.explanation.probablyDoesNotAffectBecause || []).length > 0),
  "does-not-affect explanation"
);
ok(
  matched.every((e) =>
    (e.priority?.contributions || []).some((c) => c.factorId === "inventory_match")
  ),
  "transparent inventory_match contribution"
);

const season = Advisor.detectSeason(graph, seasons, "season_ransomware");
ok(season.id === "season_ransomware", "season hint works");

const recs = Advisor.generateRecommendations(matched, season, profile);
ok(recs.length > 0, "recommendations generated");
ok(recs.every((r) => r.autoExecute === false), "never autoExecute");
ok(recs.every((r) => (r.evidence || []).length > 0), "recommendations have evidence");
ok(recs.every((r) => r.explainability?.whySeeingThis), "recommendation explainability");
ok(
  !JSON.stringify(recs).match(/exploit payload|attack simulation|run metasploit/i),
  "no offensive language"
);

const brief = Advisor.generateDailyAdvisor({
  graph,
  inventoryItems: invDev.items,
  profile,
  seasonsDoc: seasons,
  postureCategories: posture.categories,
  seasonHint: "season_patch_tuesday",
  factors,
  rules,
  persistSnapshot: true,
  previousSnapshot: { exposureIds: [], recommendationIds: [], patchIds: [] }
});
ok(brief.changes.length <= 3 && brief.changes.length > 0, "daily changes capped");
ok(brief.actions.length <= 3, "daily actions capped");
ok(brief.estimatedReviewMinutes >= 5, "review minutes");
ok(brief.season.label, "season on brief");
ok(brief.posture.length >= 9, "posture rows");
ok(brief.whatChanged, "what-changed present");

const brief2 = Advisor.generateDailyAdvisor({
  graph,
  inventoryItems: invDev.items,
  profile,
  seasonsDoc: seasons,
  postureCategories: posture.categories,
  seasonHint: "season_patch_tuesday",
  factors,
  rules,
  persistSnapshot: true
});
ok(/unchanged|Changes detected|No material/i.test(brief2.whatChanged.summary), "snapshot diff runs");

// Profile influence: cautious vs accepting on same exposures
const recCautious = Advisor.generateRecommendations(matched, season, {
  ...profile,
  riskTolerance: "cautious"
});
const recAccept = Advisor.generateRecommendations(matched, season, {
  ...profile,
  riskTolerance: "accepting"
});
ok(recCautious.length && recAccept.length, "both risk tolerances produce recs");

const stub = Advisor.simulateDefensiveChange("sim_patch_today", { inventoryItemId: "inv_log4j" }, {
  graph
});
ok(stub.status === "architecture-stub", "simulation stub");
ok(stub.confidence === "insufficient", "simulation refuses fake confidence");

const home = readJson("samples/inventory.home-user.json");
const homeExp = Advisor.analyzeExposure(graph, home.items, {
  id: "spf_home",
  environments: ["home-user", "windows-workstation"],
  riskTolerance: "cautious"
}, { factors, rules });
ok(
  homeExp.some((e) => e.match.status === "matched" && /windows/i.test(e.inventoryName || "")),
  "home profile inventory influences matches"
);

const archDoc = readFileSync(join(root, "docs/ADAPTIVE-DEFENSE-ADVISOR.md"), "utf8");
ok(/shared services|Do not duplicate/i.test(archDoc), "docs shared architecture");
ok(/```/.test(archDoc), "architecture diagram");

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nAll adaptive defense advisor tests passed.");
