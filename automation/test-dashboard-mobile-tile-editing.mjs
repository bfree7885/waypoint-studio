#!/usr/bin/env node
/**
 * Mobile tile editing — Customize entry, draft Save/Cancel, reorder, persistence.
 * Run: node automation/test-dashboard-mobile-tile-editing.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

let passed = 0;
const failures = [];

function assert(name, cond, detail) {
  if (cond) {
    passed += 1;
    console.log("PASS", name);
  } else {
    failures.push(name + (detail ? ": " + detail : ""));
    console.error("FAIL", name, detail || "");
  }
}

function load(rel, sandbox) {
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), sandbox, { filename: rel });
}

const shellCss = fs.readFileSync(path.join(ROOT, "design-system/css/wds-app-shell.css"), "utf8");
const rebuildCss = fs.readFileSync(path.join(ROOT, "design-system/css/wds-dashboard-rebuild.css"), "utf8");

assert(
  "quiet chrome does not hide Home local nav",
  !/\[data-product="dashboard"\]\s*\.was-local\s*\{[^}]*display:\s*none/s.test(shellCss)
);
assert(
  "quiet chrome softens Home local label only",
  /\.was-shell--quiet\[data-product="dashboard"\]\s*\.was-local__app/.test(shellCss)
);
assert("mobile customize uses safe-area insets", /safe-area-inset-bottom/.test(rebuildCss));
assert("mobile customize fixed Save/Cancel bar", /wdb-r-customize-bar__commit/.test(rebuildCss));
assert("mobile touch targets 2.75rem", /min-height:\s*2\.75rem/.test(rebuildCss));
assert("mobile customize prevents h-overflow", /overflow-x:\s*hidden/.test(rebuildCss));

const sandbox = {
  window: {},
  console,
  document: {
    documentElement: {
      classList: {
        add() {},
        remove() {},
        contains() {
          return false;
        }
      },
      setAttribute() {},
      removeAttribute() {},
      getAttribute() {
        return null;
      }
    },
    hidden: false,
    addEventListener() {},
    removeEventListener() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    createElement() {
      return { style: {}, setAttribute() {}, appendChild() {}, classList: { add() {} } };
    },
    readyState: "complete"
  },
  location: { pathname: "/", hash: "#/", href: "http://127.0.0.1/", replace() {} },
  history: { replaceState() {} },
  localStorage: {
    _d: {},
    getItem(k) {
      return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null;
    },
    setItem(k, v) {
      this._d[k] = String(v);
    },
    removeItem(k) {
      delete this._d[k];
    }
  },
  CustomEvent: function (type, init) {
    this.type = type;
    this.detail = init && init.detail;
  },
  dispatchEvent() {},
  addEventListener() {},
  removeEventListener() {},
  requestAnimationFrame(fn) {
    fn();
  },
  matchMedia() {
    return { matches: false };
  },
  IntersectionObserver: function () {
    this.observe = function () {};
    this.unobserve = function () {};
  }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.WDS = {};

[
  "design-system/js/wds-icons.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-prefs.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-today.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-workspace.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-customize.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-kiosk.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js"
].forEach(function (rel) {
  load(rel, sandbox);
});

const Prefs = sandbox.WDS.dashboardRebuildPrefs;
const Workspace = sandbox.WDS.dashboardRebuildWorkspace;
const Customize = sandbox.WDS.dashboardRebuildCustomize;
const Shell = sandbox.WDS.dashboardRebuild;

Prefs.reset();

const workspaceHtml = Workspace.renderWorkspace({ prefs: Prefs.load(), customize: false });
assert(
  "workspace exposes Customize entry button",
  /data-wdb-r-customize-entry/.test(workspaceHtml) && /href="#\/customize"/.test(workspaceHtml)
);
assert("Customize entry min touch-friendly class", /wdb-r-btn--customize/.test(workspaceHtml));

const customizeShell = Shell.renderShell({ view: "customize" });
assert("customize view renders toolbar", /data-wdb-r-customize-bar/.test(customizeShell));
assert("customize has Save", /data-wdb-r-action="save"/.test(customizeShell));
assert("customize has Cancel", /data-wdb-r-action="cancel"/.test(customizeShell));
assert("customize omits Done link", !/>Done</.test(customizeShell));
assert("customize has Move up/down", /Move up/.test(customizeShell) && /Move down/.test(customizeShell));
assert(
  "reorder controls name the tile",
  /aria-label="Move Conditions up"/.test(customizeShell) ||
    /aria-label="Move [^"]+ up"/.test(customizeShell)
);

/* Draft: disable tile does not persist until Save */
Prefs.reset();
const before = Prefs.load();
assert("starts not drafting", Prefs.isDrafting() === false);
Prefs.beginDraft();
assert("beginDraft enters draft", Prefs.isDrafting() === true);
Prefs.setEnabled("ph-sun", false);
const draftState = Prefs.load();
assert("draft disables sun", draftState.enabled.indexOf("ph-sun") < 0);
const storedRaw = sandbox.localStorage.getItem(Prefs.storageKey);
const stored = JSON.parse(storedRaw);
assert(
  "storage still has sun until Save",
  stored.enabled.indexOf("ph-sun") >= 0,
  JSON.stringify(stored.enabled)
);
Prefs.commitDraft();
assert("commit clears drafting", Prefs.isDrafting() === false);
const afterSave = Prefs.load();
assert("saved prefs omit sun", afterSave.enabled.indexOf("ph-sun") < 0);
const remount = Prefs.loadFromStorage();
assert("reload retains disabled sun", remount.enabled.indexOf("ph-sun") < 0);

