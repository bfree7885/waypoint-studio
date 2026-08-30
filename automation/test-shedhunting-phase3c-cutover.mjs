#!/usr/bin/env node
/**
 * Shed Hunting Phase 3C cutover — Studio routes, flag, no redirect loops.
 * Run: node automation/test-shedhunting-phase3c-cutover.mjs
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function loadCutover(loc) {
  const sandbox = { console };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.location = {
    hostname: loc.hostname || "",
    search: loc.search || "",
    hash: loc.hash || "",
    href: loc.href || "https://waypointstudio.org/",
    replace: function (url) {
      sandbox.__replaced = url;
    }
  };
  sandbox.document = {
    documentElement: {
      getAttribute: function (name) {
        return loc.shedHost ? "1" : null;
      }
    }
  };
  vm.runInNewContext(read("apps/shed-hunting/js/sheds-studio-cutover.js"), sandbox, {
    filename: "sheds-studio-cutover.js"
  });
  return sandbox;
}

const origin = JSON.parse(read("design-system/ecosystem/origin-config.json"));
assert("shedDedicatedHostEnabled is true", origin.shedDedicatedHostEnabled === true);
assert("studioOrigin unchanged", origin.studioOrigin === "https://waypointstudio.org");
assert("shedOrigin is shedhunting.org", origin.shedOrigin === "https://shedhunting.org");
assert("CNAME remains waypointstudio.org", /^\s*waypointstudio\.org\s*$/m.test(read("CNAME")));

const overview = loadCutover({ hostname: "waypointstudio.org" });
assert(
  "studio overview redirects to shedhunting.org/",
  overview.WaypointShedsCutover.redirectLegacyStudio(overview.WaypointShedsCutover.OVERVIEW) === true &&
    overview.__replaced === "https://shedhunting.org/",
  overview.__replaced
);

const studioMap = loadCutover({ hostname: "waypointstudio.org" });
assert(
  "studio map redirects to shedhunting.org/map/",
  studioMap.WaypointShedsCutover.redirectLegacyStudio(studioMap.WaypointShedsCutover.MAP) === true &&
    studioMap.__replaced === "https://shedhunting.org/map/",
  studioMap.__replaced
);

const withQuery = loadCutover({ hostname: "waypointstudio.org", search: "?from=nav", hash: "#notes" });
assert(
  "query and hash are preserved",
  withQuery.WaypointShedsCutover.redirectLegacyStudio(withQuery.WaypointShedsCutover.OVERVIEW) === true &&
    withQuery.__replaced === "https://shedhunting.org/?from=nav#notes",
  withQuery.__replaced
);

const localFlag = loadCutover({ hostname: "waypointstudio.org", search: "?local=1" });
assert(
  "?local=1 stays on Studio",
  localFlag.WaypointShedsCutover.redirectLegacyStudio(localFlag.WaypointShedsCutover.MAP) === false &&
    localFlag.__replaced == null
);

const loopback = loadCutover({ hostname: "127.0.0.1" });
assert(
  "loopback product pages stay (CI / local map)",
  loopback.WaypointShedsCutover.redirectLegacyStudio(loopback.WaypointShedsCutover.MAP) === false
);

const aliasLoopback = loadCutover({ hostname: "localhost" });
assert(
  "alias forcePublic redirects even on loopback",
  aliasLoopback.WaypointShedsCutover.redirectLegacyStudio(aliasLoopback.WaypointShedsCutover.MAP, {
    forcePublic: true
  }) === true && aliasLoopback.__replaced === "https://shedhunting.org/map/"
);

const shedHost = loadCutover({ hostname: "shedhunting.org" });
assert(
  "shedhunting.org does not redirect (no loop)",
  shedHost.WaypointShedsCutover.redirectLegacyStudio(shedHost.WaypointShedsCutover.MAP) === false
);

const wwwShed = loadCutover({ hostname: "www.shedhunting.org" });
assert(
  "www.shedhunting.org does not redirect",
  wwwShed.WaypointShedsCutover.redirectLegacyStudio(wwwShed.WaypointShedsCutover.OVERVIEW) === false
);

const attrHost = loadCutover({ hostname: "waypointstudio.org", shedHost: true });
assert(
  "data-shed-host document does not redirect",
  attrHost.WaypointShedsCutover.redirectLegacyStudio(attrHost.WaypointShedsCutover.MAP) === false
);

function destOf(html) {
  const m = html.match(/https:\/\/shedhunting\.org\/(?:map\/)?/);
  return m ? m[0] : "";
}

function isCutoverPage(html, dest) {
  return (
    /noindex/i.test(html) &&
    /rel=["']canonical["']/i.test(html) &&
    html.includes(dest) &&
    /http-equiv="refresh"/i.test(html) &&
    html.includes("url=" + dest) &&
    /location\.replace|redirectLegacyStudio/.test(html)
  );
}

const aliasMap = read("map/index.html");
const aliasSheds = read("sheds/index.html");
const studioOverview = read("apps/shed-hunting/index.html");
const studioMapHtml = read("apps/shed-hunting/map/index.html");

assert("Studio /map/ is a full static cutover to /map/", isCutoverPage(aliasMap, "https://shedhunting.org/map/"));
assert("Studio /sheds/ is a full static cutover to overview", isCutoverPage(aliasSheds, "https://shedhunting.org/"));
assert(
  "/map/ alias is not a Studio hop",
  !/url=\/apps\/shed-hunting\/map\//.test(aliasMap) && destOf(aliasMap) === "https://shedhunting.org/map/"
);
assert(
  "/sheds/ alias is overview not the old map hop",
  /rel="canonical" href="https:\/\/shedhunting\.org\/"/.test(aliasSheds) &&
    /url=https:\/\/shedhunting\.org\/"/.test(aliasSheds) &&
    !/url=\/apps\/shed-hunting\/map\//.test(aliasSheds)
);
assert(
  "overview has canonical + noindex + JS replace (no meta refresh — shared with local/CI)",
  /noindex/i.test(studioOverview) &&
    /rel=["']canonical["'][^>]*https:\/\/shedhunting\.org\//i.test(studioOverview) &&
    /redirectLegacyStudio/.test(studioOverview) &&
    !/http-equiv="refresh"/i.test(studioOverview)
);
assert(
  "map source has canonical + noindex + JS replace and no meta refresh (would loop on dedicated host)",
  /noindex/i.test(studioMapHtml) &&
    /rel=["']canonical["'][^>]*https:\/\/shedhunting\.org\/map\//i.test(studioMapHtml) &&
    /redirectLegacyStudio/.test(studioMapHtml) &&
    !/http-equiv="refresh"/i.test(studioMapHtml)
);
assert(
  "cutover destinations are never Studio shed paths",
  !/location\.replace\(["']\/apps\/shed-hunting/.test(aliasMap + aliasSheds + studioOverview + studioMapHtml)
);
assert(
  "migration guidance names Export/Import",
  /Existing field data can be moved by exporting from the old Waypoint Studio Shed Hunting page and importing it at ShedHunting\.org/.test(
    aliasMap + aliasSheds + studioOverview
  )
);
assert("export escape hatch is ?local=1", /local=1/.test(aliasMap) && /local=1/.test(aliasSheds) && /local=1/.test(studioOverview));
assert("Studio sitemap omits /apps/shed-hunting/", !/apps\/shed-hunting\//.test(read("sitemap.xml")));
assert("Studio sitemap omits /sheds/ and /map/", !/waypointstudio\.org\/sheds\//.test(read("sitemap.xml")) && !/waypointstudio\.org\/map\//.test(read("sitemap.xml")));

const nav = JSON.parse(read("design-system/ecosystem/nav-registry.json"));
assert(
  "primary nav Shed Hunting → https://shedhunting.org/",
  nav.studioPrimaryNav.some((i) => i.id === "sheds" && i.href === "https://shedhunting.org/")
);
assert(
  "no primary nav item points at legacy Studio sheds",
  nav.studioPrimaryNav.every((i) => !/\/apps\/shed-hunting\//.test(i.href || ""))
);
assert("Scenes still omitted from primary nav", !nav.studioPrimaryNav.some((i) => i.id === "scenes"));
assert(
  "nav order Dashboard, Shed Hunting, Deck, Articles, Support, About",
  nav.studioPrimaryNav.map((i) => i.label).join("|") ===
    "Dashboard|Shed Hunting|Deck|Articles|Support|About"
);

if (failures.length) {
  console.error("\n" + failures.length + " failure(s).");
  process.exit(1);
}
console.log("\nPhase 3C cutover checks passed (" + passed + ").");
