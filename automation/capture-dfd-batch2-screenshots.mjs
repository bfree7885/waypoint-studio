#!/usr/bin/env node
/**
 * Capture Deep Forest Dispatch Batch #2 owner-review screenshots.
 * Usage: node automation/capture-dfd-batch2-screenshots.mjs [baseUrl]
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
const CDP_PORT = Number(process.env.WAYPOINT_CDP_PORT || 9422);
const OUT = path.join(ROOT, "docs/deep-forest-dispatch/batch-2/screenshots");
const ART = "/opt/cursor/artifacts/dfd-batch2-review";

const STORIES = [
  {
    id: "okavango-dry-season-flood",
    path: "/deep-forest-dispatch/stories/okavango-dry-season-flood/",
    viz: "#paradox"
  },
  {
    id: "eye-of-the-sahara-richat",
    path: "/deep-forest-dispatch/stories/eye-of-the-sahara-richat/",
    viz: "#bullseye"
  },
  {
    id: "namib-dunes-moving-satellites",
    path: "/deep-forest-dispatch/stories/namib-dunes-moving-satellites/",
    viz: "#proof"
  }
];

const SHOTS = [
  { name: "library-desktop", path: "/deep-forest-dispatch/", w: 1440, h: 900, mobile: false, full: true },
  { name: "library-mobile", path: "/deep-forest-dispatch/", w: 390, h: 844, mobile: true, full: true },
  ...STORIES.flatMap((s) => [
    { name: `${s.id}-desktop`, path: s.path, w: 1440, h: 900, mobile: false, full: true },
    { name: `${s.id}-mobile`, path: s.path, w: 390, h: 844, mobile: true, full: true },
    { name: `${s.id}-viz`, path: s.path, w: 1440, h: 900, mobile: false, full: false, scroll: s.viz }
  ])
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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "dfd-b2-shots-"));
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
      if (page) return { proc, wsUrl: page.webSocketDebuggerUrl, userDataDir };
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

async function pngToJpg(pngPath, jpgPath, quality = 82) {
  const { spawnSync } = await import("child_process");
  const r = spawnSync(
    "python3",
    [
      "-c",
      `from PIL import Image; im=Image.open(${JSON.stringify(pngPath)}).convert("RGB"); im.save(${JSON.stringify(jpgPath)}, "JPEG", quality=${quality}, optimize=True)`
    ],
    { encoding: "utf8" }
  );
  if (r.status !== 0) throw new Error(r.stderr || "jpeg convert failed");
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
      await delay(2200);
      await client.send("Runtime.evaluate", {
        expression: `document.querySelectorAll('[role="dialog"], #wds-location-prompt').forEach((el)=>el.remove()); true;`
      });
      if (s.scroll) {
        await client.send("Runtime.evaluate", {
          expression: `document.querySelector(${JSON.stringify(s.scroll)})?.scrollIntoView({block:"center"});`
        });
        await delay(600);
      } else if (s.full) {
        await client.send("Runtime.evaluate", {
          expression: `window.scrollTo(0,0); true;`
        });
        await delay(200);
      }
      const { data } = await client.send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
        captureBeyondViewport: !!s.full
      });
      const buf = Buffer.from(data, "base64");
      const png = path.join(OUT, s.name + ".png");
      const jpg = path.join(OUT, s.name + ".jpg");
      fs.writeFileSync(png, buf);
      await pngToJpg(png, jpg);
      fs.copyFileSync(jpg, path.join(ART, s.name + ".jpg"));
      fs.unlinkSync(png);
      console.log("wrote", s.name + ".jpg", fs.statSync(jpg).size);
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
