#!/usr/bin/env node
/**
 * Capture discovery screenshots with the location prompt dismissed.
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import CDP from "chrome-remote-interface";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs/releases/side-trails-discovery/local");
const port = 9333;
const base = "http://127.0.0.1:8765";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const chrome = spawn(
    "google-chrome",
    [
      "--headless=new",
      "--disable-gpu",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=/tmp/st-discovery-cdp-${process.pid}`,
      "about:blank"
    ],
    { stdio: "ignore" }
  );
  await sleep(1200);
  try {
    const client = await CDP({ port });
    const { Page, Runtime, Emulation } = client;
    await Page.enable();
    await Runtime.enable();

    async function shot(name) {
      const { data } = await Page.captureScreenshot({ format: "png", fromSurface: true });
      fs.writeFileSync(path.join(outDir, name), Buffer.from(data, "base64"));
      console.log("wrote", name);
    }

    async function dismiss() {
      await Runtime.evaluate({
        expression: `(() => {
          const el = document.getElementById("wds-location-prompt");
          if (el) el.remove();
          document.querySelectorAll('[role="dialog"]').forEach((d) => d.remove());
          return true;
        })()`
      });
      await sleep(400);
    }

    await Emulation.setDeviceMetricsOverride({
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await Page.navigate({ url: `${base}/` });
    await Page.loadEventFired();
    await sleep(2500);
    await dismiss();
    await shot("01b-homepage-desktop-top.png");
    await Runtime.evaluate({
      expression: `document.getElementById("wdb-r-side-trails-title")?.scrollIntoView({block:"center"});`
    });
    await sleep(400);
    await shot("01c-homepage-desktop-side-trails.png");

    await Emulation.setDeviceMetricsOverride({
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await Page.navigate({ url: `${base}/` });
    await Page.loadEventFired();
    await sleep(2500);
    await dismiss();
    await Runtime.evaluate({
      expression: `document.getElementById("wdb-r-side-trails-title")?.scrollIntoView({block:"center"});`
    });
    await sleep(400);
    await shot("02b-homepage-mobile-side-trails.png");

    await Emulation.setDeviceMetricsOverride({
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    for (const [url, name] of [
      [`${base}/side-trails/`, "03-side-trails.png"],
      [`${base}/side-trails/global-signals/`, "04-global-signals-dashboard.png"],
      [`${base}/side-trails/signalterrain/`, "05-signalterrain.png"]
    ]) {
      await Page.navigate({ url });
      await Page.loadEventFired();
      await sleep(2000);
      await shot(name);
    }

    await client.close();
  } finally {
    chrome.kill("SIGKILL");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
