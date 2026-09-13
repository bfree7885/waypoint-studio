#!/usr/bin/env node
/**
 * Phase 7.9J owner RC dry run using the documented one-command launcher.
 * Does not print API keys.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile, readdir } from "node:fs/promises";
import { openSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import { logLooksPrivate } from "../js/summit-fieldtest.js";

const TB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = path.resolve(TB, "..");
const OUT = path.join(TB, "tests/evidence/phase79j");
const DEBUG_PORT = Number(process.env.TB_CDP_PORT || 9360);
const USER_DATA = `/tmp/tb-p79j-rc-${process.pid}`;
const GAME_PORT = Number(process.env.TB_HTTP_PORT || 8086);
const PROXY_PORT = Number(process.env.SUMMIT_PROXY_PORT || 8787);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

async function waitFor(fn, timeout = 25000, step = 80) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    last = await fn();
    if (last) return last;
    await sleep(step);
  }
  throw new Error(`timeout waiting: ${last}`);
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "127.0.0.1");
  });
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
  const logFd = openSync(`/tmp/tb-p79j-rc-${process.pid}.log`, "w");
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
      "--window-size=1280,800",
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
  const attached = await browser.send("Target.attachToTarget", { targetId: created.targetId, flatten: true });
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
        throw new Error(result.exceptionDetails.text || result.exceptionDetails.exception?.description || "evaluate failed");
      }
      return result.result?.value;
    }
  };
  return { page, ws };
}

const DISMISS = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 24; i += 1) {
    const btn = document.querySelector("#dialogue:not([hidden]) #dialogue-actions button");
    if (!btn) break;
    btn.click();
    await sleep(40);
  }
  const toast = document.querySelector("#toast");
  if (toast) toast.hidden = true;
  return true;
})()`;

function startLauncher() {
  let out = "";
  const child = spawn(process.execPath, [path.join(TB, "scripts/fieldtest-summit.mjs")], {
    cwd: REPO,
    env: {
      ...process.env,
      TB_HTTP_PORT: String(GAME_PORT),
      SUMMIT_PROXY_PORT: String(PROXY_PORT)
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  const onData = (buf) => {
    out += buf.toString();
  };
  child.stdout.on("data", onData);
  child.stderr.on("data", onData);
  return {
    child,
    output: () => out,
    async waitReady() {
      await waitFor(() => /Proxy: ready/.test(out) || child.exitCode != null, 40000);
      if (child.exitCode != null) throw new Error(out.slice(-800) || `launcher exited ${child.exitCode}`);
      const match = out.match(/Game: (http:\/\/127\.0\.0\.1:\d+\/terrainbound\/\?summit=fieldtest)/);
      if (!match) throw new Error("launcher did not print the field-test URL\n" + out);
      const probe = out.match(/Startup check: GPT-OSS 20B ok \((\d+) ms\)/);
      return { url: match[1], probeMs: probe ? Number(probe[1]) : null, output: out };
    }
  };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const launcher = startLauncher();
  const chrome = launchChrome();
  let ws;
  try {
    const ready = await launcher.waitReady();
    const printedUrl = ready.url;
    const conn = await connectPage(chrome);
    ws = conn.ws;
    const { page } = conn;
    await page.send("Page.enable");
    await page.send("Runtime.enable");
    await page.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: OUT });

    const ownerUrl = `${printedUrl}&field=1`;
    await page.send("Page.navigate", { url: ownerUrl });
    await waitFor(() => page.evaluate("Boolean(window.TB)"), 15000);
    await page.evaluate(`localStorage.removeItem("terrainbound.cedar-hollow.v1")`);
    await page.send("Page.reload", { ignoreCache: true });
    await waitFor(() => page.evaluate("Boolean(window.TB)"), 15000);
    await page.evaluate(`document.querySelector("#enter-btn")?.click()`);
    await sleep(400);
    await page.evaluate(DISMISS, true);
    await sleep(800);
    await page.evaluate(DISMISS, true);

    const flag = await page.evaluate(`document.querySelector("#summit-fieldtest-flag")?.textContent || ""`);
    await page.evaluate(`window.TB.go(700, 520)`);
    await page.evaluate(
      `(async () => {
        window.TB.openSummit();
        for (let i = 0; i < 120; i += 1) {
          if ((window.TB.summitState.recent || []).some((row) => row.role === "summit")) return true;
          await new Promise((r) => setTimeout(r, 50));
        }
        return false;
      })()`,
      true
    );
    await page.evaluate(`window.TB.askSummit({ question: "why did the water move faster?" })`, true);
    const hostedDebug = await page.evaluate(`({
      adapter: window.TB.summitAdapterId,
      debug: window.TB.summitDebug,
      last: (window.TB.summitState.recent || []).filter((row) => row.role === "summit").slice(-1)[0] || null
    })`);
    await page.evaluate(`window.TB.fieldTest.mark("HELPED", "natural science")`);
    await page.evaluate(`window.TB.askSummit({ question: "what do I do next" })`, true);
    const nextDebug = await page.evaluate(`window.TB.summitDebug`);
    await page.evaluate(`window.TB.inspectFeature("high-look")`);
    await page.evaluate(DISMISS, true);

    const packed = await page.evaluate(`window.TB.fieldTest.payload()`);
    await writeFile(path.join(OUT, packed ? `terrainbound-fieldtest-${packed.session.sessionId.slice(0, 12)}.json` : "payload-missing.json"), JSON.stringify(packed, null, 2));
    const mdName = packed ? `terrainbound-fieldtest-${packed.session.sessionId.slice(0, 12)}.md` : "summary-missing.md";
    const { formatFieldTestMarkdown } = await import("../js/summit-fieldtest.js");
    if (packed) await writeFile(path.join(OUT, mdName), formatFieldTestMarkdown(packed.session, packed.summary));

    const { data } = await page.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(path.join(OUT, "tb-p79j-rc-summit.png"), Buffer.from(data, "base64"));

    const blob = JSON.stringify(packed);
    const report = {
      printedUrl,
      probeMs: ready.probeMs,
      ownerUrl,
      flag,
      hosted: hostedDebug,
      nextAction: {
        useAi: nextDebug?.useAi,
        route: nextDebug?.route,
        provider: nextDebug?.provider,
        adapterId: nextDebug?.adapterId
      },
      summary: packed?.summary || null,
      privacy: {
        logLooksPrivate: logLooksPrivate(packed),
        keyInLog: /gsk_|SUMMIT_API_KEY=/i.test(blob),
        launcherLeakedKey: /gsk_|SUMMIT_API_KEY=/.test(launcher.output())
      }
    };
    await writeFile(path.join(OUT, "rc-dry-run.json"), JSON.stringify(report, null, 2));
    console.log(
      JSON.stringify({
        printedUrl,
        probeMs: ready.probeMs,
        adapter: hostedDebug.adapter,
        hostedRoute: hostedDebug.debug?.route,
        hostedUseAi: hostedDebug.debug?.useAi,
        nextRoute: nextDebug?.route,
        nextUseAi: nextDebug?.useAi,
        summitTurns: packed?.summary?.summitTurns,
        hostedTurns: packed?.summary?.hostedTurns,
        deterministicTurns: packed?.summary?.deterministicTurns,
        fallbacks: packed?.summary?.fallbacks,
        privacy: report.privacy,
        flag
      })
    );

    launcher.child.kill("SIGINT");
    await waitFor(() => launcher.child.exitCode != null, 8000).catch(() => launcher.child.kill("SIGKILL"));
    await sleep(400);
    report.shutdown = {
      launcherExit: launcher.child.exitCode,
      gamePortFree: await isPortFree(GAME_PORT),
      proxyPortFree: await isPortFree(PROXY_PORT)
    };
    await writeFile(path.join(OUT, "rc-dry-run.json"), JSON.stringify(report, null, 2));
    console.log("shutdown", JSON.stringify(report.shutdown));
    const files = await readdir(OUT);
    console.log("files", files.filter((n) => n.startsWith("terrainbound-fieldtest") || n.startsWith("tb-p79j") || n.startsWith("rc-")).join(","));
  } finally {
    try {
      ws?.close();
    } catch {
      /* ignore */
    }
    chrome.kill("SIGTERM");
    try {
      launcher.child.kill("SIGKILL");
    } catch {
      /* ignore */
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
