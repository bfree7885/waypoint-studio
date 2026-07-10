#!/usr/bin/env node
/**
 * Photo Coach MVP validation — loader, history, critique model.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PC = path.join(ROOT, "apps", "photo-coach", "js");

const issues = [];

function check(name, ok, detail) {
  if (!ok) issues.push(name + (detail ? ": " + detail : ""));
  console.log((ok ? "PASS" : "FAIL") + " " + name + (detail ? " — " + detail : ""));
}

function load(file) {
  return fs.readFileSync(path.join(PC, file), "utf8");
}

function runHarness(code) {
  return spawnSync(process.execPath, ["-e", code], {
    encoding: "utf8",
    cwd: ROOT,
    env: Object.assign({}, process.env)
  });
}

const required = [
  "pc-critique-model.js",
  "pc-image-loader.js",
  "pc-image-metadata.js",
  "pc-pixel-sampler.js",
  "pc-analysis-engine.js",
  "pc-history-store.js",
  "pc-critique-renderer.js",
  "pc-app.js",
  "pc-boot.js"
];

required.forEach(function (f) {
  check("module exists: " + f, fs.existsSync(path.join(PC, f)));
});

check("index loads MVP modules only", (function () {
  var html = fs.readFileSync(path.join(ROOT, "apps", "photo-coach", "index.html"), "utf8");
  return html.includes("pc-app.js") && !html.includes("photo-coach-app.js") && !html.includes("wds-platform.js");
})());

check("no dashboard boot dependency", !load("pc-boot.js").includes("WDS.appBoot"));

const loaderHarness = `
global.window = global;
const fs = require('fs');
const vm = require('vm');
const root = ${JSON.stringify(path.join(ROOT, "apps", "photo-coach", "js"))};
function load(f) { vm.runInThisContext(fs.readFileSync(root + '/' + f, 'utf8'), { filename: f }); }
load('pc-image-loader.js');
const bad = PhotoCoachImageLoader.validateFile({ type: 'image/gif', name: 'x.gif', size: 100 });
const ok = PhotoCoachImageLoader.validateFile({ type: 'image/jpeg', name: 'a.jpg', size: 1000 });
const png = PhotoCoachImageLoader.validateFile({ type: 'image/png', name: 'b.png', size: 1000 });
const big = PhotoCoachImageLoader.validateFile({ type: 'image/png', name: 'b.png', size: 30 * 1024 * 1024 });
if (bad.ok || ok.ok !== true || png.ok !== true || big.ok !== false) { console.log('FAIL'); process.exit(1); }
console.log('PASS');
`;

const modelHarness = `
global.window = global;
const fs = require('fs');
const vm = require('vm');
const root = ${JSON.stringify(path.join(ROOT, "apps", "photo-coach", "js"))};
function load(f) { vm.runInThisContext(fs.readFileSync(root + '/' + f, 'utf8'), { filename: f }); }
load('pc-critique-model.js');
load('pc-pixel-sampler.js');
load('pc-analysis-engine.js');
const c = PhotoCoachCritiqueModel.emptyCritique();
if (!c.whatWorks || !c.suggestedEdits) { process.exit(1); }
const signals = {
  width: 4000, height: 3000, orientation: 'landscape', brightness: 120, contrast: 45,
  warmth: 0.12, coolness: 0.06, darkFraction: 0.15, brightFraction: 0.03,
  edgeDensity: 0.11, vignetteLeft: 0.04, vignetteRight: 0.04, skyBrightness: 0.3,
  dominantWarm: true, blurEstimate: 60, highlightClip: 0.02, shadowClip: 0.1, aspectRatio: 4/3
};
const score = PhotoCoachAnalysisEngine.scoreFromSignals(signals);
if (score < 45 || score > 92) { console.log('bad score', score); process.exit(1); }
console.log('PASS');
`;

const historyHarness = `
global.window = global;
global.localStorage = { _d: {}, getItem(k){return this._d[k]||null}, setItem(k,v){this._d[k]=v}, removeItem(k){delete this._d[k]} };
const fs = require('fs');
const vm = require('vm');
const root = ${JSON.stringify(path.join(ROOT, "apps", "photo-coach", "js"))};
function load(f) { vm.runInThisContext(fs.readFileSync(root + '/' + f, 'utf8'), { filename: f }); }
load('pc-critique-model.js');
load('pc-history-store.js');
const critique = PhotoCoachCritiqueModel.emptyCritique();
critique.id = 'test-1';
critique.filename = 'trail.jpg';
critique.score = 78;
critique.overallImpression = 'Test';
critique.whatWorks = [{ aspect: 'Light', text: 'Good' }];
PhotoCoachHistoryStore.save({ critique: critique, thumbnail: 'data:image/jpeg;base64,/9j/4AAQ' }).then(function(r) {
  const list = PhotoCoachHistoryStore.list();
  if (!list.length || list[0].id !== 'test-1') { process.exit(1); }
  const got = PhotoCoachHistoryStore.get('test-1');
  if (!got || got.critique.score !== 78) { process.exit(1); }
  console.log('PASS');
}).catch(function(e) { console.error(e); process.exit(1); });
`;

const loaderResult = runHarness(loaderHarness);
if (loaderResult.stdout) process.stdout.write(loaderResult.stdout);
check("file validation harness", loaderResult.status === 0, loaderResult.stderr && loaderResult.stderr.trim());

const modelResult = runHarness(modelHarness);
if (modelResult.stdout) process.stdout.write(modelResult.stdout);
check("critique model harness", modelResult.status === 0, modelResult.stderr && modelResult.stderr.trim());

const historyResult = runHarness(historyHarness);
if (historyResult.stdout) process.stdout.write(historyResult.stdout);
check("history store harness", historyResult.status === 0, historyResult.stderr && historyResult.stderr.trim());

if (issues.length) {
  console.error("\\nPHOTO COACH VALIDATION FAILED");
  process.exit(1);
}
console.log("\\nPHOTO COACH VALIDATION: PASS");
