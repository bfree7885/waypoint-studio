#!/usr/bin/env node
/**
 * Dashboard V2 unit tests — widgets, prefs, Waypoint’s Take, kiosk sync, honesty.
 * Run: node automation/test-dashboard-v2.mjs
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
      return { innerHTML: "", firstElementChild: null, replaceWith() {}, classList: { toggle() {}, contains() { return false; } } };
    },
    fullscreenElement: null,
    exitFullscreen() {},
    documentElement: {
      requestFullscreen() {},
      classList: {
        _k: false,
        toggle(name, on) {
          if (name === "wdb-v2-kiosk") this._k = !!on;
        },
        contains(name) {
          return name === "wdb-v2-kiosk" && this._k;
        }
      }
    },
    addEventListener() {},
    _wdbV2FsBound: false
  },
  CustomEvent: function CustomEvent(type, init) {
    this.type = type;
    this.detail = init && init.detail;
  },
  localStorage: {
    _data: {},
    getItem(k) {
      return Object.prototype.hasOwnProperty.call(this._data, k) ? this._data[k] : null;
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
  "design-system/js/dashboard/v2/wds-dashboard-v2-engine.js"
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
        },
        {
          time: new Date(Date.now() + 5 * 3600000).toISOString(),
          temperature: 68,
          precipitation: { probability: 10 },
          wind: { speed: 8 },
          cloudCover: 25,
          uvIndex: 7
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

assert("V2 enabled by default", sandbox.WDS.dashboardV2.isEnabled() === true);

const model = sandbox.WDS.dashboardV2Model.normalizeFromContext(ctx);
assert("location never null/undefined", !/null|undefined/i.test(model.location.label));
assert("rejects 0,0 coords", sandbox.WDS.dashboardV2Model.isValidCoords(0, 0) === false);
assert("valid coords accepted", model.location.coordsOk === true);

const Cat = sandbox.WDS.dashboardV2Widgets;
assert("widget catalog has categories", Cat.categories().length === 10);
assert("every widget has exactly one category", Cat.all().every((w) => Cat.categoryById(w.category)));
assert("default enabled is curated", Cat.defaultEnabledIds().length <= 12);
assert("current conditions is live", Cat.byId("wx-current").availability === "live");
assert("pollen is planned", Cat.byId("air-pollen").availability === "planned");
assert("insect is planned", Cat.byId("hike-insect").availability === "planned");

const prefs = sandbox.WDS.dashboardV2Prefs.load();
assert("defaults include current conditions", prefs.enabled.includes("wx-current"));
assert("defaults include hiking", prefs.enabled.includes("hike-conditions"));
assert("defaults do not enable every widget", prefs.enabled.length < Cat.all().length);

sandbox.WDS.dashboardV2Prefs.save({
  enabled: ["wx-current", "air-aqi"],
  order: ["air-aqi", "wx-current", "wx-hourly"]
});
const reloaded = sandbox.WDS.dashboardV2Prefs.load();
assert("prefs persist enabled set", reloaded.enabled.join(",") === "wx-current,air-aqi");
assert(
  "selected ids follow order",
  sandbox.WDS.dashboardV2Prefs.selectedIds(reloaded).join(",") === "air-aqi,wx-current"
);

sandbox.WDS.dashboardV2Prefs.reset();
assert("reset restores defaults", sandbox.WDS.dashboardV2Prefs.load().enabled.includes("photo-conditions"));

const take = sandbox.generateWaypointsTake({
  weather: model.weather,
  hourly: model.weather.hourly,
  alerts: model.alerts,
  astronomy: { daylight: model.daylight, moon: model.moon },
  photography: model.photography,
  hiking: { level: "good", summary: "Good hiking conditions" },
  airQuality: model.air,
  uv: model.weather.current.uv,
  rivers: model.rivers,
  seasonal: { season: model.season },
  trust: model.provider.trust,
  location: model.location,
  currentTime: new Date(),
  model
});
assert("take has bullets", take.bullets.length >= 5 && take.bullets.length <= 10);
assert("take mentions conditions or hiking", take.bullets.some((b) => /hiking|partly|°|sunset|air/i.test(b)));
assert("take title", take.title === "Waypoint’s Take");

const hazardTake = sandbox.generateWaypointsTake({
  model: {
    ...model,
    alerts: {
      status: "live",
      items: [{ event: "Flood Warning", headline: "River flooding expected", severity: "Severe" }]
    },
    provider: { trust: "live" }
  },
  alerts: {
    status: "live",
    items: [{ event: "Flood Warning", headline: "River flooding expected", severity: "Severe" }]
  },
  weather: model.weather,
  trust: "live",
  location: model.location
});
assert("hazard take prioritizes alert", /Flood Warning|flood/i.test(hazardTake.bullets[0]));

const plannedBody = sandbox.WDS.dashboardV2WidgetRender.renderBody(Cat.byId("air-pollen"), model);
assert("planned widget does not invent values", /Planned/i.test(plannedBody.html));
assert("planned state", plannedBody.state === "planned");

const liveBody = sandbox.WDS.dashboardV2WidgetRender.renderBody(Cat.byId("wx-current"), model);
assert("live current conditions shows temp", /58|56/.test(liveBody.html));

sandbox.WDS.dashboardV2Prefs.save({
  enabled: Cat.defaultEnabledIds(),
  order: Cat.all().map((w) => w.id)
});

const html = sandbox.WDS.dashboardV2.render(ctx);
assert("render includes data-dashboard-version", /data-dashboard-version="2"/.test(html));
assert("render includes Waypoint’s Take", /Waypoint’s Take/.test(html));
assert("render includes Customize widgets", /Customize widgets/.test(html));
assert("render includes category Weather", /data-wdb-v2-category="weather"/.test(html));
assert("render includes Current Conditions widget", /Current Conditions/.test(html));
assert("render includes trust state Live", />Live</.test(html));
assert("render uses valid header actions div", /<div class="wdb-v2-header__actions">/.test(html) && !/<motion\.div/.test(html));

/* Category grouping preserves enabled set */
const grouped = sandbox.WDS.dashboardV2WidgetRender.renderGrouped(
  ["photo-conditions", "wx-current", "astro-sun"],
  model
);
assert("category grouping emits Weather section", /data-wdb-v2-category="weather"/.test(grouped));
assert("category grouping emits Astronomy section", /data-wdb-v2-category="astronomy"/.test(grouped));
assert("category grouping emits Photography section", /data-wdb-v2-category="photography"/.test(grouped));
assert(
  "categories appear in registry order",
  grouped.indexOf('data-wdb-v2-category="weather"') < grouped.indexOf('data-wdb-v2-category="astronomy"') &&
    grouped.indexOf('data-wdb-v2-category="astronomy"') < grouped.indexOf('data-wdb-v2-category="photography"')
);

