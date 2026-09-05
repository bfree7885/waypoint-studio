#!/usr/bin/env node
/**
 * SignalTerrain SOTA V0.1 — map load, select, detail, search, geolocation-off, 320px.
 * Runtime remains /apps/summit-signal/.
 * Run: node automation/test-summit-signal-v0-1-map-mobile.mjs
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import path from "path";
import { createServer } from "http";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";
import { extname, join, normalize } from "path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = process.env.CHROME_PATH || "/usr/local/bin/google-chrome";
const DBG = Number(process.env.WAYPOINT_CDP_PORT || 9381);
const PORT = Number(process.env.SS_V01_MOBILE_PORT || 8131);
const ART = process.env.SS_V01_ARTIFACTS ||
  (fs.existsSync("/opt/cursor/artifacts")
    ? "/opt/cursor/artifacts"
    : path.join(ROOT, "automation/artifacts/signalterrain-sota-v0-1"));
const VIEWPORTS = [
  { name: "w320", width: 320, height: 568 },
  { name: "w375", width: 375, height: 667 },
  { name: "w390", width: 390, height: 844 },
  { name: "w430", width: 430, height: 932 }
];

const failures = [];
function assert(name, cond, detail) {
  if (cond) console.log("PASS", name);
  else {
    failures.push(name + (detail ? ": " + detail : ""));
    console.log("FAIL", name, "—", detail || "");
  }
}

function contentType(file) {
  return (
    {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json",
      ".png": "image/png",
      ".woff2": "font/woff2"
    }[extname(file).toLowerCase()] || "application/octet-stream"
  );
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(d));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

async function waitForTab() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const tabs = await fetchJson("http://127.0.0.1:" + DBG + "/json/list");
      const page = (tabs || []).find((t) => t.type === "page" && t.webSocketDebuggerUrl && !/chrome-extension:/.test(t.url || ""));
      if (page) return page;
      const any = (tabs || []).find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (any) return any;
    } catch (e) {
      /* starting */
    }
    await delay(250);
  }
  throw new Error("CDP tab not ready");
}

