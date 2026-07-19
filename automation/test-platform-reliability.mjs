#!/usr/bin/env node
/**
 * Platform reliability tests — WDS.resilience coalescing, retries, offline cache,
 * provider health, debounce, platformUi delegation, loader wiring.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import vm from "vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const failures = [];

function fail(name, detail) {
  failures.push(name + ": " + detail);
  console.log("FAIL", name, "—", detail);
}

function pass(name) {
  console.log("PASS", name);
}

function assert(name, cond, detail) {
  if (cond) pass(name);
  else fail(name, detail || "assertion failed");
}

function makeStorage() {
  const s = {};
  return {
    getItem(k) {
      return Object.prototype.hasOwnProperty.call(s, k) ? s[k] : null;
    },
    setItem(k, v) {
      s[k] = String(v);
    },
    removeItem(k) {
      delete s[k];
    },
    get length() {
      return Object.keys(s).length;
    },
    key(i) {
      return Object.keys(s)[i] || null;
    }
  };
}

function load(file) {
  const code = fs.readFileSync(path.join(ROOT, file), "utf8");
  vm.runInThisContext(code, { filename: file });
}

async function run() {
  global.window = global;
  global.addEventListener = function () {};
  global.removeEventListener = function () {};
  const navState = { onLine: true };
  try {
    Object.defineProperty(global, "navigator", {
      configurable: true,
      get() {
        return navState;
      }
    });
  } catch (e) {
    // Node may already expose navigator; mutate if possible
    try {
      Object.defineProperty(global.navigator, "onLine", {
        configurable: true,
        get() {
          return navState.onLine;
        }
      });
    } catch (e2) {
      /* ignore */
    }
  }
  global.document = {
    readyState: "complete",
    documentElement: { dataset: {}, getAttribute: () => null },
    getElementById: () => null,
    querySelector: () => null,
    createElement: () => ({
      setAttribute() {},
      appendChild() {},
      style: {},
      textContent: "",
      hidden: true
    }),
    body: { insertBefore() {}, firstChild: null },
    head: { appendChild() {} },
    addEventListener() {}
  };
  global.localStorage = makeStorage();
  global.sessionStorage = makeStorage();
  global.AbortController = class {
    constructor() {
      this.signal = { aborted: false, addEventListener() {} };
    }
    abort() {
      this.signal.aborted = true;
    }
  };

  let fetchCalls = 0;
  let fetchImpl = async () => {
    fetchCalls += 1;
    return {
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({ ok: true, n: fetchCalls })
    };
  };
  global.fetch = (...args) => fetchImpl(...args);

  load("design-system/js/platform/wds-platform-resilience.js");
  const R = global.WDS.resilience;
  assert("resilience attached", !!(R && R.getJson));
  assert("debounce exported", typeof R.debounce === "function");

  // Coalesce identical in-flight requests
  fetchCalls = 0;
  let resolveFetch;
  fetchImpl = () =>
    new Promise((resolve) => {
      fetchCalls += 1;
      resolveFetch = () =>
        resolve({
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: async () => ({ coalesced: true })
        });
    });
  const p1 = R.getJson("/api/coalesce-test", { persist: false });
  const p2 = R.getJson("/api/coalesce-test", { persist: false });
  assert("coalesce single network call pending", fetchCalls === 1);
  resolveFetch();
  const [a, b] = await Promise.all([p1, p2]);
  assert("coalesce same payload", a.data.coalesced === true && b.data.coalesced === true);
  assert("coalesce still one fetch", fetchCalls === 1);

  // Memory cache hit
  fetchCalls = 0;
  const cached = await R.getJson("/api/coalesce-test", { persist: false, maxAgeMs: 60_000 });
  assert("memory cache used", cached.freshness.source === "memory-cache" && fetchCalls === 0);

  // Retry on timeout then succeed
  R.clearCache();
  fetchCalls = 0;
  let attempt = 0;
  fetchImpl = async () => {
    fetchCalls += 1;
    attempt += 1;
    if (attempt === 1) {
      const err = new Error("Timed out");
      err.code = "timeout";
      throw err;
    }
    return {
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({ retried: true })
    };
  };
  // fetchOnce throws timeout via race — simulate by making fetch reject with timeout code from fetchWithRetry path
  // Use 500 then success via shouldRetry
  attempt = 0;
  fetchImpl = async () => {
    fetchCalls += 1;
    attempt += 1;
    if (attempt === 1) {
      return { ok: false, status: 503, headers: { get: () => "" }, json: async () => ({}) };
    }
    return {
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({ retried: true })
    };
  };
  const retried = await R.getJson("/api/retry", {
    persist: false,
    retries: 1,
    backoffMs: 1,
    providerId: "test-provider"
  });
  assert("retry succeeded", retried.data.retried === true && fetchCalls === 2);
  const snap = R.providerSnapshot();
  assert(
    "provider health recorded",
    snap.some((p) => p.id === "test-provider" && p.status === "healthy")
  );

  // Offline stale persistent cache
  R.clearCache();
  fetchCalls = 0;
  fetchImpl = async () => {
    fetchCalls += 1;
    return {
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({ seed: 1 })
    };
  };
  await R.getJson("/api/offline", { persist: true, providerId: "offline-seed" });
  global.navigator.onLine = false;
  fetchImpl = async () => {
    fetchCalls += 1;
    throw Object.assign(new Error("network fail"), { message: "Failed to fetch" });
  };
  // Clear memory but keep sessionStorage
  R.clearCache("/api/offline");
  // Re-seed persistent only
  global.sessionStorage.setItem(
    "wds.resilience.cache.v1:/api/offline",
    JSON.stringify({ data: { seed: 1 }, at: Date.now() - 10_000 })
  );
  const offlinePack = await R.getJson("/api/offline", { persist: true, allowOfflineNetwork: false });
  assert(
    "offline uses persistent cache",
    offlinePack.data.seed === 1 && offlinePack.freshness.stale === true
  );
  global.navigator.onLine = true;

  // Debounce
  let fired = 0;
  const d = R.debounce(() => {
    fired += 1;
  }, 30);
  d();
  d();
  d();
  await new Promise((r) => setTimeout(r, 80));
  assert("debounce collapses calls", fired === 1);

  // platformUi delegates
  load("design-system/js/platform/wds-platform-ui.js");
  assert("platformUi present", !!(global.WDS.platformUi && global.WDS.platformUi.getJson));
  R.clearCache();
  fetchCalls = 0;
  fetchImpl = async () => {
    fetchCalls += 1;
    return {
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({ via: "ui" })
    };
  };
  const viaUi = await global.WDS.platformUi.getJson("/api/via-ui", { persist: false });
  assert("platformUi delegates to resilience", viaUi.data.via === "ui" && fetchCalls === 1);

  // Loader wiring
  const wds = fs.readFileSync(path.join(ROOT, "design-system/js/wds.js"), "utf8");
  const platform = fs.readFileSync(path.join(ROOT, "design-system/js/wds-platform.js"), "utf8");
  assert("wds.js loads resilience", /platform\/wds-platform-resilience\.js/.test(wds));
  assert("wds.js loads platform-ui", /platform\/wds-platform-ui\.js/.test(wds));
  assert("wds-platform.js loads resilience", /platform\/wds-platform-resilience\.js/.test(platform));

  // HTML coverage: every page with platform-ui also has resilience before it (or wds.js)
  let htmlGaps = 0;
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === "node_modules" || ent.name === ".git") continue;
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.name.endsWith(".html")) {
        const t = fs.readFileSync(p, "utf8");
        if (t.includes("wds-platform-ui.js") && !t.includes("wds-platform-resilience.js")) {
          htmlGaps += 1;
          fail("html resilience order", p);
        }
      }
    }
  }
  walk(ROOT);
  assert("all platform-ui pages include resilience", htmlGaps === 0);

  // OIP weather fallback enabled
  const oip = fs.readFileSync(
    path.join(ROOT, "design-system/js/outdoor-intelligence/wds-oip-service.js"),
    "utf8"
  );
  assert("OIP weather fallback true", /fallback:\s*true/.test(oip));
  assert("OIP records into resilience", /WDS\.resilience\.recordProvider/.test(oip));

  // Map destroy clears will-change
  const map = fs.readFileSync(path.join(ROOT, "design-system/js/wds-map-view.js"), "utf8");
  assert("map sets will-change", /willChange\s*=\s*"transform"/.test(map));
  assert("map destroy clears will-change", /willChange\s*=\s*"auto"/.test(map));

  // ForageCastFetch formatFreshness present
  const fcFetch = fs.readFileSync(path.join(ROOT, "apps/foragecast/js/foragecast-fetch.js"), "utf8");
  assert("ForageCastFetch.formatFreshness", /function formatFreshness/.test(fcFetch));

  if (failures.length) {
    console.error("\n" + failures.length + " failure(s)");
    process.exit(1);
  }
  console.log("\nAll platform reliability tests passed.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
