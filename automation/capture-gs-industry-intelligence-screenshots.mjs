#!/usr/bin/env node
/**
 * Capture Industry Intelligence screenshots (desktop + mobile).
 * Usage: node automation/capture-gs-industry-intelligence-screenshots.mjs [baseUrl]
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
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9411);
const OUT = path.join(ROOT, "docs/global-signals/industries");

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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "gsi-shot-"));
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
      if (page) return { proc, wsUrl: page.webSocketDebuggerUrl, userDataDir };
    } catch (_) {}
  }
  proc.kill("SIGTERM");
  throw new Error("Chrome CDP not ready");
}

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
    await send("Page.loadEventFired").catch(() => {});
    await delay(1200);
    // wait for ready state
    for (let i = 0; i < 20; i++) {
      const evalRes = await send("Runtime.evaluate", {
        expression:
          "document.querySelector('[data-gsi-state]')?.getAttribute('data-gsi-state') || document.querySelector('.gs-modules') && 'landing' || 'na'",
        returnByValue: true
      });
      const state = evalRes.result?.value;
      if (state === "ready" || state === "landing") break;
      await delay(200);
    }
    const shotRes = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
    const outPath = path.join(OUT, name);
    fs.writeFileSync(outPath, Buffer.from(shotRes.data, "base64"));
    console.log("wrote", outPath);
  }

  try {
    await shot("01-industries-index-desktop.png", "/side-trails/global-signals/industries/", 1280, 900);
    await shot("02-industries-index-mobile.png", "/side-trails/global-signals/industries/", 390, 844);
    await shot("03-industry-semiconductors-desktop.png", "/side-trails/global-signals/industries/semiconductors/", 1280, 1100);
    await shot("04-industry-shipping-desktop.png", "/side-trails/global-signals/industries/shipping/", 1280, 1100);
    await shot("05-industry-energy-mobile.png", "/side-trails/global-signals/industries/energy/", 390, 900);
    await shot("06-gs-landing-industries-link-desktop.png", "/side-trails/global-signals/", 1280, 900);
  } finally {
    ws.close();
    chrome.proc.kill("SIGTERM");
    server.close();
  }

  fs.writeFileSync(
    path.join(OUT, "SCREENSHOT-INDEX.md"),
    `# Industry Intelligence screenshots

| File | View |
| --- | --- |
| \`01-industries-index-desktop.png\` | Index desktop |
| \`02-industries-index-mobile.png\` | Index mobile |
| \`03-industry-semiconductors-desktop.png\` | Semiconductors detail |
| \`04-industry-shipping-desktop.png\` | Shipping detail |
| \`05-industry-energy-mobile.png\` | Energy detail mobile |
| \`06-gs-landing-industries-link-desktop.png\` | GS landing with Industries link |

Captured ${new Date().toISOString()} against local static server.
`
  );
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
