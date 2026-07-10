#!/usr/bin/env node
/**
 * Location-sensitive regression tests — daylight, rivers, context validation.
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const issues = [];

function check(name, ok, detail) {
  if (!ok) issues.push(`${name}: ${detail}`);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

function runHarness(env, code) {
  return spawnSync(process.execPath, ["-e", code], {
    encoding: "utf8",
    cwd: ROOT,
    env: Object.assign({}, process.env, env)
  });
}

const daylightHarness = `
global.window = global;
const fs = require('fs');
const vm = require('vm');
const root = ${JSON.stringify(ROOT)};
function load(file) {
  vm.runInThisContext(fs.readFileSync(root + '/' + file, 'utf8'), { filename: file });
}
load('design-system/js/wds-location-context.js');
load('design-system/js/weather/wds-daylight-utils.js');

let failed = 0;
function assert(name, ok, detail) {
  if (!ok) { failed++; console.log('FAIL', name, detail || ''); }
  else console.log('PASS', name);
}

const tz = 'America/New_York';
const sunrise = '2026-07-09T05:34';
const sunset = '2026-07-09T20:33';
const weatherPkg = {
  meta: { provider: 'open-meteo', lat: 41.527, lng: -74.236, timezone: tz, isPlaceholder: false },
  current: { sunrise, sunset },
  daily: [{ sunrise, sunset, moonPhase: 0.74 }]
};

WDS.locationContext.setActive({ lat: 41.527, lng: -74.236, source: 'geo' }, tz);
const dl = WDS.daylightUtils.enrichFromWeather(weatherPkg, {});

function parseHour12(label) {
  var m = String(label || '').match(/^(\\d{1,2}):(\\d{2})\\s*(AM|PM)$/i);
  if (!m) return null;
  var h = Number(m[1]) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return h + Number(m[2]) / 60;
}

var riseH = parseHour12(dl.sunriseFormatted);
var setH = parseHour12(dl.sunsetFormatted);
assert('Montgomery NY sunrise between 5-6 AM local', riseH >= 5 && riseH <= 6, dl.sunriseFormatted);
assert('Montgomery NY sunset between 8-9 PM local', setH >= 20 && setH <= 21, dl.sunsetFormatted);
assert('never shows 1:34 AM regression', dl.sunriseFormatted !== '1:34 AM');
assert('never shows 4:33 PM regression', dl.sunsetFormatted !== '4:33 PM');
assert('daylight stores raw timestamps', dl.rawSunrise === sunrise && dl.rawSunset === sunset);
assert('daylight stores IANA timezone', dl.timezone === tz);
assert('daylight has location context id', !!dl.locationContextId);

process.exit(failed > 0 ? 1 : 0);
`;

const utcResult = runHarness({ TZ: "UTC" }, daylightHarness);
console.log(utcResult.stdout);
if (utcResult.stderr) console.error(utcResult.stderr);
check("daylight UTC environment harness", utcResult.status === 0);

const riverHarness = `
global.window = global;
const fs = require('fs');
const vm = require('vm');
const root = ${JSON.stringify(ROOT)};
function load(file) {
  vm.runInThisContext(fs.readFileSync(root + '/' + file, 'utf8'), { filename: file });
}
load('design-system/js/wds-location-context.js');

let failed = 0;
function assert(name, ok, detail) {
  if (!ok) { failed++; console.log('FAIL', name, detail || ''); }
  else console.log('PASS', name);
}

WDS.locationContext.setActive({ lat: 41.33, lng: -75.03, source: 'manual' }, 'America/New_York');
var ctx = WDS.locationContext.getActive();
var kansasGauge = {
  nearest: {
    siteName: 'WHITE ROCK C NR BURR OAK, KS',
    lat: 39.89918,
    lng: -98.2503276,
    distanceKm: 29.2,
    stageFt: 1.25
  },
  status: 'live',
  requestLat: 39.83,
  requestLng: -98.58,
  sourceClassification: 'user-oip',
  locationContextId: 'v3|39.83|-98.58|America/Chicago'
};
WDS.locationContext.attachModule('usgsWater', kansasGauge, ctx, {
  requestLat: 39.83,
  requestLng: -98.58,
  sourceClassification: 'user-oip'
});
var verdict = WDS.locationContext.validateUsgsWater(kansasGauge, ctx);
assert('Kansas gauge rejected for Pike County PA user', !verdict.eligible, verdict.reason);

var goodGauge = {
  nearest: {
    siteName: 'DELAWARE RIVER AT PORT JERVIS NY',
    lat: 41.375,
    lng: -74.694,
    distanceKm: 12.4,
    stageFt: 4.2
  },
  status: 'live',
  requestLat: 41.33,
  requestLng: -75.03,
  sourceClassification: 'user-oip'
};
WDS.locationContext.attachModule('usgsWater', goodGauge, ctx, {
  requestLat: 41.33,
  requestLng: -75.03,
  sourceClassification: 'user-oip'
});
var goodVerdict = WDS.locationContext.validateUsgsWater(goodGauge, ctx);
assert('local gauge accepted for Pike County PA user', goodVerdict.eligible, goodVerdict.reason);

process.exit(failed > 0 ? 1 : 0);
`;

const riverResult = runHarness({}, riverHarness);
console.log(riverResult.stdout);
if (riverResult.stderr) console.error(riverResult.stderr);
check("river context validation harness", riverResult.status === 0);

const resolveHarness = `
global.window = global;
global.navigator = { geolocation: null };
global.localStorage = { _data: {}, getItem(){return null}, setItem(){}, removeItem(){} };
global.document = { dispatchEvent(){} };
const fs = require('fs');
const vm = require('vm');
const root = ${JSON.stringify(ROOT)};
function load(file) {
  vm.runInThisContext(fs.readFileSync(root + '/' + file, 'utf8'), { filename: file });
}
load('design-system/js/wds-us-states.js');
load('design-system/js/dashboard/wds-us-national-context.js');
load('design-system/js/weather/wds-daylight-utils.js');
load('design-system/js/weather/wds-weather-core.js');
load('design-system/js/weather/wds-weather-providers.js');
load('design-system/js/weather/wds-weather-service.js');

const coords = WDS.weather.resolveCoords({
  location: { lat: 41.527, lng: -74.236, source: 'geo' },
  intelligence: { coordinates: { latitude: 39.8283, longitude: -98.5795 } }
});
if (!coords || coords.lat !== 41.527 || coords.lng !== -74.236) {
  console.log('FAIL resolveCoords prefers user location over intelligence');
  process.exit(1);
}
console.log('PASS resolveCoords prefers user location over intelligence');
process.exit(0);
`;

const resolveResult = runHarness({}, resolveHarness);
console.log(resolveResult.stdout);
check("weather resolveCoords priority harness", resolveResult.status === 0);

if (issues.length) {
  console.error("\nLOCATION-SENSITIVE VALIDATION FAILED");
  process.exit(1);
}
console.log("\nLOCATION-SENSITIVE VALIDATION: PASS");
