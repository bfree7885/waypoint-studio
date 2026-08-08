#!/usr/bin/env node
/**
 * Capture Global Signals live articles screenshots (desktop + mobile).
 * Usage: node automation/capture-global-signals-live-articles.mjs
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9417);
const OUT = path.join(ROOT, "docs/global-signals/live-articles");
const STATIC_PORT = 8769;

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

function startStaticServer() {
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png"
  };
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent((req.url || "/").split("?")[0]).replace(/^\//, "");
    if (!rel || rel.endsWith("/")) rel += "index.html";
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
    res.end(fs.readFileSync(file));
  });
  return new Promise((resolve) => server.listen(STATIC_PORT, "127.0.0.1", () => resolve(server)));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

async function startChrome() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-live-articles-"));
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
  for (let i = 0; i < 80; i++) {
    await delay(200);
    try {
      const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
      const page = targets.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) return { proc, wsUrl: page.webSocketDebuggerUrl };
    } catch (_) {}
  }
  proc.kill("SIGTERM");
  throw new Error("Chrome CDP not ready");
}

async function cdpShot(wsUrl, { url, outFile, width, height }) {
  const { default: WebSocket } = await import("ws");
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
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
  function send(method, params = {}) {
    const msgId = ++id;
    ws.send(JSON.stringify({ id: msgId, method, params }));
    return new Promise((resolve, reject) => pending.set(msgId, { resolve, reject }));
  }

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 600
  });
  await send("Page.navigate", { url });
  await delay(2500);
  const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, Buffer.from(shot.data, "base64"));
  ws.close();
}

async function main() {
  const articles = readJson("data/global-signals/articles/articles.json");
  const example =
    articles.articles.find(
      (a) =>
        (a.affectedIndustries || []).length > 0 &&
        /section 232|aluminum|steel/i.test(a.headline)
    ) || articles.articles[0];

  const server = await startStaticServer();
  const { proc, wsUrl } = await startChrome();
  fs.mkdirSync(OUT, { recursive: true });

  const base = `http://127.0.0.1:${STATIC_PORT}`;
  const shots = [
    {
      url: `${base}/side-trails/global-signals/articles/`,
      outFile: path.join(OUT, "01-live-articles-feed-desktop.png"),
      width: 1280,
      height: 900
    },
    {
      url: `${base}/side-trails/global-signals/articles/`,
      outFile: path.join(OUT, "02-live-articles-feed-mobile.png"),
      width: 390,
      height: 844
    },
    {
      url: `${base}/side-trails/global-signals/articles/?id=${encodeURIComponent(example.id)}`,
      outFile: path.join(OUT, "03-live-article-detail-desktop.png"),
      width: 1280,
      height: 1100
    }
  ];

  try {
    for (const s of shots) {
      await cdpShot(wsUrl, s);
      console.log("wrote", path.relative(ROOT, s.outFile));
    }
    fs.writeFileSync(
      path.join(OUT, "SCREENSHOT-INDEX.md"),
      [
        "# Global Signals live articles screenshots",
        "",
        `Captured: ${new Date().toISOString()}`,
        "",
        `| File | Description |`,
        `| --- | --- |`,
        `| 01-live-articles-feed-desktop.png | Live feed desktop |`,
        `| 02-live-articles-feed-mobile.png | Live feed mobile |`,
        `| 03-live-article-detail-desktop.png | Detail + Waypoint's Take for documented e2e event |`,
        "",
        "## Documented event",
        "",
        `- **Headline:** ${example.headline}`,
        `- **Publisher:** ${example.publisher}`,
        `- **Published:** ${example.publishedAt}`,
        `- **Source:** ${example.sourceUrl}`,
        `- **Article id:** ${example.id}`,
        ""
      ].join("\n")
    );
  } finally {
    proc.kill("SIGTERM");
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
