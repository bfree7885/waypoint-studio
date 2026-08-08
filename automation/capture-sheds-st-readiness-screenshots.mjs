#!/usr/bin/env node
/**
 * Capture owner-review screenshots for Sheds + SignalTerrain readiness.
 * Expects a static server at BASE (default http://127.0.0.1:8765)
 * and Chrome CDP at CDP (default http://127.0.0.1:9222).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.SHOT_BASE || "http://127.0.0.1:8765";
const CDP = process.env.SHOT_CDP || "http://127.0.0.1:9222";
const OUT = path.join(ROOT, "docs/releases/sheds-signalterrain-readiness/screenshots");

fs.mkdirSync(OUT, { recursive: true });

async function getWsUrl() {
  const res = await fetch(`${CDP}/json/new?about:blank`, { method: "PUT" });
  const tab = await res.json();
  if (!tab.webSocketDebuggerUrl) throw new Error("no ws url: " + JSON.stringify(tab));
  return tab.webSocketDebuggerUrl;
}

function createClient(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", reject);
  });
  ws.addEventListener("message", (ev) => {
    const data = JSON.parse(ev.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(new Error(JSON.stringify(data.error)));
      else resolve(data.result || {});
    }
  });
  async function call(method, params = {}, timeout = 45000) {
    await ready;
    const mid = ++id;
    const p = new Promise((resolve, reject) => {
      pending.set(mid, { resolve, reject });
      setTimeout(() => {
        if (pending.has(mid)) {
          pending.delete(mid);
          reject(new Error("timeout " + method));
        }
      }, timeout);
    });
    ws.send(JSON.stringify({ id: mid, method, params }));
    return p;
  }
  return { call, close: () => ws.close() };
}

async function capture(client, name, url, w, h, js, waitMs = 3000) {
  await client.call("Emulation.setDeviceMetricsOverride", {
    width: w,
    height: h,
    deviceScaleFactor: 1,
    mobile: w < 800
  });
  await client.call("Page.enable");
  await client.call("Runtime.enable");
  await client.call("Page.navigate", { url });
  await new Promise((r) => setTimeout(r, waitMs));
  if (js) {
    const ev = await client.call("Runtime.evaluate", { expression: js, returnByValue: true });
    console.log("js", name, JSON.stringify(ev?.result?.value));
    await new Promise((r) => setTimeout(r, 1200));
  }
  const { data } = await client.call("Page.captureScreenshot", { format: "png", fromSurface: true });
  const file = path.join(OUT, `${name}.png`);
  fs.writeFileSync(file, Buffer.from(data, "base64"));
  console.log("captured", name, fs.statSync(file).size);
}

const dismissRegion = `(() => {
  document.querySelectorAll('button').forEach(b => {
    const t = (b.textContent||'').trim();
    if (/Pike County|Use Pike|Not now|Skip|Close|Later/i.test(t)) { try { b.click(); } catch (e) {} }
  });
  return true;
})()`;

const scrollSideTrails = `(() => {
  document.querySelectorAll('button').forEach(b => {
    const t = (b.textContent||'').trim();
    if (/Pike County|Use Pike|Not now|Skip|Close|Later/i.test(t)) { try { b.click(); } catch (e) {} }
  });
  const st = document.querySelector('[data-deepen="side-trails"], #wdb-r-side-trails-title');
  if (st) st.scrollIntoView({ block: 'center' });
  return { hasST: !!st, text: (document.body.innerText||'').includes('SignalTerrain') };
})()`;

const scrollSheds = `(() => {
  document.querySelectorAll('button').forEach(b => {
    const t = (b.textContent||'').trim();
    if (/Pike County|Use Pike|Not now|Skip|Close|Later/i.test(t)) { try { b.click(); } catch (e) {} }
  });
  const el = document.querySelector('[data-deepen="sheds"]');
  if (el) el.scrollIntoView({ block: 'center' });
  return el ? (el.innerText||'').slice(0,120) : false;
})()`;

const dismissEthics = `(() => {
  document.querySelectorAll('button').forEach(b => {
    const t = (b.textContent||'').trim();
    if (/Understood|Close/i.test(t)) { try { b.click(); } catch (e) {} }
  });
  return true;
})()`;

const client = createClient(await getWsUrl());
await capture(client, "home-desktop", `${BASE}/`, 1440, 1100, dismissRegion, 3500);
await capture(client, "home-sheds-desktop", `${BASE}/`, 1440, 1400, scrollSheds, 3500);
await capture(client, "home-side-trails-desktop", `${BASE}/`, 1440, 1600, scrollSideTrails, 4000);
await capture(client, "sheds-map-desktop", `${BASE}/apps/shed-hunting/map/`, 1440, 900, dismissEthics, 3500);
await capture(client, "st-live-desktop", `${BASE}/apps/signalterrain/cyber/live.html`, 1440, 1200, null, 4000);
await capture(client, "st-landing-desktop", `${BASE}/side-trails/signalterrain/`, 1440, 1000, null, 2500);
await capture(client, "side-trails-desktop", `${BASE}/side-trails/`, 1440, 1100, null, 3500);
await capture(client, "st-app-redirect", `${BASE}/apps/signalterrain/`, 1440, 1100, null, 3500);
await capture(client, "home-mobile", `${BASE}/`, 390, 844, scrollSideTrails, 4000);
await capture(client, "sheds-map-mobile", `${BASE}/apps/shed-hunting/map/`, 390, 844, dismissEthics, 3500);
await capture(client, "st-live-mobile", `${BASE}/apps/signalterrain/cyber/live.html`, 390, 900, null, 4000);
await capture(client, "side-trails-mobile", `${BASE}/side-trails/`, 390, 900, null, 3500);
client.close();
console.log("done");
