#!/usr/bin/env node
/**
 * Dashboard RC3 Sprint 5 — Personal Workspace & Outdoor Intelligence contracts.
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
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-prefs.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-intelligence.js",
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
  "wds.js loads prefs before intelligence",
  /rebuild-prefs\.js[\s\S]*rebuild-intelligence\.js/.test(wdsJs)
);
assert(
  "wds.js loads intelligence before today",
  /rebuild-intelligence\.js[\s\S]*rebuild-today\.js/.test(wdsJs)
);

const css = fs.readFileSync(path.join(ROOT, "design-system/css/wds-dashboard-rebuild.css"), "utf8");
assert("css has intelligence score styles", /\.wdb-r-today__score/.test(css));
assert("css has explain details", /\.wdb-r-today__explain/.test(css));
assert("css has daily brief styles", /\.wdb-r-today__brief/.test(css));
assert("css has brief list styles", /\.wdb-r-today__brief-list/.test(css));
assert("css has discovery styles", /\.wdb-r-today__discover/.test(css));
assert("css has discovery cards", /\.wdb-r-today__discover-cards/.test(css));
assert("css has interests styles", /\.wdb-r-interests/.test(css));
assert("css has interests list", /\.wdb-r-interests__list/.test(css));
assert("css discovery beside brief on wide", /wdb-r-today__discover[\s\S]*grid-column:\s*2/.test(css));
assert("css respects reduced motion", /prefers-reduced-motion/.test(css));
assert("css stacks activities on tablet", /wdb-r-today__activity-list[\s\S]*grid-template-columns:\s*1fr/.test(css));
assert("css stacks discovery cards on tablet", /wdb-r-today__discover-cards[\s\S]*grid-template-columns:\s*1fr/.test(css));
assert("css has exceptional pill", /data-level="exceptional"/.test(css));
assert("css has mixed pill", /data-level="mixed"/.test(css));
assert("css has challenging pill", /data-level="challenging"/.test(css));
assert("css level pills use light ink", /color:\s*#b8ebc8/.test(css));
assert("css explain summary focus ring", /wdb-r-today__explain > summary:focus-visible/.test(css));
assert("css touch targets 2.75rem baseline", /\.wdb-r-btn[\s\S]*min-height:\s*2\.75rem/.test(css));
assert("css has activity icon", /\.wdb-r-today__activity-icon/.test(css));
assert("css has activity window", /\.wdb-r-today__activity-window/.test(css));
assert("css drops dead brief-conf", !/\.wdb-r-today__brief-conf/.test(css));
assert("css drops dead kiosk-chrome", !/\.wdb-r-kiosk-chrome/.test(css));
assert("css drops dead btn--link", !/\.wdb-r-btn--link/.test(css));

const indexHtml = fs.readFileSync(path.join(ROOT, "apps/dashboard/index.html"), "utf8");
assert("index cache-bust rc3", /dash-rc3/.test(indexHtml));
assert(
  "index cache-bust unified",
  /dash-rc3-s6/.test(indexHtml) && (indexHtml.match(/\?v=dash-rc3-s6/g) || []).length >= 4
);

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
assert("sprint5 version", /rc3/.test(Intel.version));
assert("today sprint5 version", /rc3/.test(Today.version));
assert("shell rc3 version", /rc3/.test(Shell.version));
assert("discovery composer exported", typeof Intel.composeDiscovery === "function");
assert("interest normalize exported", typeof Intel.normalizeInterestProfile === "function");
assert("prioritize activities exported", typeof Intel.prioritizeActivities === "function");
assert("prioritize discovery exported", typeof Intel.prioritizeDiscoveryCards === "function");
assert("ten interest profiles", Intel.INTEREST_IDS.length === 10);
assert(
  "default interests balanced general",
  JSON.stringify(Intel.DEFAULT_INTERESTS) === JSON.stringify(["general"])
);
assert("educational moment exported", typeof Intel.composeEducationalMoment === "function");
assert("this week outside exported", typeof Intel.composeThisWeekOutside === "function");
assert("score weights documented", Intel.SCORE_WEIGHTS.temperature === 18 && Intel.SCORE_WEIGHTS.aqi === 14);
assert(
  "score weights sum 100",
  Object.values(Intel.SCORE_WEIGHTS).reduce((a, b) => a + b, 0) === 100
);
assert("ten activities catalogued", Intel.ACTIVITY_IDS.length === 10);
assert(
  "level bands sprint2",
  Intel.levelFromScore(97) === "Exceptional" &&
    Intel.levelFromScore(90) === "Excellent" &&
    Intel.levelFromScore(75) === "Good" &&
    Intel.levelFromScore(60) === "Mixed" &&
    Intel.levelFromScore(40) === "Challenging"
);
assert("legacy fair maps via Mixed band", Intel.LEVELS.indexOf("Mixed") >= 0);

const missingBrief = Intel.generate(null);
assert("missing platform not ready", missingBrief.ready === false);
assert("missing score null", missingBrief.score.value == null);
assert("missing lines honest", /settling|appear here/i.test(missingBrief.lines.join(" ")));
assert(
  "missing activities limited confidence",
  missingBrief.activities.every((a) => a.confidence === "Limited")
);
assert("missing daily brief present", !!(missingBrief.dailyBrief && missingBrief.dailyBrief.outlook));
assert("missing daily brief not ready", missingBrief.dailyBrief.ready === false);
assert("missing discovery present", !!(missingBrief.discovery));
assert("missing discovery not inventing cards", missingBrief.discovery.cards.length === 0);
assert(
  "missing educational not ready without signals",
  !missingBrief.discovery.educationalMoment || missingBrief.discovery.educationalMoment.ready === false
);

function makeHourly(count, baseIso) {
  const rows = [];
  const base = new Date(baseIso).getTime();
  for (let i = 0; i < count; i++) {
    const t = new Date(base + i * 3600000);
    const hour = t.getHours();
    rows.push({
      time: t.toISOString().replace("Z", "-04:00"),
      temperature: hour < 10 ? 62 : hour > 17 ? 68 : 78,
      feelsLike: hour < 10 ? 62 : hour > 17 ? 68 : 78,
      cloudCover: hour >= 17 ? 55 : 40,
      precipitation: { probability: hour >= 14 && hour <= 16 ? 40 : 10 },
      wind: { speed: hour < 9 ? 4 : 8 }
    });
  }
  return rows;
}

const fairPlatform = {
  meta: { fromCache: false },
  weatherRef: {
    meta: { isPlaceholder: false, provider: "open-meteo", observedAt: "2026-07-23T08:30:00-04:00" },
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
    hourly: makeHourly(3, "2026-07-23T10:00:00-04:00"),
    daily: [
      { uvIndex: 5, temperatureMax: 78, temperatureMin: 58, precipitation: { probability: 15 } },
      { uvIndex: 6, temperatureMax: 82, temperatureMin: 60, precipitation: { probability: 45 } },
      { uvIndex: 4, temperatureMax: 74, temperatureMin: 55, precipitation: { probability: 20 } }
    ]
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
assert(
  "pleasant day lands Excellent not Exceptional",
  fair.score.value >= 85 && fair.score.value <= 94,
  String(fair.score.value) + " " + fair.score.label
);
assert("outdoor score display", /\/100/.test(fair.score.display));
assert("outdoor score label Excellent", fair.score.label === "Excellent", fair.score.label);
assert("outdoor score has factors", fair.score.factors.length >= 5);
assert("factor labels human", fair.score.factors.every((f) => f.label && f.label.length > 2));
assert("alerts factor known zero", fair.score.factors.some((f) => f.id === "alerts" && f.score >= 90));
assert("aqi factor present", fair.score.factors.some((f) => f.id === "aqi"));
assert("score confidence high or moderate", /High|Moderate/.test(fair.score.confidence));
assert(
  "score confidence reasons present",
  Array.isArray(fair.score.confidenceReasons) && fair.score.confidenceReasons.length >= 1
);
assert("today lines max 8", fair.lines.length >= 1 && fair.lines.length <= 8);
assert("today lines include score or temp", fair.lines.some((l) => /°F|Outdoor Score/i.test(l)));
assert(
  "today lines calm voice",
  !fair.lines.some((l) => /perfect|amazing|homework|you should|go now/i.test(l))
);
assert(
  "today lines avoid robotic score paren",
  !fair.lines.some((l) => /Outdoor Score \d+\/100 \(/i.test(l))
);

assert("activities length 10", fair.activities.length === 10);
assert(
  "activities use sprint2 levels",
  fair.activities.every((a) => /Exceptional|Excellent|Good|Mixed|Challenging/.test(a.level))
);
assert(
  "activities have confidence",
  fair.activities.every((a) => /High|Moderate|Limited/.test(a.confidence))
);
assert(
  "activities have field-guide explanation",
  fair.activities.every((a) => a.explanation && a.explanation.length > 12)
);
assert(
  "activities avoid label-only tone",
  !fair.activities.some((a) => /^(Hiking|Photography):\s*(Good|Excellent)$/i.test(a.explanation))
);
assert(
  "activities avoid An excellent day for",
  !fair.activities.some((a) => /^An excellent day for/i.test(a.explanation))
);
assert(
  "activities have icons",
  fair.activities.every((a) => a.icon && String(a.icon).length >= 1)
);
assert(
  "activities have best window",
  fair.activities.every((a) => a.bestWindow && String(a.bestWindow).length >= 3)
);
const hiking = fair.activities.find((a) => a.id === "hiking");
assert(
  "hiking explanation natural",
  hiking && /hiking|trail/i.test(hiking.explanation) && !/^Hiking:\s/i.test(hiking.explanation)
);
const fishing = fair.activities.find((a) => a.id === "fishing");
assert("fishing limited without rivers", fishing && fishing.available === false);

const withRiver = JSON.parse(JSON.stringify(fairPlatform));
withRiver.rivers = { sites: [{ name: "Delaware River", trend: "stable" }] };
const riverBrief = Intel.generate(withRiver, { now: fairNow });
const fishingLive = riverBrief.activities.find((a) => a.id === "fishing");
assert("fishing available with gauge", fishingLive && fishingLive.available === true);
assert(
  "water discovery card with gauge",
  riverBrief.discovery.cards.some((c) => c.id === "water" && /Delaware|gauge/i.test(c.text))
);
assert(
  "no water card without gauge",
  !fair.discovery.cards.some((c) => c.id === "water")
);

assert("four time windows", fair.windows.length === 4);
assert(
  "thin hourly uses band fallback",
  fair.windows.every((w) => w.precision === "band"),
  fair.windows.map((w) => w.window + "/" + w.precision).join(", ")
);
assert(
  "band windows titled calmly",
  fair.windows.every((w) =>
    /Early Morning|Late Morning|Before Noon|Early Afternoon|Afternoon|Late Afternoon|Near Sunset|This Evening/i.test(
      w.window
    )
  )
);
assert(
  "windows mark confidence",
  fair.windows.every((w) => /High|Moderate|Limited/.test(w.confidence))
);

/* Rich hourly → clock ranges (no false precision when thin). */
const richPlatform = JSON.parse(JSON.stringify(fairPlatform));
richPlatform.weatherRef.hourly = makeHourly(18, "2026-07-23T09:00:00-04:00");
const rich = Intel.generate(richPlatform, { now: fairNow });
assert(
  "rich hourly can emit clock ranges",
  rich.windows.some((w) => w.precision === "range" && /\d/.test(w.window)),
  rich.windows.map((w) => w.window + "/" + w.precision).join(", ")
);
assert(
  "range windows still carry confidence",
  rich.windows.filter((w) => w.precision === "range").every((w) => /High|Moderate/.test(w.confidence))
);
assert(
  "range format practical",
  rich.windows
    .filter((w) => w.precision === "range")
    .every((w) => /\d{1,2}(?::\d{2})?\s*(?:AM|PM)?\s*[–—-]\s*\d{1,2}(?::\d{2})?\s*(AM|PM)/i.test(w.window))
);

