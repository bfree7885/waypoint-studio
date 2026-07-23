#!/usr/bin/env node
/**
 * Capture Home RC1 screenshots (desktop / tablet / phone) for `/` and alias.
 * Usage: node automation/capture-home-rc1.mjs [baseUrl]
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
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9394);
const OUT = path.join(ROOT, "docs/rebuild-2026/home-rc1");

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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wdb-home-rc1-"));
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

  async function seedHome(entryPath, engineBase) {
    await goto(BASE + entryPath);
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
    return evalJs(`(async () => {
      const loc = ${JSON.stringify(PIKE)};
      const engineBase = ${JSON.stringify(engineBase)};
      if (WDS.location && WDS.location.writeStored) WDS.location.writeStored(loc, { silent: true });
      if (WDS.dashboardRebuild && WDS.dashboardRebuild.setPlaceContext) {
        WDS.dashboardRebuild.setPlaceContext({
          placeLabel: loc.displayTitle,
          displayTitle: loc.displayTitle,
          trust: "cached",
          source: loc.source,
          lat: loc.lat,
          lng: loc.lng
        });
      }
      if (WDS.outdoorIntelligence && WDS.outdoorIntelligence.configure) {
        WDS.outdoorIntelligence.configure({ contentEngineBase: engineBase, includeWeather: true });
      }
      if (WDS.weather && WDS.weather.configure) {
        WDS.weather.configure({ provider: "open-meteo", fallback: true });
      }
      let platform = await WDS.outdoorIntelligence.get({
        location: loc,
        contentEngineBase: engineBase,
        includeWeather: true
      });
      const wx = platform && platform.weatherRef;
      if ((!wx || (wx.meta && wx.meta.isPlaceholder)) && WDS.weather && WDS.weather.setProvider) {
        const prev = (WDS.weather.getActiveProvider && WDS.weather.getActiveProvider().id) || "open-meteo";
        try {
          WDS.weather.setProvider("nws");
          const liveWx = await WDS.weather.getForecast({
            location: loc, lat: loc.lat, lng: loc.lng, fallback: false
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
      await new Promise((r) => setTimeout(r, 800));
      return {
        title: document.title,
        productName: document.querySelector("[data-product-name]")?.getAttribute("data-product-name"),
        rebuild: !!document.querySelector("[data-wdb-r]"),
        deepen: !!document.querySelector("[data-wdb-r-deepen]"),
        articles: !!document.querySelector('[data-deepen="articles"]'),
        widgets: Array.from(document.querySelectorAll("[data-widget-id]")).map((e) => e.getAttribute("data-widget-id")),
        place: (document.querySelector(".wdb-r-today__place") || {}).textContent || "",
        today: (document.querySelector(".wdb-r-today__lines") || {}).innerText || ""
      };
    })()`);
  }

  const meta = { base: BASE, place: PIKE.displayTitle, captures: [] };

  const viewports = [
    { name: "desktop", width: 1440, height: 900, mobile: false },
    { name: "tablet", width: 834, height: 1112, mobile: true },
    { name: "phone", width: 390, height: 844, mobile: true }
  ];

  for (const vp of viewports) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.mobile
    });

    const rootMeta = await seedHome("/", "design-system/content-engine/");
    console.log(vp.name, "root", rootMeta);
    await shot(`0${viewports.indexOf(vp) + 1}-${vp.name}-home-root.png`);
    meta.captures.push({ file: `0${viewports.indexOf(vp) + 1}-${vp.name}-home-root.png`, entry: "/", viewport: vp, meta: rootMeta });

    await evalJs(`(() => {
      const el = document.querySelector("[data-wdb-r-deepen]");
      if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
      return !!el;
    })()`);
    await delay(400);
    await shot(`0${viewports.indexOf(vp) + 4}-${vp.name}-home-deepeners.png`);
    meta.captures.push({
      file: `0${viewports.indexOf(vp) + 4}-${vp.name}-home-deepeners.png`,
      entry: "/#deepeners",
      viewport: vp
    });
  }

  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  const aliasMeta = await seedHome("/apps/dashboard/", "../../design-system/content-engine/");
  console.log("alias desktop", aliasMeta);
  await shot("07-desktop-alias-dashboard.png");
  meta.captures.push({ file: "07-desktop-alias-dashboard.png", entry: "/apps/dashboard/", viewport: viewports[0], meta: aliasMeta });

  fs.writeFileSync(path.join(OUT, "capture-meta.json"), JSON.stringify(meta, null, 2));
  console.log("wrote capture-meta.json");

  ws.close();
  chrome.proc.kill("SIGTERM");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
