#!/usr/bin/env node
/**
 * V1.3 visual capture against dist/shedhunting (local, not a deploy).
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import path from "path";
import { createServer } from "http";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";
import { extname, join, normalize } from "path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOST = path.join(ROOT, "dist/shedhunting");
const CHROME = process.env.CHROME_PATH || "/usr/local/bin/google-chrome";
const DBG = 9362;
const PORT = 8777;
const ART = "/opt/cursor/artifacts";

function contentType(file) {
  return ({
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png",
    ".woff2": "font/woff2"
  })[extname(file).toLowerCase()] || "application/octet-stream";
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

async function waitForTab() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const tabs = await fetchJson("http://127.0.0.1:" + DBG + "/json/list");
      const page = (tabs || []).find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch (e) { /* */ }
    await delay(250);
  }
  throw new Error("CDP tab not ready");
}

const server = createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath.endsWith("/")) urlPath += "index.html";
    const file = normalize(join(HOST, urlPath));
    if (!file.startsWith(HOST)) { res.writeHead(403); res.end(); return; }
    const st = fs.statSync(file);
    if (!st.isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": contentType(file), "Cache-Control": "no-store" });
    res.end(fs.readFileSync(file));
  } catch (e) {
    res.writeHead(404); res.end("missing");
  }
});

await new Promise((r) => server.listen(PORT, "127.0.0.1", () => r()));
const userData = fs.mkdtempSync("/tmp/chrome-v13-visual-");
const proc = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
  "--window-size=1280,800",
  "--user-data-dir=" + userData,
  "--remote-debugging-port=" + DBG, "about:blank"
], { stdio: "ignore" });

