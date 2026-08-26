#!/usr/bin/env node
/**
 * Dashboard Discover v1 — viewport screenshots + CDP honesty checks.
 * Usage: node automation/capture-dashboard-discover.mjs [baseUrl]
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
const OUT = path.join(ROOT, "reports/dashboard-discover-v1/screenshots");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9337);
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

function assert(name, cond, detail) {
  if (!cond) throw new Error("FAIL " + name + (detail ? ": " + detail : ""));
  console.log("PASS", name);
}

async function main() {
  if (!fs.existsSync(CHROME)) {
    console.log("SKIP capture (no chrome at", CHROME + ")");
    return;
  }
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wp-dash-discover-"));
  const proc = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${userDataDir}`,
      "about:blank"
    ],
    { stdio: "ignore" }
  );
  await delay(1400);
  try {
    const ver = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/version`);
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
      await send("Page.navigate", { url: `${BASE}/apps/dashboard/?discover=${Date.now()}` });
      // Wait for hydrate or settle timeout (mobile headless can lag IP geo).
      for (let i = 0; i < 40; i++) {
        const ready = await send("Runtime.evaluate", {
          expression: `!!(document.querySelector('[data-wdb-r][data-hydrated="true"]') || document.querySelector('[data-wdb-r-discover-quiet],[data-wdb-r-hn]'))`,
          returnByValue: true
        });
        if (ready.result && ready.result.value) break;
        await delay(250);
      }
      await delay(800);
      const evalRes = await send("Runtime.evaluate", {
        expression: `(() => {
          const root = document.querySelector("[data-wdb-r]");
          const today = !!document.querySelector("[data-wdb-r-today]");
          const hn = !!document.querySelector("[data-wdb-r-hn]");
          const quiet = !!document.querySelector("[data-wdb-r-discover-quiet]");
          const deepen = !!document.querySelector("[data-wdb-r-deepen]");
          const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
          const body = document.body && document.body.innerText || "";
          const banned = /OpenRoad|Fieldry|Savant Sommelier|Global Signals|SignalTerrain as Studio/i.test(body);
          const consoleErrors = (window.__wpConsoleErrors || []).slice(0, 5);
          return {
            title: document.title || "",
            product: document.documentElement.getAttribute("data-product"),
            today, hn, quiet, deepen, overflow, banned,
            hasDiscoverCopy: /Outside today|What to notice|Nothing unusually strong|Go deeper/i.test(body),
            consoleErrors
          };
        })()`,
        returnByValue: true
      });
      const info = evalRes.result.value;
      const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
      const file = path.join(OUT, `dashboard-discover-${vp.name}.png`);
      fs.writeFileSync(file, Buffer.from(shot.data, "base64"));
      report.push({ viewport: vp.name, file: path.relative(ROOT, file), ...info });
      assert(`viewport ${vp.name} product`, info.product === "dashboard");
      assert(`viewport ${vp.name} today`, info.today);
      assert(`viewport ${vp.name} discover copy`, info.hasDiscoverCopy);
      assert(`viewport ${vp.name} no overflow`, !info.overflow);
      assert(`viewport ${vp.name} no banned promo`, !info.banned);
      console.log("SHOT", file, JSON.stringify({ hn: info.hn, quiet: info.quiet, deepen: info.deepen }));
    }

    fs.writeFileSync(
      path.join(ROOT, "reports/dashboard-discover-v1/CDP-VERIFY.json"),
      JSON.stringify({ base: BASE, at: new Date().toISOString(), viewports: report }, null, 2)
    );
    console.log("\nDASHBOARD DISCOVER CAPTURE: PASS");
    session.close();
  } finally {
    proc.kill("SIGKILL");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
