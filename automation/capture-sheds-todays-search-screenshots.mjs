#!/usr/bin/env node
/**
 * Capture Today's Search screenshots for owner review.
 * Run: node automation/capture-sheds-todays-search-screenshots.mjs
 */
import { spawn } from "child_process";
import http from "http";
import { createServer } from "http";
import { readFileSync, statSync, mkdirSync, writeFileSync } from "fs";
import { setTimeout as delay } from "timers/promises";
import path from "path";
import { fileURLToPath } from "url";
import { extname, join, normalize } from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs/screenshots/sheds");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const DBG = 9297;
const PORT = 8097;

function contentType(file) {
  return ({
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png"
  })[extname(file).toLowerCase()] || "application/octet-stream";
}

function startServer() {
  const server = createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      if (urlPath.endsWith("/")) urlPath += "index.html";
      const file = normalize(join(ROOT, urlPath));
      if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      const st = statSync(file);
      if (!st.isFile()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "Content-Type": contentType(file), "Cache-Control": "no-store" });
      res.end(readFileSync(file));
    } catch (e) {
      res.writeHead(404); res.end("missing");
    }
  });
  return new Promise((r) => server.listen(PORT, "127.0.0.1", () => r(server)));
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

async function main() {
  mkdirSync(OUT, { recursive: true });
  const server = await startServer();
  const proc = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-sandbox",
    "--window-size=1200,900",
    "--remote-debugging-port=" + DBG, "about:blank"
  ], { stdio: "ignore" });
  await delay(2500);
  const tabs = await fetchJson("http://127.0.0.1:" + DBG + "/json/list");
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

  async function shot(name) {
    const res = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
    const file = path.join(OUT, name);
    writeFileSync(file, Buffer.from(res.data, "base64"));
    console.log("wrote", file);
  }

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1200, height: 900, deviceScaleFactor: 1, mobile: false
  });
  await send("Page.navigate", { url: "http://127.0.0.1:" + PORT + "/apps/shed-hunting/map/" });
  await delay(5000);

  // Dismiss ethics; inject live-shaped weather for review shots (not persisted as sightings)
  await send("Runtime.evaluate", {
    expression: `(() => {
      const ack = document.getElementById("ethics-ack");
      if (ack) ack.click();
      // Representative Open-Meteo-shaped package for UI review — not stored as observations
      const wx = {
        snowInfluence: 1.05,
        snowMm: 10,
        tempC: 1.2,
        windSpeedMs: 6.5,
        pressureHpa: 1012,
        pressureTrend: "falling",
        precipMm24h: 4,
        sunriseHour: 7.1,
        sunsetHour: 17.7,
        sunriseLocal: "7:06 AM",
        sunsetLocal: "5:42 PM",
        source: "open-meteo",
        fetchedAt: new Date().toISOString()
      };
      // Reach into app state via planner refresh path if exposed; else rebuild briefing DOM via module
      try {
        const brief = window.WaypointShedsTodaysSearch.build({
          weather: wx,
          weatherStatus: "ready",
          locationStatus: "ready",
          season: window.WaypointShedsBiological
            ? window.WaypointShedsBiological.seasonProfile(new Date(), 44.5, {})
            : { phaseId: "peak_shed", phase: "Peak shed", supportLine: "lat heuristic" },
          patterns: window.WaypointShedsObservationPatterns.aggregatePatterns([]),
          now: new Date()
        });
        const title = document.getElementById("plan-title");
        const glance = document.getElementById("plan-glance");
        const conf = document.getElementById("plan-stars");
        const status = document.getElementById("today-status");
        if (title) title.textContent = brief.headline;
        if (glance) glance.textContent = "Best window: " + (brief.timeWindows[0] && brief.timeWindows[0].label) + " · NE · 180 m";
        if (conf) conf.textContent = "Confidence: " + brief.confidence;
        if (status) status.textContent = brief.summaryLine;
        const win = document.getElementById("today-windows");
        if (win) {
          win.innerHTML = brief.timeWindows.map(function (w) {
            return '<div class="sheds-today__window' + (w.id === brief.bestWindowId ? ' is-best' : '') + '" data-band="' + w.band + '">' +
              '<span class="sheds-today__window-label">' + w.label + '</span>' +
              '<span class="sheds-today__window-band">' + w.band + '</span>' +
              '<span class="sheds-today__window-why">' + (w.why[0] || '') + '</span></div>';
          }).join('');
        }
      } catch (e) { return { err: String(e) }; }
      return {
        title: (document.getElementById("plan-title") || {}).textContent,
        eyebrow: !!(document.querySelector(".sheds-suggest__eyebrow")),
        todays: !!(window.WaypointShedsTodaysSearch),
        patterns: !!(window.WaypointShedsObservationPatterns)
      };
    })()`,
    returnByValue: true
  }).then((r) => console.log("state", JSON.stringify(r.result && r.result.value)));

  await delay(1500);
  await shot("todays-search-collapsed.png");

  await send("Runtime.evaluate", {
    expression: `(() => {
      const btn = document.getElementById("btn-toggle-plan");
      if (btn) btn.click();
      return document.getElementById("plan-card").dataset.expanded;
    })()`,
    returnByValue: true
  });
  await delay(1200);
  await shot("todays-search-expanded.png");

  await send("Runtime.evaluate", {
    expression: `(() => {
      const more = document.getElementById("btn-more");
      if (more) more.click();
      const layers = document.getElementById("btn-layers") || document.getElementById("btn-controls");
      if (layers) layers.click();
      return !!(document.getElementById("heat-mode"));
    })()`,
    returnByValue: true
  });
  await delay(900);
  await shot("observed-activity-filters.png");

  // Mobile-ish viewport
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390, height: 844, deviceScaleFactor: 2, mobile: true
  });
  await send("Runtime.evaluate", {
    expression: `(() => {
      document.querySelectorAll(".sheds-sheet.is-open").forEach((el) => {
        el.classList.remove("is-open");
        el.setAttribute("aria-hidden", "true");
      });
      const btn = document.getElementById("btn-toggle-plan");
      if (btn && document.getElementById("plan-card").dataset.expanded !== "true") btn.click();
      return true;
    })()`,
    returnByValue: true
  });
  await delay(900);
  await shot("todays-search-mobile.png");

  ws.close();
  proc.kill("SIGTERM");
  server.close();
  console.log("Screenshot capture complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
