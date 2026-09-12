#!/usr/bin/env node
/**
 * TerrainBound Phase 7.9J — Summit field-test release candidate (offline).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { routeSummit } from "../js/summit.js";
import {
  verifyFieldTestConfig,
  FieldTestError,
  fieldTestUrl,
  portInUseMessage,
  FIELDTEST_MODEL
} from "../scripts/fieldtest-summit.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(root, "..");
const failures = [];

function check(name, fn) {
  try {
    fn();
    console.log("ok  " + name);
  } catch (err) {
    failures.push(name);
    console.error("FAIL  " + name);
    console.error("  " + (err.stack || err.message));
  }
}

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const mainJs = fs.readFileSync(path.join(root, "js/main.js"), "utf8");
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const pkg = fs.readFileSync(path.join(repoRoot, "package.json"), "utf8");
const launcher = fs.readFileSync(path.join(root, "scripts/fieldtest-summit.mjs"), "utf8");
const hosting = fs.readFileSync(path.join(root, "docs/HOSTING.md"), "utf8");
const script = fs.readFileSync(path.join(root, "docs/SUMMIT-FIELD-TEST.md"), "utf8");
const provider = fs.readFileSync(path.join(root, "data/summit/provider.json"), "utf8");

check("one-command field-test start is documented and wired", () => {
  assert.match(pkg, /"fieldtest:summit": "node terrainbound\/scripts\/fieldtest-summit\.mjs"/);
  assert.match(script, /npm run fieldtest:summit/);
  assert.match(script, /http:\/\/127\.0\.0\.1:8086\/terrainbound\/\?summit=fieldtest/);
  assert.equal(fieldTestUrl(8086), "http://127.0.0.1:8086/terrainbound/?summit=fieldtest");
  assert.equal(FIELDTEST_MODEL, "openai/gpt-oss-20b");
});

check("missing env and missing key fail with owner-friendly messages", () => {
  const missingDir = path.join(os.tmpdir(), "tb-fieldtest-missing-env");
  fs.mkdirSync(missingDir, { recursive: true });
  try {
    verifyFieldTestConfig({ envPath: path.join(missingDir, ".env"), processEnv: {} });
    assert.fail("expected missing env to throw");
  } catch (err) {
    assert.equal(err instanceof FieldTestError, true);
    assert.match(err.message, /terrainbound\/data\/summit\/\.env is missing/);
  }
  const empty = path.join(os.tmpdir(), "tb-fieldtest-empty.env");
  fs.writeFileSync(empty, "SUMMIT_AI_URL=https://api.groq.com/openai/v1/chat/completions\n");
  try {
    verifyFieldTestConfig({ envPath: empty, processEnv: {} });
    assert.fail("expected missing key to throw");
  } catch (err) {
    assert.equal(err instanceof FieldTestError, true);
    assert.match(err.message, /Groq API key was not found/);
  }
  assert.equal(portInUseMessage(8787), "Port 8787 is already in use.");
});

check("credentials stay server-side", () => {
  assert.doesNotMatch(launcher, /console\.log\([^)]*SUMMIT_API_KEY/);
  assert.doesNotMatch(provider, /gsk_|sk-/);
  assert.doesNotMatch(html, /gsk_|SUMMIT_API_KEY\s*=/);
  assert.doesNotMatch(gameJs, /gsk_/);
  assert.match(hosting, /static files only/);
  assert.match(hosting, /cannot run/);
});

check("gravity-is-stronger student wording is science-talk, not Granite Knob default", () => {
  const decision = routeSummit({
    question: "gravity is stronger on the steep slope",
    action: "",
    intent: "explain",
    context: { summit: { hintAsks: 0, recent: [] } }
  });
  assert.equal(decision.reason, "science-talk");
  assert.equal(decision.useAi, true);
});

check("field-test identity and 7.9I harness remain", () => {
  assert.match(html, /SUMMIT FIELD TEST/);
  assert.match(html, /summit-fieldtest/);
  assert.match(html, /p79j/);
  assert.match(mainJs, /p79j/);
  assert.match(gameJs, /isFieldTestMode/);
  assert.match(script, /Helped, Confusing, Too much, Wrong, Other/);
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 7.9J field-test RC checks passed.");
