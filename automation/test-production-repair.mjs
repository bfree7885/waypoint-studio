#!/usr/bin/env node
/**
 * Production repair regression tests
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import vm from "vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const failures = [];

function assert(name, cond, detail) {
  if (cond) console.log("PASS", name);
  else {
    failures.push(name + ": " + detail);
    console.log("FAIL", name, "—", detail || "");
  }
}

function load(file) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, file), "utf8"), { filename: file });
}

global.window = global;
global.document = {
  readyState: "complete",
  documentElement: { dataset: {} },
  addEventListener() {},
  createElement: () => ({ setAttribute() {}, style: {} }),
  body: { insertBefore() {} },
  getElementById: () => null
};
global.localStorage = {
  _s: {},
  getItem(k) {
    return this._s[k] || null;
  },
  setItem(k, v) {
    this._s[k] = String(v);
  },
  removeItem(k) {
    delete this._s[k];
  }
};

load("design-system/js/platform/wds-platform-boot.js");
assert("platformBoot present", !!(global.WDS && WDS.platformBoot && WDS.platformBoot.html));
const boot = WDS.platformBoot.html({
  product: "ForageCast",
  title: "What should I look for today?",
  detail: "test",
  status: "Starting…"
});
assert("boot has product", /ForageCast/.test(boot) && /wds-boot__eyebrow/.test(boot));
assert("boot has progress", /wds-boot__track/.test(boot));
const fail = WDS.platformBoot.failHtml({ product: "Savant Sommelier", title: "Could not finish loading" });
assert("fail has retry", /data-wds-boot-retry/.test(fail));

const foundation = fs.readFileSync(
  path.join(ROOT, "design-system/js/platform/wds-platform-foundation.js"),
  "utf8"
);
assert("routeHref strips slash", /return path\.slice\(1\)/.test(foundation));
assert(
  "old site-root return gone",
  !/path\.indexOf\("\/"\) === 0\) return path/.test(foundation)
);

const shedsRoutes = JSON.parse(
  fs.readFileSync(path.join(ROOT, "apps/shed-hunting/data/foundation.json"), "utf8")
).routes;
assert(
  "sheds map route relative",
  shedsRoutes.some((r) => r.path === "map/" && r.ready)
);
assert(
  "sheds no absolute map",
  !shedsRoutes.some((r) => r.path === "/map/")
);

const savant = fs.readFileSync(path.join(ROOT, "apps/savant-sommelier/index.html"), "utf8");
assert("savant boot shell", /wds-boot/.test(savant) && /Savant Sommelier/.test(savant));
assert("savant not empty busy", !/aria-busy="true"><\/div>/.test(savant.replace(/\s+/g, "")));

const fc = fs.readFileSync(path.join(ROOT, "apps/foragecast/index.html"), "utf8");
assert("foragecast boot shell", /wds-boot/.test(fc));
assert("foragecast no Opening outdoor", !/Opening outdoor intelligence/.test(fc));

const steepleaf = fs.readFileSync(path.join(ROOT, "apps/steepleaf/index.html"), "utf8");
assert("steepleaf boot branded", /wds-boot__eyebrow/.test(steepleaf) && /Steepleaf/.test(steepleaf));
assert("steepleaf no Preparing…", !/Preparing today’s tea briefing…/.test(steepleaf));

const stub = fs.readFileSync(path.join(ROOT, "apps/scenes/photo-coach/index.html"), "utf8");
assert("scenes photo-coach redirects", /refresh|location\.replace/.test(stub));

const nav = fs.readFileSync(path.join(ROOT, "design-system/js/platform/wds-app-nav-config.js"), "utf8");
assert("nav photo coach live path", /"href": "apps\/photo-coach\/"/.test(nav));

const home = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const dash = fs.readFileSync(path.join(ROOT, "apps/dashboard/index.html"), "utf8");
// Studio Homepage is the front door; outdoor workspace boots on Dashboard only.
assert(
  "home is studio front door",
  /data-product="studio-home"/.test(home) &&
    /studio-home\.js/.test(home) &&
    !/home-boot\.js/.test(home) &&
    !/wds-content-engine/.test(home)
);
assert(
  "dashboard progressive workspace boot",
  /was-shell/.test(dash) &&
    /home-boot\.js/.test(dash) &&
    /data-wds-region="workspace"/.test(dash) &&
    /Opening instruments|Opening workspace/.test(dash)
);
assert("dashboard is not a mini homepage", !/was-home-hero|Enter the studio/.test(dash));

const wds = fs.readFileSync(path.join(ROOT, "design-system/js/wds.js"), "utf8");
assert("wds loads platform-boot", /wds-platform-boot\.js/.test(wds));

const css = fs.readFileSync(path.join(ROOT, "design-system/css/wds.css"), "utf8");
assert("wds imports boot css", /wds-platform-boot\.css/.test(css));

[
  "docs/PRODUCTION-REPAIR-REPORT.md",
  "docs/PRODUCTION-REPAIR-CHANGELOG.md",
  "docs/PRODUCTION-ROUTING-MAP.md",
  "docs/PRODUCTION-SHARED-COMPONENT-CHANGES.md",
  "docs/PRODUCTION-CONTENT-CLEANUP.md",
  "docs/PRODUCTION-REMAINING-ISSUES.md",
  "docs/PRODUCTION-TECHNICAL-DEBT.md",
  "docs/PRODUCTION-DEPLOYMENT-CHECKLIST.md"
].forEach((rel) => {
  assert("exists " + rel, fs.existsSync(path.join(ROOT, rel)));
});

if (failures.length) {
  console.error("\n" + failures.length + " failure(s)");
  process.exit(1);
}
console.log("\nAll production repair tests passed.");