/* Provider failures / honesty */
const failCtx = JSON.parse(JSON.stringify(ctx));
failCtx.platform.meta.connectivity = "offline";
failCtx.platform.meta.fromCache = true;
failCtx.platform.meta.blockStatus = {
  weather: "unavailable",
  airQuality: "unavailable",
  alerts: "unavailable",
  usgsWater: "unavailable"
};
failCtx.platform.weatherRef.meta.isPlaceholder = true;
failCtx.platform.weatherRef.current = {};
failCtx.platform.weatherRef.hourly = [];
failCtx.platform.airQuality = { status: "unavailable" };
failCtx.platform.alerts = { status: "unavailable", items: [] };
failCtx.platform.water = { status: "unavailable", sites: [] };
const failModel = sandbox.WDS.dashboardV2Model.normalizeFromContext(failCtx);
const failTake = sandbox.generateWaypointsTake({
  model: failModel,
  weather: failModel.weather,
  alerts: failModel.alerts,
  trust: failModel.provider.trust || "offline",
  location: failModel.location
});
assert(
  "provider failure take is honest",
  /offline|cached|partial|incomplete|waiting/i.test(failTake.bullets.join(" ") + " " + (failTake.trustNote || ""))
);
assert(
  "wx-current unavailable without live weather",
  sandbox.WDS.dashboardV2Widgets.resolveAvailability(Cat.byId("wx-current"), failModel) === "unavailable" ||
    /Waiting|unavailable/i.test(sandbox.WDS.dashboardV2WidgetRender.renderBody(Cat.byId("wx-current"), failModel).html)
);

