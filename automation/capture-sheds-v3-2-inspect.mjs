#!/usr/bin/env node
/**
 * Sheds V3.2 — CDP Inspect Field Intelligence capture.
 * Usage: node automation/capture-sheds-v3-2-inspect.mjs [baseUrl]
 */
import fs from "fs";
import path from "path";
import http from "http";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { setTimeout as delay } from "timers/promises";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "reports/sheds-v3-2-field-intelligence");
const SCREENS = path.join(OUT, "screens");
const BASE = process.argv[2] || "http://127.0.0.1:8765";
const DBG = 9337;

fs.mkdirSync(SCREENS, { recursive: true });

function httpJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(d));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

const profile = path.join(OUT, "chrome-profile-cdp");
fs.mkdirSync(profile, { recursive: true });
const chrome = spawn(
  "google-chrome",
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${DBG}`,
    "--window-size=390,844",
    `${BASE}/apps/shed-hunting/map/`
  ],
  { stdio: "ignore" }
);

await delay(2500);
const tabs = await httpJson(`http://127.0.0.1:${DBG}/json/list`);
const page = tabs.find((t) => t.type === "page");
if (!page) throw new Error("no page tab");
const wsPath = path.join(ROOT, "node_modules/ws/index.js");
const WebSocket = (await import(wsPath)).default;
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.on("open", r));
let id = 0;
const pending = new Map();
ws.on("message", (raw) => {
  const msg = JSON.parse(raw);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
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
await delay(3500);

await send("Runtime.evaluate", {
  expression: `(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const accept = btns.find((el) => /accept|agree|continue|got it|enter/i.test(el.textContent || ''));
    if (accept) accept.click();
    return accept ? accept.textContent.trim() : null;
  })()`,
  returnByValue: true
});
await delay(600);

await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true
});
await delay(400);

await send("Runtime.evaluate", {
  expression: `document.getElementById('btn-more')?.click(); true`,
  returnByValue: true
});
await delay(400);
await send("Runtime.evaluate", {
  expression: `document.getElementById('btn-layers')?.click(); true`,
  returnByValue: true
});
await delay(400);
const armed = await send("Runtime.evaluate", {
  expression: `(() => {
    const b = document.getElementById('btn-inspect-point');
    if (!b) return 'missing';
    b.click();
    return document.getElementById('sheds-map-shell')?.classList.contains('is-inspecting') ? 'armed' : 'clicked';
  })()`,
  returnByValue: true
});
await delay(300);

// Tap near map center (Pike pack may not load until SEARCH — still get elev/aspect)
await send("Runtime.evaluate", {
  expression: `(() => {
    const mapEl = document.getElementById('sheds-map');
    const r = mapEl.getBoundingClientRect();
    const x = r.left + r.width * 0.5;
    const y = r.top + r.height * 0.45;
    const el = document.elementFromPoint(x, y) || mapEl;
    for (const type of ['pointerdown','mousedown','pointerup','mouseup','click']) {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, view: window }));
    }
    return { x, y };
  })()`,
  returnByValue: true
});
await delay(4500);

const hud = await send("Runtime.evaluate", {
  expression: `(() => {
    const body = document.getElementById('inspect-body');
    const hud = document.getElementById('inspect-hud');
    return {
      hidden: !hud || hud.hasAttribute('hidden'),
      text: body ? body.textContent : '',
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      mapShare: (() => {
        const m = document.getElementById('sheds-map');
        return m ? +(m.getBoundingClientRect().height / window.innerHeight).toFixed(3) : 0;
      })(),
      hasWhy: !!(body && /Why this area may matter/i.test(body.textContent || '')),
      hasLimits: !!(body && /Limits:/i.test(body.textContent || '')),
      banned: !!(body && /shed found|antler here|find probability/i.test(body.textContent || ''))
    };
  })()`,
  returnByValue: true
});

const shot = await send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync(path.join(SCREENS, "390-inspect-after-tap.png"), Buffer.from(shot.data, "base64"));
fs.writeFileSync(path.join(OUT, "cdp-inspect-390.json"), JSON.stringify({ armed: armed.result, hud: hud.result }, null, 2));

console.log("armed", armed.result);
console.log("hud", JSON.stringify(hud.result, null, 2).slice(0, 2500));

ws.close();
chrome.kill();
