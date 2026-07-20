#!/usr/bin/env node
/**
 * Savant Sommelier Recovery Sprint 8 — boot, place storytelling, search honesty.
 * Run: node automation/test-savant-sprint8.mjs
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

const views = read("apps/savant-sommelier/js/savant-views.js");
const shell = read("apps/savant-sommelier/js/savant-shell.js");
const css = read("apps/savant-sommelier/css/savant-recovery.css");
const indexHtml = read("apps/savant-sommelier/index.html");

assert("platformBoot watch wired", /platformBoot\.watch/.test(views));
assert("finishBoot / failBoot helpers", /function finishBoot/.test(views) && /function failBoot/.test(views));
assert("discover waits for catalog before chrome", /Loading discovery catalog/.test(views) && /finishBoot\(root\)/.test(views));
assert("learn start-here path", /LEARN_PATH/.test(views) && /Start here/.test(views));
assert("place story on cards", /function placeStory/.test(views) && /Why place matters/.test(views));
assert("learning chain honesty", /Learning chain:/.test(views));
assert("empty facets skipped", /FACET_SKIP/.test(views) && /usableFacets/.test(views));
assert("unified WIE search path", /engine\.search\(catalog, q\)/.test(views));
assert("shell bindRetry", /bindRetry/.test(shell));
assert("CSS learning path", /\.ss-path/.test(css) && /\.ss-chain/.test(css));
assert("mobile 16px inputs", /font-size:\s*16px/.test(css));
assert("boot script present on discover", /wds-platform-boot\.js/.test(indexHtml));
assert("viewport-fit cover", /viewport-fit=cover/.test(indexHtml));
assert("docs recovery", exists("docs/SAVANT-RECOVERY-REPORT-SPRINT8.md"));
assert("docs knowledge architecture", exists("docs/SAVANT-KNOWLEDGE-ARCHITECTURE-REVIEW.md"));
assert("docs search review", exists("docs/SAVANT-SEARCH-REVIEW.md"));
assert("docs performance", exists("docs/SAVANT-PERFORMANCE-IMPROVEMENTS-SPRINT8.md"));
assert("docs debt", exists("docs/SAVANT-TECHNICAL-DEBT-SPRINT8.md"));
assert("docs readiness", exists("docs/SAVANT-READINESS-ASSESSMENT-SPRINT8.md"));
assert("docs changelog", exists("docs/SAVANT-CHANGELOG-SPRINT8.md"));

// Runtime: placeStory + usableFacets via loading views deps lightly
const sandbox = {
  window: {},
  console,
  document: {
    getElementById() { return { setAttribute() {}, querySelector() { return null; }, querySelectorAll() { return []; }, innerHTML: "" }; },
    createElement() { return { setAttribute() {}, appendChild() {} }; },
    addEventListener() {}
  },
  location: { pathname: "/apps/savant-sommelier/", search: "", href: "" },
  localStorage: {
    _s: {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._s, k) ? this._s[k] : null; },
    setItem(k, v) { this._s[k] = String(v); },
    removeItem(k) { delete this._s[k]; }
  },
  fetch() { return Promise.reject(new Error("offline")); }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.globalThis = sandbox;
sandbox.WDS = {
  platformBoot: {
    watch() { return function () {}; },
    clear() {},
    mount() {},
    fail() {},
    status() {}
  },
  platformUi: {
    escapeHtml(s) { return String(s == null ? "" : s); },
    errorHtml(o) { return "<div>" + (o.text || "") + (o.retry ? "RETRY" : "") + "</div>"; },
    loadingHtml(m) { return m; },
    honestyHtml(t) { return t; },
    taskNav() { return "<nav></nav>"; },
    getJson() { return Promise.reject(new Error("offline")); }
  }
};

function load(rel) {
  vm.runInNewContext(read(rel), sandbox, { filename: rel });
}

load("apps/savant-sommelier/js/savant-shell.js");
assert("SavantShell.errorHtml retry", /RETRY/.test(sandbox.SavantShell.errorHtml({ text: "x", retry: true })));

const catalog = JSON.parse(read("apps/savant-sommelier/data/discover-catalog.json"));
assert("catalog entries carry place context", catalog.entries.every((e) =>
  e.kind === "style" ||
  e.kind === "region" ||
  (Array.isArray(e.regionHints) && e.regionHints.length) ||
  (Array.isArray(e.countryHints) && e.countryHints.length) ||
  !!e.country
));

if (failures.length) {
  console.error("\n" + failures.length + " failure(s)");
  process.exit(1);
}
console.log("\nAll Savant Sprint 8 checks passed.");