const noRiverCtx = JSON.parse(JSON.stringify(ctx));
noRiverCtx.platform.water = { status: "unavailable", sites: [] };
const noRiverModel = sandbox.WDS.dashboardV2Model.normalizeFromContext(noRiverCtx);
const riverAvail = Cat.resolveAvailability(Cat.byId("river-nearby"), noRiverModel);
assert("river nearby unavailable without gauges", riverAvail === "unavailable");

/* Shared engine + kiosk sync */
const Engine = sandbox.WDS.dashboardV2Engine;
assert("shared engine exists", !!Engine);
assert("engine storage keys match prefs/trust", Engine.storageKeys().widgets === sandbox.WDS.dashboardV2Prefs.STORAGE_KEY);
assert("engine storage keys include cache", Engine.storageKeys().cache === sandbox.WDS.dashboardV2Trust.CACHE_KEY);

sandbox.WDS.dashboardV2Prefs.save({
  enabled: ["wx-current", "hike-conditions", "alert-nws"],
  order: ["alert-nws", "hike-conditions", "wx-current"]
});
const dashSnap = Engine.syncSnapshot();
Engine.setKioskMode(true);
const kioskSnap = Engine.syncSnapshot();
assert("kiosk mode flag set", Engine.isKioskMode() === true && kioskSnap.kiosk === true);
assert(
  "kiosk sync shares selected widgets",
  dashSnap.selectedIds.join(",") === kioskSnap.selectedIds.join(",") &&
    kioskSnap.selectedIds.join(",") === "alert-nws,hike-conditions,wx-current"
);
const dashPayload = Engine.buildPayload(ctx, { kiosk: false });
const kioskPayload = Engine.buildPayload(ctx, { kiosk: true });
assert(
  "kiosk payload shares take bullets",
  dashPayload.take.bullets.join("|") === kioskPayload.take.bullets.join("|")
);
assert(
  "kiosk payload shares selected ids",
  dashPayload.selectedIds.join(",") === kioskPayload.selectedIds.join(",")
);
const kioskHtml = Engine.renderBoard(ctx, { kiosk: true });
assert("kiosk board marks kiosk mode", /wdb-v2--kiosk|data-wdb-v2-kiosk/.test(kioskHtml));
assert("kiosk board still uses customize + take", /Customize widgets/.test(kioskHtml) && /Waypoint’s Take/.test(kioskHtml));
Engine.setKioskMode(false);

/* Customize panel exposes keyboard reorder */
const panelHtml = sandbox.WDS.dashboardV2Customize.renderPanel(sandbox.WDS.dashboardV2Prefs.load(), model);
assert("customize panel has move up/down", /data-v2-move="up"/.test(panelHtml) && /data-v2-move="down"/.test(panelHtml));
assert("customize groups by category", /data-v2-category="weather"/.test(panelHtml) && /data-v2-category="seasonal"/.test(panelHtml));

sandbox.WDS.dashboardV2.setEnabled(false);
assert("V2 can disable", sandbox.WDS.dashboardV2.isEnabled() === false);
assert("render empty when disabled", sandbox.WDS.dashboardV2.render(ctx) === "");

sandbox.WDS.dashboardV2.setEnabled(true);
const briefing = sandbox.WDS.dashboardV2Briefing.build(model, sandbox.WDS.dashboardV2Prefs.load());
assert("legacy briefing still builds", Object.keys(briefing.sections).length === 5);

console.log("\n" + passed + " passed, " + failures.length + " failed");
if (failures.length) {
  failures.forEach((f) => console.error(" -", f));
  process.exit(1);
}
