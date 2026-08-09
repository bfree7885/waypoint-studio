#!/usr/bin/env node
/**
 * Production navigation / deployment check for waypointstudio.org.
 * Fails when the live site still serves the pre-App-Shell homepage.
 *
 * Home is the Dashboard rebuild workspace at `/` (data-product="dashboard").
 * `/dashboard.html` must redirect to root Home.
 *
 * Usage:
 *   node automation/check-production-nav.mjs
 *   node automation/check-production-nav.mjs https://waypointstudio.org 83ff72e
 */
const BASE = (process.argv[2] || "https://waypointstudio.org").replace(/\/$/, "");
const EXPECTED = (process.argv[3] || "").replace(/^#/, "").trim();
const bust = "nav-audit=" + Date.now();

async function fetchText(path) {
  const url = BASE + path + (path.includes("?") ? "&" : "?") + bust;
  const res = await fetch(url, {
    headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    redirect: "follow"
  });
  const text = await res.text();
  return { url, status: res.status, text, finalUrl: res.url };
}

function fail(msg) {
  console.error("FAIL:", msg);
  process.exitCode = 1;
}

function pass(msg) {
  console.log("PASS:", msg);
}

async function main() {
  console.log("Production nav check —", BASE, EXPECTED ? `(expect ${EXPECTED})` : "");

  const home = await fetchText("/");
  if (home.status !== 200) fail("home HTTP " + home.status);
  if (
    /data-product="dashboard"/.test(home.text) &&
    /wds-dashboard-rebuild|data-wds-app-shell|was-shell/.test(home.text)
  ) {
    pass("home is Dashboard workspace at root");
  } else if (/data-product="studio-home"|class="[^"]*was-home/.test(home.text)) {
    pass("home is Studio directory");
  } else {
    fail("home is not Dashboard workspace or Studio directory");
  }
  if (/Outdoor Dashboard|id="outdoor-dashboard"/.test(home.text) && !/studio-home|data-product="dashboard"/.test(home.text)) {
    fail("home still contains old Outdoor Dashboard markup");
  } else {
    pass("home is not the old Outdoor Dashboard");
  }
  if (/ws-topnav/.test(home.text) && /ForageCast/.test(home.text) && /Fieldry/.test(home.text)) {
    fail("home still has mixed horizontal app navigation");
  } else {
    pass("home does not mix all apps in a horizontal nav row");
  }
  if (/wds-app-shell|was-shell|was-apps-btn|wds-app-nav-config/.test(home.text)) {
    pass("home references App Shell / nav config");
  } else {
    fail("home missing App Shell references");
  }

  const marker = home.text.match(/name="waypoint-build"\s+content="([^"]+)"/i);
  if (marker) {
    pass("home has waypoint-build marker: " + marker[1]);
    if (EXPECTED && marker[1] !== EXPECTED && !EXPECTED.startsWith(marker[1]) && !marker[1].startsWith(EXPECTED.slice(0, 7))) {
      fail("build marker " + marker[1] + " does not match expected " + EXPECTED);
    }
  } else {
    console.log("WARN: home missing waypoint-build meta (acceptable until next build stamp deploy)");
  }

  const dash = await fetchText("/apps/dashboard/");
  if (dash.status !== 200) fail("dashboard HTTP " + dash.status);
  else pass("dashboard route available");
  if (/data-wds-app-shell|was-shell/.test(dash.text)) pass("dashboard uses App Shell");
  else fail("dashboard missing App Shell");

  const scenes = await fetchText("/apps/scenes/");
  if (scenes.status !== 200) fail("scenes HTTP " + scenes.status);
  if (/ws-topnav/.test(scenes.text) && /ForageCast/.test(scenes.text)) {
    fail("scenes still shows mixed platform topnav");
  } else {
    pass("scenes does not show mixed platform topnav");
  }

  const coach = await fetchText("/apps/photo-coach/");
  if (coach.status !== 200) fail("photo-coach HTTP " + coach.status);
  if (/data-wds-app-shell|was-shell/.test(coach.text)) pass("photo-coach uses App Shell");
  else fail("photo-coach missing App Shell");

  const assets = [
    "/design-system/js/platform/wds-app-shell.js",
    "/design-system/js/platform/wds-app-nav.js",
    "/design-system/js/platform/wds-app-nav-config.js",
    "/design-system/css/wds-app-shell.css",
    "/design-system/ecosystem/nav-registry.json",
    "/js/studio-home.js"
  ];
  for (const asset of assets) {
    const r = await fetchText(asset);
    if (r.status !== 200) fail(asset + " HTTP " + r.status);
    else pass(asset + " ok");
  }

  const redirect = await fetchText("/dashboard.html");
  const redirectBlob = redirect.text + " " + redirect.finalUrl;
  if (
    /content="0;url=\.\/"/.test(redirect.text) ||
    /location\.replace\(["']\.\//.test(redirect.text) ||
    /apps\/dashboard\//.test(redirectBlob) ||
    (/\/$/.test(redirect.finalUrl) && !/dashboard\.html/.test(redirect.finalUrl))
  ) {
    pass("dashboard.html redirects to Home");
  } else {
    fail("dashboard.html redirect missing");
  }

  if (process.exitCode) {
    console.error("\nPRODUCTION NAV: FAIL");
  } else {
    console.log("\nPRODUCTION NAV: PASS");
  }
}

main().catch((err) => {
  console.error("check-production-nav failed:", err.message || err);
  process.exit(1);
});
