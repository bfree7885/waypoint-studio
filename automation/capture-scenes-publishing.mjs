#!/usr/bin/env node
/**
 * Scenes + Publishing — viewport screenshots for acceptance.
 * Usage: node automation/capture-scenes-publishing.mjs [baseUrl]
 */
import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";
import { WebSocket } from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = (process.argv[2] || "http://127.0.0.1:8765").replace(/\/$/, "");
const OUT = path.join(ROOT, "reports/scenes-publishing-v1/screenshots");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9341);

const PAGES = [
  { name: "scenes-hub", path: "/apps/scenes/" },
  { name: "articles-hub", path: "/articles/" },
  { name: "dfd-library", path: "/deep-forest-dispatch/" },
  { name: "dfd-valley-fog", path: "/deep-forest-dispatch/stories/valley-fog-at-dawn/" },
  { name: "dfd-mount-hood", path: "/deep-forest-dispatch/stories/mount-hood-rain-shadow/" }
];
const VIEWPORTS = [
  { name: "375", width: 375, height: 812, mobile: true },
  { name: "390", width: 390, height: 844, mobile: true },
  { name: "430", width: 430, height: 932, mobile: true },
  { name: "desktop", width: 1440, height: 900, mobile: false }
];

fs.mkdirSync(OUT, { recursive: true });

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(url + " " + res.status);
  return res.json();
}

async function main() {
  if (!fs.existsSync(CHROME)) {
    console.log("SKIP (no chrome)");
    return;
  }
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wp-sp-"));
  const proc = spawn(
    CHROME,
    ["--headless=new", "--disable-gpu", "--no-sandbox", `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${userDataDir}`, "about:blank"],
    { stdio: "ignore" }
  );
  await delay(1400);
  try {
    const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const page = targets.find((t) => t.type === "page") || targets[0];
    const session = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      session.once("open", res);
      session.once("error", rej);
    });
    async function send(method, params = {}) {
      const id = Math.floor(Math.random() * 1e9);
      return new Promise((resolve, reject) => {
        const onMsg = (raw) => {
          const msg = JSON.parse(raw.toString());
          if (msg.id !== id) return;
          session.off("message", onMsg);
          if (msg.error) reject(new Error(JSON.stringify(msg.error)));
          else resolve(msg.result);
        };
        session.on("message", onMsg);
        session.send(JSON.stringify({ id, method, params }));
      });
    }
    await send("Page.enable");
    await send("Runtime.enable");
    const report = [];
    for (const vp of VIEWPORTS) {
      await send("Emulation.setDeviceMetricsOverride", {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        mobile: vp.mobile
      });
      for (const pg of PAGES) {
        await send("Page.navigate", { url: `${BASE}${pg.path}?sp=${Date.now()}` });
        await delay(2200);
        const info = (
          await send("Runtime.evaluate", {
            expression:
              "(() => { const roots = document.querySelectorAll('.waf-hub-hero, .dfd-hero, .dfd-library-intro, .scenes-stage, .scenes-stories, .scenes-journey'); const hrefs = []; roots.forEach(function (root) { Array.prototype.forEach.call(root.querySelectorAll('a[href]'), function (a) { hrefs.push(a.getAttribute('href') || ''); }); }); const banned = hrefs.some(function (h) { return /openroad|\\/apps\\/fieldry|savant-sommelier|\\/apps\\/signalterrain/i.test(h); }); return { title: document.title, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, banned: banned, hasMain: !!document.querySelector('main'), sample: hrefs.filter(function(h){return /fieldry|openroad|savant|signalterrain/i.test(h);}).slice(0,5) }; })()",
            returnByValue: true
          })
        ).result.value;
        const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
        const file = path.join(OUT, `${pg.name}-${vp.name}.png`);
        fs.writeFileSync(file, Buffer.from(shot.data, "base64"));
        if (info.overflow || info.banned || !info.hasMain) {
          throw new Error(`${pg.name}@${vp.name} bad: ${JSON.stringify(info)}`);
        }
        report.push({ page: pg.name, viewport: vp.name, file: path.relative(ROOT, file), ...info });
        console.log("SHOT", path.relative(ROOT, file));
      }
    }
    fs.writeFileSync(
      path.join(ROOT, "reports/scenes-publishing-v1/CDP-VERIFY.json"),
      JSON.stringify({ base: BASE, at: new Date().toISOString(), shots: report }, null, 2)
    );
    console.log("\nSCENES PUBLISHING CAPTURE: PASS");
    session.close();
  } finally {
    proc.kill("SIGKILL");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
