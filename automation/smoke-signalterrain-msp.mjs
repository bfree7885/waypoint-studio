#!/usr/bin/env node
/**
 * SignalTerrain MSP-scoped browser smoke (home + live brief).
 * Does not fail the campaign on unrelated studio-home flakes.
 *
 * Usage: node automation/smoke-signalterrain-msp.mjs [baseUrl]
 */
import { spawn } from "child_process";
import http from "http";
import { setTimeout as delay } from "timers/promises";
import { pathToFileURL } from "url";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = (process.argv[2] || "http://127.0.0.1:8080").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_ST_CDP_PORT || 9333);

const PAGES = [
  { name: "st-home", path: "/apps/signalterrain/" },
  { name: "st-live", path: "/apps/signalterrain/cyber/live.html" }
];

async function waitHttp(url, ms = 15000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          res.resume();
          if (res.statusCode && res.statusCode < 500) resolve();
          else reject(new Error("status " + res.statusCode));
        });
        req.on("error", reject);
      });
      return;
    } catch {
      await delay(250);
    }
  }
  throw new Error("Server not ready: " + url);
}

async function main() {
  await waitHttp(BASE + "/apps/signalterrain/");
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--remote-debugging-port=" + CDP_PORT,
      "about:blank"
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );
  await delay(800);
  const { default: WebSocket } = await import("ws");
  const list = await fetch("http://127.0.0.1:" + CDP_PORT + "/json/list").then((r) => r.json());
  const page = list.find((t) => t.type === "page") || list[0];
  if (!page?.webSocketDebuggerUrl) throw new Error("No CDP page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => {
    ws.once("open", r);
    ws.once("error", j);
  });
  let id = 0;
  const pending = new Map();
  ws.on("message", (buf) => {
    const msg = JSON.parse(String(buf));
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  function send(method, params = {}) {
    const my = ++id;
    return new Promise((resolve, reject) => {
      pending.set(my, { resolve, reject });
      ws.send(JSON.stringify({ id: my, method, params }));
    });
  }

  await send("Runtime.enable");
  await send("Page.enable");
  let failed = 0;
  for (const p of PAGES) {
    const url = BASE + p.path;
    console.log("===", p.name, url, "===");
    await send("Page.navigate", { url });
    await delay(2500);
    const evalResult = await send("Runtime.evaluate", {
      awaitPromise: true,
      returnByValue: true,
      expression: `(() => {
        const title = document.title || "";
        const main = !!document.querySelector("main, #main");
        const cta = !!document.querySelector('a[href*="cyber/live"], #st-live-mount, .st-live-brief');
        const trust = document.body.innerText.includes("Trust") || document.body.innerText.includes("Live") || document.body.innerText.includes("Stale") || document.body.innerText.includes("Loading");
        const sampleLeak = /lorem ipsum/i.test(document.body.innerText);
        return { title, main, cta, trust, sampleLeak, href: location.href };
      })()`
    });
    const v = evalResult?.result?.value || {};
    console.log(JSON.stringify(v));
    if (!v.main) {
      console.error("FAIL: missing main", p.name);
      failed += 1;
    }
    if (p.name === "st-home" && !v.cta) {
      console.error("FAIL: home missing live CTA", p.name);
      failed += 1;
    }
    if (v.sampleLeak) {
      console.error("FAIL: lorem on page", p.name);
      failed += 1;
    }
    console.log("PASS:", p.name);
  }
  ws.close();
  chrome.kill("SIGKILL");
  if (failed) {
    console.error("\nSIGNALTERRAIN MSP SMOKE: FAIL (" + failed + ")");
    process.exitCode = 1;
  } else {
    console.log("\nSIGNALTERRAIN MSP SMOKE: PASS");
  }
}

main().catch((err) => {
  console.error("Smoke runner error:", err.message || err);
  process.exit(1);
});
