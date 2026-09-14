#!/usr/bin/env node
/**
 * Phase 8C owner-review captures for complete Dark Sky Basin.
 * Writes PNGs to tests/evidence/phase8c/.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { openSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tests/evidence/phase8c");
const PORT = Number(process.env.TB_HTTP_PORT || 8094);
const GAME = `http://127.0.0.1:${PORT}/terrainbound/?field=1&region=dark-sky-basin&summit=local&v=p79l`;
const DEBUG_PORT = Number(process.env.TB_CDP_PORT || 9369);
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

async function enterGame(page, url) {
  await page.send("Page.navigate", { url });
  try {
    await waitFor(() => page.evaluate("Boolean(window.TB)"), 20000);
  } catch (err) {
    const href = await page.evaluate("location.href").catch(() => "");
    const title = await page.evaluate("document.title").catch(() => "");
    const boot = await page
      .evaluate(
        `({
          bootError: document.querySelector("#boot-error")?.textContent || "",
          bootHidden: document.querySelector("#boot-error")?.hidden,
          ready: document.readyState,
          hasMain: Boolean(document.querySelector("script[src*='main.js']")),
          body: document.body?.innerText?.slice(0, 240) || ""
        })`
      )
      .catch((e) => String(e));
    throw new Error(`${err.message} href=${href} title=${title} boot=${JSON.stringify(boot)}`);
  }
  await page.evaluate(`localStorage.removeItem("terrainbound.cedar-hollow.v1")`);
  await page.send("Page.reload", { ignoreCache: true });
  await waitFor(() => page.evaluate("Boolean(window.TB)"), 15000);
  await sleep(200);
  await page.evaluate(`document.querySelector("#enter-btn")?.click()`);
  await sleep(1800);
  await page.evaluate(DISMISS, true);
  await sleep(400);
  await page.evaluate(DISMISS, true);
  await page.evaluate(`document.querySelector("#dialogue") && (document.querySelector("#dialogue").hidden = true)`);
  await sleep(300);
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
    await enterGame(page, GAME);
    await shot(page, "A-arrival.png");
    await page.evaluate(`window.TB.go(1240, 508)`);
    await sleep(250);
    await shot(page, "B-station.png");
    await page.evaluate(`window.TB.openDsLamp()`);
    await sleep(200);
    await shot(page, "C-lamp-bench.png");
    await page.evaluate(`document.querySelector("#spectrum-close")?.click()`);
    await page.evaluate(`window.TB.dsCompleteThrough("DS-02")`);
    await page.evaluate(`window.TB.go(380, 440); window.TB.inspectFeature("west-rim-stake")`);
    await sleep(400);
    await page.evaluate(DISMISS, true);
    await sleep(200);
    await shot(page, "D-west-rim-ds03.png");
    await page.evaluate(`document.querySelector("#geo-close")?.click()`);
    await page.evaluate(`window.TB.go(2140, 400)`);
    await sleep(200);
    await shot(page, "E-east-rim.png");
    await page.evaluate(`window.TB.dsCompleteThrough("DS-03")`);
    await page.evaluate(`window.TB.go(1264, 360); window.TB.inspectFeature("plot-board")`);
    await sleep(300);
    await shot(page, "F-unlabeled-plot.png");
    await page.evaluate(`document.querySelector("#geo-close")?.click()`);
    await page.evaluate(`window.TB.dsCompleteThrough("DS-04")`);
    await page.evaluate(`window.TB.go(1328, 396); window.TB.openDsSpectrograph()`);
    await sleep(280);
    await shot(page, "G-stellar-evolution.png");
    await page.evaluate(`document.querySelector("#geo-close")?.click()`);
    await page.evaluate(`window.TB.dsCompleteThrough("DS-05")`);
    await page.evaluate(`window.TB.go(1288, 980)`);
    await sleep(200);
    await shot(page, "H-quiet-floor.png");
    await page.evaluate(`window.TB.go(1220, 1020); window.TB.inspectFeature("floor-rock")`);
    await sleep(280);
    await page.evaluate(DISMISS, true);
    await sleep(150);
    await shot(page, "I-floor-rock.png");
    await page.evaluate(`window.TB.dsCompleteThrough("DS-06")`);
    await page.evaluate(`window.TB.go(1296, 428); window.TB.inspectFeature("plate-desk")`);
    await sleep(300);
    await shot(page, "J-redshift.png");
    await page.evaluate(`document.querySelector("#spectrum-close")?.click()`);
    await page.evaluate(`document.querySelector("#geo-close")?.click()`);
    await page.evaluate(`window.TB.dsCompleteThrough("DS-07")`);
    await page.evaluate(`window.TB.go(1360, 940); window.TB.inspectFeature("floor-horn")`);
    await sleep(300);
    await shot(page, "K-origin-horn.png");
    await page.evaluate(`document.querySelector("#geo-close")?.click()`);
    await page.evaluate(`window.TB.dsCompleteThrough("DS-08")`);
    await page.evaluate(`window.TB.go(1348, 348); window.TB.inspectFeature("burst-poster")`);
    await sleep(280);
    await page.evaluate(DISMISS, true);
    await sleep(150);
    await shot(page, "L-lookback-poster.png");
    await page.evaluate(`window.TB.dsCompleteThrough("DS-09")`);
    await page.evaluate(`window.TB.go(1296, 428); window.TB.inspectFeature("plate-desk")`);
    await sleep(300);
    await shot(page, "M-ds10-envelope.png");
    await page.evaluate(`document.querySelector("#geo-close")?.click()`);
    await page.evaluate(`window.TB.dsCompleteThrough("DS-10")`);
    await page.evaluate(`window.TB.openJournal()`);
    await sleep(200);
    await page.evaluate(`document.querySelector('[data-tab="evidence"]')?.click()`);
    await sleep(150);
    await shot(page, "N-field-tablet.png");
    await page.evaluate(`document.querySelector("#journal-close")?.click()`);
    await page.evaluate(`window.TB.openSummit()`);
    await sleep(250);
    await page.evaluate(`window.TB.askSummit({ question: "Was everything made in stars?" })`, true);
    await sleep(900);
    await shot(page, "O-summit.png");
    await page.evaluate(`window.TB.closeSummit()`);
    await page.evaluate(`window.TB.openAar()`);
    await sleep(280);
    await shot(page, "P-wren-aar.png");
    await page.evaluate(`window.TB.submitAar()`);
    await sleep(400);
    await shot(page, "Q-more-evidence.png");
    await page.evaluate(DISMISS, true);
    await page.evaluate(`
      const host = window.TB.dsState;
      host.aar.answers = {
        "aar-twins": ["DS-01"],
        "aar-distance": ["DS-03"],
        "aar-envelope": ["DS-10"],
        "aar-refuse": ["DS-09"]
      };
      host.aar.result = null;
    `);
    await page.evaluate(`window.TB.openAar()`);
    await sleep(200);
    await page.evaluate(`window.TB.submitAar()`);
    await sleep(400);
    await shot(page, "R-field-clearance.png");
    await page.evaluate(DISMISS, true);
    await page.send("Emulation.setDeviceMetricsOverride", {
      width: 320,
      height: 568,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(250);
    await shot(page, "S-320.png");
    await page.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(250);
    await shot(page, "T-390.png");
    await page.send("Emulation.setDeviceMetricsOverride", {
      width: 430,
      height: 932,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(250);
    await shot(page, "U-430.png");
    await page.send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });
    await sleep(250);
    await shot(page, "V-1280.png");
    await writeFile(
      path.join(OUT, "owner-review-url.txt"),
      GAME.replace(`127.0.0.1:${PORT}`, "127.0.0.1:PORT") + "\n"
    );
    console.log("Phase 8C captures written to", OUT);
  } finally {
    ws?.close();
    chrome.kill("SIGKILL");
    server.kill("SIGKILL");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
