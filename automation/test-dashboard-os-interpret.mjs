#!/usr/bin/env node
/**
 * Dashboard OS Milestone 2 — interpretation / PriorityRanker unit tests.
 * Run: node automation/test-dashboard-os-interpret.mjs
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

const DAY = "2026-07-22T14:00:00.000-04:00";
const NIGHT = "2026-07-22T22:30:00.000-04:00";

const sandbox = {
  window: {},
  globalThis: {},
  console,
  Date,
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
      return { level: "good", summary: "Good", detail: "" };
    },
    photographyConditions() {
      return { level: "fair", summary: "Fair", detail: "" };
    }
  },
  photographyConditions: {
    fromPlatform(platform) {
      if (platform && platform._photoStub) return platform._photoStub;
      return { status: "fair", score: 2, summary: "No standout", detail: "", level: "fair" };
    }
  },
  integrations: { get: () => ({ status: "live" }) },
  dashboardReliability: {
    classifyPackageTrust(p) {
      if (p && p.meta && p.meta.fromCache) return "cached";
      return "live";
    }
  },
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
  "design-system/js/dashboard/os/wds-dashboard-os-compose.js"
].forEach((f) => load(f, sandbox));

const Interpret = sandbox.WDS.dashboardOSInterpret;
const Compose = sandbox.WDS.dashboardOSCompose;

assert("interpret loaded", !!(Interpret && Interpret.synthesize && Interpret.RULES));
assert("rules catalog non-empty", Interpret.RULES.length >= 20);

const dew = Interpret.estimateDewPointF(86, 88);
assert("dew point estimate present", dew != null && dew >= 70, String(dew));

function modelFrom(platform, loc) {
  return sandbox.WDS.dashboardV2Model.normalizeFromContext({
    location: loc || {
      city: "Milford",
      county: "Pike",
      stateCode: "PA",
      lat: 41.32,
      lng: -74.8,
      source: "browser"
    },
    platform
  });
}

function baseWx(cur) {
  return {
    meta: { hydratedAt: DAY, fromCache: false, connectivity: "online", blockStatus: { weather: "live" } },
    weatherRef: {
      meta: { isPlaceholder: false },
      current: Object.assign(
        {
          temperature: 70,
          feelsLike: 70,
          humidity: 50,
          cloudCover: 30,
          uvIndex: 5,
          wind: { speed: 6 },
          conditions: { summary: "Partly cloudy" },
          precipitation: { probability: 10 }
        },
        cur || {}
      ),
      hourly: [
        {
          time: new Date(new Date(DAY).getTime() + 3600000).toISOString(),
          temperature: 72,
          precipitation: { probability: 10 },
          wind: { speed: 5 },
          cloudCover: 30,
          uvIndex: 6
        }
      ],
      daily: [{}]
    },
    daylight: { sunriseFormatted: "6:00 AM", sunsetFormatted: "8:00 PM", goldenHour: "7:30–8:00 PM" },
    moon: { phaseLabel: "Gibbous", illumination: 70 },
    airQuality: { status: "live", usAqi: 40, category: "Good" },
    alerts: { status: "live", items: [] },
    water: { status: "live", sites: [{ name: "Creek", trend: "Stable", gageHeight: 3, distanceMi: 2 }] }
  };
}

// Happening must not simply echo provider text
{
  const platform = baseWx({ conditions: { summary: "Partly cloudy" }, cloudCover: 40, temperature: 64, feelsLike: 64 });
  const model = modelFrom(platform);
  const out = Interpret.synthesize({ model, flags: { now: DAY } });
  assert("happening headline exists", !!(out.happening && out.happening.headline));
  assert(
    "happening not raw provider dump",
    !/^Partly cloudy/i.test(out.happening.headline),
    out.happening.headline
  );
  assert(
    "happening word budget ≤30",
    Interpret.wordCount(out.happening.headline) + Interpret.wordCount(out.happening.support) <= 30,
    String(Interpret.wordCount(out.happening.headline) + Interpret.wordCount(out.happening.support))
  );
  assert("matters ≤3", out.matters.length <= 3);
  assert("matters ≥1", out.matters.length >= 1);
  assert("do primary exists", !!(out.do && out.do.primary));
  assert("do primary ≤16 words", Interpret.wordCount(out.do.primary) <= 16, out.do.primary);
  assert("traces present", out.traces.length > 0);
}

// Storm + alert → safety Do
{
  const platform = baseWx({
    conditions: { summary: "Thunderstorm" },
    temperature: 78,
    feelsLike: 80,
    wind: { speed: 20 }
  });
  platform.alerts.items = [
    { event: "Severe Thunderstorm Warning", severity: "Severe", headline: "Until 6pm" }
  ];
  const model = modelFrom(platform);
  const out = Interpret.synthesize({ model, flags: { now: DAY, storm: true } });
  assert("alert matters first", /Thunderstorm|alert|Storm/i.test(out.matters[0].text), out.matters[0].text);
  assert("safety do", /exposed travel looks poor|shelter|storms pass/i.test(out.do.primary), out.do.primary);
  assert("matters not padded past 2 on alert", out.matters.length <= 2);
}

// Rising water regex (rising ≠ rise substring bug)
{
  const platform = baseWx({ conditions: { summary: "Clear" }, cloudCover: 10 });
  platform.water.sites = [{ name: "Bush Kill", trend: "Rising", gageHeight: 6, distanceMi: 1 }];
  const model = modelFrom(platform);
  const out = Interpret.synthesize({ model, flags: { now: DAY } });
  assert(
    "rising water detected",
    out.signals.some((s) => s.kind === "flood" || s.id === "conflict-sky-water"),
    JSON.stringify(out.signals.map((s) => s.id))
  );
  assert("sky-water conflict do", /crossing|ford|high ground/i.test(out.do.primary), out.do.primary);
}

// AQI + excellent photo → conflict named
{
  const platform = baseWx({ conditions: { summary: "Clear" }, cloudCover: 15 });
  platform.airQuality = { status: "live", usAqi: 140, category: "Unhealthy for Sensitive Groups" };
  platform._photoStub = {
    status: "excellent",
    level: "excellent",
    summary: "Golden light",
    score: 5
  };
  const model = modelFrom(platform);
  // Force photography live on model
  model.photography = { live: true, level: "excellent", summary: "Golden light" };
  const out = Interpret.synthesize({
    model,
    flags: { now: DAY, excellentPhotography: true }
  });
  assert(
    "air-light conflict matter",
    out.matters.some((m) => /poor air|Good light/i.test(m.text)),
    out.matters.map((m) => m.text).join(" | ")
  );
  assert("conflict do prefers brief look", /brief outdoor look|photo session/i.test(out.do.primary), out.do.primary);
}

// Night labeling
{
  const platform = baseWx({ conditions: { summary: "Clear" }, cloudCover: 10, uvIndex: 0 });
  const model = modelFrom(platform);
  const out = Interpret.synthesize({ model, flags: { now: NIGHT } });
  assert("night happening", /night|clear night/i.test(out.happening.headline + " " + out.happening.support));
  assert("night best window tomorrow", /Tomorrow morning looks more promising/i.test(out.do.primary), out.do.primary);
  assert("night secondary quiet", /Tonight remains quiet/i.test(out.do.alternate || ""), out.do.alternate);
  assert("no UV matter at night", !out.matters.some((m) => /UV/i.test(m.text)));
}

// Uncertainty softens Do
{
  const platform = baseWx();
  platform.meta.fromCache = true;
  const model = modelFrom(platform);
  model.provider.fromCache = true;
  model.provider.trust = "cached";
  const out = Interpret.synthesize({
    model,
    flags: { now: DAY, lowForecastConfidence: true, providerConflict: true }
  });
  assert("high uncertainty", out.uncertainty.level === "high", out.uncertainty.level);
  assert(
    "do admits uncertainty",
    /If conditions hold|provisional|Based on/i.test(out.do.primary) ||
      out.matters.some((m) => /confidence|disagree|provisional/i.test(m.text)),
    out.do.primary + " // " + out.matters.map((m) => m.text).join(";")
  );
}

// Compose wires interpret
{
  const platform = baseWx({ conditions: { summary: "Fog" }, visibility: 0.5, cloudCover: 100 });
  const payload = sandbox.WDS.dashboardV2.buildPayload({
    platform,
    location: {
      city: "Milford",
      county: "Pike",
      stateCode: "PA",
      lat: 41.32,
      lng: -74.8,
      source: "browser"
    }
  });
  payload.flags = { now: DAY, fog: true };
  const view = Compose.compose(payload);
  assert("compose uses interpret intelligence", !!(view.intelligence && view.intelligence.traces));
  assert("compose fog character", /Fog/i.test(view.happening.headline), view.happening.headline);
  assert("compose fog do", /familiar|visibility/i.test(view.do.primary), view.do.primary);
}

// No fabricate when weather pending
{
  const platform = baseWx();
  platform.weatherRef.meta.isPlaceholder = true;
  const model = modelFrom(platform);
  model.weather.live = false;
  const out = Interpret.synthesize({ model, briefing: {}, flags: { now: DAY } });
  assert("pending happening honest", /Finding|conditions/i.test(out.happening.headline));
}

// ─── Owner closeout decisions ───

const BANNED = [/perfect/i, /amazing/i, /ideal/i, /you should definitely/i, /don['']t miss/i, /adventure/i];

function assertVoice(name, out) {
  const blob = [out.happening.headline, out.happening.support, ...(out.matters || []).map((m) => m.text), out.do.primary, out.do.alternate]
    .filter(Boolean)
    .join(" ");
  const hit = BANNED.find((re) => re.test(blob));
  assert(name + " voice clean", !hit, hit ? hit.toString() + " in " + blob : "");
  assert(
    name + " no provider names in triad",
    !/Open-?Meteo|NWS grid|WeatherKit|AccuWeather/i.test(blob),
    blob
  );
  assert(
    name + " happening ≤30 words",
    Interpret.wordCount(out.happening.headline) + Interpret.wordCount(out.happening.support) <= 30
  );
  assert(name + " matters ≤3", out.matters.length <= 3);
  const altCount = out.do.alternate ? 1 : 0;
  assert(name + " do 1 primary + ≤1 alt", !!out.do.primary && altCount <= 1);
}

// Photo not selected every calm day
{
  const platform = baseWx({
    conditions: { summary: "Sunny" },
    cloudCover: 10,
    temperature: 72,
    feelsLike: 72,
    uvIndex: 5,
    humidity: 45,
    wind: { speed: 5 }
  });
  const model = modelFrom(platform);
  model.photography = { live: true, level: "good", summary: "Bright clear light" };
  const out = Interpret.synthesize({ model, flags: { now: DAY } });
  assert("calm day not photo primary", !/photograp/i.test(out.do.primary), out.do.primary);
  assert("calm day prefers walk", /walk|window|conditions favor/i.test(out.do.primary), out.do.primary);
  assertVoice("calm", out);
}

// Exceptional photography still selected when notable
{
  const platform = baseWx({
    conditions: { summary: "Partly cloudy" },
    cloudCover: 55,
    temperature: 62,
    feelsLike: 62,
    uvIndex: 4,
    humidity: 60,
    wind: { speed: 5 }
  });
  const model = modelFrom(platform);
  model.photography = { live: true, level: "excellent", summary: "Soft directional light" };
  const out = Interpret.synthesize({
    model,
    flags: { now: DAY, excellentPhotography: true }
  });
  assert("notable photo selected", /photograp/i.test(out.do.primary), out.do.primary);
  assertVoice("photo-excellent", out);
}

// Flood Watch precautionary language
{
  const platform = baseWx({ conditions: { summary: "Mostly cloudy" }, cloudCover: 55 });
  platform.alerts.items = [
    { event: "Flood Watch", severity: "Moderate", headline: "Flood Watch for low-lying areas" }
  ];
  platform.water.sites = [{ name: "Creek", trend: "Rising", gageHeight: 6, distanceMi: 2 }];
  const model = modelFrom(platform);
  const out = Interpret.synthesize({ model, flags: { now: DAY, floodWatch: true } });
  assert(
    "flood watch precautionary do",
    /low crossings|local updates|streams/i.test(out.do.primary),
    out.do.primary
  );
  assert(
    "flood watch not stay-home",
    !/stay home|don['']t go outside|flooding occurring|dangerous everywhere/i.test(
      out.do.primary + " " + out.happening.support
    ),
    out.do.primary
  );
  assertVoice("flood-watch", out);
}

// Flood Warning escalates
{
  const platform = baseWx({ conditions: { summary: "Rain" }, cloudCover: 90 });
  platform.alerts.items = [
    { event: "Flood Warning", severity: "Severe", headline: "Flooding ongoing" }
  ];
  platform.water.sites = [{ name: "Creek", trend: "Above flood stage", gageHeight: 9, distanceMi: 1 }];
  const model = modelFrom(platform);
  const out = Interpret.synthesize({
    model,
    flags: { now: DAY, floodWarning: true, activeFlooding: true }
  });
  assert(
    "flood warning escalated do",
    /flooded roads|low crossings|remain unsafe/i.test(out.do.primary),
    out.do.primary
  );
  assertVoice("flood-warning", out);
}

// Derived dew-point not treated as observed
{
  const platform = baseWx({
    temperature: 86,
    feelsLike: 94,
    humidity: 88,
    cloudCover: 60,
    conditions: { summary: "Mostly cloudy" }
  });
  const model = modelFrom(platform);
  // no provider dewPoint
  const out = Interpret.synthesize({ model, flags: { now: DAY } });
  assert("dew derived meta", out.dewPointMeta && out.dewPointMeta.derived === true, JSON.stringify(out.dewPointMeta));
  const humidSig = out.signals.find((s) => s.kind === "humidity");
  assert("dew signal marked derived", humidSig && humidSig.inputs && humidSig.inputs.derived === true);
  assert("dew not observed flag", humidSig && humidSig.inputs.observed === false);
  const blob = [out.happening.headline, out.happening.support, ...out.matters.map((m) => m.text)].join(" ");
  assert("no observed dew claim", !/observed dew|dew point is \d/i.test(blob), blob);
}

// Provider dew preferred when present
{
  const platform = baseWx({ temperature: 80, humidity: 70 });
  platform.weatherRef.current.dewPoint = 68;
  const model = modelFrom(platform);
  const out = Interpret.synthesize({ model, flags: { now: DAY } });
  assert("provider dew not derived", out.dewPointMeta && out.dewPointMeta.derived === false, JSON.stringify(out.dewPointMeta));
  assert("provider dew source", out.dewPointMeta.source === "provider");
}

// Material conflicts → uncertainty language; no provider names
{
  const platform = baseWx({
    conditions: { summary: "Rain" },
    precipitation: { probability: 15 },
    cloudCover: 50
  });
  platform.weatherRef.hourly = [
    {
      time: new Date(new Date(DAY).getTime() + 3600000).toISOString(),
      temperature: 70,
      precipitation: { probability: 10 },
      wind: { speed: 5 },
      cloudCover: 30,
      uvIndex: 5
    }
  ];
  const model = modelFrom(platform);
  const out = Interpret.synthesize({
    model,
    flags: { now: DAY, providerConflict: true, lowForecastConfidence: true, materialConflict: true }
  });
  assert("material conflict uncertainty", out.uncertainty.level === "high" || out.uncertainty.materialConflict);
  const blob = [out.happening.support, ...out.matters.map((m) => m.text), out.do.primary].join(" ");
  assert(
    "material conflict language",
    /disagree|flexible|provisional|If conditions hold/i.test(blob),
    blob
  );
  assert("no provider names material", !/Open-?Meteo|NWS grid/i.test(blob), blob);
  assertVoice("material-conflict", out);
}

// Minor provider differences don’t clutter triad
{
  const platform = baseWx({ conditions: { summary: "Partly cloudy" }, cloudCover: 30, temperature: 71 });
  const model = modelFrom(platform);
  const out = Interpret.synthesize({
    model,
    flags: { now: DAY, minorProviderDifference: true }
  });
  assert(
    "minor diff no uncertainty matter",
    !out.matters.some((m) => /disagree|Sources disagree|confidence is limited/i.test(m.text)),
    out.matters.map((m) => m.text).join(" | ")
  );
  assert("minor diff not high unc", out.uncertainty.level !== "high" || !out.uncertainty.materialConflict);
}

// Timing windows avoid unsupported precision
{
  const platform = baseWx({
    conditions: { summary: "Clear" },
    cloudCover: 5,
    temperature: 88,
    feelsLike: 92,
    uvIndex: 9
  });
  const model = modelFrom(platform);
  const out = Interpret.synthesize({
    model,
    activities: [{ id: "walk", label: "Walk", suitability: "good", bestWindow: "3:17 PM–4:42 PM" }],
    flags: { now: DAY }
  });
  assert(
    "no false precision clock range",
    !/\d{1,2}:\d{2}\s*[AP]M\s*[–-]\s*\d{1,2}:\d{2}/i.test(out.do.primary),
    out.do.primary
  );
  assert(
    "practical heat window",
    /early morning|after 4 PM|shade/i.test(out.do.primary),
    out.do.primary
  );
}

// Safety outranks attractive opportunity
{
  const platform = baseWx({
    conditions: { summary: "Thunderstorm" },
    cloudCover: 80,
    wind: { speed: 22 }
  });
  platform.alerts.items = [
    { event: "Severe Thunderstorm Warning", severity: "Severe", headline: "Damaging winds" }
  ];
  const model = modelFrom(platform);
  model.photography = { live: true, level: "excellent", summary: "Dramatic light" };
  const out = Interpret.synthesize({
    model,
    flags: { now: DAY, storm: true, excellentPhotography: true }
  });
  assert("safety over photo", /exposed travel looks poor|shelter|storms pass/i.test(out.do.primary), out.do.primary);
  assert("not photo when storm", !/photograp/i.test(out.do.primary), out.do.primary);
  assertVoice("safety-override", out);
}

// Stale dew skipped
{
  const platform = baseWx({ temperature: 80, humidity: 85 });
  platform.meta.fromCache = true;
  const model = modelFrom(platform);
  model.provider.fromCache = true;
  model.provider.trust = "cached";
  const out = Interpret.synthesize({ model, flags: { now: DAY, staleWeather: true } });
  assert(
    "stale dew skipped",
    out.dewPointMeta && (out.dewPointMeta.skipped === "stale" || out.dewPointF == null),
    JSON.stringify(out.dewPointMeta)
  );
}

console.log("\n" + passed + " passed, " + failures.length + " failed");
if (failures.length) {
  failures.forEach((f) => console.error(" -", f));
  process.exit(1);
}
