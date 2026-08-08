#!/usr/bin/env node
/**
 * SignalTerrain Cyber Live — isolation + contract tests.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

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

const docs = [
  "docs/SIGNALTERRAIN-CYBER-REAL-DATA-AUDIT.md",
  "docs/SIGNALTERRAIN-CYBER-DATA-SOURCES.md",
  "docs/SIGNALTERRAIN-CYBER-PRIORITY-MODEL.md",
  "docs/SIGNALTERRAIN-CYBER-TECH-PROFILE.md",
  "docs/SIGNALTERRAIN-CYBER-OPERATIONS.md"
];
for (const d of docs) ok(existsSync(join(root, d)), `doc ${d}`);

ok(existsSync(join(root, "scripts/signalterrain-cyber-live-engine.mjs")), "live engine script");
ok(existsSync(join(root, "apps/signalterrain/cyber/live.html")), "live UI");
ok(existsSync(join(root, "apps/signalterrain/cyber/teaching.html")), "teaching UI isolated");
ok(existsSync(join(root, "design-system/js/signalterrain/wds-signalterrain-cyber-live.js")), "live runtime");
ok(existsSync(join(root, "automation/cyber/.env.example")), "env example");

const liveJs = readFileSync(join(root, "design-system/js/signalterrain/wds-signalterrain-cyber-live.js"), "utf8");
ok(!/loadJson\([^)]*sample\.json/.test(liveJs), "live runtime does not loadJson sample files");
ok(!/fetch\([^)]*sample\.json/.test(liveJs), "live runtime does not fetch sample files");
ok(/BANNED_SAMPLE_PATHS/.test(liveJs), "live runtime bans sample paths");
ok(/No verified cyber intelligence has been retrieved yet/.test(liveJs), "honest empty state");

const liveHtml = readFileSync(join(root, "apps/signalterrain/cyber/live.html"), "utf8");
ok(!/\b(sample threat|demo vulnerability|example incident|mock advisory)\b/i.test(liveHtml), "live HTML has no mock labels");
ok(/data\/cyber\/live\.json/.test(liveHtml), "live HTML points at live artifact");

const indexHtml = readFileSync(join(root, "apps/signalterrain/cyber/index.html"), "utf8");
ok(/live\.html/.test(indexHtml), "cyber index redirects to live");

const teachingHtml = readFileSync(join(root, "apps/signalterrain/cyber/teaching.html"), "utf8");
ok(/Teaching samples only/i.test(teachingHtml), "teaching banner present");

const livePath = join(root, "data/cyber/live.json");
ok(existsSync(livePath), "live artifact present (run engine if missing)");
if (existsSync(livePath)) {
  const live = JSON.parse(readFileSync(livePath, "utf8"));
  ok(Array.isArray(live.records), "live records array");
  ok(live.records.length > 0, "live records non-empty");
  ok(live.meta && live.meta.trustState, "trust state present");
  ok(
    live.records.every((r) => r.source && r.source.providerId && r.retrievedAt),
    "every record has source + retrievedAt"
  );
  ok(
    !live.records.some((r) => /sample|fixture|demo-threat/i.test(JSON.stringify(r.source || {}))),
    "no sample-labeled sources in live records"
  );
  const kev = live.records.filter((r) => r.source?.providerId === "cisa-kev");
  ok(kev.length > 0, "CISA KEV records present");
  ok(
    live.records.every((r) => r.priority && typeof r.priority.score === "number" && r.priority.explanation),
    "priority scores + explanations"
  );
  const providers = live.providers || [];
  ok(providers.some((p) => p.providerId === "cisa-kev" && p.status === "ok"), "KEV provider ok");
  ok(providers.some((p) => p.status === "planned"), "planned providers not faked as ok");
}

const sandbox = {
  console,
  Date,
  JSON,
  Math,
  localStorage: {
    store: new Map(),
    setItem(k, v) {
      this.store.set(k, String(v));
    },
    getItem(k) {
      return this.store.has(k) ? this.store.get(k) : null;
    },
    removeItem(k) {
      this.store.delete(k);
    }
  },
  location: { hash: "", search: "" },
  addEventListener() {},
  fetch() {
    throw new Error("fetch blocked in unit test");
  }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(readFileSync(join(root, "design-system/js/signalterrain/wds-signalterrain-util.js"), "utf8"), sandbox);
vm.runInNewContext(readFileSync(join(root, "design-system/js/signalterrain/wds-signalterrain-inventory.js"), "utf8"), sandbox);
vm.runInNewContext(readFileSync(join(root, "design-system/js/signalterrain/wds-signalterrain-cyber-live.js"), "utf8"), sandbox);

const Live = sandbox.WDS.signalTerrainCyberLive;
ok(!!Live?.matchProfile, "matchProfile export");
ok(!!Live?.rescore, "rescore export");

const adaptiveNav = /\[\s*"adaptive"\s*,\s*"Adaptive Defense"\s*\]/.test(liveJs);
ok(adaptiveNav, "Adaptive Defense nav entry");
ok(/has not inspected your devices/i.test(liveJs), "live UI device non-inspection language");

if (existsSync(livePath)) {
  const liveAd = JSON.parse(readFileSync(livePath, "utf8"));
  ok(liveAd.adaptiveDefense && liveAd.adaptiveDefense.question, "adaptiveDefense in live artifact");
}

const fakeRec = {
  title: "Firefox security update",
  summary: "Fixes in Mozilla Firefox",
  entities: { vendors: ["Mozilla"], products: ["Firefox"] },
  priority: {
    contributions: [
      { factorId: "kev_or_known_exploited", points: 35, maxPoints: 35, reason: "KEV" },
      { factorId: "profile_none", points: 0, maxPoints: 18, reason: "none" }
    ]
  }
};
sandbox.WDS.signalTerrainInventory.upsert({
  id: "inv_test_ff",
  name: "Firefox",
  category: "browser",
  vendor: "Mozilla"
});
const scored = Live.rescore(fakeRec, sandbox.WDS.signalTerrainInventory.list());
ok(scored.profileMatch.level === "exact" || scored.profileMatch.level === "vendor", "profile match works");
ok(scored.score >= 35, "rescore includes base factors");
ok(/Direct product match|Possible vendor match/i.test(scored.explanation), "explanation mentions match");

if (failed) {
  console.error(`\n${failed} live cyber test(s) failed`);
  process.exit(1);
}
console.log("\nAll cyber live tests passed.");
