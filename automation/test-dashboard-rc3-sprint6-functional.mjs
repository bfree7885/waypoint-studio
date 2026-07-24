#!/usr/bin/env node
/**
 * Dashboard RC3 Sprint 6 — functional catalog + mobile layout contracts.
 * Run: node automation/test-dashboard-rc3-sprint6-functional.mjs
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
assert("phone forces single-column grid", /@media \(max-width: 40rem\)[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(css));
assert(
  "phone full-bleed overrides all data-columns",
  /data-columns="2"[\s\S]*grid-column:\s*1 \/ -1/.test(css) &&
    /data-columns="3"[\s\S]*grid-column:\s*1 \/ -1/.test(css)
);
assert("phone stacks widget head", /@media \(max-width: 40rem\)[\s\S]*\.wdb-r-widget__head[\s\S]*flex-direction:\s*column/.test(css));
assert("title allows wrap", /\.wdb-r-widget__title[\s\S]*overflow-wrap:\s*anywhere/.test(css));
assert("category no longer nowrap-only", !/\.wdb-r-widget__cat\s*\{[^}]*white-space:\s*nowrap/.test(css));

const indexHtml = fs.readFileSync(path.join(ROOT, "apps/dashboard/index.html"), "utf8");
assert("cache bust sprint6", /dash-rc3-s6/.test(indexHtml));

const modules = [
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-prefs.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-intelligence.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-today.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-workspace.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-customize.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-kiosk.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js"
];

const sandbox = {
  window: {},
  console,
  document: {
    documentElement: {
      classList: { add() {}, remove() {}, contains() { return false; } },
      setAttribute() {},
      removeAttribute() {},
      getAttribute() { return null; }
    },
    hidden: false,
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return null; }
  },
  location: { pathname: "/apps/dashboard/", hash: "#/" },
  history: { replaceState() {} },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
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
  setInterval() { return 1; },
  clearInterval() {},
  matchMedia() { return { matches: false }; },
  Date,
  isFinite,
  Number,
  String,
  Object,
  Array,
  JSON,
  Math
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.WDS = {};
modules.forEach((rel) => load(rel, sandbox));

const Reg = sandbox.WDS.dashboardRebuildRegistry;
const Data = sandbox.WDS.dashboardRebuildData;
const Prefs = sandbox.WDS.dashboardRebuildPrefs;
const Today = sandbox.WDS.dashboardRebuildToday;
const Customize = sandbox.WDS.dashboardRebuildCustomize;

assert("registry sprint6 version", /rc3-s6/.test(Reg.version));
assert("data sprint6 version", /rc3-s6/.test(Data.version));
assert("exactly 15 live tiles", Reg.all().length === 15 && Data.liveIds.length === 15, String(Reg.all().length));
assert(
  "every tile live",
  Reg.all().every((w) => w.live === true)
);
assert(
  "removed placeholders",
  ["ph-photography", "ph-wildlife", "ph-trails", "ph-travel", "ph-astronomy"].every((id) => !Reg.get(id))
);

const REMOVED = ["ph-photography", "ph-wildlife", "ph-trails", "ph-travel"];
assert("removedIds exported", Array.isArray(Reg.removedIds) && Reg.removedIds.indexOf("ph-photography") >= 0);

const platform = {
  meta: { fromCache: false },
  weatherRef: {
    meta: { isPlaceholder: false },
    current: {
      temperature: 70,
      humidity: 50,
      cloudCover: 25,
      uvIndex: 5,
      wind: { speed: 6, gust: 9 },
      precipitation: { probability: 20 },
      conditions: { summary: "Clear" }
    },
    hourly: [{ time: "2026-07-24T16:00:00-04:00", temperature: 71, precipitation: { probability: 10 }, conditions: { summary: "Clear" } }],
    daily: [{ temperatureHigh: 76, temperatureLow: 55, precipitation: { probability: 15 }, conditions: { summary: "Clear" }, uvIndex: 6 }]
  },
  daylight: {
    status: "live",
    sunriseFormatted: "5:50 AM",
    sunsetFormatted: "8:20 PM",
    goldenHourEvening: "7:20–8:20 PM",
    goldenHourStatus: "estimated",
    blueHourEvening: "8:20–8:50 PM",
    blueHourStatus: "estimated",
    moonPhase: "Waning Gibbous",
    moonIllumination: 70
  },
  airQuality: { status: "live", aqi: 38, category: "Good", pm25: 7 },
  alerts: { status: "live", items: [], count: 0 },
  usgsWater: {
    nearest: { name: "Test Gauge", stageFt: 2.1, flowCfs: 900, trend: "falling" },
    trust: "Live"
  }
};

Data.liveIds.forEach(function (id) {
  const payload = Reg.getData(id, { platform });
  assert(id + " ready or honest", payload && (payload.status === "live" || payload.status === "unavailable"));
  assert(id + " no Coming Soon", !/coming soon/i.test(JSON.stringify(payload)));
  assert(id + " no Waiting badge when live", payload.status !== "live" || payload.trust !== "waiting");
});

const catalog = Customize.renderCatalog(Prefs.load(), { libraryFilter: "all" });
assert("picker has no Coming Soon", !/Coming Soon/i.test(catalog));
assert("picker lists River Gauge", /River Gauge/.test(catalog));
assert("picker lists Hourly", /Hourly/.test(catalog));
assert("picker lists UV Index", /UV Index/.test(catalog));
assert("picker lists Stargazing", /Stargazing/.test(catalog));

const linesOffAir = Data.composeTodayLines(platform, { enabled: ["ph-conditions", "ph-wind"] });
assert("enabled filter keeps conditions", linesOffAir.some((l) => /70°F|Clear|Winds/i.test(l)));
assert("enabled filter drops air", !linesOffAir.some((l) => /Air quality/i.test(l)));
assert("enabled filter drops moon", !linesOffAir.some((l) => /moon/i.test(l)));

const todayHtml = Today.render({
  placeLabel: "Sprint 6",
  platform,
  enabled: ["ph-conditions", "ph-air"],
  lines: Data.composeTodayLines(platform, { enabled: ["ph-conditions", "ph-air"] })
});
assert("today uses enabled summary", /Air quality is Good|70°F/i.test(todayHtml));
assert("today no Coming Soon", !/Coming Soon/i.test(todayHtml));

sandbox.localStorage.setItem(
  Prefs.storageKey,
  JSON.stringify({
    version: 1,
    enabled: ["ph-conditions", "ph-astronomy", "ph-photography", "ph-wildlife"],
    order: ["ph-wildlife", "ph-astronomy", "ph-conditions", "ph-photography"],
    sizes: { "ph-astronomy": "lg" },
    favorites: ["ph-astronomy", "ph-wildlife"],
    gridColumns: 2,
    preset: "default",
    kioskRefreshMs: 300000
  })
);
const migrated = Prefs.load();
assert("migration keeps conditions", migrated.enabled.indexOf("ph-conditions") >= 0);
assert("migration maps astronomy→moon", migrated.enabled.indexOf("ph-moon") >= 0);
assert("migration drops placeholders", REMOVED.every((id) => migrated.enabled.indexOf(id) < 0));
assert("migration no empty gaps from unknown ids", migrated.enabled.every((id) => !!Reg.get(id)));
assert("migration favorite maps to moon", migrated.favorites.indexOf("ph-moon") >= 0);
assert("migration drops wildlife favorite", migrated.favorites.indexOf("ph-wildlife") < 0);
assert("migration preserves columns", migrated.gridColumns === 2);

console.log("\n" + passed + " passed, " + failures.length + " failed");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
