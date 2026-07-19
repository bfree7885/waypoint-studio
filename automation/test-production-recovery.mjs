#!/usr/bin/env node
/**
 * Production recovery sprint regressions — infrastructure reliability.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import vm from "vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const failures = [];

function assert(name, cond, detail) {
  if (cond) console.log("PASS", name);
  else {
    failures.push(name + ": " + (detail || ""));
    console.log("FAIL", name, "—", detail || "");
  }
}

function load(file) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, file), "utf8"), { filename: file });
}

global.window = global;
global.document = {
  readyState: "complete",
  documentElement: { dataset: {} },
  head: { appendChild() {} },
  body: { insertBefore() {} },
  addEventListener() {},
  createElement: () => ({ setAttribute() {}, style: {}, src: "" }),
  getElementById: () => null,
  querySelector: () => null
};
global.localStorage = {
  _s: {},
  getItem(k) {
    return this._s[k] || null;
  },
  setItem(k, v) {
    this._s[k] = String(v);
  },
  removeItem(k) {
    delete this._s[k];
  }
};
global.fetch = () => Promise.reject(new Error("no network in unit test"));

// Live engine URLs
const feedSrc = fs.readFileSync(
  path.join(ROOT, "design-system/js/outdoor-intelligence/wds-live-engine-feed.js"),
  "utf8"
);
assert("LIVE_URL site-root", /LIVE_URL\s*=\s*"\/data\/live\.json"/.test(feedSrc));
assert("HEALTH_URL site-root", /HEALTH_URL\s*=\s*"\/data\/health\.json"/.test(feedSrc));
assert("data files exist", fs.existsSync(path.join(ROOT, "data/live.json")));
assert("health file exists", fs.existsSync(path.join(ROOT, "data/health.json")));

// isFiniteCoord
load("design-system/js/outdoor-intelligence/wds-oip-model.js");
const isFiniteCoord = global.WDS.outdoorIntelligence.model.isFiniteCoord;
assert("isFiniteCoord exported", typeof isFiniteCoord === "function");
assert("isFiniteCoord null false", isFiniteCoord(null) === false);
assert("isFiniteCoord undefined false", isFiniteCoord(undefined) === false);
assert("isFiniteCoord '' false", isFiniteCoord("") === false);
assert("isFiniteCoord 0 true", isFiniteCoord(0) === true);
assert("isFiniteCoord 41.3 true", isFiniteCoord(41.3) === true);
assert("isFiniteCoord '41.3' true", isFiniteCoord("41.3") === true);

// NWS null / null-island guard
load("design-system/js/weather/wds-nws-alerts-service.js");
const nws = await global.WDS.nwsAlerts.fetchActive({ lat: null, lng: null });
assert("nws null coords unavailable", nws.status === "unavailable");
const nws0 = await global.WDS.nwsAlerts.fetchActive({ lat: 0, lng: 0 });
assert("nws null-island unavailable", nws0.status === "unavailable");

// routeHref + map redirect
load("design-system/js/platform/wds-platform-foundation.js");
assert("routeHref /map/ → map/", global.WDS.platformFoundation.routeHref("/map/") === "map/");
assert("map redirect page", fs.existsSync(path.join(ROOT, "map/index.html")));
const mapRedirect = fs.readFileSync(path.join(ROOT, "map/index.html"), "utf8");
assert("map redirects to sheds", /shed-hunting\/map/.test(mapRedirect));

// Boot assets tracked
assert(
  "platform-boot.js exists",
  fs.existsSync(path.join(ROOT, "design-system/js/platform/wds-platform-boot.js"))
);
assert(
  "platform-boot.css exists",
  fs.existsSync(path.join(ROOT, "design-system/css/wds-platform-boot.css"))
);
const wds = fs.readFileSync(path.join(ROOT, "design-system/js/wds.js"), "utf8");
assert("wds.js lists platform-boot", /wds-platform-boot\.js/.test(wds));
const css = fs.readFileSync(path.join(ROOT, "design-system/css/wds.css"), "utf8");
assert("wds.css imports boot css", /wds-platform-boot\.css/.test(css));

// Steepleaf syntax + catch
const stl = fs.readFileSync(
  path.join(ROOT, "design-system/js/steepleaf/wds-steepleaf-ui.js"),
  "utf8"
);
assert("steepleaf quote fix", /'<\/div><ul class="stl-list">'\s*\+/.test(stl));
assert("steepleaf explore catch", /mountExplore[\s\S]*?\.catch\(function/.test(stl));
assert("steepleaf entity catch", /mountEntity[\s\S]*?\.catch\(function/.test(stl));

// ForageCast region label guard
const fcLoc = fs.readFileSync(
  path.join(ROOT, "apps/foragecast/js/foragecast-location.js"),
  "utf8"
);
assert("foragecast formatRegionLabel", /function formatRegionLabel/.test(fcLoc));
assert("foragecast rejects null name", /\/\^null\$\/i/.test(fcLoc));

if (failures.length) {
  console.error("\n" + failures.length + " failure(s)");
  process.exit(1);
}
console.log("\nAll production recovery tests passed.");
