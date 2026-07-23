#!/usr/bin/env node
/**
 * Capture Dashboard RC2.5 Sprint 6 polish screenshots (desktop + phone + customize/kiosk).
 * Usage: node automation/capture-dashboard-rc25-sprint6.mjs [baseUrl]
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = (process.argv[2] || "http://127.0.0.1:8765").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9393);
const OUT = path.join(ROOT, "docs/dashboard-rc25-sprint6");

const PIKE = {
  source: "manual",
  lat: 41.34,
  lng: -75.04,
  timestamp: Date.now(),
  regionId: "pike-county-pa",
  name: "Pike County",
  county: "Pike County",
  state: "Pennsylvania",
  stateCode: "PA",
  placeLabel: "Pike County, PA",
  displayTitle: "Pike County, PA",
  contentMode: "local-bundle"
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

async function startChrome() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wdb-rc25s6-"));
  const proc = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-extensions",
      "--disable-dev-shm-usage",
      `--user-data-dir=${userDataDir}`,
      `--remote-debugging-port=${CDP_PORT}`,
      "about:blank"
    ],
    { stdio: "ignore" }
  );
  for (let i = 0; i < 60; i++) {
    await delay(250);
    try {
      const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
      const page = targets.find((t) => t.type === "page");
      if (page) return { proc, wsUrl: page.webSocketDebuggerUrl };
    } catch (_) {}
  }
  proc.kill("SIGTERM");
  throw new Error("Chrome CDP not ready");
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = await startChrome();
  const { default: WebSocket } = await import("ws");
  const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
  const page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => {
    ws.once("open", r);
    ws.once("error", j);
  });
  let id = 0;
  const pending = new Map();
  ws.on("message", (raw) => {
    const msg = JSON.parse(String(raw));
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");

  async function goto(url) {
    await send("Page.navigate", { url });
    await delay(2500);
  }

  async function shot(name) {
    const result = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true
    });
    const file = path.join(OUT, name);
    fs.writeFileSync(file, Buffer.from(result.data, "base64"));
    console.log("wrote", file);
  }

  async function evalJs(expression) {
    const r = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    return r.result && r.result.value;
  }

  async function waitHydrated(maxMs = 20000) {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      const state = await evalJs(`({
        hydrated: !!document.querySelector('[data-wdb-r][data-hydrated="true"]'),
        facts: document.querySelectorAll(".wdb-r-widget__facts").length,
        pending: document.querySelectorAll('[data-lazy="pending"]').length,
        place: (document.querySelector(".wdb-r-today__place")||{}).textContent||"",
        today: (document.querySelector(".wdb-r-today__lines")||{}).innerText||"",
        statuses: Array.from(document.querySelectorAll(".wdb-r-widget__status")).slice(0,4).map(e=>e.textContent)
      })`);
      if (
        state &&
        state.hydrated &&
        state.pending === 0 &&
        (state.facts >= 1 || /Air quality|Golden hour|°F|Moon/i.test(state.today))
      ) {
        return state;
      }
      await delay(500);
    }
    return evalJs(`({
      hydrated: !!document.querySelector('[data-wdb-r][data-hydrated="true"]'),
      facts: document.querySelectorAll(".wdb-r-widget__facts").length,
      pending: document.querySelectorAll('[data-lazy="pending"]').length,
      place: (document.querySelector(".wdb-r-today__place")||{}).textContent||"",
      today: (document.querySelector(".wdb-r-today__lines")||{}).innerText||"",
      statuses: Array.from(document.querySelectorAll(".wdb-r-widget__status")).slice(0,4).map(e=>e.textContent),
      timeout: true
    })`);
  }

  async function seedAndOpen(hash) {
    await goto(BASE + "/apps/dashboard/");
    await evalJs(`(() => {
      const loc = ${JSON.stringify(PIKE)};
      localStorage.clear();
      localStorage.setItem("wds-location-v3", JSON.stringify(loc));
      localStorage.setItem("wds-location-prompted", "1");
      if (window.WDS && WDS.location && WDS.location.writeStored) {
        WDS.location.writeStored(loc, { silent: true });
      }
      return true;
    })()`);
    await send("Page.reload", { ignoreCache: true });
    await delay(3000);
    await evalJs(`(() => {
      const mount = document.getElementById("wds-location-prompt");
      if (mount) mount.innerHTML = "";
      return true;
    })()`);
    /* Re-pin seeded place (bootstrap may IP-overwrite) and force OIP hydrate for capture. */
    const hydrate = await evalJs(`(async () => {
      const loc = ${JSON.stringify(PIKE)};
      if (WDS.location && WDS.location.writeStored) WDS.location.writeStored(loc, { silent: true });
      if (WDS.dashboardRebuild && WDS.dashboardRebuild.setPlaceContext) {
        WDS.dashboardRebuild.setPlaceContext({
          placeLabel: loc.displayTitle,
          displayTitle: loc.displayTitle,
          trust: "cached",
          source: loc.source,
          lat: loc.lat,
          lng: loc.lng,
          timezone: loc.timezone
        });
      }
      if (WDS.outdoorIntelligence && WDS.outdoorIntelligence.configure) {
        WDS.outdoorIntelligence.configure({
          contentEngineBase: "../../design-system/content-engine/",
          includeWeather: true
        });
      }
      if (WDS.weather && WDS.weather.configure) {
        WDS.weather.configure({ provider: "open-meteo", fallback: true });
      }
      let platform = await WDS.outdoorIntelligence.get({
        location: loc,
        contentEngineBase: "../../design-system/content-engine/",
        includeWeather: true
      });
      const wx = platform && platform.weatherRef;
      if ((!wx || (wx.meta && wx.meta.isPlaceholder)) && WDS.weather && WDS.weather.setProvider) {
        const prev = (WDS.weather.getActiveProvider && WDS.weather.getActiveProvider().id) || "open-meteo";
        try {
          WDS.weather.setProvider("nws");
          const liveWx = await WDS.weather.getForecast({
            location: loc, lat: loc.lat, lng: loc.lng, timezone: loc.timezone, fallback: false
          });
          if (liveWx && liveWx.meta && !liveWx.meta.isPlaceholder) {
            platform.weatherRef = liveWx;
            if (WDS.daylightUtils && WDS.daylightUtils.enrichFromWeather) {
              platform.daylight = WDS.daylightUtils.enrichFromWeather(liveWx, platform.daylight || {});
            }
          }
        } catch (e) {}
        try { WDS.weather.setProvider(prev); } catch (e2) {}
      }
      WDS.dashboardRebuild.setPlatform(platform);
      return {
        place: (document.querySelector(".wdb-r-today__place") || {}).textContent || "",
        facts: document.querySelectorAll(".wdb-r-widget__facts").length,
        today: (document.querySelector(".wdb-r-today__lines") || {}).innerText || ""
      };
    })()`);
    if (hash && hash !== "#/") {
      await goto(BASE + "/apps/dashboard/" + hash);
      await delay(2000);
      await evalJs(`(async () => {
        const loc = ${JSON.stringify(PIKE)};
        if (WDS.location && WDS.location.writeStored) WDS.location.writeStored(loc, { silent: true });
        const platform = WDS.outdoorIntelligence.getLast && WDS.outdoorIntelligence.getLast();
        if (platform && WDS.dashboardRebuild.setPlatform) WDS.dashboardRebuild.setPlatform(platform);
        if (WDS.dashboardRebuild.setPlaceContext) {
          WDS.dashboardRebuild.setPlaceContext({
            placeLabel: loc.displayTitle,
            trust: "cached",
            source: loc.source,
            lat: loc.lat,
            lng: loc.lng
          });
        }
        return true;
      })()`);
      await delay(1000);
    }
    const waited = await waitHydrated(15000);
    return Object.assign({}, hydrate || {}, waited || {});
  }

  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  const desktopMeta = await seedAndOpen("#/");
  console.log("desktop hydrate", desktopMeta);
  await shot("01-desktop-workspace.png");

  await goto(BASE + "/apps/dashboard/#/customize");
  await delay(1500);
  await evalJs(`(() => {
    if (WDS.dashboardRebuildPrefs) {
      WDS.dashboardRebuildPrefs.setFavorite("ph-astronomy", true);
      WDS.dashboardRebuildPrefs.setGridColumns(2);
    }
    if (WDS.dashboardRebuildCustomize && WDS.dashboardRebuildCustomize.setLibraryFilter) {
      WDS.dashboardRebuildCustomize.setLibraryFilter("all");
    }
    if (WDS.dashboardRebuild && WDS.dashboardRebuild.paint) WDS.dashboardRebuild.paint({ animate: false });
    return true;
  })()`);
  await delay(800);
  await shot("02-desktop-customize.png");

  await goto(BASE + "/apps/dashboard/#/kiosk");
  await delay(2000);
  await waitHydrated(10000);
  await shot("03-desktop-kiosk.png");

  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  const phoneMeta = await seedAndOpen("#/");
  console.log("phone hydrate", phoneMeta);
  await shot("04-phone-workspace.png");

  await goto(BASE + "/apps/dashboard/#/customize");
  await delay(1500);
  await evalJs(`(() => {
    if (WDS.dashboardRebuildPrefs) {
      WDS.dashboardRebuildPrefs.setGridColumns(1);
    }
    if (WDS.dashboardRebuild && WDS.dashboardRebuild.paint) WDS.dashboardRebuild.paint({ animate: false });
    return true;
  })()`);
  await delay(800);
  await shot("05-phone-customize.png");

  const phoneSizes = [
    [320, 568, "06-phone-320-workspace.png"],
    [375, 812, "07-phone-375-workspace.png"],
    [430, 932, "08-phone-430-workspace.png"],
    [768, 1024, "09-tablet-768-workspace.png"]
  ];
  const overflowChecks = [];
  for (const [w, h, name] of phoneSizes) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: w,
      height: h,
      deviceScaleFactor: w <= 430 ? 2 : 1,
      mobile: w < 768
    });
    await seedAndOpen("#/");
    const check = await evalJs(`({
      width: ${w},
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      groups: document.querySelectorAll(".wdb-r-group").length,
      widgets: document.querySelectorAll(".wdb-r-widget").length,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    })`);
    overflowChecks.push(check);
    await shot(name);
  }

  fs.writeFileSync(
    path.join(OUT, "capture-meta.json"),
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        base: BASE,
        sprint: "dashboard-rc25-sprint6",
        desktopMeta,
        phoneMeta,
        overflowChecks,
        notes:
          "Polish capture: family groups, denser cards, skeletons. Customize seeds favorite Astronomy + columns."
      },
      null,
      2
    )
  );

  ws.close();
  chrome.proc.kill("SIGTERM");
  console.log("done dashboard-rc25-sprint6");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
