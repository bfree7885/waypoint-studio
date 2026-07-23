#!/usr/bin/env node
/**
 * Capture Home RC1.1 screenshots (desktop + phone) after nav/Kiosk fix.
 * Usage: node automation/capture-home-rc1.1.mjs [baseUrl]
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
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9396);
const OUT = path.join(ROOT, "docs/rebuild-2026/home-rc1.1");

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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wdb-home-rc11-"));
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
      WDS.dashboardRebuild.setPlatform(platform);
      await new Promise((r) => setTimeout(r, 800));
      const localNav = Array.from(document.querySelectorAll(".was-local__nav a")).map((a) => a.textContent.trim());
      return {
        title: document.title,
        productName: document.querySelector("[data-product-name]")?.getAttribute("data-product-name"),
        rebuild: !!document.querySelector("[data-wdb-r]"),
        localNav,
        hasKioskNav: localNav.includes("Kiosk"),
        hasKioskChrome: !!document.querySelector("[data-wdb-r-kiosk-chrome], .wdb-r-kiosk-chrome"),
        footerText: (document.querySelector(".was-footer") || {}).innerText || ""
      };
    })()`);
  }

  const meta = { base: BASE, place: PIKE.displayTitle, captures: [] };

  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  const desk = await seedHome("/", "design-system/content-engine/");
  console.log("desktop", desk);
  if (desk.hasKioskNav || desk.hasKioskChrome) {
    throw new Error("Kiosk still user-facing on desktop Home");
  }
  await shot("01-desktop-home-workspace.png");
  meta.captures.push({ file: "01-desktop-home-workspace.png", entry: "/", viewport: "desktop", meta: desk });

  await goto(BASE + "/#/customize");
  await delay(1500);
  const customizeMeta = await evalJs(`(() => {
    const text = document.body.innerText || "";
    return {
      hasKioskLayout: /Kiosk layout/i.test(text),
      hasKioskWord: /\\bKiosk\\b/.test(text),
      toolbar: (document.querySelector("[data-wdb-r-customize-bar]") || {}).innerText || ""
    };
  })()`);
  console.log("customize", customizeMeta);
  if (customizeMeta.hasKioskLayout || customizeMeta.hasKioskWord) {
    throw new Error("Kiosk still labeled in Customize");
  }
  await shot("02-desktop-home-customize.png");
  meta.captures.push({ file: "02-desktop-home-customize.png", entry: "/#/customize", viewport: "desktop", meta: customizeMeta });

  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  const phone = await seedHome("/", "design-system/content-engine/");
  console.log("phone", phone);
  if (phone.hasKioskNav || phone.hasKioskChrome) {
    throw new Error("Kiosk still user-facing on phone Home");
  }
  await shot("03-phone-home-workspace.png");
  meta.captures.push({ file: "03-phone-home-workspace.png", entry: "/", viewport: "phone", meta: phone });

  await goto(BASE + "/#/customize");
  await delay(1500);
  await shot("04-phone-home-customize.png");
  meta.captures.push({ file: "04-phone-home-customize.png", entry: "/#/customize", viewport: "phone" });

  fs.writeFileSync(path.join(OUT, "capture-meta.json"), JSON.stringify(meta, null, 2));
  console.log("wrote capture-meta.json");

  ws.close();
  chrome.proc.kill("SIGTERM");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
