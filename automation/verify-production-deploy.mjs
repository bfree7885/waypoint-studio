#!/usr/bin/env node
/**
 * Verify live production fingerprint and critical routes.
 *
 * Usage:
 *   EXPECTED_SHA=$(git rev-parse HEAD) node automation/verify-production-deploy.mjs
 *   WAYPOINT_PROD_URL=https://waypointstudio.org EXPECTED_SHORT=abc1234 node automation/verify-production-deploy.mjs
 *
 * Exit 0 when production meta waypoint-build matches expected short SHA
 * and all critical routes return HTTP 200.
 */
import { execSync } from "child_process";

const PROD = (process.env.WAYPOINT_PROD_URL || "https://waypointstudio.org").replace(/\/$/, "");
const RETRIES = Number(process.env.WAYPOINT_VERIFY_RETRIES || 12);
const DELAY_MS = Number(process.env.WAYPOINT_VERIFY_DELAY_MS || 15000);

function resolveExpectedShort() {
  if (process.env.EXPECTED_SHORT) return process.env.EXPECTED_SHORT.trim().slice(0, 7);
  if (process.env.EXPECTED_SHA) return process.env.EXPECTED_SHA.trim().slice(0, 7);
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.trim().slice(0, 7);
  try {
    return execSync("git rev-parse --short=7 HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

const CRITICAL = [
  "/",
  "/contact.html",
  "/support.html",
  "/apps/dashboard/",
  "/apps/scenes/",
  "/apps/shed-hunting/",
  "/apps/foragecast/",
  "/apps/fieldry/",
  "/apps/steepleaf/",
  "/apps/steepleaf/explore/",
  "/apps/savant-sommelier/",
  "/apps/waypoint-volunteer/",
  "/apps/landscape-interpretation/",
  "/apps/landscape-interpretation/learn.html",
  "/map/",
];

async function fetchText(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "WaypointStudio-DeployVerify/1.0" },
  });
  const text = await res.text();
  return { status: res.status, url: res.url, text };
}

function extractBuild(html) {
  const m = html.match(/name=["']waypoint-build["']\s+content=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function once(expected) {
  const home = await fetchText(`${PROD}/`);
  const build = extractBuild(home.text);
  const routeResults = [];
  for (const path of CRITICAL) {
    const r = await fetchText(`${PROD}${path}`);
    routeResults.push({ path, status: r.status, ok: r.status >= 200 && r.status < 400 });
  }
  const failed = routeResults.filter((r) => !r.ok);
  const buildOk = Boolean(expected) && build === expected;
  return { build, buildOk, homeStatus: home.status, failed, routeResults };
}

async function main() {
  const expected = resolveExpectedShort();
  if (!expected) {
    console.error("No EXPECTED_SHA / EXPECTED_SHORT / git HEAD available");
    process.exit(2);
  }
  console.log(`Verifying ${PROD} for build ${expected} (retries=${RETRIES})`);

  let last = null;
  for (let i = 1; i <= RETRIES; i++) {
    last = await once(expected);
    console.log(
      `attempt ${i}/${RETRIES}: home=${last.homeStatus} build=${last.build} match=${last.buildOk} failedRoutes=${last.failed.length}`,
    );
    if (last.buildOk && last.failed.length === 0) {
      console.log("OK — production fingerprint and critical routes verified.");
      process.exit(0);
    }
    if (i < RETRIES) await sleep(DELAY_MS);
  }

  console.error("FAIL — production did not converge to expected release.");
  console.error(JSON.stringify(last, null, 2));
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