try {
  const page = await waitForTab();
  const WebSocket = (await import(path.join(ROOT, "node_modules/ws/index.js"))).default;
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
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  async function shot(name) {
    const res = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ART, name + ".png"), Buffer.from(res.data, "base64"));
    console.log("shot", name);
  }
  async function evalExpr(expression) {
    const res = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    return res.result && res.result.value;
  }

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: "http://127.0.0.1:" + PORT + "/map/" });
  await send("Page.loadEventFired").catch(() => {});
  await delay(2500);
  await evalExpr(`(() => {
    try { localStorage.setItem("waypoint-sheds-ethics-seen-v1", "1"); } catch (e) {}
    try { localStorage.setItem("waypoint-sheds-first-run-coach-v1", "1"); } catch (e) {}
    var ack = document.getElementById("ethics-ack");
    if (ack) ack.click();
    var coach = document.getElementById("btn-coach-dismiss");
    if (coach) coach.click();
    var coachEl = document.getElementById("first-run-coach");
    if (coachEl) coachEl.setAttribute("hidden", "");
    document.querySelectorAll(".sheds-sheet.is-open").forEach(function (s) {
      s.classList.remove("is-open"); s.setAttribute("aria-hidden", "true");
    });
    var loading = document.getElementById("map-loading");
    if (loading) { loading.classList.add("is-done"); loading.setAttribute("hidden", ""); }
    return true;
  })()`);
  await delay(800);
  await shot("v13_default_map_desktop");

  await evalExpr(`(() => {
    var map = window.__SHEDS_MAP__;
    if (map) map.setView([41.325, -74.80], 14, { animate: false });
    var btn = document.getElementById("btn-search-areas");
    if (btn && btn.getAttribute("aria-pressed") !== "true") btn.click();
    return !!(map && btn);
  })()`);
  await delay(4500);
  await shot("v13_search_areas_enabled");

  // Inspect at current center — live elevation if network allows
  await evalExpr(`(() => {
    var map = window.__SHEDS_MAP__;
    var c = map.getCenter();
    if (window.showInspectAt) { /* not global */ }
    document.getElementById("btn-inspect-point").click();
    map.fire("click", { latlng: c });
    return { lat: c.lat, lng: c.lng, zoom: map.getZoom() };
  })()`);
  await delay(3500);
  const inspectText = await evalExpr(`(document.getElementById("inspect-body") || {}).textContent || ""`);
  console.log("inspect HUD sample:", String(inspectText).slice(0, 240));
  await shot("v13_inspect_live");

  // Insufficient zoom
  await evalExpr(`(() => {
    var map = window.__SHEDS_MAP__;
    map.setZoom(8, { animate: false });
    var c = map.getCenter();
    map.fire("click", { latlng: c });
    return map.getZoom();
  })()`);
  await delay(1500);
  await shot("v13_insufficient_zoom");

  // Inject Higher / Lower for layout proof if live inspect wasn't Higher/Lower
  await evalExpr(`(() => {
    var map = window.__SHEDS_MAP__;
    if (map) map.setView([41.325, -74.80], 14, { animate: false });
    var hud = document.getElementById("inspect-hud");
    hud.removeAttribute("hidden");
    document.getElementById("sheds-map-shell").classList.add("is-inspecting");
    document.getElementById("inspect-body").textContent = "Search priority: Higher\\n\\nTerrain\\nGentle southwest-facing bench beside steeper terrain.\\nSlope 8° · southwest-facing · ~412 m (1,352 ft)\\n\\nWhy\\n• Terrain transition may be worth checking.\\n• Moderate slope should be relatively searchable.";
    var note = document.getElementById("inspect-field-note");
    if (note) { note.hidden = false; note.textContent = "Use the terrain as a search guide, not evidence that sheds are present."; }
    return true;
  })()`);
  await delay(400);
  await shot("v13_inspect_higher");

  await evalExpr(`(() => {
    document.getElementById("inspect-body").textContent = "Search priority: Lower\\n\\nTerrain\\nSteep north-facing terrain.\\nSlope 31° · north-facing · ~510 m (1,673 ft)\\n\\nWhy\\n• Steep terrain reduces search practicality.\\n• Steeper ground is a search-effort penalty.\\n\\nField note\\nUse the terrain as a search guide, not evidence that sheds are present.";
    return true;
  })()`);
  await delay(400);
  await shot("v13_inspect_lower_steep");

  await evalExpr(`(() => {
    document.getElementById("inspect-body").textContent = "Terrain intelligence unavailable here\\n\\nWhy\\n• Missing terrain data is not a Moderate rating.\\n\\nField note\\nUse the terrain as a search guide, not evidence that sheds are present.";
    return true;
  })()`);
  await delay(300);
  await shot("v13_inspect_unavailable");

  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await evalExpr(`(() => {
    document.getElementById("inspect-hud").setAttribute("hidden", "");
    document.getElementById("sheds-map-shell").classList.remove("is-inspecting");
    window.dispatchEvent(new Event("resize"));
    var map = window.__SHEDS_MAP__;
    if (map) { map.invalidateSize(); map.setView([41.325, -74.80], 14, { animate: false }); }
    return true;
  })()`);
  await delay(800);
  await shot("v13_mobile_390_map");

  await send("Emulation.setDeviceMetricsOverride", { width: 320, height: 568, deviceScaleFactor: 2, mobile: true });
  await evalExpr(`(() => {
    var hud = document.getElementById("inspect-hud");
    hud.removeAttribute("hidden");
    document.getElementById("sheds-map-shell").classList.add("is-inspecting");
    document.getElementById("inspect-body").textContent = "Search priority: Higher\\n\\nTerrain\\nGentle southwest-facing bench beside steeper terrain.\\nSlope 8° · southwest-facing · ~412 m (1,352 ft)\\n\\nWhy\\n• Terrain transition may be worth checking.\\n\\nField note\\nUse the terrain as a search guide, not evidence that sheds are present.";
    window.dispatchEvent(new Event("resize"));
    var map = window.__SHEDS_MAP__;
    if (map) map.invalidateSize();
    return { overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2 };
  })()`);
  await delay(500);
  await shot("v13_mobile_320_inspect");

  ws.close();
} finally {
  try { proc.kill("SIGKILL"); } catch (e) { /* */ }
  server.close();
}
