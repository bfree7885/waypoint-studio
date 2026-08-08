#!/usr/bin/env node
/**
 * Capture Entity System screenshots (desktop + mobile).
 * Usage: node automation/capture-gs-entity-system-screenshots.mjs
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
const OUT = path.join(ROOT, "docs/global-signals/entities");

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
    ".png": "image/png"
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
  const wsUrl = page.webSocketDebuggerUrl;
  const { default: WebSocket } = await import("ws").catch(() => ({ default: null }));
  if (!WebSocket) {
    // Fallback: use chrome --screenshot via headless CLI
    return null;
  }
  return { wsUrl, method, params, sessionId };
}

async function shotWithChrome(url, outFile, width, height) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--window-size=${width},${height}`,
    `--screenshot=${outFile}`,
    url
  ];
  await new Promise((resolve, reject) => {
    const child = spawn(CHROME, args, { stdio: "ignore" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("chrome " + code))));
  });
}

async function main() {
  if (!fs.existsSync(CHROME)) {
    console.error("Chrome not found at", CHROME);
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const server = await startStaticServer();
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  const shots = [
    ["01-entities-index-desktop.png", "/side-trails/global-signals/entities/", 1280, 900],
    ["02-entities-index-mobile.png", "/side-trails/global-signals/entities/", 390, 844],
    ["03-entity-taiwan-desktop.png", "/side-trails/global-signals/entities/country/taiwan/", 1280, 1400],
    ["04-entity-semiconductors-desktop.png", "/side-trails/global-signals/entities/industry/semiconductors/", 1280, 1400],
    ["05-entity-article-desktop.png", "/side-trails/global-signals/entities/article/demo-canal-slots/", 1280, 1200],
    ["06-entity-citizen-food-mobile.png", "/side-trails/global-signals/entities/citizen-impact/food/", 390, 1000],
    ["07-country-alias-taiwan-desktop.png", "/side-trails/global-signals/countries/taiwan/", 1280, 1200],
    ["08-gs-landing-entities-link.png", "/side-trails/global-signals/", 1280, 900]
  ];

  for (const [name, rel, w, h] of shots) {
    const out = path.join(OUT, name);
    console.log("capturing", name);
    await shotWithChrome(base + rel, out, w, h);
    await delay(200);
  }

  fs.writeFileSync(
    path.join(OUT, "SCREENSHOT-INDEX.md"),
    `# Entity System screenshots

| File | Subject |
| --- | --- |
| 01-entities-index-desktop.png | Entities index (desktop) |
| 02-entities-index-mobile.png | Entities index (mobile) |
| 03-entity-taiwan-desktop.png | Country entity — Taiwan |
| 04-entity-semiconductors-desktop.png | Industry entity — Semiconductors |
| 05-entity-article-desktop.png | Article entity |
| 06-entity-citizen-food-mobile.png | Citizen Impact entity — Food |
| 07-country-alias-taiwan-desktop.png | Country route alias using shared shell |
| 08-gs-landing-entities-link.png | Landing Entities link |

Captured via headless Chrome against a local static server.
`
  );

  server.close();
  console.log("Screenshots written to", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
