#!/usr/bin/env node
/**
 * Dashboard Rebuild — Happening Now discovery layer (deterministic, no network).
 * Run: node automation/test-dashboard-rebuild-happening.mjs
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

const NOW = new Date("2026-07-15T18:00:00.000Z");

function isoOffset(minutes) {
  return new Date(NOW.getTime() + minutes * 60000).toISOString();
}

function hoursFrom(specs) {
  return specs.map(function (s, i) {
    return {
      time: isoOffset(s.atMin != null ? s.atMin : (i + 1) * 60),
      temperature: s.temp != null ? s.temp : 72,
      precipitation: { probability: s.prob != null ? s.prob : 5 },
      wind: { speed: s.wind != null ? s.wind : 5 },
      cloudCover: s.cloud != null ? s.cloud : 20,
      conditions: s.conditions || "Clear"
    };
  });
}

function platform(overrides) {
  const o = overrides || {};
  const cur = Object.assign(
    {
      temperature: 72,
      feelsLike: 72,
      humidity: 45,
      cloudCover: 20,
      uvIndex: 4,
      wind: { speed: 5, gust: 8 },
      conditions: { summary: "Clear" },
      precipitation: { probability: 5, amount: 0 }
    },
    o.current || {}
  );
  return {
    meta: { hydratedAt: NOW.toISOString(), fromCache: false },
    weatherRef: {
      meta: { isPlaceholder: false, timezone: "America/New_York" },
      current: cur,
      hourly: o.hourly || hoursFrom([{ prob: 5 }, { prob: 5 }, { prob: 8 }, { prob: 10 }]),
      daily: o.daily || [{ temperatureHigh: 78, temperatureLow: 58, uvIndex: 6 }]
    },
    daylight: Object.assign(
      {
        sunriseISO: isoOffset(-12 * 60),
        sunsetISO: isoOffset(4 * 60),
        sunriseFormatted: "6:00 AM",
        sunsetFormatted: "8:00 PM",
        kind: "day"
      },
      o.daylight || {}
    ),
    airQuality: Object.assign({ status: "live", usAqi: 35, category: "Good", pm25: 8 }, o.air || {}),
    alerts: Object.assign({ status: "live", items: [] }, o.alerts || {})
  };
}

const sandbox = {
  window: {},
  console,
  Date,
  setTimeout: () => {},
  CustomEvent: function () {},
  matchMedia: () => ({ matches: false }),
  location: { hash: "#/", pathname: "/apps/dashboard/" },
  history: { replaceState() {} },
  document: {
    documentElement: { classList: { add() {}, remove() {}, contains() { return false; } } },
    addEventListener() {},
    removeEventListener() {}
  }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.localStorage = {
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
};

[
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-graphics.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-intel.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-prefs.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-today.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-happening.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-workspace.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-customize.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-kiosk.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-deepeners.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js"
].forEach((rel) => load(rel, sandbox));

const Intel = sandbox.WDS.dashboardRebuildIntel;
const Happening = sandbox.WDS.dashboardRebuildHappening;
const Rebuild = sandbox.WDS.dashboardRebuild;
const Data = sandbox.WDS.dashboardRebuildData;

assert("happening module loaded", !!(Happening && Happening.render && Happening.version));
assert("rebuild shell present", !!(Rebuild && Rebuild.renderShell));
assert(
  "wds loads happening module",
  /rebuild-happening\.js/.test(fs.readFileSync(path.join(ROOT, "design-system/js/wds.js"), "utf8"))
);
assert(
  "css has happening now styles",
  /\.wdb-r-hn\b/.test(fs.readFileSync(path.join(ROOT, "design-system/css/wds-dashboard-rebuild.css"), "utf8"))
);
assert(
  "css has why disclosure",
  /\.wdb-r-hn__why/.test(fs.readFileSync(path.join(ROOT, "design-system/css/wds-dashboard-rebuild.css"), "utf8"))
);

function shell(plat) {
  return Rebuild.renderShell({
    view: "workspace",
    platform: plat,
    placeContext: { placeLabel: "Test Place", lat: 41.3, lng: -74.8 },
    now: NOW,
    lazy: false
  });
}

function analyze(plat) {
  return Intel.analyze(plat, { lat: 41.3, lng: -74.8 }, NOW);
}

/* 1 Ordinary → hidden */
{
  const plat = platform({
    current: {
      temperature: 68,
      humidity: 48,
      wind: { speed: 5 },
      precipitation: { probability: 8 },
      cloudCover: 40,
      uvIndex: 3
    },
    daylight: { sunsetISO: isoOffset(240) }
  });
  const a = analyze(plat);
  const html = shell(plat);
  assert("1 ordinary HN empty", a.happeningNow.length === 0);
  assert("1 ordinary section hidden", !/data-wdb-r-hn/.test(html));
  assert("1 ordinary no filler copy", !/Nothing happening|Everything looks normal/i.test(html));
}

