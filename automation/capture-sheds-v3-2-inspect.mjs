#!/usr/bin/env node
/**
 * Sheds V3.2 — CDP Inspect field-UX capture (375/390/430 + desktop).
 * Usage: node automation/capture-sheds-v3-2-inspect.mjs
 */
import fs from "fs";
import path from "path";
import http from "http";
import { createServer } from "http";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { setTimeout as delay } from "timers/promises";
import { extname, join, normalize } from "path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "reports/sheds-v3-2-field-intelligence");
const SCREENS = path.join(OUT, "screens");
const PORT = 8159;
const DBG = 9377;
const PIKE = { lat: 41.33, lng: -74.8, zoom: 14 };
const PIKE2 = { lat: 41.334, lng: -74.793 };

fs.mkdirSync(SCREENS, { recursive: true });

const server = createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath.endsWith("/")) urlPath += "index.html";
    const file = normalize(join(ROOT, urlPath));
    if (!file.startsWith(ROOT)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const st = fs.statSync(file);
    if (!st.isFile()) {
      res.writeHead(404);
      res.end();
      return;
    }
    const ct =
      {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json",
        ".png": "image/png"
      }[extname(file).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": ct, "Cache-Control": "no-store" });
    res.end(fs.readFileSync(file));
  } catch {
    res.writeHead(404);
    res.end("missing");
  }
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${PORT}`;

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
    "about:blank"
  ],
  { stdio: "ignore" }
);

let ws;
try {
  await delay(2200);
  const tabs = await httpJson(`http://127.0.0.1:${DBG}/json/list`);
  const page = tabs.find((t) => t.type === "page");
  if (!page) throw new Error("no page tab");
  const wsPath = path.join(ROOT, "node_modules/ws/index.js");
  const WebSocket = (await import(wsPath)).default;
  ws = new WebSocket(page.webSocketDebuggerUrl);
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
  await send("Page.navigate", { url: `${BASE}/apps/shed-hunting/map/` });
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
  await delay(500);

  const inspectHud = `(() => {
    const body = document.getElementById('inspect-body');
    const moreBody = document.getElementById('inspect-more-body');
    const more = document.getElementById('inspect-more');
    const hud = document.getElementById('inspect-hud');
    const prompt = document.getElementById('search-prompt');
    const plan = document.getElementById('plan-card');
    const closeBtn = document.getElementById('btn-inspect-close');
    const locate = document.getElementById('btn-locate') || document.querySelector('.sheds-map-ctrls');
    const obsFab = document.getElementById('btn-add-obs-fab');
    const text = [body && body.textContent, moreBody && moreBody.textContent].filter(Boolean).join('\\n');
    const facts = body ? body.textContent : '';
    const marker = document.querySelector('.sheds-inspect-marker');
    const you = document.querySelector('.sheds-user-marker');
    const hudBox = hud && !hud.hasAttribute('hidden') ? hud.getBoundingClientRect() : null;
    const mapBox = document.getElementById('sheds-map')?.getBoundingClientRect();
    const locBox = locate ? locate.getBoundingClientRect() : null;
    const closeBox = closeBtn ? closeBtn.getBoundingClientRect() : null;
    return {
      hidden: !hud || hud.hasAttribute('hidden'),
      text,
      facts,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      mapShare: mapBox ? +(mapBox.height / window.innerHeight).toFixed(3) : 0,
      hudHeight: hudBox ? +hudBox.height.toFixed(1) : 0,
      hudMapRatio: hudBox && mapBox ? +(hudBox.height / mapBox.height).toFixed(3) : 0,
      hasTerrain: /Terrain/.test(facts),
      hasHabitat: /Habitat/.test(facts),
      hasElevation: /Elevation:/.test(facts),
      hasSlope: /Slope:/.test(facts),
      hasAspect: /Aspect:/.test(facts),
      hasLandCover: /Land cover:/.test(facts),
      hasWhatIsHere: /What is here/.test(facts),
      factsHaveWhy: /Why this may matter/i.test(facts),
      hasWhy: /Why this may matter/i.test(text),
      hasLimits: /Limits/.test(text),
      moreOpen: !!(more && more.open),
      promptHidden: !prompt || prompt.hasAttribute('hidden') || getComputedStyle(prompt).display === 'none',
      planHidden: !plan || getComputedStyle(plan).display === 'none' || plan.hasAttribute('hidden'),
      factsOverflow: !!(body && body.scrollHeight > body.clientHeight + 12),
      bodyClient: body ? +body.clientHeight.toFixed(1) : 0,
      bodyScroll: body ? +body.scrollHeight.toFixed(1) : 0,
      inspecting: document.getElementById('sheds-map-shell')?.classList.contains('is-inspecting'),
      closeMinHeight: closeBox ? +closeBox.height.toFixed(1) : 0,
      locateClearOfHud: !hudBox || !locBox || locBox.left + 4 >= hudBox.right || locBox.top + 4 >= hudBox.bottom,
      obsFabPresent: !!obsFab,
      banned: /shed found|antler here|find probability|deer are here|bedding area|feeding area/i.test(text),
      inspectMarker: !!marker,
      youMarker: !!you,
      closeEnabled: !!closeBtn,
      coords: (facts.match(/\\d+\\.\\d+, -\\d+\\.\\d+/) || [''])[0]
    };
  })()`;

  async function setViewport(width, height, mobile) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: mobile ? 2 : 1,
      mobile: !!mobile
    });
    await delay(350);
  }

  async function shot(name) {
    const shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(SCREENS, name), Buffer.from(shot.data, "base64"));
  }

  async function openInspectAtPike() {
    await send("Runtime.evaluate", {
      expression: `(() => {
        const map = window.__SHEDS_MAP__;
        if (map && map.setView) map.setView([${PIKE.lat}, ${PIKE.lng}], ${PIKE.zoom}, { animate: false });
        const b = document.getElementById('btn-inspect-point');
        if (b) b.click();
        return {
          hasMap: !!map,
          inspecting: document.getElementById('sheds-map-shell')?.classList.contains('is-inspecting')
        };
      })()`,
      returnByValue: true
    });
    await delay(400);
    const placed = await send("Runtime.evaluate", {
      expression: `(() => {
        const map = window.__SHEDS_MAP__;
        if (!map) return { ok: false };
        map.fire('click', { latlng: { lat: ${PIKE.lat}, lng: ${PIKE.lng} } });
        return { ok: true };
      })()`,
      returnByValue: true
    });
    await delay(5000);
    return placed;
  }

  const results = {};

  for (const vp of [
    { w: 375, h: 812, mobile: true, prefix: "375" },
    { w: 390, h: 844, mobile: true, prefix: "390" },
    { w: 430, h: 932, mobile: true, prefix: "430" }
  ]) {
    await setViewport(vp.w, vp.h, vp.mobile);
    await send("Runtime.evaluate", {
      expression: `document.getElementById('btn-inspect-close')?.click(); true`,
      returnByValue: true
    });
    await delay(200);
    await shot(`${vp.prefix}-map-initial.png`);
    await openInspectAtPike();
    const hud = await send("Runtime.evaluate", { expression: inspectHud, returnByValue: true });
    results[vp.prefix] = (hud.result && hud.result.value) || hud.result;
    await shot(`${vp.prefix}-inspect-after-tap.png`);
    if (vp.prefix === "390") {
      await send("Runtime.evaluate", {
        expression: `document.getElementById('inspect-more')?.querySelector('summary')?.click(); true`,
        returnByValue: true
      });
      await delay(250);
      const expanded = await send("Runtime.evaluate", { expression: inspectHud, returnByValue: true });
      results["390-expanded"] = (expanded.result && expanded.result.value) || expanded.result;
      await shot("390-inspect-why-open.png");
      await send("Runtime.evaluate", {
        expression: `document.getElementById('inspect-more')?.querySelector('summary')?.click(); true`,
        returnByValue: true
      });
      await delay(150);
    }
  }

  await setViewport(390, 844, true);
  await send("Runtime.evaluate", {
    expression: `document.getElementById('btn-inspect-close')?.click(); true`,
    returnByValue: true
  });
  await delay(400);
  const dismissed = await send("Runtime.evaluate", { expression: inspectHud, returnByValue: true });
  results.dismissed = (dismissed.result && dismissed.result.value) || dismissed.result;
  await shot("390-inspect-dismissed.png");

  await setViewport(390, 844, true);
  await openInspectAtPike();
  const first = await send("Runtime.evaluate", { expression: inspectHud, returnByValue: true });
  results.rapidFirst = (first.result && first.result.value) || first.result;
  await send("Runtime.evaluate", {
    expression: `(() => {
      const map = window.__SHEDS_MAP__;
      if (!map) return { ok: false };
      map.fire('click', { latlng: { lat: ${PIKE2.lat}, lng: ${PIKE2.lng} } });
      return { ok: true };
    })()`,
    returnByValue: true
  });
  await delay(5000);
  const second = await send("Runtime.evaluate", { expression: inspectHud, returnByValue: true });
  results.rapidSecond = (second.result && second.result.value) || second.result;
  await shot("390-inspect-second-point.png");

  await setViewport(1280, 800, false);
  await openInspectAtPike();
  const desk = await send("Runtime.evaluate", { expression: inspectHud, returnByValue: true });
  results.desktop = (desk.result && desk.result.value) || desk.result;
  await shot("1280-inspect-after-tap.png");

  fs.writeFileSync(path.join(OUT, "cdp-inspect-390.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2).slice(0, 4000));
} finally {
  try {
    if (ws) ws.close();
  } catch {
    /* */
  }
  try {
    chrome.kill();
  } catch {
    /* */
  }
  server.close();
}