async function main() {
  fs.mkdirSync(ART, { recursive: true });
  const server = createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      if (urlPath.endsWith("/")) urlPath += "index.html";
      const file = normalize(join(ROOT, urlPath));
      if (!file.startsWith(ROOT)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const st = fs.statSync(file);
      if (!st.isFile()) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { "Content-Type": contentType(file), "Cache-Control": "no-store" });
      res.end(fs.readFileSync(file));
    } catch (e) {
      res.writeHead(404);
      res.end("missing");
    }
  });
  await new Promise((r) => server.listen(PORT, "127.0.0.1", () => r()));

  const chromePath = fs.existsSync(CHROME) ? CHROME : "/usr/bin/google-chrome";
  const userData = fs.mkdtempSync(path.join("/tmp", "chrome-ss-v01-"));
  const proc = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      "--user-data-dir=" + userData,
      "--remote-debugging-port=" + DBG,
      "about:blank"
    ],
    { stdio: "ignore" }
  );

  try {
    const page = await waitForTab();
    const WebSocket = (await import(path.join(ROOT, "node_modules/ws/index.js"))).default;
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((r) => ws.on("open", r));
    let id = 0;
    const pending = new Map();
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      }
    });
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const mid = ++id;
        pending.set(mid, { resolve, reject });
        ws.send(JSON.stringify({ id: mid, method, params }));
      });
    async function evalExpr(expression) {
      const res = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (res && res.exceptionDetails) throw new Error(res.exceptionDetails.text || "evaluate failed");
      return res.result && res.result.value;
    }
    async function shot(name) {
      const png = await send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(ART, name), Buffer.from(png.data, "base64"));
    }

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await send("Page.navigate", { url: "http://127.0.0.1:" + PORT + "/apps/summit-signal/" });
    await send("Page.loadEventFired").catch(() => {});

    let boot = null;
    for (let i = 0; i < 40; i += 1) {
      boot = await evalExpr(`(() => {
        var app = window.SignalTerrainSotaMapApp;
        var st = app && app.getState ? app.getState() : null;
        return {
          ready: !!(st && st.summits && st.summits.length),
          count: st && st.summits ? st.summits.length : 0,
          map: !!(window.__SIGNALTERRAIN_SOTA_MAP__),
          markers: st && st.markersById ? Object.keys(st.markersById).length : 0,
          geo: st && st.geolocation ? st.geolocation.status : null,
          banner: (document.getElementById("ss-banner") || {}).textContent || "",
          product: (document.querySelector(".ss-product") || {}).textContent || "",
          title: document.title || "",
          dataProduct: document.documentElement.getAttribute("data-product") || "",
          loadedCyber: !!(window.WDS && window.WDS.signalterrain),
          loadedSheds: !!window.WaypointSheds
        };
      })()`);
      if (boot && boot.ready) break;
      await delay(250);
    }
    assert("summits loaded without geolocation", !!(boot && boot.ready && boot.count >= 100), JSON.stringify(boot));
    assert("leaflet map exists", !!(boot && boot.map));
    assert("markers plotted", !!(boot && boot.markers >= 100), JSON.stringify(boot));
    assert("geolocation idle until asked", boot && boot.geo === "idle", JSON.stringify(boot));
    assert("fixture banner is honest", /development fixture|real SOTA/i.test(boot.banner || ""), boot.banner);
    assert("visible product is SignalTerrain", boot && boot.product === "SignalTerrain" && /SignalTerrain/.test(boot.title || ""), JSON.stringify(boot));
    assert("data-product is signalterrain-sota", boot && boot.dataProduct === "signalterrain-sota");
    assert("does not load cyber or Sheds globals", boot && boot.loadedCyber === false && boot.loadedSheds === false, JSON.stringify(boot));
    assert("layer controls exist", await evalExpr(`!!document.getElementById("ss-layers") && !!document.getElementById("ss-layer-az")`));
    await shot("signalterrain_sota_v02_map.png");

    const selected = await evalExpr(`(() => {
      window.SignalTerrainSotaMapApp.selectSummit("W2/GC-001", { pan: true });
      var sheet = document.getElementById("ss-sheet");
      var selectedBtn = document.querySelector(".ss-marker.is-selected");
      var nameEl = document.getElementById("ss-detail-name");
      var nameBox = nameEl ? nameEl.getBoundingClientRect() : { top: -1, bottom: -1 };
      return {
        hidden: sheet ? sheet.hasAttribute("hidden") : true,
        name: (nameEl || {}).textContent,
        nameOnScreen: nameBox.top >= 0 && nameBox.bottom <= (window.innerHeight + 1) && nameBox.top < window.innerHeight,
        ref: (document.getElementById("ss-detail-ref") || {}).textContent,
        elev: (document.getElementById("ss-field-elevation") || {}).textContent,
        points: (document.getElementById("ss-field-points") || {}).textContent,
        bonus: (document.getElementById("ss-field-bonus") || {}).textContent,
        bonusStatus: (document.getElementById("ss-field-bonus") || {}).getAttribute("data-status"),
        coords: (document.getElementById("ss-field-coords") || {}).textContent,
        grid: (document.getElementById("ss-field-grid") || {}).textContent,
        activations: (document.getElementById("ss-field-activations") || {}).textContent,
        last: (document.getElementById("ss-field-last") || {}).textContent,
        assoc: (document.getElementById("ss-field-association") || {}).textContent,
        region: (document.getElementById("ss-field-region") || {}).textContent,
        selected: !!(selectedBtn && selectedBtn.getAttribute("aria-pressed") === "true"),
        nearby: Array.prototype.map.call(document.querySelectorAll(".ss-nearby-item"), function (el) {
          return el.textContent;
        }),
        laterPlanning: Array.prototype.map.call(document.querySelectorAll("[data-planning-id]"), function (el) {
          return {
            id: el.getAttribute("data-planning-id"),
            status: el.getAttribute("data-status"),
            text: el.textContent
          };
        }),
        azStatus: (document.getElementById("ss-az-body") || {}).getAttribute("data-az-status"),
        azText: (document.getElementById("ss-az-body") || {}).textContent,
        readyText: (document.getElementById("ss-ready-body") || {}).textContent
      };
    })()`);
    assert("detail sheet opens", selected && selected.hidden === false, JSON.stringify(selected));
    assert("detail name is Slide Mountain", /Slide Mountain/.test(selected.name || ""));
    assert("detail title is on screen", selected && selected.nameOnScreen === true, JSON.stringify(selected && { nameOnScreen: selected.nameOnScreen }));
    assert("detail reference", /W2\/GC-001/.test(selected.ref || ""));
    assert("detail elevation retrieved", /1277/.test(selected.elev || "") && /4190/.test(selected.elev || ""));
    assert("detail points retrieved", selected.points === "10");
    assert("seasonal bonus not fabricated", selected.bonusStatus === "unavailable" && /Unavailable/.test(selected.bonus || ""));
    assert("coords retrieved", /41\.9991/.test(selected.coords || ""));
    assert("maidenhead retrieved", /FN21tx/.test(selected.grid || ""));
    assert("activation count retrieved", selected.activations === "86");
    assert("last activation retrieved", /KN4OK/.test(selected.last || ""));
    assert("association retrieved", /USA/.test(selected.assoc || "") || /W2/.test(selected.assoc || ""));
    assert("region retrieved", /Catskills/.test(selected.region || ""));
    assert("selected marker obvious", selected.selected === true);
    assert("nearby list populated", Array.isArray(selected.nearby) && selected.nearby.length >= 3, JSON.stringify(selected.nearby && selected.nearby.slice(0, 3)));
    assert(
      "activation zone calculated or pending",
      selected && (selected.azStatus === "ok" || selected.azStatus === "pending" || /Activation Zone/.test(selected.azText || "")),
      JSON.stringify({ azStatus: selected && selected.azStatus, azText: selected && selected.azText })
    );

    let azReady = selected;
    for (let i = 0; i < 40; i += 1) {
      azReady = await evalExpr(`(() => {
        var st = window.SignalTerrainSotaMapApp.getState();
        return {
          azStatus: st.az && st.az.status,
          azLayers: st.activationZoneLayer ? st.activationZoneLayer.getLayers().length : 0,
          thresholdM: st.az && st.az.thresholdM,
          cellCount: st.az && st.az.cellCount,
          azText: (document.getElementById("ss-az-body") || {}).textContent,
          readyText: (document.getElementById("ss-ready-body") || {}).textContent
        };
      })()`);
      if (azReady && azReady.azStatus && azReady.azStatus !== "pending") break;
      await delay(250);
    }
    assert("AZ status ok", azReady && azReady.azStatus === "ok" && azReady.azLayers >= 1, JSON.stringify(azReady));
    assert("AZ threshold 1252", azReady && azReady.thresholdM === 1252, JSON.stringify(azReady));
    assert("readiness not a score", azReady && !/87%|activated/i.test(azReady.readyText || ""), azReady && azReady.readyText);

    let access = null;
    for (let i = 0; i < 40; i += 1) {
      access = await evalExpr(`(() => {
        var st = window.SignalTerrainSotaMapApp.getState();
        var a = st && st.access;
        var trails = st && st.trailLayer ? st.trailLayer.getLayers().length : 0;
        var parking = st && st.parkingLayer ? st.parkingLayer.getLayers().length : 0;
        var heads = st && st.trailheadLayer ? st.trailheadLayer.getLayers().length : 0;
        var body = document.getElementById("ss-access-body");
        var groups = Array.prototype.map.call(document.querySelectorAll("[data-access-kind]"), function (el) {
          return { kind: el.getAttribute("data-access-kind"), status: el.getAttribute("data-status"), text: el.textContent };
        });
        return {
          status: a && a.status,
          trailCount: a && a.trails ? a.trails.length : 0,
          parkingCount: a && a.parking ? a.parking.length : 0,
          trailheadCount: a && a.trailheads ? a.trailheads.length : 0,
          trailLayers: trails,
          parkingLayers: parking,
          trailheadLayers: heads,
          accessStatusAttr: body ? body.getAttribute("data-access-status") : null,
          groups: groups,
          caveat: (document.getElementById("ss-access-caveat") || {}).textContent || "",
          hasSlideParking: !!(a && a.parking && a.parking.some(function (p) { return p.name === "Slide Mountain Parking Area"; })),
          straightLine: !!(a && a.parking && a.parking.some(function (p) { return p.distanceLabel && /straight-line/.test(p.distanceLabel); })),
          recommended: /recommended trail|best parking|official trailhead/i.test((body && body.textContent) || "")
        };
      })()`);
      if (access && access.status && access.status !== "pending") break;
      await delay(250);
    }
    assert("access loaded for Slide", access && access.status === "ok", JSON.stringify(access));
    assert("mapped trails present", access && access.trailCount >= 10 && access.trailLayers >= 10, JSON.stringify(access));
    assert("mapped parking present", access && access.parkingCount >= 1 && access.hasSlideParking, JSON.stringify(access));
    assert("trailheads listed or honestly empty", access && access.trailheadCount >= 1, JSON.stringify(access));
    assert("straight-line parking distance", access && access.straightLine === true, JSON.stringify(access));
    assert("no fabricated route language", access && access.recommended === false, JSON.stringify(access));
    assert("OSM caveat visible", /OpenStreetMap data may be incomplete|candidate access information/i.test(access.caveat || ""), access.caveat);
    await evalExpr(`(() => {
      var body = document.querySelector(".ss-sheet__body");
      if (body) body.scrollTop = 0;
      var access = document.getElementById("ss-sec-planning");
      if (access) access.scrollIntoView({ block: "nearest" });
      return true;
    })()`);
    await delay(400);
    await shot("signalterrain_sota_v02_slide_access.png");

    await evalExpr(`(() => {
      var close = document.getElementById("ss-sheet-close");
      if (close) close.click();
      return true;
    })()`);
    await delay(600);
    await shot("signalterrain_sota_v02_slide_trails_parking.png");
    await evalExpr(`window.SignalTerrainSotaMapApp.selectSummit("W2/GC-001", { pan: false })`);
    await delay(500);
    await evalExpr(`(() => {
      var parking = document.querySelector('[data-access-kind="parking"]');
      if (parking) parking.scrollIntoView({ block: "center" });
      return true;
    })()`);
    await delay(300);
    await shot("signalterrain_sota_v02_access_lists.png");

    const hikeStart = await evalExpr(`(() => {
      var btn = document.querySelector('[data-start-hike="way/816358667"]');
      if (btn) btn.click();
      return { clicked: !!btn };
    })()`);
    assert("start hike clicked", !!(hikeStart && hikeStart.clicked), JSON.stringify(hikeStart));
    let hike = null;
    for (let i = 0; i < 40; i += 1) {
      hike = await evalExpr(`(() => {
        var st = window.SignalTerrainSotaMapApp.getState();
        var body = document.getElementById("ss-hike-body");
        var hikeEl = document.getElementById("ss-sec-hike");
        if (hikeEl) hikeEl.scrollIntoView({ block: "nearest" });
        return {
          routeStatus: st.route && st.route.status,
          elevStatus: st.elevation && st.elevation.status,
          distanceKm: st.route && st.route.distanceKm,
          distanceLabel: st.route && st.route.distanceLabel,
          durationLabel: st.route && st.route.durationLabel,
          gainM: st.elevation && st.elevation.gainM,
          startName: st.selectedAccess && st.selectedAccess.name,
          body: body ? body.textContent.slice(0, 600) : "",
          routeLayers: st.routeLayer ? st.routeLayer.getLayers().length : 0,
          profile: !!document.getElementById("ss-hike-profile")
        };
      })()`);
      if (hike && hike.routeStatus && hike.routeStatus !== "pending" && hike.elevStatus && hike.elevStatus !== "pending") break;
      await delay(250);
    }
    assert("hike route ok", hike && hike.routeStatus === "ok" && hike.routeLayers >= 1, JSON.stringify(hike));
    assert("route distance not straight-line", hike && hike.distanceKm > 4 && /mi/.test(hike.distanceLabel || ""), JSON.stringify(hike));
    assert("plan the hike shows start", hike && /Slide Mountain Parking Area/.test(hike.body || ""), hike && hike.body);
    assert("elevation profile rendered", hike && hike.profile === true && hike.gainM > 400, JSON.stringify(hike));
    assert("estimated time tilde", hike && /^~/.test(hike.durationLabel || ""), JSON.stringify(hike));
    const azRel = await evalExpr(`(() => {
      var st = window.SignalTerrainSotaMapApp.getState();
      var azEl = document.getElementById("ss-az-body");
      if (azEl) azEl.scrollIntoView({ block: "nearest" });
      return {
        enters: st.routeAz && st.routeAz.enters,
        distanceToEntryKm: st.routeAz && st.routeAz.distanceToEntryKm,
        azLayers: st.activationZoneLayer ? st.activationZoneLayer.getLayers().length : 0,
        azText: azEl ? azEl.textContent : "",
        ready: (document.getElementById("ss-ready-body") || {}).textContent
      };
    })()`);
    assert("route enters AZ", azRel && azRel.enters === true && azRel.distanceToEntryKm > 4, JSON.stringify(azRel));
    assert("AZ overlay with route", azRel && azRel.azLayers >= 1, JSON.stringify(azRel));
    assert("readiness factual", azRel && /Activation zone|Route enters|Location unavailable/i.test(azRel.ready || "") && !/activated/i.test(azRel.ready || ""), azRel && azRel.ready);
    await delay(300);
    await shot("signalterrain_sota_v04_az_and_route.png");
    await shot("signalterrain_sota_v05_slide_az_and_route.png");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });
    await evalExpr(`(() => {
      var map = window.__SIGNALTERRAIN_SOTA_MAP__;
      window.dispatchEvent(new Event("resize"));
      if (map) {
        map.invalidateSize();
        var st = window.SignalTerrainSotaMapApp.getState();
        if (st.routeLayer && st.activationZoneLayer) {
          var group = L.featureGroup([st.routeLayer, st.activationZoneLayer, st.markerLayer]);
          try { map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 14 }); } catch (e) {}
        }
      }
      return true;
    })()`);
    await delay(500);
    await shot("signalterrain_sota_v04_desktop_az_overlay.png");
    await shot("signalterrain_sota_v05_slide_desktop_az.png");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await evalExpr(`(() => {
      var map = window.__SIGNALTERRAIN_SOTA_MAP__;
      window.dispatchEvent(new Event("resize"));
      if (map) map.invalidateSize();
      var ready = document.getElementById("ss-sec-ready");
      if (ready) ready.scrollIntoView({ block: "start" });
      return true;
    })()`);
    await delay(300);
    await shot("signalterrain_sota_v04_activation_readiness.png");
    await shot("signalterrain_sota_v05_slide_readiness.png");
    const toggled = await evalExpr(`(() => {
      var st = window.SignalTerrainSotaMapApp.getState();
      var before = st.map.hasLayer(st.activationZoneLayer);
      window.SignalTerrainSotaMapApp.setLayerVisible("az", false);
      var off = !st.map.hasLayer(st.activationZoneLayer);
      window.SignalTerrainSotaMapApp.setLayerVisible("az", true);
      var on = st.map.hasLayer(st.activationZoneLayer);
      var chip = document.getElementById("ss-layer-az");
      return { before: before, off: off, on: on, chip: !!(chip && chip.getBoundingClientRect().width > 0) };
    })()`);
    assert("AZ layer toggle", toggled && toggled.before === true && toggled.off === true && toggled.on === true && toggled.chip === true, JSON.stringify(toggled));
    await evalExpr(`(() => {
      var hike = document.getElementById("ss-hike-body");
      if (hike) hike.scrollIntoView({ block: "start" });
      return true;
    })()`);
    await delay(400);
    await shot("signalterrain_sota_v03_plan_the_hike.png");
    await shot("signalterrain_sota_v06_slide_route_to_summit.png");

    const azMode = await evalExpr(`(() => {
      return window.SignalTerrainSotaMapApp.setDestinationMode("az").then(function () { return true; });
    })()`);
    let azHike = null;
    for (let i = 0; i < 40; i += 1) {
      azHike = await evalExpr(`(() => {
        var st = window.SignalTerrainSotaMapApp.getState();
        var body = document.getElementById("ss-hike-body");
        var hikeEl = document.getElementById("ss-sec-hike");
        if (hikeEl) hikeEl.scrollIntoView({ block: "nearest" });
        var map = window.__SIGNALTERRAIN_SOTA_MAP__;
        if (map && st.routeLayer && st.activationZoneLayer) {
          try {
            var group = L.featureGroup([st.routeLayer, st.activationZoneLayer]);
            map.fitBounds(group.getBounds(), { padding: [36, 36], maxZoom: 15 });
          } catch (e) {}
        }
        var azBtn = document.querySelector("[data-dest-mode=az]");
        return {
          dest: st.destinationMode,
          azStatus: st.azRoute && st.azRoute.status,
          azKm: st.azRoute && st.azRoute.distanceKm,
          summitKm: st.summitRoute && st.summitRoute.distanceKm,
          entry: st.azRoute && st.azRoute.entry,
          body: body ? body.textContent.slice(0, 900) : "",
          destPressed: azBtn ? azBtn.getAttribute("aria-pressed") : null,
          compare: !!document.querySelector("[data-route-compare]"),
          azEntryLabel: !!document.querySelector(".ss-az-entry-label"),
          routeLayers: st.routeLayer ? st.routeLayer.getLayers().length : 0
        };
      })()`);
      if (azHike && azHike.azStatus && azHike.azStatus !== "pending") break;
      await delay(250);
    }
    assert("AZ dest mode selected", azHike && azHike.dest === "az" && /Route to AZ found/.test(azHike.body || ""), JSON.stringify(azHike));
    assert("Slide Route-to-AZ ok", azHike && azHike.azStatus === "ok" && azHike.azKm > 5 && azHike.azKm < azHike.summitKm, JSON.stringify(azHike));
    assert("Slide AZ panel shows destination and selection", azHike && /Activation Zone/.test(azHike.body || "") && /Shortest routed AZ entry/.test(azHike.body || ""), azHike && azHike.body);
    assert("AZ ENTRY marker present", azHike && azHike.azEntryLabel === true, JSON.stringify(azHike));
    assert("route comparison shown", azHike && azHike.compare === true, JSON.stringify(azHike));
    await delay(400);
    await shot("signalterrain_sota_v06_slide_route_to_az.png");
    await shot("signalterrain_sota_v06_slide_az_entry.png");
    await evalExpr(`(() => {
      var cmp = document.querySelector(".ss-route-compare");
      if (cmp) cmp.scrollIntoView({ block: "center" });
      return true;
    })()`);
    await delay(300);
    await shot("signalterrain_sota_v06_route_comparison.png");

    await evalExpr(`(() => {
      window.__ST_ORIG_AZ_ROUTE = window.SignalTerrainSotaAzRoute.loadAzRoute;
      window.SignalTerrainSotaAzRoute.clearCache();
      window.SignalTerrainSotaAzRoute.loadAzRoute = function (summit, access) {
        return Promise.resolve(
          window.SignalTerrainSotaAzRouteModel.emptyResult(
            { summitId: summit && summit.id, access: access },
            "no-candidate",
            "No valid AZ routing candidate found."
          )
        );
      };
      var parking = window.SignalTerrainSotaMapApp.getState().access.parking.find(function (p) { return p.osmId === 816358667; });
      return window.SignalTerrainSotaMapApp.startHikeFromAccess(parking);
    })()`);
    await delay(700);
    const azFail = await evalExpr(`(() => {
      var st = window.SignalTerrainSotaMapApp.getState();
      var body = document.getElementById("ss-hike-body");
      if (body) body.scrollIntoView({ block: "start" });
      return {
        dest: st.destinationMode,
        azStatus: st.azRoute && st.azRoute.status,
        summitStatus: st.summitRoute && st.summitRoute.status,
        summitLayers: st.routeLayer ? st.routeLayer.getLayers().length : 0,
        azOk: st.az && st.az.status,
        body: body ? body.textContent.slice(0, 700) : ""
      };
    })()`);
    assert(
      "AZ failure preserves summit route and AZ",
      azFail && azFail.dest === "az" && azFail.azStatus === "no-candidate" && azFail.summitStatus === "ok" && azFail.summitLayers >= 1 && azFail.azOk === "ok",
      JSON.stringify(azFail)
    );
    assert("AZ failure copy is honest", azFail && /No valid AZ routing candidate/.test(azFail.body || ""), azFail && azFail.body);
    await delay(300);
    await shot("signalterrain_sota_v06_az_route_failure.png");
    await evalExpr(`(() => {
      if (window.__ST_ORIG_AZ_ROUTE) window.SignalTerrainSotaAzRoute.loadAzRoute = window.__ST_ORIG_AZ_ROUTE;
      window.SignalTerrainSotaAzRoute.clearCache();
      return window.SignalTerrainSotaMapApp.setDestinationMode("summit");
    })()`);
    await delay(600);

    const alt = await evalExpr(`(() => {
      var btn = document.querySelector('[data-start-hike="way/816358666"]');
      if (btn) btn.click();
      return { clicked: !!btn };
    })()`);
    assert("change access point", !!(alt && alt.clicked), JSON.stringify(alt));
    let hike2 = null;
    for (let i = 0; i < 40; i += 1) {
      hike2 = await evalExpr(`(() => {
        var st = window.SignalTerrainSotaMapApp.getState();
        return {
          startName: st.selectedAccess && st.selectedAccess.name,
          distanceKm: st.route && st.route.distanceKm,
          status: st.route && st.route.status
        };
      })()`);
      if (hike2 && hike2.status && hike2.status !== "pending" && hike2.startName === "Giant Ledge Trailhead") break;
      await delay(250);
    }
    assert("alternate start recalculates", hike2 && hike2.status === "ok" && hike2.startName === "Giant Ledge Trailhead" && Math.abs(hike2.distanceKm - hike.distanceKm) > 0.2, JSON.stringify(hike2));
    await evalExpr(`(() => {
      var hike = document.getElementById("ss-hike-body");
      if (hike) hike.scrollIntoView({ block: "start" });
      return true;
    })()`);
    await delay(350);
    await shot("signalterrain_sota_v03_alt_start.png");

    await evalExpr(`(() => {
      window.SignalTerrainSotaRoute.clearCache();
      window.SignalTerrainSotaTerrain.clearCache();
      window.__ST_ORIG_ELEV = window.SignalTerrainSotaTerrain.loadElevation;
      window.SignalTerrainSotaTerrain.loadElevation = function () {
        return Promise.resolve(window.SignalTerrainSotaTerrainModel.emptyProfile({}, "unavailable", "Elevation data unavailable. The calculated route is still shown."));
      };
      var parking = window.SignalTerrainSotaMapApp.getState().access.parking.find(function (p) { return p.osmId === 816358667; });
      return window.SignalTerrainSotaMapApp.startHikeFromAccess(parking);
    })()`);
    await delay(700);
    const elevFail = await evalExpr(`(() => {
      var st = window.SignalTerrainSotaMapApp.getState();
      return {
        routeStatus: st.route && st.route.status,
        routeLayers: st.routeLayer ? st.routeLayer.getLayers().length : 0,
        elevStatus: st.elevation && st.elevation.status
      };
    })()`);
    assert("elevation fail keeps route", elevFail && elevFail.routeStatus === "ok" && elevFail.routeLayers >= 1 && elevFail.elevStatus === "unavailable", JSON.stringify(elevFail));
    await evalExpr(`(() => {
      var hike = document.getElementById("ss-hike-body");
      if (hike) hike.scrollIntoView({ block: "start" });
      return true;
    })()`);
    await delay(300);
    await shot("signalterrain_sota_v03_elev_unavailable.png");
    await evalExpr(`(() => {
      if (window.__ST_ORIG_ELEV) window.SignalTerrainSotaTerrain.loadElevation = window.__ST_ORIG_ELEV;
      window.SignalTerrainSotaTerrain.clearCache();
      return true;
    })()`);

    await evalExpr(`(() => {
      window.SignalTerrainSotaRoute.clearCache();
      var unnamed = window.SignalTerrainSotaMapApp.getState().access.parking.find(function (p) { return p.osmId === 2442957521; });
      return window.SignalTerrainSotaMapApp.startHikeFromAccess(unnamed);
    })()`);
    await delay(500);
    const noFix = await evalExpr(`(() => {
      var st = window.SignalTerrainSotaMapApp.getState();
      return {
        status: st.route && st.route.status,
        layers: st.routeLayer ? st.routeLayer.getLayers().length : 0,
        stillHasSummits: st.summits.length >= 100
      };
    })()`);
    assert("routing miss is unavailable not a fake line", noFix && noFix.status === "unavailable" && noFix.layers === 0 && noFix.stillHasSummits, JSON.stringify(noFix));
    await evalExpr(`(() => {
      var hike = document.getElementById("ss-hike-body");
      if (hike) hike.scrollIntoView({ block: "start" });
      return true;
    })()`);
    await delay(300);
    await shot("signalterrain_sota_v03_route_unavailable.png");

    const layers = await evalExpr(`(() => {
      var trails = document.getElementById("ss-layer-trails");
      var parking = document.getElementById("ss-layer-parking");
      var before = window.SignalTerrainSotaMapApp.getState().map.hasLayer(window.SignalTerrainSotaMapApp.getState().trailLayer);
      trails.checked = false;
      trails.dispatchEvent(new Event("change", { bubbles: true }));
      var afterOff = window.SignalTerrainSotaMapApp.getState().map.hasLayer(window.SignalTerrainSotaMapApp.getState().trailLayer);
      trails.checked = true;
      trails.dispatchEvent(new Event("change", { bubbles: true }));
      var afterOn = window.SignalTerrainSotaMapApp.getState().map.hasLayer(window.SignalTerrainSotaMapApp.getState().trailLayer);
      var parkBefore = window.SignalTerrainSotaMapApp.getState().map.hasLayer(window.SignalTerrainSotaMapApp.getState().parkingLayer);
      parking.checked = false;
      parking.dispatchEvent(new Event("change", { bubbles: true }));
      var parkOff = window.SignalTerrainSotaMapApp.getState().map.hasLayer(window.SignalTerrainSotaMapApp.getState().parkingLayer);
      parking.checked = true;
      parking.dispatchEvent(new Event("change", { bubbles: true }));
      return { before: before, afterOff: afterOff, afterOn: afterOn, parkBefore: parkBefore, parkOff: parkOff };
    })()`);
    assert("trail layer toggles independently", layers && layers.before === true && layers.afterOff === false && layers.afterOn === true, JSON.stringify(layers));
    assert("parking layer toggles independently", layers && layers.parkBefore === true && layers.parkOff === false, JSON.stringify(layers));
    await shot("signalterrain_sota_v02_layers.png");

    const nearbyNav = await evalExpr(`(() => {
      var items = Array.prototype.slice.call(document.querySelectorAll(".ss-nearby-item"));
      var first = items.find(function (el) {
        var id = el.getAttribute("data-summit-id");
        return id && id !== "W2/GC-001" && id !== "W2/GC-002";
      }) || items[0];
      if (!first) return { ok: false };
      var id = first.getAttribute("data-summit-id");
      first.click();
      return {
        ok: true,
        id: id,
        name: (document.getElementById("ss-detail-name") || {}).textContent,
        ref: (document.getElementById("ss-detail-ref") || {}).textContent,
        selectedId: window.SignalTerrainSotaMapApp.getState().selectedId
      };
    })()`);
    assert("nearby navigates to another summit", !!(nearbyNav && nearbyNav.ok && nearbyNav.selectedId && nearbyNav.selectedId !== "W2/GC-001" && nearbyNav.selectedId !== "W2/GC-002"), JSON.stringify(nearbyNav));
    let otherAccess = null;
    for (let i = 0; i < 40; i += 1) {
      otherAccess = await evalExpr(`(() => {
        var st = window.SignalTerrainSotaMapApp.getState();
        var name = (document.getElementById("ss-detail-name") || {}).textContent;
        var elev = (document.getElementById("ss-field-elevation") || {}).textContent;
        var body = document.getElementById("ss-access-body");
        return {
          accessStatus: st.access && st.access.status,
          reason: st.access && st.access.reason,
          body: body ? body.textContent : "",
          name: name,
          elev: elev,
          stillHasSummits: st.summits.length >= 100,
          map: !!window.__SIGNALTERRAIN_SOTA_MAP__
        };
      })()`);
      if (otherAccess && otherAccess.accessStatus && otherAccess.accessStatus !== "pending") break;
      await delay(250);
    }
    assert("OSM miss is unavailable not a crash", otherAccess && otherAccess.accessStatus === "unavailable" && otherAccess.stillHasSummits && otherAccess.map, JSON.stringify(otherAccess));
    assert("SOTA detail still populated without OSM", otherAccess && otherAccess.name && otherAccess.elev && otherAccess.elev !== "Unavailable", JSON.stringify(otherAccess));
    assert("unavailable copy is honest", /OpenStreetMap|fixture|unavailable/i.test((otherAccess && (otherAccess.reason || otherAccess.body)) || ""), JSON.stringify(otherAccess));
    const otherAz = await evalExpr(`(() => {
      var st = window.SignalTerrainSotaMapApp.getState();
      return {
        azStatus: st.az && st.az.status,
        azLayers: st.activationZoneLayer ? st.activationZoneLayer.getLayers().length : 0,
        stillHasSummits: st.summits.length >= 100,
        azText: (document.getElementById("ss-az-body") || {}).textContent
      };
    })()`);
    assert(
      "AZ miss does not crash the map",
      otherAz && otherAz.azStatus && otherAz.azStatus !== "ok" && otherAz.azLayers === 0 && otherAz.stillHasSummits,
      JSON.stringify(otherAz)
    );
    await evalExpr(`(() => {
      var az = document.getElementById("ss-sec-az");
      if (az) az.scrollIntoView({ block: "start" });
      return true;
    })()`);
    await delay(250);
    await shot("signalterrain_sota_v04_az_unavailable_detail.png");
    await shot("signalterrain_sota_v02_access_unavailable.png");

    await evalExpr(`window.SignalTerrainSotaMapApp.selectSummit("W2/GC-002", { pan: true })`);
    let hunterAzUi = null;
    for (let i = 0; i < 40; i += 1) {
      hunterAzUi = await evalExpr(`(() => {
        var st = window.SignalTerrainSotaMapApp.getState();
        var azEl = document.getElementById("ss-az-body");
        if (azEl) azEl.scrollIntoView({ block: "nearest" });
        return {
          id: st.selectedId,
          name: (document.getElementById("ss-detail-name") || {}).textContent,
          ref: (document.getElementById("ss-detail-ref") || {}).textContent,
          azStatus: st.az && st.az.status,
          thresholdM: st.az && st.az.thresholdM,
          cellCount: st.az && st.az.cellCount,
          notARadius: st.az && st.az.notARadius,
          edgeClipped: st.az && st.az.edgeClipped,
          azLayers: st.activationZoneLayer ? st.activationZoneLayer.getLayers().length : 0,
          azText: azEl ? azEl.textContent : "",
          ready: (document.getElementById("ss-ready-body") || {}).textContent
        };
      })()`);
      if (hunterAzUi && hunterAzUi.azStatus && hunterAzUi.azStatus !== "pending") break;
      await delay(250);
    }
    assert("Hunter selected", hunterAzUi && hunterAzUi.id === "W2/GC-002" && /Hunter Mountain/.test(hunterAzUi.name || "") && /W2\/GC-002/.test(hunterAzUi.ref || ""), JSON.stringify(hunterAzUi));
    assert("Hunter AZ ok", hunterAzUi && hunterAzUi.azStatus === "ok" && hunterAzUi.azLayers >= 1, JSON.stringify(hunterAzUi));
    assert("Hunter threshold 1209", hunterAzUi && hunterAzUi.thresholdM === 1209, JSON.stringify(hunterAzUi));
    assert("Hunter AZ not a radius", hunterAzUi && hunterAzUi.notARadius === true && hunterAzUi.cellCount > 400, JSON.stringify(hunterAzUi));
    assert("Hunter AZ copy is terrain-derived", hunterAzUi && /Terrain-derived Activation Zone/.test(hunterAzUi.azText || "") && /1,?209/.test(hunterAzUi.azText || ""), hunterAzUi && hunterAzUi.azText);
    await delay(400);
    await shot("signalterrain_sota_v05_hunter_az.png");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });
    await evalExpr(`(() => {
      var map = window.__SIGNALTERRAIN_SOTA_MAP__;
      window.dispatchEvent(new Event("resize"));
      if (map) {
        map.invalidateSize();
        var st = window.SignalTerrainSotaMapApp.getState();
        if (st.activationZoneLayer) {
          try { map.fitBounds(st.activationZoneLayer.getBounds(), { padding: [40, 40], maxZoom: 14 }); } catch (e) {}
        }
      }
      return true;
    })()`);
    await delay(500);
    await shot("signalterrain_sota_v05_hunter_desktop_az.png");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await evalExpr(`(() => {
      var map = window.__SIGNALTERRAIN_SOTA_MAP__;
      window.dispatchEvent(new Event("resize"));
      if (map) map.invalidateSize();
      var ready = document.getElementById("ss-sec-ready");
      if (ready) ready.scrollIntoView({ block: "start" });
      return true;
    })()`);
    await delay(300);
    await shot("signalterrain_sota_v05_hunter_readiness.png");

    await evalExpr(`(() => {
      return window.SignalTerrainSotaMapApp.setDestinationMode("summit");
    })()`);
    let hunterAccessReady = null;
    for (let i = 0; i < 40; i += 1) {
      hunterAccessReady = await evalExpr(`(() => {
        var st = window.SignalTerrainSotaMapApp.getState();
        return {
          accessStatus: st.access && st.access.status,
          parking: st.access && st.access.parking ? st.access.parking.length : 0,
          hasBecker: !!(st.access && st.access.parking && st.access.parking.some(function (p) { return p.osmId === 338567127; }))
        };
      })()`);
      if (hunterAccessReady && hunterAccessReady.accessStatus && hunterAccessReady.accessStatus !== "pending") break;
      await delay(250);
    }
    assert("Hunter access fixture available", hunterAccessReady && hunterAccessReady.accessStatus === "ok" && hunterAccessReady.hasBecker === true, JSON.stringify(hunterAccessReady));
    await evalExpr(`(() => {
      var parking = window.SignalTerrainSotaMapApp.getState().access.parking.find(function (p) { return p.osmId === 338567127; });
      return window.SignalTerrainSotaMapApp.startHikeFromAccess(parking);
    })()`);
    let hunterHike = null;
    for (let i = 0; i < 40; i += 1) {
      hunterHike = await evalExpr(`(() => {
        var st = window.SignalTerrainSotaMapApp.getState();
        var body = document.getElementById("ss-hike-body");
        if (body) body.scrollIntoView({ block: "start" });
        return {
          dest: st.destinationMode,
          routeStatus: st.route && st.route.status,
          elevStatus: st.elevation && st.elevation.status,
          distanceKm: st.route && st.route.distanceKm,
          gainM: st.elevation && st.elevation.gainM,
          body: body ? body.textContent.slice(0, 800) : "",
          routeLayers: st.routeLayer ? st.routeLayer.getLayers().length : 0
        };
      })()`);
      if (
        hunterHike &&
        hunterHike.routeStatus &&
        hunterHike.routeStatus !== "pending" &&
        hunterHike.elevStatus &&
        hunterHike.elevStatus !== "pending"
      ) {
        break;
      }
      await delay(250);
    }
    assert("Hunter Route-to-Summit ok", hunterHike && hunterHike.routeStatus === "ok" && hunterHike.distanceKm > 8 && hunterHike.routeLayers >= 1, JSON.stringify(hunterHike));
    assert("Hunter summit elevation sampled", hunterHike && (hunterHike.elevStatus === "ok" || hunterHike.elevStatus === "partial") && hunterHike.gainM > 500, JSON.stringify(hunterHike));
    await delay(350);
    await shot("signalterrain_sota_v06_hunter_route_to_summit.png");
    await evalExpr(`(() => window.SignalTerrainSotaMapApp.setDestinationMode("az"))()`);
    let hunterAzRoute = null;
    for (let i = 0; i < 40; i += 1) {
      hunterAzRoute = await evalExpr(`(() => {
        var st = window.SignalTerrainSotaMapApp.getState();
        var body = document.getElementById("ss-hike-body");
        if (body) body.scrollIntoView({ block: "start" });
        var map = window.__SIGNALTERRAIN_SOTA_MAP__;
        if (map && st.routeLayer && st.activationZoneLayer) {
          try {
            var group = L.featureGroup([st.routeLayer, st.activationZoneLayer]);
            map.fitBounds(group.getBounds(), { padding: [36, 36], maxZoom: 14 });
          } catch (e) {}
        }
        return {
          dest: st.destinationMode,
          azStatus: st.azRoute && st.azRoute.status,
          azKm: st.azRoute && st.azRoute.distanceKm,
          elevStatus: st.azElevation && st.azElevation.status,
          gainM: st.azElevation && st.azElevation.gainM,
          entry: st.azRoute && st.azRoute.entry,
          azEntryLabel: !!document.querySelector(".ss-az-entry-label"),
          body: body ? body.textContent.slice(0, 900) : ""
        };
      })()`);
      if (
        hunterAzRoute &&
        hunterAzRoute.azStatus &&
        hunterAzRoute.azStatus !== "pending" &&
        hunterAzRoute.elevStatus &&
        hunterAzRoute.elevStatus !== "pending"
      ) {
        break;
      }
      await delay(250);
    }
    assert("Hunter Route-to-AZ ok", hunterAzRoute && hunterAzRoute.azStatus === "ok" && hunterAzRoute.azKm > 8, JSON.stringify(hunterAzRoute));
    assert("Hunter AZ ENTRY shown", hunterAzRoute && hunterAzRoute.azEntryLabel === true, JSON.stringify(hunterAzRoute));
    assert("Hunter AZ elevation sampled", hunterAzRoute && (hunterAzRoute.elevStatus === "ok" || hunterAzRoute.elevStatus === "partial"), JSON.stringify(hunterAzRoute));
    await delay(400);
    await shot("signalterrain_sota_v06_hunter_route_to_az.png");
    await shot("signalterrain_sota_v06_hunter_az_entry.png");

    const searched = await evalExpr(`(() => {
      document.getElementById("ss-search-open").click();
      var input = document.getElementById("ss-search-q");
      input.value = "Slide";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      var items = Array.prototype.map.call(document.querySelectorAll(".ss-search-item"), function (el) {
        return el.textContent;
      });
      var panelHidden = document.getElementById("ss-search-panel").hasAttribute("hidden");
      return { items: items, panelHidden: panelHidden };
    })()`);
    assert("search panel opens", searched && searched.panelHidden === false);
    assert("search finds Slide", searched.items.some((t) => /Slide Mountain/.test(t) && /W2\/GC-001/.test(t)), JSON.stringify(searched.items.slice(0, 5)));
    await evalExpr(`(() => {
      var item = document.querySelector(".ss-search-item");
      if (item) item.scrollIntoView({ block: "nearest" });
      return true;
    })()`);
    await delay(200);
    await shot("signalterrain_sota_search.png");

    const geo = await evalExpr(`(() => {
      navigator.geolocation.getCurrentPosition = function (ok, err) {
        err({ code: 1, message: "denied" });
      };
      window.SignalTerrainSotaMapApp.locateUser();
      var st = window.SignalTerrainSotaMapApp.getState();
      return {
        status: st.geolocation.status,
        message: st.geolocation.message,
        stillHasSummits: st.summits.length >= 100,
        map: !!window.__SIGNALTERRAIN_SOTA_MAP__
      };
    })()`);
    assert("denied geolocation still has a map", geo && geo.map && geo.stillHasSummits, JSON.stringify(geo));
    assert("denied geolocation is honest", geo.status === "denied" && /without GPS|permission/i.test(geo.message || ""), JSON.stringify(geo));

    await evalExpr(`(() => {
      window.SignalTerrainSotaMapApp.selectSummit("W2/GC-001", { pan: true });
      document.getElementById("ss-search-close").click();
      return true;
    })()`);

    for (const vp of VIEWPORTS) {
      await send("Emulation.setDeviceMetricsOverride", {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        mobile: true
      });
      await delay(350);
      const metrics = await evalExpr(`(() => {
        window.dispatchEvent(new Event("resize"));
        var map = window.__SIGNALTERRAIN_SOTA_MAP__;
        if (map) map.invalidateSize();
        var overflowX = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
        var mapEl = document.querySelector(".leaflet-container");
        var mapBox = mapEl ? mapEl.getBoundingClientRect() : { height: 0, width: 0 };
        var sheet = document.getElementById("ss-sheet");
        var sheetBox = sheet ? sheet.getBoundingClientRect() : { width: 0, height: 0 };
        var chrome = document.querySelector(".ss-chrome");
        var chromeBox = chrome ? chrome.getBoundingClientRect() : { height: 0 };
        return {
          overflowX: overflowX,
          docW: document.documentElement.scrollWidth,
          clientW: document.documentElement.clientWidth,
          mapH: mapBox.height,
          mapW: mapBox.width,
          sheetW: sheetBox.width,
          chromeH: chromeBox.height,
          bodyOverflow: document.body.scrollWidth
        };
      })()`);
      assert(
        vp.name + " no horizontal overflow",
        metrics && metrics.overflowX === false,
        JSON.stringify(metrics)
      );
      assert(vp.name + " map has height", metrics && metrics.mapH > 120, JSON.stringify(metrics));
      if (vp.name === "w320") {
        await evalExpr(`(() => {
          var body = document.querySelector(".ss-sheet__body");
          if (body) body.scrollTop = 0;
          return true;
        })()`);
        await delay(200);
        await shot("signalterrain_sota_v02_w320.png");
        await evalExpr(`(() => {
          var az = document.getElementById("ss-sec-az");
          if (az) az.scrollIntoView({ block: "start" });
          return true;
        })()`);
        await delay(250);
        await shot("signalterrain_sota_v04_w320.png");
        await evalExpr(`window.SignalTerrainSotaMapApp.selectSummit("W2/GC-001", { pan: true })`);
        for (let i = 0; i < 40; i += 1) {
          const st = await evalExpr(`(window.SignalTerrainSotaMapApp.getState().az || {}).status`);
          if (st && st !== "pending") break;
          await delay(250);
        }
        await evalExpr(`(() => {
          var az = document.getElementById("ss-sec-az");
          if (az) az.scrollIntoView({ block: "start" });
          return true;
        })()`);
        await delay(350);
        await shot("signalterrain_sota_v05_slide_w320.png");
        await evalExpr(`window.SignalTerrainSotaMapApp.selectSummit("W2/GC-002", { pan: true })`);
        for (let i = 0; i < 40; i += 1) {
          const st = await evalExpr(`(window.SignalTerrainSotaMapApp.getState().az || {}).status`);
          if (st && st !== "pending") break;
          await delay(250);
        }
        await evalExpr(`(() => {
          var az = document.getElementById("ss-sec-az");
          if (az) az.scrollIntoView({ block: "start" });
          var map = window.__SIGNALTERRAIN_SOTA_MAP__;
          var st = window.SignalTerrainSotaMapApp.getState();
          if (map && st.activationZoneLayer) {
            try { map.fitBounds(st.activationZoneLayer.getBounds(), { padding: [16, 16], maxZoom: 14 }); } catch (e) {}
          }
          return true;
        })()`);
        await delay(400);
        await shot("signalterrain_sota_v05_hunter_w320.png");
        await evalExpr(`(() => {
          var hike = document.getElementById("ss-hike-body");
          if (hike) hike.scrollIntoView({ block: "start" });
          return true;
        })()`);
        await delay(300);
        await shot("signalterrain_sota_v06_w320.png");
      }
    }

    if (failures.length) {
      console.error("\nSignalTerrain SOTA map/mobile tests failed (" + failures.length + ").");
      process.exitCode = 1;
    } else {
      console.log("\nAll SignalTerrain SOTA map/mobile tests passed.");
    }
  } finally {
    try {
      proc.kill("SIGKILL");
    } catch (e) {
      /* ignore */
    }
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
