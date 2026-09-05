#!/usr/bin/env node
/**
 * SignalTerrain SOTA V0.9 — hosting inspection / non-deploy gate.
 * Run: node automation/test-signalterrain-sota-v0-9.mjs
 *
 * V0.9 did not ship a live field-test URL. These tests lock the inspected
 * hosting facts so CI cannot silently gain a production Pages branch deploy.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const failures = [];

function assert(name, cond, detail) {
  if (cond) {
    passed += 1;
    console.log("PASS", name);
  } else {
    failures.push(name + (detail ? ": " + detail : ""));
    console.error("FAIL", name, detail || "");
  }
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const pages = read(".github/workflows/pages.yml");
assert("Pages still deploys from main only", /branches:\s*\[main\]/.test(pages));
assert("Pages not triggered by feature branches", !/summit-signal|cursor\//.test(pages));
assert("Pages artifact is repo root", /upload-pages-artifact[\s\S]*path: \./.test(pages));
assert("Pages production URL is waypointstudio.org", /WAYPOINT_PROD_URL: https:\/\/waypointstudio\.org/.test(pages));
assert("no SignalTerrain Pages workflow", !fs.existsSync(path.join(ROOT, ".github/workflows/signalterrain-sota-pages.yml")));

const cname = read("CNAME");
assert("CNAME remains waypointstudio.org", /^\s*waypointstudio\.org\s*$/m.test(cname));
assert("CNAME is not shedhunting.org", !/shedhunting\.org/.test(cname));

const docs = read("docs/signal-terrain/V0.9.md");
assert(
  "V0.9 docs required launch quote",
  /SignalTerrain V0\.9 is a field-test deployment, not a public product launch\./.test(docs)
);
assert(
  "V0.9 docs unlisted not access-controlled",
  /The field-test URL is unlisted, not access-controlled\./.test(docs)
);
assert("V0.9 not deployed", /Not deployed/.test(docs) && /No V0\.9 deployment occurred/.test(docs));
assert("V0.9 records Pages main-only", /push.*main/i.test(docs) && /blocker/i.test(docs));
assert("V0.9 does not claim a live URL as shipped", !/FIELD-TEST URL \(LIVE\)/.test(docs));
assert("V0.9 does not use Sheds host", !/publish to sheds-site|reuse sheds-site/i.test(docs));

const html = read("apps/summit-signal/index.html");
assert("app kicker remains V0.8 until a real host exists", /V0\.8 · SOTA/.test(html));
assert("unpublished noindex", /noindex/i.test(html));
assert("html does not load Sheds or cyber ST", !/shed-hunting|wds-signalterrain|design-system\/signalterrain/.test(html));

assert("robots disallows summit-signal on this branch", /Disallow: \/apps\/summit-signal\//.test(read("robots.txt")));
assert("sitemap omits summit-signal", !/summit-signal/.test(read("sitemap.xml")));
assert("homepage omits SignalTerrain", !/SignalTerrain/.test(read("index.html")));
assert("cyber redirect intact", /location\.replace/.test(read("apps/signalterrain/index.html")));
assert("Sheds map untouched", !/ss-start-open-maps|SignalTerrainSotaMapApp/.test(read("apps/shed-hunting/js/sheds-map-app.js")));
assert("shedhunting-host workflow untouched by V0.9", /Publish Shed Hunting host/.test(read(".github/workflows/shedhunting-host.yml")));

const appJs = read("apps/summit-signal/js/ss-map-app.js");
assert("live SOTA still opt-in", /live=1/.test(read("apps/summit-signal/js/ss-sota-provider.js")));
assert("Valhalla live still opt-in", /route=live=1/.test(read("apps/summit-signal/js/ss-route-provider.js")));
assert("no service worker added", !/serviceWorker/.test(appJs));
assert("map app does not fetch SOTA API", !/fetch\(\s*["']https:\/\/api2\.sota\.org\.uk/.test(appJs));

if (failures.length) {
  console.error("\nFailed " + failures.length + ":\n" + failures.join("\n"));
  process.exit(1);
}
console.log("\nAll SignalTerrain SOTA V0.9 contract tests passed (" + passed + ").");
