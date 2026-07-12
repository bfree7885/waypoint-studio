#!/usr/bin/env node
/**
 * Platform hardening regression tests —
 * WOS/Knowledge merge-load safety, location test-coord narrowing,
 * future-data disabled, Fieldry/ForageCast lazy boot pattern,
 * privacy coordinate display, corrupted storage tolerance.
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
  const code = fs.readFileSync(path.join(ROOT, file), "utf8");
  vm.runInThisContext(code, { filename: file });
}

function makeLocalStorage() {
  const s = {};
  return {
    getItem(k) {
      return Object.prototype.hasOwnProperty.call(s, k) ? s[k] : null;
    },
    setItem(k, v) {
      s[k] = String(v);
    },
    removeItem(k) {
      delete s[k];
    }
  };
}

function run() {
  global.window = global;
  global.document = {
    readyState: "complete",
    documentElement: { getAttribute: () => null },
    querySelector: () => null,
    getElementById: () => null,
    addEventListener: () => {},
    createElement: () => ({ setAttribute() {}, appendChild() {} }),
    head: { appendChild() {} }
  };
  global.localStorage = makeLocalStorage();
  global.requestAnimationFrame = (fn) => setTimeout(fn, 0);

  // --- WOS: extensions survive core reload ---
  load("design-system/js/observations/wds-wos-extensions.js");
  assert("extensions attached early", !!global.WDS.observations.extensions);
  const extApi = global.WDS.observations.extensions;
  load("design-system/js/observations/wds-wos-core.js");
  assert("core merge preserves extensions API", global.WDS.observations.extensions === extApi ||
    !!(global.WDS.observations.extensions && global.WDS.observations.extensions.setExtension));
  assert("core still exposes normalize", typeof global.WDS.observations.normalizeObservation === "function");

  let obs = global.WDS.observations.emptyObservation({ source: "fieldry" });
  global.WDS.observations.extensions.setExtension(obs, "fieldry", { category: "birds", privacyLevel: "private" });
  const norm = global.WDS.observations.normalizeObservation(obs);
  assert("normalize keeps extensions", norm.extensions && norm.extensions.fieldry.category === "birds");

  // Reload extensions after core — still works
  load("design-system/js/observations/wds-wos-extensions.js");
  assert("extensions reload ok", typeof global.WDS.observations.extensions.setExtension === "function");
  assert("normalize still present after extensions reload", typeof global.WDS.observations.normalizeObservation === "function");

  // --- Knowledge: search survives core reload ---
  load("design-system/js/knowledge/wds-knowledge-search.js");
  assert("search module present", typeof global.WDS.knowledgeSearch.search === "function");
  load("design-system/js/knowledge/wds-knowledge-core.js");
  assert("core merge keeps search", typeof global.WDS.knowledge.search === "function");
  load("design-system/js/knowledge/wds-knowledge-relationships.js");
  assert("related attached", typeof global.WDS.knowledge.related === "function");
  load("design-system/js/knowledge/wds-knowledge-core.js");
  assert("related survives core reload", typeof global.WDS.knowledge.related === "function");
  assert("search survives second core reload", typeof global.WDS.knowledge.search === "function");

  // --- Location: Kansas bbox no longer treated as test ---
  // Minimal stub US national so location module can load
  global.WDS.usNational = global.WDS.usNational || {
    finalizeLocation: (s) => s
  };
  load("design-system/js/wds-location.js");
  const Loc = global.WDS.location;
  assert("engine publish point rejected", Loc.isEnginePublishPoint(39.8283, -98.5795));
  assert("engine publish is known test", Loc.isKnownTestCoords(39.8283, -98.5795));
  assert("real Topeka KS not test coords", !Loc.isKnownTestCoords(39.0473, -95.6752));
  assert("real Wichita KS not test coords", !Loc.isKnownTestCoords(37.6872, -97.3301));
  assert("NYC not test coords", !Loc.isKnownTestCoords(40.7128, -74.006));

  // --- Future data disabled ---
  load("design-system/js/platform/wds-platform-future-data.js");
  assert("futureData disabled", global.WDS.futureData.ENABLED === false);
  const gate = global.WDS.futureData.enable("marketplace");
  assert("futureData enable blocked", gate && gate.enabled === false && gate.ok === false);

  // --- Fieldry / ForageCast lazy boot source pattern ---
  const fieldryBoot = fs.readFileSync(path.join(ROOT, "apps/fieldry/js/fieldry-boot.js"), "utf8");
  const forageBoot = fs.readFileSync(path.join(ROOT, "apps/foragecast/js/foragecast-boot.js"), "utf8");
  assert("fieldry lazy getBoot", /function getBoot/.test(fieldryBoot) && /waitForAppBoot/.test(fieldryBoot));
  assert("foragecast lazy getBoot", /function getBoot/.test(forageBoot) && /waitForAppBoot/.test(forageBoot));
  assert("fieldry does not eager-capture null boot", !/var boot = global\.WDS && global\.WDS\.appBoot\s*\?/.test(fieldryBoot));

  // --- Platform loader includes WOS extensions ---
  const platformLoader = fs.readFileSync(path.join(ROOT, "design-system/js/wds-platform.js"), "utf8");
  assert("wds-platform loads wos-extensions", /wds-wos-extensions\.js/.test(platformLoader));

  // --- Fieldry privacy coordinate display ---
  load("apps/fieldry/js/fieldry-util.js");
  load("apps/fieldry/js/fieldry-life-list.js");
  load("apps/fieldry/js/fieldry-storage.js");
  const draft = global.FieldryStorage.createDraft(null, { county: "Shawnee", state: "KS", stateCode: "KS" });
  draft.location.latitude = 39.0473;
  draft.location.longitude = -95.6752;
  draft.location.privacy.precision = "county";
  draft.taxon.label = "Test";
  draft.meta.fieldry.category = "birds";
  global.FieldryStorage.ensureFieldryExtension(draft);
  const saved = global.FieldryStorage.save(draft);
  const shown = global.FieldryUtil.formatLocation(saved);
  assert("regional hides exact coords", shown.indexOf("39.047") < 0 && /Shawnee/.test(shown));

  // --- Corrupted Fieldry storage ---
  global.localStorage.setItem("waypoint-fieldry-observations-v1", "{broken");
  global.localStorage.removeItem("waypoint-fieldry-migration-v2");
  assert("corrupt storage list safe", Array.isArray(global.FieldryStorage.list()));

  // --- Terrainbound redirect present ---
  const terrain = fs.readFileSync(path.join(ROOT, "apps/terrainbound/index.html"), "utf8");
  assert("terrainbound redirects to fieldry", /fieldry/i.test(terrain) && /refresh|url=/i.test(terrain));

  // --- XSS profile-boot escapes id ---
  const profileBoot = fs.readFileSync(path.join(ROOT, "design-system/species/profile-boot.js"), "utf8");
  assert("profile-boot escapes id", /escapeHtml\(id\)/.test(profileBoot));

  if (failures.length) {
    console.error("\n" + failures.length + " failure(s)");
    process.exit(1);
  }
  console.log("\nAll platform hardening tests passed.");
}

run();
