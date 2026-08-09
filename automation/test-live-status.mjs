#!/usr/bin/env node
/**
 * Live data status component — state semantics + adapter contracts.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const failures = [];

function assert(name, cond, detail) {
  if (cond) console.log("PASS", name);
  else {
    failures.push(name + ": " + (detail || "assertion failed"));
    console.log("FAIL", name, "—", detail || "assertion failed");
  }
}

function load(file) {
  const code = fs.readFileSync(path.join(ROOT, file), "utf8");
  vm.runInThisContext(code, { filename: file });
}

global.window = global;
global.document = {
  readyState: "complete",
  querySelector: () => null,
  addEventListener: () => {}
};

load("design-system/js/platform/wds-live-status.js");

const LS = global.WDS && global.WDS.liveStatus;
assert("WDS.liveStatus exported", !!LS);

assert("normalize ok→healthy", LS.normalizeState("ok") === "healthy");
assert("normalize partial→warning", LS.normalizeState("partial") === "warning");
assert("normalize stale→warning", LS.normalizeState("stale") === "warning");
assert("normalize unavailable→offline", LS.normalizeState("unavailable") === "offline");
assert("normalize sample-demo→warning", LS.normalizeState("sample-demo") === "warning");
assert("normalize empty→unknown", LS.normalizeState("") === "unknown");

const articlesOk = LS.fromArticlesHealth(
  { status: "ok", checkedAt: "2026-08-08T12:00:00.000Z", feeds: [{ enabled: true, ok: true }, { enabled: true, ok: true }] },
  { generatedAt: "2026-08-08T12:00:00.000Z", articles: [{ id: "a1" }] }
);
assert("articles healthy", articlesOk.state === "healthy");
assert("articles label", articlesOk.label === "Articles");
assert("articles source present", /RSS/i.test(articlesOk.source || ""));

const articlesPartial = LS.fromArticlesHealth(
  { status: "partial", checkedAt: "2026-08-08T12:00:00.000Z", feeds: [{ enabled: true, ok: true }, { enabled: true, ok: false }] },
  { generatedAt: "2026-08-08T12:00:00.000Z", articles: [{ id: "a1" }] }
);
assert("articles partial→warning", articlesPartial.state === "warning");

const articlesDown = LS.fromArticlesHealth(null, null);
assert("articles missing→offline", articlesDown.state === "offline");

const engine = LS.fromLiveEngine(
  {
    overall: { status: "healthy-degraded", message: "One critical module unavailable", lastSuccessfulRefresh: "2026-08-08T10:00:00.000Z" },
    generatedAt: "2026-08-08T10:00:00.000Z"
  },
  { updatedAt: "2026-08-08T10:00:00.000Z", current: { temperatureF: 70 } },
  { maxAgeMs: 99 * 60 * 60 * 1000, warnAgeMs: 98 * 60 * 60 * 1000 }
);
assert("live engine degraded→warning", engine.state === "warning");

const cyber = LS.fromCyberLive({
  meta: { trustState: "Live", generatedAt: "2026-08-08T01:00:00.000Z" },
  providers: [
    { status: "ok" },
    { status: "ok" },
    { status: "planned" },
    { status: "error", providerName: "X" }
  ],
  records: [{ id: "r1" }]
}, { maxAgeMs: 99 * 60 * 60 * 1000, warnAgeMs: 98 * 60 * 60 * 1000 });
assert("cyber live→healthy", cyber.state === "healthy");
assert("cyber message mentions providers", /providers ok/i.test(cyber.message || ""));

const cyberEmpty = LS.fromCyberLive({
  meta: { trustState: "Live", generatedAt: "2026-08-08T01:00:00.000Z" },
  providers: [],
  records: []
}, { maxAgeMs: 99 * 60 * 60 * 1000 });
assert("cyber empty→warning", cyberEmpty.state === "warning");

const cyberStale = LS.fromCyberLive({
  meta: { trustState: "Live", generatedAt: "2026-07-19T01:47:57.422Z" },
  providers: [{ status: "ok" }],
  records: [{ id: "r1" }]
});
assert("cyber stale Live badge→offline by age", cyberStale.state === "offline");


const gsDemo = LS.fromGlobalSignalsHome({
  mode: "sample-demo",
  modeLabel: "Sample / demo",
  updatedAt: "2026-01-01T00:00:00.000Z",
  honesty: { banner: "Labeled datasets only" }
});
assert("GS sample→warning", gsDemo.state === "warning");
assert("GS sample skips false offline aging", gsDemo.state !== "offline");

const gsMissing = LS.fromGlobalSignalsHome(null);
assert("GS missing→offline", gsMissing.state === "offline");

const client = LS.fromClientFeed({
  id: "sheds-weather",
  label: "Weather",
  source: "Open-Meteo",
  ok: false,
  message: "HTTP 503",
  skipAgePolicy: true
});
assert("client fail→offline", client.state === "offline");

const html = LS.renderHtml({
  id: "test-feed",
  label: "Test feed",
  source: "Unit test",
  state: "healthy",
  updatedAt: "2026-08-08T12:00:00.000Z",
  message: "All good",
  retry: { available: true, label: "Retry", hint: "Try again" },
  skipAgePolicy: true
});
assert("html has role=status", /role="status"/.test(html));
assert("html has data-state", /data-state="healthy"/.test(html));
assert("html has source", /Source · Unit test/.test(html));
assert("html has time", /<time datetime="2026-08-08T12:00:00.000Z">/.test(html));
assert("html has retry button", /data-wds-live-retry="test-feed"/.test(html));
assert("html does not invent certainty", !/guaranteed|100%|definitely live/i.test(html));

const offlineHtml = LS.renderHtml({
  label: "Down",
  source: "Nowhere",
  state: "offline",
  message: "Unavailable — showing nothing invented",
  skipAgePolicy: true
});
assert("offline label", /Offline/.test(offlineHtml));
assert("updated unknown when no timestamp", /Updated time unknown/.test(offlineHtml));

assert("css file exists", fs.existsSync(path.join(ROOT, "design-system/css/wds-live-status.css")));
assert("js registered in wds.js", fs.readFileSync(path.join(ROOT, "design-system/js/wds.js"), "utf8").includes("platform/wds-live-status.js"));
assert("css registered in wds.css", fs.readFileSync(path.join(ROOT, "design-system/css/wds.css"), "utf8").includes("wds-live-status.css"));
assert("owner review exists", fs.existsSync(path.join(ROOT, "docs/quality/live-data-reliability-owner-review.md")));
assert("sources inventory exists", fs.existsSync(path.join(ROOT, "docs/quality/live-data-sources.md")));

const articlesJs = fs.readFileSync(path.join(ROOT, "design-system/js/platform/wds-articles-feed.js"), "utf8");
assert("articles uses liveStatus", /fromArticlesHealth/.test(articlesJs) && /WDS\.liveStatus/.test(articlesJs));

const shedsJs = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/js/sheds-map-app.js"), "utf8");
assert("sheds tracks weatherMeta", /weatherMeta/.test(shedsJs));
assert("sheds tracks tile health", /bindTileHealth|tileMeta/.test(shedsJs));
assert("sheds updateLiveStatusUi", /updateLiveStatusUi/.test(shedsJs));

const stJs = fs.readFileSync(path.join(ROOT, "design-system/js/signalterrain/wds-signalterrain-cyber-live.js"), "utf8");
assert("ST uses fromCyberLive", /fromCyberLive/.test(stJs));

const gsJs = fs.readFileSync(path.join(ROOT, "design-system/js/global-signals/wds-gs-home.js"), "utf8");
assert("GS uses fromGlobalSignalsHome", /fromGlobalSignalsHome/.test(gsJs));

if (failures.length) {
  console.error("\n" + failures.length + " failure(s)");
  process.exit(1);
}
console.log("\nAll live-status tests passed.");
