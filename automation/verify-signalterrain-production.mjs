#!/usr/bin/env node
/**
 * SignalTerrain production surface verification (campaign-scoped).
 * Honest about live vs sample — does not invent RF claims.
 *
 * Usage: node automation/verify-signalterrain-production.mjs [baseUrl]
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
  console.log("Verify SignalTerrain production —", BASE);

  const home = await get("/apps/signalterrain/");
  if (home.status !== 200) fail("SignalTerrain home HTTP " + home.status);
  else {
    pass("home HTTP 200");
    if (!/name=["']viewport["']/i.test(home.text)) fail("home missing viewport");
    else pass("home has viewport");
    if (!/SignalTerrain/i.test(home.text)) fail("home missing SignalTerrain brand");
    else pass("home brand present");
    if (/lorem ipsum|placeholder text|TODO:\s*(replace|implement)/i.test(home.text)) {
      fail("home has placeholder/TODO UI copy");
    } else pass("no placeholder TODO UI on home");
    // Honest sample labeling on non-live routes
    if (/topics\.html|graph\.html|summary\.html/i.test(home.text) && /sample/i.test(home.text)) {
      pass("sample routes disclosed on home");
    } else if (/topics\.html/i.test(home.text)) {
      // Prefer explicit sample labeling when linking sample surfaces
      if (!/\(samples\)|sample/i.test(home.text)) {
        fail("home links sample surfaces without sample disclosure");
      } else pass("sample disclosure present for sample links");
    }
  }

  const live = await get("/apps/signalterrain/cyber/live.html");
  if (live.status !== 200) fail("cyber live HTTP " + live.status);
  else {
    pass("cyber live HTTP 200");
    if (!/name=["']viewport["']/i.test(live.text)) fail("live missing viewport");
    else pass("live has viewport");
    if (/data\/cyber\/samples|mock.?live|fake.?live/i.test(live.text)) {
      fail("live HTML references sample/mock live paths");
    } else pass("live HTML does not reference sample/mock live paths");
    if (/live\.json|data\/cyber\/live/i.test(live.text)) pass("live artifact path referenced");
    else fail("live HTML missing live.json / data/cyber/live reference");
  }

  const privacy = await get("/privacy.html");
  if (privacy.status !== 200) fail("privacy.html HTTP " + privacy.status);
  else pass("privacy.html reachable");

  if (failed) {
    console.error("\nSIGNALTERRAIN PRODUCTION: FAIL (" + failed + ")");
    process.exitCode = 1;
  } else {
    console.log("\nSIGNALTERRAIN PRODUCTION: PASS");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
