#!/usr/bin/env node
/**
 * Kiosk module regression tests — normalization, partial failure, schema compatibility.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import vm from "vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const failures = [];

function fail(name, detail) {
  failures.push(name + ": " + detail);
  console.log("FAIL", name, "—", detail);
}

function pass(name) {
  console.log("PASS", name);
}

function load(file) {
  const code = fs.readFileSync(path.join(ROOT, file), "utf8");
  vm.runInThisContext(code, { filename: file });
}

function makePlatform(overrides) {
  return Object.assign({
    meta: { blockStatus: {}, isPlaceholder: false },
    timezone: "America/New_York",
    weatherRef: {
      meta: { provider: "open-meteo", timezone: "America/New_York", isPlaceholder: false },
      current: {
        temperature: { value: 72, unit: "°F" },
        feelsLike: { value: 70, unit: "°F" },
        humidity: { value: 55, unit: "%" },
        cloudCover: { value: 0, unit: "%" },
        uvIndex: { value: 0 },
        conditions: { summary: "Clear sky" },
        wind: { speed: { value: 0, unit: "mph" }, gust: { value: 0, unit: "mph" } }
      },
      daily: [{
        temperatureHigh: { value: 80, unit: "°F" },
        temperatureLow: { value: 58, unit: "°F" },
        precipitation: { probability: 0 },
        conditions: { summary: "Sunny" }
      }],
      hourly: [
        { time: "2026-07-10T13:00", temperature: { value: 72 }, conditions: { summary: "Clear" } }
      ]
    },
    daylight: {
      sunriseFormatted: "5:30 AM",
      sunsetFormatted: "8:30 PM",
      moonPhase: "Waxing crescent",
      moonIllumination: 12,
      timezone: "America/New_York"
    },
    airQuality: { status: "live", aqi: 42, category: "Good", pm25: 6.1 },
    alerts: { status: "empty", items: [], count: 0 },
    usgsWater: {
      status: "live",
      nearest: { siteName: "Test Creek", stageFt: 2.1, dischargeCfs: 100 }
    }
  }, overrides || {});
}

function run() {
  global.window = global;
  global.WDS = {};
  load("js/kiosk-normalize.js");
  const N = global.WDS.kioskNormalize;

  const denverLoc = { lat: 39.74, lng: -104.99, source: "geo", displayTitle: "Denver, CO" };
  const kansasLoc = { lat: 39.8283, lng: -98.5795, source: "geo" };
  const pikeLoc = { lat: 41.3312, lng: -75.038, source: "geo", displayTitle: "Pike County, PA" };

  const denver = N.normalizePlatform(makePlatform(), denverLoc);
  if (/Pike|Kansas|39\.83/.test(denver.location.label || "")) {
    fail("visitor-location", "Denver visitor shows Pike/Kansas label");
  } else {
    pass("visitor-location");
  }

  if (denver.modules.weather.current.temperatureF !== 72) {
    fail("core-weather", "temperature not normalized");
  } else {
    pass("core-weather");
  }

  if (denver.modules.weather.forecast.highF !== 80 || denver.modules.weather.forecast.lowF !== 58) {
    fail("daily-schema", "temperatureHigh/Low not mapped — high=" + denver.modules.weather.forecast.highF);
  } else {
    pass("daily-schema");
  }

  if (denver.modules.airQuality.usAqi !== 42) {
    fail("aqi-schema", "aqi field not mapped to usAqi");
  } else {
    pass("aqi-schema");
  }

  if (denver.modules.alerts.status !== "empty") {
    fail("alerts-empty", "empty alerts should remain empty");
  } else {
    pass("alerts-empty");
  }

  const zeroPlatform = makePlatform({
    weatherRef: {
      meta: { isPlaceholder: false, timezone: "America/New_York" },
      current: {
        temperature: { value: 70 },
        cloudCover: { value: 0 },
        uvIndex: { value: 0 },
        conditions: { summary: "Clear" },
        wind: { speed: { value: 0 }, gust: { value: 0 } }
      },
      daily: [{ temperatureHigh: { value: 75 }, temperatureLow: { value: 50 }, precipitation: { probability: 0 } }],
      hourly: []
    },
    airQuality: { status: "live", aqi: 0, category: "Good" }
  });
  const zero = N.normalizePlatform(zeroPlatform, denverLoc);
  if (zero.modules.weather.current.cloudCover !== 0 || zero.modules.weather.current.uvIndex !== 0) {
    fail("zero-values", "zero cloud/uv treated as missing");
  } else if (zero.modules.weather.forecast.precipProbability !== 0) {
    fail("zero-values", "zero precip treated as missing");
  } else {
    pass("zero-values");
  }

  const partial = N.normalizePlatform(makePlatform({
    weatherRef: null,
    weather: { status: "unavailable" },
    usgsWater: { status: "live", nearest: { siteName: "River A", stageFt: 3 } }
  }), pikeLoc);
  if (!N.moduleReady(partial.modules.usgsWater, "usgsWater")) {
    fail("partial-failure", "river should be ready when weather missing");
  } else if (N.moduleReady(partial.modules.weather, "weather")) {
    fail("partial-failure", "weather should not be ready");
  } else {
    pass("partial-failure");
  }

  const engineWx = makePlatform({
    weatherRef: {
      meta: {
        provider: "waypoint-live-engine",
        lat: 39.8283,
        lng: -98.5795,
        isPlaceholder: false,
        liveFeed: true
      },
      current: { temperature: { value: 60 }, conditions: { summary: "Kansas engine" } },
      daily: [],
      hourly: []
    }
  });
  const rejected = N.normalizePlatform(engineWx, denverLoc);
  if (rejected.modules.weather.status === "live" && rejected.modules.weather.current) {
    fail("engine-weather-reject", "engine Kansas weather should not surface for Denver visitor");
  } else {
    pass("engine-weather-reject");
  }

  const liveFixture = path.join(ROOT, "data", "live.json");
  if (fs.existsSync(liveFixture)) {
    const live = JSON.parse(fs.readFileSync(liveFixture, "utf8"));
    if (live.location && Math.abs(live.location.lat - 39.8283) < 0.01) {
      pass("live-json-engine-point");
    }
    const fromEngine = N.normalizePlatform({
      meta: { contentMode: "live-engine", liveFeed: true },
      weatherRef: null
    }, denverLoc);
    if (fromEngine.modules.weather.status === "live") {
      fail("production-asset-compat", "live-engine platform without weatherRef must not show live weather");
    } else {
      pass("production-asset-compat");
    }
  }

  const tz = N.normalizePlatform(makePlatform(), { lat: 40.7, lng: -74, timezone: "America/New_York", source: "geo" });
  if (tz.modules.weather.timezone !== "America/New_York") {
    fail("timezone", "weather timezone not preserved");
  } else {
    pass("timezone");
  }

  if (failures.length) {
    console.error("\nKIOSK MODULE TESTS: FAIL (" + failures.length + ")");
    failures.forEach((f) => console.error("  -", f));
    process.exit(1);
  }
  console.log("\nKIOSK MODULE TESTS: PASS");
}

run();
