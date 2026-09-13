/**
 * Phase 7.5 screenshot harness. Drives TerrainBound via ?field=1 and writes
 * 1366×768 PNGs to tests/evidence/phase75/.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { openSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tests/evidence/phase75");
const GAME = "http://127.0.0.1:8090/terrainbound/?field=1&v=p75";
const DEBUG_PORT = Number(process.env.TB_CDP_PORT || 9334);
const USER_DATA = `/tmp/tb-p75-chrome-${process.pid}`;

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

  async evaluate(expression, awaitPromise = false) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise,
      returnByValue: true
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || "evaluate failed");
    }
    return result.result?.value;
  }
}

function launchChrome() {
  const logFd = openSync(`/tmp/tb-p75-chrome-${process.pid}.log`, "w");
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
  await sleep(220);
  const { data } = await page.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false
  });
  const file = path.join(OUT, name);
  await writeFile(file, Buffer.from(data, "base64"));
  console.log("wrote", name);
}

const DISMISS = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 12; i += 1) {
    const btn = document.querySelector("#dialogue:not([hidden]) #dialogue-actions button");
    if (!btn) break;
    btn.click();
    await sleep(40);
  }
  const journal = document.querySelector("#journal");
  journal?.classList.remove("is-open");
  const atlas = document.querySelector("#atlas");
  if (atlas) atlas.hidden = true;
  const travel = document.querySelector("#travel-card");
  if (travel) travel.hidden = true;
  const geo = document.querySelector("#geo-panel");
  if (geo) geo.hidden = true;
  const flume = document.querySelector("#flume");
  if (flume) flume.hidden = true;
  return true;
})()`;

async function boot(page) {
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
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const chrome = launchChrome();
  let ws;
  try {
    const conn = await connectPage(chrome);
    ws = conn.ws;
    const { page } = conn;

    await boot(page);
    await page.evaluate(`localStorage.removeItem("terrainbound.cedar-hollow.v1")`);
    await page.send("Page.reload", { ignoreCache: true });
    await waitFor(() => page.evaluate("Boolean(window.TB)"), 15000);
    await sleep(400);

    await shot(page, "tb-p75-01-title.png");

    await page.evaluate(`document.querySelector("#enter-btn")?.click()`);
    await sleep(280);
    await shot(page, "tb-p75-02-new-exploration-arrival.png");
    await page.evaluate(DISMISS, true);
    await sleep(1600);
    await page.evaluate(DISMISS, true);

    await page.evaluate(`(() => { const TB = window.TB; TB.go(1688, 940); TB.setPose("idle", 8000); })()`);
    await sleep(400);
    await shot(page, "tb-p75-03-idle.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.go(1560, 980); })()`);
    await sleep(200);
    await page.evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "d", bubbles: true }))`);
    await sleep(520);
    await shot(page, "tb-p75-04-walking.png");
    await page.evaluate(`window.dispatchEvent(new KeyboardEvent("keyup", { key: "d", bubbles: true }))`);

    await page.evaluate(`(() => { const TB = window.TB; TB.go(1840, 1000); TB.setPose("inspect", 8000); })()`);
    await sleep(350);
    await shot(page, "tb-p75-05-inspecting.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.go(1840, 1000); TB.setPose("measure", 8000); })()`);
    await sleep(350);
    await shot(page, "tb-p75-06-measuring.png");

    await page.evaluate(`(() => { window.TB.go(1688, 940); window.TB.openJournal(); window.TB.setPose("tablet", 8000); })()`);
    await sleep(400);
    await shot(page, "tb-p75-07-tablet-use.png");
    await page.evaluate(`document.querySelector("#journal")?.classList.remove("is-open")`);

    await page.evaluate(`(() => { const TB = window.TB; TB.go(1310, 360); TB.setPose("sky", 12000); })()`);
    await sleep(450);
    await shot(page, "tb-p75-08-sky-observation.png");

    await page.evaluate(DISMISS, true);
    await page.evaluate(`(() => { const TB = window.TB; TB.go(1688, 940); TB.setPose("idle", 8000); })()`);
    await sleep(400);
    await shot(page, "tb-p75-09-cedar-station.png");

    await page.evaluate(`window.TB.talk()`);
    await sleep(250);
    await shot(page, "tb-p75-10-cedar-wren.png");
    await page.evaluate(DISMISS, true);

    await page.evaluate(`(() => { const TB = window.TB; TB.go(860, 690); TB.setPose("idle", 8000); })()`);
    await sleep(400);
    await shot(page, "tb-p75-11-cedar-creek-woods.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.go(1080, 1188); TB.setPose("idle", 8000); })()`);
    await sleep(400);
    await shot(page, "tb-p75-12-cedar-pond-marsh.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.go(1840, 1000); TB.openFlume(); })()`);
    await sleep(350);
    await shot(page, "tb-p75-13-cedar-scientific.png");
    await page.evaluate(`document.querySelector("#flume") && (document.querySelector("#flume").hidden = true)`);
    await page.evaluate(DISMISS, true);

    await page.evaluate(`window.TB.simulateMastery("cedar-hollow")`);
    await page.evaluate(`window.TB.enterRegion("high-country")`);
    await sleep(220);
    await shot(page, "tb-p75-28-travel-ch-hc.png");
    await sleep(1600);
    await page.evaluate(DISMISS, true);
    await sleep(200);
    await shot(page, "tb-p75-14-high-country-arrival.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.go(1040, 1500); TB.setPose("idle", 8000); })()`);
    await sleep(400);
    await shot(page, "tb-p75-15-ridgeline-station.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.go(460, 508); TB.setPose("idle", 8000); })()`);
    await sleep(400);
    await shot(page, "tb-p75-16-high-country-alpine.png");

    await page.evaluate(`window.TB.openAtlas("high-country")`);
    await sleep(280);
    await shot(page, "tb-p75-17-high-country-map.png");
    await page.evaluate(`document.querySelector("#atlas") && (document.querySelector("#atlas").hidden = true)`);

    await page.evaluate(`(() => { const TB = window.TB; TB.go(620, 960); TB.setPose("inspect", 8000); })()`);
    await sleep(250);
    await page.evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "e", bubbles: true }))`);
    await sleep(200);
    await shot(page, "tb-p75-18-high-country-washout.png");
    await page.evaluate(DISMISS, true);

    await page.evaluate(`window.TB.simulateMastery("high-country")`);
    await page.evaluate(`window.TB.enterRegion("sunfall-desert")`);
    await sleep(220);
    await shot(page, "tb-p75-29-travel-hc-sunfall.png");
    await sleep(1600);
    await page.evaluate(DISMISS, true);
    await sleep(200);
    await shot(page, "tb-p75-19-sunfall-arrival.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.jump("noon"); TB.go(1408, 1188); TB.setPose("idle", 8000); })()`);
    await sleep(400);
    await shot(page, "tb-p75-20-sunfall-observatory.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.jump("noon"); TB.go(2088, 900); TB.setPose("idle", 8000); })()`);
    await sleep(400);
    await shot(page, "tb-p75-21-sunfall-daytime.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.jump("noon"); TB.go(1512, 1120); TB.setPose("measure", 8000); })()`);
    await sleep(350);
    await page.evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "e", bubbles: true }))`);
    await sleep(220);
    await shot(page, "tb-p75-22-sunfall-shadow.png");
    await page.evaluate(DISMISS, true);

    await page.evaluate(`(() => { const TB = window.TB; TB.jump("night"); TB.go(1408, 1188); TB.setPose("idle", 8000); })()`);
    await sleep(450);
    await shot(page, "tb-p75-23-sunfall-night.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.jump("night"); TB.go(380, 488); TB.setPose("sky", 12000); })()`);
    await sleep(450);
    await page.evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "e", bubbles: true }))`);
    await sleep(200);
    await shot(page, "tb-p75-24-sunfall-moon-sky.png");

    await page.evaluate(DISMISS, true);
    await page.evaluate(`(() => { const TB = window.TB; TB.go(1408, 1188); TB.openJournal(); })()`);
    await sleep(300);
    await shot(page, "tb-p75-25-field-tablet.png");

    await page.evaluate(`document.querySelector('.journal-tabs [data-tab="world"]')?.click()`);
    await sleep(220);
    await shot(page, "tb-p75-26-field-record.png");
    await page.evaluate(`document.querySelector("#journal")?.classList.remove("is-open")`);

    await page.evaluate(`window.TB.openAtlas("sunfall-desert")`);
    await sleep(280);
    await shot(page, "tb-p75-27-world-atlas.png");

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
