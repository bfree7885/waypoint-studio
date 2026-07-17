#!/usr/bin/env node
/**
 * Waypoint Constitution + AI Principles — docs exist, agents inherit, preamble wired.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import vm from "vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const failures = [];

function fail(name, detail) {
  failures.push(name + ": " + detail);
  console.log("FAIL", name, "—", detail);
}

function pass(name) {
  console.log("PASS", name);
}

function assert(name, cond, detail) {
  if (cond) pass(name);
  else fail(name, detail || "assertion failed");
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function run() {
  const constitution = read("docs/WAYPOINT-CONSTITUTION.md");
  assert("constitution has ten principles", /Principle 10/.test(constitution) && /Respect Curiosity/.test(constitution));
  assert("constitution core principle", /never replace the user.s judgment/i.test(constitution));
  assert("constitution self-check", /Have I left the \*\*decision\*\* to the user/i.test(constitution));

  const principles = read("docs/WAYPOINT-AI-PRINCIPLES.md");
  assert("AI principles inherit constitution", /WAYPOINT-CONSTITUTION/.test(principles));
  assert("AI principles self-check", /Have I helped the user observe/i.test(principles));

  const shared = read("docs/ai-agents/SHARED-AUTHORITY.md");
  assert("shared authority points to constitution", /WAYPOINT-CONSTITUTION/.test(shared));
  assert("shared authority points to AI principles", /WAYPOINT-AI-PRINCIPLES/.test(shared));

  const agents = [
    "education-editor.md",
    "product-lead.md",
    "frontend-engineer.md",
    "frontend-designer.md",
    "motion-engineer.md",
    "qa-tester.md",
    "release-manager.md"
  ];
  agents.forEach((name) => {
    const text = read("docs/ai-agents/" + name);
    assert(name + " inherits SHARED-AUTHORITY", /SHARED-AUTHORITY\.md/.test(text));
  });

  global.window = global;
  vm.runInThisContext(read("design-system/js/ai/wds-ai-guide.js"), { filename: "wds-ai-guide.js" });
  const preamble = global.WDS.aiGuide.systemPreamble();
  assert("preamble mentions Constitution", /Constitution|AI Principles/i.test(preamble));
  assert("aiGuide exposes constitutionPath", global.WDS.aiGuide.constitutionPath === "docs/WAYPOINT-CONSTITUTION.md");

  if (failures.length) {
    console.error("\n" + failures.length + " failure(s).");
    process.exit(1);
  }
  console.log("\nAll Waypoint Constitution tests passed.");
}

run();
