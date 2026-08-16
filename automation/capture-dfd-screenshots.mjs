#!/usr/bin/env node
/**
 * Capture Deep Forest Dispatch owner-review screenshots.
 * Usage: node automation/capture-dfd-screenshots.mjs [baseUrl]
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = (process.argv[2] || "http://127.0.0.1:8080").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH || "google-chrome";
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9416);
const OUT = path.join(ROOT, "docs/deep-forest-dispatch/screenshots");
const ART = "/opt/cursor/artifacts/dfd-review";

const SHOTS = [
  { name: "01-library-desktop", path: "/deep-forest-dispatch/", w: 1440, h: 900, mobile: false },
  { name: "02-library-mobile", path: "/deep-forest-dispatch/", w: 390, h: 844, mobile: true },
  { name: "03-story1-desktop", path: "/deep-forest-dispatch/stories/mount-hood-rain-shadow/", w: 1440, h: 900, mobile: false },
  { name: "04-story1-mobile", path: "/deep-forest-dispatch/stories/mount-hood-rain-shadow/", w: 390, h: 844, mobile: true },
  { name: "05-story2-desktop", path: "/deep-forest-dispatch/stories/lencois-maranhenses/", w: 1440, h: 900, mobile: false },
  { name: "06-story2-mobile", path: "/deep-forest-dispatch/stories/lencois-maranhenses/", w: 390, h: 844, mobile: true },
  {
    name: "07-story1-rain-shadow-diagram",
    path: "/deep-forest-dispatch/stories/mount-hood-rain-shadow/",
    w: 1440,
    h: 900,
    mobile: false,
    scroll: "#rain-shadow"
  },
  {
    name: "08-story2-season-compare",
    path: "/deep-forest-dispatch/stories/lencois-maranhenses/",
    w: 1440,
    h: 900,
    mobile: false,
    scroll: "#from-space"
  },
  {
    name: "09-story1-waypoint-connections",
    path: "/deep-forest-dispatch/stories/mount-hood-rain-shadow/",
    w: 1440,
    h: 900,
    mobile: false,
    scroll: "#dfd-wp-heading"
  }
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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "dfd-shots-"));
  const proc = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-extensions",
      "--disable-dev-shm-usage",
      `--user-data-dir=${userDataDir}`,
      `--remote-debugging-port=${CDP_PORT}`,
      "about:blank"
    ],
    { stdio: "ignore" }
  );
  for (let i = 0; i < 60; i++) {
    await delay(250);
    try {
      const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
      const page = targets.find((t) => t.type === "page");
      if (page) return { proc, wsUrl: page.webSocketDebuggerUrl };
    } catch (_) {}
  }
  proc.kill("SIGTERM");
  throw new Error("Chrome CDP not ready");
}

async function cdp(wsUrl) {
  const WebSocket = (await import("ws")).default;
  let id = 0;
  const pending = new Map();
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
    }
  });
  function send(method, params = {}) {
    const msgId = ++id;
    return new Promise((resolve, reject) => {
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }
  return {
    send,
    close: () => {
      try {
        ws.close();
      } catch (_) {}
    }
  };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(ART, { recursive: true });
  await import("ws").catch(async () => {
    throw new Error("ws package required (npm install ws)");
  });

  const { proc, wsUrl } = await startChrome();
  const client = await cdp(wsUrl);
  try {
    await client.send("Page.enable");
    await client.send("Runtime.enable");

    for (const s of SHOTS) {
      await client.send("Emulation.setDeviceMetricsOverride", {
        width: s.w,
        height: s.h,
        deviceScaleFactor: s.mobile ? 2 : 1,
        mobile: !!s.mobile
      });
      await client.send("Page.navigate", { url: BASE + s.path });
      await delay(1800);
      if (s.scroll) {
        await client.send("Runtime.evaluate", {
          expression: `document.querySelector(${JSON.stringify(s.scroll)})?.scrollIntoView({block:"center"});`
        });
        await delay(500);
      }
      // Dismiss any shell dialogs if present
      await client.send("Runtime.evaluate", {
        expression: `document.querySelectorAll('[role="dialog"], #wds-location-prompt').forEach((el)=>el.remove()); true;`
      });
      const { data } = await client.send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true
      });
      const buf = Buffer.from(data, "base64");
      const file = path.join(OUT, s.name + ".png");
      fs.writeFileSync(file, buf);
      fs.copyFileSync(file, path.join(ART, s.name + ".png"));
      console.log("wrote", s.name, buf.length);
    }
  } finally {
    client.close();
    proc.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
