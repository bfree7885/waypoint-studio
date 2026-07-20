#!/usr/bin/env node
/**
 * Dashboard V2 unit tests — deterministic briefing, location, activity, cache.
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
  navigator: { onLine: true }
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
  usNational: { seasonLabel: () => "spring" }
};

[
  "design-system/js/dashboard/v2/wds-dashboard-v2-model.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-prefs.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-briefing.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-activity.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-timeline.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-observe.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-trust.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-render.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2.js"
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
        precipitation: { probability: 20 }
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
      daily: [{ uvIndex: 6, precipitation: { probability: 25 } }]
    },
    daylight: {
      sunriseFormatted: "6:42 AM",
      sunsetFormatted: "7:58 PM",
      goldenHour: "6:30–7:15 PM"
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

const briefing = sandbox.WDS.dashboardV2Briefing.build(model, sandbox.WDS.dashboardV2Prefs.load());
assert("briefing has five sections", Object.keys(briefing.sections).length === 5);
assert("briefing traces exist", briefing.traces.length > 0);
assert("feel section uses weather", /cloud|cool|mild|warm|partly/i.test(briefing.sections.feel.body));

const activities = sandbox.WDS.dashboardV2Activity.recommend(model);
assert("activities returned", activities.length >= 5);
assert("photography not unexplained number", activities.some((a) => a.id === "photography" && a.positives.length));

const windows = sandbox.WDS.dashboardV2Activity.buildWindows(model);
assert("windows have display", windows.length === 0 || windows.every((w) => w.display));

const timeline = sandbox.WDS.dashboardV2Timeline.build(model);
assert("timeline has events", timeline.length > 0);

const html = sandbox.WDS.dashboardV2.render(ctx);
assert("render includes Today Outside", /Today Outside/.test(html));
assert("render includes data-dashboard-version", /data-dashboard-version="2"/.test(html));
assert("render includes briefing heading", /What it feels like/.test(html));

sandbox.WDS.dashboardV2.setEnabled(false);
assert("V2 can disable", sandbox.WDS.dashboardV2.isEnabled() === false);
assert("render empty when disabled", sandbox.WDS.dashboardV2.render(ctx) === "");

sandbox.WDS.dashboardV2.setEnabled(true);
sandbox.WDS.dashboardV2Trust.writeCache(model, { briefing: briefing });
const cached = sandbox.WDS.dashboardV2Trust.readCache(model);
assert("cache round-trip", cached && cached.briefing);

console.log("\n" + passed + " passed, " + failures.length + " failed");
if (failures.length) {
  failures.forEach((f) => console.error(" -", f));
  process.exit(1);
}
