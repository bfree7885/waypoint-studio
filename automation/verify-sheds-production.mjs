#!/usr/bin/env node
/**
 * Sheds production surface verification (campaign-scoped).
 * Honest about what is live — does not require origin/main SHA parity.
 *
 * Usage: node automation/verify-sheds-production.mjs [baseUrl]
 */
const BASE = (process.argv[2] || "https://waypointstudio.org").replace(/\/$/, "");
const bust = "v=" + Date.now();
let failed = 0;

function fail(msg) {
  failed += 1;
  console.error("FAIL:", msg);
}

function pass(msg) {
  console.log("PASS:", msg);
}

async function get(path) {
  const url = BASE + path + (path.includes("?") ? "&" : "?") + bust;
  const res = await fetch(url, { headers: { "Cache-Control": "no-cache" } });
  const text = await res.text();
  return { status: res.status, text, url };
}

async function main() {
  console.log("Verify Sheds production —", BASE);

  const redirect = await get("/sheds/");
  if (redirect.status !== 200) fail("/sheds/ HTTP " + redirect.status);
  else if (!/shed-hunting\/map|Redirecting|today/i.test(redirect.text)) {
    fail("/sheds/ missing map redirect");
  } else pass("/sheds/ redirects toward map");

  const map = await get("/apps/shed-hunting/map/");
  if (map.status !== 200) fail("map HTTP " + map.status);
  else {
    pass("map HTTP 200");
    if (!/name=["']viewport["']/i.test(map.text)) fail("map missing viewport");
    else pass("map has viewport");
    if (!/id=["']sheds-map["']/.test(map.text)) fail("map missing #sheds-map");
    else pass("map shell present");
    if (!/Guidance,\s*not certainty|not a guarantee|never a guarantee/i.test(map.text)) {
      fail("map missing guidance-not-certainty honesty copy");
    } else pass("guidance honesty present");
    if (/lorem ipsum|placeholder text|TODO:\s*(replace|implement)/i.test(map.text)) {
      fail("map has placeholder/TODO UI copy");
    } else pass("no placeholder TODO UI in map HTML");
    if (/tile\.openstreetmap\.org/i.test(map.text)) {
      fail("map HTML references OSMF public tiles");
    } else pass("no OSMF public tile URL in map HTML");

    const hasToday = /Today.?s Search|todays-search|WaypointShedsTodaysSearch/i.test(map.text);
    if (hasToday) pass("Today’s Search present on production");
    else fail("Today’s Search missing on production map");

    const marker = (map.text.match(/name=["']waypoint-build["']\s+content=["']([^"']+)["']/i) || [])[1];
    if (!marker) fail("map missing waypoint-build marker");
    else pass("map build marker " + marker);
  }

  const privacy = await get("/privacy.html");
  if (privacy.status !== 200) fail("privacy.html HTTP " + privacy.status);
  else pass("privacy.html reachable");

  if (failed) {
    console.error("\nSHEDS PRODUCTION: FAIL (" + failed + ")");
    process.exitCode = 1;
  } else {
    console.log("\nSHEDS PRODUCTION: PASS");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
