#!/usr/bin/env node
/**
 * Phase 7.9C Summit tutor captures.
 * Writes PNGs to tests/evidence/phase79c/.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { openSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tests/evidence/phase79c");
const PORT = Number(process.env.TB_HTTP_PORT || 8096);
const GAME = `http://127.0.0.1:${PORT}/terrainbound/?field=1&v=p79c`;
const DEBUG_PORT = Number(process.env.TB_CDP_PORT || 9352);
const USER_DATA = `/tmp/tb-p79c-chrome-${process.pid}`;

const VIEWPORTS = [
  { name: "320x568", width: 320, height: 568, mobile: true },
  { name: "375x667", width: 375, height: 667, mobile: true },
  { name: "390x844", width: 390, height: 844, mobile: true },
  { name: "393x852", width: 393, height: 852, mobile: true },
  { name: "430x932", width: 430, height: 932, mobile: true },
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
  const logFd = openSync(`/tmp/tb-p79c-chrome-${process.pid}.log`, "w");
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

const SEED = `(() => {
  const TB = window.TB;
  if (!TB) return false;
  TB.missionState.concluded = true;
  TB.invState.obsInt = TB.invState.obsInt || { sorts: [] };
  TB.invState.obsInt.sorts = [
    { id: "a", ok: true },
    { id: "b", ok: true }
  ];
  TB.invState.active = true;
  TB.invState.concluded = true;
  TB.invState.attempts = 2;
  TB.invState.selectedProcess = TB.investigation?.hypothesis?.requiredProcess || "two-clocks";
  TB.challengeState.concluded = true;
  TB.challengeState.workingRoles = ["weather", "join", "source"];
  TB.puzzleState.systems.concluded = true;
  TB.puzzleState.systems.active = false;
  TB.puzzleState.conflict.repaired = true;
  const slopes = (TB.flumeSpec?.slopes || []).map((row) => row.id);
  TB.flumeState.trials = [];
  for (const slope of slopes) {
    TB.flumeState.trials.push({ slope, water: "one-cup", seconds: 5, speed: 1, fair: true });
    TB.flumeState.trials.push({ slope, water: "one-cup", seconds: 4.8, speed: 1, fair: true });
  }
  TB.dataState.datasets["cedar-hollow-flow"] = {
    ...(TB.dataState.datasets["cedar-hollow-flow"] || {}),
    interpreted: true,
    rows: TB.dataState.datasets["cedar-hollow-flow"]?.rows || []
  };
  return true;
})()`;

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
  const canvas = document.querySelector("#atlas-map");
  const cr = canvas?.getBoundingClientRect();
  const prompt = box(document.querySelector("#inspect-prompt"));
  const mapBtn = box(document.querySelector("#map-toggle"));
  const journalBtn = box(document.querySelector("#journal-toggle"));
  const summitBtn = box(document.querySelector("#summit-toggle"));
  const sheet = box(document.querySelector("#summit:not([hidden]) .summit-sheet"));
  const ask = box(document.querySelector("#summit:not([hidden]) #summit-ask"));
  const aarSummit = box(document.querySelector("#aar:not([hidden]) #aar-summit"));
  return {
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    atlasRatio: cr && cr.height ? Number((cr.width / cr.height).toFixed(3)) : null,
    hudOverlap:
      overlap(mapBtn, journalBtn) || overlap(mapBtn, summitBtn) || overlap(journalBtn, summitBtn) || overlap(prompt, mapBtn),
    summitSheetOverflow: sheet ? sheet.x < -1 || sheet.x + sheet.w > document.documentElement.clientWidth + 1 : false,
    askReachable: Boolean(ask && ask.y + ask.h <= document.documentElement.clientHeight + 2),
    aarSummit,
    prompt,
    mapBtn,
    journalBtn,
    summitBtn,
    sheet,
    ask
  };
})()`;

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
      await page.send("Page.navigate", { url: GAME });
      await waitFor(() => page.evaluate("Boolean(window.TB)"), 15000);
      await page.evaluate(`localStorage.removeItem("terrainbound.cedar-hollow.v1")`);
      await page.send("Page.reload", { ignoreCache: true });
      await waitFor(() => page.evaluate("Boolean(window.TB)"), 15000);
      await sleep(250);
      await page.evaluate(`document.querySelector("#enter-btn")?.click()`);
      await sleep(400);
      await page.evaluate(DISMISS, true);
      await sleep(1200);
      await page.evaluate(DISMISS, true);
      await sleep(200);
      await page.evaluate(`window.TB.go(700, 520)`);
      await sleep(400);
      await shot(page, `tb-p79c-${vp.name}-gameplay.png`);
      const playMeasure = await page.evaluate(MEASURE);

      await page.evaluate(`window.TB.openSummit()`);
      await sleep(280);
      await shot(page, `tb-p79c-${vp.name}-summit.png`);
      const summitMeasure = await page.evaluate(MEASURE);

      await page.evaluate(`window.TB.askSummit({ action: "hint" })`);
      await sleep(200);
      await shot(page, `tb-p79c-${vp.name}-hint.png`);

      await page.evaluate(`window.TB.askSummit({ question: "What is runoff?" })`);
      await sleep(200);
      await page.evaluate(`document.querySelector("#summit-ask")?.focus()`);
      await sleep(120);
      await shot(page, `tb-p79c-${vp.name}-vocab.png`);
      const inputMeasure = await page.evaluate(MEASURE);
      await page.evaluate(`window.TB.closeSummit()`);
      await sleep(120);

      await page.evaluate(SEED);
      await page.evaluate(`window.TB.puzzleState.aar.answers = { "aar-obs": ["CH-02"] }`);
      await page.evaluate(`window.TB.openAar()`);
      await sleep(280);
      await shot(page, `tb-p79c-${vp.name}-aar.png`);
      await page.evaluate(`document.querySelector("#aar-next")?.click()`);
      await sleep(220);
      await page.evaluate(`window.TB.openSummit()`);
      await sleep(220);
      await page.evaluate(`window.TB.askSummit({ question: "Why was that wrong?" })`);
      await sleep(240);
      await shot(page, `tb-p79c-${vp.name}-aar-summit.png`);
      const aarSummitMeasure = await page.evaluate(MEASURE);
      await page.evaluate(`window.TB.closeSummit()`);
      await page.evaluate(`document.querySelector("#aar-close")?.click()`);

      report.push({
        viewport: vp.name,
        play: playMeasure,
        summit: summitMeasure,
        input: inputMeasure,
        aarSummit: aarSummitMeasure
      });
      console.log(
        vp.name,
        JSON.stringify({
          overflow: playMeasure.horizontalOverflow || summitMeasure.horizontalOverflow,
          hudOverlap: playMeasure.hudOverlap,
          askReachable: inputMeasure.askReachable,
          sheetOverflow: summitMeasure.summitSheetOverflow
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
