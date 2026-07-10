#!/usr/bin/env node
/**
 * Cross-surface consistency — dashboard, kiosk, and Photo Coach must agree
 * on outdoor conditions for identical user coordinates.
 */
import { spawnSync } from "child_process";
import fs from "fs";
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
load('design-system/js/weather/wds-outdoor-weather-intel.js');
load('design-system/js/weather/wds-sky-dashboard-intel.js');
load('design-system/js/weather/wds-photography-conditions.js');

const COORDS = { lat: 41.527, lng: -74.236 };
const platform = {
  meta: {
    hydratedAt: '2026-07-09T20:30:00.000Z',
    contentSource: 'user-oip',
    moduleSources: {
      weather: 'open-meteo (user)',
      daylight: 'oip-derived (user)',
      airQuality: 'open-meteo-aq (user)'
    }
  },
  location: { latitude: COORDS.lat, longitude: COORDS.lng, source: 'geo' },
  weatherRef: {
    meta: {
      provider: 'open-meteo',
      lat: COORDS.lat,
      lng: COORDS.lng,
      timezone: 'America/New_York',
      isPlaceholder: false,
      dataCoordSource: 'user'
    },
    current: {
      temperature: { value: 72, unit: '°F' },
      feelsLike: { value: 70, unit: '°F' },
      humidity: { value: 58, unit: '%' },
      cloudCover: { value: 48, unit: '%' },
      visibility: { value: 10, unit: 'mi' },
      uvIndex: { value: 4 },
      conditions: { summary: 'Partly cloudy' },
      wind: { speed: { value: 6, unit: 'mph' }, direction: { value: 220, unit: 'deg' } }
    },
    daily: [{
      temperature: { max: { value: 78, unit: '°F' }, min: { value: 55, unit: '°F' } },
      precipitation: { probability: 20 },
      conditions: { summary: 'Partly cloudy' }
    }]
  },
  airQuality: { status: 'live', usAqi: 42, category: 'Good' },
  daylight: {
    status: 'live',
    sunriseFormatted: '5:42 AM',
    sunsetFormatted: '8:31 PM',
    goldenHour: '6:15–7:00 PM',
    blueHour: '8:31–9:05 PM',
    moonPhase: 'Waxing gibbous',
    moonIllumination: 74,
    timezone: 'America/New_York'
  }
};

let failed = 0;
function assert(name, ok, detail) {
  if (!ok) { failed++; console.log('FAIL', name, detail || ''); }
  else console.log('PASS', name);
}

const canonical = WDS.photographyConditions.fromPlatform(platform);
const intel = WDS.outdoorWeatherIntel.analyze(platform.weatherRef, platform);
const intelScore = intel && intel.scores && intel.scores.photography ? intel.scores.photography.value : null;

assert('canonical photography source is user-oip', canonical.source === 'user-oip');
assert('canonical score matches outdoor weather intel',
  canonical.score === intelScore, 'canonical=' + canonical.score + ' intel=' + intelScore);
assert('photography inputs use user coordinates',
  canonical.inputs.lat === COORDS.lat && canonical.inputs.lng === COORDS.lng);
assert('photography inputs include weather factors',
  canonical.inputs.cloudCover === 48 &&
  canonical.inputs.conditions === 'Partly cloudy' &&
  canonical.inputs.usAqi === 42);
assert('photography inputs include daylight factors',
  canonical.inputs.goldenHour === '6:15–7:00 PM' &&
  canonical.inputs.sunrise === '5:42 AM' &&
  canonical.inputs.moonPhase === 'Waxing gibbous');
assert('module source recorded', canonical.moduleSource === 'open-meteo');

const kioskPhoto = WDS.photographyConditions.fromPlatform(platform);
const photoCoachPhoto = WDS.photographyConditions.fromPlatform(platform);
assert('kiosk photography matches canonical', kioskPhoto.score === canonical.score);
assert('photo coach photography matches canonical', photoCoachPhoto.score === canonical.score);
assert('all surfaces share summary', kioskPhoto.summary === photoCoachPhoto.summary);

const sky = WDS.skyDashboardIntel.analyze(platform.weatherRef, platform);
assert('sky intel available for photography context', !!(sky && sky.cloudCover && sky.sunsetQuality));

process.exit(failed > 0 ? 1 : 0);
`;

const result = spawnSync(process.execPath, ["-e", harness], { encoding: "utf8", cwd: ROOT });
console.log(result.stdout);
if (result.stderr) console.error(result.stderr);
check("surface consistency harness", result.status === 0, result.status === 0 ? "" : "exit " + result.status);

const photoCoachConditions = fs.readFileSync(
  path.join(ROOT, "apps/photo-coach/js/photo-coach-conditions.js"),
  "utf8"
);
check(
  "photo coach has no live.json photography fetch",
  !photoCoachConditions.includes("live.json") && !photoCoachConditions.includes("fetchLivePhotography"),
  "engine photography dependency removed"
);

const kioskBoot = fs.readFileSync(path.join(ROOT, "js/kiosk-boot.js"), "utf8");
check(
  "kiosk boot has no duplicate derivePhotography",
  !kioskBoot.includes("derivePhotography") && kioskBoot.includes("photographyConditions.fromPlatform"),
  "uses canonical photography module"
);

const kioskJs = fs.readFileSync(path.join(ROOT, "js/kiosk.js"), "utf8");
check(
  "kiosk render uses user photography not engine module",
  kioskJs.includes("userMods && userMods.photography") &&
    !kioskJs.includes('moduleData(live, "photography_conditions")'),
  "engine photography overlay removed"
);

if (issues.length) {
  console.error("\nSURFACE CONSISTENCY VALIDATION FAILED");
  process.exit(1);
}
console.log("\nSURFACE CONSISTENCY VALIDATION: PASS");
