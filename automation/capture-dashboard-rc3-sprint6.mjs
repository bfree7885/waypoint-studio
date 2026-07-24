#!/usr/bin/env node
/**
 * Dashboard RC3 Sprint 6 — mobile recovery captures (320–430 widths).
 * Usage: node automation/capture-dashboard-rc3-sprint6.mjs [baseUrl]
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
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9416);
const OUT = path.join(ROOT, "docs/rebuild-2026/dashboard-rc3-sprint6");

const VIEWPORTS = [
  { id: "320x568", width: 320, height: 568 },
  { id: "375x667", width: 375, height: 667 },
  { id: "390x844", width: 390, height: 844 },
  { id: "393x852", width: 393, height: 852 },
  { id: "430x932", width: 430, height: 932 }
];

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

const MOCK_PLATFORM = {
  meta: { fromCache: false, blockStatus: { weather: "live", airQuality: "live", daylight: "live", alerts: "live" } },
  weatherRef: {
    meta: { isPlaceholder: false, provider: "open-meteo", fetchedAt: new Date().toISOString() },
    current: {
      temperature: 72,
      feelsLike: 70,
      humidity: 55,
      cloudCover: 20,
      uvIndex: 6,
      wind: { speed: 4, gust: 7 },
      precipitation: { probability: 10, amount: 0 },
      conditions: { summary: "Partly cloudy" }
    },
    hourly: [
      { time: "2026-07-24T16:00:00-04:00", temperature: 73, precipitation: { probability: 15 }, conditions: { summary: "Partly cloudy" } },
      { time: "2026-07-24T17:00:00-04:00", temperature: 74, precipitation: { probability: 20 }, conditions: { summary: "Mostly cloudy" } }
    ],
    daily: [
      { temperatureHigh: 78, temperatureLow: 58, precipitation: { probability: 25 }, conditions: { summary: "Partly cloudy" }, uvIndex: 7 }
    ]
  },
  daylight: {
    status: "live",
    sunriseFormatted: "5:52 AM",
    sunsetFormatted: "8:24 PM",
    goldenHourEvening: "7:24–8:24 PM",
    goldenHourStatus: "estimated",
    blueHourEvening: "8:24–8:54 PM",
    blueHourStatus: "estimated",
    moonPhase: "Waxing Crescent",
    moonIllumination: 32,
    moonrise: null,
    moonset: null
  },
  airQuality: { status: "live", aqi: 42, category: "Good", pm25: 8 },
  alerts: { status: "live", items: [], count: 0 },
  usgsWater: {
    status: "live",
    trust: "Live",
    nearest: { name: "Delaware River at Port Jervis", stageFt: 3.4, flowCfs: 2100, trend: "steady" }
  }
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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wdb-rc3s6-"));
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
  await send("Emulation.clearDeviceMetricsOverride").catch(() => {});

  async function evalJs(expression) {
    const r = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    return r.result && r.result.value;
  }

  async function goto(url) {
    await send("Page.navigate", { url });
    await delay(2000);
  }

  async function shot(name) {
    const result = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false
    });
    const file = path.join(OUT, name);
    fs.writeFileSync(file, Buffer.from(result.data, "base64"));
    console.log("wrote", file);
    return file;
  }

  async function setViewport(vp) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 2,
      mobile: true
    });
  }

  const meta = {
    base: BASE,
    capturedAt: new Date().toISOString(),
    viewports: [],
    gates: []
  };

  for (const vp of VIEWPORTS) {
    await setViewport(vp);
    await goto(BASE + "/apps/dashboard/");
    await evalJs(`(() => {
      const loc = ${JSON.stringify(PIKE)};
      localStorage.clear();
      localStorage.setItem("wds-location-v3", JSON.stringify(loc));
      localStorage.setItem("wds-location-prompted", "1");
      localStorage.setItem("waypoint-dashboard-rebuild-prefs-v1", JSON.stringify({
        version: 1,
        enabled: ["ph-conditions","ph-hourly","ph-alerts","ph-air","ph-light","ph-moon","ph-rivers","ph-wind","ph-uv"],
        order: ["ph-conditions","ph-hourly","ph-alerts","ph-air","ph-light","ph-moon","ph-rivers","ph-wind","ph-uv"],
        sizes: {},
        favorites: [],
        gridColumns: 3,
        preset: "default",
        kioskRefreshMs: 300000,
        interests: ["general"]
      }));
      return true;
    })()`);
    await goto(BASE + "/apps/dashboard/#/");
    await delay(1500);
    await evalJs(`(() => {
      const platform = ${JSON.stringify(MOCK_PLATFORM)};
      if (window.WDS && WDS.dashboardRebuild && WDS.dashboardRebuild.setPlatform) {
        WDS.dashboardRebuild.setPlatform(platform);
      }
      return !!(window.WDS && WDS.dashboardRebuild);
    })()`);
    await delay(800);

    const metrics = await evalJs(`(() => {
      const widgets = Array.from(document.querySelectorAll(".wdb-r-widget"));
      const grid = document.querySelector(".wdb-r-workspace__grid");
      const gridBox = grid ? grid.getBoundingClientRect() : null;
      const widths = widgets.map((w) => Math.round(w.getBoundingClientRect().width));
      const minW = widths.length ? Math.min.apply(null, widths) : 0;
      const maxW = widths.length ? Math.max.apply(null, widths) : 0;
      const comingSoon = /Coming Soon|coming soon|Waiting for river|Photography windows coming/i.test(document.body.innerText);
      const hScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
      const halfWidth = gridBox && minW > 0 ? minW < gridBox.width * 0.7 : false;
      return {
        widgetCount: widgets.length,
        widths: widths.slice(0, 12),
        minW: minW,
        maxW: maxW,
        gridW: gridBox ? Math.round(gridBox.width) : null,
        comingSoon: comingSoon,
        hScroll: hScroll,
        halfWidth: halfWidth,
        titles: Array.from(document.querySelectorAll(".wdb-r-widget__title")).slice(0, 8).map((e) => e.textContent.trim())
      };
    })()`);

    const file = await shot("phone-" + vp.id + "-workspace.png");
    const gate = {
      viewport: vp.id,
      file: path.basename(file),
      metrics,
      pass:
        metrics &&
        metrics.widgetCount >= 6 &&
        !metrics.comingSoon &&
        !metrics.hScroll &&
        !metrics.halfWidth &&
        metrics.minW >= Math.min(vp.width - 48, 260)
    };
    meta.viewports.push(gate);
    meta.gates.push({
      id: vp.id,
      pass: gate.pass,
      reason: gate.pass
        ? "full-width tiles, no Coming Soon, no h-scroll"
        : JSON.stringify(metrics)
    });
    console.log(vp.id, gate.pass ? "PASS" : "FAIL", metrics);
  }

  // Customize picker at 390
  await setViewport(VIEWPORTS[2]);
  await goto(BASE + "/apps/dashboard/#/customize");
  await delay(1200);
  await shot("phone-390x844-customize.png");
  const picker = await evalJs(`({
    comingSoon: /Coming Soon/i.test(document.body.innerText),
    catalogCount: document.querySelectorAll(".wdb-r-catalog__item").length
  })`);
  meta.customize = picker;
  meta.gates.push({
    id: "customize-390",
    pass: picker && !picker.comingSoon && picker.catalogCount >= 12,
    reason: JSON.stringify(picker)
  });

  fs.writeFileSync(path.join(OUT, "capture-meta.json"), JSON.stringify(meta, null, 2));
  console.log("meta", path.join(OUT, "capture-meta.json"));
  const failed = meta.gates.filter((g) => !g.pass);
  ws.close();
  chrome.proc.kill("SIGTERM");
  if (failed.length) {
    console.error("GATE FAILURES", failed);
    process.exit(1);
  }
  console.log("All mobile gates passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
