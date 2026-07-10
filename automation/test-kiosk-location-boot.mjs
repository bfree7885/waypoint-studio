#!/usr/bin/env node
/**
 * Kiosk location boot — ensures startup completes (no infinite Locating).
 */
import { spawn } from "child_process";
import http from "http";
import { setTimeout as delay } from "timers/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = process.argv[2] || "http://127.0.0.1:8080";
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const PORT = 9240;

async function startChrome() {
  const proc = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-sandbox",
    "--disable-extensions", "--remote-debugging-port=" + PORT, "about:blank"
  ], { stdio: "ignore" });
  for (let i = 0; i < 20; i++) {
    await delay(250);
    try {
      const tabs = await fetchJson("http://127.0.0.1:" + PORT + "/json/list");
      if (tabs[0]) return { proc, wsUrl: tabs.find((t) => t.type === "page").webSocketDebuggerUrl };
    } catch { /* retry */ }
  }
  proc.kill();
  throw new Error("Chrome did not start");
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });
}

class CdpClient {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(msg.error) : resolve(msg.result);
      }
    });
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function snapshot(client) {
  const { result } = await client.send("Runtime.evaluate", {
    expression: `({
      bootDone: window.__WAYPOINT_KIOSK_BOOT_DONE__ === true,
      label: document.getElementById("swk-location")?.textContent || "",
      updated: document.getElementById("swk-updated")?.textContent || "",
      locSource: window.__WAYPOINT_KIOSK_LOC__ && window.__WAYPOINT_KIOSK_LOC__.source,
      lat: window.__WAYPOINT_KIOSK_LOC__ && window.__WAYPOINT_KIOSK_LOC__.lat
    })`,
    returnByValue: true
  });
  return result.value || {};
}

async function runScenario(client, name, setupExpr, assertFn) {
  const url = BASE.replace(/\/$/, "") + "/kiosk.html?wds-migrate=1";
  try {
    await client.send("Browser.grantPermissions", {
      origin: new URL(BASE).origin,
      permissions: ["geolocation"]
    });
  } catch { /* noop */ }
  try {
    await client.send("Emulation.setGeolocationOverride", {
      latitude: 41.3312,
      longitude: -75.038,
      accuracy: 100
    });
  } catch { /* noop */ }
  await client.send("Page.navigate", { url });
  await delay(300);
  await client.send("Runtime.evaluate", { expression: setupExpr, returnByValue: true });
  await delay(20000);
  const v = await snapshot(client);
  const ok = assertFn(v);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`, JSON.stringify(v));
  return ok;
}

function notStuck(v) {
  return v.bootDone && v.label !== "Locating…" && v.updated.indexOf("Waiting for your location") === -1;
}

function notKansas(v) {
  if (v.lat == null) return true;
  return !(Math.abs(v.lat - 39.8283) < 0.2 && Math.abs((v.lng || 0) + 98.5795) < 0.2);
}

async function main() {
  const { default: WebSocket } = await import(path.join(ROOT, "node_modules/ws/index.js"));
  const { proc, wsUrl } = await startChrome();
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.on("open", r));
  const client = new CdpClient(ws);
  await client.send("Page.enable");
  await client.send("Runtime.enable");

  const scenarios = [
    ["fresh browser", "localStorage.clear(); sessionStorage.clear();", (v) => notStuck(v)],
    ["stale Kansas cache", `localStorage.setItem("wds-location-v3", JSON.stringify({source:"geo",lat:39.8283,lng:-98.5795,timestamp:Date.now()}));`, (v) => notStuck(v) && notKansas(v)]
  ];

  let failed = 0;
  for (const [name, setup, assertFn] of scenarios) {
    const ok = await runScenario(client, name, setup, assertFn);
    if (!ok) failed++;
  }

  proc.kill();
  ws.close();
  if (failed) {
    console.error(`\nKIOSK BOOT TESTS: FAIL (${failed})`);
    process.exit(1);
  }
  console.log("\nKIOSK BOOT TESTS: PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
