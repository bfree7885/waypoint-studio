#!/usr/bin/env node
/**
 * Production V1 visual finish validation + owner screenshots.
 * Usage: node automation/validate-dashboard-v1-visual-finish-prod.mjs [baseUrl]
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import https from "https";
import os from "os";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = (process.argv[2] || "https://waypointstudio.org").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9461);
const OUT = path.join(
  ROOT,
  "docs/rebuild-2026/dashboard-v1-visual-finish-screenshots/prod-validation"
);
const EXPECT_SHA = "9c8babcb373829e31d1ecbcce505183e7a62d705";
const DASH =
  BASE +
  "/apps/dashboard/?v=v1-finish-1&t=vf-prod-" +
  Date.now();

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

function fetchText(url) {
  const lib = url.startsWith("https") ? https : http;
  return new Promise((resolve, reject) => {
    lib
      .get(url, { headers: { "Cache-Control": "no-cache" } }, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, text: data }));
      })
      .on("error", reject);
  });
}

async function startChrome() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wdb-vf-prod-"));
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

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const report = {
    base: BASE,
    dash: DASH,
    startedAt: new Date().toISOString(),
    build: null,
    graphicsVersion: null,
    checks: [],
    screenshots: [],
    viewports: [],
    failed: []
  };
  const pass = (name, detail) => {
    report.checks.push({ name, ok: true, detail: detail || null });
    console.log("PASS", name, detail || "");
  };
  const fail = (name, detail) => {
    report.checks.push({ name, ok: false, detail: detail || null });
    report.failed.push(name + (detail ? ": " + detail : ""));
    console.error("FAIL", name, detail || "");
  };

  const build = await fetchText(BASE + "/data/build-info.json?t=" + Date.now());
  report.build = JSON.parse(build.text);
  if (report.build.commit === EXPECT_SHA || String(report.build.shortCommit || "").startsWith("9c8babcb")) {
    pass("production SHA", report.build.shortCommit || report.build.commit);
  } else {
    fail("production SHA", JSON.stringify(report.build));
  }

  const gfx = await fetchText(
    BASE + "/design-system/js/dashboard/rebuild/wds-dashboard-rebuild-graphics.js?t=" + Date.now()
  );
  const vm = gfx.text.match(/version:\s*"([^"]+)"/);
  report.graphicsVersion = vm && vm[1];
  if (report.graphicsVersion === "5.3.0-v1-visual-finish") pass("graphics version", report.graphicsVersion);
  else fail("graphics version", report.graphicsVersion);

  if (/function moonDisc\(/.test(gfx.text) && /data-limb/.test(gfx.text)) pass("moon renderer present in prod bundle");
  else fail("moon renderer present in prod bundle");

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

  await send("Page.enable");
  await send("Runtime.enable");

  async function evalJs(expression) {
    const r = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result && r.result.value;
  }
  async function setViewport(width, height, mobile) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: mobile ? 2 : 1,
      mobile: !!mobile
    });
  }
  async function goto(url) {
    await send("Page.navigate", { url });
    await delay(2800);
  }
  async function shot(name) {
    const result = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false
    });
    const file = path.join(OUT, name);
    fs.writeFileSync(file, Buffer.from(result.data, "base64"));
    report.screenshots.push(file);
    console.log("wrote", file);
  }
  async function waitReady(timeoutMs = 50000) {
    const probe = `(function(){
      var host = document.querySelector('#wds-content-engine');
      return {
        ready: !!(host && host.classList.contains('wdb-r-ready')),
        toggles: document.querySelectorAll('[data-wdb-r-depth-toggle]').length,
        readyBodies: document.querySelectorAll('.wdb-r-widget__body--ready').length,
        gfx: (window.WDS && window.WDS.dashboardRebuildGraphics && window.WDS.dashboardRebuildGraphics.version) || null
      };
    })()`;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const st = await evalJs(probe);
      if (st && st.ready && st.readyBodies >= 3) return st;
      await delay(1000);
    }
    return evalJs(probe);
  }

  async function probeScenes() {
    return evalJs(`(function(){
      function scene(id){
        var el = document.querySelector('[data-widget-id="'+id+'"] [data-scene]');
        return el ? el.getAttribute('data-scene') : null;
      }
      function illum(id){
        var el = document.querySelector('[data-widget-id="'+id+'"] [data-illum]');
        return el ? el.getAttribute('data-illum') : null;
      }
      function hasCumulus(id){
        var art = document.querySelector('[data-widget-id="'+id+'"] .wdb-r-widget__art');
        if (!art) return null;
        return !!art.querySelector('.wdb-r-cloud--cumulus, .wdb-r-cloud--storm, .wdb-r-cloud--stratus');
      }
      function detailsLabel(){
        var t = document.querySelector('[data-wdb-r-depth-toggle]');
        return t ? String(t.textContent || '').trim() : null;
      }
      return {
        gfx: (window.WDS && window.WDS.dashboardRebuildGraphics && window.WDS.dashboardRebuildGraphics.version) || null,
        alertScene: scene('ph-alerts'),
        alertIllum: illum('ph-alerts'),
        alertCloudIcon: hasCumulus('ph-alerts'),
        rainScene: scene('ph-precip-window'),
        rainCloudIcon: hasCumulus('ph-precip-window'),
        conditionsScene: scene('ph-conditions'),
        hoursScene: scene('ph-next-hours'),
        airScene: scene('ph-air'),
        uvScene: scene('ph-uv'),
        lightScene: scene('ph-light'),
        moon: !!document.querySelector('[data-widget-id="ph-astronomy"] .wdb-r-luna, [data-widget-id="ph-astronomy"] [data-limb]'),
        details: detailsLabel(),
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
      };
    })()`);
  }

  const widths = [
    [390, 844, true],
    [430, 932, true],
    [768, 1024, true],
    [1440, 900, false],
    [1728, 1000, false]
  ];

  for (const [w, h, mobile] of widths) {
    await setViewport(w, h, mobile);
    await goto(DASH);
    const ready = await waitReady();
    const scenes = await probeScenes();
    report.viewports.push({ width: w, height: h, mobile, ready, scenes });
    if (ready && ready.ready && ready.readyBodies >= 3) pass("viewport " + w + " ready", JSON.stringify(ready));
    else fail("viewport " + w + " ready", JSON.stringify(ready));
    if (scenes && scenes.gfx === "5.3.0-v1-visual-finish") pass("viewport " + w + " gfx runtime", scenes.gfx);
    else fail("viewport " + w + " gfx runtime", JSON.stringify(scenes && scenes.gfx));
    if (scenes && !scenes.overflow) pass("viewport " + w + " no h-scroll");
    else fail("viewport " + w + " no h-scroll");
    if (scenes && /Details/.test(String(scenes.details || "")) && /›|▸|>/.test(String(scenes.details || ""))) {
      pass("viewport " + w + " Details affordance", scenes.details);
    } else if (scenes && /Details/.test(String(scenes.details || ""))) {
      pass("viewport " + w + " Details present", scenes.details);
    } else fail("viewport " + w + " Details affordance", JSON.stringify(scenes && scenes.details));
    /* Quiet alert / dry rain: only assert cloud-icon absence when those quiet scenes are active */
    if (scenes && scenes.alertIllum === "quiet" && scenes.alertCloudIcon === false) {
      pass("viewport " + w + " alerts quiet no cloud-icon");
    } else if (scenes && scenes.alertIllum === "quiet" && scenes.alertCloudIcon) {
      fail("viewport " + w + " alerts quiet no cloud-icon", JSON.stringify(scenes));
    } else {
      pass("viewport " + w + " alerts scene noted", String(scenes && scenes.alertScene) + "/" + String(scenes && scenes.alertIllum));
    }
    if (scenes && scenes.rainScene === "precip-dry" && scenes.rainCloudIcon === false) {
      pass("viewport " + w + " rain dry no cloud-icon");
    } else if (scenes && scenes.rainScene === "precip-dry" && scenes.rainCloudIcon) {
      fail("viewport " + w + " rain dry no cloud-icon", JSON.stringify(scenes));
    } else {
      pass("viewport " + w + " rain scene noted", String(scenes && scenes.rainScene));
    }
    await shot("prod-" + w + ".png");
  }

  /* Depth open on Conditions + Astronomy at 1440 */
  await setViewport(1440, 900, false);
  await goto(DASH);
  await waitReady();
  await evalJs(`(function(){
    var btn = document.querySelector('[data-widget-id="ph-conditions"] [data-wdb-r-depth-toggle]');
    if (btn) btn.click();
    return !!(btn && btn.getAttribute('aria-expanded') === 'true');
  })()`);
  await delay(600);
  await shot("prod-1440-conditions-depth.png");
  await evalJs(`(function(){
    var close = document.querySelector('[data-widget-id="ph-conditions"] [data-wdb-r-depth-close]');
    if (close) close.click();
    var astro = document.querySelector('[data-widget-id="ph-astronomy"] [data-wdb-r-depth-toggle]');
    if (astro) astro.click();
    return true;
  })()`);
  await delay(600);
  await shot("prod-1440-astronomy-depth.png");

  /* 390 collapsed + conditions depth */
  await setViewport(390, 844, true);
  await goto(DASH);
  await waitReady();
  await shot("prod-390-collapsed.png");
  await evalJs(`(function(){
    var btn = document.querySelector('[data-widget-id="ph-conditions"] [data-wdb-r-depth-toggle]');
    if (btn) btn.click();
    return true;
  })()`);
  await delay(500);
  await shot("prod-390-conditions-depth.png");

  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(OUT, "prod-report.json"), JSON.stringify(report, null, 2));
  ws.close();
  chrome.proc.kill("SIGTERM");
  console.log("\nReport:", path.join(OUT, "prod-report.json"));
  if (report.failed.length) {
    console.error(report.failed.length + " failure(s)");
    process.exit(1);
  }
  console.log("All production V1 visual finish checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
