#!/usr/bin/env node
/**
 * Capture Global Signals direct-entry screenshots.
 * Usage: node automation/capture-gs-direct-entry-screenshots.mjs
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";
import { createServer } from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const OUT = path.join(ROOT, "docs/global-signals/direct-entry");

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
  const base = `http://127.0.0.1:${port}`;
  await delay(200);

  const shots = [
    ["01-dashboard-primary-desktop.png", "/side-trails/global-signals/", 1440, 1100],
    ["02-dashboard-primary-mobile.png", "/side-trails/global-signals/", 390, 1200],
    ["03-side-trails-catalog-desktop.png", "/side-trails/", 1280, 900],
    ["04-about-secondary-desktop.png", "/side-trails/global-signals/about/", 1280, 900],
    ["05-global-dashboard-redirect.png", "/side-trails/global-signals/global-dashboard/", 900, 400]
  ];
  for (const [name, route, w, h] of shots) {
    const out = path.join(OUT, name);
    await screenshotWithChrome(base + route, out, w, h);
    console.log("wrote", path.relative(ROOT, out), fs.statSync(out).size);
  }

  server.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
