#!/usr/bin/env node
/**
 * Deck signals live engine — artifact contract tests (no public product UI).
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

ok(existsSync(join(root, "scripts/deck-signals/live-engine.mjs")), "live engine script");
ok(existsSync(join(root, "scripts/deck-signals/lib/signal-engine.mjs")), "signal engine lib");
ok(existsSync(join(root, "data/cyber/live.json")), "live artifact");
ok(existsSync(join(root, "data/cyber/health.json")), "health artifact");
ok(existsSync(join(root, "data/cyber/dashboard.json")), "dashboard artifact");
ok(!existsSync(join(root, "apps/signalterrain/index.html")), "no public SignalTerrain app");
ok(!existsSync(join(root, "side-trails/signalterrain/index.html")), "no public SignalTerrain landing");

const engine = readFileSync(join(root, "scripts/deck-signals/live-engine.mjs"), "utf8");
ok(!/NEVER writes sample/.test(engine) || /never substitutes sample/i.test(engine) || /sample\/fixture/i.test(engine), "engine documents no-sample policy");
ok(/data\/cyber/.test(engine) || /OUT_DIR/.test(engine), "engine writes cyber artifact dir");

const live = JSON.parse(readFileSync(join(root, "data/cyber/live.json"), "utf8"));
ok(Array.isArray(live.records), "live.records is array");
ok(!/CVE-SAMPLE|SAMPLE DATA|Mockup only/i.test(JSON.stringify(live).slice(0, 20000)), "live artifact has no sample markers");

if (failed) {
  console.error(`\n${failed} deck-signals live test(s) failed`);
  process.exit(1);
}
console.log("\nDeck-signals live tests passed.");
