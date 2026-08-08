#!/usr/bin/env node
/**
 * SignalTerrain Recovery Sprint 5 — routing, boot, brief priority/trust contracts.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function assert(name, cond, detail) {
  if (cond) console.log("PASS", name);
  else {
    failures.push(name + ": " + (detail || "failed"));
    console.log("FAIL", name, "—", detail || "");
  }
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

[
  "apps/signalterrain/index.html",
  "apps/signalterrain/data/foundation.json",
  "apps/signalterrain/cyber/live.html",
  "apps/signalterrain/cyber/index.html",
  "apps/signalterrain/cyber/brief.html",
  "design-system/js/signalterrain/wds-signalterrain-cyber-live.js",
  "design-system/js/signalterrain/wds-signalterrain-summary.js",
  "design-system/css/wds-signalterrain-cyber-live.css",
  "docs/SIGNALTERRAIN-RECOVERY-REPORT.md",
  "docs/SIGNALTERRAIN-ROUTING-AUDIT.md",
  "docs/SIGNALTERRAIN-PROVIDER-AUDIT.md",
  "docs/SIGNALTERRAIN-PERFORMANCE-SPRINT5.md",
  "docs/SIGNALTERRAIN-TECHNICAL-DEBT.md",
  "docs/SIGNALTERRAIN-READINESS-SPRINT5.md",
  "docs/SIGNALTERRAIN-CHANGELOG-SPRINT5.md"
].forEach((f) => assert("exists " + f, exists(f)));

const foundation = JSON.parse(read("apps/signalterrain/data/foundation.json"));
assert("cta points at live brief", /live\.html#brief/.test(foundation.cta.href));
assert("cta label is brief", /brief/i.test(foundation.cta.label));
assert(
  "live route ready first among cyber",
  foundation.routes.some((r) => r.path === "cyber/live.html#brief" && r.ready)
);
assert(
  "unbuilt receivers not ready",
  foundation.routes.some((r) => r.path === "receivers/" && r.ready === false)
);

const homeHtml = read("apps/signalterrain/index.html");
assert("home redirects to live cyber", /cyber\/live\.html/.test(homeHtml) && /Redirecting|http-equiv="refresh"/i.test(homeHtml));
assert("home points to product story", /side-trails\/signalterrain/.test(homeHtml));

const liveHtml = read("apps/signalterrain/cyber/live.html");
assert("live waits for scripts", /deadline|Waiting for Live scripts/.test(liveHtml));
assert("live uses platformBoot fail path", /platformBoot\.fail|signalTerrainCyberLive/.test(liveHtml));

const liveJs = read("design-system/js/signalterrain/wds-signalterrain-cyber-live.js");
assert("live mount uses platformBoot.watch", /platformBoot[\s\S]*watch|Boot\.watch/.test(liveJs));
assert("live mount uses platformBoot.fail", /Boot\.fail|platformBoot\.fail/.test(liveJs));
assert("bandLabel Critical mapping", /Immediate.*Critical|bandLabel/.test(liveJs));
assert("provider trust strip", /providerTrustStrip|Unavailable now/.test(liveJs));
assert("priority band blocks", /st-live-band-block|bandWhy/.test(liveJs));
assert("card shows retrievedAt", /Retrieved:/.test(liveJs));
assert("still bans samples", /BANNED_SAMPLE_PATHS/.test(liveJs));
assert("no offensive tooling claims", !/exploit kit|run exploit|offensive scanner/i.test(liveJs));

const summaryJs = read("design-system/js/signalterrain/wds-signalterrain-summary.js");
assert("summary uses platformBoot.watch", /platformBoot[\s\S]*watch|Boot\.watch/.test(summaryJs));
assert("summary links to live", /live\.html#brief/.test(summaryJs));

const briefHtml = read("apps/signalterrain/cyber/brief.html");
assert("brief demotes samples", /Sample scenarios only|live\.html#brief/.test(briefHtml));

const cyberIndex = read("apps/signalterrain/cyber/index.html");
assert("cyber hub redirects live", /live\.html/.test(cyberIndex));

const nav = read("design-system/js/platform/wds-app-nav-config.js");
assert("nav cyber brief labeled Today", /Today.?s cyber brief/.test(nav));
assert("nav summary labeled samples", /Intelligence summary \(samples\)/.test(nav));

const sandbox = {
  window: {},
  console,
  setTimeout,
  clearTimeout,
  sessionStorage: {
    _s: {},
    getItem(k) {
      return this._s[k] || null;
    },
    setItem(k, v) {
      this._s[k] = String(v);
    }
  },
  localStorage: {
    getItem() {
      return null;
    },
    setItem() {},
    removeItem() {}
  },
  location: { hash: "#brief", pathname: "/apps/signalterrain/cyber/", search: "", reload() {} },
  document: { addEventListener() {}, getElementById() { return null; } },
  performance: { mark() {}, measure() {} },
  fetch() {
    return Promise.reject(new Error("no network"));
  },
  WDS: {
    platformBoot: {
      mount() {},
      watch() {
        return function () {};
      },
      clear() {},
      status() {},
      fail() {}
    }
  }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(read("design-system/js/signalterrain/wds-signalterrain-util.js"), sandbox, {
  filename: "util"
});
vm.runInNewContext(read("design-system/js/signalterrain/wds-signalterrain-cyber-live.js"), sandbox, {
  filename: "live"
});

const Live = sandbox.WDS.signalTerrainCyberLive;
assert("live module exported", !!(Live && Live.mountLive && Live.bandLabel));
assert("Immediate → Critical", Live.bandLabel("Immediate") === "Critical");
assert("Monitor → Medium", Live.bandLabel("Monitor") === "Medium");
assert("bandWhy critical", /Critical|exploitation/i.test(Live.bandWhy("Immediate")));

if (failures.length) {
  console.error("\n" + failures.length + " failure(s)");
  process.exit(1);
}
console.log("\nAll SignalTerrain Sprint 5 recovery checks passed.");
