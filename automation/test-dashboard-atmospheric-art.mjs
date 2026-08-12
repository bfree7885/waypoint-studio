#!/usr/bin/env node
/**
 * Atmospheric art quality gate — cinematic landscapes, not oval placeholders.
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
const pass = (m) => console.log("PASS", m);
const fail = (m) => { console.error("FAIL", m); failed += 1; };
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const sandbox = { console, location: { pathname: "/apps/dashboard/" }, localStorage: { _d:{}, getItem(k){return this._d[k]??null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];} }, matchMedia(){return{matches:false};} };
sandbox.global = sandbox; sandbox.window = sandbox; sandbox.WDS = {};
vm.runInNewContext(read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-graphics.js"), sandbox);

const Gfx = sandbox.WDS.dashboardRebuildGraphics;
if (Gfx && /cinematic|instrument/.test(String(Gfx.version||""))) pass("graphics cinematic module");
else fail("missing cinematic graphics version");

function assertNoOvalCloudHero(html, label) {
  // Hero cloud art should use path d= masses; reject dense ellipse-only cloud banks
  const ellipses = (html.match(/<ellipse /g) || []).length;
  const paths = (html.match(/<path[\s>]/g) || []).length;
  const hasLand =
    html.includes("wdb-r-mesa") ||
    html.includes("wdb-r-winter") ||
    html.includes("wdb-r-horizon") ||
    html.includes("H20 V40 H48") ||
    paths >= 4;
  if (paths >= 3 && hasLand) pass(label + " uses path-based landscape layers");
  else fail(label + " lacks landscape path depth (paths=" + paths + ", ellipses=" + ellipses + ")");
  // cloudy/overcast should not be ONLY ellipses
  if (label.includes("cloudy") || label.includes("overcast")) {
    if (ellipses <= 2) pass(label + " not oval-cloud placeholders");
    else fail(label + " still ellipse-heavy (" + ellipses + ")");
  }
}

const skies = ["clear","partly","cloudy","rain","heavy-rain","storm","snow","fog","clear-night"];
skies.forEach((s) => {
  const html = Gfx.render({ kind: "sky", state: s });
  if (!html || !html.includes("wdb-r-widget__art")) { fail("sky " + s + " missing"); return; }
  if (!html.includes("data-illum")) { fail("sky " + s + " missing illum"); return; }
  assertNoOvalCloudHero(html, "sky:" + s);
});

// Distinct rain vs storm vs snow
const rain = Gfx.render({ kind: "sky", state: "rain" });
const storm = Gfx.render({ kind: "sky", state: "storm" });
const snow = Gfx.render({ kind: "sky", state: "snow" });
if (storm.includes("L98 54") || storm.includes("108 36")) pass("storm has lightning");
else fail("storm missing lightning");
if (rain.includes("stroke=\"#9eb8c8\"") || rain.includes("l-2.2")) pass("rain has streaks");
else fail("rain missing streaks");
if (snow.includes("M0-3.2v6.4") || snow.includes("translate(")) pass("snow has flakes");
else fail("snow missing flakes");

const aqi = Gfx.render({ kind: "aqi", value: 120 });
if (aqi.includes("wdb-r-depth") && aqi.includes("ellipse")) pass("Air valley/mountain with haze");
else fail("Air art missing landscape haze");

["sunrise","sunset","golden","blue-hour","day"].forEach((k) => {
  const html = Gfx.render({ kind: "sun", state: k });
  if (html && html.includes("wdb-r-widget__art") && (html.includes("wdb-r-horizon") || html.includes("wdb-r-light-bands"))) pass("Light scene " + k);
  else fail("Light scene weak: " + k);
});

const phases = ["new","waxing crescent","first quarter","waxing gibbous","full","waning gibbous","last quarter","waning crescent"];
const keys = new Set(phases.map((p) => Gfx.moonPhaseKey(p, 50)));
if (keys.size >= 7) pass("moon phase keys cover 8-phase set (" + keys.size + ")");
else fail("moon phase key coverage thin: " + [...keys]);
phases.forEach((p) => {
  const html = Gfx.render({ kind: "moon", value: 40, phase: p });
  if (html && html.includes("wdb-r-widget__art--moon")) pass("moon art " + p);
  else fail("moon art missing " + p);
});
const full = Gfx.render({ kind: "moon", value: 100, phase: "full" });
const crescent = Gfx.render({ kind: "moon", value: 20, phase: "waxing crescent" });
if (full !== crescent && crescent.includes("mask")) pass("moon geometry differs full vs crescent (mask)");
else if (full !== crescent) pass("moon geometry differs full vs crescent");
else fail("moon full/crescent identical");

const alertQ = Gfx.render({ kind: "alert", active: false });
const alertA = Gfx.render({ kind: "alert", active: true });
if (alertQ.includes('data-illum="quiet"') && alertA.includes('data-illum="alert"')) pass("alerts state-honest");
else fail("alerts not state-honest");
if (!alertQ.includes("108 36") && alertA.includes("108 36")) pass("lightning only when alert active");
else if (alertA.includes("L98 54") && !alertQ.includes("L98 54")) pass("lightning only when alert active");
else fail("alerts lightning honesty failed");

const css = read("design-system/css/wds-dashboard-rebuild.css");
if (css.includes("--wdb-r-glow-weather") && (css.includes("0 0 22px") || css.includes("0 0 16px")) && css.includes("--wdb-r-glow-strength")) pass("atmospheric luminous edge system preserved");
else fail("neon edge system missing");
if (/customize-bar__columns[\s\S]*display:\s*none/.test(css) || css.includes(".wdb-r-customize-bar__columns")) pass("mobile column rules still present");
else fail("mobile column CSS missing");

/* Phase fraction drives waxing vs waning when label absent */
const waxKey = Gfx.moonPhaseKey(null, 28, 0.15);
const waneKey = Gfx.moonPhaseKey(null, 28, 0.85);
if (waxKey === "waxing-crescent" && waneKey === "waning-crescent") pass("phaseValue distinguishes waxing vs waning");
else fail("phaseValue moon key failed: " + waxKey + " / " + waneKey);
const geo28 = Gfx.moonGeometry("waxing-crescent", 28);
if (geo28 && Math.abs(geo28.lit - 0.28) < 0.001 && geo28.waxing) pass("illumination fraction drives lit amount");
else fail("moonGeometry illumination not applied");
const crescentHtml = Gfx.render({ kind: "moon", value: 28, phase: "waxing crescent", phaseValue: 0.15 });
if (crescentHtml.includes("#e8e4d8") && (crescentHtml.includes("#1a1618") || crescentHtml.includes("wdb-r-luna"))) pass("moon ivory-silver lit + faint dark limb");
else fail("moon field-guide palette missing");

if (failed) { console.error("\n" + failed + " failure(s)"); process.exit(1); }
console.log("\nAll atmospheric art quality gates passed.");