/* Re-enable + Save */
Prefs.beginDraft();
Prefs.setEnabled("ph-sun", true);
Prefs.commitDraft();
assert("re-enable persists", Prefs.load().enabled.indexOf("ph-sun") >= 0);

/* Cancel discards */
Prefs.reset();
Prefs.beginDraft();
Prefs.setEnabled("ph-air", false);
Prefs.discardDraft();
assert("cancel restores air", Prefs.load().enabled.indexOf("ph-air") >= 0);
assert("cancel clears drafting", Prefs.isDrafting() === false);

/* Reorder without DnD */
Prefs.reset();
Prefs.beginDraft();
const orderBefore = Prefs.load().order.slice();
const first = orderBefore[0];
const second = orderBefore[1];
Prefs.move(first, 1);
const orderAfter = Prefs.load().order.slice();
assert("move down swaps neighbors", orderAfter[0] === second && orderAfter[1] === first);
Prefs.commitDraft();
assert(
  "reorder persists",
  Prefs.loadFromStorage().order[0] === second && Prefs.loadFromStorage().order[1] === first
);

/* Desktop customize path still renders catalog + controls */
Prefs.reset();
const desk = Customize.render({ prefs: Prefs.load() });
assert("desktop customize includes catalog", /data-wdb-r-catalog/.test(desk));
assert("desktop customize includes widget controls", /data-wdb-r-action="hide"/.test(desk));
assert("desktop customize Save/Cancel", /data-wdb-r-action="save"/.test(desk) && /data-wdb-r-action="cancel"/.test(desk));

/* Shell paint draft lifecycle */
Prefs.reset();
const host = {
  innerHTML: "",
  classList: { add() {}, remove() {} },
  removeAttribute() {},
  querySelector(sel) {
    if (sel === "[data-wdb-r]") return { setAttribute() {} };
    if (sel === "[data-wdb-r-customize-bar]") return { focus() {} };
    if (sel === "[data-wdb-r-customize-entry]") return { focus() {} };
    if (sel === "[data-wdb-r-customize]") return {};
    return null;
  },
  querySelectorAll() {
    return [];
  },
  addEventListener() {},
  contains() {
    return true;
  }
};
sandbox.location.hash = "#/";
Shell.mount(host, { view: "workspace" });
assert("mount workspace not drafting", Prefs.isDrafting() === false);
assert("mounted workspace has Customize entry", /data-wdb-r-customize-entry/.test(host.innerHTML));

Shell.setView("customize");
assert("entering customize begins draft", Prefs.isDrafting() === true);
Prefs.setEnabled("ph-conditions", false);
assert("workspace tile remove in draft", Prefs.load().enabled.indexOf("ph-conditions") < 0);
assert(
  "storage unchanged mid-edit",
  JSON.parse(sandbox.localStorage.getItem(Prefs.storageKey)).enabled.indexOf("ph-conditions") >= 0
);

Customize.handleAction("cancel", null);
Shell.setView("workspace");
assert("leave after cancel not drafting", Prefs.isDrafting() === false);
assert("cancel keeps conditions enabled", Prefs.load().enabled.indexOf("ph-conditions") >= 0);

Shell.setView("customize");
Prefs.setEnabled("ph-conditions", false);
Customize.handleAction("save", null);
Shell.setView("workspace");
assert("save persists disable", Prefs.loadFromStorage().enabled.indexOf("ph-conditions") < 0);
assert(
  "saved layout removes tile from workspace paint",
  !/data-widget-id="ph-conditions"/.test(
    Workspace.renderWorkspace({ prefs: Prefs.load(), customize: false })
  )
);

/* Same prefs key — no mobile-specific store */
assert(
  "single prefs storage key",
  Prefs.storageKey === "waypoint-dashboard-rebuild-prefs-v1"
);

if (failures.length) {
  console.error("\n" + failures.length + " failure(s).");
  process.exit(1);
}
console.log("\nAll mobile tile editing tests passed (" + passed + ").");
