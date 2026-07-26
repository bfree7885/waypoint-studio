#!/usr/bin/env node
/**
 * Capture Coach recommendation preview screenshots via Chrome --screenshot.
 * Usage: node automation/capture-coach-preview-layout.mjs <before|after> [preview=0|1]
 */
import { spawn, spawnSync } from "child_process";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { setTimeout as delay } from "timers/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LABEL = process.argv[2] || "after";
const PREVIEW = process.argv[3] || (LABEL === "before" ? "0" : "1");
const OUT = path.join(ROOT, "docs/scenes/screenshots/coach-blurry-preview");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const PORT = Number(process.env.COACH_PREVIEW_PORT || 8765);

const WIDTHS = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "tablet-1024", width: 1024, height: 768 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-375", width: 375, height: 812 }
];

fs.mkdirSync(OUT, { recursive: true });

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      if (urlPath === "/") urlPath = "/docs/scenes/fixtures/coach-preview-layout-fixture.html";
      const filePath = path.join(ROOT, urlPath.replace(/^\//, ""));
      if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end("missing");
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const types = {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "text/javascript",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".woff2": "font/woff2"
      };
      res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

async function main() {
  const server = await serve();
  try {
    for (const vp of WIDTHS) {
      const tmp = path.join(OUT, `.tmp-${LABEL}-${vp.name}.png`);
      const dest = path.join(OUT, `${LABEL}-${vp.name}.png`);
      const url = `http://127.0.0.1:${PORT}/docs/scenes/fixtures/coach-preview-layout-fixture.html?preview=${PREVIEW}`;
      const r = spawnSync(
        CHROME,
        [
          "--headless=new",
          "--disable-gpu",
          "--hide-scrollbars",
          "--force-device-scale-factor=2",
          `--window-size=${vp.width},${vp.height}`,
          `--screenshot=${tmp}`,
          url
        ],
        { encoding: "utf8", timeout: 30000 }
      );
      if (r.status !== 0 || !fs.existsSync(tmp)) {
        console.error(r.stderr || r.stdout || "chrome failed");
        throw new Error("screenshot failed for " + vp.name);
      }
      fs.renameSync(tmp, dest);
      console.log("wrote", dest);
      await delay(150);
    }
  } finally {
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
