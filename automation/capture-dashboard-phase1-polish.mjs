#!/usr/bin/env node
/**
 * Capture Dashboard Phase 1 polish screenshots (before or after).
 * Usage: node /tmp/capture-phase1-polish.mjs <before|after> [baseUrl]
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";

const ROOT = "/home/bryan/projects/waypoint-scenes";
const PHASE = process.argv[2] === "after" ? "after" : "before";
const BASE = (process.argv[3] || "http://127.0.0.1:8765").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9391);
const OUT = path.join(ROOT, "docs/rebuild-2026/phase1-polish", PHASE);

const PIKE = {
  source: "manual",
  lat: 41.34,
  lng: -75.04,
  timestamp: Date.now(),
  regionId: "pike-county-pa",
  name: "Pike County",
  county: "Pike County",
  state: "Pennsylvania",
  stateCode: "PA",
  placeLabel: "Pike County, PA",
  displayTitle: "Pike County, PA",
  contentMode: "local-bundle"
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

async function startChrome() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wdb-p1-polish-"));
  const proc = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--disable-extensions",
    "--disable-dev-shm-usage", `--user-data-dir=${userDataDir}`,
    `--remote-debugging-port=${CDP_PORT}`, "about:blank"
  ], { stdio: "ignore" });
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
  await new Promise((r, j) => { ws.once("open", r); ws.once("error", j); });
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

  async function goto(url) {
    await send("Page.navigate", { url });
    await delay(2000);
  }

  async function shot(name) {
    const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    const file = path.join(OUT, name);
    fs.writeFileSync(file, Buffer.from(result.data, "base64"));
    console.log("wrote", file);
  }

  async function evalJs(expression) {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    return r.result && r.result.value;
  }

  async function seedAndOpen(hash) {
    await goto(BASE + "/apps/dashboard/");
    await evalJs(`(() => {
      localStorage.clear();
      localStorage.setItem("wds-location-v3", ${JSON.stringify(JSON.stringify(PIKE))});
      localStorage.setItem("wds-location-prompted", "1");
      return true;
    })()`);
    await goto(BASE + "/apps/dashboard/" + (hash || "#/"));
    await delay(2000);
    // Dismiss prompt if it still appears (bootstrap may race storage seed).
    await evalJs(`(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        /Pike County/i.test(b.textContent || "")
      );
      if (btn) btn.click();
      const mount = document.getElementById("wds-location-prompt");
      if (mount) mount.innerHTML = "";
      return true;
    })()`);
    await delay(1200);
  }

  // Desktop workspace
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false
  });
  await seedAndOpen("#/");
  const meta = await evalJs(`({
    hasActionsNav: !!document.querySelector("[data-wdb-r-actions]"),
    hasToday: !!document.querySelector("[data-wdb-r-today]"),
    hasWorkspace: !!document.querySelector("[data-wdb-r-workspace]"),
    phaseText: (document.querySelector("[data-wdb-r-phase]")||{}).textContent||"",
    widgetCount: document.querySelectorAll("[data-widget-id]").length,
    sampleStatus: (document.querySelector(".wdb-r-widget__status")||{}).textContent||"",
    localNav: Array.from(document.querySelectorAll(".was-local__nav a")).map(a => a.textContent.trim())
  })`);
  console.log("desktop meta", meta);
  await shot("01-desktop-workspace.png");

  await goto(BASE + "/apps/dashboard/#/customize");
  await delay(1500);
  await shot("02-desktop-customize.png");

  // Laptop
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1280, height: 800, deviceScaleFactor: 1, mobile: false
  });
  await seedAndOpen("#/");
  await shot("03-laptop-workspace.png");

  // Tablet
  await send("Emulation.setDeviceMetricsOverride", {
    width: 768, height: 1024, deviceScaleFactor: 2, mobile: true
  });
  await seedAndOpen("#/");
  await shot("04-tablet-workspace.png");

  // Phone
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390, height: 844, deviceScaleFactor: 2, mobile: true
  });
  await seedAndOpen("#/");
  await shot("05-phone-workspace.png");

  fs.writeFileSync(
    path.join(OUT, "capture-meta.json"),
    JSON.stringify({ capturedAt: new Date().toISOString(), base: BASE, phase: PHASE, meta }, null, 2)
  );

  ws.close();
  chrome.proc.kill("SIGTERM");
  console.log("done", PHASE);
}

main().catch((e) => { console.error(e); process.exit(1); });