/* 2 Severe alert first */
{
  const plat = platform({
    current: { temperature: 95, feelsLike: 102, humidity: 70, wind: { speed: 8 }, precipitation: { probability: 5 } },
    alerts: {
      status: "live",
      items: [{ event: "Severe Thunderstorm Warning", severity: "Severe", headline: "Severe Thunderstorm Warning" }]
    }
  });
  const a = analyze(plat);
  const html = shell(plat);
  assert("2 alert first in API", a.happeningNow[0] && a.happeningNow[0].id === "alert-active");
  assert("2 HN visible", /data-wdb-r-hn/.test(html));
  assert("2 alert title in HN", /Severe Thunderstorm Warning|Active alert/i.test(html));
  assert("2 alert ranked first in DOM", /data-signal-id="alert-active"/.test(html.split("wdb-r-hn__item")[1] || html));
}

/* 3 Rain arriving soon */
{
  const plat = platform({
    current: { precipitation: { probability: 20 }, conditions: { summary: "Cloudy" }, cloudCover: 80 },
    hourly: hoursFrom([{ atMin: 60, prob: 55 }, { atMin: 120, prob: 70 }, { atMin: 180, prob: 40 }])
  });
  const a = analyze(plat);
  const html = shell(plat);
  assert("3 precip-soon signal", a.happeningNow.some((s) => s.id === "precip-soon"));
  assert("3 precip in HN UI", /data-signal-id="precip-soon"/.test(html));
  assert("3 precip minutesUntil not labeled as rise", !/Minutes until rise/i.test(html));
  assert("3 precip minutesUntil labeled as precip", /Minutes until elevated precip/i.test(html));
}

/* 4 Rain ending */
{
  const plat = platform({
    current: {
      precipitation: { probability: 80, amount: 0.05, intensity: "moderate" },
      conditions: { summary: "Light rain" },
      cloudCover: 95
    },
    hourly: hoursFrom([{ atMin: 60, prob: 35 }, { atMin: 120, prob: 15 }, { atMin: 180, prob: 10 }])
  });
  const a = analyze(plat);
  const html = shell(plat);
  assert("4 precip-ending signal", a.happeningNow.some((s) => s.id === "precip-ending") || a.happeningNow.some((s) => s.id === "precip-active"));
  assert("4 ending/active in UI", /precip-ending|precip-active/.test(html));
}

/* 5 Strong gusts */
{
  const plat = platform({ current: { wind: { speed: 22, gust: 38 }, precipitation: { probability: 10 } } });
  const a = analyze(plat);
  const html = shell(plat);
  assert("5 wind-gusts", a.happeningNow[0] && a.happeningNow[0].id === "wind-gusts");
  assert("5 gusts in UI", /data-signal-id="wind-gusts"/.test(html));
}

/* 6 Freezing */
{
  const plat = platform({
    current: { temperature: 28, feelsLike: 22, wind: { speed: 10 }, precipitation: { probability: 10 } },
    daylight: { sunsetISO: isoOffset(-30), kind: "night" }
  });
  const a = analyze(plat);
  const html = shell(plat);
  assert("6 freezing", a.happeningNow.some((s) => s.id === "temp-freezing"));
  assert("6 freezing UI", /data-signal-id="temp-freezing"/.test(html));
}

/* 7 High heat */
{
  const plat = platform({
    current: { temperature: 94, feelsLike: 101, humidity: 55, wind: { speed: 6 }, precipitation: { probability: 5 } }
  });
  const a = analyze(plat);
  const html = shell(plat);
  assert("7 heat", a.happeningNow.some((s) => s.id === "temp-heat"));
  assert("7 heat UI", /data-signal-id="temp-heat"/.test(html));
}

