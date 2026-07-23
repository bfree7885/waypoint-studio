#!/usr/bin/env node
/**
 * Capture + verify mobile tile editing (touch emulation via CDP).
 * Usage: node automation/capture-dashboard-mobile-tile-editing.mjs [baseUrl]
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = (process.argv[2] || "http://127.0.0.1:8765").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9397);
const OUT = path.join(ROOT, "docs/dashboard-mobile-tile-editing");

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

async function startChrome() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wdb-mte-"));
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
  const consoleNotes = [];
  ws.on("message", (raw) => {
    const msg = JSON.parse(String(raw));
    if (msg.method === "Runtime.consoleAPICalled") {
      const text = (msg.params.args || [])
        .map((a) => a.value || a.description || "")
        .join(" ");
      if (msg.params.type === "error" || /error/i.test(text)) consoleNotes.push(text);
    }
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
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });

  async function setViewport(width, height, mobile) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: mobile ? 2 : 1,
      mobile: !!mobile
    });
  }

  async function waitFor(expr, timeoutMs) {
    const start = Date.now();
    while (Date.now() - start < (timeoutMs || 12000)) {
      const ok = await evalExpr(expr);
      if (ok) return true;
      await delay(300);
    }
    return false;
  }

  async function goto(url) {
    await send("Page.navigate", { url });
    await waitFor(
      `!!(document.querySelector('[data-wdb-r]') || document.querySelector('.was-local__nav'))`,
      15000
    );
    await delay(800);
  }

  async function evalExpr(expression) {
    const result = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (result.exceptionDetails) {
      throw new Error(JSON.stringify(result.exceptionDetails));
    }
    return result.result && result.result.value;
  }

  async function shot(name) {
    const result = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false
    });
    fs.writeFileSync(path.join(OUT, name), Buffer.from(result.data, "base64"));
    console.log("wrote", name);
  }

  async function dismissLocationIfPresent() {
    await evalExpr(`(function () {
      var btns = Array.prototype.slice.call(document.querySelectorAll('button'));
      var pike = btns.find(function (b) { return /Pike County/i.test(b.textContent || ''); });
      if (pike) pike.click();
      var skip = btns.find(function (b) { return /not now|skip|later/i.test(b.textContent || ''); });
      if (skip) skip.click();
      return true;
    })()`);
    await delay(600);
  }

  const results = [];

  // —— Phone workspace: Customize visible ——
  await setViewport(390, 844, true);
  await goto(BASE + "/?mte=" + Date.now() + "#/");
  await dismissLocationIfPresent();
  await waitFor(`!!document.querySelector('[data-wdb-r-workspace]')`, 12000);
  await evalExpr(`window.scrollTo(0,0)`);
  await delay(400);
  const phoneWs = await evalExpr(`(function () {
    var local = document.querySelector('.was-local');
    var localDisplay = local ? getComputedStyle(local).display : 'missing';
    var localLink = Array.prototype.slice.call(document.querySelectorAll('.was-local__nav a'))
      .map(function (a) { return (a.textContent || '').trim(); });
    var entry = document.querySelector('[data-wdb-r-customize-entry]');
    var entryBox = entry ? entry.getBoundingClientRect() : null;
    var overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    return {
      localDisplay: localDisplay,
      localLink: localLink,
      hasEntry: !!entry,
      entryH: entryBox ? entryBox.height : 0,
      entryW: entryBox ? entryBox.width : 0,
      overflow: overflow,
      customizeVersion: (window.WDS && WDS.dashboardRebuildCustomize && WDS.dashboardRebuildCustomize.version) || null,
      view: (window.WDS && WDS.dashboardRebuild && WDS.dashboardRebuild.getView && WDS.dashboardRebuild.getView()) || null
    };
  })()`);
  results.push({ id: "phone-workspace", ...phoneWs });
  await shot("01-phone-workspace.png");

  // Activate Customize via entry (pointer/touch path)
  await evalExpr(`(function () {
    var entry = document.querySelector('[data-wdb-r-customize-entry]');
    if (entry) { entry.click(); return 'entry'; }
    var link = Array.prototype.slice.call(document.querySelectorAll('.was-local__nav a'))
      .find(function (a) { return /Customize/i.test(a.textContent || ''); });
    if (link) { link.click(); return 'local-nav'; }
    location.hash = '#/customize';
    return 'hash';
  })()`);
  await waitFor(`!!document.querySelector('[data-wdb-r-action="save"]')`, 10000);
  await evalExpr(`window.scrollTo(0,0)`);
  await delay(400);
  const phoneCustom = await evalExpr(`(function () {
    var bar = document.querySelector('[data-wdb-r-customize-bar]');
    var save = document.querySelector('[data-wdb-r-action="save"]');
    var cancel = document.querySelector('[data-wdb-r-action="cancel"]');
    var moveUp = document.querySelector('[data-wdb-r-action="move-up"]');
    var overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    var saveBox = save ? save.getBoundingClientRect() : null;
    return {
      hasBar: !!bar,
      hasSave: !!save,
      hasCancel: !!cancel,
      hasMoveUp: !!moveUp,
      saveInView: !!(saveBox && saveBox.bottom <= (window.innerHeight + 2) && saveBox.height >= 40),
      overflow: overflow,
      drafting: !!(window.WDS && WDS.dashboardRebuildPrefs && WDS.dashboardRebuildPrefs.isDrafting && WDS.dashboardRebuildPrefs.isDrafting()),
      view: (window.WDS && WDS.dashboardRebuild && WDS.dashboardRebuild.getView && WDS.dashboardRebuild.getView()) || null
    };
  })()`);
  results.push({ id: "phone-customize", ...phoneCustom });
  await shot("02-phone-customize.png");

  // Disable Astronomy + Save
  await evalExpr(`(function () {
    var hide = Array.prototype.slice.call(document.querySelectorAll('[data-wdb-r-action="hide"]'))
      .find(function (b) { return b.getAttribute('data-widget-id') === 'ph-astronomy'; });
    if (hide) hide.click();
    return !!hide;
  })()`);
  await delay(500);
  await evalExpr(`(function () {
    var save = document.querySelector('[data-wdb-r-action="save"]');
    if (save) save.click();
    return !!save;
  })()`);
  await waitFor(`(window.WDS && WDS.dashboardRebuild && WDS.dashboardRebuild.getView() === 'workspace')`, 8000);
  await delay(500);
  const afterSave = await evalExpr(`(function () {
    var Prefs = window.WDS && WDS.dashboardRebuildPrefs;
    var prefs = Prefs && Prefs.loadFromStorage ? Prefs.loadFromStorage() : Prefs.load();
    var hasAstro = !!document.querySelector('[data-widget-id="ph-astronomy"]');
    return {
      view: (window.WDS && WDS.dashboardRebuild && WDS.dashboardRebuild.getView && WDS.dashboardRebuild.getView()) || null,
      enabledHasAstro: prefs.enabled.indexOf('ph-astronomy') >= 0,
      domHasAstro: hasAstro,
      drafting: Prefs.isDrafting && Prefs.isDrafting()
    };
  })()`);
  results.push({ id: "phone-after-save-disable", ...afterSave });
  await shot("03-phone-workspace-after-save.png");

  // Desktop regression
  await setViewport(1440, 900, false);
  await goto(BASE + "/?mte=" + Date.now() + "#/");
  await dismissLocationIfPresent();
  await waitFor(`!!document.querySelector('[data-wdb-r-customize-entry]')`, 10000);
  await evalExpr(`window.scrollTo(0,0)`);
  await delay(400);
  const desk = await evalExpr(`(function () {
    var local = document.querySelector('.was-local');
    var localDisplay = local ? getComputedStyle(local).display : 'missing';
    var entry = document.querySelector('[data-wdb-r-customize-entry]');
    return {
      localDisplay: localDisplay,
      hasEntry: !!entry,
      localLinks: Array.prototype.slice.call(document.querySelectorAll('.was-local__nav a'))
        .map(function (a) { return (a.textContent || '').trim(); })
    };
  })()`);
  results.push({ id: "desktop-workspace", ...desk });
  await shot("04-desktop-workspace.png");

  await evalExpr(`location.hash = '#/customize';`);
  await waitFor(`!!document.querySelector('[data-wdb-r-action="save"]')`, 10000);
  await delay(400);
  const deskCustom = await evalExpr(`(function () {
    return {
      hasSave: !!document.querySelector('[data-wdb-r-action="save"]'),
      hasCancel: !!document.querySelector('[data-wdb-r-action="cancel"]'),
      hasCatalog: !!document.querySelector('[data-wdb-r-catalog]'),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  })()`);
  results.push({ id: "desktop-customize", ...deskCustom });
  await shot("05-desktop-customize.png");

  // Narrow phones
  for (const w of [320, 375, 430]) {
    await setViewport(w, 720, true);
    await goto(BASE + "/#/customize");
    await dismissLocationIfPresent();
    await delay(900);
    const probe = await evalExpr(`(function () {
      return {
        width: ${w},
        hasSave: !!document.querySelector('[data-wdb-r-action="save"]'),
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        saveH: (function () {
          var el = document.querySelector('[data-wdb-r-action="save"]');
          return el ? el.getBoundingClientRect().height : 0;
        })()
      };
    })()`);
    results.push({ id: "viewport-" + w, ...probe });
    await shot("0" + (w === 320 ? "6" : w === 375 ? "7" : "8") + "-phone-" + w + "-customize.png");
  }

  const meta = {
    capturedAt: new Date().toISOString(),
    base: BASE,
    consoleNotes,
    results
  };
  fs.writeFileSync(path.join(OUT, "capture-meta.json"), JSON.stringify(meta, null, 2));
  console.log(JSON.stringify(meta, null, 2));

  const hardFails = [];
  if (phoneWs.localDisplay === "none") hardFails.push("local nav hidden on phone");
  if (!phoneWs.hasEntry) hardFails.push("missing Customize entry");
  if (phoneWs.entryH < 40) hardFails.push("Customize entry touch target too small");
  if (!phoneCustom.hasSave || !phoneCustom.hasCancel) hardFails.push("missing Save/Cancel");
  if (!phoneCustom.hasMoveUp) hardFails.push("missing Move up");
  if (phoneCustom.overflow) hardFails.push("phone customize horizontal overflow");
  if (afterSave.enabledHasAstro) hardFails.push("astronomy still enabled after save");
  if (afterSave.domHasAstro) hardFails.push("astronomy still in DOM after save");
  if (!desk.hasEntry || desk.localDisplay === "none") hardFails.push("desktop entry/nav regression");
  if (!deskCustom.hasSave || !deskCustom.hasCatalog) hardFails.push("desktop customize regression");

  ws.close();
  try {
    chrome.proc.kill("SIGTERM");
  } catch (_) {}

  if (hardFails.length) {
    console.error("VERIFY FAIL", hardFails);
    process.exit(1);
  }
  console.log("VERIFY PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
