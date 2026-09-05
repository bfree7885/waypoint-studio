#!/usr/bin/env node
/**
 * Prepare a dedicated shedhunting.org static artifact.
 *
 * Output: dist/shedhunting/
 *   /           overview (focused product shell)
 *   /map/       field map
 *   css/, js/, gis/, data/, vendor/
 *
 * Does not change DNS, CNAME, or push sheds-site.
 *
 * Usage: node scripts/prepare-shed-hunting-host.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = path.join(ROOT, "apps/shed-hunting");
const DEST = path.join(ROOT, "dist/shedhunting");

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(from, to, depth) {
  depth = depth || 0;
  fs.mkdirSync(to, { recursive: true });
  for (const ent of fs.readdirSync(from, { withFileTypes: true })) {
    if (ent.name === "host") continue;
    // Design-history exploration only — keep in Studio source, never publish.
    if (ent.name === "antler-options") continue;
    if (depth === 0 && ent.name === "index.html") continue;
    const src = path.join(from, ent.name);
    const dst = path.join(to, ent.name);
    if (ent.isDirectory()) copyDir(src, dst, depth + 1);
    else fs.copyFileSync(src, dst);
  }
}

function rewriteHostOverview(html, origins) {
  let out = html;
  out = out.replace(/<html\b([^>]*)>/i, function (m, attrs) {
    if (/data-shed-host=/.test(attrs)) return m;
    return "<html" + attrs + ' data-shed-host="1">';
  });
  out = out.replace(/\.\.\/vendor\//g, "vendor/");
  out = out.replace(/\.\.\/css\//g, "css/");
  out = out.replace(/\.\.\/js\//g, "js/");
  out = out.replace(/href="\.\.\/map\/"/g, 'href="map/"');
  out = out.replace(/href="\.\.\/"/g, 'href="./"');
  const studio = String(origins.studioOrigin || "https://waypointstudio.org").replace(/\/+$/, "");
  const shed = String(origins.shedOrigin || "https://shedhunting.org").replace(/\/+$/, "");
  if (!/rel=["']canonical["']/i.test(out)) {
    out = out.replace(/<\/title>/i, "</title>\n  <link rel=\"canonical\" href=\"" + shed + "/\">");
  }
  out = out.replace(
    /href="(\/(?:apps\/dashboard\/|articles\/|support\.html|about\.html|privacy\.html|terms\.html|contact\.html|knowledge\.html)[^"]*)"/g,
    function (_, p) {
      return 'href="' + studio + p + '"';
    }
  );
  out = out.replace(
    /(<a[^>]*data-powered-by-waypoint[^>]*href=")([^"]*)(")/,
    "$1" + studio + "/$3"
  );
  return out;
}

function rewriteMap(html, origins) {
  let out = html;
  out = out.replace(/<html\b([^>]*)>/i, function (m, attrs) {
    if (/data-shed-host=/.test(attrs)) return m;
    return "<html" + attrs + ' data-shed-host="1">';
  });
  const studio = String(origins.studioOrigin || "https://waypointstudio.org").replace(/\/+$/, "");
  const shed = String(origins.shedOrigin || "https://shedhunting.org").replace(/\/+$/, "");
  out = out.replace(
    /<meta\s+name=["']robots["'][^>]*>/i,
    '<meta name="robots" content="index, follow">'
  );
  if (!/rel=["']canonical["']/i.test(out)) {
    out = out.replace(/<\/title>/i, "</title>\n  <link rel=\"canonical\" href=\"" + shed + "/map/\">");
  }
  out = out.replace(/\s*<noscript>[\s\S]*?shedhunting\.org\/map\/[\s\S]*?<\/noscript>/i, "");
  out = out.replace(/\s*<div\b[^>]*\bid=["']sheds-studio-cutover["'][^>]*>[\s\S]*?<\/div>/i, "");
  out = out.replace(
    /\s*<script>\s*\(function\s*\(\)\s*\{\s*var C = window\.WaypointShedsCutover;\s*if \(C && !C\.shouldStay\(\)\) C\.showFallback\(document\.getElementById\(["']sheds-studio-cutover["']\)\);\s*\}\)\(\);\s*<\/script>/,
    ""
  );
  out = out.replace(
    /href="(\/(?:apps\/dashboard\/|articles\/|support\.html|about\.html|privacy\.html|terms\.html|contact\.html|knowledge\.html)[^"]*)"/g,
    function (_, p) {
      return 'href="' + studio + p + '"';
    }
  );
  out = out.replace(
    /(<a[^>]*data-powered-by-waypoint[^>]*href=")([^"]*)(")/,
    '$1' + studio + '/$3'
  );
  return injectTileMeta(out);
}

function injectTileMeta(html) {
  const tileCfg = (process.env.WAYPOINT_MAP_TILE_CONFIG || "").trim();
  if (!tileCfg || tileCfg.charAt(0) !== "{") return html;
  const safe = tileCfg.replace(/</g, "\\u003c");
  if (/<meta\s+name="waypoint-map-tiles"/i.test(html)) {
    return html.replace(
      /<meta\s+name="waypoint-map-tiles"[^>]*>/i,
      '<meta name="waypoint-map-tiles" content=\'' + safe + "'>"
    );
  }
  return html.replace(
    /(<meta\s+charset=[^>]*>)/i,
    "$1\n  <meta name=\"waypoint-map-tiles\" content='" + safe + "'>"
  );
}

function main() {
  const origins = readJson("design-system/ecosystem/origin-config.json");
  const sync = spawnSync(process.execPath, [path.join(ROOT, "scripts/sync-shed-hunting-wds.mjs")], {
    cwd: ROOT,
    stdio: "inherit"
  });
  if (sync.status !== 0) process.exit(sync.status || 1);

  rmrf(DEST);
  fs.mkdirSync(DEST, { recursive: true });
  copyDir(APP, DEST);

  const overviewSrc = fs.readFileSync(path.join(APP, "host/index.html"), "utf8");
  fs.writeFileSync(path.join(DEST, "index.html"), rewriteHostOverview(overviewSrc, origins));

  const mapSrc = fs.readFileSync(path.join(DEST, "map/index.html"), "utf8");
  fs.writeFileSync(path.join(DEST, "map/index.html"), rewriteMap(mapSrc, origins));

  fs.writeFileSync(path.join(DEST, ".nojekyll"), "");
  fs.writeFileSync(
    path.join(DEST, "robots.txt"),
    "User-agent: *\nAllow: /\n\nSitemap: https://shedhunting.org/sitemap.xml\n"
  );
  fs.writeFileSync(
    path.join(DEST, "sitemap.xml"),
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
      "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n" +
      "  <url><loc>https://shedhunting.org/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n" +
      "  <url><loc>https://shedhunting.org/map/</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>\n" +
      "</urlset>\n"
  );
  fs.writeFileSync(
    path.join(DEST, "404.html"),
    "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta http-equiv=\"refresh\" content=\"0; url=./\"><title>Not found</title></head><body><p>That page is not on ShedHunting.org. <a href=\"./\">Return to Shed Hunting</a>.</p></body></html>\n"
  );

  if (fs.existsSync(path.join(DEST, "CNAME"))) {
    console.error("prepare-shed-hunting-host: dist must not contain a CNAME (Studio CNAME is waypointstudio.org)");
    process.exit(1);
  }

  const leftover = [];
  const deepTraversal = [];
  function scan(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) scan(p);
      else if (/\.(html|css|js)$/.test(ent.name)) {
        const text = fs.readFileSync(p, "utf8");
        if (text.includes("../../../design-system") || text.includes("../../design-system")) {
          leftover.push(path.relative(DEST, p));
        }
        if (/\.\.\/\.\.\//.test(text) || /\.\.\/\.\.\/\.\.\//.test(text)) {
          deepTraversal.push(path.relative(DEST, p));
        }
      }
    }
  }
  scan(DEST);
  if (leftover.length) {
    console.error("prepare-shed-hunting-host: design-system traversal remains in", leftover);
    process.exit(1);
  }
  if (deepTraversal.length) {
    console.error("prepare-shed-hunting-host: ../../ asset paths remain in", deepTraversal);
    process.exit(1);
  }
  console.log("wrote", path.relative(ROOT, DEST));
}

main();
