#!/usr/bin/env node
/**
 * Capture Global Signals home dashboard screenshots (desktop + mobile).
 * Usage: node automation/capture-gs-home-dashboard-screenshots.mjs
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";
import { createServer } from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9422);
const OUT = path.join(ROOT, "docs/global-signals/home");

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

function startStaticServer() {
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".woff2": "font/woff2"
  };
  const server = createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    let rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\//, "");
    if (rel.endsWith("/")) rel += "index.html";
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function cdp(method, params = {}, sessionId) {
  const list = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
  const page = list.find((t) => t.type === "page") || list[0];
  if (!page) throw new Error("no CDP page");
  const wsUrl = page.webSocketDebuggerUrl;
  const { default: WebSocket } = await import("ws").catch(() => ({ default: null }));
  // Prefer raw HTTP CDP via /json/protocol is awkward; use chrome remote interface via websocket if ws available.
  // Fallback: use puppeteer-less approach with chrome --screenshot flags for key viewports.
  return { page, wsUrl, WebSocket };
}

async function screenshotWithChrome(url, outFile, width, height) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  await new Promise((resolve, reject) => {
    const args = [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-sandbox",
      `--window-size=${width},${height}`,
      `--screenshot=${outFile}`,
      url
    ];
    const child = spawn(CHROME, args, { stdio: "ignore" });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("chrome exit " + code))));
  });
}

async function main() {
  if (!fs.existsSync(CHROME)) {
    console.error("Chrome not found at", CHROME);
    process.exit(1);
  }
  const server = await startStaticServer();
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}/side-trails/global-signals/`;
  await delay(200);

  const shots = [
    ["01-home-dashboard-desktop.png", 1440, 1100],
    ["02-home-dashboard-mobile.png", 390, 1200],
    ["03-home-search-and-events-desktop.png", 1440, 900]
  ];
  for (const [name, w, h] of shots) {
    const out = path.join(OUT, name);
    await screenshotWithChrome(base, out, w, h);
    console.log("wrote", path.relative(ROOT, out), fs.statSync(out).size);
  }

  // Side Trails catalog regression visual
  await screenshotWithChrome(
    `http://127.0.0.1:${port}/side-trails/`,
    path.join(OUT, "04-side-trails-catalog-desktop.png"),
    1280,
    900
  );
  console.log("wrote docs/global-signals/home/04-side-trails-catalog-desktop.png");

  server.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
