#!/usr/bin/env node
/**
 * Phase 7.9J Summit real-model captures.
 * Writes PNGs to tests/evidence/phase79j/.
 * Use ?summit=fieldtest with a running loopback proxy for the live path.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { openSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tests/evidence/phase79j");
const PORT = Number(process.env.TB_HTTP_PORT || 8099);
const GAME_AI = `http://127.0.0.1:${PORT}/terrainbound/?field=1&summit=fieldtest&v=p79j`;
const GAME_LOCAL = `http://127.0.0.1:${PORT}/terrainbound/?field=1&summit=local&v=p79j`;
const GAME_NORMAL = `http://127.0.0.1:${PORT}/terrainbound/?field=1&v=p79j`;
const DEBUG_PORT = Number(process.env.TB_CDP_PORT || 9355);
const USER_DATA = `/tmp/tb-p79j-chrome-${process.pid}`;

const ALL_VIEWPORTS = [
  { name: "320x568", width: 320, height: 568, mobile: true },
  { name: "390x844", width: 390, height: 844, mobile: true },
  { name: "430x932", width: 430, height: 932, mobile: true },
  { name: "1280x800", width: 1280, height: 800, mobile: false }
];
const wanted = (process.env.TB_P79I_VP || "").split(",").map((s) => s.trim()).filter(Boolean);
const VIEWPORTS = wanted.length ? ALL_VIEWPORTS.filter((vp) => wanted.includes(vp.name)) : ALL_VIEWPORTS;

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
  const logFd = openSync(`/tmp/tb-p79j-chrome-${process.pid}.log`, "w");
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
  const sheet = box(document.querySelector("#summit:not([hidden]) .summit-sheet"));
  const ask = box(document.querySelector("#summit:not([hidden]) #summit-ask"));
  const close = box(document.querySelector("#summit:not([hidden]) #summit-close"));
  const log = document.querySelector("#summit-log")?.innerText || "";
  const lead = document.querySelector(".summit-lead")?.textContent || "";
  const summit = document.querySelector("#summit");
  return {
    hidden: Boolean(summit?.hidden),
    busy: summit?.getAttribute("aria-busy") || "",
    lead,
    pending: document.querySelector(".summit-lead")?.classList.contains("is-pending") || false,
    closeEnabled: close ? !document.querySelector("#summit-close")?.disabled : false,
    askDisabled: Boolean(document.querySelector("#summit-ask")?.disabled),
    askFocused: document.activeElement?.id === "summit-ask",
    logScroll: document.querySelector("#summit-log")?.scrollHeight || 0,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    sheetH: sheet?.h || 0,
    askY: ask?.y || 0,
    log,
    hasHttpError: /HTTP 429|API failure|JSON parsing|provider unavailable|llama|ollama|groq/i.test(log + lead),
    fieldTestHidden: Boolean(document.querySelector("#summit-fieldtest")?.hidden),
    fieldTestFlagHidden: Boolean(document.querySelector("#summit-fieldtest-flag")?.hidden),
    fieldTestButtons: document.querySelectorAll("#summit-fieldtest [data-ft-mark]").length,
    exportJson: Boolean(document.querySelector("#summit-fieldtest-json"))
  };
})()`;

async function enterGame(page, url) {
  await page.send("Page.navigate", { url });
  await waitFor(() => page.evaluate("Boolean(window.TB)"), 15000);
  await page.evaluate(`localStorage.removeItem("terrainbound.cedar-hollow.v1")`);
  await page.send("Page.reload", { ignoreCache: true });
  await waitFor(() => page.evaluate("Boolean(window.TB)"), 15000);
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
      await enterGame(page, GAME_AI);
      await page.evaluate(`window.TB.go(700, 520)`);
      await sleep(200);

      await page.evaluate(
        `(async () => {
          window.TB.openSummit();
          for (let i = 0; i < 80; i += 1) {
            if ((window.TB.summitState.recent || []).some((row) => row.role === "summit")) return true;
            await new Promise((r) => setTimeout(r, 50));
          }
          return false;
        })()`,
        true
      );
      await shot(page, `tb-p79j-${vp.name}-open.png`);

      await page.evaluate(`window.__pendingAsk = window.TB.askSummit({ question: "why did the water move faster?" })`);
      await sleep(180);
      const pending = await page.evaluate(MEASURE);
      await shot(page, `tb-p79j-${vp.name}-pending.png`);
      await page.evaluate(`window.__pendingAsk`, true);
      const arrived = await page.evaluate(MEASURE);
      await shot(page, `tb-p79j-${vp.name}-arrived.png`);

      await page.evaluate(`document.querySelector('[data-ft-mark="HELPED"]')?.click()`);
      const marked = await page.evaluate(MEASURE);
      await shot(page, `tb-p79j-${vp.name}-fieldtest.png`);

      await page.evaluate(`window.TB.askSummit({ question: "the steep one?" })`, true);
      await page.evaluate(`window.TB.askSummit({ question: "why though" })`, true);
      const thread = await page.evaluate(MEASURE);
      await shot(page, `tb-p79j-${vp.name}-thread.png`);

      await page.evaluate(`document.querySelector("#summit-ask")?.focus()`);
      const keyboard = await page.evaluate(MEASURE);
      await shot(page, `tb-p79j-${vp.name}-keyboard.png`);

      await page.evaluate(`window.__closeAsk = window.TB.askSummit({ question: "explain it easier" })`);
      await sleep(120);
      await page.evaluate(`document.querySelector("#summit-close")?.click()`);
      await page.evaluate(`window.__closeAsk`, true);
      const closed = await page.evaluate(MEASURE);

      await enterGame(page, GAME_LOCAL);
      await page.evaluate(`window.TB.go(700, 520)`);
      await page.evaluate(
        `(async () => {
          window.TB.openSummit();
          await window.TB.askSummit({ question: "I don't get it." });
          return true;
        })()`,
        true
      );
      const fallback = await page.evaluate(MEASURE);
      await shot(page, `tb-p79j-${vp.name}-fallback.png`);

      await enterGame(page, GAME_NORMAL);
      await page.evaluate(
        `(async () => {
          window.TB.openSummit();
          for (let i = 0; i < 80; i += 1) {
            if ((window.TB.summitState.recent || []).some((row) => row.role === "summit")) return true;
            await new Promise((r) => setTimeout(r, 50));
          }
          return false;
        })()`,
        true
      );
      const normal = await page.evaluate(MEASURE);
      await shot(page, `tb-p79j-${vp.name}-normal.png`);

      report.push({
        viewport: vp.name,
        pending,
        arrived,
        marked,
        thread,
        keyboard,
        closed,
        fallback,
        normal,
        debug: await page.evaluate(`window.TB.summitDebug`)
      });
      console.log(
        vp.name,
        JSON.stringify({
          pendingLead: pending.lead,
          busy: pending.busy,
          closeEnabled: pending.closeEnabled,
          arrivedHttp: arrived.hasHttpError,
          fieldTestVisible: arrived.fieldTestHidden === false,
          normalFieldTestHidden: normal.fieldTestHidden,
          closedHidden: closed.hidden,
          fallbackHttp: fallback.hasHttpError,
          overflow: arrived.horizontalOverflow || thread.horizontalOverflow || marked.horizontalOverflow
        })
      );
    }

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
