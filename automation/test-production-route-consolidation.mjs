#!/usr/bin/env node
/**
 * Production route consolidation — regression suite.
 * Run: node automation/test-production-route-consolidation.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { spawn } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

let passed = 0;
const failures = [];

function assert(name, cond, detail) {
  if (cond) {
    passed += 1;
    console.log("PASS", name);
  } else {
    failures.push(name + (detail ? ": " + detail : ""));
    console.error("FAIL", name, detail || "");
  }
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const scenes = read("apps/scenes/index.html");
const legacy = read("apps/waypoint-scenes/index.html");
const root = read("index.html");
const dash = read("apps/dashboard/index.html");
const articles = read("articles/index.html");
const err404 = read("404.html");
const nav = read("design-system/js/platform/wds-app-nav-config.js");
const inject = read("scripts/inject-build-metadata.mjs");
const css = read("design-system/css/wds-dashboard-rebuild.css");
const coach = read("apps/photo-coach/index.html");

assert("canonical Scenes is interactive app", /data-product="scenes"/.test(scenes) && /id="mode-coach"/.test(scenes) && /id="mode-builder"/.test(scenes));
assert("canonical Scenes uses shared was-shell", /data-wds-app-shell/.test(scenes) && /wds-app-shell\.js/.test(scenes));
assert("canonical Scenes loads platform nav", /wds-app-nav\.js/.test(scenes) && /wds-app-nav-config\.js/.test(scenes));
assert("canonical Scenes has no marketing landing marker", !/data-scenes-page="landing"/.test(scenes));
assert("legacy Scenes is redirect only", /location\.replace/.test(legacy) && /\/apps\/scenes\//.test(legacy) && !/id="mode-coach"/.test(legacy));
assert("legacy redirect preserves query/hash", /location\.search/.test(legacy) && /location\.hash/.test(legacy));
assert(
  "no second interactive Scenes tree at legacy path",
  !exists("apps/waypoint-scenes/js/app.js") && !exists("apps/waypoint-scenes/css/main.css")
);
assert("global nav Scenes → apps/scenes/", /"id":\s*"scenes"[\s\S]*?"href":\s*"apps\/scenes\/"/.test(nav));
assert("global nav Home → apps/dashboard/", /"id":\s*"home"[\s\S]*?"href":\s*"apps\/dashboard\/"/.test(nav));
assert("brand homeRoute is dashboard", /"homeRoute":\s*"apps\/dashboard\/"/.test(nav));
assert("Photo Coach loads shared assets from apps/scenes", /src="\.\.\/scenes\/js\/photo-coach\.js"/.test(coach) && /href="\.\.\/scenes\/css\/photo-coach\.css"/.test(coach));
assert("Photo Coach no longer depends on waypoint-scenes paths", !/waypoint-scenes/.test(coach));
assert("root redirects to dashboard", /location\.replace/.test(root) && /\/apps\/dashboard\//.test(root) && !/wds-dashboard-rebuild\.css/.test(root));
assert("dashboard is canonical implementation", /wds-dashboard-rebuild\.css/.test(dash) && /canonical" href="https:\/\/waypointstudio\.org\/apps\/dashboard\/"/.test(dash));
assert("articles has waypoint-build meta", /name="waypoint-build"/.test(articles));
assert("404 has waypoint-build meta", /name="waypoint-build"/.test(err404));
assert("inject stamps articles", /"articles\/index\.html"/.test(inject));
assert("inject stamps 404", /"404\.html"/.test(inject));
assert("inject writes version.json", /writeVersionJson/.test(inject) && /version\.json/.test(inject));
assert("inject refuses CI without GITHUB_SHA", /GITHUB_SHA required in GitHub Actions/.test(inject));
assert("version.json exists after local inject", exists("version.json"));
const version = JSON.parse(read("version.json"));
assert("version.json has build fields", !!(version.buildSha && version.builtAt && version.environment));
assert("dashboard tiles no fixed 8.35rem min-height", !/min-height:\s*8\.35rem/.test(css));
assert("dashboard tiles no fixed 9.5rem / 10rem widget mins", !/\.wdb-r-widget--wide[\s\S]{0,80}min-height:\s*9\.5rem/.test(css) && !/\.wdb-r-widget--featured[\s\S]{0,80}min-height:\s*10rem/.test(css));
assert("dashboard widget body is content-driven", /\.wdb-r-widget__body\s*\{[\s\S]*?justify-content:\s*flex-start/.test(css));
assert("dashboard compact status rules present", /route-consolidation: compact status/.test(css));
assert("retired marketing landing preserved off-path", exists("apps/scenes/_retired-landing/index.html"));

async function fetchPath(port, urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: "127.0.0.1", port, path: urlPath }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.on("error", reject);
  });
}

async function liveChecks() {
  const port = 8765;
  const child = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], {
    cwd: ROOT,
    stdio: "ignore"
  });
  await new Promise((r) => setTimeout(r, 400));
  try {
    const scenesLive = await fetchPath(port, "/apps/scenes/");
    assert("live /apps/scenes/ returns 200", scenesLive.status === 200);
    assert("live /apps/scenes/ is interactive", /id="mode-coach"/.test(scenesLive.body) && /data-wds-app-shell/.test(scenesLive.body));
    assert("live /apps/scenes/ has no legacy marketing landing", !/data-scenes-page="landing"/.test(scenesLive.body));

    const legacyLive = await fetchPath(port, "/apps/waypoint-scenes/?from=test#coach");
    assert("live legacy Scenes serves redirect document", legacyLive.status === 200 && /location\.replace/.test(legacyLive.body));
    assert("live legacy redirect targets /apps/scenes/", /\/apps\/scenes\//.test(legacyLive.body));

    const rootLive = await fetchPath(port, "/");
    assert("live / serves dashboard redirect", rootLive.status === 200 && /\/apps\/dashboard\//.test(rootLive.body));

    const dashLive = await fetchPath(port, "/apps/dashboard/");
    assert("live /apps/dashboard/ serves rebuild", dashLive.status === 200 && /wds-dashboard-rebuild\.css/.test(dashLive.body));

    const shedsLive = await fetchPath(port, "/apps/shed-hunting/");
    assert("live sheds returns 200", shedsLive.status === 200);

    const articlesLive = await fetchPath(port, "/articles/");
    assert("live articles returns 200", articlesLive.status === 200 && /waypoint-build/.test(articlesLive.body));

    const versionLive = await fetchPath(port, "/version.json");
    assert("live /version.json returns 200", versionLive.status === 200);
    const v = JSON.parse(versionLive.body);
    assert("live version.json schema", !!(v.buildSha && v.builtAt && v.environment));

    const missing = await fetchPath(port, "/this-route-does-not-exist-consolidation");
    // python http.server returns 404 plain; site 404.html is for Pages
    assert("unknown route is not 200 interactive app", missing.status === 404 || !/id="mode-coach"/.test(missing.body));

    // Asset existence for Scenes
    for (const asset of [
      "/apps/scenes/css/main.css",
      "/apps/scenes/css/studio-shell.css",
      "/apps/scenes/js/app.js",
      "/apps/scenes/js/photo-coach.js",
      "/design-system/css/wds.css",
      "/design-system/js/platform/wds-app-shell.js"
    ]) {
      const res = await fetchPath(port, asset);
      assert("asset 200 " + asset, res.status === 200, "status=" + res.status);
    }
  } finally {
    child.kill("SIGTERM");
  }
}

await liveChecks();

console.log("");
console.log("Passed:", passed);
if (failures.length) {
  console.error("Failed:", failures.length);
  failures.forEach((f) => console.error(" -", f));
  process.exit(1);
}
console.log("All production route consolidation tests passed.");
