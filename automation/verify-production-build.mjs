#!/usr/bin/env node
/**
 * Verify production build marker matches origin/main (or an expected SHA).
 * Usage:
 *   node automation/verify-production-build.mjs [baseUrl] [expectedSha]
 */
import { execSync } from "child_process";

const BASE = (process.argv[2] || "https://waypointstudio.org").replace(/\/$/, "");
const expectedArg = (process.argv[3] || "").trim();
const bust = "v=" + Date.now();

function git(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

async function get(path) {
  const res = await fetch(BASE + path + (path.includes("?") ? "&" : "?") + bust, {
    headers: { "Cache-Control": "no-cache" }
  });
  const text = await res.text();
  return { status: res.status, text };
}

function fail(msg) {
  console.error("FAIL:", msg);
  process.exitCode = 1;
}

function pass(msg) {
  console.log("PASS:", msg);
}

async function main() {
  const origin = git("git rev-parse origin/main") || git("git rev-parse HEAD");
  const expectedFull = expectedArg || origin;
  const expectedShort = expectedFull.slice(0, 7);
  console.log("Verify production build —", BASE, "expect", expectedShort);

  const home = await get("/");
  const marker = (home.text.match(/name="waypoint-build"\s+content="([^"]+)"/i) || [])[1];
  if (!marker) fail("missing waypoint-build meta");
  else if (marker !== expectedShort && !expectedFull.startsWith(marker)) {
    fail(`marker ${marker} != expected ${expectedShort}`);
  } else pass("HTML marker " + marker);

  const infoRes = await get("/data/build-info.json");
  if (infoRes.status !== 200) fail("build-info.json HTTP " + infoRes.status);
  else {
    const info = JSON.parse(infoRes.text);
    if (info.shortCommit !== expectedShort && info.commit !== expectedFull && !String(info.commit || "").startsWith(expectedShort)) {
      fail("build-info mismatch " + JSON.stringify(info));
    } else pass("build-info " + (info.shortCommit || info.commit) + " source=" + info.source);
    if (marker && info.shortCommit && marker !== info.shortCommit && marker !== String(info.commit || "").slice(0, 7)) {
      fail("marker and build-info diverge");
    } else if (marker && info.shortCommit) pass("marker matches build-info");
  }

  if (!/studio-home|was-home/.test(home.text)) fail("Studio home missing");
  else pass("Studio home present");

  const dash = await get("/apps/dashboard/");
  if (!/was-shell|data-wds-app-shell|was-apps/.test(dash.text)) fail("Dashboard App Shell missing");
  else pass("Dashboard App Shell present");

  if (process.exitCode) console.error("\nPRODUCTION BUILD: FAIL");
  else console.log("\nPRODUCTION BUILD: PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
