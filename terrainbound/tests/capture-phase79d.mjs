#!/usr/bin/env node
/**
 * Phase 7.9D Summit hybrid captures.
 * Writes PNGs to tests/evidence/phase79d/.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { openSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tests/evidence/phase79d");
const PORT = Number(process.env.TB_HTTP_PORT || 8098);
const GAME = `http://127.0.0.1:${PORT}/terrainbound/?field=1&v=p79d`;
const GAME_STUDENT = `http://127.0.0.1:${PORT}/terrainbound/?v=p79d`;
const DEBUG_PORT = Number(process.env.TB_CDP_PORT || 9354);
const USER_DATA = `/tmp/tb-p79d-chrome-${process.pid}`;

const VIEWPORTS = [
  { name: "320x568", width: 320, height: 568, mobile: true },
  { name: "390x844", width: 390, height: 844, mobile: true },
  { name: "1280x800", width: 1280, height: 800, mobile: false }
];

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
  const logFd = openSync(`/tmp/tb-p79d-chrome-${process.pid}.log`, "w");
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
      "--window-size=1280,800",
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
  await sleep(120);
  const { data } = await page.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false
  });
  await writeFile(path.join(OUT, name), Buffer.from(data, "base64"));
  console.log("wrote", name);
}

const DISMISS = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 16; i += 1) {
    const btn = document.querySelector("#dialogue:not([hidden]) #dialogue-actions button");
    if (!btn) break;
    btn.click();
    await sleep(40);
  }
  const toast = document.querySelector("#toast");
  if (toast) toast.hidden = true;
  return true;
})()`;

const MEASURE = `(() => {
  const box = (el) => {
    if (!el || el.hidden) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  };
  const overlap = (a, b) => {
    if (!a || !b) return false;
    return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
  };
  const sheet = box(document.querySelector("#summit:not([hidden]) .summit-sheet"));
  const ask = box(document.querySelector("#summit:not([hidden]) #summit-ask"));
  const diag = document.querySelector("#summit-diag");
  const log = document.querySelector("#summit-log")?.innerText || "";
  return {
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    hudOverlap: overlap(
      box(document.querySelector("#map-toggle")),
      box(document.querySelector("#journal-toggle"))
    ),
    summitSheetOverflow: sheet ? sheet.x < -1 || sheet.x + sheet.w > document.documentElement.clientWidth + 1 : false,
    askReachable: Boolean(ask && ask.y + ask.h <= document.documentElement.clientHeight + 2),
    diagHidden: !diag || diag.hidden || !diag.textContent,
    diagText: diag?.textContent || "",
    log,
    hasHttpError: /HTTP 429|API failure|JSON parsing|provider unavailable/i.test(log),
    adapterId: window.TB?.summitAdapterId || "",
    hasTB: Boolean(window.TB)
  };
})()`;

async function enterGame(page, url, { field = true } = {}) {
  await page.send("Page.navigate", { url });
  const ready = field ? "Boolean(window.TB)" : `Boolean(document.querySelector("#enter-btn"))`;
  await waitFor(() => page.evaluate(ready), 15000);
  await page.evaluate(`localStorage.removeItem("terrainbound.cedar-hollow.v1")`);
  await page.send("Page.reload", { ignoreCache: true });
  await waitFor(() => page.evaluate(ready), 15000);
  await sleep(200);
  await page.evaluate(`document.querySelector("#enter-btn")?.click()`);
  await sleep(350);
  await page.evaluate(DISMISS, true);
  await sleep(900);
  await page.evaluate(DISMISS, true);
  await sleep(150);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], {
    cwd: path.resolve(ROOT, ".."),
    stdio: "ignore"
  });
  const chrome = launchChrome();
  let ws;
  const report = [];
  try {
    await sleep(400);
    const conn = await connectPage(chrome);
    ws = conn.ws;
    const { page } = conn;
    await page.send("Page.enable");
    await page.send("Runtime.enable");

    for (const vp of VIEWPORTS) {
      await page.send("Emulation.setDeviceMetricsOverride", {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.mobile ? 2 : 1,
        mobile: vp.mobile
      });
      await enterGame(page, GAME);
      await page.evaluate(`window.TB.go(700, 520)`);
      await sleep(200);

      await page.evaluate(
        `(async () => {
          window.TB.openSummit();
          for (let i = 0; i < 50; i += 1) {
            if ((window.TB.summitState.recent || []).some((row) => row.role === "summit")) return true;
            await new Promise((r) => setTimeout(r, 40));
          }
          return false;
        })()`,
        true
      );
      await shot(page, `tb-p79d-${vp.name}-open.png`);

      await page.evaluate(`window.TB.askSummit({ question: "what am i even doing" })`, true);
      await shot(page, `tb-p79d-${vp.name}-messy.png`);
      const messy = await page.evaluate(MEASURE);

      await page.evaluate(`window.TB.askSummit({ question: "why though" })`, true);
      await shot(page, `tb-p79d-${vp.name}-followup.png`);
      const follow = await page.evaluate(MEASURE);

      await page.evaluate(`window.TB.askSummit({ question: "What did my third runoff trial show?" })`, true);
      await shot(page, `tb-p79d-${vp.name}-grounding.png`);
      const ground = await page.evaluate(MEASURE);

      await page.evaluate(`window.TB.askSummit({ question: "What is runoff?" })`, true);
      await shot(page, `tb-p79d-${vp.name}-vocab.png`);
      const vocab = await page.evaluate(MEASURE);

      report.push({
        viewport: vp.name,
        messy,
        follow,
        ground,
        vocab,
        debug: await page.evaluate(`window.TB.summitDebug`)
      });
      console.log(
        vp.name,
        JSON.stringify({
          overflow: messy.horizontalOverflow || follow.horizontalOverflow,
          askReachable: vocab.askReachable,
          sheetOverflow: messy.summitSheetOverflow,
          diag: messy.diagText,
          httpError: messy.hasHttpError || ground.hasHttpError,
          adapter: messy.adapterId
        })
      );
    }

    await page.send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });
    await enterGame(page, GAME_STUDENT, { field: false });
    await page.evaluate(
      `(async () => {
        document.querySelector("#summit-toggle")?.click();
        await new Promise((r) => setTimeout(r, 500));
        return true;
      })()`,
      true
    );
    const student = await page.evaluate(MEASURE);
    await shot(page, "tb-p79d-1280x800-student-no-diag.png");
    report.push({ viewport: "1280-student", student });

    await writeFile(path.join(OUT, "layout-report.json"), JSON.stringify(report, null, 2));
    console.log("done", OUT);
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
