#!/usr/bin/env node
/**
 * Dashboard data-layer validation — user coords must drive modules; engine is metadata only.
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

const harness = `
global.window = global;
global.navigator = { geolocation: null };
global.localStorage = { _data: {}, getItem(k){return this._data[k]||null}, setItem(k,v){this._data[k]=v}, removeItem(k){delete this._data[k]} };
global.document = { dispatchEvent(){}, getElementById(){ return null; } };
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = ${JSON.stringify(ROOT)};
function load(file) {
  const code = fs.readFileSync(path.join(root, file), 'utf8');
  vm.runInThisContext(code, { filename: file });
}
load('design-system/js/wds-us-states.js');
load('design-system/js/dashboard/wds-us-national-context.js');
load('design-system/js/weather/wds-daylight-utils.js');
load('design-system/js/outdoor-intelligence/wds-live-engine-feed.js');

const feed = JSON.parse(fs.readFileSync(path.join(root, 'data/live.json'), 'utf8'));
const health = JSON.parse(fs.readFileSync(path.join(root, 'data/health.json'), 'utf8'));
const engineCtx = WDS.liveEngine.toEngineContext(feed, health);

const userLoc = { lat: 41.527, lng: -74.236, source: 'geo', displayTitle: 'Montgomery, NY' };
const userPlatform = {
  meta: { hydratedAt: new Date().toISOString(), contentSource: 'user-oip' },
  location: { latitude: 41.527, longitude: -74.236, source: 'geo' },
  weatherRef: {
    meta: { provider: 'open-meteo', lat: 41.527, lng: -74.236, isPlaceholder: false },
    current: { temperature: { value: 72, unit: '°F' }, conditions: { summary: 'Partly cloudy' } }
  },
  weather: { status: 'live', conditions: 'Partly cloudy' },
  alerts: { status: 'live', count: 0, items: [] },
  airQuality: { status: 'live', usAqi: 42, category: 'Good' },
  usgsWater: { nearest: { siteName: 'Wallkill at Montgomery', distanceKm: 8.2, stageFt: 3.1 } },
  daylight: { status: 'live', sunriseFormatted: '5:42 AM', sunsetFormatted: '8:31 PM' }
};

const merged = WDS.liveEngine.mergeEngineContext(userPlatform, engineCtx, userLoc);
let failed = 0;

function assert(name, ok, detail) {
  if (!ok) { failed++; console.log('FAIL', name, detail || ''); }
  else console.log('PASS', name);
}

assert('user coords preserved on platform',
  merged.location.latitude === 41.527 && merged.location.longitude === -74.236);
assert('weather coords match user not engine',
  merged.weatherRef.meta.lat === 41.527 && merged.weatherRef.meta.lng === -74.236 &&
  merged.weatherRef.meta.lat !== feed.location.lat);
assert('engine context attached as metadata',
  merged.engineContext && merged.engineContext.engine && merged.engineContext.health);
assert('content source is user-oip not live feed',
  merged.meta.contentSource === 'user-oip' && merged.meta.liveFeed === false);
assert('module sources label user paths',
  merged.meta.moduleSources.weather.indexOf('user') >= 0 &&
  merged.meta.moduleSources.usgsWater.indexOf('user') >= 0);
assert('engine publish location stored separately',
  merged.meta.enginePublishLocation && merged.meta.enginePublishLocation.lat === feed.location.lat);
assert('engine context has no weather payload',
  !merged.engineContext.weather && !merged.engineContext.weatherRef);
assert('toEngineContext excludes module values',
  !engineCtx.weather && !engineCtx.usgsWater && engineCtx.health.overall);

process.exit(failed > 0 ? 1 : 0);
`;

const result = spawnSync(process.execPath, ["-e", harness], { encoding: "utf8", cwd: ROOT });
console.log(result.stdout);
if (result.stderr) console.error(result.stderr);

check("dashboard data harness", result.status === 0, result.status === 0 ? "" : "exit " + result.status);

if (issues.length) {
  console.error("\nDASHBOARD DATA VALIDATION FAILED");
  process.exit(1);
}
console.log("\nDASHBOARD DATA VALIDATION: PASS");
