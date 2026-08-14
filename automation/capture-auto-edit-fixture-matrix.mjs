#!/usr/bin/env node
/**
 * Capture ORIGINAL vs WAYPOINT CHOICE fixture matrix via Chrome CDP.
 */
import http from "http";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import crypto from "crypto";
import net from "net";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "docs/rebuild-2026/scenes-v1-auto-edit-screenshots");
const chrome = ["/usr/bin/google-chrome", "/usr/bin/chromium-browser", "/usr/bin/chromium"]
  .find((p) => fs.existsSync(p));
if (!chrome) {
  console.error("No chrome");
  process.exit(1);
}

function startServer() {
  const server = http.createServer((req, res) => {
    let u = decodeURIComponent((req.url || "/").split("?")[0]);
    if (u.endsWith("/")) u += "index.html";
    const file = path.join(ROOT, u.replace(/^\//, ""));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end("missing"); return;
    }
    const ext = path.extname(file);
    const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg" };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

function wsConnect(wsUrl) {
  return new Promise((resolve, reject) => {
    const u = new URL(wsUrl);
    const key = crypto.randomBytes(16).toString("base64");
    const sock = net.connect(Number(u.port), u.hostname, () => {
      sock.write(
        `GET ${u.pathname}${u.search} HTTP/1.1\r\nHost: ${u.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`
      );
    });
    let buf = Buffer.alloc(0);
    let open = false;
    let id = 0;
    const pending = new Map();
    function maskPayload(payload) {
      const mask = crypto.randomBytes(4);
      const out = Buffer.alloc(payload.length);
      for (let i = 0; i < payload.length; i++) out[i] = payload[i] ^ mask[i % 4];
      return { mask, out };
    }
    function send(method, params = {}) {
      const mid = ++id;
      const frame = Buffer.from(JSON.stringify({ id: mid, method, params }));
      let hdr;
      if (frame.length < 126) {
        hdr = Buffer.alloc(6);
        hdr[0] = 0x81;
        hdr[1] = 0x80 | frame.length;
        const { mask, out } = maskPayload(frame);
        mask.copy(hdr, 2);
        sock.write(Buffer.concat([hdr, out]));
      } else {
        hdr = Buffer.alloc(8);
        hdr[0] = 0x81;
        hdr[1] = 0x80 | 126;
        hdr.writeUInt16BE(frame.length, 2);
        const { mask, out } = maskPayload(frame);
        mask.copy(hdr, 4);
        sock.write(Buffer.concat([hdr, out]));
      }
      return new Promise((res) => pending.set(mid, res));
    }
    const api = { send, close: () => sock.end() };
    sock.on("data", (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      if (!open) {
        const s = buf.toString("binary");
        const idx = s.indexOf("\r\n\r\n");
        if (idx < 0) return;
        buf = buf.slice(idx + 4);
        open = true;
        resolve(api);
      }
      while (open && buf.length >= 2) {
        let len = buf[1] & 0x7f;
        let off = 2;
        if (len === 126) { len = buf.readUInt16BE(2); off = 4; }
        else if (len === 127) { len = Number(buf.readBigUInt64BE(2)); off = 10; }
        if (buf.length < off + len) break;
        const payload = buf.slice(off, off + len);
        buf = buf.slice(off + len);
        try {
          const msg = JSON.parse(payload.toString());
          if (msg.id && pending.has(msg.id)) {
            pending.get(msg.id)(msg);
            pending.delete(msg.id);
          }
        } catch (e) { /* ignore */ }
      }
    });
    sock.on("error", reject);
  });
}

const server = await startServer();
const port = server.address().port;
const profile = path.join(ROOT, ".tmp-ae-chrome-profile-matrix");
fs.rmSync(profile, { recursive: true, force: true });
fs.mkdirSync(profile, { recursive: true });
const debugPort = 9333;
const url = `http://127.0.0.1:${port}/docs/rebuild-2026/scenes-v1-auto-edit-screenshots/fixture-runner.html`;
const child = spawn(chrome, [
  "--headless=new", "--disable-gpu", "--no-sandbox",
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${debugPort}`,
  "--window-size=1440,5000",
  url
], { stdio: "ignore" });

try {
  let wsUrl = null;
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (page) { wsUrl = page.webSocketDebuggerUrl; break; }
    } catch (e) { /* retry */ }
    await wait(200);
  }
  if (!wsUrl) throw new Error("no cdp page");
  const cdp = await wsConnect(wsUrl);
  await cdp.send("Runtime.enable");
  let results = [];
  for (let i = 0; i < 80; i++) {
    const r = await cdp.send("Runtime.evaluate", {
      expression: "window.__AE_FIXTURE_RESULTS__ ? JSON.stringify(window.__AE_FIXTURE_RESULTS__) : 'null'",
      returnByValue: true
    });
    const raw = r.result && r.result.result && r.result.result.value;
    if (raw && raw !== "null") {
      results = JSON.parse(raw);
      if (results.length === 16) break;
    }
    await wait(250);
  }
  fs.writeFileSync(path.join(OUT, "fixture-visual-results.json"), JSON.stringify(results, null, 2));
  // full page screenshot via metrics
  await cdp.send("Page.enable");
  const metrics = await cdp.send("Page.getLayoutMetrics");
  const content = metrics.result.cssContentSize || metrics.result.contentSize;
  const shot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: Math.min(content.width, 1440), height: Math.min(content.height, 8000), scale: 1 }
  });
  fs.writeFileSync(path.join(OUT, "fixture-matrix-1440.png"), Buffer.from(shot.result.data, "base64"));
  console.log("Captured fixture matrix:", results.length, "judgments");
  console.log(results.map((r) => `${r.file}: doLess=${r.doLess} ops=${r.ops.join("|")}`).join("\n"));
  cdp.close();
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  child.kill("SIGKILL");
  server.close();
}
