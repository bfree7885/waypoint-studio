#!/usr/bin/env node
/**
 * One-command Summit field-test launcher.
 * Starts the local TerrainBound static server and the loopback GPT-OSS proxy.
 * Does not print API keys. Does not deploy. Does not change DNS.
 *
 *   npm run fieldtest:summit
 *   node terrainbound/scripts/fieldtest-summit.mjs
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = path.resolve(TB_ROOT, "..");
const ENV_PATH = path.join(TB_ROOT, "data/summit/.env");
const PROXY_PATH = path.join(TB_ROOT, "server/summit-proxy.mjs");
const BAKEOFF_PATH = path.join(TB_ROOT, "data/summit/bakeoff.json");

export const FIELDTEST_MODEL = "openai/gpt-oss-20b";
export const DEFAULT_GAME_PORT = Number(process.env.TB_HTTP_PORT || 8086);
export const DEFAULT_PROXY_PORT = Number(process.env.SUMMIT_PROXY_PORT || 8787);

export class FieldTestError extends Error {
  constructor(message, detail = "") {
    super(message);
    this.name = "FieldTestError";
    this.detail = detail;
    this.human = true;
  }
}

export function loadSummitEnv(envPath = ENV_PATH) {
  const env = {};
  if (!existsSync(envPath)) return env;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim().replace(/^export\s+/, "");
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (k) env[k] = v;
  }
  return env;
}

function bakeoffUpstream() {
  try {
    return JSON.parse(readFileSync(BAKEOFF_PATH, "utf8")).upstream || "";
  } catch {
    return "";
  }
}

export function verifyFieldTestConfig({ envPath = ENV_PATH, processEnv = process.env } = {}) {
  if (!existsSync(envPath)) {
    throw new FieldTestError("Summit field test cannot start: terrainbound/data/summit/.env is missing.");
  }
  const fileEnv = loadSummitEnv(envPath);
  const key = processEnv.SUMMIT_API_KEY || fileEnv.SUMMIT_API_KEY || "";
  if (!key || key.length < 8 || /your[_-]?key|changeme|placeholder/i.test(key)) {
    throw new FieldTestError("Groq API key was not found. Add SUMMIT_API_KEY to the local Summit .env file.");
  }
  const url =
    processEnv.SUMMIT_AI_URL || fileEnv.SUMMIT_AI_URL || bakeoffUpstream() || "https://api.groq.com/openai/v1/chat/completions";
  if (!/^https?:\/\//i.test(url)) {
    throw new FieldTestError("Summit field test cannot start: SUMMIT_AI_URL is not a valid HTTP URL.");
  }
  return {
    keyPresent: true,
    url,
    model: FIELDTEST_MODEL,
    envPath
  };
}

export function fieldTestUrl(gamePort = DEFAULT_GAME_PORT) {
  return `http://127.0.0.1:${gamePort}/terrainbound/?summit=fieldtest`;
}

export function portInUseMessage(port) {
  return `Port ${port} is already in use.`;
}

export function isPortFree(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

function getJson(url, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, text: body.slice(0, 200) });
        }
      });
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error("timeout"));
    });
    req.on("error", reject);
  });
}

function postJson(url, payload, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const target = new URL(url);
    const req = http.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: target.pathname,
        method: "POST",
        headers: { "content-type": "application/json", "content-length": Buffer.byteLength(data) },
        timeout: timeoutMs
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, json: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, text: body.slice(0, 200) });
          }
        });
      }
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function waitFor(fn, timeoutMs, stepMs = 120) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeoutMs) {
    try {
      last = await fn();
      if (last) return last;
    } catch (err) {
      last = err;
    }
    await new Promise((r) => setTimeout(r, stepMs));
  }
  throw last instanceof Error ? last : new Error("timeout");
}

export async function checkGameHealth(gamePort = DEFAULT_GAME_PORT) {
  const url = `http://127.0.0.1:${gamePort}/terrainbound/`;
  const res = await getJson(url).catch(() => null);
  if (res?.status === 200 || (res?.text && /TerrainBound|summit/i.test(res.text))) return true;
  const html = await new Promise((resolve, reject) => {
    http
      .get(url, (r) => {
        let body = "";
        r.on("data", (c) => {
          body += c;
        });
        r.on("end", () => resolve({ status: r.statusCode, body }));
      })
      .on("error", reject);
  });
  return html.status === 200 && /Summit|Cedar Hollow|TerrainBound/i.test(html.body);
}

export async function checkProxyHealth(proxyPort = DEFAULT_PROXY_PORT) {
  const res = await getJson(`http://127.0.0.1:${proxyPort}/health`);
  if (!res?.json?.ok) {
    throw new FieldTestError("TerrainBound started, but Summit proxy health check failed.", JSON.stringify(res?.json || res));
  }
  if (res.json.model && res.json.model !== FIELDTEST_MODEL) {
    throw new FieldTestError(
      `Summit proxy is not using GPT-OSS 20B (reported ${res.json.model}).`,
      JSON.stringify(res.json)
    );
  }
  return res.json;
}

export async function probeHostedSummit(proxyPort = DEFAULT_PROXY_PORT) {
  const res = await postJson(`http://127.0.0.1:${proxyPort}/summit-ai`, {
    prompt:
      "You are Summit, a calm Earth Science tutor. Write one short sentence. Do not give game instructions. JSON only.",
    question: "Does a steeper slope tend to make runoff faster?",
    packet: { facts: { puzzle: "CH-03", known: [], expected: [], unknown: [] } }
  });
  const explanation = res.json?.explanation || "";
  if (res.status !== 200 || !explanation) {
    throw new FieldTestError(
      "TerrainBound started, but Summit proxy health check failed.",
      `startup probe status=${res.status} error=${res.json?.error || "empty"}`
    );
  }
  return {
    ok: true,
    model: res.json?.usage?.model || FIELDTEST_MODEL,
    latencyMs: res.json?.usage?.latencyMs ?? null,
    explanationChars: explanation.length
  };
}

function spawnGame(gamePort) {
  return spawn("python3", ["-m", "http.server", String(gamePort), "--bind", "127.0.0.1"], {
    cwd: REPO_ROOT,
    stdio: "ignore"
  });
}

function spawnProxy({ url, key, proxyPort }) {
  return spawn(process.execPath, [PROXY_PATH], {
    env: {
      ...process.env,
      SUMMIT_API_KEY: key,
      SUMMIT_AI_URL: url,
      SUMMIT_AI_MODEL: FIELDTEST_MODEL,
      SUMMIT_PROXY_PORT: String(proxyPort),
      SUMMIT_MAX_TOKENS: process.env.SUMMIT_MAX_TOKENS || "80",
      SUMMIT_DEBUG: "0"
    },
    stdio: "ignore"
  });
}

export async function startFieldTest(opts = {}) {
  const gamePort = opts.gamePort || DEFAULT_GAME_PORT;
  const proxyPort = opts.proxyPort || DEFAULT_PROXY_PORT;
  const cfg = verifyFieldTestConfig({ envPath: opts.envPath, processEnv: opts.processEnv });
  const fileEnv = loadSummitEnv(opts.envPath || ENV_PATH);
  const key = (opts.processEnv || process.env).SUMMIT_API_KEY || fileEnv.SUMMIT_API_KEY;

  if (!(await isPortFree(gamePort))) {
    throw new FieldTestError(portInUseMessage(gamePort));
  }
  if (!(await isPortFree(proxyPort))) {
    throw new FieldTestError(portInUseMessage(proxyPort));
  }

  const game = spawnGame(gamePort);
  const proxy = spawnProxy({ url: cfg.url, key, proxyPort });
  const children = [game, proxy];

  const stop = async () => {
    for (const child of children) {
      if (!child || child.killed || child.exitCode != null) continue;
      child.kill("SIGTERM");
    }
    await new Promise((r) => setTimeout(r, 200));
    for (const child of children) {
      if (!child || child.killed || child.exitCode != null) continue;
      child.kill("SIGKILL");
    }
  };

  try {
    await waitFor(() => checkGameHealth(gamePort), 8000);
    const proxyHealth = await waitFor(() => checkProxyHealth(proxyPort).catch(() => null), 8000);
    if (!proxyHealth?.ok) {
      await stop();
      throw new FieldTestError("TerrainBound started, but Summit proxy health check failed.");
    }
    const probe = opts.skipProbe ? { ok: true, skipped: true } : await probeHostedSummit(proxyPort);
    return {
      gamePort,
      proxyPort,
      url: fieldTestUrl(gamePort),
      model: FIELDTEST_MODEL,
      proxyHealth,
      probe,
      stop,
      children
    };
  } catch (err) {
    await stop();
    if (err instanceof FieldTestError) throw err;
    throw new FieldTestError("TerrainBound started, but Summit proxy health check failed.", err.message || String(err));
  }
}

function printBanner(session) {
  console.log("");
  console.log("TerrainBound Summit Field Test");
  console.log(`Game: ${session.url}`);
  console.log("Summit provider: GPT-OSS 20B");
  console.log("Proxy: ready");
  if (session.probe && !session.probe.skipped) {
    console.log(`Startup check: GPT-OSS 20B ok (${session.probe.latencyMs ?? "?"} ms)`);
  }
  console.log("");
  console.log("Press Ctrl+C to stop.");
}

async function main() {
  try {
    const session = await startFieldTest();
    printBanner(session);
    const shutdown = async () => {
      await session.stop();
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    const message = err?.human ? err.message : `Summit field test cannot start: ${err.message || err}`;
    console.error(message);
    if (err?.detail) console.error(err.detail);
    process.exit(1);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
