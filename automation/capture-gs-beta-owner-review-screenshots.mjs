#!/usr/bin/env node
/**
 * Capture Global Signals Beta owner-review screenshots (desktop + select mobile).
 * Usage: node automation/capture-gs-beta-owner-review-screenshots.mjs
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";
import { createServer } from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9422);
const OUT = path.join(ROOT, "docs/releases/global-signals-beta");

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
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, port: server.address().port });
    });
  });
}

async function startChrome() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-beta-shot-"));
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
      if (page) return { proc, userDataDir };
    } catch (_) {}
  }
  proc.kill("SIGTERM");
  throw new Error("Chrome CDP not ready");
}

const SHOTS = [
  ["01-landing-desktop.png", "/side-trails/global-signals/", 1280, 900],
  ["02-landing-mobile.png", "/side-trails/global-signals/", 390, 844],
  ["03-articles-feed-desktop.png", "/side-trails/global-signals/articles/", 1280, 900],
  ["04-articles-detail-desktop.png", "/side-trails/global-signals/articles/?id=gsa_demo-steel-tariff", 1280, 1100],
  ["05-relationship-graph-taiwan-desktop.png", "/side-trails/global-signals/relationship-graph/?focus=gsn_taiwan", 1280, 900],
  ["06-relationship-graph-mobile.png", "/side-trails/global-signals/relationship-graph/?focus=gsn_taiwan", 390, 844],
  ["07-relationship-explorer-taiwan-desktop.png", "/side-trails/global-signals/relationships/?entity=gsn_taiwan", 1280, 900],
  ["08-countries-index-desktop.png", "/side-trails/global-signals/countries/", 1280, 900],
  ["09-country-taiwan-desktop.png", "/side-trails/global-signals/countries/taiwan/", 1280, 1100],
  ["10-industries-index-desktop.png", "/side-trails/global-signals/industries/", 1280, 900],
  ["11-industry-semiconductors-desktop.png", "/side-trails/global-signals/industries/semiconductors/", 1280, 1100],
  ["12-citizen-impact-desktop.png", "/side-trails/global-signals/citizen-impact/", 1280, 1100],
  ["13-explain-taiwan-desktop.png", "/side-trails/global-signals/explain/?q=Why%20does%20Taiwan%20matter%3F", 1280, 1100],
  ["14-global-dashboard-coming-soon-desktop.png", "/side-trails/global-signals/global-dashboard/", 1280, 700],
  ["15-waypoint-take-coming-soon-desktop.png", "/side-trails/global-signals/waypoint-take/", 1280, 700],
  ["16-search-taiwan-desktop.png", "/side-trails/global-signals/search/?q=Taiwan", 1280, 900],
  ["17-relationship-graph-taiwan-tall-desktop.png", "/side-trails/global-signals/relationship-graph/?focus=gsn_taiwan", 1280, 1600]
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const { server, port } = await startStaticServer();
  const BASE = `http://127.0.0.1:${port}`;
  const chrome = await startChrome();
  const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
  const page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => {
    ws.addEventListener("open", () => r(), { once: true });
    ws.addEventListener("error", (e) => j(e), { once: true });
  });
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(String(event.data));
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  function send(method, params = {}) {
    const msgId = ++id;
    return new Promise((resolve, reject) => {
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await send("Page.enable");
  await send("Runtime.enable");

  async function shot(name, urlPath, width, height) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 500
    });
    await send("Page.navigate", { url: BASE + urlPath });
    await delay(1500);
    for (let i = 0; i < 25; i++) {
      const evalRes = await send("Runtime.evaluate", {
        expression:
          "document.readyState === 'complete' ? (document.querySelector('[data-gs-state],[data-gsa-state],[data-gsr-state],[data-gsi-state],[data-gsc-state],[data-gse-state],[data-gsrg-state]')?.getAttribute('data-gs-state') || document.querySelector('[data-gsa-state]')?.getAttribute('data-gsa-state') || document.querySelector('[data-gsr-state]')?.getAttribute('data-gsr-state') || document.querySelector('[data-gsi-state]')?.getAttribute('data-gsi-state') || document.querySelector('[data-gsc-state]')?.getAttribute('data-gsc-state') || document.querySelector('[data-gse-state]')?.getAttribute('data-gse-state') || document.querySelector('[data-gsrg-state]')?.getAttribute('data-gsrg-state') || (document.querySelector('.gs-modules,.gs-placeholder-main') ? 'shell' : 'ready')) : 'loading'",
        returnByValue: true
      });
      const state = evalRes.result?.value;
      if (state && state !== "loading" && state !== "idle") break;
      if (state === "ready" || state === "shell" || state === "error" || state === "empty") break;
      await delay(200);
    }
    await delay(400);
    const shotRes = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
    const outPath = path.join(OUT, name);
    fs.writeFileSync(outPath, Buffer.from(shotRes.data, "base64"));
    console.log("wrote", outPath);
  }

  try {
    for (const [name, urlPath, width, height] of SHOTS) {
      await shot(name, urlPath, width, height);
    }
  } finally {
    ws.close();
    chrome.proc.kill("SIGTERM");
    server.close();
  }

  const rows = SHOTS.map(([name, urlPath, w]) => `| \`${name}\` | \`${urlPath}\` | ${w < 500 ? "mobile" : "desktop"} |`).join("\n");
  fs.writeFileSync(
    path.join(OUT, "SCREENSHOT-INDEX.md"),
    `# Global Signals Beta — screenshot index

Captured ${new Date().toISOString()} from \`release/global-signals-beta\` via local static server + headless Chrome.

| File | Route | Viewport |
| --- | --- | --- |
${rows}
`
  );
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