/* 8 Moderate air */
{
  const plat = platform({
    current: { temperature: 75, humidity: 50, wind: { speed: 5 }, precipitation: { probability: 5 } },
    air: { usAqi: 85, category: "Moderate", pm25: 28 }
  });
  const a = analyze(plat);
  const html = shell(plat);
  assert("8 air-moderate", a.happeningNow.some((s) => s.id === "air-moderate"));
  assert("8 air UI", /data-signal-id="air-moderate"/.test(html));
}

/* 9 Golden hour + Scenes */
{
  const plat = platform({
    current: { temperature: 70, humidity: 45, cloudCover: 35, wind: { speed: 5 }, precipitation: { probability: 5 } },
    daylight: { sunsetISO: isoOffset(35), sunsetFormatted: "7:35 PM", kind: "golden" }
  });
  const a = analyze(plat);
  const html = shell(plat);
  assert("9 golden signal", a.happeningNow.some((s) => s.id === "light-golden-approaching"));
  assert("9 Scenes action", /Explore in Scenes|Photo opportunity|Open Scenes/.test(html) && /\/apps\/scenes\//.test(html));
  assert("9 BYO does not duplicate golden summary", !/Sunset in about 35 minutes/i.test((a.beforeYouGo && a.beforeYouGo.brief) || ""));
}

/* 10 Blue hour + Scenes */
{
  const plat = platform({
    current: { temperature: 64, cloudCover: 30, wind: { speed: 4 }, precipitation: { probability: 5 } },
    daylight: { sunsetISO: isoOffset(-20), kind: "blue-hour" }
  });
  const a = analyze(plat);
  const html = shell(plat);
  assert("10 blue hour", a.happeningNow.some((s) => s.id === "light-blue-hour"));
  assert("10 Scenes on blue", /\/apps\/scenes\//.test(html));
}

/* 11 New moon clear → dark sky + Scenes */
{
  const plat = platform({
    current: { temperature: 58, cloudCover: 15, wind: { speed: 4 }, precipitation: { probability: 0 }, uvIndex: 0 },
    daylight: {
      sunsetISO: isoOffset(-120),
      sunriseISO: isoOffset(8 * 60),
      kind: "night",
      moonIllumination: 2,
      moonPhase: "New Moon"
    }
  });
  const a = analyze(plat);
  const html = shell(plat);
  assert("11 dark-moon", a.happeningNow.some((s) => s.id === "astro-dark-moon-clear"));
  assert("11 Scenes dark sky", /\/apps\/scenes\//.test(html));
}

/* 12 New moon cloudy → no false dark-sky opportunity in HN */
{
  const plat = platform({
    current: { temperature: 58, cloudCover: 85, wind: { speed: 4 }, precipitation: { probability: 10 }, uvIndex: 0 },
    daylight: {
      sunsetISO: isoOffset(-120),
      kind: "night",
      moonIllumination: 2,
      moonPhase: "New Moon"
    }
  });
  const a = analyze(plat);
  const html = shell(plat);
  assert("12 no dark-moon signal", !a.happeningNow.some((s) => s.id === "astro-dark-moon-clear"));
  assert("12 no Scenes dark-sky ad", !/Dark-sky opportunity/i.test(html));
}

/* 13 Multiple conditions → max 2–4 */
{
  const plat = platform({
    current: {
      temperature: 94,
      feelsLike: 101,
      humidity: 70,
      wind: { speed: 22, gust: 36 },
      precipitation: { probability: 20 },
      cloudCover: 40
    },
    air: { usAqi: 90, category: "Moderate" },
    daylight: { sunsetISO: isoOffset(40), sunsetFormatted: "7:40 PM" },
    alerts: {
      status: "live",
      items: [{ event: "Heat Advisory", severity: "Moderate" }]
    },
    hourly: hoursFrom([{ atMin: 60, prob: 55 }, { atMin: 120, prob: 60 }, { atMin: 180, prob: 40 }])
  });
  const a = analyze(plat);
  const html = shell(plat);
  const count = (html.match(/wdb-r-hn__item/g) || []).length;
  assert("13 API ≤4", a.happeningNow.length <= 4, String(a.happeningNow.length));
  assert("13 DOM ≤4", count <= 4 && count >= 1, String(count));
  assert("13 alert still first", a.happeningNow[0].id === "alert-active");
}

/* 14 Expired opportunity disappears */
{
  const state = Intel.normalizeEnvState(
    platform({
      current: { precipitation: { probability: 15 } },
      hourly: hoursFrom([{ atMin: -30, prob: 70 }, { atMin: 30, prob: 10 }, { atMin: 90, prob: 5 }])
    }),
    null,
    NOW
  );
  /* Force a stale precip-soon-like signal through rank filter */
  const stale = {
    id: "precip-soon",
    title: "Rain likely soon",
    summary: "stale",
    noteworthy: true,
    score: 70,
    severity: "info",
    evidence: [{ metric: "precip.probability.elevated", value: 70, source: "weather.hourly" }],
    validUntil: isoOffset(-10)
  };
  const ranked = Intel.rankSignals([stale], { noteworthyOnly: true, minScore: 25, limit: 4, now: NOW });
  assert("14 expired filtered", ranked.length === 0);
  const html = Happening.render({ signals: [stale], now: NOW });
  assert("14 expired not rendered", html === "");
}

/* 15 Evidence on every visible signal */
{
  const plat = platform({
    current: { wind: { speed: 22, gust: 38 }, precipitation: { probability: 10 } }
  });
  const html = shell(plat);
  assert("15 why button present", /data-wdb-r-hn-why/.test(html));
  assert("15 evidence panel present", /data-wdb-r-hn-evidence/.test(html));
  assert("15 evidence has rows", /wdb-r-hn__evidence-row/.test(html));
  const a = analyze(plat);
  assert(
    "15 every HN signal has evidence",
    a.happeningNow.every((s) => Array.isArray(s.evidence) && s.evidence.length > 0)
  );
}

/* 16 Ordinary again — no filler; customize hides HN */
{
  const plat = platform({
    current: { temperature: 70, humidity: 50, wind: { speed: 5 }, precipitation: { probability: 5 } },
    daylight: { sunsetISO: isoOffset(300) }
  });
  const workspace = Rebuild.renderShell({
    view: "workspace",
    platform: plat,
    placeContext: { placeLabel: "Quiet" },
    now: NOW
  });
  const customize = Rebuild.renderShell({
    view: "customize",
    platform: plat,
    placeContext: { placeLabel: "Quiet" },
    now: NOW
  });
  assert("16 workspace quiet", !/data-wdb-r-hn/.test(workspace));
  assert("16 customize has no HN", !/data-wdb-r-hn/.test(customize));
}

/* Accessibility affordances */
{
  const plat = platform({
    daylight: { sunsetISO: isoOffset(30), sunsetFormatted: "7:30 PM" },
    current: { cloudCover: 30, precipitation: { probability: 5 }, wind: { speed: 4 } }
  });
  const html = shell(plat);
  assert("a11y aria-labelledby", /aria-labelledby="wdb-r-hn-title"/.test(html));
  assert("a11y why aria-expanded", /aria-expanded="false"/.test(html));
  assert("a11y why aria-controls", /aria-controls="wdb-r-hn-ev-/.test(html));
  assert("a11y severity text not color-only", /Notable|Elevated|Urgent/.test(html));
  assert("no Sheds/Forage ads", !/sheds|foragecast/i.test(html));
}

/* Dedup: golden in HN, BYO practical */
{
  const plat = platform({
    current: { temperature: 74, humidity: 55, cloudCover: 30, wind: { speed: 5 }, precipitation: { probability: 5 } },
    daylight: { sunsetISO: isoOffset(40), sunsetFormatted: "7:40 PM" }
  });
  const a = analyze(plat);
  const door = Data.buildWidgetPayload("ph-doorway", plat, NOW);
  assert("dedupe HN has golden", a.happeningNow.some((s) => s.id === "light-golden-approaching"));
  assert("dedupe BYO brief avoids sunset window copy", !/Sunset in about/i.test(door.brief || ""));
  assert("dedupe BYO still has comfort/temp", /\d+°F|Mild|Warm|Cool/i.test(door.brief || ""));
}

console.log("\n" + passed + " assertions passed.");
if (failures.length) {
  console.error("\n" + failures.length + " failures:");
  failures.forEach((f) => console.error(" -", f));
  process.exit(1);
}
console.log("All Dashboard Happening Now tests passed.");
