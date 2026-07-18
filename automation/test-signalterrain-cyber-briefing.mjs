#!/usr/bin/env node
/**
 * Daily Cyber Intelligence Briefing Engine V0.1 — contract + behavior smoke tests.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = join(root, "design-system/signalterrain/intelligence/cyber/briefing");
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

function loadBriefSandbox() {
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
  for (const rel of [
    "design-system/js/signalterrain/wds-signalterrain-cyber-priority.js",
    "design-system/js/signalterrain/wds-signalterrain-cyber-ingest.js",
    "design-system/js/signalterrain/wds-signalterrain-cyber-brief.js"
  ]) {
    vm.runInNewContext(readFileSync(join(root, rel), "utf8"), sandbox);
  }
  return sandbox;
}

const docs = [
  "docs/CYBER-BRIEFING-ENGINE.md",
  "docs/CYBER-DAILY-BRIEF.md",
  "docs/CYBER-EXPLAINABILITY.md"
];
for (const d of docs) ok(existsSync(join(root, d)), `doc ${d}`);

ok(existsSync(join(root, "apps/signalterrain/cyber/brief.html")), "brief UI");
ok(
  existsSync(join(root, "design-system/js/signalterrain/wds-signalterrain-cyber-brief.js")),
  "brief runtime"
);

const index = readJson("index.json");
ok(index.philosophy?.some((p) => /anxiety/i.test(p)), "anxiety philosophy");
ok(index.notInScopeV01?.some((x) => /Hardcoded/i.test(x)), "no hardcoded summaries");
ok(index.notInScopeV01?.some((x) => /Hidden ranking/i.test(x)), "no hidden ranking");

const sections = readJson("sections.json");
const requiredSections = [
  "todays-summary",
  "new-since-yesterday",
  "highest-priority",
  "new-vulnerabilities",
  "active-exploitation",
  "major-vendor-advisories",
  "patch-highlights",
  "emerging-trends",
  "research-worth-reading",
  "things-to-watch",
  "confidence-summary"
];
ok(
  requiredSections.every((id) => sections.sections.some((s) => s.id === id)),
  "required brief sections"
);
ok((sections.dashboardPanels || []).length >= 8, "dashboard panels");

const profiles = readJson("audience-profiles.json");
ok(profiles.profiles.length >= 8, "eight audience profiles");
ok(
  profiles.purpose && /emphasis/i.test(profiles.purpose),
  "profiles change emphasis not facts"
);

const emptyStates = readJson("empty-states.json");
ok(Object.keys(emptyStates.messages || {}).length >= 8, "empty-state messages");

const toneRules = readJson("tone-rules.json");
ok((toneRules.forbidPhrases || []).includes("panic"), "tone forbid panic");

const sampleNames = [
  "quiet-day",
  "patch-tuesday",
  "critical-disclosure",
  "ransomware-campaign",
  "cloud-outage"
];
for (const s of sampleNames) {
  ok(existsSync(join(pkg, "samples", s + ".brief.json")), `sample ${s}`);
}

const sandbox = loadBriefSandbox();
const Brief = sandbox.WDS.signalTerrainCyberBrief;
ok(!!Brief?.generateBrief, "generateBrief export");
ok(!!Brief?.buildExplainItem, "buildExplainItem export");
ok(!!Brief?.checkTone, "checkTone export");

const factors = JSON.parse(readFileSync(join(cyber, "priority-factors.json"), "utf8"));
const rules = JSON.parse(readFileSync(join(cyber, "priority-rules.json"), "utf8"));
const bundle = JSON.parse(readFileSync(join(cyber, "samples/cyber-intelligence.sample.json"), "utf8"));
const research = JSON.parse(readFileSync(join(cyber, "samples/research-workspace.sample.json"), "utf8"));
const profileDev = profiles.profiles.find((p) => p.id === "developers");
const profileGen = profiles.profiles.find((p) => p.id === "general-tech");

const previousSnapshot = {};
for (const e of bundle.entities) {
  if (e.severity === "critical") {
    previousSnapshot[e.id] = {
      severity: "elevated",
      products: [],
      references: [],
      advisoryIds: [],
      verified: false,
      at: "2026-07-17T12:00:00Z"
    };
  }
}

const quiet = Brief.generateBrief({
  entities: bundle.entities,
  profile: profileGen,
  factors,
  rules,
  sections,
  emptyStates,
  toneRules,
  scenario: "quiet-day",
  previousSnapshot: {},
  researchItems: research.items
});
ok(quiet.toneCheck.ok, "quiet-day tone calm");
ok(quiet.sections["active-exploitation"].empty === true, "quiet-day empty active exploitation");
ok(quiet.sections["active-exploitation"].emptyMessage, "useful empty message");
ok(quiet.headline && !/breaking/i.test(quiet.headline), "no clickbait headline");

const critical = Brief.generateBrief({
  entities: bundle.entities,
  profile: profileDev,
  factors,
  rules,
  sections,
  emptyStates,
  toneRules,
  scenario: "critical-disclosure",
  previousSnapshot,
  researchItems: research.items
});
ok(critical.toneCheck.ok, "critical-disclosure tone calm");
ok(critical.sections["highest-priority"].items.length > 0, "critical has priority items");

const explainFields = [
  "whyIncludedToday",
  "whatChanged",
  "whoIsAffected",
  "whatIsKnown",
  "whatIsUncertain",
  "readNext",
  "citations",
  "priority"
];
const sampleItem = critical.sections["highest-priority"].items[0];
ok(
  explainFields.every((f) => sampleItem[f] != null),
  "explain fields present on highlighted item"
);
ok(
  sampleItem.priority.contributions && sampleItem.priority.contributions.length > 0,
  "priority contributions present"
);
ok(
  /Included because transparent priority/i.test(sampleItem.whyIncludedToday),
  "why text references transparent priority"
);

const highBand = critical.sections["highest-priority"].items.filter(
  (it) => it.priority.band === "high" || it.priority.band === "urgent"
);
ok(
  highBand.every((it) => (it.priority.contributions || []).length > 0),
  "high/urgent always justified by contributions"
);

ok(critical.sections["new-since-yesterday"].items.length >= 0, "timeline section exists");
ok(
  critical.readingQueue && critical.readingQueue.length > 0,
  "reading queue populated"
);
ok(
  critical.readingQueue.every((r) => r.estimatedMinutes >= 1 && r.attribution),
  "reading minutes + attribution"
);

const outage = Brief.generateBrief({
  entities: bundle.entities,
  profile: profiles.profiles.find((p) => p.id === "educators"),
  factors,
  rules,
  sections,
  emptyStates,
  toneRules,
  scenario: "cloud-outage",
  previousSnapshot: {},
  researchItems: research.items
});
ok(outage.toneCheck.ok, "cloud-outage tone calm");
ok(/infrastructure|quiet/i.test(outage.headline + " " + (outage.sections["emerging-trends"].narrative || "")), "outage narrative adapts");

// Same facts, different emphasis: two profiles over identical entity set
const a = Brief.generateBrief({
  entities: bundle.entities,
  profile: profileGen,
  factors,
  rules,
  sections,
  emptyStates,
  toneRules,
  scenario: "patch-tuesday",
  previousSnapshot,
  researchItems: []
});
const b = Brief.generateBrief({
  entities: bundle.entities,
  profile: profiles.profiles.find((p) => p.id === "it-admins"),
  factors,
  rules,
  sections,
  emptyStates,
  toneRules,
  scenario: "patch-tuesday",
  previousSnapshot,
  researchItems: []
});
const entityItems = (brief) =>
  Object.entries(brief.sections)
    .filter(([id]) => id !== "research-worth-reading" && id !== "confidence-summary")
    .flatMap(([, s]) => s.items || [])
    .filter((it) => it.subjectId && String(it.subjectId).startsWith("cy_"));
const bySubject = (brief) => {
  const m = new Map();
  for (const it of entityItems(brief)) {
    if (!m.has(it.subjectId)) m.set(it.subjectId, it);
  }
  return m;
};
const mapA = bySubject(a);
const mapB = bySubject(b);
ok(mapA.size > 0 && mapB.size > 0, "profiles produce items");
let factDrift = 0;
for (const [id, ia] of mapA) {
  const ib = mapB.get(id);
  if (!ib) continue;
  if (ia.summary !== ib.summary || ia.title !== ib.title) factDrift += 1;
}
ok(factDrift === 0, "profiles do not alter factual summaries");

const panic = Brief.checkTone("Please panic now", toneRules);
ok(!panic.ok && panic.flags.includes("panic"), "tone flags panic");

const calm = Brief.checkTone("Worth noticing with calm priority", toneRules);
ok(calm.ok, "preferred calm language passes");

// Samples on disk were engine-generated (have engineVersion)
const sampleDir = join(pkg, "samples");
for (const f of readdirSync(sampleDir).filter((n) => n.endsWith(".brief.json"))) {
  const sample = JSON.parse(readFileSync(join(sampleDir, f), "utf8"));
  ok(sample.meta?.engineVersion, `engineVersion in ${f}`);
  ok(sample.sections?.["confidence-summary"], `confidence in ${f}`);
}

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nAll cyber briefing tests passed.");
