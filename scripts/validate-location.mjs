#!/usr/bin/env node
/**
 * Location pipeline validation — coordinate-primary labeling, no false county assignment.
 */
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

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
load('design-system/js/wds-location.js');
load('design-system/js/water/wds-usgs-water-service.js');
const index = JSON.parse(fs.readFileSync(path.join(root, 'design-system/content-engine/regions-index.json'), 'utf8'));

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const cases = [
  { name: 'Bar Harbor ME', lat: 44.3876, lng: -68.2039, state: 'ME' },
  { name: 'Miami FL', lat: 25.7617, lng: -80.1918, state: 'FL' },
  { name: 'Denver CO', lat: 39.7392, lng: -104.9903, state: 'CO' },
  { name: 'Burlington VT', lat: 44.4759, lng: -73.2121, state: 'VT' },
  { name: 'Milford PA', lat: 41.3223, lng: -74.8024, state: 'PA' },
  { name: 'Montgomery NY', lat: 41.527, lng: -74.236, state: 'NY', forbidNJ: true }
];

let failed = 0;
for (const c of cases) {
  const state = WDS.location.buildStateFromCoords(c.lat, c.lng, index, { source: 'geo' });
  const wrongCounty = state.name && state.useNationalFallback && state.name.indexOf('County') >= 0;
  const njLeak = c.forbidNJ && (
    state.stateCode === 'NJ' ||
    (state.name && /warren|middletown/i.test(state.name) && state.stateCode === 'NJ')
  );
  const ok = state.lat === c.lat && state.lng === c.lng && !wrongCounty && !njLeak && state.source === 'geo';
  if (!ok) {
    failed++;
    console.log('FAIL', c.name, JSON.stringify({
      name: state.name,
      stateCode: state.stateCode,
      displayTitle: state.displayTitle,
      national: state.useNationalFallback,
      nearest: state.nearestIndexedCounty,
      dist: state.distanceKm
    }));
  } else {
    console.log('PASS', c.name, state.stateCode, state.nearestIndexedCounty, state.distanceKm + 'km');
  }
}

const montgomery = WDS.location.buildStateFromCoords(41.527, -74.236, index, { source: 'geo' });
const montgomeryOk = montgomery.stateCode === 'NY' &&
  montgomery.nearestIndexedCounty === 'Orange County' &&
  montgomery.indexedRegionEligible === true;
console.log(montgomeryOk ? 'PASS Montgomery NY indexed to Orange County NY' : 'FAIL Montgomery NY county match');

const middletownNj = WDS.location.buildStateFromCoords(40.39, -74.11, index, { source: 'geo' });
const middletownOk = middletownNj.useNationalFallback === true && middletownNj.regionId === 'us-coords';
console.log(middletownOk ? 'PASS Middletown NJ area uses national coords mode' : 'FAIL Middletown NJ should not snap to indexed county');

const kansas = WDS.location.buildStateFromCoords(38.5, -98.5, index, { source: 'geo' });
const kansasOk = kansas.useNationalFallback === true && kansas.regionId === 'us-coords';
console.log(kansasOk ? 'PASS Kansas uses national coords mode' : 'FAIL Kansas should not use indexed county');

const staleNj = {
  source: 'geo',
  lat: 41.527,
  lng: -74.236,
  stateCode: 'NJ',
  regionId: 'warren-county-nj',
  placeLabel: 'Middletown Township, NJ',
  timestamp: Date.now()
};
const staleOk = WDS.location.isStaleOrInvalidCache(staleNj, index);
console.log(staleOk ? 'PASS stale NJ label at NY coords detected' : 'FAIL stale cache detection');

const pike = WDS.location.buildStateFromCoords(41.3312, -75.038, index, { source: 'geo' });
const pikeOk = pike.contentMode === 'local-bundle' || !pike.useNationalFallback;
console.log(pikeOk ? 'PASS Pike local bundle eligible' : 'FAIL Pike local bundle');

const legacy = { source: 'default', isDefault: true, regionId: 'pike-county-pa', lat: 41.3312, lng: -75.038 };
console.log(WDS.location.isLegacyDefault(legacy) ? 'PASS legacy default detection' : 'FAIL legacy default');

const enginePublish = { source: 'geo', lat: 39.8283, lng: -98.5795, timestamp: Date.now() };
console.log(WDS.location.isStaleOrInvalidCache(enginePublish, index)
  ? 'PASS engine publish cache rejected'
  : 'FAIL engine publish cache should be rejected');
console.log(WDS.location.isEnginePublishPoint(39.8283, -98.5795)
  ? 'PASS engine publish point detection'
  : 'FAIL engine publish point detection');

const maxKm = WDS.usgsWater.MAX_GAUGE_DISTANCE_KM;
const maxMiles = WDS.usgsWater.MAX_GAUGE_DISTANCE_MILES;
console.log(maxMiles === 50 && maxKm > 80 && maxKm < 81
  ? 'PASS USGS 50-mile gauge cap constant'
  : 'FAIL USGS gauge cap');

process.exit(failed > 0 || !pikeOk || !montgomeryOk || !middletownOk || !kansasOk || !staleOk ? 1 : 0);
`;

const result = spawnSync(process.execPath, ["-e", harness], { encoding: "utf8", cwd: ROOT });
console.log(result.stdout);
if (result.stderr) console.error(result.stderr);

check("location harness", result.status === 0, result.status === 0 ? "" : "exit " + result.status);

if (issues.length) {
  console.error("\nLOCATION VALIDATION FAILED");
  process.exit(1);
}
console.log("\nLOCATION VALIDATION: PASS");
