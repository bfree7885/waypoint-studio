#!/usr/bin/env node
/**
 * Waypoint AI Guide — WDS.aiGuide preamble, soften, invite, noticed helpers.
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

function load(file) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, file), "utf8"), { filename: file });
}

function run() {
  global.window = global;
  load("design-system/js/ai/wds-ai-guide.js");

  const G = global.WDS && global.WDS.aiGuide;
  assert("aiGuide attached", !!(G && G.version));
  assert("systemPreamble mentions ranger", /ranger/i.test(G.systemPreamble()));
  assert("systemPreamble rejects grading", /not a teacher|grading system/i.test(G.systemPreamble()));
  assert(
    "buildSystemPrompt appends product instructions",
    G.buildSystemPrompt("Product tip.").indexOf("Product tip.") > 0
  );

  assert("soften Overall grade", G.softenOutput("Overall grade: B") === "Overall reading: B");
  assert("soften You should", /You may want to/.test(G.softenOutput("You should wait.")));
  assert("invite wraps tip", G.invite("try a simpler background.") === "If you're curious, try a simpler background.");
  assert("invite leaves existing invite", G.invite("If you're curious, wait.") === "If you're curious, wait.");
  assert("noticed wraps observation", G.noticed("soft side light.") === "I noticed soft side light.");
  assert("hasPressureLanguage detects must", G.hasPressureLanguage("You must crop now") === true);
  assert("hasPressureLanguage ignores calm text", G.hasPressureLanguage("Worth noticing the fog.") === false);

  const registry = JSON.parse(
    fs.readFileSync(path.join(ROOT, "design-system/ecosystem/product-registry.json"), "utf8")
  );
  assert(
    "registry has waypoint-ai-guide",
    !!(registry.sharedEngines && registry.sharedEngines["waypoint-ai-guide"])
  );

  const guideDoc = fs.readFileSync(path.join(ROOT, "docs/WAYPOINT-AI-GUIDE.md"), "utf8");
  assert("guide doc exists", /Yellowstone|park ranger/i.test(guideDoc));

  const photoHtml = fs.readFileSync(path.join(ROOT, "apps/photo-coach/index.html"), "utf8");
  assert("photo-coach loads wds-ai-guide", photoHtml.includes("wds-ai-guide.js"));

  const scenesHtml = fs.readFileSync(path.join(ROOT, "apps/waypoint-scenes/index.html"), "utf8");
  assert("scenes loads wds-ai-guide", scenesHtml.includes("wds-ai-guide.js"));

  if (failures.length) {
    console.error("\n" + failures.length + " failure(s).");
    process.exit(1);
  }
  console.log("\nAll Waypoint AI Guide tests passed.");
}

run();
