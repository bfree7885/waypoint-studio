#!/usr/bin/env node
/**
 * Fieldry Recovery Sprint 7 — workflow, drafts, GPS, export privacy, deep links.
 * Run: node automation/test-fieldry-sprint7.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function assert(name, cond, detail) {
  if (cond) console.log("PASS", name);
  else {
    failures.push(name + ": " + (detail || "failed"));
    console.log("FAIL", name, "—", detail || "");
  }
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const formSrc = read("apps/fieldry/js/fieldry-form.js");
const storageSrc = read("apps/fieldry/js/fieldry-storage.js");
const listSrc = read("apps/fieldry/js/fieldry-list.js");
const appSrc = read("apps/fieldry/js/fieldry-app.js");
const exportSrc = read("apps/fieldry/js/fieldry-export.js");
const detailSrc = read("apps/fieldry/js/fieldry-detail.js");
const css = read("apps/fieldry/css/fieldry.css");
const platformObs = read("design-system/js/platform/wds-platform-observations.js");

assert("platform ledger deep link uses #/obs/", /#\/obs\/"\s*\+/.test(platformObs) || /#\/obs\/" \+/.test(platformObs));
assert("observation hash alias supported", /parts\[0\] === "observation"/.test(appSrc));
assert("draft storage key", /waypoint-fieldry-draft-v1/.test(storageSrc));
assert("saveDraft / loadDraft / clearDraft", /saveDraft/.test(storageSrc) && /loadDraft/.test(storageSrc) && /clearDraft/.test(storageSrc));
assert("quota-safe writeAll", /QuotaExceededError/.test(storageSrc));
assert("duplicate API", /function duplicate/.test(storageSrc) && /duplicate: duplicate/.test(storageSrc));
assert("quick capture group", /fld-form__group--quick/.test(formSrc));
assert("GPS promoted above fold", /fld-use-gps/.test(formSrc) && /Use my GPS/.test(formSrc));
assert("GPS writes accuracyM", /accuracyM/.test(formSrc));
assert("draft autosave on input", /saveDraft/.test(formSrc) && /scheduleDraft/.test(formSrc));
assert("coordinate validation", /between -90 and 90/.test(formSrc));
assert("sticky save footer CSS", /position:\s*sticky/.test(css) && /fld-form__foot/.test(css));
assert("16px inputs for iOS zoom", /font-size:\s*16px/.test(css));
assert("safe-area padding", /safe-area-inset-bottom/.test(css));
assert("live history filters", /setTimeout\(applyFromForm/.test(listSrc));
assert("date range filters", /fld-hist-from/.test(listSrc) && /fromDate/.test(listSrc));
assert("detail duplicate control", /fld-duplicate-obs/.test(detailSrc));
assert("export buildCSV exposed", /buildCSV:\s*buildCSV/.test(exportSrc));
assert("recovery docs", exists("docs/FIELDRY-RECOVERY-REPORT.md"));
assert("workflow review", exists("docs/FIELDRY-OBSERVATION-WORKFLOW-REVIEW.md"));
assert("performance doc", exists("docs/FIELDRY-PERFORMANCE-IMPROVEMENTS.md"));
assert("a11y review", exists("docs/FIELDRY-ACCESSIBILITY-REVIEW.md"));
assert("technical debt", exists("docs/FIELDRY-TECHNICAL-DEBT.md"));
assert("readiness", exists("docs/FIELDRY-READINESS-ASSESSMENT.md"));
assert("changelog", exists("docs/FIELDRY-CHANGELOG-SPRINT7.md"));

// Runtime: draft + export privacy
const memory = new Map();
const sandbox = {
  window: {},
  console,
  Math,
  Number,
  String,
  Array,
  Object,
  Date,
  JSON,
  isFinite,
  parseInt,
  localStorage: {
    getItem(k) { return memory.has(k) ? memory.get(k) : null; },
    setItem(k, v) { memory.set(k, String(v)); },
    removeItem(k) { memory.delete(k); }
  },
  navigator: { onLine: true, geolocation: null },
  document: {
    createElement() { return { style: {}, click() {}, setAttribute() {} }; },
    body: { appendChild() {}, removeChild() {} }
  },
  URL: { createObjectURL() { return "blob:test"; }, revokeObjectURL() {} },
  Blob: function Blob(parts) { this.parts = parts; this.size = String(parts[0] || "").length; }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.globalThis = sandbox;
sandbox.WDS = {};

function load(rel) {
  vm.runInNewContext(read(rel), sandbox, { filename: rel });
}

[
  "design-system/js/observations/wds-wos-core.js",
  "design-system/js/observations/wds-wos-extensions.js",
  "apps/fieldry/js/fieldry-util.js",
  "apps/fieldry/js/fieldry-life-list.js",
  "apps/fieldry/js/fieldry-storage.js",
  "apps/fieldry/js/fieldry-export.js"
].forEach(load);

assert("WOS loaded", !!(sandbox.WDS && sandbox.WDS.observations));
assert("FieldryStorage loaded", !!sandbox.FieldryStorage);

const draft = sandbox.FieldryStorage.createDraft(null, { county: "Pike", state: "PA" });
assert("createDraft ok", !!draft && !!draft.id);
draft.taxon.label = "Draft sparrow";
draft.meta.fieldry.category = "birds";
const draftSave = sandbox.FieldryStorage.saveDraft(draft);
assert("saveDraft ok", draftSave && draftSave.ok);
const loaded = sandbox.FieldryStorage.loadDraft();
assert("loadDraft restores label", loaded && loaded.taxon && loaded.taxon.label === "Draft sparrow");

draft.location.latitude = 41.39012;
draft.location.longitude = -74.98765;
draft.location.privacy = { precision: "county" };
const saved = sandbox.FieldryStorage.save(draft);
assert("save clears draft", sandbox.FieldryStorage.loadDraft() === null);
assert("saved record", saved && sandbox.FieldryStorage.get(saved.id));

const csvCounty = sandbox.FieldryExport.buildCSV([saved]);
assert("CSV county precision omits full coords",
  /county/.test(csvCounty) && !csvCounty.includes("41.39012") && !csvCounty.includes("-74.98765"));

saved.location.privacy.precision = "hidden";
const csvHidden = sandbox.FieldryExport.buildCSV([saved]);
assert("CSV hidden precision omits coords",
  !csvHidden.includes("41.39012") && !csvHidden.includes("-74.98765"));

saved.location.privacy.precision = "exact";
const csvExact = sandbox.FieldryExport.buildCSV([saved]);
assert("CSV exact includes coords", csvExact.includes("41.39012"));

const copy = sandbox.FieldryStorage.duplicate(saved.id);
assert("duplicate creates new id", copy && copy.id !== saved.id);
assert("duplicate label marked", /copy/i.test(copy.taxon.label));

// Quota failure path
const boomStore = {
  getItem: sandbox.localStorage.getItem.bind(sandbox.localStorage),
  removeItem: sandbox.localStorage.removeItem.bind(sandbox.localStorage),
  setItem() {
    const err = new Error("quota");
    err.name = "QuotaExceededError";
    throw err;
  }
};
sandbox.localStorage = boomStore;
let threw = false;
try {
  sandbox.FieldryStorage.save(Object.assign({}, saved, { id: "obs_quota_test" }));
} catch (e) {
  threw = /full|storage/i.test(e.message);
}
assert("save throws helpful quota error", threw);

if (failures.length) {
  console.error("\n" + failures.length + " failure(s)");
  process.exit(1);
}
console.log("\nAll Fieldry Sprint 7 checks passed.");
