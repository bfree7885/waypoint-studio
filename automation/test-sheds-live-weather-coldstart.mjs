#!/usr/bin/env node
/**
 * Sheds — live-input cold-start regression (escaped defect class).
 *
 * GPS denied + zoomed-out map must still request Open-Meteo for the map center
 * so Today’s Search does not claim “map center when possible” while weather
 * stays forever unavailable.
 *
 * Run: node automation/test-sheds-live-weather-coldstart.mjs
 */
import { spawn } from "child_process";
import { createServer } from "http";
import http from "http";
import { readFileSync, statSync, existsSync } from "fs";
import { setTimeout as delay } from "timers/promises";
import { extname, join, normalize, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = normalize(join(__dirname, ".."));
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const DBG = Number(process.env.SHEDS_WX_CDP || 9297);
const PORT = Number(process.env.SHEDS_WX_PORT || 8097);

function contentType(file) {
  return (
    {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json",
      ".png": "image/png",
      ".svg": "image/svg+xml",
      ".woff2": "font/woff2"
    }[extname(file).toLowerCase()] || "application/octet-stream"
  );
}

function startServer() {
  return createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      if (urlPath.endsWith("/")) urlPath += "index.html";
      const file = normalize(join(ROOT, urlPath));
      if (!file.startsWith(ROOT)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const st = statSync(file);
      if (!st.isFile()) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, {
        "Content-Type": contentType(file),
        "Cache-Control": "no-store"
      });
      res.end(readFileSync(file));
    } catch {
      res.writeHead(404);
      res.end();
    }
  }).listen(PORT, "127.0.0.1");
}

async function cdpGet(path) {
  const body = await new Promise((resolve, reject) => {
    http
      .get(`http://127.0.0.1:${DBG}${path}`, (r) => {
        let d = "";
        r.on("data", (c) => (d += c));
        r.on("end", () => resolve(d));
      })
      .on("error", reject);
  });
  return JSON.parse(body);
}

async function loadWs() {
  const candidates = [
    join(ROOT, "node_modules/ws/wrapper.mjs"),
    join(ROOT, "node_modules/ws/index.js")
  ];
  for (const c of candidates) {
    if (existsSync(c)) {
      const mod = await import(pathToFileURL(c).href);
      return mod.default || mod;
    }
  }
  try {
    const mod = await import("ws");
    return mod.default || mod;
  } catch {
    throw new Error(
      "Missing dependency 'ws'. Run: npm install ws --no-save (or add package.json)."
    );
  }
}

function attach(WebSocket, wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    ws.on("open", () => {
      const send = (method, params = {}) =>
        new Promise((res, rej) => {
          const i = ++id;
          pending.set(i, { res, rej });
          ws.send(JSON.stringify({ id: i, method, params }));
        });
      ws.on("message", (raw) => {
        const msg = JSON.parse(String(raw));
        if (msg.id && pending.has(msg.id)) {
          const { res, rej } = pending.get(msg.id);
          pending.delete(msg.id);
          if (msg.error) rej(msg.error);
          else res(msg.result);
        }
      });
      resolve({ ws, send });
    });
    ws.on("error", reject);
  });
}

async function ev(send, expression) {
  const r = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}

const failures = [];
function assert(name, cond, detail) {
  if (cond) console.log("PASS", name);
  else {
    failures.push(name + (detail ? ": " + detail : ""));
    console.log("FAIL", name, detail || "");
  }
}

const WebSocket = await loadWs();
const server = startServer();
const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${DBG}`,
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1280,800",
    "about:blank"
  ],
  { stdio: "ignore" }
);

try {
  for (let i = 0; i < 50; i++) {
    try {
      await cdpGet("/json/version");
      break;
    } catch {
      await delay(200);
    }
  }
  const targets = await cdpGet("/json/list");
  const page = targets.find((t) => t.type === "page") || targets[0];
  const { ws, send } = await attach(WebSocket, page.webSocketDebuggerUrl);
  await send("Network.enable");
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", {
    url: `http://127.0.0.1:${PORT}/apps/shed-hunting/map/`
  });
  // Allow locate fail + ensureWeatherForView + Open-Meteo
  await delay(6500);

  const snap = await ev(
    send,
    `(() => {
      const openMeteo = performance.getEntriesByType("resource")
        .filter((r) => /open-meteo/i.test(r.name))
        .map((r) => r.name);
      return {
        zoom: (window.L && document.querySelector(".leaflet-container")) ? "mapped" : null,
        leaflet: !!document.querySelector(".leaflet-container"),
        title: document.getElementById("plan-title")?.textContent?.trim() || "",
        glance: document.getElementById("plan-glance")?.textContent?.trim() || "",
        status: document.getElementById("today-status")?.textContent?.trim() || "",
        stars: document.getElementById("plan-stars")?.textContent?.trim() || "",
        loc: document.getElementById("nav-hud")?.textContent?.trim() || "",
        openMeteoCount: openMeteo.length,
        openMeteoSample: openMeteo[0] || null,
        weatherUnavailableForever:
          /weather unavailable/i.test(document.getElementById("plan-title")?.textContent || "") &&
          openMeteo.length === 0,
        mapCenterClaimWithoutFetch:
          /map center when possible/i.test(document.body.innerText) &&
          openMeteo.length === 0
      };
    })()`
  );

  assert("map shell present", !!snap.leaflet);
  assert(
    "Open-Meteo requested without GPS",
    snap.openMeteoCount >= 1,
    `count=${snap.openMeteoCount}; title=${snap.title}`
  );
  assert(
    "not stuck weather-unavailable without fetch",
    !snap.weatherUnavailableForever,
    snap.title
  );
  assert(
    "no map-center claim without weather fetch",
    !snap.mapCenterClaimWithoutFetch,
    snap.status
  );
  assert(
    "Today’s Search not stuck Reading conditions",
    !/Reading conditions/i.test(snap.title)
  );
  // After fix: either weather landed (title/status mentions map-center weather or ready windows)
  // or honest loading/unavailable AFTER a fetch attempt.
  assert(
    "briefing reflects map-center weather attempt",
    snap.openMeteoCount >= 1 &&
      (/map-center|map center|Best window|Seasonal|Confidence|Location/i.test(
        snap.title + " " + snap.glance + " " + snap.status
      )),
    JSON.stringify(snap)
  );

  console.log("SNAPSHOT", JSON.stringify(snap, null, 2));
  ws.close();
} catch (err) {
  failures.push(String(err));
  console.error(err);
} finally {
  try {
    chrome.kill("SIGKILL");
  } catch {
    /* */
  }
  server.close();
}

if (failures.length) {
  console.error("\n" + failures.length + " failure(s)");
  process.exit(1);
}
console.log("\nAll Sheds live-weather cold-start checks passed.");
