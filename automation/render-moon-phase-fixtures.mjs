#!/usr/bin/env node
/**
 * Rasterize MoonPhase fixtures to PNG and measure lit-area fractions.
 * Uses Chromium CDP (same path as capture-dashboard-moon-accuracy.mjs).
 * Run: node automation/render-moon-phase-fixtures.mjs
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";
import vm from "vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs/rebuild-2026/dashboard-moon-accuracy");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_MOON_CDP || 9453);
const HTTP_PORT = Number(process.env.WAYPOINT_MOON_HTTP || 8771);

function loadLunar() {
  const sandbox = { console, Math, Number, String, Object, Array, JSON, isFinite, Date };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.WDS = {};
  vm.runInNewContext(
    fs.readFileSync(path.join(ROOT, "design-system/js/dashboard/rebuild/wds-dashboard-lunar.js"), "utf8"),
    sandbox
  );
  return sandbox.WDS.dashboardLunar;
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

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", ["-m", "http.server", String(HTTP_PORT), "--bind", "127.0.0.1"], {
      cwd: ROOT,
      stdio: "ignore"
    });
    const url = "http://127.0.0.1:" + HTTP_PORT;
    const t0 = Date.now();
    const tick = () => {
      http
        .get(url + "/", (res) => {
          res.resume();
          resolve({ proc, url });
        })
        .on("error", () => {
          if (Date.now() - t0 > 8000) reject(new Error("static server failed"));
          else setTimeout(tick, 150);
        });
    };
    tick();
  });
}

async function startChrome() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wdb-moon-fix-"));
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
      if (page) return { proc, wsUrl: page.webSocketDebuggerUrl };
    } catch (_) {}
  }
  proc.kill("SIGTERM");
  throw new Error("Chrome CDP not ready");
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const Lunar = loadLunar();
  const areaReport = [];
  for (const fix of Lunar.FIXTURES) {
    const state = Lunar.normalize({
      phaseValue: fix.phaseValue,
      illumination: fix.illumination,
      phase: fix.phase
    });
    const raster = Lunar.rasterLitFraction(state, 401);
    const pathFrac = Lunar.pathAreaFraction(state);
    areaReport.push({
      id: fix.id,
      illumination: fix.illumination,
      limb: state.limb,
      raster: Math.round(raster * 10000) / 10000,
      path: Math.round(pathFrac * 10000) / 10000
    });
  }
  fs.writeFileSync(path.join(OUT, "area-report.json"), JSON.stringify(areaReport, null, 2));

  const server = await startStaticServer();
  const chrome = await startChrome();
  const { default: WebSocket } = await import("ws");
  const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
  const page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => {
    ws.once("open", r);
    ws.once("error", j);
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
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  const evalExpr = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result && r.result.value;
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1100,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false
  });
  await send("Page.navigate", {
    url: server.url + "/docs/rebuild-2026/dashboard-moon-accuracy/moon-phase-harness.html"
  });
  await delay(900);
  const ready = await evalExpr(`!!(window.WDS && WDS.dashboardLunar && document.querySelectorAll('.card').length)`);
  if (!ready) throw new Error("harness not ready");

  const painted = await evalExpr(`(() => {
    const Lunar = WDS.dashboardLunar;
    function measure(illum, limbPhase) {
      const s = Lunar.normalize({ illumination: illum, phaseValue: limbPhase });
      const svg = Lunar.renderDisk(s, { size: 200 });
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:fixed;left:-400px;top:0;width:200px;height:200px;background:#120c18';
      wrap.innerHTML = svg;
      document.body.appendChild(wrap);
      const el = wrap.querySelector('svg');
      const xml = new XMLSerializer().serializeToString(el);
      const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = 200; c.height = 200;
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#120c18';
          ctx.fillRect(0,0,200,200);
          ctx.drawImage(img, 0, 0, 200, 200);
          const data = ctx.getImageData(0, 0, 200, 200).data;
          let disk = 0, lit = 0;
          const cx = 99.5, cy = 99.5, r = 88;
          for (let y = 0; y < 200; y++) {
            for (let x = 0; x < 200; x++) {
              const dx = x - cx, dy = y - cy;
              if (dx*dx + dy*dy > r*r) continue;
              disk++;
              const i = (y * 200 + x) * 4;
              const lum = (data[i] + data[i+1] + data[i+2]) / 3;
              if (lum > 70) lit++;
            }
          }
          URL.revokeObjectURL(url);
          wrap.remove();
          resolve({ illum, disk, lit, frac: disk ? lit/disk : 0 });
        };
        img.src = url;
      });
    }
    return Promise.all([
      measure(3, 0.015),
      measure(50, 0.25),
      measure(97, 0.485)
    ]);
  })()`);

  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  fs.writeFileSync(path.join(OUT, "harness-all-phases.png"), Buffer.from(shot.data, "base64"));

  const cards = await evalExpr(`(() => {
    return [...document.querySelectorAll('.card')].map((c) => {
      const r = c.getBoundingClientRect();
      return {
        illum: c.getAttribute('data-illumination'),
        limb: c.getAttribute('data-limb'),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height)
      };
    });
  })()`);

  for (const card of cards) {
    if (!["0", "3", "25", "50", "75", "97", "100"].includes(String(card.illum))) continue;
    if (card.illum === "3" || card.illum === "25" || card.illum === "50" || card.illum === "75" || card.illum === "97") {
      /* keep both limbs */
    }
    const png = await send("Page.captureScreenshot", {
      format: "png",
      clip: {
        x: card.x,
        y: card.y,
        width: card.w,
        height: card.h,
        scale: 2
      }
    });
    const name = "fixture-" + card.illum + "-" + card.limb + ".png";
    fs.writeFileSync(path.join(OUT, name), Buffer.from(png.data, "base64"));
  }

  ws.close();
  chrome.proc.kill("SIGTERM");
  server.proc.kill("SIGTERM");

  const paintedFail = (painted || []).filter((p) => {
    if (p.illum === 3) return p.frac > 0.12;
    if (p.illum === 50) return p.frac < 0.38 || p.frac > 0.62;
    if (p.illum === 97) return p.frac < 0.85;
    return false;
  });
  const fail = areaReport.filter((r) => {
    const k = r.illumination / 100;
    const tol = k <= 0.05 || k >= 0.95 ? 0.03 : 0.05;
    return Math.abs(r.raster - k) > tol;
  });
  fs.writeFileSync(
    path.join(OUT, "area-verification.json"),
    JSON.stringify({ ok: fail.length === 0 && paintedFail.length === 0, failures: fail, paintedFail, painted, areaReport }, null, 2)
  );
  console.log(JSON.stringify({ out: OUT, ok: fail.length === 0 && paintedFail.length === 0, failCount: fail.length, painted, cards: cards.length }, null, 2));
  if (fail.length || paintedFail.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
