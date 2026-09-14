#!/usr/bin/env node
/**
 * Phase 8D owner-review captures — refined problem areas only.
 * Writes PNGs to tests/evidence/phase8d/.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { openSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tests/evidence/phase8d");
const PORT = Number(process.env.TB_HTTP_PORT || 8096);
const GAME = `http://127.0.0.1:${PORT}/terrainbound/?field=1&region=dark-sky-basin&summit=local&v=p79l`;
const DEBUG_PORT = Number(process.env.TB_CDP_PORT || 9371);
const USER_DATA = `/tmp/tb-p8d-chrome-${process.pid}`;

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
  const logFd = openSync(`/tmp/tb-p8d-chrome-${process.pid}.log`, "w");
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
    await page.evaluate(`window.TB.dsCompleteThrough("DS-03")`);
    await page.evaluate(`window.TB.go(1264, 360); window.TB.inspectFeature("plot-board")`);
    await sleep(300);
    await shot(page, "01-ds04-measured-plot.png");
    await page.evaluate(`document.querySelector("#geo-close")?.click()`);

    await page.evaluate(`window.TB.dsCompleteThrough("DS-06")`);
    await page.evaluate(`window.TB.go(1328, 396); window.TB.openDsSpectrograph()`);
    await sleep(280);
    await shot(page, "02-ds07-rest-vs-galaxy.png");
    await page.evaluate(`document.querySelector("#spectrum-close")?.click()`);
    await page.evaluate(`window.TB.go(1264, 360); window.TB.inspectFeature("plot-board")`);
    await sleep(300);
    await shot(page, "03-ds07-shift-plot-board.png");
    await page.evaluate(`document.querySelector("#geo-close")?.click()`);

    await page.evaluate(`window.TB.dsCompleteThrough("DS-07")`);
    await page.evaluate(`window.TB.go(1360, 940); window.TB.inspectFeature("floor-horn")`);
    await sleep(300);
    await shot(page, "04-ds08-horn-tablet-lines.png");
    await page.evaluate(`document.querySelector("#geo-close")?.click()`);

    await page.evaluate(`window.TB.dsCompleteThrough("DS-08")`);
    await page.evaluate(`window.TB.go(1348, 348); window.TB.inspectFeature("burst-poster")`);
    await sleep(280);
    await shot(page, "05-ds09-lookback-poster.png");
    await page.evaluate(DISMISS, true);
    await page.evaluate(`window.TB.openDsEyepiece()`);
    await sleep(250);
    await shot(page, "06-ds09-eyepiece-no-later-button.png");
    await page.evaluate(`document.querySelector("#sky-eye-close")?.click()`);

    await page.evaluate(`window.TB.dsCompleteThrough("DS-10")`);
    await page.evaluate(`window.TB.openAar()`);
    await sleep(280);
    await shot(page, "07-aar.png");
    await page.evaluate(`document.querySelector("#aar-close")?.click()`);

    await page.evaluate(`window.TB.openSummit()`);
    await sleep(250);
    await shot(page, "08-summit-debug-collapsed.png");
    await page.evaluate(`window.TB.closeSummit()`);

    const interact = async (label) => {
      const run = async (expr) => page.evaluate(expr, true);
      await run(`document.querySelector("#geo-close")?.click(); document.querySelector("#spectrum-close")?.click(); document.querySelector("#aar-close")?.click(); document.querySelector("#journal-close")?.click(); window.TB.closeSummit?.()`);
      await sleep(80);
      await run(`window.TB.dsCompleteThrough("DS-06"); window.TB.openDsSpectrograph()`);
      await sleep(180);
      const spectrum = await run(`(() => {
        const slider = document.querySelector("#spectrum-bench input[type=range]");
        const chip = document.querySelector("#spectrum-bench .chip-row button");
        const r = slider?.getBoundingClientRect();
        const c = chip?.getBoundingClientRect();
        const before = slider ? slider.value : null;
        if (slider) {
          slider.value = "24";
          slider.dispatchEvent(new Event("input", { bubbles: true }));
        }
        if (chip) chip.click();
        return {
          sliderFits: Boolean(r) && r.width > 80 && r.left >= 0 && r.right <= innerWidth && r.height >= 24,
          sliderMoved: slider ? slider.value !== before : false,
          chipFits: Boolean(c) && c.height >= 32 && c.right <= innerWidth + 4 && c.left >= -4
        };
      })()`);
      await run(`document.querySelector("#spectrum-close")?.click()`);
      await run(`window.TB.dsCompleteThrough("DS-03"); window.TB.inspectFeature("plot-board")`);
      await sleep(180);
      const plot = await run(`(() => {
        const canvas = document.querySelector(".ds-field-canvas");
        const tryBtn = document.querySelector("#geo-try");
        const r = canvas?.getBoundingClientRect();
        const t = tryBtn?.getBoundingClientRect();
        if (canvas && r) {
          canvas.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: r.left + r.width * 0.35, clientY: r.top + r.height * 0.45 }));
        }
        return {
          canvasFits: Boolean(r) && r.width >= innerWidth * 0.62 && r.right <= innerWidth - 2 && r.left >= 2 && r.height >= 110,
          tryClear: Boolean(t) && t.bottom <= innerHeight - 2 && t.height >= 36 && (!r || t.top >= r.bottom - 4)
        };
      })()`);
      await run(`document.querySelector("#geo-close")?.click()`);
      await run(`window.TB.openJournal()`);
      await sleep(120);
      const tablet = await run(`(() => {
        const j = document.querySelector("#journal");
        const r = j?.getBoundingClientRect();
        return {
          open: Boolean(j) && j.classList.contains("is-open"),
          fits: Boolean(r) && r.width > 120 && r.left < innerWidth && r.right > 0
        };
      })()`);
      await run(`document.querySelector("#journal-close")?.click()`);
      await run(`window.TB.dsCompleteThrough("DS-10"); window.TB.openAar()`);
      await sleep(180);
      const aar = await run(`(() => {
        const btn = document.querySelector("#aar-evidence button");
        const footer = document.querySelector("#aar .conclusion-actions");
        const r = btn?.getBoundingClientRect();
        const f = footer?.getBoundingClientRect();
        if (btn) btn.click();
        return {
          pinFits: Boolean(r) && r.height >= 44 && r.left >= 0 && r.right <= innerWidth,
          footerClear: Boolean(f) && f.bottom <= innerHeight && f.top > 48,
          pinned: Boolean(btn?.classList.contains("is-on"))
        };
      })()`);
      await run(`document.querySelector("#aar-close")?.click()`);
      await run(`window.TB.openSummit()`);
      await sleep(180);
      const summit = await run(`(() => {
        const sheet = document.querySelector(".summit-sheet");
        const ask = document.querySelector("#summit-ask, .summit-composer button, .summit-sheet button");
        const diag = document.querySelector("#summit-diag");
        const toggle = document.querySelector("#summit-diag-toggle");
        const r = sheet?.getBoundingClientRect();
        const q = document.querySelector(".summit-quick button");
        if (q) q.click();
        return {
          sheetFits: Boolean(r) && r.width <= innerWidth && r.bottom <= innerHeight + 8,
          askH: ask?.getBoundingClientRect().height || 0,
          diagCollapsed: !diag || diag.hidden,
          togglePresent: Boolean(toggle) && !toggle.hidden,
          quickClicked: Boolean(q)
        };
      })()`);
      await run(`window.TB.closeSummit()`);
      return { viewport: label, spectrum, plot, tablet, aar, summit };
    };

    await page.evaluate(`window.TB.go(1264, 360); window.TB.inspectFeature("plot-board")`);
    await sleep(200);
    await page.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(250);
    await shot(page, "09-mobile-390-plot.png");
    const mobile390 = await interact("390x844");
    await page.evaluate(`window.TB.dsCompleteThrough("DS-03"); window.TB.inspectFeature("plot-board")`);
    await sleep(200);
    await page.send("Emulation.setDeviceMetricsOverride", {
      width: 320,
      height: 568,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(250);
    await page.evaluate(`document.querySelector(".ds-field-canvas")?.scrollIntoView({ block: "center", inline: "nearest" })`);
    await sleep(120);
    await shot(page, "10-mobile-320-plot.png");
    const mobile320 = await interact("320x568");
    await writeFile(path.join(OUT, "mobile-interact.json"), JSON.stringify({ mobile390, mobile320 }, null, 2));
    await writeFile(
      path.join(OUT, "owner-review-url.txt"),
      GAME.replace(`127.0.0.1:${PORT}`, "127.0.0.1:PORT") + "\n"
    );
    console.log("Phase 8D captures written to", OUT);
    console.log(JSON.stringify({ mobile390, mobile320 }, null, 2));
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
