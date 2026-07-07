#!/usr/bin/env node
/**
 * Headless Chrome smoke test — captures console errors on key pages.
 * Usage: node automation/smoke-browser.mjs [baseUrl]
 */
import { spawn } from "child_process";
import http from "http";
import { setTimeout as delay } from "timers/promises";

const BASE = process.argv[2] || "http://127.0.0.1:8080";
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const PORT = 9223;
const PAGES = [
  { name: "homepage", path: "/", waitMs: 20000 },
  { name: "waypoint-scenes", path: "/apps/waypoint-scenes/", waitMs: 8000 }
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

async function startChrome() {
  const proc = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      `--remote-debugging-port=${PORT}`,
      "about:blank"
    ],
    { stdio: "ignore" }
  );
  for (let i = 0; i < 20; i++) {
    await delay(250);
    try {
      const targets = await fetchJson(`http://127.0.0.1:${PORT}/json/list`);
      const page = targets.find((t) => t.type === "page");
      if (page) return { proc, wsUrl: page.webSocketDebuggerUrl };
    } catch (_) { /* retry */ }
  }
  throw new Error("No page CDP target");
}

async function cdp(wsUrl) {
  const WebSocket = (await import("ws")).default;
  let id = 0;
  const pending = new Map();
  const handlers = [];
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.on("open", res);
    ws.on("error", rej);
  });
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method) {
      handlers.forEach((h) => h(msg));
    }
  });
  function send(method, params = {}) {
    const msgId = ++id;
    return new Promise((resolve, reject) => {
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }
  function on(handler) {
    handlers.push(handler);
  }
  async function close() {
    ws.close();
  }
  return { send, on, close };
}

async function testPage(client, page) {
  const errors = [];
  const warnings = [];
  client.on((msg) => {
    if (msg.method === "Runtime.consoleAPICalled") {
      const type = msg.params.type;
      const text = msg.params.args
        .map((a) => a.value ?? a.description ?? "")
        .join(" ");
      if (type === "error") errors.push(text);
      else if (type === "warning") warnings.push(text);
    }
    if (msg.method === "Runtime.exceptionThrown") {
      errors.push(msg.params.exceptionDetails.text || "Uncaught exception");
    }
  });

  await client.send("Page.navigate", { url: BASE + page.path });
  if (page.name === "homepage") {
    await delay(3000);
    await client.send("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.getElementById('wds-loc-default');
        if (btn) btn.click();
        return !!btn;
      })()`,
      returnByValue: true
    });
    for (let i = 0; i < 12; i++) {
      await delay(2500);
      const { result } = await client.send("Runtime.evaluate", {
        expression: `document.querySelectorAll('.wdb-doc__notice').length`,
        returnByValue: true
      });
      if ((result.value || 0) >= 5) break;
    }
  } else {
    await delay(page.waitMs);
  }

  const { result } = await client.send("Runtime.evaluate", {
    expression: `({
      title: document.title,
      hasMain: !!document.querySelector('#main, main, .ws-app'),
      hasDashboard: !!document.querySelector('#outdoor-dashboard'),
      hasBriefingDoc: !!document.querySelector('.wdb-doc'),
      noticeCount: document.querySelectorAll('.wdb-doc__notice').length,
      hasCoach: !!document.querySelector('.mode-coach, #coach-upload, [data-mode="coach"]'),
      hasOutdoorContext: !!document.querySelector('.coach-outdoor-context'),
      bodyLen: document.body ? document.body.innerText.length : 0
    })`,
    returnByValue: true
  });

  return {
    name: page.name,
    url: BASE + page.path,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)].filter((w) => !/DevTools|favicon/i.test(w)),
    checks: result.value || {}
  };
}

async function main() {
  let chrome;
  let client;
  const results = [];
  try {
    chrome = await startChrome();
    client = await cdp(chrome.wsUrl);
    await client.send("Runtime.enable");
    await client.send("Log.enable");
    await client.send("Page.enable");
    for (const page of PAGES) {
      results.push(await testPage(client, page));
    }
  } finally {
    if (client) await client.close();
    if (chrome) chrome.proc.kill("SIGTERM");
  }

  let failed = false;
  for (const r of results) {
    console.log(`\n=== ${r.name} (${r.url}) ===`);
    console.log("Checks:", JSON.stringify(r.checks));
    if (r.errors.length) {
      failed = true;
      console.log("Console ERRORS:");
      r.errors.forEach((e) => console.log("  -", e));
    } else {
      console.log("Console errors: none");
    }
    if (r.warnings.length) {
      console.log("Warnings:", r.warnings.slice(0, 5).join(" | "));
    }
    if (r.name === "homepage" && !r.checks.hasDashboard) {
      failed = true;
      console.log("FAIL: outdoor-dashboard not rendered after location bootstrap");
    }
    if (r.name === "homepage" && r.checks.noticeCount < 5) {
      console.log("INFO: briefing in educational/pending mode (notices=" + r.checks.noticeCount + ") — live mode shows ≥5");
    }
    if (r.name === "waypoint-scenes" && r.checks.bodyLen < 50) {
      failed = true;
      console.log("FAIL: scenes appears blank");
    }
  }

  console.log(failed ? "\nSMOKE: FAIL" : "\nSMOKE: PASS");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error("Smoke runner error:", e.message);
  process.exit(2);
});
