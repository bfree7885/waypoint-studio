#!/usr/bin/env node
/**
 * Phase 8 RC production-mode playthrough (no ?field=1, no region=, no summit=local).
 * Writes PNGs to tests/evidence/phase8rc/.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { openSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import { migrateSave, SAVE_KEY } from "../js/save.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tests/evidence/phase8rc");
const PORT = Number(process.env.TB_HTTP_PORT || 8098);
const GAME = `http://127.0.0.1:${PORT}/terrainbound/?v=p8ds`;
const DEBUG_PORT = Number(process.env.TB_CDP_PORT || 9373);
const USER_DATA = `/tmp/tb-p8rc-chrome-${process.pid}`;

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
      if (msg.method === "Runtime.exceptionThrown") {
        const d = msg.params?.exceptionDetails;
        console.error("EXCEPTION", d?.text || "", d?.exception?.description || d?.url || "");
      }
      if (msg.method === "Runtime.consoleAPICalled" && msg.params?.type === "error") {
        const bits = (msg.params.args || []).map((arg) => arg.value || arg.description || "").join(" ");
        console.error("CONSOLE", bits);
      }
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
  const logFd = openSync(`/tmp/tb-p8rc-chrome-${process.pid}.log`, "w");
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
  await sleep(180);
  const { data } = await page.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false
  });
  await writeFile(path.join(OUT, name), Buffer.from(data, "base64"));
}

const DISMISS = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 24; i += 1) {
    const dlg = document.querySelector("#dialogue:not([hidden])");
    if (!dlg) break;
    const btn = dlg.querySelector("#dialogue-actions button, button");
    if (!btn) break;
    btn.click();
    await sleep(80);
  }
  const toast = document.querySelector("#toast");
  if (toast) toast.hidden = true;
  return Boolean(document.querySelector("#dialogue")?.hidden);
})()`;

const HUD = `({
  href: location.href,
  tb: typeof window.TB,
  place: document.querySelector("#place-name")?.textContent || "",
  kicker: document.querySelector("#atlas-kicker")?.textContent || "",
  atlasName: document.querySelector("#atlas-name")?.textContent || "",
  atlasRoute: document.querySelector("#atlas-route")?.textContent || "",
  atlasLabel: document.querySelector("#atlas-route-label")?.textContent || "",
  travelHidden: Boolean(document.querySelector("#atlas-travel")?.hidden),
  diagHidden: Boolean(document.querySelector("#summit-diag-toggle")?.hidden),
  fieldtestHidden: Boolean(document.querySelector("#summit-fieldtest")?.hidden),
  overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  inspect: document.querySelector("#inspect-prompt")?.textContent || "",
  titleHidden: Boolean(document.querySelector("#title-screen")?.hidden)
})`;

async function waitBoot(page) {
  await waitFor(
    () =>
      page.evaluate(`Boolean(document.querySelector("#enter-btn")) && document.readyState === "complete"`),
    20000
  );
  await waitFor(async () => {
    const boot = await page.evaluate(`({
      err: document.querySelector("#boot-error")?.textContent || "",
      errHidden: document.querySelector("#boot-error")?.hidden !== false,
      title: Boolean(document.querySelector("#title-screen"))
    })`);
    if (boot.err && !boot.errHidden) throw new Error(`boot-error: ${boot.err}`);
    return boot.title;
  }, 20000);
  await sleep(800);
}

async function enterFresh(page) {
  await page.send("Page.navigate", { url: GAME });
  await waitBoot(page);
  await page.evaluate(`localStorage.removeItem(${JSON.stringify(SAVE_KEY)})`);
  await page.send("Page.reload", { ignoreCache: true });
  await waitBoot(page);
  await page.evaluate(`document.querySelector("#enter-btn")?.click()`);
  await sleep(1600);
  await page.evaluate(DISMISS, true);
  await sleep(300);
  await page.evaluate(DISMISS, true);
}

async function loadSave(page, snap) {
  await page.evaluate(`localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(snap))})`);
  await page.send("Page.navigate", { url: GAME });
  await waitBoot(page);
  const titleHidden = await page.evaluate(`Boolean(document.querySelector("#title-screen")?.hidden)`);
  if (!titleHidden) {
    await page.evaluate(`document.querySelector("#enter-btn")?.click()`);
    await sleep(1600);
    await page.evaluate(DISMISS, true);
    await sleep(250);
    await page.evaluate(DISMISS, true);
  }
}

async function openAtlasPick(page, mapX, mapY) {
  await page.evaluate(`document.querySelector("#map-toggle")?.click()`);
  await sleep(400);
  await page.evaluate(
    `(() => {
      const canvas = document.querySelector("#atlas-map");
      const rect = canvas.getBoundingClientRect();
      const x = rect.left + (${mapX} / 100) * rect.width;
      const y = rect.top + (${mapY} / 100) * rect.height;
      canvas.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: x, clientY: y }));
    })()`
  );
  await sleep(250);
}

function chCompleteSave() {
  return migrateSave({
    v: 6,
    player: { x: 420, y: 520, facing: 1 },
    world: {
      currentRegion: "cedar-hollow",
      accessibleRegions: ["cedar-hollow", "high-country", "dark-sky-basin"],
      masteredRegions: ["cedar-hollow"]
    },
    taught: {
      walk: true,
      inspect: true,
      journal: true,
      worldMap: true,
      routeHighCountry: true,
      routeDarkSky: true
    },
    presentation: { openingSeen: true, appearanceSet: true, appearance: { skin: "sand", hair: "short-dark", jacket: "clay" } }
  });
}

async function viewportReport(page, name, width, height, mobile) {
  await page.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: mobile ? 2 : 1,
    mobile
  });
  await sleep(250);
  const row = await page.evaluate(HUD);
  row.viewport = name;
  await shot(page, `viewport-${name}.png`);
  return row;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = { productionUrl: GAME, shots: OUT };
  const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], {
    cwd: path.resolve(ROOT, ".."),
    stdio: "ignore"
  });
  const chrome = launchChrome(1280, 800);
  let ws;
  try {
    await waitFor(async () => {
      try {
        const cfg = await getJson(`http://127.0.0.1:${PORT}/terrainbound/data/summit/provider.json`);
        return cfg && typeof cfg.productionEndpoint === "string";
      } catch {
        return null;
      }
    }, 8000);
    const session = await connectPage(chrome);
    ws = session.ws;
    const { page } = session;
    await page.send("Page.enable");
    await page.send("Runtime.enable");
    await page.send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });

    await enterFresh(page);
    const fresh = await page.evaluate(HUD);
    report.fresh = fresh;
    await shot(page, "01-fresh-cedar-hollow.png");
    await page.evaluate(`document.querySelector("#world")?.click()`);
    await sleep(400);
    await page.evaluate(`document.querySelector("#journal-toggle")?.click()`);
    await sleep(250);
    await shot(page, "02-fresh-tablet.png");
    await page.evaluate(`document.querySelector("#journal-close")?.click()`);
    await page.evaluate(`document.querySelector("#summit-toggle")?.click()`);
    await sleep(300);
    const summitChrome = await page.evaluate(`({
      diagHidden: Boolean(document.querySelector("#summit-diag-toggle")?.hidden),
      fieldtestHidden: Boolean(document.querySelector("#summit-fieldtest")?.hidden),
      lead: document.querySelector("#summit-lead")?.textContent || ""
    })`);
    report.freshSummit = summitChrome;
    await shot(page, "03-fresh-summit.png");
    await page.evaluate(`document.querySelector("#summit-close")?.click()`);
    await openAtlasPick(page, 30, 46);
    report.freshAtlas = await page.evaluate(HUD);
    await shot(page, "04-fresh-atlas.png");
    await page.evaluate(`document.querySelector("#atlas-close")?.click()`);

    await loadSave(page, chCompleteSave());
    await sleep(400);
    await page.evaluate(DISMISS, true);
    report.afterChSave = await page.evaluate(HUD);
    await shot(page, "05-ch-complete-resume.png");
    await openAtlasPick(page, 12, 34);
    report.dsAtlas = await page.evaluate(HUD);
    await shot(page, "06-atlas-dark-sky-topic-11.png");
    await page.evaluate(`document.querySelector("#atlas-travel")?.click()`);
    await sleep(1800);
    await page.evaluate(DISMISS, true);
    await sleep(400);
    await page.evaluate(DISMISS, true);
    report.dsArrival = await page.evaluate(HUD);
    await shot(page, "07-dark-sky-arrival.png");

    await page.evaluate(`document.querySelector("#world")?.focus()`);
    await page.send("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", windowsVirtualKeyCode: 39 });
    await sleep(80);
    await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", windowsVirtualKeyCode: 39 });
    await page.evaluate(`document.querySelector("#journal-toggle")?.click()`);
    await sleep(250);
    await shot(page, "08-ds-tablet.png");
    await page.evaluate(`document.querySelector("#journal-close")?.click()`);
    await page.evaluate(`document.querySelector("#summit-toggle")?.click()`);
    await sleep(300);
    report.dsSummit = await page.evaluate(`({
      lead: document.querySelector("#summit-lead")?.textContent || "",
      diagHidden: Boolean(document.querySelector("#summit-diag-toggle")?.hidden),
      fieldtestHidden: Boolean(document.querySelector("#summit-fieldtest")?.hidden)
    })`);
    await shot(page, "09-ds-summit.png");
    await page.evaluate(`document.querySelector("#summit-close")?.click()`);

    report.viewports = [];
    for (const vp of [
      ["320x568", 320, 568, true],
      ["390x844", 390, 844, true],
      ["430x932", 430, 932, true],
      ["1280", 1280, 800, false]
    ]) {
      report.viewports.push(await viewportReport(page, vp[0], vp[1], vp[2], vp[3]));
    }

    await writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({
      ok: true,
      productionHref: report.fresh?.href,
      noTB: report.fresh?.tb !== "object",
      cedarHollow: report.fresh?.place,
      darkSky: report.dsArrival?.place,
      topic11: report.dsAtlas,
      overflow: report.viewports.map((row) => ({ vp: row.viewport, overflow: row.overflow })),
      diagHidden: report.freshSummit?.diagHidden && report.dsSummit?.diagHidden,
      fieldtestHidden: report.freshSummit?.fieldtestHidden && report.dsSummit?.fieldtestHidden
    }, null, 2));
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
