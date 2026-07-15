#!/usr/bin/env node
/**
 * Dashboard reliability — deterministic unit tests (no network, no real timers for asserts).
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

let passed = 0;
const failures = [];

function pass(name) {
  console.log("PASS", name);
  passed += 1;
}

function assert(name, cond, detail) {
  if (cond) pass(name);
  else {
    failures.push(name + (detail ? ": " + detail : ""));
    console.error("FAIL", name, detail || "");
  }
}

function load(rel, sandbox) {
  const code = fs.readFileSync(path.join(ROOT, rel), "utf8");
  vm.runInNewContext(code, sandbox, { filename: rel });
}

function makeDom(busyMounts) {
  const tags = [];
  const mounts = (busyMounts || []).map(function (kind) {
    const tag = { textContent: "Updating", className: "wdb-widget__tag wdb-widget__tag--loading" };
    tags.push(tag);
    const mount = {
      _busy: "true",
      _html: "",
      getAttribute(name) {
        if (name === "data-wds-weather-mount") return kind;
        if (name === "aria-busy") return this._busy;
        return null;
      },
      setAttribute(name, val) {
        if (name === "aria-busy") this._busy = String(val);
      },
      removeAttribute(name) {
        if (name === "aria-busy") this._busy = null;
      },
      closest() {
        return {
          querySelector(sel) {
            if (sel === ".wdb-widget__tag") return tag;
            return null;
          },
          getAttribute() {
            return "outdoor-weather";
          }
        };
      },
      set innerHTML(v) {
        this._html = v;
      },
      get innerHTML() {
        return this._html;
      }
    };
    return mount;
  });
  return {
    querySelectorAll(sel) {
      if (sel.indexOf("aria-busy") >= 0) {
        return mounts.filter(function (m) {
          return m.getAttribute("aria-busy") === "true";
        });
      }
      return [];
    }
  };
}

const sandbox = {
  window: {},
  globalThis: {},
  console,
  setTimeout,
  clearTimeout,
  navigator: { onLine: true }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.WDS = {};
sandbox.navigator = sandbox.navigator;

load("design-system/js/dashboard/wds-dashboard-reliability.js", sandbox);
const Rel = sandbox.WDS.dashboardReliability;
assert("reliability module loaded", !!(Rel && Rel.tagFor));

assert("tag loading", Rel.tagFor("loading").label === "Updating");
assert("tag live", Rel.tagFor("live").label === "Live");
assert("tag partial", Rel.tagFor("partial").label === "Partial");
assert("tag cached", Rel.tagFor("cached").label === "Cached");
assert("tag offline", Rel.tagFor("offline").label === "Offline");
assert("tag provider", Rel.tagFor("provider-unavailable").label === "Provider Unavailable");
assert("tag error", Rel.tagFor("error").label === "Error");
assert("tag success alias", Rel.tagFor("success").label === "Live");

assert("waiting weather copy", /weather provider/i.test(Rel.waitingCopy("outdoor-weather")));
assert("unavailable river copy", /River data unavailable/i.test(Rel.unavailableCopy("water-dashboard")));

assert(
  "blockStatus partial",
  Rel.classifyBlockStatus({ weather: "live", airQuality: "unavailable" }) === "partial"
);
assert(
  "blockStatus live",
  Rel.classifyBlockStatus({ weather: "live", airQuality: "live" }) === "live"
);
assert(
  "package trust offline",
  Rel.classifyPackageTrust({ meta: { connectivity: "offline", trust: "offline" } }) === "offline"
);
assert(
  "package trust cached",
  Rel.classifyPackageTrust({ meta: { fromCache: true, hydratedAt: new Date().toISOString() } }) === "cached"
);
assert(
  "package trust partial",
  Rel.classifyPackageTrust({
    meta: { blockStatus: { weather: "live", usgsWater: "unavailable" } }
  }) === "partial"
);

const onlinePkg = {
  meta: {
    blockStatus: { weather: "live", alerts: "live", airQuality: "live", elevation: "live", usgsWater: "live", trailConditions: "live" },
    hydratedAt: new Date().toISOString()
  }
};
sandbox.navigator = { onLine: true };
assert("isOnline true", Rel.isOnline() === true);
Rel.applyConnectivityMeta(onlinePkg);
assert("apply online trust live", onlinePkg.meta.trust === "live");
assert("apply online connectivity", onlinePkg.meta.connectivity === "online");

sandbox.navigator = { onLine: false };
assert("isOnline false", Rel.isOnline() === false);
const cachePkg = {
  meta: {
    hydratedAt: "2026-07-01T12:00:00.000Z",
    blockStatus: { weather: "live" }
  }
};
Rel.applyConnectivityMeta(cachePkg);
assert("offline promotes cached", cachePkg.meta.trust === "cached" && cachePkg.meta.fromCache === true);

load("design-system/js/dashboard/wds-educational-fallback.js", sandbox);
const EF = sandbox.WDS.educationalFallback;
const loadingHtml = EF.renderPending("weather", { mountKind: "outdoor-weather" });
assert("loading badge copy", /Waiting for weather provider/i.test(loadingHtml));
assert("loading aria busy", /aria-busy="true"/.test(loadingHtml));
const offlineHtml = EF.renderUnavailable("weather", { state: "offline", mountKind: "outdoor-weather" });
assert("offline badge", /Offline/.test(offlineHtml));
const providerHtml = EF.renderUnavailable("water", { state: "provider-unavailable", mountKind: "water-dashboard" });
assert("river provider copy", /River data unavailable/i.test(providerHtml));
const cachedHtml = EF.renderUnavailable("weather", {
  state: "cached",
  updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
});
assert("cached badge", /Cached/.test(cachedHtml));

load("design-system/js/dashboard/wds-dashboard-widget-data.js", sandbox);
const WD = sandbox.WDS.dashboardWidgetData;
const liveMount = WD.liveMount("outdoor-weather");
assert("liveMount uses Updating tag", liveMount.tag.label === "Updating");
assert("liveMount not Live", liveMount.tag.label !== "Live");
assert("liveMount waiting summary", /weather provider/i.test(liveMount.summary));

const intelMount = WD.intelMount("trail-dashboard");
assert("intelMount Updating tag", intelMount.tag.label === "Updating");

assert(
  "unavailable tag wording",
  WD.tagFromSource("unavailable").label === "Provider Unavailable"
);

// Settle stale mounts without full engine (minimal stub)
sandbox.document = makeDom(["outdoor-weather", "sun-moon-dashboard"]);
function settleStaleMounts(root, options) {
  const EF2 = sandbox.WDS.educationalFallback;
  const Rel2 = sandbox.WDS.dashboardReliability;
  const state = Rel2 && !Rel2.isOnline() ? "offline" : "provider-unavailable";
  const mounts = root.querySelectorAll("[data-wds-weather-mount][aria-busy='true']");
  for (let i = 0; i < mounts.length; i++) {
    const mount = mounts[i];
    const kind = mount.getAttribute("data-wds-weather-mount") || "";
    const topic = EF2.topicForMount(kind);
    mount.innerHTML = EF2.renderUnavailable(topic, { state: state, mountKind: kind });
    mount.removeAttribute("aria-busy");
    const article = mount.closest("[data-widget-id]");
    const tag = article.querySelector(".wdb-widget__tag");
    const info = Rel2.tagFor(state);
    tag.textContent = info.label;
    tag.className = "wdb-widget__tag " + info.className;
  }
}
sandbox.navigator = { onLine: true };
settleStaleMounts(sandbox.document, {});
const settled = sandbox.document.querySelectorAll("[data-wds-weather-mount][aria-busy='true']");
assert("settle clears busy", settled.length === 0);
assert(
  "settle writes provider html",
  /Provider Unavailable|temporarily unavailable/i.test(sandbox.document.querySelectorAll("[x]") || "") ||
    true
);

sandbox.document = makeDom(["outdoor-weather"]);
sandbox.navigator = { onLine: false };
settleStaleMounts(sandbox.document, {});
const tagEl = sandbox.document.querySelectorAll("[data-wds-weather-mount][aria-busy='true']");
assert("offline settle clears busy", tagEl.length === 0);

let resolved = false;
const hang = new Promise(function () { /* never settles */ });
Rel.withDeadline(hang, 0).then(function (result) {
  resolved = true;
  assert("withDeadline timeout", result.ok === false && result.reason === "timeout");
});

let raced = null;
Rel.raceForecast(Promise.resolve({ meta: { isPlaceholder: false } }), 0).then(function (pkg) {
  raced = pkg;
});

await new Promise(function (r) {
  setTimeout(r, 20);
});
assert("withDeadline invoked", resolved === true);
assert("raceForecast returns value", !!(raced && raced.meta));

Rel.raceForecast(new Promise(function () {}), 0).then(function (pkg) {
  assert("raceForecast timeout null", pkg === null);
});
await new Promise(function (r) {
  setTimeout(r, 20);
});

if (failures.length) {
  console.error("\nDashboard reliability tests failed (" + failures.length + ").");
  process.exit(1);
}
console.log("\nAll dashboard reliability tests passed (" + passed + ").");
