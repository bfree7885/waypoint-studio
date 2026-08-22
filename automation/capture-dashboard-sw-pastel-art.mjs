#!/usr/bin/env node
/**
 * Capture Dashboard SW pastel + unique instrument art at desktop/tablet/phone widths.
 * Usage: node automation/capture-dashboard-sw-pastel-art.mjs [baseUrl]
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
const BASE = (process.argv[2] || "http://127.0.0.1:8766").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9411);
const OUT = path.join(ROOT, "docs/rebuild-2026/screenshots-dashboard-sw-pastel");

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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wdb-sw-pastel-"));
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
    await delay(2200);
  }

  async function shot(name, beyond) {
    const result = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: beyond !== false
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

  async function setViewport(width, height, mobile) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: !!mobile
    });
  }

  /* Art matrix — proves uniqueness independent of live weather */
  await setViewport(1440, 900, false);
  await goto(BASE + "/docs/rebuild-2026/dashboard-sw-art-matrix.html");
  await delay(600);
  await shot("00-art-matrix-desktop.png");
  await setViewport(375, 900, true);
  await delay(300);
  await shot("00-art-matrix-375.png");

  async function seedDashboard() {
    await goto(BASE + "/apps/dashboard/");
    await evalJs(`(() => {
      const loc = ${JSON.stringify(PIKE)};
      localStorage.clear();
      localStorage.setItem("wds-location-v3", JSON.stringify(loc));
      localStorage.setItem("wds-location-prompted", "1");
      localStorage.setItem("waypoint-location-prompt-dismissed", "1");
      return true;
    })()`);
    await send("Page.reload", { ignoreCache: true });
    await delay(2800);
    await evalJs(`(async () => {
      const loc = ${JSON.stringify(PIKE)};
      const mount = document.getElementById("wds-location-prompt");
      if (mount) mount.innerHTML = "";
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
      if (WDS.dashboardRebuild.setPlatform) WDS.dashboardRebuild.setPlatform(platform);
      return {
        place: (document.querySelector(".wdb-r-today__place") || {}).textContent || "",
        tiles: document.querySelectorAll(".wdb-r-widget").length,
        scenes: Array.from(document.querySelectorAll(".wdb-r-widget__art")).map((el) => el.getAttribute("data-scene"))
      };
    })()`);
    await delay(1500);
  }

  const viewports = [
    [1440, 900, false, "01-desktop-1440"],
    [768, 1024, true, "02-tablet-768"],
    [375, 812, true, "03-iphone-375"],
    [390, 844, true, "04-iphone-390"],
    [430, 932, true, "05-iphone-430"]
  ];

  for (const [w, h, mobile, name] of viewports) {
    await setViewport(w, h, mobile);
    await seedDashboard();
    await shot(name + "-viewport.png", false);
    await shot(name + "-workspace.png", true);
  }

  await setViewport(1440, 900, false);
  await seedDashboard();
  await goto(BASE + "/apps/dashboard/#/customize");
  await delay(1600);
  await shot("06-desktop-customize.png");

  chrome.proc.kill("SIGTERM");
  console.log("done", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
