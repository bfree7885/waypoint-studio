#!/usr/bin/env node
/**
 * SignalTerrain SOTA V0.9 — isolated field-test host gate.
 * Run: node automation/test-signalterrain-sota-v0-9.mjs
 *
 * Locks: companion github.io host, no Studio Pages overwrite, no Sheds host,
 * unpublished posture, fixture-only defaults, V0.9 build stamp.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  FIELD_TEST_URL,
  HOST_REPO
} from "../scripts/prepare-signalterrain-field-test-host.mjs";

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
assert("no SignalTerrain Pages workflow on Studio", !fs.existsSync(path.join(ROOT, ".github/workflows/signalterrain-sota-pages.yml")));

const fieldWf = read(".github/workflows/signalterrain-field-test-host.yml");
assert("field-test workflow is dispatch-only", /workflow_dispatch:/.test(fieldWf) && !/branches:\s*\[main\]/.test(fieldWf));
assert("field-test workflow does not use deploy-pages", !/deploy-pages|upload-pages-artifact/.test(fieldWf));
assert("field-test workflow targets waypoint-studio-site", /bfree7885\/waypoint-studio-site/.test(fieldWf));
assert("field-test workflow does not publish sheds-site", !/sheds-site/.test(fieldWf));
assert("field-test workflow does not set waypointstudio.org", !/waypointstudio\.org/.test(fieldWf));

const cname = read("CNAME");
assert("CNAME remains waypointstudio.org", /^\s*waypointstudio\.org\s*$/m.test(cname));
assert("CNAME is not shedhunting.org", !/shedhunting\.org/.test(cname));

const prepare = read("scripts/prepare-signalterrain-field-test-host.mjs");
const publish = read("scripts/publish-signalterrain-field-test-host.mjs");
assert("prepare copies only summit-signal", /apps\/summit-signal/.test(prepare) && /copyDir\(SRC, APP_DIST\)/.test(prepare));
assert("prepare forbids CNAME", /must not emit a CNAME/.test(prepare));
assert("publish refuses sheds-site", /Refusing to publish SignalTerrain field-test to sheds-site/.test(publish));
assert("publish refuses Studio production repo", /waypoint-studio production/.test(publish));
assert("publish does not force-push main", /"HEAD:main"/.test(publish) && !/--force/.test(publish));
assert("canonical field-test URL", FIELD_TEST_URL === "https://bfree7885.github.io/waypoint-studio-site/apps/summit-signal/");
assert("canonical host repo", HOST_REPO === "bfree7885/waypoint-studio-site");

const docs = read("docs/signal-terrain/V0.9.md");
assert(
  "V0.9 docs required launch quote",
  /SignalTerrain V0\.9 is a field-test deployment, not a public product launch\./.test(docs)
);
assert(
  "V0.9 docs unlisted not access-controlled",
  /The field-test URL is unlisted, not access-controlled\./.test(docs)
);
assert("V0.9 records intended companion URL", docs.includes("https://bfree7885.github.io/waypoint-studio-site/apps/summit-signal/"));
assert("V0.9 does not claim a live URL as shipped", !/FIELD-TEST URL \(LIVE\)/.test(docs));
assert("V0.9 records write blocker", /contents:write/.test(docs) && /sheds-site/.test(docs) && /403/.test(docs));
assert("V0.9 does not use Sheds host", !/publish to sheds-site|reuse sheds-site/i.test(docs));
assert("V0.9 does not require main merge", /Do not merge to `main`/.test(docs) || /Do not merge to main/.test(docs));

const html = read("apps/summit-signal/index.html");
assert("app kicker is V0.9 field-test", /V0\.9 · unlisted field-test/.test(html));
assert("unpublished noindex", /noindex/i.test(html));
assert("build meta exists", /name="signalterrain-build"/.test(html));
assert("build stamp exists", /id="ss-field-test-build"/.test(html) && /SignalTerrain V0\.9/.test(html));
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

const prep = spawnSync("node", ["scripts/prepare-signalterrain-field-test-host.mjs"], {
  cwd: ROOT,
  encoding: "utf8",
  env: Object.assign({}, process.env, { SIGNALTERRAIN_FIELD_TEST_SHA: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" })
});
assert("prepare exits 0", prep.status === 0, (prep.stderr || prep.stdout || "").slice(0, 500));

const distRoot = path.join(ROOT, "dist/signalterrain-field-test");
const distApp = path.join(distRoot, "apps/summit-signal/index.html");
assert("dist app exists", fs.existsSync(distApp));
const distHtml = fs.readFileSync(distApp, "utf8");
assert("dist stamps SHA", /content="V0\.9 aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"/.test(distHtml));
assert("dist stamps short SHA", /SignalTerrain V0\.9 · aaaaaaa/.test(distHtml));
assert("dist noindex", /noindex, nofollow/.test(distHtml));
assert("dist has no CNAME", !fs.existsSync(path.join(distRoot, "CNAME")));
assert("dist robots disallow all", /Disallow: \//.test(fs.readFileSync(path.join(distRoot, "robots.txt"), "utf8")));
assert("dist omits Sheds", !fs.existsSync(path.join(distRoot, "apps/shed-hunting")) && !fs.existsSync(path.join(distRoot, "map")));
assert("dist omits cyber SignalTerrain", !fs.existsSync(path.join(distRoot, "apps/signalterrain")));
assert("dist omits Studio homepage product nav", !/id="was-global"|data-wds-app="dashboard"/.test(fs.readFileSync(path.join(distRoot, "index.html"), "utf8")));
assert("dist keeps Leaflet vendor", fs.existsSync(path.join(distRoot, "apps/summit-signal/vendor/leaflet/leaflet.js")));
assert(
  "dist keeps Slide/Hunter fixtures",
  fs.existsSync(path.join(distRoot, "apps/summit-signal/data/st-sota-route-w2-gc-001-slide-parking.json")) &&
    fs.existsSync(path.join(distRoot, "apps/summit-signal/data/st-sota-route-w2-gc-002-becker-hollow.json"))
);

if (failures.length) {
  console.error("\nFailed " + failures.length + ":\n" + failures.join("\n"));
  process.exit(1);
}
console.log("\nAll SignalTerrain SOTA V0.9 contract tests passed (" + passed + ").");
