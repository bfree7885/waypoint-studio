#!/usr/bin/env node
/**
 * Stabilization regressions — Scene Builder dimming + dashboard progressive paint.
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

const css = fs.readFileSync(path.join(ROOT, "apps/scenes/css/photo-coach.css"), "utf8");
assert(
  "compare mount hidden rule in photo-coach.css",
  /\.coach-compare-mount\[hidden\]\s*\{[^}]*display:\s*none\s*!important/s.test(css)
);

const shellCss = fs.readFileSync(path.join(ROOT, "apps/photo-coach/css/photo-coach-shell.css"), "utf8");
assert(
  "compare mount hidden rule in photo-coach-shell.css",
  /\.coach-compare-mount\[hidden\]\s*\{[^}]*display:\s*none\s*!important/s.test(shellCss)
);

const compareJs = fs.readFileSync(path.join(ROOT, "apps/scenes/js/photo-coach-compare.js"), "utf8");
assert("compare exports close", /close:\s*close/.test(compareJs) && /function close\(/.test(compareJs));
assert("compare Escape dismiss", /Escape/.test(compareJs));

const appJs = fs.readFileSync(path.join(ROOT, "apps/scenes/js/app.js"), "utf8");
assert(
  "setProductMode dismisses compare",
  /function setProductMode[\s\S]*WaypointPhotoCoachCompare\.close/s.test(appJs)
);
assert(
  "setProductMode dismisses photo modal",
  /function setProductMode[\s\S]*WaypointPhotography\.closeDetail/s.test(appJs)
);

const oip = fs.readFileSync(path.join(ROOT, "design-system/js/outdoor-intelligence/wds-oip-service.js"), "utf8");
assert("trails schedule helper exists", /function scheduleTrailEnrichment/.test(oip));
assert(
  "trails not in critical Promise.all of five providers",
  /Promise\.all\(\[\s*settleProvider\(resolveWeather[\s\S]*resolveUsgsWater[\s\S]*\]\)\.then/s.test(oip) &&
    !/Promise\.all\(\[\s*settleProvider\(resolveWeather[\s\S]*resolveTrails[\s\S]*\]\)\.then/s.test(oip)
);

const engine = fs.readFileSync(path.join(ROOT, "design-system/js/wds-content-engine.js"), "utf8");
assert(
  "progressive shell paint before OIP",
  /renderIntoMount\(mount,\s*shellData[\s\S]*fetchOutdoorIntelligence/s.test(engine)
);
assert("WSKB preload non-blocking", /ensureWskbPreload\(data,\s*base,\s*loc\)\.catch/.test(engine));
assert("late trail refresh wired", /wireLatePlatformHydration/.test(engine));
assert("in-place hydrate after OIP", /function hydrateDashboardInPlace/.test(engine));
assert("init coalescing by coords key", /activeInit/.test(engine) && /function coordsKey/.test(engine));
assert("region change invalidates ready shell", /data-wdb-init-key/.test(engine));

const boot = fs.readFileSync(path.join(ROOT, "apps/dashboard/js/home-boot.js"), "utf8");
assert("early stored location start", /isSafeEarlyLocation/.test(boot) && /readStored/.test(boot));
assert("kansas/engine point blocked for early paint", /isEnginePublishPoint/.test(boot));
assert("cold provisional shell location", /function provisionalShellLocation/.test(boot));

const dashHtml = fs.readFileSync(path.join(ROOT, "apps/dashboard/index.html"), "utf8");
assert("honest location loading copy", /Finding your location/.test(dashHtml));
assert("no duplicate app-nav script tags", !/wds-app-nav\.js/.test(dashHtml));
assert("no page-level aria-live on content engine", !/id="wds-content-engine"[^>]*aria-live/.test(dashHtml));

const locCss = fs.readFileSync(path.join(ROOT, "design-system/css/wds-content-engine.css"), "utf8");
assert(
  "location prompt mount hidden rule",
  /#wds-location-prompt\[hidden\]/.test(locCss) &&
    /\.wds-location-prompt\[hidden\]\s*\{[^}]*display:\s*none\s*!important/s.test(locCss)
);

const modalCss = fs.readFileSync(path.join(ROOT, "design-system/css/wds-components.css"), "utf8");
assert(
  "modal hidden rule",
  /\.wds-modal\[hidden\]\s*\{[^}]*display:\s*none\s*!important/s.test(modalCss)
);

assert(
  "coach-col--right hidden rule present",
  /\.coach-col--right\[hidden\]\s*\{[^}]*display:\s*none\s*!important/s.test(css)
);

const outdoorWx = fs.readFileSync(path.join(ROOT, "design-system/js/weather/wds-outdoor-weather-ui.js"), "utf8");
assert(
  "outdoor weather waits for OIP on progressive shell",
  /Progressive shell/.test(outdoorWx) && !/getForecast\(/.test(outdoorWx)
);

const settleSrc = fs.readFileSync(path.join(ROOT, "design-system/js/dashboard/wds-dashboard-engine.js"), "utf8");
assert(
  "settleStaleMounts gated on hydratedAt",
  /function settleStaleMounts[\s\S]*hydratedAt/s.test(settleSrc)
);

// Runtime: compare close clears mount + hidden
const sandbox = {
  window: {},
  document: {
    getElementById() {
      return sandbox.mount;
    },
    addEventListener() {}
  },
  console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.mount = {
  innerHTML: "<div>compare</div>",
  hidden: false,
  setAttribute() {},
  removeAttribute() {},
  querySelector() {
    return { onclick: null };
  }
};
vm.runInNewContext(
  fs.readFileSync(path.join(ROOT, "apps/scenes/js/photo-coach-compare.js"), "utf8"),
  sandbox
);
sandbox.WaypointPhotoCoachCompare.close(sandbox.mount);
assert("close clears html", sandbox.mount.innerHTML === "");
assert("close sets hidden", sandbox.mount.hidden === true);

if (failures.length) {
  console.error("\nStabilization tests failed (" + failures.length + ").");
  process.exit(1);
}
console.log("\nAll stabilization tests passed (" + passed + ").");
