#!/usr/bin/env node
/**
 * Home RC1 — routing, nav, deepeners, anti-regression contracts.
 * Authority: docs/rebuild-2026/home-vision-lock-owner-review.md
 * Run: node automation/test-home-rc1.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

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

function load(rel, sandbox) {
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), sandbox, { filename: rel });
}

const rootHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const dashHtml = fs.readFileSync(path.join(ROOT, "apps/dashboard/index.html"), "utf8");
const navCfg = fs.readFileSync(path.join(ROOT, "design-system/js/platform/wds-app-nav-config.js"), "utf8");
const wdsJs = fs.readFileSync(path.join(ROOT, "design-system/js/wds.js"), "utf8");
const studioConst = fs.readFileSync(path.join(ROOT, "docs/WAYPOINT-STUDIO-CONSTITUTION.md"), "utf8");
const supportHtml = fs.readFileSync(path.join(ROOT, "support.html"), "utf8");
const dashRedirect = fs.readFileSync(path.join(ROOT, "dashboard.html"), "utf8");
const manifest = fs.readFileSync(path.join(ROOT, "site.webmanifest"), "utf8");

assert("root is Rebuild host", /wds-dashboard-rebuild\.css/.test(rootHtml) && /home-boot\.js/.test(rootHtml));
assert("root labels Home", /data-product-name="Home"/.test(rootHtml) && /<title>Home/.test(rootHtml));
assert("root canonical is /", /rel="canonical"[^>]*href="https:\/\/waypointstudio\.org\/"/.test(rootHtml));
assert("root shell depth 0", /data-shell-depth="0"/.test(rootHtml));
assert("dashboard alias same Rebuild", /wds-dashboard-rebuild\.css/.test(dashHtml) && /home-boot\.js/.test(dashHtml));
assert("dashboard alias labels Home", /data-product-name="Home"/.test(dashHtml));
assert("single implementation — shared boot", /apps\/dashboard\/js\/home-boot\.js/.test(rootHtml));
assert("no marketing homepage modules on root", !/was-home-hero|studio-home\.js|wds-studio-home\.css/i.test(rootHtml));
assert("no Outdoor OS on root", !/wds-dashboard-os\.css|Outdoor OS/i.test(rootHtml));
assert("no Recovery briefing on root", !/building your briefing|Outdoor overview/i.test(rootHtml));

assert("primary nav is Home·Scenes·Sheds·Articles·About", /"id": "home".*"Scenes".*"Sheds".*"Articles".*"About"/s.test(navCfg));
assert("primary nav omits Volunteer", !/"id": "volunteer"/.test(navCfg.split("studioPrimaryNav")[1].slice(0, 800)));
const primaryNavBlock = (navCfg.match(/"studioPrimaryNav"\s*:\s*\[[\s\S]*?\]/) || [""])[0];
assert("primary nav omits SignalTerrain", !/signalterrain|SignalTerrain|Volunteer/i.test(primaryNavBlock));
assert("local nav omits Kiosk feature", !/"id":\s*"kiosk"/.test(navCfg));
assert("startHere is Open Home", /"label":\s*"Open Home"/.test(navCfg));
assert("contact back link is Home", /Back to Home/.test(fs.readFileSync(path.join(ROOT, "apps/dashboard/contact.html"), "utf8")));
assert("customize omits Kiosk layout button", !/Kiosk layout/.test(fs.readFileSync(path.join(ROOT, "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-customize.js"), "utf8")));
assert(
  "quiet chrome keeps Home Customize local nav",
  !/\[data-product="dashboard"\]\s*\.was-local\s*\{[^}]*display:\s*none/s.test(
    fs.readFileSync(path.join(ROOT, "design-system/css/wds-app-shell.css"), "utf8")
  )
);
assert(
  "workspace Customize entry present",
  /data-wdb-r-customize-entry/.test(
    fs.readFileSync(path.join(ROOT, "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-workspace.js"), "utf8")
  )
);
assert("kiosk chrome has no user Kiosk label", !/>Kiosk</.test(fs.readFileSync(path.join(ROOT, "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-kiosk.js"), "utf8")) && !/Exit kiosk/.test(fs.readFileSync(path.join(ROOT, "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-kiosk.js"), "utf8")));
assert("404 links Home architecture", /<a href="\/">Home<\/a>/.test(fs.readFileSync(path.join(ROOT, "404.html"), "utf8")) && !/SignalTerrain|Waypoint Volunteer|ForageCast/.test(fs.readFileSync(path.join(ROOT, "404.html"), "utf8")));
assert("about primary is Home not Dashboard", /<strong>Home<\/strong>/.test(fs.readFileSync(path.join(ROOT, "about.html"), "utf8")) && !/<strong>Dashboard<\/strong>/.test(fs.readFileSync(path.join(ROOT, "about.html"), "utf8")));
assert("support experiences are Home architecture", /<strong>Home<\/strong>/.test(supportHtml) && /<strong>Contact<\/strong>/.test(supportHtml) && !/Coming later|Waypoint Volunteer|incubator\//.test(supportHtml));
assert("dashboard match includes root", /\^\/\$/.test(navCfg));
assert("wds-home loads deepeners", /wds-dashboard-rebuild-deepeners\.js/.test(fs.readFileSync(path.join(ROOT, "design-system/js/wds-home.js"), "utf8")));
assert("root uses canonical wds-home", /wds-home\.js/.test(rootHtml));
assert("dashboard uses canonical wds-home", /wds-home\.js/.test(dashHtml));
assert("studio constitution Home lock", /Home is the canonical Waypoint Studio experience/.test(studioConst));
assert("support no Outdoor overview", !/Outdoor overview/i.test(supportHtml));
assert("dashboard.html redirects to Home root", /url=\.\/|location\.replace\("\.\/"/.test(dashRedirect));
assert("manifest start_url Home", /"start_url":\s*"\/"/.test(manifest));

const shellSrc = fs.readFileSync(path.join(ROOT, "design-system/js/platform/wds-app-shell.js"), "utf8");
const footerFn = (shellSrc.match(/function renderFooter\([\s\S]*?\n  \}/) || [""])[0];
assert("footer keeps Contact", /Contact/.test(footerFn));
assert("footer keeps Privacy Policy", /Privacy Policy/.test(footerFn) && /privacy\.html/.test(footerFn));
assert("footer keeps Terms of Service", /Terms of Service/.test(footerFn) && /terms\.html/.test(footerFn));
assert(
  "footer removes historical navigation",
  !/support\.html|about\.html|incubator\//.test(footerFn) &&
    !/Something wrong|Suggest an idea|Coming later|>About<|>Support<|>Privacy</.test(footerFn)
);
assert("terms.html placeholder exists", fs.existsSync(path.join(ROOT, "terms.html")));
assert("terms.html uses app shell footer", /data-wds-app-footer/.test(fs.readFileSync(path.join(ROOT, "terms.html"), "utf8")));

const sandbox = {
  window: global,
  console,
  document: {
    documentElement: {
      classList: { add() {}, remove() {}, contains() { return false; } },
      setAttribute() {},
      removeAttribute() {},
      getAttribute() { return null; }
    },
    hidden: false,
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() {
      return { style: {}, setAttribute() {}, appendChild() {} };
    },
    readyState: "complete"
  },
  location: { pathname: "/", hash: "", href: "http://127.0.0.1/" },
  localStorage: {
    _d: {},
    getItem(k) { return this._d[k] || null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; }
  },
  CustomEvent: function () {},
  dispatchEvent() {},
  fetch() {
    return Promise.reject(new Error("offline"));
  },
  performance: { mark() {}, now() { return 0; } },
  requestAnimationFrame(fn) { fn(); },
  matchMedia() {
    return { matches: false };
  }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.WDS = {};

[
  "design-system/js/platform/wds-app-nav-config.js",
  "design-system/js/platform/wds-app-nav.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-prefs.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-deepeners.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-today.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-workspace.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-customize.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-kiosk.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js"
].forEach(function (rel) {
  load(rel, sandbox);
});

const Nav = sandbox.WDS.appNav;
assert("detectApp / is dashboard Home", Nav.detectApp("/", "") && Nav.detectApp("/", "").id === "dashboard");
assert("detectApp /apps/dashboard/ is dashboard", Nav.detectApp("/apps/dashboard/", "") && Nav.detectApp("/apps/dashboard/", "").id === "dashboard");
assert("detectApp /about.html is not Home", !Nav.detectApp("/about.html", "") || Nav.detectApp("/about.html", "").id !== "dashboard");

const Reg = sandbox.WDS.dashboardRebuildRegistry;
const Prefs = sandbox.WDS.dashboardRebuildPrefs;
const defaults = Prefs.defaults ? Prefs.defaults() : Prefs.load();
const enabled = defaults.enabled || [];
assert(
  "defaults include Conditions Light Air Astronomy",
  ["ph-conditions", "ph-light", "ph-air", "ph-astronomy"].every(function (id) {
    return enabled.indexOf(id) >= 0;
  })
);
assert("defaults include Alerts when available", enabled.indexOf("ph-alerts") >= 0);
assert("defaults omit coming-soon Photography", enabled.indexOf("ph-photography") < 0);
assert("defaults omit coming-soon Rivers", enabled.indexOf("ph-rivers") < 0);
assert("no separate Weather widget required", !Reg.get("weather") || !Reg.get("ph-weather"));

const Deepen = sandbox.WDS.dashboardRebuildDeepeners;
const deepenHtml = Deepen.render();
assert("deepeners render Latest Articles", /Latest Articles/.test(deepenHtml));
assert("deepeners render Waypoint’s Take", /Waypoint.s Take/.test(deepenHtml));
assert("deepeners render Featured Photography", /Featured Photography/.test(deepenHtml));
assert("deepeners render Scenes intro", /Open Scenes/.test(deepenHtml));
assert("deepeners render Sheds intro", /Open Sheds/.test(deepenHtml));
assert("deepeners do not embed Scenes app", !/photo-coach|wds-scenes/i.test(deepenHtml));

const Rebuild = sandbox.WDS.dashboardRebuild;
const shell = Rebuild.renderShell({ view: "workspace", placeContext: { placeLabel: "Test", trust: "waiting" } });
assert("workspace shell includes deepeners", /data-wdb-r-deepen/.test(shell));
const customize = Rebuild.renderShell({ view: "customize", placeContext: { placeLabel: "Test", trust: "waiting" } });
assert("customize omits deepeners", !/data-wdb-r-deepen/.test(customize));
const kiosk = Rebuild.renderShell({ view: "kiosk", placeContext: { placeLabel: "Test", trust: "waiting" } });
assert("kiosk omits deepeners", !/data-wdb-r-deepen/.test(kiosk));
assert("kiosk shell has no user-facing Kiosk chrome", !/>Kiosk</.test(kiosk) && !/Exit kiosk/i.test(kiosk));

const primary = sandbox.WDS.APP_NAV_CONFIG.studioPrimaryNav.map(function (i) {
  return i.label;
});
assert(
  "nav labels exact set",
  primary.join("|") === "Home|Scenes|Sheds|Articles|About",
  primary.join("|")
);

if (failures.length) {
  console.error("\n" + failures.length + " failure(s).");
  process.exit(1);
}
console.log("\nAll Home RC1 tests passed (" + passed + ").");
