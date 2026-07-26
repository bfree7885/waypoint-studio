#!/usr/bin/env node
/**
 * Dashboard Rebuild Phase 1 — shell framework tests.
 * Run: node automation/test-dashboard-rebuild-phase1.mjs
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

const indexHtml = fs.readFileSync(path.join(ROOT, "apps/dashboard/index.html"), "utf8");
assert("index uses rebuild CSS", /wds-dashboard-rebuild\.css/.test(indexHtml));
assert("index does not load Outdoor OS CSS as primary", !/wds-dashboard-os\.css/.test(indexHtml));
assert("index product name Home", /data-product-name="Home"/.test(indexHtml));
assert("index title Home", /<title>Home/.test(indexHtml));
assert("index boots home-boot", /js\/home-boot\.js/.test(indexHtml));
assert("index keeps contact local", /href="\.\/contact\.html"/.test(indexHtml));
assert("index no Do this / homework chrome", !/Do this|homework|You should/i.test(indexHtml));
assert("index does not revive Outdoor OS", !/Outdoor OS|wds-dashboard-os\.css/i.test(indexHtml));
assert("index does not revive studio-home marketing", !/was-home-hero|studio-home\.js/i.test(indexHtml));

const rootHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
assert("root index mounts Rebuild", /wds-dashboard-rebuild\.css/.test(rootHtml));
assert("root index product Home", /data-product-name="Home"/.test(rootHtml));
assert("root index boots shared home-boot", /apps\/dashboard\/js\/home-boot\.js/.test(rootHtml));
assert("root index quiet chrome", /data-quiet-chrome="true"/.test(rootHtml));
assert("root index no marketing hero", !/was-home-hero|studio-home\.js/i.test(rootHtml));

const modules = [
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-prefs.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-today.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-workspace.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-customize.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-kiosk.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild-deepeners.js",
  "design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js"
];
modules.forEach(function (rel) {
  assert("module exists " + path.basename(rel), fs.existsSync(path.join(ROOT, rel)));
});

assert(
  "wds.js loads rebuild modules",
  /dashboard\/rebuild\/wds-dashboard-rebuild\.js/.test(
    fs.readFileSync(path.join(ROOT, "design-system/js/wds.js"), "utf8")
  )
);

const sandbox = {
  window: {},
  console,
  document: {
    documentElement: {
      classList: {
        add() {},
        remove() {},
        contains() {
          return false;
        }
      },
      setAttribute() {},
      removeAttribute() {},
      getAttribute() {
        return null;
      }
    },
    hidden: false,
    addEventListener() {},
    removeEventListener() {},
    querySelector() {
      return null;
    }
  },
  location: { pathname: "/apps/dashboard/", hash: "#/" },
  history: { replaceState() {} },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
  CustomEvent: function CustomEvent(type, init) {
    this.type = type;
    this.detail = init && init.detail;
  },
  localStorage: {
    _data: {},
    getItem(k) {
      return Object.prototype.hasOwnProperty.call(this._data, k) ? this._data[k] : null;
    },
    setItem(k, v) {
      this._data[k] = String(v);
    },
    removeItem(k) {
      delete this._data[k];
    }
  },
  setInterval() {
    return 1;
  },
  clearInterval() {},
  matchMedia() {
    return { matches: false };
  },
  Date,
  isFinite,
  Number,
  String,
  Object,
  Array,
  JSON,
  Math
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.WDS = {};

modules.forEach(function (rel) {
  load(rel, sandbox);
});

const Reg = sandbox.WDS.dashboardRebuildRegistry;
const Prefs = sandbox.WDS.dashboardRebuildPrefs;
const Today = sandbox.WDS.dashboardRebuildToday;
const Workspace = sandbox.WDS.dashboardRebuildWorkspace;
const Customize = sandbox.WDS.dashboardRebuildCustomize;
const Kiosk = sandbox.WDS.dashboardRebuildKiosk;
const Shell = sandbox.WDS.dashboardRebuild;

assert("registry loaded", !!(Reg && Reg.all));
assert("prefs loaded", !!(Prefs && Prefs.load));
assert("today loaded", !!(Today && Today.render));
assert("workspace loaded", !!(Workspace && Workspace.renderWorkspace));
assert("customize loaded", !!(Customize && Customize.render));
assert("kiosk loaded", !!(Kiosk && Kiosk.enter));
assert("shell loaded", !!(Shell && Shell.mount));

const all = Reg.all();
assert("placeholder widgets registered", all.length >= 3, String(all.length));
assert(
  "catalog ids stable (ph- prefix for prefs)",
  all.every(function (w) {
    return String(w.id).indexOf("ph-") === 0;
  })
);

const data = Reg.getData("ph-conditions");
assert(
  "live widget waiting without platform",
  data.trust === "waiting" || data.status === "waiting" || data.status === "placeholder" || data.trust === "unavailable"
);
assert("placeholder does not invent numbers", !/\d+\s*°|AQI\s*\d+/i.test(JSON.stringify(data)));

const prefs = Prefs.load();
assert("prefs have enabled defaults", Array.isArray(prefs.enabled) && prefs.enabled.length >= 1);
Prefs.setEnabled("ph-alerts", true);
assert("prefs persist enable", Prefs.load().enabled.indexOf("ph-alerts") >= 0);
Prefs.reset();
assert("prefs reset restores defaults", Prefs.load().enabled.indexOf("ph-conditions") >= 0);

const todayHtml = Today.render({ placeLabel: "Test Place", trust: "unavailable" });
assert("today outside title present", /Today Outside/.test(todayHtml));
assert("today outside honest empty bullets", /Conditions will appear here/.test(todayHtml));
assert("today outside no OS Do this", !/Do this|Happening|Matters most/i.test(todayHtml));
assert("today outside product trust label", /Waiting|Unavailable/.test(todayHtml));

const ws = Workspace.renderWorkspace({ prefs: Prefs.load(), customize: false });
assert("workspace has widget frames", /data-widget-id="ph-conditions"/.test(ws));
assert("workspace heading", /Workspace/.test(ws));
assert("workspace anticipates conditions", /data-widget-id="ph-conditions"/.test(ws));
assert("workspace anticipates light", /data-widget-id="ph-light"/.test(ws));
assert("workspace anticipates air", /data-widget-id="ph-air"/.test(ws));
assert("workspace anticipates astronomy", /data-widget-id="ph-astronomy"/.test(ws));
assert("workspace anticipates alerts", /data-widget-id="ph-alerts"/.test(ws));
assert("workspace omits coming-soon photography by default", !/data-widget-id="ph-photography"/.test(ws));
assert("workspace omits coming-soon rivers by default", !/data-widget-id="ph-rivers"/.test(ws));
assert("no developer instrument copy", !/Instrument not connected yet/.test(ws));
assert("product waiting copy", /Waiting for weather data|Data will appear here|Widget coming soon|coming soon/i.test(ws));

assert("parseView workspace", Shell.parseView("#/") === "workspace");
assert("parseView customize", Shell.parseView("#/customize") === "customize");
assert("parseView kiosk", Shell.parseView("#/kiosk") === "kiosk");

const shellWs = Shell.renderShell({ view: "workspace", placeContext: { placeLabel: "Here" } });
assert("shell includes today + workspace", /data-wdb-r-today/.test(shellWs) && /data-wdb-r-workspace/.test(shellWs));
assert("shell no Outdoor OS root", !/data-wdb-os/.test(shellWs));
assert("shell no duplicate actions nav", !/data-wdb-r-actions/.test(shellWs));
assert("shell no phase footer", !/Phase 1 shell|Dashboard rebuild/.test(shellWs));

const shellCustom = Shell.renderShell({ view: "customize" });
assert("customize includes catalog", /data-wdb-r-catalog/.test(shellCustom));
assert("customize no phase-1 engineering lede", !/Phase 1 validates/.test(shellCustom));

const kioskEnter = Kiosk.enter({ applyPreset: false });
assert("kiosk enter active", kioskEnter.active === true);
assert("kiosk constraints hide customize", Kiosk.constraints().hideCustomize === true);
assert("kiosk no location prompt", Kiosk.constraints().noLocationPrompt === true);
Kiosk.exit();
assert("kiosk exit clears", Kiosk.isActive() === false);

const categories = Reg.all().map((w) => w.category);
[
  "conditions",
  "light",
  "air",
  "astronomy",
  "alerts"
].forEach(function (cat) {
  assert("catalog includes " + cat, categories.indexOf(cat) >= 0);
});
[
  "photography",
  "rivers",
  "wildlife",
  "trails"
].forEach(function (cat) {
  assert("catalog excludes placeholder " + cat, categories.indexOf(cat) < 0);
});

const bannedDev = [
  "instrument not connected",
  "phase 1 shell",
  "dashboard rebuild",
  "placeholders only"
];
const chromeBlobLower = (shellWs + shellCustom + todayHtml + ws).toLowerCase();
bannedDev.forEach(function (term) {
  assert("no developer chrome: " + term, chromeBlobLower.indexOf(term) < 0);
});

const banned = ["you should", "do this", "homework", "assignment"];
banned.forEach(function (term) {
  assert("no banned chrome: " + term, chromeBlobLower.indexOf(term) < 0);
});

const navSandbox = {
  window: {},
  document: {
    readyState: "complete",
    querySelector: () => null,
    addEventListener: () => {},
    documentElement: { classList: { toggle() {} } }
  },
  console,
  location: { pathname: "/apps/dashboard/", hash: "#/" }
};
navSandbox.window = navSandbox;
navSandbox.global = navSandbox;
navSandbox.WDS = {};
load("design-system/js/platform/wds-app-nav-config.js", navSandbox);
load("design-system/js/platform/wds-app-nav.js", navSandbox);

const Nav = navSandbox.WDS.appNav;
const dash = Nav.byId("dashboard");
assert("nav title Home", dash && dash.title === "Home");
assert("nav has workspace feature", dash.features.some((f) => f.id === "workspace"));
assert("nav has customize feature", dash.features.some((f) => f.id === "customize"));
assert("nav omits kiosk feature", !dash.features.some((f) => f.id === "kiosk"));
assert("homePrimary is three products", (navSandbox.WDS.APP_NAV_CONFIG.homePrimary || []).join(",") === "home,scenes,sheds");

console.log("\n" + passed + " passed, " + failures.length + " failed");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
