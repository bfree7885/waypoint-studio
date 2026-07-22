#!/usr/bin/env node
/**
 * Outside / Dashboard OS — observational copy philosophy tests.
 * Run: node automation/test-dashboard-os-copy.mjs
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

const sandbox = {
  window: {},
  globalThis: {},
  console,
  Date,
  localStorage: { _data: {}, getItem() { return null; }, setItem() {}, removeItem() {} },
  navigator: { onLine: true }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.WDS = {
  outdoorWeatherIntel: {
    hikingComfort() { return { level: "good", summary: "Good", detail: "" }; },
    photographyConditions() { return { level: "fair", summary: "Fair", detail: "" }; }
  },
  photographyConditions: {
    fromPlatform() { return { status: "fair", score: 2, summary: "No standout", detail: "", level: "fair" }; }
  },
  integrations: { get: () => ({ status: "live" }) },
  dashboardReliability: { classifyPackageTrust: () => "live" },
  usNational: { seasonLabel: () => "summer" }
};

[
  "design-system/js/dashboard/v2/wds-dashboard-v2-model.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-prefs.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-briefing.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-activity.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-timeline.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-observe.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2-trust.js",
  "design-system/js/dashboard/v2/wds-dashboard-v2.js",
  "design-system/js/dashboard/os/wds-dashboard-os-copy.js",
  "design-system/js/dashboard/os/wds-dashboard-os-interpret.js",
  "design-system/js/dashboard/os/wds-dashboard-os-compose.js",
  "design-system/js/dashboard/os/wds-dashboard-os-render.js"
].forEach((f) => load(f, sandbox));

const Copy = sandbox.WDS.dashboardOSCopy;
const Interpret = sandbox.WDS.dashboardOSInterpret;
const Render = sandbox.WDS.dashboardOSRender;

assert("copy helper loaded", !!(Copy && Copy.bannedHit && Copy.LABELS));
assert("Best window label", Copy.LABELS.bestWindow === "Best window");

const bannedSamples = [
  "Do this",
  "Your task",
  "Today's assignment",
  "Complete the checklist",
  "Finish outdoor time before rain",
  "You should go outside",
  "You need to rest",
  "Go outside now",
  "Tonight: short outdoor check, then rest",
  "Take a walk early afternoon",
  "Step outside briefly",
  "Homework for tonight",
  "Recommended action: walk"
];
bannedSamples.forEach((s) => {
  assert("bans: " + s.slice(0, 40), !!Copy.bannedHit(s), s);
});

assert("allows observational", Copy.isObservational("Tomorrow morning looks more promising"));
assert("allows conditions favor", Copy.isObservational("Conditions favor a walk early afternoon"));

const NIGHT = "2026-07-22T22:30:00.000-04:00";
function modelFrom(platform) {
  return sandbox.WDS.dashboardV2Model.normalizeFromContext({
    location: { city: "Milford", county: "Pike", stateCode: "PA", lat: 41.32, lng: -74.8, source: "browser" },
    platform
  });
}
function baseWx(cur) {
  return {
    meta: { hydratedAt: NIGHT, fromCache: false, connectivity: "online", blockStatus: { weather: "live" } },
    weatherRef: {
      meta: { isPlaceholder: false },
      current: Object.assign({
        temperature: 62, feelsLike: 60, humidity: 70, cloudCover: 80, uvIndex: 0,
        wind: { speed: 4 }, conditions: { summary: "Overcast" }, precipitation: { probability: 10 }
      }, cur || {}),
      hourly: [],
      daily: [{}]
    },
    daylight: { sunriseFormatted: "5:52 AM", sunsetFormatted: "8:20 PM" },
    moon: { phaseLabel: "Gibbous", illumination: 70 }
  };
}

const nightOut = Interpret.synthesize({
  model: modelFrom(baseWx()),
  briefing: {},
  activities: [{ id: "walk", label: "Walk", suitability: "fair" }],
  windows: [],
  flags: { isNight: true }
});
assert("night primary observational", /Tomorrow morning looks more promising/i.test(nightOut.do.primary), nightOut.do.primary);
assert("night no then rest", !/then rest/i.test(nightOut.do.primary + " " + (nightOut.do.alternate || "")));
assert("night plan passes assertPlanCopy", Copy.assertPlanCopy(nightOut.do).ok, JSON.stringify(Copy.assertPlanCopy(nightOut.do).hits));

const calm = Interpret.synthesize({
  model: modelFrom(baseWx({
    temperature: 72, feelsLike: 72, humidity: 45, cloudCover: 20, uvIndex: 5,
    wind: { speed: 6 }, conditions: { summary: "Partly cloudy" }
  })),
  briefing: {},
  activities: [
    { id: "walk", label: "Walk", suitability: "good", bestWindow: "early afternoon" },
    { id: "hike", label: "Hike", suitability: "fair" }
  ],
  windows: [{ display: "early afternoon" }],
  flags: {}
});
assert("calm plan observational", Copy.assertPlanCopy(calm.do).ok, JSON.stringify(Copy.assertPlanCopy(calm.do).hits));
assert("no Take a walk", !/take a walk/i.test(calm.do.primary));

const html = Render.renderScreen({
  mode: "briefing",
  place: { label: "Pike County, PA" },
  happening: { headline: "Clear afternoon", support: "Mild air" },
  matters: [{ text: "Timing still shapes the day", panel: "day-arc" }],
  do: { primary: "Tomorrow morning looks more promising", alternate: "Also worth noticing: Tonight remains quiet and overcast" },
  dayArc: [],
  lookCloser: [],
  sources: [],
  trust: { label: "Live" }
});
assert("render Best window", /Best window/.test(html));
assert("render no Do this", !/Do this/.test(html));

const renderSrc = fs.readFileSync(path.join(ROOT, "design-system/js/dashboard/os/wds-dashboard-os-render.js"), "utf8");
const interpretSrc = fs.readFileSync(path.join(ROOT, "design-system/js/dashboard/os/wds-dashboard-os-interpret.js"), "utf8");
const composeSrc = fs.readFileSync(path.join(ROOT, "design-system/js/dashboard/os/wds-dashboard-os-compose.js"), "utf8");
assert("render source has Best window", /Best window/.test(renderSrc));
assert("render source drops Do this label", !/Do this/.test(renderSrc));
assert("interpret drops then rest homework", !/then rest/.test(interpretSrc));
assert("compose drops Step outside", !/Step outside/.test(composeSrc));

console.log("\n" + passed + " passed, " + failures.length + " failed");
if (failures.length) {
  failures.forEach((f) => console.error(" -", f));
  process.exit(1);
}
