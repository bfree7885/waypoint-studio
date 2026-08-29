#!/usr/bin/env node
/**
 * Shed Hunting Phase 2 — current production architecture + dedicated-host readiness.
 *
 * A. Phase 1 production: same-origin Studio paths, no live shedhunting.org hrefs,
 *    Scenes unpublished, overview → map, /map/ is the Sheds alias.
 * B. Future host readiness: origin helper, vendored assets, prepare-host artifact,
 *    no design-system traversal on map / dist, canonical not flipped early.
 *
 * Run: node automation/test-shedhunting-host-readiness.mjs
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
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

function loadOrigins(extraConfig) {
  const sandbox = { console };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.location = { hostname: "", pathname: "/", href: "https://waypointstudio.org/" };
  sandbox.document = {
    documentElement: { getAttribute: function () { return null; } },
    readyState: "complete",
    addEventListener: function () {},
    querySelectorAll: function () { return []; }
  };
  vm.runInNewContext(read("design-system/js/platform/wds-origins.js"), sandbox, {
    filename: "wds-origins.js"
  });
  if (extraConfig) sandbox.WDS.ORIGIN_CONFIG = extraConfig;
  return sandbox;
}

function loadNav() {
  const sandbox = { globalThis: {} };
  sandbox.global = sandbox;
  sandbox.window = sandbox;
  sandbox.location = { pathname: "/", hash: "", hostname: "waypointstudio.org" };
  vm.runInNewContext(read("design-system/js/platform/wds-app-nav-config.js"), sandbox, {
    filename: "wds-app-nav-config.js"
  });
  vm.runInNewContext(read("design-system/js/platform/wds-app-nav.js"), sandbox, {
    filename: "wds-app-nav.js"
  });
  return sandbox;
}

const originCfg = JSON.parse(read("design-system/ecosystem/origin-config.json"));
const navReg = JSON.parse(read("design-system/ecosystem/nav-registry.json"));
const contact = JSON.parse(read("design-system/ecosystem/contact-config.json"));
const overview = read("apps/shed-hunting/index.html");
const mapHtml = read("apps/shed-hunting/map/index.html");
const hostHtml = read("apps/shed-hunting/host/index.html");
const mapAlias = read("map/index.html");
const shedsAlias = read("sheds/index.html");

assert("origin flag is false", originCfg.shedDedicatedHostEnabled === false);
assert("studioOrigin is waypointstudio.org", originCfg.studioOrigin === "https://waypointstudio.org");
assert("shedOrigin is documented", originCfg.shedOrigin === "https://shedhunting.org");
assert(
  "nav-registry origins match flag",
  navReg.origins &&
    navReg.origins.shedDedicatedHostEnabled === false &&
    navReg.origins.shedOrigin === originCfg.shedOrigin
);
assert(
  "nav-config origins match origin-config",
  /"shedDedicatedHostEnabled": false/.test(read("design-system/js/platform/wds-app-nav-config.js")) &&
    /"shedOrigin": "https:\/\/shedhunting\.org"/.test(read("design-system/js/platform/wds-app-nav-config.js"))
);

const originsJs = read("design-system/js/platform/wds-origins.js");
assert("origins helper embeds flag false", /shedDedicatedHostEnabled:\s*false/.test(originsJs));
assert("origins helper does not default-enable dedicated host", !/shedDedicatedHostEnabled:\s*true/.test(originsJs));

const off = loadOrigins();
assert(
  "flag off → Studio sheds href",
  off.WDS.origins.shedHuntingPublicHref() === "/apps/shed-hunting/",
  off.WDS.origins.shedHuntingPublicHref()
);
assert(
  "flag off → Studio map href",
  off.WDS.origins.shedHuntingMapHref() === "/apps/shed-hunting/map/",
  off.WDS.origins.shedHuntingMapHref()
);
assert("flag off isShedHost false on studio", off.WDS.origins.isShedHost() === false);
assert("flag off powered-by is /", off.WDS.origins.poweredByWaypointHref() === "/");

const on = loadOrigins(Object.assign({}, originCfg, { shedDedicatedHostEnabled: true }));
assert(
  "flag on → dedicated overview href",
  on.WDS.origins.shedHuntingPublicHref() === "https://shedhunting.org/",
  on.WDS.origins.shedHuntingPublicHref()
);
assert(
  "flag on → dedicated map href",
  on.WDS.origins.shedHuntingMapHref() === "https://shedhunting.org/map/",
  on.WDS.origins.shedHuntingMapHref()
);

const nav = loadNav();
assert(
  "appNav sheds href stays same-origin while flag false",
  nav.WDS.appNav.shedHuntingPublicHref() === "/apps/shed-hunting/"
);
nav.WDS.APP_NAV_CONFIG.origins.shedDedicatedHostEnabled = true;
assert(
  "appNav sheds href follows flag on",
  nav.WDS.appNav.shedHuntingPublicHref() === "https://shedhunting.org/"
);

assert("overview Open Map is relative map/", /href="map\/"/.test(overview));
assert("overview is not noindex", !/noindex/i.test(overview));
assert("overview still uses Studio shell", /data-wds-app-shell/.test(overview));
assert(
  "map has no design-system traversal",
  !/\.\.\/\.\.\/\.\.\/design-system/.test(mapHtml) && !/\.\.\/\.\.\/design-system/.test(mapHtml)
);
assert("map vendors experience-v2", /vendor\/wds\/wds-experience-v2\.css/.test(mapHtml));
assert("map loads origin helper", /vendor\/wds\/wds-origins\.js/.test(mapHtml));
assert("map studio links are site-root", /href="\/support\.html"/.test(mapHtml) && /href="\/privacy\.html"/.test(mapHtml));
assert("map has data-studio-path", /data-studio-path="\/support\.html"/.test(mapHtml));
assert("map has Powered by Waypoint hook", /data-powered-by-waypoint/.test(mapHtml));
assert("host template is noindex", /noindex/i.test(hostHtml));
assert("host template is focused (no studio shell)", !/data-wds-app-shell/.test(hostHtml));
assert("host template Open Map is relative", /href="\.\.\/map\/"/.test(hostHtml));
assert("host template has Powered by Waypoint", /data-powered-by-waypoint/.test(hostHtml));

assert(
  "current /map/ alias targets Sheds map",
  /\/apps\/shed-hunting\/map\//.test(mapAlias) && /noindex/i.test(mapAlias)
);
assert(
  "current /sheds/ alias targets Sheds map (legacy)",
  /apps\/shed-hunting\/map\//.test(shedsAlias)
);
assert(
  "Phase 2 docs record /map/ conflict",
  /\/map\//.test(read("docs/sheds/SHEDHUNTING-ORG-PHASE-2.md")) &&
    /conflict/i.test(read("docs/sheds/SHEDHUNTING-ORG-PHASE-2.md"))
);

assert("overview has no shedhunting.org canonical", !/shedhunting\.org/.test(overview));
assert("map has no shedhunting.org canonical", !/rel=["']canonical["'][^>]*shedhunting\.org/i.test(mapHtml));
assert("sitemap still lists Studio sheds overview", /waypointstudio\.org\/apps\/shed-hunting\//.test(read("sitemap.xml")));
assert("sitemap does not list shedhunting.org", !/shedhunting\.org/.test(read("sitemap.xml")));
assert("robots disallow host preview", /Disallow: \/apps\/shed-hunting\/host\//.test(read("robots.txt")));
assert("robots still disallows scenes", /Disallow: \/apps\/scenes\//.test(read("robots.txt")));

const publicHrefRoots = [
  "index.html",
  "about.html",
  "support.html",
  "404.html",
  "apps/shed-hunting/index.html",
  "apps/shed-hunting/map/index.html",
  "apps/dashboard/index.html",
  "js/studio-home.js"
];
for (const rel of publicHrefRoots) {
  assert(
    rel + " has no live https://shedhunting.org href",
    !/https:\/\/shedhunting\.org/i.test(read(rel))
  );
}
assert(
  "primary nav Shed Hunting href is not the future host",
  (navReg.studioPrimaryNav || []).every((i) => !/shedhunting\.org/i.test(i.href || ""))
);
assert(
  "origin-config may name the future host without enabling it",
  originCfg.shedOrigin === "https://shedhunting.org" && originCfg.shedDedicatedHostEnabled === false
);

assert("Scenes omitted from primary nav", !navReg.studioPrimaryNav.some((i) => i.id === "scenes"));
assert("Scenes still a contact app", (contact.apps || []).some((a) => a.id === "scenes"));
assert(
  "contact documents Scenes compatibility",
  /unpublished Scenes URLs stay reachable/i.test(contact.scenesContactCompatibility || "")
);

const articles = JSON.parse(read("data/articles/articles.json"));
const articleList = articles.articles || articles.items || [];
assert("articles feed is non-empty", Array.isArray(articleList) && articleList.length > 0, String(articleList.length));
const blockedRelated = [];
for (const article of articleList) {
  for (const rel of article.relatedProducts || []) {
    if (rel && (rel.id === "scenes" || rel.id === "photo-coach" || rel.id === "hidden-landscapes")) {
      blockedRelated.push((article.id || article.title) + ":" + rel.id);
    }
  }
}
assert("generated articles have no Scenes relatedProducts", blockedRelated.length === 0, blockedRelated.slice(0, 8).join(", "));
const hasDashboard = articleList.some((a) => (a.relatedProducts || []).some((p) => p.id === "dashboard"));
assert("articles still relate Dashboard where useful", hasDashboard);
assert("DFD hub still public", fs.existsSync(path.join(ROOT, "deep-forest-dispatch/index.html")));

const sync = spawnSync(process.execPath, [path.join(ROOT, "scripts/sync-shed-hunting-wds.mjs")], {
  cwd: ROOT,
  encoding: "utf8"
});
assert("sync-shed-hunting-wds exits 0", sync.status === 0, (sync.stderr || sync.stdout || "").slice(-400));

const vendorCss = read("apps/shed-hunting/vendor/wds/wds-experience-v2.css");
const sourceCss = read("design-system/css/wds-experience-v2.css");
assert("vendored experience-v2 matches design-system", vendorCss === sourceCss);
const vendorOrigins = read("apps/shed-hunting/vendor/wds/wds-origins.js");
assert("vendored origins matches design-system", vendorOrigins === originsJs);

const prep = spawnSync(process.execPath, [path.join(ROOT, "scripts/prepare-shed-hunting-host.mjs")], {
  cwd: ROOT,
  encoding: "utf8"
});
assert("prepare-host script exits 0", prep.status === 0, (prep.stderr || prep.stdout || "").slice(-500));
const distIndex = path.join(ROOT, "dist/shedhunting/index.html");
const distMap = path.join(ROOT, "dist/shedhunting/map/index.html");
assert("dist overview exists", fs.existsSync(distIndex));
assert("dist map exists", fs.existsSync(distMap));
const distIndexHtml = fs.readFileSync(distIndex, "utf8");
const distMapHtml = fs.readFileSync(distMap, "utf8");
assert("dist overview is shed host", /data-shed-host="1"/.test(distIndexHtml));
assert("dist overview Open Map is map/", /href="map\/"/.test(distIndexHtml));
assert("dist overview has no design-system traversal", !/design-system\//.test(distIndexHtml));
assert("dist map has no design-system traversal", !/design-system\//.test(distMapHtml));
assert(
  "dist map Support points at Studio origin",
  /https:\/\/waypointstudio\.org\/support\.html/.test(distMapHtml)
);
assert(
  "dist overview Powered by Waypoint points at Studio",
  /data-powered-by-waypoint[^>]*href="https:\/\/waypointstudio\.org\/"/.test(distIndexHtml)
);
assert(
  "dist map Powered by Waypoint points at Studio",
  /data-powered-by-waypoint[^>]*href="https:\/\/waypointstudio\.org\/"/.test(distMapHtml)
);
assert("dist is not in sitemap", !/dist\/shedhunting/.test(read("sitemap.xml")));
assert(
  "GIS pack URL stays app-relative",
  /url:\s*"\.\.\/gis\/packs\/pa-pike-milford-v1\.json"/.test(read("apps/shed-hunting/js/sheds-gis-pack.js"))
);
assert("export JSON still exists for class B migration", /sheds-field-private\.json/.test(read("apps/shed-hunting/js/sheds-map-app.js")));
assert("import JSON is available on the map", /id="btn-import"/.test(mapHtml) && /sheds-import-json\.js/.test(mapHtml));
assert("dist map includes Import JSON", /id="btn-import"/.test(distMapHtml));
assert("dist map loads import module", /sheds-import-json\.js/.test(distMapHtml));
assert("dist has .nojekyll", fs.existsSync(path.join(ROOT, "dist/shedhunting/.nojekyll")));
assert("dist has no CNAME", !fs.existsSync(path.join(ROOT, "dist/shedhunting/CNAME")));
assert("dist robots disallow until DNS", /Disallow: \//.test(read("dist/shedhunting/robots.txt")));
assert("dist overview stays noindex in Phase 3A", /noindex/.test(distIndexHtml));
assert("dist overview and map are shed hosts", /data-shed-host="1"/.test(distIndexHtml) && /data-shed-host="1"/.test(distMapHtml));
assert("dist overview has no ../../ paths", !/\.\.\/\.\.\//.test(distIndexHtml));
assert("dist map has no ../../ paths", !/\.\.\/\.\.\//.test(distMapHtml));
assert("dist map Support is Studio origin, not site-root", !/href="\/support\.html"/.test(distMapHtml));
assert("dist map Terms points at Studio", /https:\/\/waypointstudio\.org\/terms\.html/.test(distMapHtml));
assert("dist map Contact points at Studio", /https:\/\/waypointstudio\.org\/contact\.html/.test(distMapHtml));
assert("dist overview has no Scenes nav", !/Scenes/.test(distIndexHtml) && !/\/apps\/scenes\//.test(distIndexHtml));
assert("dist has no paywall copy", !/Free\/Pro|paywall|subscribe now/i.test(distIndexHtml + distMapHtml));
assert("origin flag remains false after Phase 3A", originCfg.shedDedicatedHostEnabled === false);
assert("CNAME remains waypointstudio.org", /^\s*waypointstudio\.org\s*$/m.test(read("CNAME")));
assert("pages workflow still deploys this repo to Pages", /Deploy GitHub Pages/.test(read(".github/workflows/pages.yml")));
assert("companion publish workflow is dispatch-only", /workflow_dispatch/.test(read(".github/workflows/shedhunting-host.yml")) && !/branches:\s*\[main\]/.test(read(".github/workflows/shedhunting-host.yml")));
assert("publish script targets sheds-site", /bfree7885\/sheds-site/.test(read("scripts/publish-shed-hunting-host.mjs")));
assert("publish script keeps shedhunting.org CNAME", /shedhunting\.org/.test(read("scripts/publish-shed-hunting-host.mjs")) && /writeFileSync\(path\.join\(tmp, "CNAME"\)/.test(read("scripts/publish-shed-hunting-host.mjs")));
assert("publish refuses watermarked cutover", /Refusing to publish a watermarked host/.test(read("scripts/publish-shed-hunting-host.mjs")));

function localRefs(html) {
  const out = [];
  const re = /(?:href|src)="((?!https?:|mailto:|data:|#)[^"]+)"/gi;
  let m;
  while ((m = re.exec(html))) out.push(m[1].split("?")[0]);
  return out;
}
const missing = [];
[["index.html", distIndexHtml], ["map/index.html", distMapHtml]].forEach(function (pair) {
  const fromDir = path.join(ROOT, "dist/shedhunting", path.dirname(pair[0]));
  localRefs(pair[1]).forEach(function (ref) {
    if (ref.startsWith("/")) return;
    const resolved = path.normalize(path.join(fromDir, ref));
    const distRoot = path.join(ROOT, "dist/shedhunting");
    if (!resolved.startsWith(distRoot)) missing.push(pair[0] + " -> " + ref);
    else if (!fs.existsSync(resolved)) missing.push(pair[0] + " -> " + ref);
  });
});
assert("dist HTML local assets exist", missing.length === 0, missing.slice(0, 8).join("; "));
assert(
  "GIS pack file is in dist",
  fs.existsSync(path.join(ROOT, "dist/shedhunting/gis/packs/pa-pike-milford-v1.json"))
);
assert(
  "vendored WDS css/js and leaflet exist",
  fs.existsSync(path.join(ROOT, "dist/shedhunting/vendor/wds/wds-experience-v2.css")) &&
    fs.existsSync(path.join(ROOT, "dist/shedhunting/vendor/wds/wds-origins.js")) &&
    fs.existsSync(path.join(ROOT, "dist/shedhunting/vendor/leaflet/leaflet.js"))
);

if (failures.length) {
  console.error("\n" + failures.length + " failure(s).");
  process.exit(1);
}
console.log("\nShed Hunting host-readiness checks passed (" + passed + ").");
