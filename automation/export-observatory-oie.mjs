#!/usr/bin/env node
/**
 * Export Outdoor Intelligence Engine briefing snapshot for Nature Observatory.
 * Usage: node automation/export-observatory-oie.mjs [baseUrl] [outputPath]
 */
import { spawn } from "child_process";
import { writeFile } from "fs/promises";
import http from "http";
import { setTimeout as delay } from "timers/promises";

const BASE = process.argv[2] || "http://127.0.0.1:8080";
const OUTPUT = process.argv[3] || "/home/bryan/waypoint-nature-observatory/data/oie-briefing.json";
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const PORT = 9227;

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

async function startChrome() {
  const proc = spawn(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    `--remote-debugging-port=${PORT}`,
    "about:blank"
  ], { stdio: "ignore" });

  for (let i = 0; i < 30; i++) {
    await delay(250);
    try {
      const targets = await fetchJson(`http://127.0.0.1:${PORT}/json/list`);
      const page = targets.find((t) => t.type === "page");
      if (page) return { proc, wsUrl: page.webSocketDebuggerUrl };
    } catch (_) { /* retry */ }
  }
  throw new Error("No CDP page target");
}

async function cdp(wsUrl) {
  const WebSocket = (await import("ws")).default;
  let id = 0;
  const pending = new Map();
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.on("open", res); ws.on("error", rej); });
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
    const msgId = ++id;
    return new Promise((resolve, reject) => {
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }
  return {
    send,
    close() { ws.close(); }
  };
}

async function run() {
  const chrome = await startChrome();
  let client;
  try {
    client = await cdp(chrome.wsUrl);
    await client.send("Runtime.enable");
    await client.send("Page.enable");
    await client.send("Page.navigate", { url: BASE + "/" });
    await delay(3000);
    await client.send("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.getElementById('wds-loc-default');
        if (btn) btn.click();
        return !!btn;
      })()`,
      returnByValue: true
    });

    for (let i = 0; i < 14; i++) {
      await delay(2500);
      const { result } = await client.send("Runtime.evaluate", {
        expression: `(() => {
          const O = window.WDS && window.WDS.outdoorIntelligenceEngine;
          const P = window.WDS && window.WDS.outdoorIntelligence && window.WDS.outdoorIntelligence.getLast
            ? window.WDS.outdoorIntelligence.getLast()
            : null;
          return !!(O && O.build && P);
        })()`,
        returnByValue: true
      });
      if (result.value) break;
    }

    const { result } = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const O = window.WDS && window.WDS.outdoorIntelligenceEngine;
        const P = window.WDS && window.WDS.outdoorIntelligence && window.WDS.outdoorIntelligence.getLast
          ? window.WDS.outdoorIntelligence.getLast()
          : null;
        const L = window.WDS && window.WDS.location && window.WDS.location.getState
          ? window.WDS.location.getState()
          : null;
        if (!O || !O.build || !O.toObservatorySnapshot || !P) return null;
        const briefing = O.build({ platform: P, location: L });
        return O.toObservatorySnapshot(briefing);
      })()`,
      returnByValue: true
    });

    if (!result.value) {
      throw new Error("Could not build OIE observatory snapshot from dashboard context");
    }

    await writeFile(OUTPUT, JSON.stringify(result.value, null, 2), "utf8");
    console.log(`OIE snapshot written: ${OUTPUT}`);
  } finally {
    if (client) client.close();
    chrome.proc.kill("SIGTERM");
  }
}

run().catch((e) => {
  console.error("Export failed:", e.message);
  process.exit(1);
});
