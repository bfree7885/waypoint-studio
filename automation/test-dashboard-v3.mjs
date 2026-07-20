#!/usr/bin/env node
/**
 * Dashboard V3 foundation tests — shell, brief, categories, layout, contract.
 * Run: node automation/test-dashboard-v3.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

let passed = 0;
const failures = [];

function pass(name) {
  console.log("PASS", name);
  passed += 1;
}

function assert(name, cond, detail) {
  if (cond) pass(name);
  else {
    failures.push(name + (detail ? ": " + detail : ""));
    console.error("FAIL", name, detail || "");
  }
}

function load(rel, sandbox) {
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), sandbox, { filename: rel });
}

const sandbox = {
  window: {},
  globalThis: {},
  console,
  document: {
    createElement() {
      return { innerHTML: "", firstElementChild: null, replaceWith() {}, classList: { toggle() {}, contains() { return false; } }, setAttribute() {}, getAttribute() { return null; }, querySelector() { return null; }, addEventListener() {}, removeEventListener() {} };
    },
    fullscreenElement: null,
    exitFullscreen() {},
    documentElement: {
      requestFullscreen() {},
      classList: { toggle() {}, contains() { return false; } },
      setAttribute() {},
      getAttribute() { return null; }
    },
    addEventListener() {},
    removeEventListener() {},
    hidden: false,
    querySelector() { return null; }
  },
  addEventListener() {},
  removeEventListener() {},
  CustomEvent: function CustomEvent(type, init) {
    this.type = type;
    this.detail = init && init.detail;
  },
  localStorage: {
    _data: {},
    getItem(k) {
      return this._data[k] || null;
    },
    setItem(k, v) {
      this._data[k] = String(v);
    },
    removeItem(k) {
      delete this._data[k];
    }
  },
  navigator: { onLine: true },
  dispatchEvent() {}
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.setInterval = () => 1;
sandbox.clearInterval = () => {};
sandbox.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
sandbox.WDS = {
  outdoorWeatherIntel: {
    hikingComfort() {
      return { level: "good", summary: "Good hiking conditions", detail: "" };
    },
    photographyConditions() {
      return { level: "excellent", summary: "Diffuse light", detail: "" };
    }
  },
  photographyConditions: {
    fromPlatform() {
      return { status: "live", score: 4, summary: "Diffuse light", detail: "Cloud cover", level: "excellent" };
    }
  },
  integrations: {
    get(id) {
      return { provider: id, status: "live" };
    }
  },
  dashboardReliability: {
    classifyPackageTrust() {
      return "live";
    }
  },
  usNational: { seasonLabel: () => "summer" }
};

[
  "design-system/js/dashboard/v2/wds-dashboard-v2-model.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-widgets.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-prefs.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-take.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-briefing.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-activity.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-timeline.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-observe.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-trust.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-widget-render.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-render.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-customize.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-engine.js",
  "design-system/js/dashboard/v3/wds-dashboard-v3-categories.js",
  "design-system/js/dashboard/v3/wds-dashboard-v3-catalog.js",
  "design-system/js/dashboard/v3/wds-dashboard-v3-contract.js",
  "design-system/js/dashboard/v3/wds-dashboard-v3-layout.js",
  "design-system/js/dashboard/v3/wds-dashboard-v3-brief.js",
  "design-system/js/dashboard/v3/wds-dashboard-v3-shell.js",
  "design-system/js/dashboard/v3/wds-dashboard-v3-kiosk.js",
  "design-system/js/dashboard/v3/wds-dashboard-v3.js"
].forEach((f) => load(f, sandbox));

const ctx = {
  location: {
    city: "Milford",
    county: "Pike County",
    stateCode: "PA",
    lat: 41.32,
    lng: -74.8,
    source: "browser",
    displayTitle: "Milford, PA"
  },
  platform: {
    meta: {
      hydratedAt: new Date().toISOString(),
      blockStatus: { weather: "live", airQuality: "live", alerts: "live", usgsWater: "live" },
      fromCache: false,
      connectivity: "online"
    },
    weatherRef: {
      meta: { isPlaceholder: false },
      current: {
        temperature: 58,
        feelsLike: 56,
        humidity: 72,
        cloudCover: 55,
        uvIndex: 4,
        wind: { speed: 6 },
        conditions: { summary: "Partly cloudy" },
        precipitation: { probability: 20 },
        visibility: 10
      },
      hourly: [
        {
          time: new Date(Date.now() + 3600000).toISOString(),
          temperature: 62,
          precipitation: { probability: 15 },
          wind: { speed: 5 },
          cloudCover: 40,
          uvIndex: 5
        }
      ],
      daily: [{ uvIndex: 6, precipitation: { probability: 25 }, temperatureMax: 72, temperatureMin: 52 }]
    },
    daylight: {
      sunriseFormatted: "6:42 AM",
      sunsetFormatted: "7:58 PM",
      goldenHour: "6:30–7:15 PM",
      blueHour: "8:05–8:35 PM"
    },
    moon: { phaseLabel: "Waxing gibbous", illumination: 78 },
    airQuality: { status: "live", usAqi: 42, category: "Good" },
    alerts: { status: "live", items: [] },
    water: {
      status: "live",
      sites: [
        {
          name: "Delaware River at Milford",
          gageHeight: 4.2,
          streamflow: 1200,
          trend: "Stable",
          distanceMi: 3.1,
          observedAt: "2026-07-19T10:00:00Z"
        }
      ]
    },
    rainfall: { recent: { amount: 0.35, unit: "in", periodDays: 7 } }
  }
};

sandbox.WDS.dashboardV3.setEnabled(true);
assert("V3 enabled by default", sandbox.WDS.dashboardV3.isEnabled() === true);

const Cats = sandbox.WDS.dashboardV3Categories;
assert("ten categories registered", Cats.all().length === 10);
assert("includes wildlife", !!Cats.byId("wildlife"));
assert("includes travel", !!Cats.byId("travel"));
assert("includes emergency", !!Cats.byId("emergency"));
assert("includes favorites", !!Cats.byId("favorites"));
assert("alerts maps to emergency", Cats.normalizeId("alerts") === "emergency");
assert("seasonal maps to wildlife", Cats.normalizeId("seasonal") === "wildlife");

const Cat = sandbox.WDS.dashboardV2Widgets;
assert("catalog uses emergency category", Cat.byId("alert-nws").category === "emergency");
assert("catalog uses wildlife category", Cat.byId("season-wildlife").category === "wildlife");
assert("travel stub exists", Cat.byId("travel-weekend").availability === "derived");
assert("favorites stub exists", Cat.byId("fav-pinned").category === "favorites");
assert("default enabled curated", Cat.defaultEnabledIds().length <= 12);

const model = sandbox.WDS.dashboardV2Model.normalizeFromContext(ctx);
const brief = sandbox.WDS.dashboardV3Brief.build({ model });
assert("brief has bullets", brief.bullets.length >= 3);
assert("brief title", /Outdoor Brief/i.test(brief.title));
const briefHtml = sandbox.WDS.dashboardV3Brief.render(brief);
assert("brief html renders list", /wdb-v3-brief__list/.test(briefHtml));

const layout = sandbox.WDS.dashboardV3Layout.load(["wx-current", "air-aqi"]);
assert("layout has order", layout.order.includes("wx-current"));
layout.sizes["wx-current"] = "lg";
sandbox.WDS.dashboardV3Layout.save(layout);
const reloaded = sandbox.WDS.dashboardV3Layout.load(["wx-current", "air-aqi"]);
assert("layout persists size", reloaded.sizes["wx-current"] === "lg");

const card = sandbox.WDS.dashboardV3Contract.renderCardSafe({
  id: "wx-current",
  category: "weather",
  title: "Current Conditions",
  primaryValue: "58°F",
  availability: "live",
  expandTab: "weather"
});
assert("contract card has refresh", /data-wdb-v3-widget-refresh/.test(card));
assert("contract card has expand", /data-wdb-v3-widget-expand/.test(card));

const boom = sandbox.WDS.dashboardV3Contract.renderCardSafe({
  id: "bad",
  title: "Bad",
  get primaryValue() {
    throw new Error("boom");
  }
});
assert("contract isolates errors", /failed independently/i.test(boom));

sandbox.WDS.dashboardV2Prefs.reset();
const html = sandbox.WDS.dashboardV3.render(ctx);
assert("render version 3", /data-dashboard-version="3"/.test(html));
assert("render includes Brief", /Today’s Outdoor Brief|Today's Outdoor Brief/.test(html));
assert("render Brief before widgets area", html.indexOf("wdb-v3-brief") < html.indexOf("wdb-v3-widgets-area"));
assert("render Customize Dashboard", /Customize Dashboard/.test(html));
assert("render widget area", /wdb-v3-widgets-area/.test(html));
assert("render footer", /wdb-v3-footer/.test(html));
assert("render Current Conditions", /Current Conditions/.test(html));
assert("no horizontal layout class overflow marker", !/overflow-x:\s*scroll/.test(html));

const viaEngine = sandbox.WDS.dashboardV2Engine.renderBoard(ctx);
assert("engine routes to V3", /data-dashboard-version="3"/.test(viaEngine));

sandbox.WDS.dashboardV3.setEnabled(false);
const v2html = sandbox.WDS.dashboardV3.render(ctx);
assert("V3 off falls back to V2 board", /data-dashboard-version="2"/.test(v2html));
sandbox.WDS.dashboardV3.setEnabled(true);

const summary = sandbox.WDS.dashboardV3Brief.renderSummaryList(["Pack layers"], { title: "Cues", id: "c1" });
assert("reusable summary list", /Pack layers/.test(summary) && /Cues/.test(summary));

/* Sprint 5 — kiosk / polish */
const Kiosk = sandbox.WDS.dashboardV3Kiosk;
assert("kiosk controller present", !!Kiosk);
assert("kiosk layout presets", Kiosk.layoutPresets().length >= 3);
assert("layout rotation profiles", sandbox.WDS.dashboardV3Layout.rotationProfiles().length >= 3);
Kiosk.applyPreset("dense-conditions");
const afterPreset = sandbox.WDS.dashboardV3Layout.load(["wx-current", "air-aqi"]);
assert("preset densify compact", afterPreset.densify === "compact");

