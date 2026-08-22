#!/usr/bin/env node
/**
 * Permanent Dashboard depth-attack gate.
 * Rich outdoor instrument library + honesty + customization contracts.
 *
 * Usage: node automation/test-dashboard-depth.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

let failed = 0;
function pass(m) {
  console.log("PASS", m);
}
function fail(m) {
  console.error("FAIL", m);
  failed += 1;
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function load(rel, sandbox) {
  vm.runInNewContext(read(rel), sandbox, { filename: rel });
}

const sandbox = {
  console,
  location: { pathname: "/apps/dashboard/", hash: "" },
  localStorage: {
    _d: {},
    getItem(k) {
      return this._d[k] == null ? null : this._d[k];
    },
    setItem(k, v) {
      this._d[k] = String(v);
    },
    removeItem(k) {
      delete this._d[k];
    }
  },
  matchMedia() {
    return { matches: false };
  }
};
sandbox.global = sandbox;
sandbox.window = sandbox;
sandbox.WDS = {};

[
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-graphics.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-intel.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-prefs.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-deepeners.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-today.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-workspace.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-customize.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-kiosk.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js"
].forEach((rel) => load(rel, sandbox));

const Reg = sandbox.WDS.dashboardRebuildRegistry;
const Data = sandbox.WDS.dashboardRebuildData;
const Prefs = sandbox.WDS.dashboardRebuildPrefs;
const Gfx = sandbox.WDS.dashboardRebuildGraphics;
const Customize = sandbox.WDS.dashboardRebuildCustomize;

const ids = Reg.all().map((w) => w.id);
const need = [
  "ph-conditions",
  "ph-next-hours",
  "ph-doorway",
  "ph-alerts",
  "ph-air",
  "ph-precip-window",
  "ph-uv",
  "ph-light",
  "ph-astronomy",
  "ph-wind",
  "ph-comfort",
  "ph-day-range"
];
if (need.every((id) => ids.includes(id))) pass("catalog has depth tiles (" + ids.length + ")");
else fail("missing depth tiles: " + need.filter((id) => !ids.includes(id)).join(","));

if (Reg.sizes.includes("small") && Reg.sizes.includes("standard") && Reg.sizes.includes("wide")) {
  pass("sizes include small/standard/wide");
} else fail("size model incomplete: " + Reg.sizes.join(","));

const defaults = Prefs.defaults();
const defNeed = [
  "ph-conditions",
  "ph-next-hours",
  "ph-doorway",
  "ph-alerts",
  "ph-air",
  "ph-precip-window",
  "ph-uv",
  "ph-light",
  "ph-astronomy"
];
if (defNeed.every((id) => defaults.enabled.includes(id))) pass("default hierarchy includes core outdoors set");
else fail("defaults missing: " + defNeed.filter((id) => !defaults.enabled.includes(id)).join(","));
if (!defaults.enabled.includes("ph-wind") && !defaults.enabled.includes("ph-comfort")) {
  pass("optional wind/comfort off by default");
} else fail("optional tiles unexpectedly enabled by default");

if (Reg.get("ph-alerts").live === true) pass("alerts marked live");
else fail("alerts still not live");

if (!Data.liveIds.includes("ph-alerts") || !Data.liveIds.includes("ph-doorway")) {
  fail("LIVE_IDS missing alerts/doorway");
} else pass("LIVE_IDS include alerts + doorway");

// Honesty: placeholder weather must not become live conditions
const fake = {
  meta: {},
  weatherRef: { meta: { isPlaceholder: true }, current: { temperature: { value: 72 } } }
};
const condFake = Data.buildWidgetPayload("ph-conditions", fake);
if (condFake && condFake.status !== "live") pass("placeholder weather refused as live");
else fail("placeholder weather leaked as live");

// Alerts empty is honest live none
const alertsEmpty = Data.buildWidgetPayload("ph-alerts", {
  meta: {},
  alerts: { status: "empty", items: [] }
});
if (
  alertsEmpty &&
  alertsEmpty.status === "live" &&
  alertsEmpty.facts &&
  /No active alerts/i.test(alertsEmpty.facts[0].value)
) {
  pass("alerts empty is honest live none");
} else fail("alerts empty payload wrong");

// Alerts live with items
const alertsLive = Data.buildWidgetPayload("ph-alerts", {
  meta: {},
  alerts: {
    status: "live",
    items: [{ event: "Flood Watch", severity: "Moderate", headline: "Flood Watch" }]
  }
});
if (alertsLive && alertsLive.status === "live" && /Flood Watch/.test(alertsLive.facts[0].value)) {
  pass("alerts live surfaces event");
} else fail("alerts live payload wrong");

// Light trust not blindly estimated
const light = Data.buildWidgetPayload("ph-light", {
  meta: {},
  daylight: {
    status: "live",
    sunriseFormatted: "6:12 AM",
    sunsetFormatted: "7:48 PM",
    goldenHourEvening: "6:55–7:25 PM",
    goldenHourStatus: "live",
    blueHourStatus: "live"
  }
});
if (light && light.trust === "live") pass("light live trust not inverted");
else fail("light trust still inverted: " + (light && light.trust));

// Derived doorway
const doorway = Data.buildWidgetPayload("ph-doorway", {
  meta: {},
  alerts: { status: "empty", items: [] },
  airQuality: { status: "live", category: "Good", usAqi: 32 },
  weatherRef: {
    meta: { isPlaceholder: false, provider: "open-meteo" },
    current: {
      temperature: { value: 68 },
      wind: { speed: { value: 6 } },
      uvIndex: { value: 4 },
      precipitation: { probability: { value: 10 } },
      conditions: { summary: "Partly cloudy" }
    },
    hourly: [],
    daily: [{ uvIndex: { value: 6 }, temperatureHigh: { value: 74 }, temperatureLow: { value: 55 } }]
  },
  daylight: { status: "live", sunsetFormatted: "7:48 PM" }
});
if (
  doorway &&
  doorway.trust === "derived" &&
  ((doorway.brief && doorway.brief.length > 5) || (doorway.facts && doorway.facts.length))
) {
  pass("doorway derived brief works");
} else fail("doorway derived brief failed");
if (doorway && doorway.brief) pass("doorway intel brief present");
else fail("doorway intel brief missing");

// Hourly next hours
const now = Date.now();
const hours = Data.buildWidgetPayload("ph-next-hours", {
  meta: {},
  weatherRef: {
    meta: { isPlaceholder: false },
    current: {},
    hourly: [1, 2, 3, 4].map((i) => ({
      time: new Date(now + i * 3600000).toISOString(),
      temperature: { value: 60 + i },
      precipitation: { probability: { value: 10 * i } },
      conditions: { summary: "Clear" }
    }))
  }
});
if (hours && hours.status === "live" && hours.facts.length >= 3) pass("next-hours from hourly");
else fail("next-hours failed");

// Graphics
if (Gfx && Gfx.render({ kind: "sky", state: "rain" }).includes("<svg")) pass("sky graphic renders");
else fail("sky graphic missing");
var aqiHtml = Gfx.render({ kind: "aqi", value: 40 });
if (aqiHtml && (aqiHtml.includes("wdb-r-graphic--aqi") || aqiHtml.includes("wdb-r-widget__art--aqi"))) pass("aqi graphic renders");
else fail("aqi graphic missing");

// Customize grouped library
const catalogHtml = Customize.renderCatalog(defaults, { libraryFilter: "all" });
if (/Add instruments/.test(catalogHtml) && /wdb-r-catalog__group-title/.test(catalogHtml)) {
  pass("customize library grouped");
} else fail("customize library not grouped");
if (!/Open Scenes|Side Trails|Field Notes/.test(catalogHtml)) pass("customize stays surface-isolated");
else fail("customize leaked cross-product promo");

// Prefs persistence round-trip
Prefs.beginDraft();
Prefs.setEnabled("ph-wind", true);
Prefs.setSize("ph-wind", "small");
Prefs.commitDraft();
const loaded = Prefs.load();
if (loaded.enabled.includes("ph-wind") && loaded.sizes["ph-wind"] === "small") {
  pass("prefs persist enable + small size");
} else fail("prefs persistence failed");
Prefs.reset();

// Surface isolation still present
const deepen = read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-deepeners.js");
if (/Open Scenes|SIDE_TRAILS|Field Notes/.test(deepen)) fail("deepeners reintroduced promo");
else pass("deepeners remain Dashboard-only");

const wds = read("design-system/js/wds.js");
if (/wds-dashboard-rebuild-graphics\.js/.test(wds)) pass("wds loads graphics module");
else fail("wds missing graphics module");
if (/rebuild-intel\.js[\s\S]*rebuild-data\.js/.test(wds)) pass("wds loads intel before data");
else fail("wds missing intel before data");

if (failed) {
  console.error("\nDASHBOARD DEPTH: FAIL (" + failed + ")");
  process.exit(1);
}
console.log("\nDASHBOARD DEPTH: PASS");
