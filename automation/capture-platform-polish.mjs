#!/usr/bin/env node
/**
 * Capture Dashboard / Scenes / Sheds screenshots for platform polish review.
 * Usage: node automation/capture-platform-polish.mjs [before|after] [baseUrl]
 *
 * Prefer Chrome headless --screenshot (no ws dependency):
 *   google-chrome --headless=new --window-size=1440,900 --screenshot=out.png URL
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PHASE = process.argv[2] === "after" ? "after" : "before";
const BASE = (process.argv[3] || "http://127.0.0.1:8767").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const OUT = path.join(ROOT, "docs/platform/screenshots", PHASE);

const PAGES = [
  ["dashboard", "/apps/dashboard/"],
  ["scenes", "/apps/scenes/"],
  ["sheds", "/apps/shed-hunting/"],
  ["sheds-map", "/apps/shed-hunting/map/"]
];

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "ignore" });
    p.on("error", reject);
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))));
  });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, route] of PAGES) {
    const file = path.join(OUT, `${name}.png`);
    await run(CHROME, [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--window-size=1440,900",
      `--screenshot=${file}`,
      `${BASE}${route}`
    ]);
    console.log(`wrote ${PHASE}/${name}.png`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
