#!/usr/bin/env node
/**
 * Browser smoke — Live Trail Conditions widget with seeded Pike County location.
 */
import { readFileSync } from "fs";
import { spawn } from "child_process";
import http from "http";
import { setTimeout as delay } from "timers/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = process.argv[2] || "http://127.0.0.1:8080";
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const PORT = 9280;
const buildJs = readFileSync(path.join(ROOT, "design-system/js/wds-build.js"), "utf8");
const commitMatch = buildJs.match(/"commit":\s*"([^"]+)"/);
const COMMIT = commitMatch ? commitMatch[1] : "dev";

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

async function main() {
  const seedObj = {
    source: "manual",
    lat: 41.34,
    lng: -75.04,
    timestamp: Date.now(),
    regionId: "pike-county-pa",
    name: "Pike County",
    state: "Pennsylvania",
    stateCode: "PA",
    placeLabel: "Pike County, PA",
    displayTitle: "Pike County, PA",
    contentMode: "local-bundle"
  };
  const migrationState = {
    epoch: 3,
    build: COMMIT,
    loaderVersion: 2,
    locationSchema: 4,
    migratedAt: new Date().toISOString(),
    via: "test"
  };

  const proc = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-sandbox",
    "--remote-debugging-port=" + PORT, "about:blank"
  ], { stdio: "ignore" });
  await delay(2000);

  const tabs = await fetchJson("http://127.0.0.1:" + PORT + "/json/list");
  const wsUrl = tabs.find((t) => t.type === "page").webSocketDebuggerUrl;
  const WebSocket = (await import(path.join(ROOT, "node_modules/ws/index.js"))).default;
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.on("open", r));

  let id = 0;
  const pending = new Map();
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

  const origin = new URL(BASE).origin;

  const seedScript =
    "localStorage.removeItem('waypoint-dashboard-widgets-v4');" +
    "localStorage.removeItem('waypoint-dashboard-widgets-v1');" +
    "localStorage.removeItem('waypoint-dashboard-widgets-v2');" +
    "localStorage.removeItem('waypoint-dashboard-favorites-v1');" +
    "localStorage.setItem('wds-location-v3', " + JSON.stringify(JSON.stringify(seedObj)) + ");" +
    "localStorage.setItem('wds-location-prompted','1');" +
    "localStorage.setItem('waypoint-active-build'," + JSON.stringify(COMMIT) + ");" +
    "localStorage.setItem('waypoint-runtime-migration'," + JSON.stringify(JSON.stringify(migrationState)) + ");";

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Page.addScriptToEvaluateOnNewDocument", { source: seedScript });
  await send("Page.navigate", { url: BASE.replace(/\/$/, "") + "/" });
  await delay(90000);

  const { result: direct } = await send("Runtime.evaluate", {
    expression: `window.WDS.trailConditions.fetchNearby({lat:41.34,lng:-75.04}).then(function(r){
      return {status:r.status,count:r.trailCount,error:r.error,names:(r.trails||[]).slice(0,3).map(function(t){return t.name;})};
    })`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log("Direct fetch:", JSON.stringify(direct.value));

  const { result } = await send("Runtime.evaluate", {
    expression: `(() => {
      const pkg = window.WDS && WDS.outdoorIntelligence && WDS.outdoorIntelligence.getLast
        ? WDS.outdoorIntelligence.getLast() : null;
      const tc = pkg && pkg.trailConditions;
      const loc = window.WDS && WDS.location && WDS.location.getState
        ? WDS.location.getState() : null;
      return {
        locLat: loc && loc.lat,
        locSource: loc && loc.source,
        cacheUsed: loc && loc.cacheUsed,
        hydrated: !!(pkg && pkg.meta && pkg.meta.hydratedAt),
        trailStatus: tc && tc.status,
        trailCount: tc && tc.trailCount,
        dashSettings: (function () {
          var S = window.WDS && WDS.dashboardSettings;
          if (!S) return null;
          var s = S.load();
          return {
            trail: s.widgets && s.widgets["trail-dashboard"],
            enabled: S.enabledWidgets(s).map(function (d) { return d.id; }).filter(function (id) {
              return id.indexOf("trail") >= 0;
            })
          };
        })(),
        dashboardLen: (document.querySelector("#outdoor-dashboard") || {}).innerHTML
          ? document.querySelector("#outdoor-dashboard").innerHTML.length : 0,
        blockTrail: pkg && pkg.meta && pkg.meta.blockStatus && pkg.meta.blockStatus.trailConditions,
        trailNames: tc && tc.trails ? tc.trails.slice(0, 5).map(function (t) { return t.name; }) : [],
        trailError: tc && tc.error,
        domTrailCards: document.querySelectorAll(".wtrail-trail").length,
        hasLiveSection: !!document.querySelector(".wtrail-live"),
        widgetIds: Array.from(document.querySelectorAll("[data-widget-id]")).map(function (el) {
          return el.getAttribute("data-widget-id");
        }),
        articleCount: document.querySelectorAll("article.wdb-widget--trail-dashboard").length,
        trailWidgetTag: (function () {
          var el = document.querySelector("article.wdb-widget--trail-dashboard");
          if (!el) return "missing";
          var body = el.querySelector(".wdb-widget__body");
          var mount = el.querySelector("[data-wds-weather-mount]");
          return "article bodyLen=" + (body ? body.innerHTML.length : 0) + " mount=" + (mount ? mount.getAttribute("data-wds-weather-mount") : "none");
        })(),
        hasWtrail: !!document.querySelector('.wtrail'),
        wtrailLive: (document.querySelector('.wtrail-live') || {}).innerText,
        mountBusy: (function () {
          var el = document.querySelector("#widget-trail-dashboard [data-wds-weather-mount]");
          return el ? el.getAttribute("aria-busy") : "no-mount";
        })(),
        mountHtml: (function () {
          var el = document.querySelector("#widget-trail-dashboard [data-wds-weather-mount]");
          return el ? el.innerHTML.slice(0, 400) : (document.querySelector("#widget-trail-dashboard .wdb-widget__body") || {}).innerHTML;
        })(),
        localStorageRaw: localStorage.getItem("wds-location-v3"),
        migrationRaw: localStorage.getItem("waypoint-runtime-migration"),
        activeBuild: localStorage.getItem("waypoint-active-build"),
        buildCommit: window.__WAYPOINT_BUILD__ && window.__WAYPOINT_BUILD__.commit,
        diag: window.WDS && WDS.location && WDS.location.getDiagnostics
          ? WDS.location.getDiagnostics() : null
      };
    })()`,
    returnByValue: true
  });

  const v = result.value || {};
  console.log("mountBusy:", v.mountBusy);
  console.log("mountHtml:", v.mountHtml);
  console.log(JSON.stringify(v, null, 2));

  proc.kill("SIGTERM");
  ws.close();

  const ok = v.hydrated && v.domTrailCards > 0 && v.hasLiveSection &&
    (v.trailStatus === "live" || v.blockTrail === "live");
  if (!ok) {
    console.error("\nTRAIL BROWSER TEST: FAIL");
    process.exit(1);
  }
  console.log("\nTRAIL BROWSER TEST: PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
