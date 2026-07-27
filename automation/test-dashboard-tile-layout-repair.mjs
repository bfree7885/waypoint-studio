#!/usr/bin/env node
/**
 * Dashboard production tile layout repair — regression suite.
 * Run: node automation/test-dashboard-tile-layout-repair.mjs
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

const css = fs.readFileSync(path.join(ROOT, "design-system/css/wds-dashboard-rebuild.css"), "utf8");
const rootHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const dashHtml = fs.readFileSync(path.join(ROOT, "apps/dashboard/index.html"), "utf8");

assert("root mounts Rebuild CSS", /wds-dashboard-rebuild\.css\?v=dash-(tile-layout-1|canonical-1)/.test(rootHtml));
assert("dashboard route mounts Rebuild CSS", /wds-dashboard-rebuild\.css\?v=dash-(tile-layout-1|canonical-1)/.test(dashHtml));
assert("root and dashboard share home-boot", /home-boot\.js\?v=dash-(tile-layout-1|canonical-1)/.test(rootHtml) && /home-boot\.js\?v=dash-(tile-layout-1|canonical-1)/.test(dashHtml));
assert("root uses canonical wds-home", /wds-home\.js/.test(rootHtml));
assert("dashboard uses canonical wds-home", /wds-home\.js/.test(dashHtml));
assert("CSS defines family grid", /\.wdb-r-family__grid/.test(css));
assert("CSS mobile uses minmax(0, 1fr)", /grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(css));
assert("CSS forces mobile full span", /grid-column:\s*1\s*\/\s*-1/.test(css));
assert("CSS has standard size", /\.wdb-r-widget--standard/.test(css));
assert("CSS has wide size", /\.wdb-r-widget--wide/.test(css));
assert("CSS has featured size", /\.wdb-r-widget--featured/.test(css));
assert("CSS no longer uses sm span 3 as primary", !/\.wdb-r-widget--sm\s*\{\s*grid-column:\s*span 3/.test(css));
assert("CSS avoids auto-fit tile grid", !/\.wdb-r-family__grid[\s\S]{0,120}auto-fit/.test(css));
assert("CSS avoids auto-fill tile grid", !/\.wdb-r-family__grid[\s\S]{0,120}auto-fill/.test(css));
assert("mobile breakpoint covers phones through 47.99rem", /@media \(max-width:\s*47\.99rem\)/.test(css));

const sandbox = {
  window: {},
  console,
  document: {
    documentElement: {
      classList: { add() {}, remove() {}, contains() { return false; } }
    }
  },
  localStorage: {
    _d: Object.create(null),
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
  matchMedia() {
    return { matches: false, addListener() {}, removeListener() {} };
  }
};
sandbox.global = sandbox;
sandbox.window = sandbox;

[
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-prefs.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-workspace.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-customize.js"
].forEach((rel) => load(rel, sandbox));

const WDS = sandbox.WDS;
const Reg = WDS.dashboardRebuildRegistry;
const Prefs = WDS.dashboardRebuildPrefs;
const Workspace = WDS.dashboardRebuildWorkspace;
const Customize = WDS.dashboardRebuildCustomize;

assert("registry sizes are standard/wide/featured", Reg.sizes.join(",") === "standard,wide,featured");
assert("normalize maps sm→standard", Reg.normalizeSize("sm") === "standard");
assert("normalize maps md→standard", Reg.normalizeSize("md") === "standard");
assert("normalize maps lg→wide", Reg.normalizeSize("lg") === "wide");
assert("normalize maps anchor→featured", Reg.normalizeSize("anchor") === "featured");
assert("normalize maps half→standard", Reg.normalizeSize("half") === "standard");
assert("normalize maps compact→standard", Reg.normalizeSize("compact") === "standard");

const catalog = Reg.all();
assert("catalog has exactly 5 functional tiles", catalog.length === 5, String(catalog.length));
assert(
  "catalog ids",
  catalog.map((w) => w.id).join(",") ===
    "ph-conditions,ph-air,ph-alerts,ph-astronomy,ph-light"
);
assert(
  "no Coming Soon in catalog copy",
  catalog.every((w) => !/coming soon/i.test(w.emptyMessage || "") && !/coming soon/i.test(w.title || ""))
);
assert(
  "every catalog entry is available",
  catalog.every((w) => Reg.availability(w).id === "available")
);
assert(
  "removed placeholders absent",
  ["ph-photography", "ph-rivers", "ph-wildlife", "ph-trails", "ph-travel"].every((id) => !Reg.get(id))
);

Prefs.reset();
const prefs = Prefs.load();
assert("default sizes are standard", Object.values(prefs.sizes).every((s) => s === "standard"));
assert("default enabled length 5", prefs.enabled.length === 5, String(prefs.enabled.length));

const ws = Workspace.renderWorkspace({ prefs, customize: false, lazy: false });
assert("workspace uses family sections", /data-wdb-r-family/.test(ws));
assert("workspace uses family grids", /wdb-r-family__grid/.test(ws));
assert("workspace tiles use standard class", /wdb-r-widget--standard/.test(ws));
assert("workspace has no compact/half classes", !/wdb-r-widget--(sm|half|compact)\b/.test(ws));
assert("workspace has no Coming Soon", !/Coming Soon|coming soon/i.test(ws));
assert("astronomy family exists", /data-family="astronomy"/.test(ws));
assert("photography family exists", /data-family="photography"/.test(ws));

const skeleton = Workspace.renderWorkspace({ prefs, customize: false, lazy: true });
assert("lazy skeleton uses same standard class", /wdb-r-widget--standard/.test(skeleton));
assert("lazy skeleton still family-grid", /wdb-r-family__grid/.test(skeleton));
assert(
  "lazy and ready share size attributes",
  /data-size="standard"/.test(skeleton) && /data-size="standard"/.test(ws)
);

const oddPrefs = Prefs.load();
oddPrefs.enabled = ["ph-conditions", "ph-air", "ph-alerts", "ph-astronomy"];
oddPrefs.order = oddPrefs.enabled.slice();
oddPrefs.gridColumns = 3;
const oddWs = Workspace.renderWorkspace({ prefs: oddPrefs, customize: false });
const oddTiles = (oddWs.match(/data-widget-id="/g) || []).length;
assert("odd count still renders 4 tiles", oddTiles === 4, String(oddTiles));
assert("odd count keeps family grids", /wdb-r-family__grid/.test(oddWs));

const longTitlePrefs = Prefs.load();
longTitlePrefs.enabled = ["ph-conditions"];
longTitlePrefs.order = ["ph-conditions"];
const longReg = Reg.get("ph-conditions");
const originalTitle = longReg.title;
longReg.title = "Conditions with an extremely long observational title for width proof";
const longWs = Workspace.renderWorkspace({ prefs: longTitlePrefs, customize: false });
longReg.title = originalTitle;
assert("long title still standard width class", /wdb-r-widget--standard/.test(longWs));
assert("long title still full family grid", /wdb-r-family__grid[^>]*data-cols="3"/.test(longWs));

const emptyData = Reg.getData("ph-alerts");
assert("empty data still catalog-available", emptyData.status === "empty");
const emptyWs = Workspace.renderWorkspace({
  prefs: { ...Prefs.load(), enabled: ["ph-alerts"], order: ["ph-alerts"] },
  customize: false
});
assert("empty tile still full-width class contract", /wdb-r-widget--standard/.test(emptyWs));

const catalogHtml = Customize.renderCatalog(Prefs.load(), { libraryFilter: "all" });
assert("customize catalog has no Coming Soon", !/Coming Soon/i.test(catalogHtml));
assert(
  "customize catalog lists all 5",
  ["ph-conditions", "ph-air", "ph-alerts", "ph-astronomy", "ph-light"].every((id) =>
    catalogHtml.includes('data-widget-id="' + id + '"') || catalogHtml.includes(id)
  ) || ["Conditions", "Air", "Alerts", "Astronomy", "Light"].every((t) => catalogHtml.includes(t))
);

/* Legacy prefs size migration */
sandbox.localStorage.setItem(
  Prefs.storageKey,
  JSON.stringify({
    version: 1,
    enabled: ["ph-conditions", "ph-light", "ph-rivers"],
    order: ["ph-conditions", "ph-light", "ph-rivers"],
    sizes: { "ph-conditions": "sm", "ph-light": "anchor", "ph-rivers": "md" },
    favorites: [],
    gridColumns: 3,
    preset: "default",
    kioskRefreshMs: 300000
  })
);
const migrated = Prefs.load();
assert("legacy sm migrates to standard", migrated.sizes["ph-conditions"] === "standard");
assert("legacy anchor migrates to featured", migrated.sizes["ph-light"] === "featured");
assert("removed rivers id dropped from enabled", migrated.enabled.indexOf("ph-rivers") < 0);

console.log("\n" + passed + " passed, " + failures.length + " failed");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
