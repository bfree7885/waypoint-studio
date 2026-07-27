#!/usr/bin/env node
/**
 * Sprint 4 — browser evidence for canonical Home loader.
 * Captures desktop/mobile screenshots + performance metrics.
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "docs/turnaround/2026-07-26-sprint-04");
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9374);

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });
}

function startServer() {
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath.endsWith("/")) urlPath += "index.html";
    if (urlPath === "/") urlPath = "/index.html";
    const file = path.normalize(path.join(ROOT, urlPath.replace(/^\//, "")));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end("nf");
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const types = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".webp": "image/webp",
      ".woff2": "font/woff2"
    };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, base: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

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

const { server, base } = await startServer();
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wds-s04-"));
const proc = spawn(
  process.env.CHROME_PATH || "/usr/bin/google-chrome",
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    `--user-data-dir=${userDataDir}`,
    `--remote-debugging-port=${CDP_PORT}`,
    "about:blank"
  ],
  { stdio: "ignore" }
);
let wsUrl;
for (let i = 0; i < 60; i++) {
  await delay(250);
  try {
    const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const page = targets.find((t) => t.type === "page");
    if (page) {
      wsUrl = page.webSocketDebuggerUrl;
      break;
    }
  } catch {}
}
if (!wsUrl) {
  console.error("CDP unavailable");
  process.exit(1);
}
const { default: WebSocket } = await import("ws");
const ws = new WebSocket(wsUrl);
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
await send("Network.enable");
await send("Performance.enable").catch(() => ({}));

async function seedLocation() {
  await send("Runtime.evaluate", {
    expression: `(() => {
      localStorage.clear();
      localStorage.setItem("wds-location-v3", ${JSON.stringify(JSON.stringify(PIKE))});
      localStorage.setItem("wds-location-prompted", "1");
      const mount = document.getElementById("wds-location-prompt");
      if (mount) mount.innerHTML = "";
      return true;
    })()`,
    returnByValue: true
  });
}

async function measure(pathName, viewport) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: viewport.w,
    height: viewport.h,
    deviceScaleFactor: 1,
    mobile: viewport.mobile
  });
  const requests = [];
  const errors = [];
  const onMsg = (raw) => {
    const msg = JSON.parse(String(raw));
    if (msg.method === "Network.requestWillBeSent") {
      const u = msg.params.request.url;
      if (u.startsWith(base) && /\.js(\?|$)/.test(u)) requests.push(u);
    }
    if (msg.method === "Network.loadingFailed") {
      errors.push(msg.params.errorText || "load-failed");
    }
  };
  ws.on("message", onMsg);
  const t0 = Date.now();
  await send("Page.navigate", { url: base + pathName });
  await delay(1200);
  await seedLocation();
  await send("Page.reload", { ignoreCache: true });
  await delay(4500);
  await seedLocation();
  await delay(800);
  ws.off("message", onMsg);
  const elapsed = Date.now() - t0;
  const state = await send("Runtime.evaluate", {
    expression: `(() => {
      const marks = performance.getEntriesByType("mark").map((m) => ({ name: m.name, startTime: m.startTime }));
      const shell = !!document.querySelector("[data-wdb-r], .wdb-r-workspace, #wds-content-engine [data-wdb-r-root], .wdb-r-boot");
      const rebuild = !!(window.WDS && WDS.dashboardRebuild && WDS.dashboardRebuild.mount);
      const legacyOS = !!(window.WDS && (WDS.dashboardOS || WDS.dashboardV2 || WDS.dashboardV3));
      const loader = window.WDS && WDS.homeLoader ? WDS.homeLoader.modules.length : null;
      const customize = !!(window.WDS && WDS.dashboardRebuildCustomize);
      const kiosk = !!(window.WDS && WDS.dashboardRebuildKiosk);
      const cls = performance.getEntriesByType("layout-shift").reduce((n, e) => n + (e.value || 0), 0);
      return {
        title: document.title,
        shell,
        rebuild,
        legacyOS,
        loaderModules: loader,
        customize,
        kiosk,
        marks,
        clsApprox: cls,
        bodyTextSample: (document.body && document.body.innerText || "").slice(0, 200)
      };
    })()`,
    returnByValue: true
  });
  const png = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  const file = pathName === "/"
    ? `home__${viewport.name}.png`
    : pathName.includes("customize")
      ? `customize__${viewport.name}.png`
      : pathName.includes("kiosk")
        ? `kiosk__${viewport.name}.png`
        : `dash__${viewport.name}.png`;
  fs.writeFileSync(path.join(OUT, file), Buffer.from(png.data, "base64"));
  return {
    path: pathName,
    viewport: viewport.name,
    elapsedMs: elapsed,
    jsRequests: requests.length,
    uniqueJs: [...new Set(requests.map((u) => u.split("?")[0]))].length,
    networkErrors: errors.slice(0, 10),
    screenshot: file,
    ...state.result.value
  };
}

fs.mkdirSync(OUT, { recursive: true });
const viewports = [
  { name: "desktop", w: 1440, h: 1000, mobile: false },
  { name: "mobile", w: 390, h: 844, mobile: true }
];
const results = [];
for (const vp of viewports) {
  results.push(await measure("/", vp));
  results.push(await measure("/apps/dashboard/", vp));
}
// customize + kiosk on desktop
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false
});
results.push(await measure("/#/customize", { name: "desktop", w: 1440, h: 1000, mobile: false }));
results.push(await measure("/#/kiosk", { name: "desktop", w: 1440, h: 1000, mobile: false }));

const summary = {
  generatedAt: new Date().toISOString(),
  base,
  results,
  ok: results.every(
    (r) => r.rebuild && !r.legacyOS && r.customize && r.kiosk && (r.loaderModules == null || r.loaderModules === 48)
  )
};
fs.writeFileSync(path.join(OUT, "browser-metrics.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
ws.close();
try {
  proc.kill("SIGTERM");
} catch {}
server.close();
if (!summary.ok) process.exit(1);