/* ——— Daily Brief ——— */
assert("daily brief attached", !!(fair.dailyBrief && fair.dailyBrief.ready));
assert("daily brief outlook", fair.dailyBrief.outlook && fair.dailyBrief.outlook.length > 24);
assert(
  "daily brief outlook calm",
  !/\bperfect\b|\bamazing\b|\bepic\b|must[- ]see|homework|go now|\bAI\b|\bLLM\b/i.test(fair.dailyBrief.outlook)
);
assert(
  "daily brief opportunities 3-5",
  fair.dailyBrief.opportunities.length >= 3 && fair.dailyBrief.opportunities.length <= 5,
  String(fair.dailyBrief.opportunities.length)
);
assert(
  "daily brief opportunities grounded",
  fair.dailyBrief.opportunities.every((o) => o && o.length > 12)
);
assert(
  "daily brief watch present",
  Array.isArray(fair.dailyBrief.watch) && fair.dailyBrief.watch.length >= 1
);
assert(
  "daily brief watch calm",
  !fair.dailyBrief.watch.some((w) => /danger|deadly|catastrophe|panic|you must/i.test(w))
);
assert("daily brief interesting", fair.dailyBrief.interesting && fair.dailyBrief.interesting.length > 20);
assert("daily brief includes take", !!(fair.dailyBrief.take && fair.dailyBrief.take.text));
assert("daily brief confidence", /High|Moderate|Limited/.test(fair.dailyBrief.confidence));
assert(
  "daily brief opportunities no hype",
  !fair.dailyBrief.opportunities.some((o) => /perfect|amazing|don't miss|go now/i.test(o))
);

assert("waypoint take present", fair.take && fair.take.text.length > 20);
assert("take calm voice", !/perfect|amazing|epic|don't miss|\bAI\b|\bLLM\b|hallucin/i.test(fair.take.text));
assert("take not too long", fair.take.text.length <= 360);
assert(
  "take does not dump activity explanation verbatim",
  !fair.activities.some((a) => a.explanation && fair.take.text.indexOf(a.explanation) >= 0)
);
assert("explanation panel data", fair.explanation && fair.explanation.contributing.length >= 1);
assert("explanation lists weights", fair.explanation.weights.precipitation === 16);
assert("explanation inputs honest", fair.explanation.inputs.weatherLive === true);
assert(
  "explanation educational cues",
  Array.isArray(fair.explanation.educational) && fair.explanation.educational.length >= 1
);
assert(
  "explanation confidence reasons",
  Array.isArray(fair.explanation.confidenceReasons) && fair.explanation.confidenceReasons.length >= 1
);

/* ——— Discovery ——— */
assert("discovery attached", !!(fair.discovery));
assert("discovery ready with weather", fair.discovery.ready === true);
assert(
  "discovery has cards when supported",
  Array.isArray(fair.discovery.cards) && fair.discovery.cards.length >= 2,
  String(fair.discovery.cards.length)
);
assert(
  "discovery cards known ids",
  fair.discovery.cards.every((c) =>
    /^(sky|nature|seasonal|photography|astronomy|water)$/.test(c.id)
  )
);
assert(
  "discovery includes sky or seasonal",
  fair.discovery.cards.some((c) => c.id === "sky" || c.id === "seasonal")
);
assert(
  "discovery photography when golden hour",
  fair.discovery.cards.some((c) => c.id === "photography" && /golden|photo|light|cloud/i.test(c.text))
);
assert(
  "discovery astronomy when moon/clouds",
  fair.discovery.cards.some((c) => c.id === "astronomy")
);
assert(
  "discovery card voice calm",
  !fair.discovery.cards.some((c) =>
    /\bperfect\b|\bamazing\b|\bepic\b|must[- ]see|homework|go now|\bAI\b|\bLLM\b/i.test(c.text)
  )
);
assert(
  "discovery does not paste brief interesting",
  !fair.discovery.cards.some(
    (c) => fair.dailyBrief.interesting && c.text === fair.dailyBrief.interesting
  )
);

const edu = fair.discovery.educationalMoment;
assert("educational moment ready", !!(edu && edu.ready && edu.text));
assert("educational moment one topic", typeof edu.topic === "string" && edu.topic.length >= 2);
assert("educational moment under 75 words", edu.wordCount > 0 && edu.wordCount <= 75, String(edu.wordCount));
assert(
  "educational moment calm",
  !/\bperfect\b|\bamazing\b|homework|quiz|grade|go now|\bAI\b|\bLLM\b/i.test(edu.text)
);
assert("educational moment dayKey", edu.dayKey === "2026-07-23");

const nextDay = Intel.generate(fairPlatform, {
  now: new Date("2026-07-24T09:00:00-04:00")
});
const edu2 = nextDay.discovery.educationalMoment;
assert("educational rotates day key", edu2.dayKey === "2026-07-24");
assert(
  "educational not identical wording across days",
  edu.text !== edu2.text,
  edu.topic + " / " + edu2.topic
);

const week = fair.discovery.thisWeekOutside;
assert("this week outside ready", !!(week && week.ready && week.summary));
assert(
  "this week outside calm",
  !/\bperfect\b|\bamazing\b|must[- ]see|doom|catastrophe|go now/i.test(
    week.summary + " " + (week.changes || []).join(" ")
  )
);
assert(
  "this week only meaningful changes array",
  Array.isArray(week.changes) && week.changes.length <= 3
);
assert(
  "this week notes multi-day when present",
  week.changes.length === 0 || week.changes.every((c) => c && c.length > 12)
);

const sparsePlatform = {
  meta: {},
  weatherRef: {
    meta: { isPlaceholder: false },
    current: { temperature: 70, conditions: { summary: "Clear" } },
    hourly: [],
    daily: []
  },
  daylight: {}
};
const sparse = Intel.generate(sparsePlatform, { now: fairNow });
assert("sparse discovery may omit unsupported cards", Array.isArray(sparse.discovery.cards));
assert(
  "sparse omits astronomy without moon/clouds",
  !sparse.discovery.cards.some((c) => c.id === "astronomy")
);
assert(
  "sparse omits water without gauge",
  !sparse.discovery.cards.some((c) => c.id === "water")
);

/* Ideal day → Exceptional possible but not automatic. */
const idealPlatform = {
  meta: { fromCache: false },
  weatherRef: {
    meta: { isPlaceholder: false, observedAt: "2026-07-23T08:00:00-04:00" },
    current: {
      temperature: 63,
      feelsLike: 62,
      humidity: 48,
      cloudCover: 45,
      wind: { speed: 4 },
      precipitation: { probability: 5 },
      conditions: { summary: "Partly cloudy" },
      uvIndex: 2
    },
    hourly: makeHourly(18, "2026-07-23T09:00:00-04:00"),
    daily: [{ uvIndex: 2 }]
  },
  daylight: {
    sunriseFormatted: "5:50 AM",
    sunsetFormatted: "8:25 PM",
    goldenHourEvening: "7:25–8:25 PM",
    moonIllumination: 20
  },
  airQuality: { status: "live", usAqi: 28, category: "Good" },
  alerts: { items: [] },
  rivers: { sites: [{ name: "Local Creek", trend: "stable" }] }
};
const ideal = Intel.generate(idealPlatform, { now: fairNow });
assert(
  "ideal day can reach Exceptional or top Excellent",
  ideal.score.value >= 90,
  String(ideal.score.value) + " " + ideal.score.label
);
assert(
  "exceptional reserved for 95+",
  ideal.score.label !== "Exceptional" || ideal.score.value >= 95,
  ideal.score.label + " " + ideal.score.value
);
assert("ideal daily brief opportunities", ideal.dailyBrief.opportunities.length >= 3);
assert("ideal discovery cards present", ideal.discovery.cards.length >= 3);

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
assert("storm score challenging or mixed", storm.score.value < 70, String(storm.score.value));
assert(
  "storm activities not exceptional dominant",
  storm.activities.filter((a) => a.level === "Exceptional").length === 0
);
assert("storm take mentions alerts", /alert/i.test(storm.take.text));
assert("storm lines mention alert", storm.lines.some((l) => /alert/i.test(l)));
assert("alerts cap exceptional", storm.score.value <= 84);
assert(
  "storm watch prioritizes alerts",
  storm.dailyBrief.watch.some((w) => /alert/i.test(w))
);
assert(
  "storm outlook secondary to alerts",
  /alert/i.test(storm.dailyBrief.outlook)
);
assert("storm still offers discovery sky", storm.discovery.cards.some((c) => c.id === "sky"));

const cachedPlatform = JSON.parse(JSON.stringify(fairPlatform));
cachedPlatform.meta.fromCache = true;
delete cachedPlatform.airQuality;
delete cachedPlatform.alerts;
const cached = Intel.generate(cachedPlatform, { now: fairNow });
assert("cached lowers or moderates confidence", /Moderate|Limited/.test(cached.score.confidence));
assert("missing aqi listed", cached.score.missing.indexOf("aqi") >= 0);
assert("missing alerts redistributed", cached.score.missing.indexOf("alerts") >= 0);
assert(
  "cached confidence explains cache",
  cached.score.confidenceReasons.some((r) => /cache/i.test(r))
);

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
assert("today daily brief rendered", /Daily Brief/.test(todayLive) && /data-wdb-r-brief/.test(todayLive));
assert("today outlook rendered", /Today's Outlook/.test(todayLive));
assert("today opportunities rendered", /Opportunity Highlights/.test(todayLive));
assert("today watch rendered", /Things to Watch/.test(todayLive));
assert("today interesting rendered", /Why Today Is Interesting/.test(todayLive));
assert("today take rendered", /Waypoint's Take/.test(todayLive));
assert("today take nested in brief", /data-wdb-r-brief[\s\S]*data-wdb-r-take/.test(todayLive));
assert("today take not duplicated outside brief", (todayLive.match(/Waypoint's Take/g) || []).length === 1);
assert("today discovery rendered", /Discovery/.test(todayLive) && /data-wdb-r-discover/.test(todayLive));
assert("today educational moment rendered", /Educational Moment/.test(todayLive) && /data-wdb-r-edu/.test(todayLive));
assert("today this week rendered", /This Week Outside/.test(todayLive) && /data-wdb-r-week/.test(todayLive));
assert(
  "today discovery after brief",
  /data-wdb-r-brief[\s\S]*data-wdb-r-discover/.test(todayLive)
);
assert("today discovery cards list a11y", /role="list"/.test(todayLive) && /role="listitem"/.test(todayLive));
assert("today activities rendered", /Activity guide/.test(todayLive) && /Photography/.test(todayLive));
assert("today activity icons rendered", /wdb-r-today__activity-icon/.test(todayLive));
assert("today activity windows rendered", /wdb-r-today__activity-window/.test(todayLive));
assert("today windows rendered", /Best time windows/.test(todayLive) && /Stargazing/.test(todayLive));
assert("today explain details", /<details class="wdb-r-today__explain"/.test(todayLive));
assert("today explain keyboard summary", /<summary>Explain why/.test(todayLive));
assert("today explain educational heading", /What the instruments suggest/.test(todayLive));
assert("today explain confidence why", /Why confidence is/.test(todayLive));
assert("today headings hierarchy", /id="wdb-r-today-title"/.test(todayLive) && /wdb-r-today-brief-title/.test(todayLive));
assert("today brief heading hierarchy", /wdb-r-today-outlook-title/.test(todayLive) && /wdb-r-today-take-title/.test(todayLive));
assert("today discovery heading hierarchy", /wdb-r-today-discover-title/.test(todayLive) && /wdb-r-today-edu-title/.test(todayLive));
assert("today confidence chips", /data-confidence=/.test(todayLive));
assert("today place retained", /Pike County, PA/.test(todayLive));
assert("sr-only score context", /wds-sr-only/.test(todayLive));
assert("today uses Mixed or Excellent pills", /data-level="(exceptional|excellent|good|mixed|challenging)"/.test(todayLive));

/* Brief reuse: pack intelligence passed through avoids needing platform regenerate path. */
const pack = Data.fromPlatform(fairPlatform, { placeLabel: "Here" });
assert("data pack includes intelligence", !!(pack.today && pack.today.intelligence));
assert("data pack includes daily brief", !!(pack.today.intelligence.dailyBrief && pack.today.intelligence.dailyBrief.outlook));
assert("data pack includes discovery", !!(pack.today.intelligence.discovery && pack.today.intelligence.discovery.cards));
assert("data pack lines from intelligence", pack.today.lines.some((l) => /Outdoor Score|°F/i.test(l)));

const reused = Today.render({
  placeLabel: "Here",
  trust: pack.today.trust,
  lines: pack.today.lines,
  intelligence: pack.today.intelligence,
  now: fairNow
});
assert("today reuses hydrated brief without platform", /Outdoor Score/.test(reused) && /data-wdb-r-intel/.test(reused));
assert("today reused daily brief", /data-wdb-r-brief/.test(reused) && /Today's Outlook/.test(reused));
assert("today reused discovery", /data-wdb-r-discover/.test(reused) && /Educational Moment/.test(reused));

const shell = Shell.renderShell({
  view: "workspace",
  placeContext: { placeLabel: "Here" },
  platform: fairPlatform,
  now: fairNow
});
assert("shell today intelligence present", /data-wdb-r-intel/.test(shell));
assert("shell daily brief present", /data-wdb-r-brief/.test(shell));
assert("shell discovery present", /data-wdb-r-discover/.test(shell));
assert("shell activity icons", /wdb-r-today__activity-icon/.test(shell));
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
assert("daily brief deterministic", a.dailyBrief.outlook === b.dailyBrief.outlook);
assert("daily brief interesting deterministic", a.dailyBrief.interesting === b.dailyBrief.interesting);
assert("windows deterministic", a.windows[0].window === b.windows[0].window);
assert("discovery cards deterministic", JSON.stringify(a.discovery.cards) === JSON.stringify(b.discovery.cards));
assert(
  "educational moment deterministic",
  a.discovery.educationalMoment.text === b.discovery.educationalMoment.text
);
assert(
  "this week deterministic",
  a.discovery.thisWeekOutside.summary === b.discovery.thisWeekOutside.summary
);

/* Performance: generate once; discovery is included without a second generate. */
const t0 = Date.now();
for (let i = 0; i < 40; i++) Intel.generate(fairPlatform, { now: fairNow });
const elapsed = Date.now() - t0;
assert("generate batch under 500ms for 40 runs", elapsed < 500, String(elapsed) + "ms");
assert(
  "single generate carries brief and discovery",
  !!(a.dailyBrief && a.discovery && a.score && a.activities)
);

/* Edge: heat day prefers early morning band when hourly thin */
const heatPlatform = JSON.parse(JSON.stringify(fairPlatform));
heatPlatform.weatherRef.current.feelsLike = 88;
heatPlatform.weatherRef.current.temperature = 90;
heatPlatform.weatherRef.current.uvIndex = 9;
heatPlatform.weatherRef.hourly = [];
const heat = Intel.generate(heatPlatform, { now: fairNow });
const heatHike = heat.windows.find((w) => w.id === "hiking");
assert("heat hiking leans early morning", heatHike && /Early Morning/i.test(heatHike.window));
assert(
  "heat watch mentions heat or uv",
  heat.dailyBrief.watch.some((w) => /heat|UV|uv|shade/i.test(w))
);

/* ——— RC3 Sprint 5: Personal Workspace ——— */
const Prefs = sandbox.WDS.dashboardRebuildPrefs;
const Customize = sandbox.WDS.dashboardRebuildCustomize;
assert("prefs interest catalog", Prefs.interestCatalog().length === 10);
assert("prefs default interests general", Prefs.defaultInterests()[0] === "general");
assert(
  "prefs normalize empty → default",
  JSON.stringify(Prefs.normalizeInterests([])) === JSON.stringify(["general"])
);
assert(
  "prefs normalize drops unknown",
  Prefs.normalizeInterests(["photography", "nope", "astronomy"]).join(",") ===
    "photography,astronomy"
);
assert("prefs load includes interests", Array.isArray(Prefs.load().interests));

Prefs.beginDraft();
Prefs.setInterests(["photography", "astronomy", "hiking"]);
assert(
  "prefs set interests ordered",
  Prefs.load().interests.join(",") === "photography,astronomy,hiking"
);
Prefs.moveInterest("astronomy", -1);
assert(
  "prefs move interest up",
  Prefs.load().interests.join(",") === "astronomy,photography,hiking"
);
Prefs.setInterestEnabled("wildlife", true);
assert("prefs enable interest", Prefs.load().interests.indexOf("wildlife") >= 0);
Prefs.setInterestEnabled("hiking", false);
assert("prefs disable interest", Prefs.load().interests.indexOf("hiking") < 0);
Prefs.resetInterests();
assert(
  "prefs restore interest defaults",
  Prefs.load().interests.join(",") === "general"
);
Prefs.discardDraft();

const photoPack = Intel.generate(fairPlatform, {
  now: fairNow,
  interests: ["photography", "hiking"]
});
const wildlifePack = Intel.generate(fairPlatform, {
  now: fairNow,
  interests: ["wildlife", "birding"]
});
const astroPack = Intel.generate(fairPlatform, {
  now: fairNow,
  interests: ["astronomy"]
});
const generalPack = Intel.generate(fairPlatform, {
  now: fairNow,
  interests: ["general"]
});

assert("photo pack personalization flag", photoPack.personalization.balanced === false);
assert("general pack balanced", generalPack.personalization.balanced === true);
assert(
  "photo activities prioritize photography",
  photoPack.activities[0].id === "photography" ||
    photoPack.activities.findIndex((a) => a.id === "photography") <= 2
);
assert(
  "wildlife activities prioritize wildlife/birding",
  wildlifePack.activities.findIndex((a) => a.id === "wildlife" || a.id === "birding") <=
    photoPack.activities.findIndex((a) => a.id === "wildlife" || a.id === "birding")
);
assert(
  "astronomy discovery cards lead with astronomy/sky",
  astroPack.discovery.cards.length === 0 ||
    ["astronomy", "sky"].indexOf(astroPack.discovery.cards[0].id) >= 0
);
assert(
  "photo discovery emphasizes photography or sky",
  photoPack.discovery.cards.length === 0 ||
    ["photography", "sky"].indexOf(photoPack.discovery.cards[0].id) >= 0 ||
    photoPack.discovery.cards.some((c, i) => c.id === "photography" && i <= 2)
);
assert(
  "interest reorder never drops discovery cards",
  photoPack.discovery.cards.length === generalPack.discovery.cards.length
);
assert(
  "interest reorder never drops activities",
  photoPack.activities.length === generalPack.activities.length
);
assert(
  "photo take adapts calmly",
  /photograph|light|cloud/i.test(photoPack.take.text)
);
assert(
  "astro take mentions darkness/moon/evening or astronomy",
  /astronomy|dark|moon|evening|star|cloud/i.test(astroPack.take.text)
);
assert(
  "outlook encourages exploration beyond interest",
  /lens|explore|beyond|noticing/i.test(photoPack.dailyBrief.outlook)
);
assert(
  "alerts still dominate storm take with interests",
  (() => {
    const stormI = Intel.generate(stormPlatform, {
      now: fairNow,
      interests: ["photography"]
    });
    return /alert/i.test(stormI.take.text) && /alert/i.test(stormI.dailyBrief.watch[0] || "");
  })()
);
assert(
  "alerts always first in watch with interests",
  (() => {
    const stormI = Intel.generate(stormPlatform, {
      now: fairNow,
      interests: ["wildlife", "astronomy"]
    });
    return /alert/i.test(stormI.dailyBrief.watch[0] || "");
  })()
);

const customizeHtml = Customize.render({ prefs: Prefs.load() });
assert("customize renders interests", /data-wdb-r-interests/.test(customizeHtml));
assert("customize interest toggle controls", /data-wdb-r-action="interest-toggle"/.test(customizeHtml));
assert("customize interest priority up", /data-wdb-r-action="interest-up"/.test(customizeHtml));
assert("customize interest priority down", /data-wdb-r-action="interest-down"/.test(customizeHtml));
assert("customize interest restore", /data-wdb-r-action="interests-reset"/.test(customizeHtml));
assert("customize reset interests copy", /Reset interests/.test(customizeHtml));
assert("customize reset layout copy", /Reset layout/.test(customizeHtml));
assert("customize library filter group", /role="group"[^>]*Widget library categories/.test(customizeHtml));
assert("customize heading is h2", /<h2 class="wdb-r-customize-bar__label"/.test(customizeHtml));
assert("customize interest preview", /Priority preview/.test(customizeHtml));
assert("customize still has Save/Cancel", /data-wdb-r-action="save"/.test(customizeHtml) && /data-wdb-r-action="cancel"/.test(customizeHtml));
assert(
  "ten interest labels in customize",
  Prefs.interestCatalog().every((item) => {
    const plain = item.label;
    const escaped = plain.replace(/&/g, "&amp;");
    return customizeHtml.indexOf(plain) >= 0 || customizeHtml.indexOf(escaped) >= 0;
  })
);

Prefs.beginDraft();
Prefs.setInterests(["photography"]);
const draftInterests = Prefs.load().interests.slice();
assert("draft interests photography", draftInterests[0] === "photography");
Prefs.discardDraft();
assert(
  "discard restores stored interests",
  Prefs.load().interests.join(",") === "general" || Prefs.loadFromStorage().interests[0] === "general"
);

const packWithPrefs = Data.fromPlatform(fairPlatform, { name: "Pike" }, {
  now: fairNow,
  interests: ["astronomy"]
});
assert(
  "data pack respects interests option",
  packWithPrefs.today.intelligence.interests[0] === "astronomy"
);

assert(
  "personalization deterministic",
  JSON.stringify(
    Intel.generate(fairPlatform, { now: fairNow, interests: ["wildlife", "rivers"] }).discovery.cards
  ) ===
    JSON.stringify(
      Intel.generate(fairPlatform, { now: fairNow, interests: ["wildlife", "rivers"] }).discovery.cards
    )
);

console.log("\n" + passed + " passed, " + failures.length + " failed");
if (failures.length) {
  failures.forEach((f) => console.error(" - " + f));
  process.exit(1);
}
