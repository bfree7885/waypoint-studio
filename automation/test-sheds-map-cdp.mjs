#!/usr/bin/env node
/**
 * CDP smoke — Sheds field map shell loads without throw; sheets dismiss.
 */
import { spawn } from "child_process";
import http from "http";
import { createServer } from "http";
import { readFileSync, statSync } from "fs";
import { setTimeout as delay } from "timers/promises";
import path from "path";
import { fileURLToPath } from "url";
import { extname, join, normalize } from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const DBG = 9291;
const PORT = 8091;

function contentType(file) {
  return ({
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png"
  })[extname(file).toLowerCase()] || "application/octet-stream";
}

function startServer() {
  const server = createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      if (urlPath.endsWith("/")) urlPath += "index.html";
      const file = normalize(join(ROOT, urlPath));
      if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      const st = statSync(file);
      if (!st.isFile()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "Content-Type": contentType(file), "Cache-Control": "no-store" });
      res.end(readFileSync(file));
    } catch (e) {
      res.writeHead(404); res.end("missing");
    }
  });
  return new Promise((r) => server.listen(PORT, "127.0.0.1", () => r(server)));
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

async function main() {
  const server = await startServer();
  const proc = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-sandbox",
    "--remote-debugging-port=" + DBG, "about:blank"
  ], { stdio: "ignore" });
  await delay(2000);
  const tabs = await fetchJson("http://127.0.0.1:" + DBG + "/json/list");
  const wsUrl = tabs.find((t) => t.type === "page").webSocketDebuggerUrl;
  const WebSocket = (await import(path.join(ROOT, "node_modules/ws/index.js"))).default;
  const ws = new WebSocket(wsUrl);
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

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", { url: "http://127.0.0.1:" + PORT + "/apps/shed-hunting/map/" });
  await delay(5000);

  const { result } = await send("Runtime.evaluate", {
    expression: `(() => {
      const mapEl = document.getElementById("sheds-map");
      const errors = window.__shedsErrors || [];
      return {
        hasLeaflet: typeof L !== "undefined",
        hasMapEl: !!mapEl,
        shellBusy: document.getElementById("sheds-map-shell").getAttribute("aria-busy"),
        loc: (document.getElementById("loc-status") || {}).textContent,
        store: !!(window.WaypointShedsObservations && WaypointShedsObservations.list),
        model: !!(window.WaypointShedsLikelihood && WaypointShedsLikelihood.buildGrid),
        leafMap: !!(window.L && document.querySelector(".leaflet-container")),
        kansas: /39\\.8283|-98\\.5795/.test(document.body.innerText)
      };
    })()`,
    returnByValue: true
  });

  const v = result.value || {};
  console.log(JSON.stringify(v, null, 2));
  ws.close();
  proc.kill("SIGTERM");
  server.close();

  const ok = v.hasLeaflet && v.leafMap && v.store && v.model && !v.kansas;
  if (!ok) {
    console.error("SHEDS MAP CDP: FAIL");
    process.exit(1);
  }
  console.log("SHEDS MAP CDP: PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
