#!/usr/bin/env node
/**
 * Prepare a dedicated shedhunting.org static artifact (Phase 2 — do not deploy).
 *
 * Output: dist/shedhunting/
 *   /           overview (focused product shell)
 *   /map/       field map
 *   css/, js/, gis/, data/, vendor/
 *
 * Does not change DNS, CNAME, or production redirects.
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

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const ent of fs.readdirSync(from, { withFileTypes: true })) {
    if (ent.name === "host") continue;
    const src = path.join(from, ent.name);
    const dst = path.join(to, ent.name);
    if (ent.isDirectory()) copyDir(src, dst);
    else fs.copyFileSync(src, dst);
  }
}

function rewriteHostOverview(html, origins) {
  let out = html;
  out = out.replace(/<html\b([^>]*)>/i, function (m, attrs) {
    if (/data-shed-host=/.test(attrs)) return m;
    return "<html" + attrs + ' data-shed-host="1">';
  });
  out = out.replace(/content="noindex, nofollow"/i, 'content="index, follow"');
  out = out.replace(/\.\.\/vendor\//g, "vendor/");
  out = out.replace(/\.\.\/css\//g, "css/");
  out = out.replace(/\.\.\/js\//g, "js/");
  out = out.replace(/href="\.\.\/map\/"/g, 'href="map/"');
  out = out.replace(/href="\.\.\/"/g, 'href="./"');
  out = out.replace(
    /This page is the dedicated-host overview template[\s\S]*?<\/p>/,
    "Private field notes stay on this device. Exact find coordinates stay private."
  );
  const studio = String(origins.studioOrigin || "https://waypointstudio.org").replace(/\/+$/, "");
  out = out.replace(
    /href="(\/(?:apps\/dashboard\/|articles\/|support\.html|about\.html|privacy\.html|terms\.html|contact\.html|knowledge\.html)[^"]*)"/g,
    function (_, p) {
      return 'href="' + studio + p + '"';
    }
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
  return out;
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

  const leftover = [];
  function scan(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) scan(p);
      else if (/\.(html|css|js)$/.test(ent.name)) {
        const text = fs.readFileSync(p, "utf8");
        if (text.includes("../../../design-system") || text.includes("../../design-system")) {
          leftover.push(path.relative(DEST, p));
        }
      }
    }
  }
  scan(DEST);
  if (leftover.length) {
    console.error("prepare-shed-hunting-host: design-system traversal remains in", leftover);
    process.exit(1);
  }
  console.log("wrote", path.relative(ROOT, DEST));
}

main();
