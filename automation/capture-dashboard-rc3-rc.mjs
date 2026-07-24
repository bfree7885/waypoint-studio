#!/usr/bin/env node
/**
 * Capture Dashboard RC3 RC3 release candidate screenshots (fixture hydrate — no live APIs required).
 * Usage: node automation/capture-dashboard-rc3-rc.mjs [baseUrl]
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
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9403);
const OUT = path.join(ROOT, "docs/rebuild-2026/dashboard-rc3-rc");

const PLATFORM = {
  meta: { fromCache: false },
  weatherRef: {
    meta: { isPlaceholder: false, provider: "fixture", observedAt: "2026-07-24T08:30:00-04:00" },
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
        temperature: 74,
        feelsLike: 74,
        cloudCover: 55,
        precipitation: { probability: 40 },
        wind: { speed: 7 }
      }
    ],
    daily: [
      { uvIndex: 5, temperatureMax: 78, temperatureMin: 58, precipitation: { probability: 15 } },
      { uvIndex: 6, temperatureMax: 84, temperatureMin: 62, precipitation: { probability: 45 } },
      { uvIndex: 4, temperatureMax: 76, temperatureMin: 56, precipitation: { probability: 20 } }
    ]
  },
  daylight: {
    sunriseFormatted: "5:55 AM",
    sunsetFormatted: "8:20 PM",
    goldenHourEvening: "7:20–8:20 PM",
    moonPhase: "Waxing Crescent",
    moonIllumination: 28
  },
  airQuality: { status: "live", usAqi: 38, category: "Good", pm25: 7 },
  alerts: { items: [] },
  rivers: { sites: [{ name: "Delaware River", trend: "stable" }] }
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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wdb-rc3rc-"));
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
  await send("DOM.enable");

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

  async function seedWorkspace(interests) {
    await goto(BASE + "/apps/dashboard/#/");
    await delay(2000);
    const interestJson = JSON.stringify(interests || ["photography", "wildlife"]);
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
      const interests = ${interestJson};
      const mount = document.getElementById("wds-location-prompt");
      if (mount) mount.innerHTML = "";
      if (WDS.dashboardRebuildPrefs) {
        try {
          if (WDS.dashboardRebuildPrefs.isDrafting && WDS.dashboardRebuildPrefs.isDrafting()) {
            WDS.dashboardRebuildPrefs.discardDraft();
          }
          WDS.dashboardRebuildPrefs.setInterests(interests);
        } catch (e) {}
      }
      if (WDS.dashboardRebuild && WDS.dashboardRebuild.setPlaceContext) {
        WDS.dashboardRebuild.setPlaceContext(loc);
      }
      if (WDS.dashboardRebuild && WDS.dashboardRebuild.setPlatform) {
        WDS.dashboardRebuild.setPlatform(platform);
      }
      const brief = document.querySelector("[data-wdb-r-brief]");
      const discover = document.querySelector("[data-wdb-r-discover]");
      const firstAct = document.querySelector(".wdb-r-today__activity");
      const firstCard = document.querySelector("[data-discover-card]");
      return {
        score: !!(document.querySelector("[data-wdb-r-score]")),
        brief: !!brief,
        discovery: !!discover,
        edu: !!(document.querySelector("[data-wdb-r-edu]")),
        week: !!(document.querySelector("[data-wdb-r-week]")),
        cards: document.querySelectorAll("[data-discover-card]").length,
        outlook: !!(document.getElementById("wdb-r-today-outlook-title")),
        take: !!(document.querySelector("[data-wdb-r-take]")),
        activities: document.querySelectorAll(".wdb-r-today__activity").length,
        firstActivity: firstAct ? (firstAct.innerText || "").slice(0, 80) : "",
        firstCard: firstCard ? firstCard.getAttribute("data-discover-card") : "",
        interests: interests,
        place: (document.querySelector(".wdb-r-today__place") || {}).textContent || "",
        takeText: (document.querySelector("[data-wdb-r-take]") || {}).innerText || "",
        discoverText: discover ? (discover.innerText || "").slice(0, 320) : ""
      };
    })()`);
    await delay(500);
    return meta;
  }

  async function seedCustomize() {
    await goto(BASE + "/apps/dashboard/#/customize");
    await delay(2000);
    return evalJs(`(() => {
      const root = document.querySelector("[data-wdb-r-customize]");
      const interests = document.querySelector("[data-wdb-r-interests]");
      return {
        customize: !!root,
        interests: !!interests,
        interestRows: document.querySelectorAll(".wdb-r-interests__item").length,
        preview: (document.querySelector(".wdb-r-interests__preview") || {}).textContent || "",
        save: !!document.querySelector('[data-wdb-r-action="save"]'),
        cancel: !!document.querySelector('[data-wdb-r-action="cancel"]')
      };
    })()`);
  }

  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  const desktopMeta = await seedWorkspace(["photography", "hiking"]);
  console.log("desktop", desktopMeta);
  await shot("01-desktop-workspace.png");

  const customizeMeta = await seedCustomize();
  console.log("customize", customizeMeta);
  await shot("02-desktop-customize-interests.png");

  /* Return to personalized workspace for Brief + Discovery close-up. */
  await seedWorkspace(["photography", "hiking"]);

  const clip = await evalJs(`(() => {
    const brief = document.querySelector("[data-wdb-r-brief]");
    const discover = document.querySelector("[data-wdb-r-discover]");
    if (!brief && !discover) return null;
    const nodes = [brief, discover].filter(Boolean);
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    nodes.forEach((el) => {
      const r = el.getBoundingClientRect();
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.width);
      maxY = Math.max(maxY, r.y + r.height);
    });
    return {
      x: Math.max(0, minX - 8),
      y: Math.max(0, minY - 8),
      width: Math.ceil(maxX - minX + 16),
      height: Math.ceil(maxY - minY + 16)
    };
  })()`);
  if (clip && clip.width > 40 && clip.height > 40) {
    const result = await send("Page.captureScreenshot", {
      format: "png",
      clip: { x: clip.x, y: clip.y, width: clip.width, height: clip.height, scale: 1 }
    });
    const file = path.join(OUT, "03-desktop-discovery.png");
    fs.writeFileSync(file, Buffer.from(result.data, "base64"));
    console.log("wrote", file);
  }

  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  const phoneMeta = await seedWorkspace(["astronomy", "wildlife"]);
  console.log("phone", phoneMeta);
  await shot("04-phone-workspace.png");

  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  const phoneCustomize = await seedCustomize();
  console.log("phoneCustomize", phoneCustomize);
  await shot("05-phone-customize-interests.png");


  fs.writeFileSync(
    path.join(OUT, "capture-meta.json"),
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        base: BASE,
        sprint: "dashboard-rc3-rc",
        mode: "fixture-platform",
        desktopMeta,
        customizeMeta,
        phoneMeta,
        phoneCustomize
      },
      null,
      2
    )
  );

  ws.close();
  try {
    chrome.proc.kill("SIGTERM");
  } catch (_) {}
  console.log("done dashboard-rc3-rc");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
