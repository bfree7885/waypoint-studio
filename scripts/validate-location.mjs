#!/usr/bin/env node
/**
 * Location pipeline validation — coordinate-primary labeling, no false county assignment.
 */
import { pathToFileURL } from "url";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const issues = [];

function check(name, ok, detail) {
  if (!ok) issues.push(`${name}: ${detail}`);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

function loadLocationModule() {
  global.window = global;
  global.navigator = { geolocation: null };
  global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = v; },
    removeItem(k) { delete this._data[k]; }
  };
  global.document = {
    dispatchEvent: () => {},
    getElementById: () => null
  };
  return import(pathToFileURL(path.join(ROOT, "design-system/js/wds-us-states.js")).href)
    .then(() => import(pathToFileURL(path.join(ROOT, "design-system/js/dashboard/wds-us-national-context.js")).href))
    .then(() => import(pathToFileURL(path.join(ROOT, "design-system/content-engine/regions-index.json"), { assert: { type: "json" } }).href))
    .then(async (indexMod) => {
      const index = indexMod.default;
      await import(pathToFileURL(path.join(ROOT, "design-system/js/wds-location.js")).href);
      return { WDS: global.WDS, index };
    });
}

// Simpler approach: use node with vm or just test logic inline
// Actually wds-location is IIFE not ES module - need to read and eval or use puppeteer
// Use subprocess with minimal harness file

import { spawnSync } from "child_process";

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
const index = JSON.parse(fs.readFileSync(path.join(root, 'design-system/content-engine/regions-index.json'), 'utf8'));

const cases = [
  { name: 'Bar Harbor ME', lat: 44.3876, lng: -68.2039, state: 'ME' },
  { name: 'Miami FL', lat: 25.7617, lng: -80.1918, state: 'FL' },
  { name: 'Denver CO', lat: 39.7392, lng: -104.9903, state: 'CO' },
  { name: 'Burlington VT', lat: 44.4759, lng: -73.2121, state: 'VT' },
  { name: 'Milford PA', lat: 41.3223, lng: -74.8024, state: 'PA' }
];

let failed = 0;
for (const c of cases) {
  const state = WDS.location.buildStateFromCoords(c.lat, c.lng, index, { source: 'geo' });
  const wrongCounty = state.name && state.useNationalFallback && state.name.indexOf('County') >= 0;
  const ok = state.lat === c.lat && state.lng === c.lng && !wrongCounty && state.source === 'geo';
  if (!ok) {
    failed++;
    console.log('FAIL', c.name, JSON.stringify({ name: state.name, displayTitle: state.displayTitle, national: state.useNationalFallback }));
  } else {
    console.log('PASS', c.name, state.displayTitle || state.stateCode);
  }
}

const pike = WDS.location.buildStateFromCoords(41.3312, -75.038, index, { source: 'geo' });
const pikeOk = pike.contentMode === 'local-bundle' || !pike.useNationalFallback;
console.log(pikeOk ? 'PASS Pike local bundle eligible' : 'FAIL Pike local bundle');

const legacy = { source: 'default', isDefault: true, regionId: 'pike-county-pa', lat: 41.3312, lng: -75.038 };
console.log(WDS.location.isLegacyDefault(legacy) ? 'PASS legacy default detection' : 'FAIL legacy default');

process.exit(failed > 0 || !pikeOk ? 1 : 0);
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
