#!/usr/bin/env node
/**
 * Capture Moving Scenes workspace + hub screenshots; copy fixtures into owner gallery.
 */
import fs from "fs";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs/rebuild-2026/scenes-v1-moving-scenes");
const FIX = path.join(ROOT, "automation/fixtures/moving-scenes");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(OUT, "fixtures"), { recursive: true });
fs.mkdirSync(path.join(OUT, "pair"), { recursive: true });

function findChrome() {
  const cands = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium"
  ].filter(Boolean);
  for (const c of cands) if (fs.existsSync(c)) return c;
  return null;
}

function startServer() {
  const root = ROOT;
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath.endsWith("/")) urlPath += "index.html";
    const file = path.join(root, urlPath.replace(/^\//, ""));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end("missing"); return;
    }
    const ext = path.extname(file);
    const types = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".json": "application/json",
      ".webp": "image/webp"
    };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

const chrome = findChrome();
const fixtures = fs.readdirSync(FIX).filter((f) => f.endsWith(".png")).sort();
for (const f of fixtures) {
  fs.copyFileSync(path.join(FIX, f), path.join(OUT, "fixtures", f));
  fs.copyFileSync(path.join(FIX, f), path.join(OUT, "pair", f.replace(/\.png$/, "-still.png")));
}

if (!chrome) {
  fs.writeFileSync(
    path.join(OUT, "capture-report.json"),
    JSON.stringify({ ok: false, reason: "no-chrome", fixtures: fixtures.length }, null, 2)
  );
  process.exit(0);
}

const { server, port } = await startServer();
const base = `http://127.0.0.1:${port}`;
const profile = path.join(ROOT, ".tmp-ms-chrome-profile");
fs.mkdirSync(profile, { recursive: true });

async function shot(url, outFile, w, h) {
  await new Promise((resolve, reject) => {
    const args = [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      `--user-data-dir=${profile}`,
      `--window-size=${w},${h}`,
      `--screenshot=${outFile}`,
      url
    ];
    const child = spawn(chrome, args, { stdio: "ignore" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("chrome exit " + code))));
  });
}

const shots = [];
try {
  await shot(`${base}/apps/moving-scenes/`, path.join(OUT, "workspace-1440.png"), 1440, 900);
  shots.push("workspace-1440.png");
  await shot(`${base}/apps/moving-scenes/`, path.join(OUT, "workspace-390.png"), 390, 844);
  shots.push("workspace-390.png");
  await shot(`${base}/apps/scenes/`, path.join(OUT, "scenes-hub-1440.png"), 1440, 900);
  shots.push("scenes-hub-1440.png");
  await shot(`${base}/apps/auto-edit/`, path.join(OUT, "auto-edit-handoff-1440.png"), 1440, 900);
  shots.push("auto-edit-handoff-1440.png");
  await shot(`${base}/apps/photo-library/`, path.join(OUT, "library-1440.png"), 1440, 900);
  shots.push("library-1440.png");
  await shot(`${base}/docs/rebuild-2026/scenes-v1-moving-scenes/owner-gallery.html`, path.join(OUT, "gallery-1440.png"), 1440, 900);
  shots.push("gallery-1440.png");
} catch (err) {
  console.error(err);
}

fs.writeFileSync(
  path.join(OUT, "capture-report.json"),
  JSON.stringify(
    {
      ok: true,
      base,
      fixtures: fixtures.length,
      shots,
      supportedClasses: ["clouds", "water", "fog", "haze"],
      deferredClasses: ["foliage", "grass", "rain", "snow", "light", "stars", "parallax"]
    },
    null,
    2
  )
);

server.close();
console.log("Moving Scenes captures written:", shots.length, "fixtures:", fixtures.length);