const kioskHtml = sandbox.WDS.dashboardV3.render(ctx, { kiosk: true });
assert("kiosk render flag", /data-wdb-v3-kiosk="1"/.test(kioskHtml));
assert("kiosk has clock", /data-wdb-v3-clock/.test(kioskHtml));
assert("kiosk sticky brief", /wdb-v3-brief--sticky/.test(kioskHtml));
assert("kiosk hides customize bar", !/data-wdb-v3-customize-bar/.test(kioskHtml));
assert("kiosk has connectivity slot", /data-wdb-v3-connectivity/.test(kioskHtml));
assert("kiosk exit control", /Exit kiosk|Exit full screen/i.test(kioskHtml));

sandbox.navigator.onLine = false;
const offlineHtml = sandbox.WDS.dashboardV3Shell.render(
  { model: { location: { label: "Milford, PA" }, provider: { trust: "offline", hydratedAt: new Date().toISOString() } }, brief: brief, widgetsHtml: "", providers: [] },
  { kiosk: true }
);
assert("offline banner copy", /Offline/.test(offlineHtml));
sandbox.navigator.onLine = true;

const stickyBrief = sandbox.WDS.dashboardV3Brief.render(brief, { sticky: true });
assert("sticky brief class", /wdb-v3-brief--sticky/.test(stickyBrief));

const css = fs.readFileSync(path.join(ROOT, "design-system/css/wds-dashboard-v3.css"), "utf8");
assert("v3 css has brief styles", /\.wdb-v3-brief\b/.test(css));
assert("v3 css has kiosk styles", /\.wdb-v3--kiosk\b/.test(css));
assert("v3 css reduced motion", /prefers-reduced-motion/.test(css));
assert("v3 css mobile breakpoint", /max-width:\s*480px/.test(css));

const wdsLoader = fs.readFileSync(path.join(ROOT, "design-system/js/wds.js"), "utf8");
assert("wds loads kiosk module", /wds-dashboard-v3-kiosk\.js/.test(wdsLoader));

const kioskPage = fs.readFileSync(path.join(ROOT, "kiosk.html"), "utf8");
assert("standalone kiosk has Outdoor Brief", /swk-brief|Outdoor Brief/i.test(kioskPage));

console.log("\n" + passed + " passed, " + failures.length + " failed");
if (failures.length) {
  failures.forEach((f) => console.error(" -", f));
  process.exit(1);
}
