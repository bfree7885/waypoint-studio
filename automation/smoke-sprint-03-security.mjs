#!/usr/bin/env node
/**
 * Sprint 3 security browser smoke — verifies meta CSP/referrer and basic shell mount.
 * Usage: node automation/smoke-sprint-03-security.mjs
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "docs/turnaround/2026-07-26-sprint-03");
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9361);

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });
}

function startServer() {
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath.endsWith("/")) urlPath += "index.html";
    if (urlPath === "/") urlPath = "/index.html";
    const file = path.normalize(path.join(ROOT, urlPath.replace(/^\//, "")));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end("nf");
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const types = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".webp": "image/webp",
      ".woff2": "font/woff2"
    };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, base: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

const { server, base } = await startServer();
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wds-s03-"));
const proc = spawn(
  process.env.CHROME_PATH || "/usr/bin/google-chrome",
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    `--user-data-dir=${userDataDir}`,
    `--remote-debugging-port=${CDP_PORT}`,
    "about:blank"
  ],
  { stdio: "ignore" }
);
let wsUrl;
for (let i = 0; i < 60; i++) {
  await delay(250);
  try {
    const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const page = targets.find((t) => t.type === "page");
    if (page) {
      wsUrl = page.webSocketDebuggerUrl;
      break;
    }
  } catch {}
}
if (!wsUrl) {
  console.error("CDP unavailable");
  process.exit(1);
}
const { default: WebSocket } = await import("ws");
const ws = new WebSocket(wsUrl);
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
await send("Log.enable").catch(() => ({}));

const pages = [
  { path: "/", needShell: true },
  { path: "/privacy.html", needShell: true },
  { path: "/contact.html", needShell: true },
  { path: "/support.html", needShell: true },
  { path: "/apps/dashboard/", needShell: true },
  { path: "/apps/photo-coach/", needShell: true },
  { path: "/status.html", needShell: false }
];
const results = [];
for (const p of pages) {
  const cspViolations = [];
  const onMsg = (raw) => {
    const msg = JSON.parse(String(raw));
    if (msg.method === "Log.entryAdded") {
      const e = msg.params.entry;
      if (e && /Content Security Policy|CSP/i.test(e.text || "")) cspViolations.push(e.text);
    }
  };
  ws.on("message", onMsg);
  await send("Page.navigate", { url: base + p.path });
  await delay(2500);
  const meta = await send("Runtime.evaluate", {
    expression: `(() => ({
      title: document.title,
      referrerMeta: document.querySelector('meta[name="referrer"]')?.content || null,
      cspMeta: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'),
      shell: !!document.querySelector('[data-wds-app-shell],#main,.wcs-page,.pc-page,.wle-status,main'),
      operatorStub: /operator surface|not a public product page/i.test(document.body?.innerText || "")
    }))()`,
    returnByValue: true
  });
  ws.off("message", onMsg);
  const row = {
    path: p.path,
    needShell: p.needShell,
    ...meta.result.value,
    cspViolations: cspViolations.slice(0, 5)
  };
  row.ok =
    !!row.cspMeta &&
    row.referrerMeta === "strict-origin-when-cross-origin" &&
    (!p.needShell || row.shell) &&
    cspViolations.length === 0;
  results.push(row);
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(
  path.join(OUT, "browser-smoke.json"),
  JSON.stringify({ base, generatedAt: new Date().toISOString(), results }, null, 2)
);
console.log(JSON.stringify({ ok: results.every((r) => r.ok), results }, null, 2));
ws.close();
try {
  proc.kill("SIGTERM");
} catch {}
server.close();
if (!results.every((r) => r.ok)) process.exit(1);
