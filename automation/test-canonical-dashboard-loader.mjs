#!/usr/bin/env node
/**
 * Fail if legacy Dashboard modules return to the live Home loader.
 * Authority: Turnaround Sprint 4 — canonical Rebuild loader.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

let failed = 0;
function assert(name, cond) {
  if (cond) console.log("PASS", name);
  else {
    console.error("FAIL", name);
    failed += 1;
  }
}

const homeLoader = fs.readFileSync(path.join(ROOT, "design-system/js/wds-home.js"), "utf8");
const rootHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const dashHtml = fs.readFileSync(path.join(ROOT, "apps/dashboard/index.html"), "utf8");
const wdsJs = fs.readFileSync(path.join(ROOT, "design-system/js/wds.js"), "utf8");

const moduleBlock = (homeLoader.match(/HOME_MODULES\s*=\s*\[([\s\S]*?)\];/) || [])[1] || "";
const modules = [...moduleBlock.matchAll(/"([^"]+\.js)"/g)].map((m) => m[1]);

assert("wds-home exposes module list", modules.length >= 40 && modules.length <= 80);
assert("root uses wds-home.js", /wds-home\.js/.test(rootHtml));
assert("dashboard alias uses wds-home.js", /wds-home\.js/.test(dashHtml));
assert("root does not load full wds.js", !/design-system\/js\/wds\.js/.test(rootHtml));
assert("dashboard does not load full wds.js", !/design-system\/js\/wds\.js/.test(dashHtml));
assert("root and dashboard share home-boot", /home-boot\.js/.test(rootHtml) && /home-boot\.js/.test(dashHtml));

const banned = [
  "dashboard/os/",
  "dashboard/v2/",
  "dashboard/v3/",
  "wds-dashboard-recovery",
  "wds-happening-now",
  "wds-dashboard-engine",
  "wds-content-engine",
  "dashboard/wds-dashboard-widgets",
  "dashboard/wds-dashboard-catalog",
  "dashboard/wds-dashboard-v2",
  "wds-dashboard.js"
];

banned.forEach((b) => {
  if (b === "wds-dashboard.js") {
    assert("home loader omits " + b, !modules.includes("wds-dashboard.js"));
    return;
  }
  assert("home loader omits " + b, !moduleBlock.includes(b));
});

// Stronger banned checks against raw loader source
assert("no Outdoor OS path", !/dashboard\/os\//.test(moduleBlock));
assert("no V2 path", !/dashboard\/v2\//.test(moduleBlock));
assert("no V3 path", !/dashboard\/v3\//.test(moduleBlock));
assert("no Recovery module", !/wds-dashboard-recovery/.test(moduleBlock));
assert("no happening-now", !/wds-happening-now/.test(moduleBlock));
assert("no V1 wds-dashboard.js", !/"wds-dashboard\.js"/.test(moduleBlock));
assert("no dashboard-engine", !/wds-dashboard-engine/.test(moduleBlock));
assert("includes rebuild shell", /wds-dashboard-rebuild\.js/.test(moduleBlock));
assert("includes rebuild customize", /wds-dashboard-rebuild-customize\.js/.test(moduleBlock));
assert("includes rebuild kiosk", /wds-dashboard-rebuild-kiosk\.js/.test(moduleBlock));
assert("includes deepeners", /wds-dashboard-rebuild-deepeners\.js/.test(moduleBlock));
assert("includes OIP service", /wds-oip-service\.js/.test(moduleBlock));
assert("includes weather service", /wds-weather-service\.js/.test(moduleBlock));

assert("mega wds.js omits Outdoor OS", !/dashboard\/os\//.test(wdsJs));
assert("mega wds.js omits V2", !/dashboard\/v2\//.test(wdsJs));
assert("mega wds.js omits V3", !/dashboard\/v3\//.test(wdsJs));
assert("mega wds.js omits Recovery", !/wds-dashboard-recovery/.test(wdsJs));
assert("legacy note exists", fs.existsSync(path.join(ROOT, "design-system/js/dashboard/LEGACY-NOT-LOADED.md")));

// Every listed module must exist
modules.forEach((rel) => {
  assert("exists " + rel, fs.existsSync(path.join(ROOT, "design-system/js", rel)));
});

if (failed) {
  console.error("\n" + failed + " assertion(s) failed.");
  process.exit(1);
}
console.log("\nAll canonical dashboard loader tests passed (" + (modules.length + 20) + "+ checks).");
