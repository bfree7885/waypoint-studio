/**
 * Phase 7.7 freeze-gate captures. 1366×768 to tests/evidence/phase77/.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { openSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tests/evidence/phase77");
const GAME = "http://127.0.0.1:8090/terrainbound/?field=1&v=p77";
const DEBUG_PORT = Number(process.env.TB_CDP_PORT || 9336);
const USER_DATA = `/tmp/tb-p77-chrome-${process.pid}`;

function getJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(fn, timeout = 12000, step = 80) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    last = await fn();
    if (last) return last;
    await sleep(step);
  }
  throw new Error(`timeout waiting: ${last}`);
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

function launchChrome() {
  const logFd = openSync(`/tmp/tb-p77-chrome-${process.pid}.log`, "w");
  const child = spawn(
    "google-chrome",
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${USER_DATA}`,
      "--window-size=1366,768",
      "about:blank"
    ],
    { stdio: ["ignore", logFd, logFd] }
  );
  return child;
}

async function connectPage(child) {
  const version = await waitFor(async () => {
    try {
      return await getJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
    } catch {
      if (child.exitCode != null) throw new Error(`chrome exited ${child.exitCode}`);
      return null;
    }
  }, 15000);
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });
  const browser = new Cdp(ws);
  const created = await browser.send("Target.createTarget", { url: "about:blank" });
  const attached = await browser.send("Target.attachToTarget", {
    targetId: created.targetId,
    flatten: true
  });
  const sessionId = attached.sessionId;
  const page = {
    async send(method, params = {}) {
      const id = ++browser.id;
      return new Promise((resolve, reject) => {
        browser.pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params, sessionId }));
      });
    },
    async evaluate(expression, awaitPromise = false) {
      const result = await page.send("Runtime.evaluate", {
        expression,
        awaitPromise,
        returnByValue: true
      });
      if (result.exceptionDetails) {
        const d = result.exceptionDetails;
        throw new Error(d.text || d.exception?.description || "evaluate failed");
      }
      return result.result?.value;
    }
  };
  return { browser, page, ws };
}

async function shot(page, name) {
  await sleep(160);
  const { data } = await page.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false
  });
  await writeFile(path.join(OUT, name), Buffer.from(data, "base64"));
  console.log("wrote", name);
}

const DISMISS = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 14; i += 1) {
    const btn = document.querySelector("#dialogue:not([hidden]) #dialogue-actions button");
    if (!btn) break;
    btn.click();
    await sleep(40);
  }
  document.querySelector("#journal")?.classList.remove("is-open");
  const atlas = document.querySelector("#atlas");
  if (atlas) atlas.hidden = true;
  const travel = document.querySelector("#travel-card");
  if (travel) travel.hidden = true;
  const toast = document.querySelector("#toast");
  if (toast) toast.hidden = true;
  return true;
})()`;

async function main() {
  await mkdir(OUT, { recursive: true });
  const chrome = launchChrome();
  let ws;
  try {
    const conn = await connectPage(chrome);
    ws = conn.ws;
    const { page } = conn;
    await page.send("Page.enable");
    await page.send("Runtime.enable");
    await page.send("Emulation.setDeviceMetricsOverride", {
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
      mobile: false
    });
    await page.send("Page.navigate", { url: GAME });
    await waitFor(() => page.evaluate("Boolean(window.TB)"), 15000);
    await page.evaluate(`localStorage.removeItem("terrainbound.cedar-hollow.v1")`);
    await page.send("Page.reload", { ignoreCache: true });
    await waitFor(() => page.evaluate("Boolean(window.TB)"), 15000);
    await sleep(300);
    await page.evaluate(`document.querySelector("#enter-btn")?.click()`);
    await sleep(280);
    await page.evaluate(DISMISS, true);
    await sleep(1600);
    await page.evaluate(DISMISS, true);

    await page.evaluate(`window.TB.simulateMastery("cedar-hollow")`);
    await page.evaluate(`window.TB.enterRegion("high-country")`);
    await sleep(1800);
    await page.evaluate(DISMISS, true);
    await sleep(300);

    await page.evaluate(`(() => { const TB = window.TB; TB.go(1040, 1540); TB.setPose("idle", 8000); })()`);
    await sleep(400);
    await shot(page, "tb-p77-01-hc-station-meadow.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.go(1120, 1480); TB.setPose("idle", 8000); })()`);
    await sleep(400);
    await shot(page, "tb-p77-02-hc-wide.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.go(1180, 1560); TB.setPose("walk", 20000); })()`);
    await page.evaluate(`document.querySelector("#world")?.focus()`);
    await page.evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "d", bubbles: true }))`);
    await sleep(180);
    await shot(page, "tb-p77-03-walk-a.png");
    await sleep(120);
    await shot(page, "tb-p77-04-walk-b.png");
    await sleep(120);
    await shot(page, "tb-p77-05-walk-c.png");
    await sleep(120);
    await shot(page, "tb-p77-06-walk-d.png");
    await page.evaluate(`window.dispatchEvent(new KeyboardEvent("keyup", { key: "d", bubbles: true }))`);

    console.log("done", OUT);
  } finally {
    try {
      ws?.close();
    } catch {
      /* ignore */
    }
    chrome.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
