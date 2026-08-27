#!/usr/bin/env node
/**
 * Permanent ONE APP = ONE PRODUCT SURFACE gate.
 * App bodies must not become studio directories; cross-product lives in global nav.
 * Homepage (/) may introduce multiple products.
 *
 * Usage: node automation/test-app-surface-isolation.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

let failed = 0;
function pass(m) {
  console.log("PASS", m);
}
function fail(m) {
  console.error("FAIL", m);
  failed += 1;
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const arch = read("docs/APP-SURFACE-ARCHITECTURE.md");
if (!/ONE APP = ONE PRODUCT SURFACE/.test(arch)) fail("architecture doc missing rule title");
else pass("architecture doc present");
if (!/global nav only/i.test(arch) && !/Global nav/.test(arch)) fail("architecture doc missing global-nav rule");
else pass("architecture doc global nav rule");
if (!/Homepage/.test(arch)) fail("architecture doc missing homepage exception");
else pass("architecture doc homepage exception");

const ds = read("docs/DESIGN-SYSTEM-2.0.md");
if (!/ONE APP = ONE PRODUCT SURFACE/.test(ds) || !/APP-SURFACE-ARCHITECTURE/.test(ds)) {
  fail("DESIGN-SYSTEM-2.0 missing surface architecture section");
} else pass("DS 2.0 references surface architecture");

const products = read("docs/PRODUCT_STANDARDS.md");
if (!/ONE APP = ONE PRODUCT SURFACE/.test(products)) fail("PRODUCT_STANDARDS missing surface rule");
else pass("PRODUCT_STANDARDS surface rule");

const deepen = read("design-system/js/dashboard/rebuild/wds-dashboard-rebuild-deepeners.js");
const banned = [
  [/data-deepen="scenes"|Open Scenes/, "Dashboard deepeners must not promote Scenes"],
  [/data-deepen="sheds"|Open Sheds/, "Dashboard deepeners must not promote Sheds"],
  [/data-deepen="side-trails"|View all Side Trails|SIDE_TRAILS_CARDS/, "Dashboard deepeners must not promote Side Trails"],
  [/Field Notes|Featured Photography/, "Dashboard deepeners must not promote Articles/photography portfolio"],
  [/signalterrain|global-signals|Civic Trails|OpenRoad|openroad-pa/i, "Dashboard deepeners must not promote Side Trails projects"]
];
banned.forEach(function (pair) {
  if (pair[0].test(deepen)) fail(pair[1]);
  else pass("ban: " + pair[1].replace(/^Dashboard deepeners must not /, ""));
});
if (!/Waypoint.s Take|Waypoint\\u2019s Take|Waypoint’s Take/.test(deepen) && !/Waypoint\\u2019s Take/.test(deepen)) {
  /* file uses unicode escape */
  if (!/Waypoint\\u2019s Take/.test(deepen) && !/data-deepen="take"/.test(deepen)) {
    fail("Dashboard deepeners should keep Dashboard-native Take");
  } else pass("Dashboard-native Take retained");
} else pass("Dashboard-native Take retained");

const dashHtml = read("apps/dashboard/index.html");
if (!/data-product="dashboard"/.test(dashHtml)) fail("dashboard html missing data-product");
else pass("dashboard data-product");
if (/was-home__pathway|Enter the studio|Browse Side Trails/.test(dashHtml)) {
  fail("dashboard html embeds studio front-door pathways");
} else pass("dashboard html not a mini homepage");

const nav = read("design-system/js/platform/wds-app-nav-config.js");
if (!/"id": "dashboard"[\s\S]*?"href": "\/apps\/dashboard\/"/.test(nav)) {
  fail("global nav Dashboard href wrong");
} else pass("global nav Dashboard href");
if (!/"label": "Workspace"/.test(nav) || !/"label": "Customize"/.test(nav)) {
  fail("Dashboard local nav missing Workspace/Customize");
} else pass("Dashboard local nav Workspace/Customize");
if (!/"label": "Ambient"/.test(nav) || !/"hash": "#\/ambient"/.test(nav)) {
  fail("Dashboard local nav missing Ambient hash route");
} else pass("Dashboard local nav Ambient");

const home = read("index.html");
if (!/apps\/scenes\/|apps\/shed-hunting\/|articles\//.test(home)) {
  fail("homepage must still introduce sibling products");
} else pass("homepage may introduce products (exception)");

if (failed) {
  console.error("\nAPP SURFACE ISOLATION: FAIL (" + failed + ")");
  process.exit(1);
}
console.log("\nAPP SURFACE ISOLATION: PASS");
