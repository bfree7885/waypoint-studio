#!/usr/bin/env node
/**
 * Live HTTP smoke for the unlisted SignalTerrain V0.9 field-test host.
 * Not part of required CI (no live host dependency).
 *
 *   SIGNALTERRAIN_FIELD_TEST_URL=https://bfree7885.github.io/waypoint-studio-site/apps/summit-signal/ \
 *     node automation/verify-signalterrain-field-test-host.mjs
 */
import { FIELD_TEST_URL } from "../scripts/prepare-signalterrain-field-test-host.mjs";

const BASE = (process.env.SIGNALTERRAIN_FIELD_TEST_URL || FIELD_TEST_URL).replace(/\/?$/, "/");
const ORIGIN = new URL(BASE).origin;
const EXPECTED_SHA = (process.env.SIGNALTERRAIN_FIELD_TEST_SHA || "").toLowerCase();
const failures = [];
let passed = 0;

function assert(name, cond, detail) {
  if (cond) {
    passed += 1;
    console.log("PASS", name);
  } else {
    failures.push(name + (detail ? ": " + detail : ""));
    console.error("FAIL", name, detail || "");
  }
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow", cache: "no-store" });
  const body = await res.text();
  return { res, body };
}

const assets = [
  { name: "app document", url: BASE, type: "html" },
  { name: "CSS", url: BASE + "css/summit-signal.css" },
  { name: "Leaflet CSS", url: BASE + "vendor/leaflet/leaflet.css" },
  { name: "Leaflet JS", url: BASE + "vendor/leaflet/leaflet.js" },
  { name: "map app JS", url: BASE + "js/ss-map-app.js" },
  { name: "summit fixture", url: BASE + "data/ss-summits-w2-gc.json" },
  { name: "Slide access fixture", url: BASE + "data/st-sota-access-w2-gc-001.json" },
  { name: "Hunter access fixture", url: BASE + "data/st-sota-access-w2-gc-002.json" },
  { name: "Slide parking route", url: BASE + "data/st-sota-route-w2-gc-001-slide-parking.json" },
  { name: "Hunter route", url: BASE + "data/st-sota-route-w2-gc-002-becker-hollow.json" },
  { name: "Slide DEM", url: BASE + "data/st-sota-az-dem-w2-gc-001.json" },
  { name: "Hunter DEM", url: BASE + "data/st-sota-az-dem-w2-gc-002.json" },
  { name: "build json", url: BASE + "data/st-field-test-build.json" }
];

const htmlDoc = await fetchText(BASE);
assert("HTTPS", BASE.startsWith("https://"));
assert("HTTP 200 app document", htmlDoc.res.status === 200, String(htmlDoc.res.status));
assert("title", /<title>SignalTerrain — Waypoint<\/title>/.test(htmlDoc.body));
assert("noindex", /name="robots" content="noindex, nofollow"/.test(htmlDoc.body));
assert("V0.9 kicker", /V0\.9 · unlisted field-test/.test(htmlDoc.body));
assert("build stamp present", /id="ss-field-test-build"/.test(htmlDoc.body) && /SignalTerrain V0\.9/.test(htmlDoc.body));
assert("not mixed Leaflet CDN", !/unpkg\.com\/leaflet|cdnjs.*leaflet/.test(htmlDoc.body));
assert("relative Leaflet", /vendor\/leaflet\/leaflet\.js/.test(htmlDoc.body));
if (EXPECTED_SHA) {
  assert(
    "deployed SHA in meta",
    htmlDoc.body.includes('content="V0.9 ' + EXPECTED_SHA + '"') ||
      htmlDoc.body.includes("SignalTerrain V0.9 · " + EXPECTED_SHA.slice(0, 7)),
    "expected " + EXPECTED_SHA
  );
}

const robots = await fetchText(ORIGIN + "/waypoint-studio-site/robots.txt");
assert("robots HTTP 200", robots.res.status === 200, String(robots.res.status));
assert("robots Disallow /", /Disallow:\s*\//.test(robots.body));

const root = await fetchText(ORIGIN + "/waypoint-studio-site/");
assert("host root noindex", /noindex/.test(root.body));
assert("host root is not Studio homepage", !/ForageCast|Today Outside|Waypoint Studio</.test(root.body));

for (const asset of assets) {
  const got = await fetchText(asset.url);
  assert(asset.name + " HTTP 200", got.res.status === 200, asset.url + " " + got.res.status);
  if (asset.type === "html") continue;
  if (asset.url.endsWith(".json")) {
    try {
      JSON.parse(got.body);
      assert(asset.name + " JSON", true);
    } catch (e) {
      assert(asset.name + " JSON", false, String(e.message || e));
    }
  }
}

assert("not waypointstudio.org", !/waypointstudio\.org/.test(BASE));
assert("not shedhunting.org", !/shedhunting\.org/.test(BASE));
assert("path remains /apps/summit-signal/", /\/apps\/summit-signal\/$/.test(BASE));

if (failures.length) {
  console.error("\nFailed " + failures.length + ":\n" + failures.join("\n"));
  process.exit(1);
}
console.log("\nSignalTerrain V0.9 live host smoke passed (" + passed + ").");
console.log("URL", BASE);
