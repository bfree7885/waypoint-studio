/**
 * Phase 7.6 screenshot harness. 1366×768 PNGs to tests/evidence/phase76/.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { openSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tests/evidence/phase76");
const GAME = "http://127.0.0.1:8090/terrainbound/?field=1&v=p76";
const DEBUG_PORT = Number(process.env.TB_CDP_PORT || 9335);
const USER_DATA = `/tmp/tb-p76-chrome-${process.pid}`;

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
  const logFd = openSync(`/tmp/tb-p76-chrome-${process.pid}.log`, "w");
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
  await sleep(180);
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
  const geo = document.querySelector("#geo-board");
  if (geo) geo.hidden = true;
  const flume = document.querySelector("#flume");
  if (flume) flume.hidden = true;
  document.querySelector("#toast") && (document.querySelector("#toast").hidden = true);
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

async function beginPlay(page) {
  await page.evaluate(`localStorage.removeItem("terrainbound.cedar-hollow.v1")`);
  await page.send("Page.reload", { ignoreCache: true });
  await waitFor(() => page.evaluate("Boolean(window.TB)"), 15000);
  await sleep(350);
  await page.evaluate(`document.querySelector("#enter-btn")?.click()`);
  await sleep(280);
  await page.evaluate(DISMISS, true);
  await sleep(1600);
  await page.evaluate(DISMISS, true);
}

async function moonSeek(page, bright) {
  await page.evaluate(`window.TB.jump("night")`);
  for (let i = 0; i < 36; i += 1) {
    const illum = await page.evaluate(`window.TB.sky()?.moon?.illumination ?? 0`);
    if (bright && illum > 0.82) return illum;
    if (!bright && illum < 0.18) return illum;
    await page.evaluate(`window.TB.jump("+7d")`);
    await page.evaluate(`window.TB.jump("night")`);
  }
  return page.evaluate(`window.TB.sky()?.moon?.illumination ?? 0`);
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
    await beginPlay(page);

    await page.evaluate(`window.TB.simulateMastery("cedar-hollow")`);
    await page.evaluate(`window.TB.enterRegion("high-country")`);
    await sleep(1800);
    await page.evaluate(DISMISS, true);
    await sleep(350);

    await page.evaluate(`(() => { const TB = window.TB; TB.go(1040, 1500); TB.setPose("idle", 8000); })()`);
    await sleep(400);
    await shot(page, "tb-p76-01-hc-ridgeline-station.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.go(460, 508); TB.setPose("idle", 8000); })()`);
    await sleep(400);
    await shot(page, "tb-p76-02-hc-lookout.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.go(720, 820); TB.setPose("idle", 8000); })()`);
    await sleep(400);
    await shot(page, "tb-p76-03-hc-trail-ridge.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.go(620, 960); TB.setPose("idle", 8000); })()`);
    await sleep(400);
    await shot(page, "tb-p76-04-hc-washout.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.go(980, 900); TB.setPose("idle", 8000); })()`);
    await sleep(400);
    await shot(page, "tb-p76-05-hc-wide.png");

    await page.evaluate(`window.TB.enterRegion("cedar-hollow")`);
    await sleep(1700);
    await page.evaluate(DISMISS, true);

    await page.evaluate(`(() => { const TB = window.TB; TB.go(1688, 940); TB.setPose("idle", 8000); })()`);
    await sleep(350);
    await shot(page, "tb-p76-06-idle.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.go(1560, 980); TB.setPose("walk", 20000); })()`);
    await page.evaluate(`document.querySelector("#world")?.focus()`);
    await page.evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "d", bubbles: true }))`);
    await sleep(220);
    await shot(page, "tb-p76-07-walk-a.png");
    await sleep(110);
    await shot(page, "tb-p76-08-walk-b.png");
    await sleep(90);
    await shot(page, "tb-p76-07b-walk-c.png");
    await sleep(90);
    await shot(page, "tb-p76-08b-walk-d.png");
    await page.evaluate(`window.dispatchEvent(new KeyboardEvent("keyup", { key: "d", bubbles: true }))`);

    await page.evaluate(`(() => { const TB = window.TB; TB.go(1840, 1000); TB.setPose("inspect", 8000); })()`);
    await sleep(350);
    await shot(page, "tb-p76-09-inspect.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.go(1840, 1000); TB.setPose("measure", 8000); })()`);
    await sleep(350);
    await shot(page, "tb-p76-10-measure.png");

    await page.evaluate(`(() => { window.TB.go(1688, 940); window.TB.openJournal(); window.TB.setPose("tablet", 8000); })()`);
    await sleep(250);
    await page.evaluate(`document.querySelector("#journal")?.classList.remove("is-open")`);
    await sleep(200);
    await shot(page, "tb-p76-11-tablet.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.go(1310, 360); TB.setPose("sky", 12000); })()`);
    await sleep(400);
    await shot(page, "tb-p76-12-sky.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.go(860, 690); TB.setPose("idle", 8000); })()`);
    await sleep(400);
    await shot(page, "tb-p76-13-ch-creek-forest.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.go(1080, 1188); TB.setPose("idle", 8000); })()`);
    await sleep(400);
    await shot(page, "tb-p76-14-ch-pond-marsh.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.go(1840, 1000); TB.setPose("idle", 8000); })()`);
    await sleep(350);
    await shot(page, "tb-p76-15-runoff-idle.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.go(1840, 1000); TB.openFlume(); TB.releaseWater(); })()`);
    await sleep(280);
    await page.evaluate(`document.querySelector("#flume") && (document.querySelector("#flume").hidden = true)`);
    await shot(page, "tb-p76-16-runoff-running.png");

    await page.evaluate(`window.TB.simulateMastery("high-country")`);
    await page.evaluate(`window.TB.enterRegion("sunfall-desert")`);
    await sleep(1700);
    await page.evaluate(DISMISS, true);

    await page.evaluate(`(() => { const TB = window.TB; TB.jump("noon"); TB.go(1408, 1188); TB.setPose("idle", 8000); })()`);
    await sleep(400);
    await shot(page, "tb-p76-17-sf-observatory-day.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.jump("noon"); TB.go(2088, 900); TB.setPose("idle", 8000); })()`);
    await sleep(400);
    await shot(page, "tb-p76-18-sf-wide-day.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.jump("noon"); TB.go(1512, 1120); TB.setPose("measure", 8000); })()`);
    await sleep(400);
    await shot(page, "tb-p76-19-sf-gnomon.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.jump("noon"); TB.go(1408, 1188); TB.setPose("idle", 8000); })()`);
    await sleep(300);
    await shot(page, "tb-p76-32-sf-noon-ground.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.jump("night"); TB.go(1408, 1188); TB.setPose("idle", 8000); })()`);
    await sleep(450);
    await shot(page, "tb-p76-20-sf-observatory-night.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.jump("night"); TB.go(1680, 1240); TB.setPose("idle", 8000); })()`);
    await sleep(400);
    await shot(page, "tb-p76-21-sf-night-ground.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.jump("night"); TB.go(420, 520); TB.setPose("idle", 8000); })()`);
    await sleep(400);
    await shot(page, "tb-p76-22-sf-mesa-night.png");

    const bright = await moonSeek(page, true);
    await page.evaluate(`(() => { const TB = window.TB; TB.go(1680, 1240); TB.setPose("idle", 8000); })()`);
    await sleep(400);
    await shot(page, "tb-p76-23-sf-bright-moon.png");
    console.log("bright moon illumination", bright);

    const dark = await moonSeek(page, false);
    await page.evaluate(`(() => { const TB = window.TB; TB.go(1680, 1240); TB.setPose("idle", 8000); })()`);
    await sleep(400);
    await shot(page, "tb-p76-24-sf-dark-moon.png");
    console.log("dark moon illumination", dark);

    await page.evaluate(`(() => { const TB = window.TB; TB.jump("noon"); TB.go(1512, 1120); })()`);
    await sleep(350);
    await shot(page, "tb-p76-26-clock-shadow.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.openGeo("seasons"); })()`);
    await sleep(280);
    await shot(page, "tb-p76-27-clock-seasons.png");
    await page.evaluate(`document.querySelector("#geo-board") && (document.querySelector("#geo-board").hidden = true)`);

    await page.evaluate(`(() => { const TB = window.TB; TB.jump("night"); TB.go(380, 488); TB.setPose("sky", 8000); })()`);
    await sleep(350);
    await shot(page, "tb-p76-28-clock-moon.png");

    await page.evaluate(`document.querySelector("#sky-clock-full")?.click()`);
    await sleep(250);
    await shot(page, "tb-p76-25-clock-full.png");

    await page.evaluate(`(() => { const TB = window.TB; TB.go(980, 1180); TB.setPose("idle", 8000); })()`);
    await sleep(350);
    await shot(page, "tb-p76-29-labels-quiet.png");

    await page.evaluate(`(() => { window.TB.go(1408, 1188); window.TB.openJournal(); })()`);
    await sleep(300);
    await shot(page, "tb-p76-30-field-tablet.png");

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
