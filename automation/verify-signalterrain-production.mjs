#!/usr/bin/env node
/**
 * SignalTerrain production surface verification (campaign-scoped).
 * Honest about live vs sample — fails if "Live" trust is paired with stale artifact.
 *
 * Usage: node automation/verify-signalterrain-production.mjs [baseUrl]
 */
const BASE = (process.argv[2] || "https://waypointstudio.org").replace(/\/$/, "");
const bust = "v=" + Date.now();
const MAX_LIVE_AGE_MS = 48 * 60 * 60 * 1000;
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
    if (!/cyber\/live\.html/i.test(home.text)) fail("home missing live brief CTA");
    else pass("home links live brief");
    if (/lorem ipsum|placeholder text|TODO:\s*(replace|implement)/i.test(home.text)) {
      fail("home has placeholder/TODO UI copy");
    } else pass("no placeholder TODO UI on home");
    if (/topics\.html|graph\.html|summary\.html/i.test(home.text)) {
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
    if (!/effectiveTrust|LIVE_MAX_AGE|Stale/i.test(live.text)) {
      // Script is external — fetch it
      const js = await get("/design-system/js/signalterrain/wds-signalterrain-cyber-live.js");
      if (js.status !== 200) fail("live runtime JS HTTP " + js.status);
      else if (!/effectiveTrust/.test(js.text) || !/Stale/.test(js.text)) {
        fail("live runtime missing effectiveTrust/Stale downgrade");
      } else pass("live runtime has freshness honesty");
    }
  }

  const artifact = await get("/data/cyber/live.json");
  if (artifact.status !== 200) fail("live.json HTTP " + artifact.status);
  else {
    pass("live.json HTTP 200");
    try {
      const doc = JSON.parse(artifact.text);
      const gen = doc?.meta?.generatedAt;
      const trust = doc?.meta?.trustState;
      if (!gen) fail("live.json missing meta.generatedAt");
      else pass("live.json has generatedAt " + String(gen).slice(0, 19));
      if (!trust) fail("live.json missing meta.trustState");
      else pass("live.json trustState=" + trust);
      const age = Date.now() - Date.parse(gen);
      if (!Number.isFinite(age)) fail("live.json generatedAt not parseable");
      else if (trust === "Live" && age > MAX_LIVE_AGE_MS) {
        fail(
          "Production claims Live but artifact is " +
            Math.round(age / 3600000) +
            "h old (max 48h). Refresh the cyber live engine and redeploy data/cyber/live.json."
        );
      } else if (trust === "Live") {
        pass("Live artifact age OK (" + Math.round(age / 3600000) + "h)");
      } else {
        pass("Non-Live trustState accepted with age " + Math.round(age / 3600000) + "h");
      }
      if (!Array.isArray(doc.records) || !doc.records.length) fail("live.json has no records");
      else pass("live.json records=" + doc.records.length);
    } catch (e) {
      fail("live.json parse error: " + e.message);
    }
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
