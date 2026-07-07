#!/usr/bin/env node
import { spawn } from "child_process";
import http from "http";
import { setTimeout as delay } from "timers/promises";

const BASE = process.argv[2] || "http://127.0.0.1:8080";
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const PORT = 9226;

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

const proc = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-sandbox",
  `--remote-debugging-port=${PORT}`, "about:blank"
], { stdio: "ignore" });
await delay(2000);
const targets = await fetchJson(`http://127.0.0.1:${PORT}/json/list`);
const { default: WebSocket } = await import("ws");
const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
await new Promise((r) => ws.on("open", r));
let id = 0;
const pending = new Map();
ws.on("message", (raw) => {
  const msg = JSON.parse(raw);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  }
});
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
const errors = [];
await send("Runtime.enable");
ws.on("message", (raw) => {
  const msg = JSON.parse(raw);
  if (msg.method === "Runtime.exceptionThrown") {
    errors.push(msg.params.exceptionDetails.text || "exception");
  }
  if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
    errors.push(msg.params.args.map((a) => a.value ?? a.description ?? "").join(" "));
  }
});
await send("Page.navigate", { url: BASE + "/" });
await delay(3000);
await send("Runtime.evaluate", {
  expression: "(() => { const b = document.getElementById('wds-loc-default'); if (b) b.click(); return !!b; })()",
  returnByValue: true
});
for (let i = 0; i < 20; i++) {
  await delay(2500);
  const { result: r1 } = await send("Runtime.evaluate", {
    expression: "document.querySelectorAll('.wdb-nature__card').length",
    returnByValue: true
  });
  const { result: r2 } = await send("Runtime.evaluate", {
    expression: "document.querySelectorAll('.wdb-missions__card').length",
    returnByValue: true
  });
  if ((r1.value || 0) >= 8 && (r2.value || 0) >= 3) break;
}
const { result } = await send("Runtime.evaluate", {
  expression: `({
    morning: !!document.querySelector('.wdb-morning'),
    pulse: !!document.querySelector('.wdb-morning__pulse'),
    nature: document.querySelectorAll('.wdb-nature__card').length,
    missions: document.querySelectorAll('.wdb-missions__card').length,
    photo: document.querySelectorAll('.wdb-photo-field__card').length,
    answers: document.querySelectorAll('.wdb-morning__answer').length,
    notices: document.querySelectorAll('.wdb-doc__notice').length,
    title: document.title
  })`,
  returnByValue: true
});
console.log(JSON.stringify({ checks: result.value, errors }, null, 2));
proc.kill();
ws.close();
