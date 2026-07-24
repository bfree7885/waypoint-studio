#!/usr/bin/env node
/**
 * Capture Dashboard RC3 Sprint 1 intelligence screenshots (fixture hydrate — no live APIs required).
 * Usage: node automation/capture-dashboard-rc3-sprint1.mjs [baseUrl]
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
const OUT = path.join(ROOT, "docs/rebuild-2026/dashboard-rc3-sprint1");

const PLATFORM = {
  meta: { fromCache: false },
  weatherRef: {
    meta: { isPlaceholder: false, provider: "fixture" },
    current: {
      temperature: 68,
      feelsLike: 67,
      humidity: 52,
      cloudCover: 40,
      wind: { speed: 6, gust: 9 },
      precipitation: { probability: 15 },
      conditions: { summary: "Partly cloudy" },
      uvIndex: 5
    },
    hourly: [
      {
        time: new Date(Date.now() + 3600000).toISOString(),
        temperature: 66,
        feelsLike: 66,
        cloudCover: 45,
        precipitation: { probability: 10 },
        wind: { speed: 5 }
      },
      {
        time: new Date(Date.now() + 9 * 3600000).toISOString(),
        temperature: 70,
        feelsLike: 70,
        cloudCover: 55,
        precipitation: { probability: 20 },
        wind: { speed: 7 }
      }
    ],
    daily: [{ uvIndex: 5 }]
  },
  daylight: {
    sunriseFormatted: "5:55 AM",
    sunsetFormatted: "8:20 PM",
    goldenHourEvening: "7:20–8:20 PM",
    moonPhase: "Waxing Crescent",
    moonIllumination: 28
  },
  airQuality: { status: "live", usAqi: 38, category: "Good", pm25: 7 },
  alerts: { items: [] }
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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wdb-rc3s1-"));
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
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result && r.result.value;
  }

  async function seedWorkspace() {
    await goto(BASE + "/apps/dashboard/#/");
    await delay(2000);
    const meta = await evalJs(`(() => {
      const loc = {
        placeLabel: "Pike County, PA",
        displayTitle: "Pike County, PA",
        trust: "partial",
        source: "manual",
        lat: 41.34,
        lng: -75.04
      };
      const platform = ${JSON.stringify(PLATFORM)};
      const mount = document.getElementById("wds-location-prompt");
      if (mount) mount.innerHTML = "";
      if (WDS.dashboardRebuild && WDS.dashboardRebuild.setPlaceContext) {
        WDS.dashboardRebuild.setPlaceContext(loc);
      }
      if (WDS.dashboardRebuild && WDS.dashboardRebuild.setPlatform) {
        WDS.dashboardRebuild.setPlatform(platform);
      }
      return {
        score: !!(document.querySelector("[data-wdb-r-score]")),
        take: !!(document.querySelector("[data-wdb-r-take]")),
        activities: document.querySelectorAll(".wdb-r-today__activity").length,
        place: (document.querySelector(".wdb-r-today__place") || {}).textContent || ""
      };
    })()`);
    await delay(500);
    return meta;
  }

  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  const desktopMeta = await seedWorkspace();
  console.log("desktop", desktopMeta);
  await shot("01-desktop-workspace.png");

  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  const phoneMeta = await seedWorkspace();
  console.log("phone", phoneMeta);
  await shot("02-phone-workspace.png");

  fs.writeFileSync(
    path.join(OUT, "capture-meta.json"),
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        base: BASE,
        sprint: "dashboard-rc3-sprint1",
        mode: "fixture-platform",
        desktopMeta,
        phoneMeta
      },
      null,
      2
    )
  );

  ws.close();
  chrome.proc.kill("SIGTERM");
  console.log("done dashboard-rc3-sprint1");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
