#!/usr/bin/env node
/**
 * Sheds V1.1 — Today's Hunt composer honesty + band rules.
 * Run: node automation/test-sheds-today-hunt.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function assert(name, cond, detail) {
  if (cond) console.log("PASS", name);
  else {
    failures.push(name + ": " + (detail || "failed"));
    console.log("FAIL", name, "—", detail || "");
  }
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const sandbox = { console, Math, isFinite, Number, String, Array, Object, Date, JSON };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.localStorage = {
  getItem: function () { return null; },
  setItem: function () {},
  removeItem: function () {}
};

[
  "apps/shed-hunting/js/sheds-biological-model.js",
  "apps/shed-hunting/js/sheds-timing.js",
  "apps/shed-hunting/js/sheds-todays-search.js",
  "apps/shed-hunting/js/sheds-searchability.js",
  "apps/shed-hunting/js/sheds-weather.js",
  "apps/shed-hunting/js/sheds-today-hunt.js"
].forEach(function (rel) {
  vm.runInNewContext(read(rel), sandbox, { filename: path.basename(rel) });
});

const Hunt = sandbox.WaypointShedsTodayHunt;
const Wx = sandbox.WaypointShedsWeather;
const Timing = sandbox.WaypointShedsTiming;

assert("composer exports compose", !!(Hunt && typeof Hunt.compose === "function"));
assert("weather exports deriveTempTrend", !!(Wx && typeof Wx.deriveTempTrend === "function"));
assert("bands are Low Fair Good Very good", Hunt.BANDS.join("|") === "Low|Fair|Good|Very good");

const NOW = new Date("2026-02-15T14:00:00");
const LOC = { lat: 41.32, lng: -74.8, source: "gps" };

function hourlySeries(now, recentC, pastC) {
  const times = [];
  const temps = [];
  const start = new Date(now.getTime() - 36 * 3600000);
  for (let i = 0; i < 40; i++) {
    const t = new Date(start.getTime() + i * 3600000);
    times.push(t.toISOString());
    const hoursFromNow = (t.getTime() - now.getTime()) / 3600000;
    temps.push(hoursFromNow < -18 ? pastC : recentC);
  }
  return { times, temps };
}

function weatherPackage(extra) {
  extra = extra || {};
  const series = hourlySeries(NOW, extra.recentC != null ? extra.recentC : 2, extra.pastC != null ? extra.pastC : 2);
  return Object.assign({
    ready: true,
    tempC: 2,
    windSpeedMs: 5,
    snowMm: 4,
    precipMm24h: 1,
    precipNowMm: 0,
    pressureTrend: "steady",
    sunriseHour: 7.0,
    sunsetHour: 17.6,
    sunriseLocal: "7:00 AM",
    sunsetLocal: "5:36 PM",
    hourlyTimes: series.times,
    hourlyTemps: series.temps,
    hourlyPrecip: series.times.map(function () { return 0; }),
    hourlyWinds: series.times.map(function () { return 5; }),
    snowDepthKnown: false,
    source: "open-meteo"
  }, extra);
}

const peakTiming = Timing.evaluate({ date: NOW, lat: LOC.lat, prefs: {} });
assert("Feb at 41°N is main/peak window", peakTiming.category === "peak", peakTiming.category + " " + peakTiming.plainLabel);

const noLoc = Hunt.compose({
  now: NOW,
  location: null,
  weather: null,
  weatherStatus: "unavailable"
});
assert("no location is Low", noLoc.band === "Low");
assert("no location asks for a place", /location/i.test(noLoc.today));
assert("no location is not Very good", noLoc.band !== "Very good");
assert("no invented city", !/Milford|Pike County/i.test(JSON.stringify(noLoc)));

const noWx = Hunt.compose({
  now: NOW,
  location: LOC,
  weather: null,
  weatherStatus: "unavailable",
  timing: peakTiming
});
assert("no weather cannot be Very good", noWx.band !== "Very good");
assert("peak without weather is at most Fair", noWx.band === "Fair" || noWx.band === "Low");
assert("no weather explains missing weather", /weather/i.test(noWx.why.join(" ")));

const favorable = {
  favorability: "favorable",
  status: "ready",
  headline: "Favorable morning to go search",
  timeWindows: [{ id: "morning", label: "Morning", band: "favorable", score: 0.8, why: [] }]
};

const very = Hunt.compose({
  now: NOW,
  location: LOC,
  weather: weatherPackage({ snowMm: 12, tempC: 3, recentC: 4, pastC: 0 }),
  weatherStatus: "ready",
  timing: peakTiming,
  searchability: favorable
});
assert("strong peak + melt + favorable can be Very good", very.band === "Very good", very.band + " rules=" + very.ruleIds.join(","));
assert("Very good lists extra rule", very.ruleIds.indexOf("very-good") >= 0);
assert("season remains separate", /Main search window|Peak/i.test(very.season.label));

const missingWxBlocks = Hunt.compose({
  now: NOW,
  location: LOC,
  weather: null,
  weatherStatus: "unavailable",
  timing: peakTiming,
  searchability: favorable
});
assert("missing weather blocks Very good even if searchability injected", missingWxBlocks.band !== "Very good");

const missingLocBlocks = Hunt.compose({
  now: NOW,
  location: null,
  weather: weatherPackage({ snowMm: 12, tempC: 3 }),
  weatherStatus: "ready",
  timing: peakTiming,
  searchability: favorable
});
assert("missing location blocks Very good", missingLocBlocks.band !== "Very good");

const outside = Hunt.compose({
  now: new Date("2026-07-15T14:00:00"),
  location: LOC,
  weather: weatherPackage({ snowMm: 0, tempC: 22 }),
  weatherStatus: "ready",
  timing: Timing.evaluate({ date: new Date("2026-07-15T14:00:00"), lat: LOC.lat }),
  searchability: favorable
});
assert("outside season caps at Fair", outside.band === "Fair" || outside.band === "Low", outside.band);
assert("outside is not Very good", outside.band !== "Very good");
assert("season labeled outside/not main", /outside|unclear/i.test(outside.season.label));

const deepSnow = Hunt.compose({
  now: NOW,
  location: LOC,
  weather: weatherPackage({ snowMm: 40, tempC: 1 }),
  weatherStatus: "ready",
  timing: peakTiming,
  searchability: favorable
});
assert("deep SWE caps at Fair", deepSnow.band === "Fair" || deepSnow.band === "Low", deepSnow.band);
assert("SWE is not called depth", !/snow depth \d|depth is \d/i.test(JSON.stringify(deepSnow)));
assert("SWE honesty", /water-equivalent|SWE|depth is (still )?unknown|not measured/i.test(JSON.stringify(deepSnow)));

const trendWarm = Wx.deriveTempTrend(
  weatherPackage({ recentC: 5, pastC: 1 }).hourlyTimes,
  weatherPackage({ recentC: 5, pastC: 1 }).hourlyTemps,
  NOW
);
assert("4 °C rise is Warming", trendWarm.status === "warming", JSON.stringify(trendWarm));

const trendSmall = Wx.deriveTempTrend(
  weatherPackage({ recentC: 2.5, pastC: 1.5 }).hourlyTimes,
  weatherPackage({ recentC: 2.5, pastC: 1.5 }).hourlyTemps,
  NOW
);
assert("1 °C is Little change", trendSmall.status === "little_change", JSON.stringify(trendSmall));

const fewHours = Wx.deriveTempTrend(
  [NOW.toISOString()],
  [3],
  NOW
);
assert("too few hours is unknown", fewHours.status === "unknown");

const limited = Hunt.compose({
  now: NOW,
  location: LOC,
  weather: weatherPackage({ snowMm: 0, tempC: 18, windSpeedMs: 1 }),
  weatherStatus: "ready",
  timing: peakTiming,
  searchability: { favorability: "limited", status: "ready", headline: "Limited" }
});
assert("limited searchability is Low", limited.band === "Low", limited.band);
assert("does not copy window score into Very good", limited.band !== "Very good");

const fairHunt = Hunt.compose({
  now: NOW,
  location: LOC,
  weather: weatherPackage({ snowMm: 0, tempC: 8 }),
  weatherStatus: "ready",
  timing: peakTiming,
  searchability: { favorability: "moderate", status: "ready", headline: "Workable" }
});
assert("moderate searchability is Fair", fairHunt.band === "Fair", fairHunt.band);

assert("today answers first", /^Good day to search\.|^Fair conditions|^Conditions are limited|^Today looks worth|^Share a location|^Reading/i.test(fairHunt.today));
assert("where does not invent local terrain", !/your (south-facing|slope|ridge at)/i.test(fairHunt.where));
assert("where is types of ground or map compare", /map|edges|benches|notes/i.test(fairHunt.where));

const noWatchWx = weatherPackage({
  hourlyPrecip: weatherPackage().hourlyTimes.map(function () { return 0; }),
  hourlyWinds: weatherPackage().hourlyTimes.map(function () { return 5; }),
  snowMm: 1,
  tempC: 2,
  recentC: 2,
  pastC: 2
});
const quiet = Hunt.compose({
  now: NOW,
  location: LOC,
  weather: noWatchWx,
  weatherStatus: "ready",
  timing: peakTiming,
  searchability: { favorability: "moderate", status: "ready" }
});
assert("WATCH omitted when nothing meaningful", quiet.watch == null, String(quiet.watch));

const precipLater = weatherPackage();
precipLater.hourlyPrecip = precipLater.hourlyTimes.map(function (iso) {
  const t = new Date(iso).getTime();
  return t > NOW.getTime() && t < NOW.getTime() + 3 * 3600000 ? 1.2 : 0;
});
const watching = Hunt.compose({
  now: NOW,
  location: LOC,
  weather: precipLater,
  weatherStatus: "ready",
  timing: peakTiming,
  searchability: { favorability: "moderate", status: "ready" }
});
assert("WATCH mentions arriving precipitation when hourly supports it", /precip/i.test(watching.watch || ""), String(watching.watch));

function banned(obj) {
  const blob = [
    obj.band,
    obj.today,
    (obj.why || []).join(" "),
    obj.where,
    obj.watch,
    obj.season && obj.season.label
  ].join(" ").toLowerCase();
  const hits = [];
  if (/antler probability/.test(blob)) hits.push("antler probability");
  if (/deer probability/.test(blob)) hits.push("deer probability");
  if (/percent chance/.test(blob)) hits.push("percent chance");
  if (/sheds are here/.test(blob)) hits.push("sheds are here");
  if (/deer are here/.test(blob)) hits.push("deer are here");
  if (/\b\d{1,3}% chance/.test(blob)) hits.push("percent chance number");
  if (/find probability/.test(blob)) hits.push("find probability");
  return hits;
}

[noLoc, noWx, very, outside, deepSnow, limited, fairHunt].forEach(function (h, i) {
  const hits = banned(h);
  assert("no banned certainty language #" + i, hits.length === 0, hits.join(", "));
});

assert("disclaimer says not a find probability", /not a find probability/i.test(very.disclaimer));
assert("channels keep timing", very.channels && very.channels.timing && very.channels.timing.category === "peak");
assert("channels keep searchability", very.channels.searchability.favorability === "favorable");
assert("HTML renderer includes Why", /Why/.test(Hunt.renderHuntHtml(very)));
assert("HTML omits Watch when null", !/Watch/.test(Hunt.renderHuntHtml(quiet)));

const hostHtml = read("apps/shed-hunting/host/index.html");
assert("host includes composer script", /sheds-today-hunt\.js/.test(hostHtml));
assert("host includes overview boot", /sheds-today-hunt-overview\.js/.test(hostHtml));
assert("host hunt root exists", /id="todays-hunt"/.test(hostHtml));
assert("host does not send today's conditions to Dashboard", !/<strong>Today’s conditions<\/strong>/.test(hostHtml));
assert("host still has Open Map", /href="\.\.\/map\/"/.test(hostHtml));
assert("host location prompt exists", /hunt-use-location/.test(hostHtml));

const mapHtml = read("apps/shed-hunting/map/index.html");
assert("map includes composer", /sheds-today-hunt\.js/.test(mapHtml));
assert("map includes weather helper", /sheds-weather\.js/.test(mapHtml));
assert("map hunt root exists", /id="today-hunt"/.test(mapHtml));
assert("map keeps channels under More detail", /id="hunt-more-detail"/.test(mapHtml) && /id="sheds-channels"/.test(mapHtml));

const app = read("apps/shed-hunting/js/sheds-map-app.js");
assert("map uses Weather.fetchForecast", /Weather\.fetchForecast/.test(app));
assert("map uses TodayHunt.compose", /TodayHunt\.compose|refreshTodayHunt/.test(app));
assert("map does not treat zoom-6 overview as hunt location", /getZoom\(\) >= 10/.test(app));

const weatherSrc = read("apps/shed-hunting/js/sheds-weather.js");
assert("weather fetch still requests hourly temperature", /hourly=temperature_2m/.test(weatherSrc));
assert("weather does not request snow_depth", !/[=,]snow_depth/.test(weatherSrc));
assert("SWE vs depth documented in weather", /water-equivalent|not depth/.test(weatherSrc));

const composerSrc = read("apps/shed-hunting/js/sheds-today-hunt.js");
assert("composer documents Very good rules", /Very good requires/.test(composerSrc));
assert("composer does not emit percent chance copy", !/percent chance of finding/.test(composerSrc));

if (failures.length) {
  console.error("\n" + failures.length + " failure(s)");
  process.exit(1);
}
console.log("\nAll Today's Hunt tests passed.");
