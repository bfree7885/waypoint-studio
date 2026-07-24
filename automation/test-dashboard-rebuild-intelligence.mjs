#!/usr/bin/env node
/**
 * Dashboard RC3 Sprint 1 — Outdoor Intelligence Engine contracts.
 * Run: node automation/test-dashboard-rebuild-intelligence.mjs
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

const modules = [
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-intelligence.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-prefs.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-today.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-workspace.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-customize.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-kiosk.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-deepeners.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js"
];

modules.forEach(function (rel) {
  assert("module exists " + path.basename(rel), fs.existsSync(path.join(ROOT, rel)));
});

const wdsJs = fs.readFileSync(path.join(ROOT, "design-system/js/wds.js"), "utf8");
assert(
  "wds.js loads intelligence before today",
  /rebuild-intelligence\.js[\s\S]*rebuild-today\.js/.test(wdsJs)
);

const css = fs.readFileSync(path.join(ROOT, "design-system/css/wds-dashboard-rebuild.css"), "utf8");
assert("css has intelligence score styles", /\.wdb-r-today__score/.test(css));
assert("css has explain details", /\.wdb-r-today__explain/.test(css));
assert("css respects reduced motion", /prefers-reduced-motion/.test(css));
assert("css stacks activities on tablet", /wdb-r-today__activity-list[\s\S]*grid-template-columns:\s*1fr/.test(css));

const indexHtml = fs.readFileSync(path.join(ROOT, "apps/dashboard/index.html"), "utf8");
assert("index cache-bust rc3 s1", /dash-rc3-s1/.test(indexHtml));

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

modules.forEach(function (rel) {
  load(rel, sandbox);
});

const Intel = sandbox.WDS.dashboardRebuildIntelligence;
const Today = sandbox.WDS.dashboardRebuildToday;
const Data = sandbox.WDS.dashboardRebuildData;
const Shell = sandbox.WDS.dashboardRebuild;

assert("intelligence loaded", !!(Intel && Intel.generate));
assert("score weights documented", Intel.SCORE_WEIGHTS.temperature === 18 && Intel.SCORE_WEIGHTS.aqi === 14);
assert(
  "score weights sum 100",
  Object.values(Intel.SCORE_WEIGHTS).reduce((a, b) => a + b, 0) === 100
);
assert("ten activities catalogued", Intel.ACTIVITY_IDS.length === 10);

const missingBrief = Intel.generate(null);
assert("missing platform not ready", missingBrief.ready === false);
assert("missing score null", missingBrief.score.value == null);
assert("missing lines honest", /settling|appear here/i.test(missingBrief.lines.join(" ")));
assert(
  "missing activities limited confidence",
  missingBrief.activities.every((a) => a.confidence === "Limited")
);

const fairPlatform = {
  meta: { fromCache: false },
  weatherRef: {
    meta: { isPlaceholder: false, provider: "open-meteo" },
    current: {
      temperature: 68,
      feelsLike: 67,
      humidity: 52,
      cloudCover: 40,
      wind: { speed: 6, gust: 9 },
      precipitation: { probability: 15 },
      conditions: { summary: "Partly cloudy" },
      uvIndex: 5
    },
    hourly: [
      {
        time: "2026-07-23T10:00:00-04:00",
        temperature: 66,
        feelsLike: 66,
        cloudCover: 45,
        precipitation: { probability: 10 },
        wind: { speed: 5 }
      },
      {
        time: "2026-07-23T18:00:00-04:00",
        temperature: 70,
        feelsLike: 70,
        cloudCover: 55,
        precipitation: { probability: 20 },
        wind: { speed: 7 }
      },
      {
        time: "2026-07-23T22:00:00-04:00",
        temperature: 60,
        feelsLike: 60,
        cloudCover: 20,
        precipitation: { probability: 5 },
        wind: { speed: 4 }
      }
    ],
    daily: [{ uvIndex: 5 }]
  },
  daylight: {
    sunriseFormatted: "5:55 AM",
    sunsetFormatted: "8:20 PM",
    goldenHourEvening: "7:20–8:20 PM",
    moonPhase: "Waxing Crescent",
    moonIllumination: 28
  },
  airQuality: { status: "live", usAqi: 38, category: "Good", pm25: 7 },
  alerts: { items: [] }
};

const fairNow = new Date("2026-07-23T09:00:00-04:00");
const fair = Intel.generate(fairPlatform, { now: fairNow });

assert("fair brief ready", fair.ready === true);
assert("outdoor score numeric", typeof fair.score.value === "number" && fair.score.value >= 70 && fair.score.value <= 100, String(fair.score.value));
assert("outdoor score display", /\/100/.test(fair.score.display));
assert("outdoor score has factors", fair.score.factors.length >= 5);
assert("alerts factor known zero", fair.score.factors.some((f) => f.id === "alerts" && f.score >= 90));
assert("aqi factor present", fair.score.factors.some((f) => f.id === "aqi"));
assert("score confidence high or moderate", /High|Moderate/.test(fair.score.confidence));
assert("today lines max 8", fair.lines.length >= 1 && fair.lines.length <= 8);
assert("today lines include score or temp", fair.lines.some((l) => /°F|Outdoor Score/i.test(l)));
assert(
  "today lines calm voice",
  !fair.lines.some((l) => /perfect|amazing|homework|you should|go now/i.test(l))
);

assert("activities length 10", fair.activities.length === 10);
assert(
  "activities have levels",
  fair.activities.every((a) => /Excellent|Good|Fair|Poor/.test(a.level))
);
assert(
  "activities have confidence",
  fair.activities.every((a) => /High|Moderate|Limited/.test(a.confidence))
);
assert(
  "activities have explanation",
  fair.activities.every((a) => a.explanation && a.explanation.length > 4)
);
const fishing = fair.activities.find((a) => a.id === "fishing");
assert("fishing limited without rivers", fishing && fishing.available === false);

const withRiver = JSON.parse(JSON.stringify(fairPlatform));
withRiver.rivers = { sites: [{ name: "Delaware River", trend: "stable" }] };
const riverBrief = Intel.generate(withRiver, { now: fairNow });
const fishingLive = riverBrief.activities.find((a) => a.id === "fishing");
assert("fishing available with gauge", fishingLive && fishingLive.available === true);

assert("four time windows", fair.windows.length === 4);
assert(
  "windows use practical bands",
  fair.windows.every((w) =>
    /early morning|late morning|before noon|early afternoon|after 4|near sunset|this evening/i.test(
      w.window
    )
  )
);
assert(
  "windows mark confidence",
  fair.windows.every((w) => /High|Moderate|Limited/.test(w.confidence))
);
assert(
  "windows avoid fake minute precision",
  !fair.windows.some((w) => /\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}/.test(w.window))
);

assert("waypoint take present", fair.take && fair.take.text.length > 20);
assert("take calm voice", !/perfect|amazing|epic|don't miss|AI|LLM|hallucin/i.test(fair.take.text));
assert("explanation panel data", fair.explanation && fair.explanation.contributing.length >= 1);
assert("explanation lists weights", fair.explanation.weights.precipitation === 16);
assert("explanation inputs honest", fair.explanation.inputs.weatherLive === true);

const stormPlatform = {
  meta: {},
  weatherRef: {
    meta: { isPlaceholder: false },
    current: {
      temperature: 74,
      feelsLike: 76,
      humidity: 88,
      cloudCover: 95,
      wind: { speed: 28 },
      precipitation: { probability: 85 },
      conditions: { summary: "Thunderstorms" },
      uvIndex: 2
    },
    hourly: [],
    daily: []
  },
  daylight: { sunsetFormatted: "8:00 PM" },
  airQuality: { status: "live", usAqi: 120, category: "Moderate" },
  alerts: { items: [{ event: "Severe Thunderstorm Warning" }] }
};
const storm = Intel.generate(stormPlatform, { now: fairNow });
assert("storm score lower", storm.score.value != null && storm.score.value < fair.score.value, String(storm.score.value));
assert(
  "storm activities not excellent dominant",
  storm.activities.filter((a) => a.level === "Excellent").length <= 1
);
assert("storm take mentions alerts", /alert/i.test(storm.take.text));
assert("storm lines mention alert", storm.lines.some((l) => /alert/i.test(l)));

const cachedPlatform = JSON.parse(JSON.stringify(fairPlatform));
cachedPlatform.meta.fromCache = true;
delete cachedPlatform.airQuality;
delete cachedPlatform.alerts;
const cached = Intel.generate(cachedPlatform, { now: fairNow });
assert("cached lowers or moderates confidence", /Moderate|Limited/.test(cached.score.confidence));
assert("missing aqi listed", cached.score.missing.indexOf("aqi") >= 0);
assert("missing alerts redistributed", cached.score.missing.indexOf("alerts") >= 0);

const todayWaiting = Today.render({ placeLabel: "Test Place", trust: "waiting" });
assert("today title preserved", /Today Outside/.test(todayWaiting));
assert("today waiting honest", /Conditions will appear here/.test(todayWaiting));
assert("today no Outdoor OS chrome", !/data-wdb-os|Happening|Matters most|Do this/i.test(todayWaiting));

const todayLive = Today.render({
  placeLabel: "Pike County, PA",
  trust: "partial",
  platform: fairPlatform,
  now: fairNow
});
assert("today still one section", (todayLive.match(/class="wdb-r-today"/g) || []).length === 1);
assert("today score rendered", /Outdoor Score/.test(todayLive) && /data-wdb-r-score/.test(todayLive));
assert("today take rendered", /Waypoint's Take/.test(todayLive));
assert("today activities rendered", /Activity guide/.test(todayLive) && /Photography/.test(todayLive));
assert("today windows rendered", /Best time windows/.test(todayLive) && /Stargazing/.test(todayLive));
assert("today explain details", /<details class="wdb-r-today__explain"/.test(todayLive));
assert("today explain keyboard summary", /<summary>Explain why/.test(todayLive));
assert("today headings hierarchy", /id="wdb-r-today-title"/.test(todayLive) && /wdb-r-today-take-title/.test(todayLive));
assert("today confidence chips", /data-confidence=/.test(todayLive));
assert("today place retained", /Pike County, PA/.test(todayLive));
assert("sr-only score context", /wds-sr-only/.test(todayLive));

const pack = Data.fromPlatform(fairPlatform, { placeLabel: "Here" });
assert("data pack includes intelligence", !!(pack.today && pack.today.intelligence));
assert("data pack lines from intelligence", pack.today.lines.some((l) => /Outdoor Score|°F/i.test(l)));

const shell = Shell.renderShell({
  view: "workspace",
  placeContext: { placeLabel: "Here" },
  platform: fairPlatform,
  now: fairNow
});
assert("shell today intelligence present", /data-wdb-r-intel/.test(shell));
assert("shell workspace preserved", /data-wdb-r-workspace/.test(shell));
assert("shell no outdoor OS root", !/data-wdb-os/.test(shell));
assert("shell customize path untouched", !/data-wdb-r-catalog/.test(shell));

const shellCustom = Shell.renderShell({ view: "customize", platform: fairPlatform });
assert("customize still works", /data-wdb-r-catalog/.test(shellCustom));

/* Determinism */
const a = Intel.generate(fairPlatform, { now: fairNow });
const b = Intel.generate(fairPlatform, { now: fairNow });
assert("score deterministic", a.score.value === b.score.value);
assert("take deterministic", a.take.text === b.take.text);

console.log("\n" + passed + " passed, " + failures.length + " failed");
if (failures.length) {
  failures.forEach((f) => console.error(" - " + f));
  process.exit(1);
}
