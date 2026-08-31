#!/usr/bin/env node
/**
 * Today's Hunt V1.2 — mobile overflow at 320 / 375 / 390 / 430.
 * Serves the dedicated-host overview, injects a rated V1.2 card, measures layout.
 *
 * Run: node automation/test-sheds-today-hunt-mobile.mjs
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
const DBG = Number(process.env.WAYPOINT_CDP_PORT || 9344);
const PORT = Number(process.env.SHED_HUNT_MOBILE_PORT || 8094);
const ART = process.env.SHED_HOST_ARTIFACTS ||
  (fs.existsSync("/opt/cursor/artifacts")
    ? "/opt/cursor/artifacts"
    : path.join(ROOT, "automation/artifacts/todays-hunt-v12"));
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
    console.log("FAIL", name, detail || "");
  }
}

function contentType(file) {
  return ({
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png",
    ".woff2": "font/woff2"
  })[extname(file).toLowerCase()] || "application/octet-stream";
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
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
    } catch (e) { /* starting */ }
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
      if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      const st = fs.statSync(file);
      if (!st.isFile()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "Content-Type": contentType(file), "Cache-Control": "no-store" });
      res.end(fs.readFileSync(file));
    } catch (e) {
      res.writeHead(404); res.end("missing");
    }
  });
  await new Promise((r) => server.listen(PORT, "127.0.0.1", () => r()));

  const userData = fs.mkdtempSync(path.join("/tmp", "chrome-hunt-v12-"));
  const proc = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
    "--user-data-dir=" + userData,
    "--remote-debugging-port=" + DBG, "about:blank"
  ], { stdio: "ignore" });

  try {
    const page = await waitForTab().catch(async function () {
      await new Promise(function (resolve, reject) {
        const req = http.get("http://127.0.0.1:" + DBG + "/json/new?about:blank", function (res) {
          let d = "";
          res.on("data", function (c) { d += c; });
          res.on("end", function () { resolve(d); });
        });
        req.on("error", reject);
      });
      return waitForTab();
    });
    const wsPath = path.join(ROOT, "node_modules/ws/index.js");
    if (!fs.existsSync(wsPath)) {
      throw new Error("ws module missing — npm install ws");
    }
    const WebSocket = (await import(wsPath)).default;
    const ws = new WebSocket(page.webSocketDebuggerUrl);
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

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Page.navigate", { url: "http://127.0.0.1:" + PORT + "/apps/shed-hunting/host/" });
    await send("Page.loadEventFired").catch(() => {});
    await delay(1200);

    await send("Runtime.evaluate", {
      expression: `(() => {
        var Hunt = window.WaypointShedsTodayHunt;
        var Wx = window.WaypointShedsWeather;
        if (!Hunt || !Wx) return { ok: false, reason: "missing modules" };
        var now = new Date("2026-02-15T14:00:00");
        var times = [];
        var temps = [];
        for (var d = 13; d <= 16; d++) {
          for (var h = 0; h < 24; h++) {
            var iso = "2026-02-" + String(d).padStart(2, "0") + "T" + String(h).padStart(2, "0") + ":00:00";
            times.push(iso);
            if (d === 14 && h >= 18) temps.push(-4);
            else if (d === 15 && h < 8) temps.push(-3);
            else if (d === 15 && h >= 10 && h <= 16) temps.push(5);
            else temps.push(0);
          }
        }
        var wx = {
          ready: true,
          tempC: 4,
          windSpeedMs: 4,
          snowMm: 6,
          precipNowMm: 0,
          sunriseHour: 7,
          sunsetHour: 17.6,
          hourlyTimes: times,
          hourlyTemps: temps,
          hourlyPrecip: times.map(function () { return 0; }),
          hourlyWinds: times.map(function () { return 4; }),
          snowDepthKnown: true,
          snowDepthM: 0.04,
          snowCover: Wx.classifySnowDepth(0.04, true),
          freezeThaw: Wx.deriveFreezeThaw({
            hourlyTimes: times,
            hourlyTemps: temps,
            todayDateStr: "2026-02-15",
            now: now
          }),
          tempTrend: Wx.deriveTempTrend(times, temps, now)
        };
        var hunt = Hunt.compose({
          now: now,
          location: { lat: 41.32, lng: -74.8, source: "gps" },
          weather: wx,
          weatherStatus: "ready"
        });
        Hunt.fillHuntRoot(document.getElementById("todays-hunt"), hunt, {
          includeQuestion: false,
          openMapHref: "../map/"
        });
        var prompt = document.getElementById("hunt-location-prompt");
        if (prompt) prompt.hidden = true;
        return { ok: true, band: hunt.band, conditions: (hunt.conditions || []).length };
      })()`,
      returnByValue: true
    });
    await delay(300);

    const results = [];
    for (const vp of VIEWPORTS) {
      await send("Emulation.setDeviceMetricsOverride", {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        mobile: true
      });
      await delay(250);
      const metrics = await send("Runtime.evaluate", {
        expression: `(() => {
          const doc = document.documentElement;
          const hunt = document.querySelector(".sheds-hunt");
          const cta = document.querySelector(".sheds-hunt__cta .sheds-host-btn") ||
            document.querySelector(".xp-stage__cta .sheds-host-btn");
          const conditions = document.querySelectorAll(".sheds-hunt__conditions li");
          const band = document.querySelector(".sheds-hunt__band-label");
          const today = document.querySelector(".sheds-hunt__today");
          function clipped(el) {
            if (!el) return false;
            return el.scrollWidth > el.clientWidth + 1;
          }
          const ctaRect = cta ? cta.getBoundingClientRect() : null;
          return {
            overflowX: doc.scrollWidth > doc.clientWidth + 2,
            scrollWidth: doc.scrollWidth,
            clientWidth: doc.clientWidth,
            huntClipped: clipped(hunt),
            bandClipped: clipped(band),
            todayClipped: clipped(today),
            conditionCount: conditions.length,
            conditionDense: conditions.length > 3,
            openMapVisible: !!(ctaRect && ctaRect.width >= 44 && ctaRect.height >= 40 && ctaRect.bottom > 0 && ctaRect.top < window.innerHeight),
            openMapText: cta ? cta.textContent.trim() : "",
            band: band ? band.textContent : "",
            huntWidth: hunt ? Math.round(hunt.getBoundingClientRect().width) : 0
          };
        })()`,
        returnByValue: true
      });
      const v = (metrics.result && metrics.result.value) || {};
      results.push(Object.assign({ name: vp.name, width: vp.width }, v));
      const img = await send("Page.captureScreenshot", { format: "png" });
      const file = path.join(ART, "todays_hunt_v12_" + vp.name + ".png");
      fs.writeFileSync(file, Buffer.from(img.data, "base64"));
      assert(vp.name + " no page horizontal overflow", !v.overflowX, "scroll=" + v.scrollWidth + " client=" + v.clientWidth);
      assert(vp.name + " hunt card not clipped", !v.huntClipped && !v.bandClipped && !v.todayClipped);
      assert(vp.name + " condition rows not dense", !v.conditionDense, "count=" + v.conditionCount);
      assert(vp.name + " Open Map visible", v.openMapVisible, v.openMapText);
    }

    fs.writeFileSync(path.join(ART, "todays_hunt_v12_mobile_metrics.json"), JSON.stringify(results, null, 2));
    ws.close();
  } finally {
    try { proc.kill("SIGTERM"); } catch (e) {}
    server.close();
  }

  if (failures.length) {
    console.error("\n" + failures.length + " failure(s)");
    process.exit(1);
  }
  console.log("\nToday's Hunt V1.2 mobile layout passed.");
}

main().catch(function (err) {
  console.error(err);
  process.exit(2);
});
