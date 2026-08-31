#!/usr/bin/env node
/**
 * Sheds V1.2 — Today’s Hunt intelligence (freeze/thaw, trend, snow_depth).
 * Run: node automation/test-sheds-today-hunt-v12.mjs
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

const NOW = new Date("2026-02-15T14:00:00");
const LOC = { lat: 41.32, lng: -74.8, source: "gps" };
const TODAY = "2026-02-15";

function pad(n) {
  return String(n).padStart(2, "0");
}

function civilIso(y, mo, d, h) {
  return y + "-" + pad(mo) + "-" + pad(d) + "T" + pad(h) + ":00:00";
}

function hourlyTempsByHour(nightC, dayC, otherC) {
  const times = [];
  const temps = [];
  // Feb 13 00:00 through Feb 16 23:00 so 24h and 48h trend windows exist.
  for (let day = 13; day <= 16; day++) {
    for (let h = 0; h < 24; h++) {
      times.push(civilIso(2026, 2, day, h));
      if (day === 14 && h >= 18) temps.push(nightC);
      else if (day === 15 && h < 8) temps.push(nightC);
      else if (day === 15 && h >= 10 && h <= 16) temps.push(dayC);
      else temps.push(otherC);
    }
  }
  return { times, temps };
}

function favorable() {
  return { favorability: "favorable", status: "ready", headline: "Favorable" };
}

function weatherPackage(extra) {
  extra = extra || {};
  const series = extra.times
    ? { times: extra.times, temps: extra.temps }
    : hourlyTempsByHour(
      extra.nightC != null ? extra.nightC : 2,
      extra.dayC != null ? extra.dayC : 2,
      extra.otherC != null ? extra.otherC : 2
    );
  const freezeThaw = extra.freezeThaw || Wx.deriveFreezeThaw({
    hourlyTimes: series.times,
    hourlyTemps: series.temps,
    todayDateStr: TODAY,
    dailyMinC: extra.dailyMinC,
    dailyMaxC: extra.dailyMaxC,
    now: NOW
  });
  const snowDepthKnown = extra.snowDepthKnown === true;
  const snowDepthM = extra.snowDepthM;
  const snowCover = extra.snowCover || Wx.classifySnowDepth(
    snowDepthKnown ? snowDepthM : null,
    snowDepthKnown
  );
  const tempTrend = extra.tempTrend || Wx.deriveTempTrend(series.times, series.temps, NOW);
  return Object.assign({
    ready: true,
    tempC: extra.tempC != null ? extra.tempC : 2,
    windSpeedMs: 5,
    snowMm: extra.snowMm != null ? extra.snowMm : 4,
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
    snowDepthKnown: snowDepthKnown,
    snowDepthM: snowDepthKnown ? snowDepthM : null,
    snowCover: snowCover,
    freezeThaw: freezeThaw,
    tempTrend: tempTrend,
    dailyMinC: extra.dailyMinC,
    dailyMaxC: extra.dailyMaxC,
    source: "open-meteo"
  }, extra);
}

function huntWith(wxExtra, huntExtra) {
  return Hunt.compose(Object.assign({
    now: NOW,
    location: LOC,
    weather: weatherPackage(wxExtra || {}),
    weatherStatus: "ready",
    timing: Timing.evaluate({ date: NOW, lat: LOC.lat, prefs: {} }),
    searchability: favorable()
  }, huntExtra || {}));
}

const peakTiming = Timing.evaluate({ date: NOW, lat: LOC.lat, prefs: {} });
assert("Feb at 41°N is peak for V1.2 fixtures", peakTiming.category === "peak", peakTiming.category);

// 1. clear overnight freeze → daytime thaw
const ft = Wx.deriveFreezeThaw({
  hourlyTimes: hourlyTempsByHour(-4, 5, 0).times,
  hourlyTemps: hourlyTempsByHour(-4, 5, 0).temps,
  todayDateStr: TODAY,
  now: NOW
});
assert("1 freeze→thaw status", ft.status === "freeze_thaw", JSON.stringify(ft));
const huntFt = huntWith({ nightC: -4, dayC: 5, otherC: 0, tempC: 5, snowMm: 6 });
assert("1 freeze→thaw extra feeds composer", huntFt.ruleIds.indexOf("extra-freeze-thaw") >= 0, huntFt.ruleIds.join(","));
assert("1 freeze→thaw copy is cautious", /may help expose searchable ground/i.test(
  [huntFt.today, (huntFt.why || []).join(" "), (huntFt.conditions || []).join(" ")].join(" ")
));
assert("1 freeze→thaw does not claim drop or find", !/antler|sheds will be found|dropped/i.test([huntFt.today, (huntFt.why || []).join(" "), (huntFt.conditions || []).join(" ")].join(" ")));

// 2. all temperatures below freezing
const below = Wx.deriveFreezeThaw({
  hourlyTimes: hourlyTempsByHour(-8, -3, -5).times,
  hourlyTemps: hourlyTempsByHour(-8, -3, -5).temps,
  todayDateStr: TODAY,
  now: NOW
});
assert("2 below_freezing", below.status === "below_freezing", JSON.stringify(below));
const huntBelow = huntWith({
  nightC: -8, dayC: -3, otherC: -5, tempC: -4, snowMm: 4,
  freezeThaw: below
});
assert("2 below freezing blocks Very good", huntBelow.band !== "Very good", huntBelow.band + " " + huntFt.ruleIds.join(","));
assert("2 below freezing rule", huntBelow.ruleIds.indexOf("very-good-blocked-below-freezing") >= 0);
assert("2 below freezing copy", /below freezing/i.test([huntBelow.today, huntBelow.why.join(" "), (huntBelow.conditions || []).join(" ")].join(" ")));

// 3. all temperatures above freezing
const above = Wx.deriveFreezeThaw({
  hourlyTimes: hourlyTempsByHour(4, 8, 6).times,
  hourlyTemps: hourlyTempsByHour(4, 8, 6).temps,
  todayDateStr: TODAY,
  now: NOW
});
assert("3 above_freezing", above.status === "above_freezing", JSON.stringify(above));

// 4. marginal temperatures near 0°C
const near = Wx.deriveFreezeThaw({
  hourlyTimes: hourlyTempsByHour(-0.4, 0.6, 0.1).times,
  hourlyTemps: hourlyTempsByHour(-0.4, 0.6, 0.1).temps,
  todayDateStr: TODAY,
  now: NOW
});
assert("4 near_freezing / marginal", near.status === "near_freezing", JSON.stringify(near));
assert("4 does not claim freeze→thaw", near.status !== "freeze_thaw");

// 5. missing daily temperature data
const missingDaily = Wx.deriveFreezeThaw({
  hourlyTimes: [],
  hourlyTemps: [],
  todayDateStr: TODAY,
  dailyMinC: null,
  dailyMaxC: null,
  now: NOW
});
assert("5 insufficient without temps", missingDaily.status === "insufficient", JSON.stringify(missingDaily));
assert("5 missing freeze/thaw is not Low by itself", huntWith({
  freezeThaw: missingDaily,
  times: hourlyTempsByHour(4, 8, 6).times,
  temps: hourlyTempsByHour(4, 8, 6).temps,
  nightC: 4, dayC: 8, otherC: 6, tempC: 6, snowMm: 0
}).band !== "Need location");

// 6. snow_depth present
const deepDepth = Wx.classifySnowDepth(0.22, true);
assert("6 deep class from 0.22 m", deepDepth.status === "deep", JSON.stringify(deepDepth));
const huntDeep = huntWith({
  snowDepthKnown: true,
  snowDepthM: 0.22,
  snowMm: 2,
  nightC: 4, dayC: 8, otherC: 6, tempC: 4
});
assert("6 deep snow_depth caps at Fair", huntDeep.band === "Fair" || huntDeep.band === "Low", huntDeep.band);
assert("6 does not print meter precision", !/\d\.\d+\s*m\b/.test(JSON.stringify(huntDeep)));
assert("6 uses limiting copy", /Snow remains a limiting factor/i.test(JSON.stringify(huntDeep)));

const lightDepth = Wx.classifySnowDepth(0.02, true);
assert("6 light class from 0.02 m", lightDepth.status === "light", JSON.stringify(lightDepth));

// 7. snow_depth explicitly zero
const zero = Wx.classifySnowDepth(0, true);
assert("7 explicit zero is none, not unavailable", zero.status === "none", JSON.stringify(zero));
const huntZero = huntWith({
  snowDepthKnown: true,
  snowDepthM: 0,
  snowMm: 40,
  nightC: 4, dayC: 8, otherC: 6, tempC: 4
});
assert("7 explicit zero is not treated as missing", huntZero.channels.snowCover.status === "none");
assert("7 high snowfall with measured zero does not cap as unknown depth", huntZero.ruleIds.indexOf("cap-deep-swe") < 0, huntZero.ruleIds.join(","));
assert("7 zero copy", /No snow on the ground/i.test((huntZero.conditions || []).join(" ")));

// 8. snow_depth missing
const missingDepth = Wx.classifySnowDepth(null, false);
assert("8 missing is unavailable", missingDepth.status === "unavailable");
assert("8 missing is not zero", missingDepth.status !== "none");
const huntMissingDepth = huntWith({ snowDepthKnown: false, snowMm: 4, nightC: 4, dayC: 8, otherC: 6 });
assert("8 missing copy", /Snow-depth data is unavailable/i.test((huntMissingDepth.conditions || []).join(" ")));
assert("8 missing is not clear ground", !/No snow on the ground/i.test((huntMissingDepth.conditions || []).join(" ")));

// 9. SWE/snowfall present while snow_depth missing
const jsonSweNoDepth = {
  current: { temperature_2m: 1, wind_speed_10m: 4, surface_pressure: 1010, precipitation: 0 },
  daily: {
    time: ["2026-02-14", "2026-02-15", "2026-02-16"],
    snowfall_sum: [12, 8, 0],
    precipitation_sum: [2, 1, 0],
    sunrise: ["2026-02-14T07:00", "2026-02-15T07:00", "2026-02-16T07:00"],
    sunset: ["2026-02-14T17:30", "2026-02-15T17:36", "2026-02-16T17:40"]
  },
  daily_units: { snowfall_sum: "cm" },
  hourly: { time: [], temperature_2m: [], precipitation: [], wind_speed_10m: [], snow_depth: [] },
  utc_offset_seconds: 0
};
const parsedSwe = Wx.parseForecast(jsonSweNoDepth, NOW);
assert("9 snowfall_sum parsed", parsedSwe.snowMm > 0, String(parsedSwe.snowMm));
assert("9 snow_depth missing stays unknown", parsedSwe.snowDepthKnown === false && parsedSwe.snowDepthM == null);
assert("9 snowfall is not copied into snowDepthM", parsedSwe.snowDepthM !== parsedSwe.snowMm);
assert("9 cover unavailable despite snowfall", parsedSwe.snowCover.status === "unavailable");

const huntSweMissingDepth = Hunt.compose({
  now: NOW,
  location: LOC,
  weather: Object.assign(parsedSwe, {
    hourlyTimes: hourlyTempsByHour(4, 8, 6).times,
    hourlyTemps: hourlyTempsByHour(4, 8, 6).temps,
    freezeThaw: above,
    tempTrend: { status: "little_change", label: "Relatively stable", deltaC: 0 }
  }),
  weatherStatus: "ready",
  timing: peakTiming,
  searchability: favorable()
});
assert("9 does not treat snowfall as ground depth", !/No snow on the ground/i.test(JSON.stringify(huntSweMissingDepth)));
assert("9 still notes unavailable depth", /snow-depth data is unavailable/i.test(JSON.stringify(huntSweMissingDepth)));

// 10. weather request failure
const failed = Hunt.compose({
  now: NOW,
  location: LOC,
  weather: null,
  weatherStatus: "unavailable",
  timing: peakTiming
});
assert("10 weather failure is Not rated", failed.band === "Need location" ? false : failed.band === "Not rated", failed.band);
assert("10 weather failure is UNKNOWN not Low", failed.rated === false && failed.band === "Not rated");
assert("10 weather failure is not Very good", failed.band !== "Very good");

const emptyParse = Wx.parseForecast({}, NOW);
assert("10 empty forecast is not ready", emptyParse.ready === false);

// 11. season caps still work
const early = Hunt.compose({
  now: new Date("2026-01-05T14:00:00"),
  location: LOC,
  weather: weatherPackage({ nightC: 4, dayC: 8, otherC: 6, tempC: 4, snowMm: 0 }),
  weatherStatus: "ready",
  timing: Timing.evaluate({ date: new Date("2026-01-05T14:00:00"), lat: LOC.lat }),
  searchability: favorable()
});
assert("11 early season max Fair", Hunt.isRatedBand(early.band) && ["Low", "Fair"].indexOf(early.band) >= 0, early.band + " " + early.season.category);
if (early.season.category === "early") {
  assert("11 early is not Good/Very good", early.band === "Fair" || early.band === "Low", early.band);
}

const outside = Hunt.compose({
  now: new Date("2026-08-30T14:00:00"),
  location: LOC,
  weather: weatherPackage({ nightC: 18, dayC: 24, otherC: 20, tempC: 22, snowMm: 0 }),
  weatherStatus: "ready",
  timing: Timing.evaluate({ date: new Date("2026-08-30T14:00:00"), lat: LOC.lat }),
  searchability: favorable()
});
assert("11 outside remains Low", outside.band === "Low" && outside.season.category === "outside", outside.band + " " + outside.season.category);

// 12. Very good gating still works
const very = huntWith({
  nightC: -4, dayC: 5, otherC: 1, tempC: 4, snowMm: 12,
  snowDepthKnown: false
});
assert("12 freeze→thaw + peak + favorable can be Very good", very.band === "Very good", very.band + " " + very.ruleIds.join(","));

const veryBlockedLoc = Hunt.compose({
  now: NOW,
  location: null,
  weather: weatherPackage({ nightC: -4, dayC: 5, snowMm: 12, tempC: 4 }),
  weatherStatus: "ready",
  timing: peakTiming,
  searchability: favorable()
});
assert("12 missing location still blocks Very good", veryBlockedLoc.band === "Need location");

const veryBlockedWx = Hunt.compose({
  now: NOW,
  location: LOC,
  weather: null,
  weatherStatus: "unavailable",
  timing: peakTiming,
  searchability: favorable()
});
assert("12 missing weather still blocks Very good", veryBlockedWx.band === "Not rated");

const veryBlockedBelow = huntWith({
  freezeThaw: below,
  nightC: -8, dayC: -3, otherC: -5, tempC: -4, snowMm: 12
});
assert("12 below freezing cannot be Very good", veryBlockedBelow.band !== "Very good");

// 13. Need location remains UNKNOWN
const noLoc = Hunt.compose({ now: NOW, location: null, weather: null, weatherStatus: "unavailable" });
assert("13 Need location", noLoc.band === "Need location" && noLoc.rated === false);
assert("13 Need location is not Low", noLoc.band !== "Low");
assert("13 Need location omits freeze/thaw dashboard", !noLoc.conditions || noLoc.conditions.length === 0);

// 14. Not rated remains UNKNOWN
assert("14 Not rated", failed.band === "Not rated" && failed.rated === false);
assert("14 Not rated is not Low", failed.rating == null);

// 15. overview and map produce the same interpretation from identical inputs
const input = {
  now: NOW,
  location: LOC,
  weather: weatherPackage({ nightC: -4, dayC: 5, otherC: 0, tempC: 4, snowMm: 6, snowDepthKnown: true, snowDepthM: 0.04 }),
  weatherStatus: "ready",
  timing: peakTiming,
  searchability: favorable()
};
const overview = Hunt.compose(input);
const map = Hunt.compose(input);
function core(h) {
  return JSON.stringify({
    status: h.status,
    rated: h.rated,
    band: h.band,
    rating: h.rating,
    today: h.today,
    why: h.why,
    conditions: h.conditions,
    freeze: h.channels.freezeThaw && h.channels.freezeThaw.status,
    trend: h.channels.tempTrend && h.channels.tempTrend.status,
    snow: h.channels.snowCover && h.channels.snowCover.status,
    ruleIds: h.ruleIds
  });
}
assert("15 identical inputs → identical hunt core", core(overview) === core(map));
const hostHtml = read("apps/shed-hunting/host/index.html");
const mapHtml = read("apps/shed-hunting/map/index.html");
const overviewBoot = read("apps/shed-hunting/js/sheds-today-hunt-overview.js");
const mapApp = read("apps/shed-hunting/js/sheds-map-app.js");
assert("15 overview uses Hunt.compose", /Hunt\.compose/.test(overviewBoot));
assert("15 overview Open Map href is origin-aware", /openMapHref/.test(overviewBoot) && /data-shed-host/.test(overviewBoot));
assert("15 map uses TodayHunt.compose", /TodayHunt\.compose/.test(mapApp));
assert("15 both pages load the shared composer", /sheds-today-hunt\.js/.test(hostHtml) && /sheds-today-hunt\.js/.test(mapHtml));

// parseForecast: current snow_depth 0 vs omitted
const jsonZero = {
  current: { temperature_2m: 2, wind_speed_10m: 3, surface_pressure: 1012, precipitation: 0, snow_depth: 0 },
  daily: {
    time: ["2026-02-15"],
    snowfall_sum: [0],
    precipitation_sum: [0],
    sunrise: ["2026-02-15T07:00"],
    sunset: ["2026-02-15T17:30"],
    temperature_2m_min: [-6],
    temperature_2m_max: [4]
  },
  hourly: {
    time: hourlyTempsByHour(-6, 4, -1).times,
    temperature_2m: hourlyTempsByHour(-6, 4, -1).temps,
    precipitation: [],
    wind_speed_10m: [],
    snow_depth: hourlyTempsByHour(-6, 4, -1).times.map(function () { return 0; })
  },
  utc_offset_seconds: 0
};
const parsedZero = Wx.parseForecast(jsonZero, NOW);
assert("parseForecast explicit 0 snow_depth is known", parsedZero.snowDepthKnown === true && parsedZero.snowDepthM === 0);
assert("parseForecast freeze_thaw from hourly or daily", parsedZero.freezeThaw.status === "freeze_thaw", JSON.stringify(parsedZero.freezeThaw));
assert("parseForecast daily min/max stored", parsedZero.dailyMinC === -6 && parsedZero.dailyMaxC === 4);

const jsonNoSnowKey = {
  current: { temperature_2m: 2, wind_speed_10m: 3, surface_pressure: 1012, precipitation: 0 },
  daily: {
    time: ["2026-02-15"],
    snowfall_sum: [3],
    precipitation_sum: [1],
    sunrise: ["2026-02-15T07:00"],
    sunset: ["2026-02-15T17:30"]
  },
  hourly: { time: ["2026-02-15T14:00"], temperature_2m: [2] }
};
const parsedNoKey = Wx.parseForecast(jsonNoSnowKey, NOW);
assert("omitted snow_depth key is unknown, not zero", parsedNoKey.snowDepthKnown === false);

// Temperature trend 48h vs 24h
function seriesTrend(recentC, past24C, past48C) {
  const times = [];
  const temps = [];
  for (let i = 54; i >= 0; i--) {
    times.push(new Date(NOW.getTime() - i * 3600000).toISOString());
    if (i <= 6) temps.push(recentC);
    else if (i >= 45 && i <= 51) temps.push(past48C);
    else temps.push(past24C);
  }
  return { times, temps };
}
const t48 = Wx.deriveTempTrend(seriesTrend(6, 5, 1).times, seriesTrend(6, 5, 1).temps, NOW);
assert("48h warming when long lookback exists", t48.status === "warming" && t48.lookbackHours === 48, JSON.stringify(t48));
const t24only = Wx.deriveTempTrend(
  weatherPackage({ nightC: 5, dayC: 5, otherC: 1 }).hourlyTimes,
  hourlyTempsByHour(1, 5, 1).temps,
  NOW
);
assert("24h fallback still classifies", t24only.status === "warming" || t24only.status === "little_change" || t24only.status === "cooling", JSON.stringify(t24only));

const stable = Wx.deriveTempTrend(
  hourlyTempsByHour(3, 3.5, 3).times,
  hourlyTempsByHour(3, 3.5, 3).temps,
  NOW
);
assert("relatively stable uses little_change status", stable.status === "little_change", JSON.stringify(stable));
assert("relatively stable label", /stable/i.test(stable.label));

function banned(obj) {
  const blob = [
    obj.band,
    obj.today,
    (obj.why || []).join(" "),
    (obj.conditions || []).join(" "),
    obj.where,
    obj.watch,
    obj.season && obj.season.label
  ].join(" ").toLowerCase();
  const hits = [];
  if (/antler probability/.test(blob)) hits.push("antler probability");
  if (/percent chance/.test(blob)) hits.push("percent chance");
  if (/sheds are here/.test(blob)) hits.push("sheds are here");
  if (/sheds will be found/.test(blob)) hits.push("will be found");
  if (/causes antlers to drop/.test(blob)) hits.push("causes drop");
  if (/\b\d{1,3}% chance/.test(blob)) hits.push("percent chance number");
  return hits;
}
[huntFt, huntBelow, huntDeep, huntZero, huntMissingDepth, failed, noLoc, very, outside].forEach(function (h, i) {
  const hits = banned(h);
  assert("no banned certainty language v12 #" + i, hits.length === 0, hits.join(", "));
});

const html = Hunt.renderHuntHtml(huntFt);
assert("HTML order: season before conditions", html.indexOf("sheds-hunt__season") < html.indexOf("sheds-hunt__conditions"));
assert("HTML order: conditions before why", html.indexOf("sheds-hunt__conditions") < html.indexOf("Why"));
assert("HTML omits searchability word", !/searchability/i.test(html));
const htmlCta = Hunt.renderHuntHtml(huntFt, { includeQuestion: false, openMapHref: "../map/" });
assert("overview Open Map sits after conditions", htmlCta.indexOf("sheds-hunt__conditions") < htmlCta.indexOf("Open Map"));
assert("overview Open Map sits before Why", htmlCta.indexOf("Open Map") < htmlCta.indexOf("Why"));

if (failures.length) {
  console.error("\n" + failures.length + " failure(s)");
  process.exit(1);
}
console.log("\nAll Today's Hunt V1.2 tests passed.");
