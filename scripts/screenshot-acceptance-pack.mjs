#!/usr/bin/env node
/**
 * Screenshot acceptance pack for public portfolio reconciliation.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { WebSocket } from "ws";

const BASE = (process.argv[2] || "http://127.0.0.1:8765").replace(/\/$/, "");
const OUT = process.argv[3] || "/opt/cursor/artifacts";
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = 9551;

fs.mkdirSync(OUT, { recursive: true });

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

const PAGES = [
  { name: "home", path: "/" },
  { name: "about", path: "/about.html" },
  { name: "support", path: "/support.html" },
  { name: "dashboard", path: "/apps/dashboard/" },
  { name: "scenes", path: "/apps/scenes/" },
  { name: "sheds", path: "/apps/shed-hunting/" },
  { name: "deck", path: "/side-trails/waypoint-deck/" },
  { name: "articles", path: "/articles/" },
  { name: "dfd", path: "/deep-forest-dispatch/" }
];

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wp-shots-"));
const proc = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  `--remote-debugging-port=${CDP_PORT}`,
  `--user-data-dir=${userDataDir}`,
  "about:blank"
], { stdio: "ignore" });

await delay(1200);
const ver = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/version`);
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r, j) => {
  ws.once("open", r);
  ws.once("error", j);
});

let id = 0;
const pending = new Map();
ws.on("message", (buf) => {
  const msg = JSON.parse(buf.toString());
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  }
});

function send(method, params = {}, sessionId) {
  const msg = { id: ++id, method, params };
  if (sessionId) msg.sessionId = sessionId;
  ws.send(JSON.stringify(msg));
  return new Promise((resolve, reject) => pending.set(msg.id, { resolve, reject }));
}

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);

async function shot(filename, width, height, mobile) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 2,
    mobile
  }, sessionId);
  await delay(400);
  const png = await send("Page.captureScreenshot", { format: "png", fromSurface: true }, sessionId);
  fs.writeFileSync(path.join(OUT, filename), Buffer.from(png.data, "base64"));
  console.log("wrote", filename);
}

async function dismissLocationAndOpenNav() {
  await send("Runtime.evaluate", {
    expression: `(() => {
      const pike = [...document.querySelectorAll("button, a")].find((b) => /Pike County/i.test(b.textContent || ""));
      if (pike) pike.click();
      const skip = [...document.querySelectorAll("button, a")].find((b) => /not now|skip|later/i.test(b.textContent || ""));
      if (skip) skip.click();
      return true;
    })()`,
    returnByValue: true
  }, sessionId);
  await delay(1200);
}

for (const page of PAGES) {
  await send("Page.navigate", { url: BASE + page.path }, sessionId);
  await delay(page.name === "dashboard" ? 5000 : 2200);
  if (page.name === "dashboard") await dismissLocationAndOpenNav();
  await shot(`${page.name}_desktop.png`, 1440, 1100, false);
  await send("Page.navigate", { url: BASE + page.path }, sessionId);
  await delay(page.name === "dashboard" ? 5000 : 2200);
  if (page.name === "dashboard") await dismissLocationAndOpenNav();
  await shot(`${page.name}_mobile_390.png`, 390, 844, true);
}

for (const page of [{ name: "home", path: "/" }, { name: "about", path: "/about.html" }, { name: "deck", path: "/side-trails/waypoint-deck/" }, { name: "support", path: "/support.html" }, { name: "dashboard", path: "/apps/dashboard/" }]) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390, height: 844, deviceScaleFactor: 2, mobile: true
  }, sessionId);
  await send("Page.navigate", { url: BASE + page.path }, sessionId);
  await delay(page.name === "dashboard" ? 5000 : 2200);
  if (page.name === "dashboard") await dismissLocationAndOpenNav();
  await shot(`${page.name}_mobile_nav_closed.png`, 390, 844, true);
  await send("Runtime.evaluate", {
    expression: `document.getElementById("was-nav-toggle")?.click(); true`,
    returnByValue: true
  }, sessionId);
  await delay(600);
  await shot(`${page.name}_mobile_nav_open.png`, 390, 844, true);
}

const EXTRA_WIDTHS = [320, 360, 375, 393, 414, 430, 768];
for (const width of EXTRA_WIDTHS) {
  const height = width === 768 ? 1024 : 844;
  await send("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: 2, mobile: width < 768
  }, sessionId);
  await send("Page.navigate", { url: BASE + "/" }, sessionId);
  await delay(1800);
  await shot(`home_w${width}_nav_closed.png`, width, height, width < 768);
  await send("Runtime.evaluate", {
    expression: `document.getElementById("was-nav-toggle")?.click(); true`,
    returnByValue: true
  }, sessionId);
  await delay(500);
  await shot(`home_w${width}_nav_open.png`, width, height, width < 768);
}

ws.close();
proc.kill();
console.log("Screenshot pack complete:", OUT);
