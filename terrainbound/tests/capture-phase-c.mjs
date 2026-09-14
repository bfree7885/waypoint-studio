#!/usr/bin/env node
/**
 * Phase C Field Station screenshots.
 * Writes PNGs to tests/evidence/phase-c/.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { openSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tests/evidence/phase-c");
const PORT = Number(process.env.TB_HTTP_PORT || 8099);
const GAME = `http://127.0.0.1:${PORT}/terrainbound/`;
const DEBUG_PORT = Number(process.env.TB_CDP_PORT || 9374);
const USER_DATA = `/tmp/tb-p8c-chrome-${process.pid}`;

function getJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
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

async function waitFor(fn, timeout = 20000, step = 80) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    last = await fn();
    if (last) return last;
    await sleep(step);
  }
  throw new Error(`timeout waiting: ${JSON.stringify(last)}`);
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

function launchChrome(width, height) {
  const logFd = openSync(`/tmp/tb-p8c-chrome-${process.pid}.log`, "w");
  return spawn(
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
      `--window-size=${width},${height}`,
      "about:blank"
    ],
    { stdio: ["ignore", logFd, logFd] }
  );
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
  await sleep(200);
  const { data } = await page.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(path.join(OUT, name), Buffer.from(data, "base64"));
}

async function setView(page, width, height, mobile) {
  await page.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: mobile ? 2 : 1,
    mobile,
    screenWidth: width,
    screenHeight: height
  });
}

async function waitStation(page) {
  await waitFor(async () => page.evaluate(`Boolean(document.querySelector("#station-view h1"))`), 20000);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], {
    cwd: path.resolve(ROOT, ".."),
    stdio: "ignore"
  });
  const chrome = launchChrome(1280, 800);
  let ws;
  try {
    await waitFor(async () => {
      try {
        await getJson(`http://127.0.0.1:${PORT}/terrainbound/data/learning/curriculum.json`);
        return true;
      } catch {
        return null;
      }
    }, 8000);
    const session = await connectPage(chrome);
    ws = session.ws;
    const page = session.page;
    await page.send("Page.enable");
    await page.send("Runtime.enable");
    await page.send("Page.navigate", { url: GAME });
    await waitStation(page);

    await setView(page, 390, 844, true);
    await shot(page, "01-station-phone-portrait.png");

    await setView(page, 844, 390, true);
    await shot(page, "02-station-phone-landscape.png");

    await setView(page, 1280, 800, false);
    await shot(page, "03-station-desktop.png");

    await page.evaluate(`document.querySelector('[data-go="course"]')?.click()`);
    await sleep(250);
    await shot(page, "04-course-list.png");

    await page.evaluate(`document.querySelector('[data-topic-id="topic-01"]')?.click()`);
    await sleep(250);
    await shot(page, "05-topic-detail.png");

    await page.evaluate(`location.hash = "#/watch"`);
    await sleep(300);
    await shot(page, "06-watch-read.png");

    await page.evaluate(`location.hash = "#/"`);
    await sleep(250);
    await page.evaluate(`document.querySelector('[data-go="field"]')?.click()`);
    await waitFor(async () =>
      page.evaluate(`Boolean(document.querySelector("#game-root") && !document.querySelector("#game-root").hidden && document.querySelector("#title-screen") && !document.querySelector("#title-screen").hidden)`)
    , 20000);
    await sleep(600);
    await shot(page, "07-field-launch.png");

    await page.evaluate(`document.querySelector("#station-title-return")?.click()`);
    await waitFor(async () =>
      page.evaluate(`Boolean(document.querySelector("#field-station") && !document.querySelector("#field-station").hidden && document.querySelector("#station-view h1"))`)
    , 20000);
    await sleep(250);
    await shot(page, "08-return-from-field.png");

    await writeFile(
      path.join(OUT, "report.json"),
      JSON.stringify(
        {
          ok: true,
          url: GAME,
          shots: [
            "01-station-phone-portrait.png",
            "02-station-phone-landscape.png",
            "03-station-desktop.png",
            "04-course-list.png",
            "05-topic-detail.png",
            "06-watch-read.png",
            "07-field-launch.png",
            "08-return-from-field.png"
          ]
        },
        null,
        2
      )
    );
    console.log("phase-c screenshots written to", OUT);
  } finally {
    try {
      ws?.close();
    } catch {
      /* ignore */
    }
    chrome.kill("SIGTERM");
    server.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
