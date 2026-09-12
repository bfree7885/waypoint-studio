#!/usr/bin/env node
/**
 * Phase 7.9I owner dry run: one Cedar Hollow field-test session.
 * Does not print API keys. Writes JSON/Markdown under tests/evidence/phase79i/.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync, openSync, readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import { logLooksPrivate, formatFieldTestMarkdown } from "../js/summit-fieldtest.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tests/evidence/phase79i");
const PORT = Number(process.env.TB_HTTP_PORT || 8098);
const DEBUG_PORT = Number(process.env.TB_CDP_PORT || 9356);
const USER_DATA = `/tmp/tb-p79i-dryrun-${process.pid}`;
const GAME = `http://127.0.0.1:${PORT}/terrainbound/?field=1&summit=fieldtest&v=p79i`;

function applyLocalEnv() {
  const envPath = path.join(ROOT, "data/summit/.env");
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim().replace(/^export\s+/, "");
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}

applyLocalEnv();

const MODEL = process.env.SUMMIT_AI_MODEL || "openai/gpt-oss-20b";

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
  const logFd = openSync(`/tmp/tb-p79i-dryrun-${process.pid}.log`, "w");
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

async function enterGame(page, url) {
  await page.send("Page.navigate", { url });
  await waitFor(() => page.evaluate("Boolean(window.TB)"), 15000);
  await page.evaluate(`localStorage.removeItem("terrainbound.cedar-hollow.v1")`);
  await page.send("Page.reload", { ignoreCache: true });
  await waitFor(() => page.evaluate("Boolean(window.TB)"), 15000);
  await sleep(200);
  await page.evaluate(`document.querySelector("#enter-btn")?.click()`);
  await sleep(400);
  await page.evaluate(DISMISS, true);
  await sleep(900);
  await page.evaluate(DISMISS, true);
  await sleep(150);
}

async function waitHealth(timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const health = await fetch("http://127.0.0.1:8787/health")
      .then((r) => r.json())
      .catch(() => null);
    if (health?.ok) return health;
    await sleep(120);
  }
  return null;
}

function startProxy() {
  return spawn(process.execPath, [path.join(ROOT, "server/summit-proxy.mjs")], {
    env: {
      ...process.env,
      SUMMIT_AI_MODEL: MODEL,
      SUMMIT_PROXY_PORT: "8787",
      SUMMIT_DEBUG: process.env.SUMMIT_DEBUG || "0"
    },
    stdio: "ignore"
  });
}

const ASK = [
  { q: "why did the water move faster?", mark: "HELPED", note: "natural slope why" },
  { q: "huh", mark: "CONFUSING", note: "vague" },
  { q: "gravity is stronger on the steep slope", mark: "WRONG", note: "gravity misconception" },
  { q: "the steep one?", mark: "HELPED", note: "followup" },
  { q: "it took 6.2 seconds, right?", mark: "WRONG", note: "false premise" },
  { q: "just tell me the answer", mark: "TOO_MUCH", note: "answer ladder" },
  { q: "what do I do next", mark: "HELPED", note: "next action" }
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const already = await waitHealth(400);
  const proxy = already ? null : startProxy();
  const health = await waitHealth(already ? 400 : 8000);
  const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], {
    cwd: path.resolve(ROOT, ".."),
    stdio: "ignore"
  });
  const chrome = launchChrome();
  let ws;
  try {
    await sleep(400);
    const conn = await connectPage(chrome);
    ws = conn.ws;
    const { page } = conn;
    await page.send("Page.enable");
    await page.send("Runtime.enable");
    await page.send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });
    await enterGame(page, GAME);

    const startMeta = await page.evaluate(`({
      adapter: window.TB.summitAdapterId,
      fieldTest: Boolean(window.TB.fieldTest),
      player: { x: window.TB.player.x, y: window.TB.player.y },
      aar: window.TB.puzzleState.aar.result
    })`);

    await page.evaluate(`window.TB.go(700, 520)`);
    await sleep(150);
    await page.evaluate(`window.TB.inspectFeature("high-look")`);
    await sleep(200);
    await page.evaluate(DISMISS, true);

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

    for (const row of ASK) {
      await page.evaluate(`window.TB.askSummit(${JSON.stringify({ question: row.q })})`, true);
      await page.evaluate(`window.TB.fieldTest.mark(${JSON.stringify(row.mark)}, ${JSON.stringify(row.note)})`);
    }

    await page.evaluate(
      `(() => {
        const TB = window.TB;
        TB.openJournal();
        TB.openFlume();
        TB.flumeState.prediction = "steep";
        TB.flumeState.water = "extra";
        TB.flumeState.slope = "steep";
        TB.releaseWater();
        TB.flumeState.water = "one-cup";
        for (const slope of ["steep", "steep", "gentle", "gentle", "moderate", "moderate"]) {
          TB.flumeState.slope = slope;
          TB.releaseWater();
        }
        return {
          trials: TB.flumeState.trials.length,
          setupRevised: TB.flumeState.setupRevised
        };
      })()`
    );
    await page.evaluate(DISMISS, true);

    await page.evaluate(
      `(() => {
        const TB = window.TB;
        TB.openInterpret();
        const ds = TB.dataState.datasets["cedar-hollow-flow"];
        if (ds) {
          ds.patternId = "faster-with-slope";
          ds.conclusionId = "steeper-faster";
        }
        return TB.tryInterpret();
      })()`
    );
    await page.evaluate(DISMISS, true);

    await page.evaluate(`window.TB.askSummit({ question: "can I conclude steep is faster now?" })`, true);
    await page.evaluate(`window.TB.fieldTest.mark("HELPED", "after fair comparison")`);

    const earlyAar = await page.evaluate(`window.TB.submitAar()`);
    await page.evaluate(DISMISS, true);

    const afterComplete = await page.evaluate(
      `(() => {
        const TB = window.TB;
        TB.invState.obsInt.sorts = [
          { cardId: "card-a", choice: "observation", ok: true, attempts: 1 },
          { cardId: "card-b", choice: "observation", ok: true, attempts: 1 }
        ];
        TB.missionState.concluded = true;
        TB.challengeState.concluded = true;
        TB.challengeState.workingRoles = ["weather", "join", "source"];
        TB.invState.concluded = true;
        TB.invState.selectedProcess = "two-clocks";
        TB.puzzleState.systems.concluded = true;
        TB.puzzleState.conflict.repaired = true;
        TB.puzzleState.aar.answers = {
          "aar-obs": ["CH-01"],
          "aar-table": ["CH-03", "CH-02"],
          "aar-pulse": ["CH-05", "CH-07"],
          "aar-clocks": ["CH-06", "CH-01"],
          "aar-return": ["CH-05", "CH-08"]
        };
        const result = TB.submitAar();
        return {
          result: result.result,
          accessible: [...TB.worldState.accessibleRegions],
          aar: TB.puzzleState.aar.result
        };
      })()`
    );
    await page.evaluate(DISMISS, true);

    const packed = await page.evaluate(`window.TB.fieldTest.payload()`);
    const saveRaw = await page.evaluate(`localStorage.getItem("terrainbound.cedar-hollow.v1")`);
    const overflow = await page.evaluate(
      `document.documentElement.scrollWidth > document.documentElement.clientWidth + 1`
    );
    const tablet = await page.evaluate(
      `(() => {
        window.TB.openJournal();
        const journal = document.querySelector("#journal");
        return { hidden: Boolean(journal?.hidden), overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
      })()`
    );

    const sessionId = packed?.session?.sessionId || "session";
    const names = {
      json: `terrainbound-fieldtest-${sessionId.slice(0, 12)}.json`,
      md: `terrainbound-fieldtest-${sessionId.slice(0, 12)}.md`
    };
    const md = formatFieldTestMarkdown(packed.session, packed.summary);
    await writeFile(path.join(OUT, names.json), JSON.stringify(packed, null, 2));
    await writeFile(path.join(OUT, names.md), md);

    const blob = JSON.stringify({ packed, saveRaw, startMeta, earlyAar, afterComplete });
    const privacy = {
      logLooksPrivate: logLooksPrivate(packed),
      saveHasEmail: /@/.test(saveRaw || ""),
      blobHasKeyName: /SUMMIT_API_KEY|gsk_|sk-live|Authorization/i.test(blob),
      packedHasIpKey: /"ipAddress"|"studentName"|"accountId"|"email"/i.test(JSON.stringify(packed))
    };

    const report = {
      proxyHealthy: Boolean(health?.ok),
      model: MODEL,
      adapter: startMeta.adapter,
      fieldTestAttached: startMeta.fieldTest,
      earlyAar: earlyAar?.result || earlyAar,
      clearance: afterComplete,
      overflow,
      tablet,
      privacy,
      summary: packed?.summary || null,
      filenames: names
    };
    await writeFile(path.join(OUT, "dry-run-report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({
      proxyHealthy: report.proxyHealthy,
      adapter: report.adapter,
      earlyAar: report.earlyAar,
      clearance: afterComplete?.aar,
      summitTurns: packed?.summary?.summitTurns,
      hosted: packed?.summary?.hostedTurns,
      deterministic: packed?.summary?.deterministicTurns,
      fallbacks: packed?.summary?.fallbacks,
      validatorRejections: packed?.summary?.validatorRejections,
      latency: packed?.summary?.latency,
      privacy: report.privacy,
      files: names
    }));
  } finally {
    try {
      ws?.close();
    } catch {
      /* ignore */
    }
    chrome.kill("SIGTERM");
    server.kill("SIGTERM");
    if (proxy) proxy.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
