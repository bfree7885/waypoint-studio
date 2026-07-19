#!/usr/bin/env node
/**
 * Steepleaf Recovery Sprint 3 — companion + boot + workflow contracts (no browser).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const failures = [];

function assert(name, cond, detail) {
  if (cond) console.log("PASS", name);
  else {
    failures.push(name + (detail ? ": " + detail : ""));
    console.error("FAIL", name, detail || "");
  }
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const memory = new Map();
const localStorage = {
  getItem(k) {
    return memory.has(k) ? memory.get(k) : null;
  },
  setItem(k, v) {
    memory.set(k, String(v));
  },
  removeItem(k) {
    memory.delete(k);
  },
  clear() {
    memory.clear();
  }
};

const sandbox = {
  window: {},
  console,
  localStorage,
  setTimeout,
  clearTimeout,
  location: { hash: "#home", pathname: "/apps/steepleaf/", search: "", reload() {} },
  addEventListener() {},
  document: {
    addEventListener() {},
    getElementById() {
      return null;
    }
  },
  requestAnimationFrame(fn) {
    return setTimeout(fn, 0);
  },
  performance: { mark() {} },
  Blob: class Blob {
    constructor(parts) {
      this.parts = parts;
    }
  },
  URL: { createObjectURL() {
    return "blob:test";
  } },
  FormData: class FormData {
    constructor() {
      this._m = new Map();
    }
    get(k) {
      return this._m.has(k) ? this._m.get(k) : null;
    }
    set(k, v) {
      this._m.set(k, v);
    }
  }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.globalThis = sandbox;
sandbox.WDS = {};

function load(rel) {
  vm.runInNewContext(read(rel), sandbox, { filename: rel });
}

const required = [
  "apps/steepleaf/index.html",
  "apps/steepleaf/explore/index.html",
  "apps/steepleaf/entity/index.html",
  "apps/steepleaf/js/wds-steepleaf-app.js",
  "apps/steepleaf/js/steepleaf-models.js",
  "apps/steepleaf/js/steepleaf-guides.js",
  "apps/steepleaf/js/steepleaf-briefing.js",
  "design-system/js/platform/wds-platform-boot.js",
  "design-system/js/steepleaf/wds-steepleaf-graph.js",
  "design-system/js/steepleaf/wds-steepleaf-ui.js",
  "design-system/css/wds-steepleaf.css",
  "docs/STEEPLEAF-RECOVERY-REPORT.md",
  "docs/STEEPLEAF-PERFORMANCE.md",
  "docs/STEEPLEAF-TECHNICAL-DEBT.md",
  "docs/STEEPLEAF-OUTSTANDING-UX.md",
  "docs/STEEPLEAF-READINESS.md",
  "docs/STEEPLEAF-CHANGELOG-SPRINT3.md"
];
required.forEach((f) => assert("exists " + f, exists(f)));

const companionHtml = read("apps/steepleaf/index.html");
assert("companion waits for scripts", /deadline|steepleafApp\.mount/.test(companionHtml));
assert("companion labels sample tea", /Labeled sample tea|educational/i.test(companionHtml));
assert("companion peers not vague Sample only", !/Sample tea page/.test(companionHtml));

const exploreHtml = read("apps/steepleaf/explore/index.html");
const entityHtml = read("apps/steepleaf/entity/index.html");
assert("explore waits for steepleafUI", /mountExplore/.test(exploreHtml) && /deadline/.test(exploreHtml));
assert("entity waits for steepleafUI", /mountEntity/.test(entityHtml) && /deadline/.test(entityHtml));

const appSrc = read("apps/steepleaf/js/wds-steepleaf-app.js");
assert("app uses platformBoot fail", /platformBoot/.test(appSrc) && /failLoad/.test(appSrc));
assert("app has onboard steps", /Start in four steps|sl-onboard/.test(appSrc));
assert("app links knowledge graph", /explore\//.test(appSrc));
assert("nav includes Knowledge graph", /Knowledge graph/.test(appSrc));
assert("brew workflow copy", /pick tea|tasting notes|Session history/i.test(appSrc));

const uiSrc = read("design-system/js/steepleaf/wds-steepleaf-ui.js");
assert("explore educational honesty", /not your private journal|educational sample/i.test(uiSrc));
assert("entity renames AI summary", /Educational summary/.test(uiSrc));
assert("entity bridges to companion", /private companion|Add a tea you own/i.test(uiSrc));

const bootSrc = read("design-system/js/platform/wds-platform-boot.js");
assert("boot status helper", /status:\s*status|function status/.test(bootSrc));

const graphSrc = read("design-system/js/steepleaf/wds-steepleaf-graph.js");
assert("graph load caches", /loadPromise/.test(graphSrc));

const css = read("design-system/css/wds-steepleaf.css");
assert("css onboard", /\.sl-onboard/.test(css));
assert("css mobile touch", /min-height:\s*2\.75rem/.test(css));

load("design-system/js/platform/wds-platform-boot.js");
assert("platformBoot exported", !!(sandbox.WDS.platformBoot && sandbox.WDS.platformBoot.watch));
assert("platformBoot.status", typeof sandbox.WDS.platformBoot.status === "function");

load("apps/steepleaf/js/steepleaf-models.js");
load("apps/steepleaf/js/steepleaf-guides.js");
load("apps/steepleaf/js/steepleaf-briefing.js");
load("apps/steepleaf/js/wds-steepleaf-app.js");

assert("steepleafApp exported", !!(sandbox.WDS.steepleafApp && sandbox.WDS.steepleafApp.mount));
assert("models store", !!(sandbox.WaypointSteepleaf && sandbox.WaypointSteepleaf.listTeas));
assert("guides", !!(sandbox.SteepleafGuides && sandbox.SteepleafGuides.guideForType));
assert("briefing", !!(sandbox.SteepleafBriefing && sandbox.SteepleafBriefing.buildBriefing));

const store = sandbox.WaypointSteepleaf;
assert("empty collection starts empty", store.listTeas().length === 0);
assert("no seeded journal", store.listBrews().length === 0);

const tea = store.createTea({ name: "House green", type: "green", origin: "Zhejiang" });
store.saveTea(tea);
assert("save tea", store.listTeas().length === 1 && store.getTea(tea.id).name === "House green");

const brew = store.createBrew({
  teaId: tea.id,
  waterTempC: 80,
  steepSeconds: 90,
  rating: 4,
  flavorNotes: ["sweet", "vegetal"],
  notes: "Morning cup"
});
store.saveBrew(brew);
assert("save brew session", store.listBrews().length === 1);
assert("brewsForTea", store.brewsForTea(tea.id).length === 1);

const brief = sandbox.SteepleafBriefing.buildBriefing();
assert("briefing recommends owned tea", !!(brief.recommendation && brief.recommendation.tea.id === tea.id));

const root = {
  _html: "",
  attrs: { "aria-busy": "true" },
  querySelector(sel) {
    if (sel === "[data-wds-boot]" && /data-wds-boot/.test(this._html)) return { className: "wds-boot" };
    if (sel === ".wds-boot__status" && /wds-boot__status/.test(this._html)) {
      return {
        textContent: "",
        set textContent(v) {
          this._t = v;
        },
        get textContent() {
          return this._t || "";
        }
      };
    }
    return null;
  },
  querySelectorAll() {
    return [];
  },
  setAttribute(k, v) {
    this.attrs[k] = v;
  },
  removeAttribute(k) {
    delete this.attrs[k];
  },
  getAttribute(k) {
    return this.attrs[k];
  },
  set innerHTML(v) {
    this._html = String(v);
  },
  get innerHTML() {
    return this._html;
  },
  addEventListener() {}
};

sandbox.WDS.steepleafApp.mount(root);
assert("mount paints companion shell", /sl-app|sl-shell|What should I brew/.test(root._html));
assert("mount clears busy", root.attrs["aria-busy"] == null || root.attrs["aria-busy"] === "false");
assert("home explains product", /private tea companion|What you can do here/i.test(root._html));

if (failures.length) {
  console.error("\n" + failures.length + " failure(s)");
  process.exit(1);
}
console.log("\nAll Steepleaf recovery checks passed.");
