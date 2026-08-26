#!/usr/bin/env node
/**
 * Pre-deploy static asset validation.
 *
 * Resolves HTML href/src/preload and CSS @import relative to the *referencing file*
 * (not the document URL — avoids axe-style false positives).
 *
 * Exit 1 if any required asset is missing.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SKIP_PREFIX = [
  "http://",
  "https://",
  "mailto:",
  "tel:",
  "data:",
  "javascript:",
  "#",
  "//"
];

const broken = [];
const checked = new Set();
let htmlRefs = 0;
let cssImports = 0;
let jsBundle = 0;

function isExternal(u) {
  return SKIP_PREFIX.some((p) => u.startsWith(p));
}

function strip(u) {
  return u.split("#")[0].split("?")[0].trim();
}

function existsTarget(abs) {
  if (fs.existsSync(abs)) return true;
  if (fs.existsSync(abs + ".html")) return true;
  if (fs.existsSync(path.join(abs, "index.html"))) return true;
  return false;
}

function resolveFrom(fromFile, ref) {
  const cleaned = strip(ref.replace(/&amp;/g, "&"));
  if (!cleaned || isExternal(cleaned)) return null;
  if (cleaned.startsWith("/")) {
    return path.join(ROOT, cleaned.replace(/^\//, ""));
  }
  return path.normalize(path.join(path.dirname(fromFile), cleaned));
}

function recordMissing(fromRel, ref, abs) {
  broken.push({
    file: fromRel,
    ref,
    missing: path.relative(ROOT, abs)
  });
}

function walk(dir, pred, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      ent.name === "node_modules" ||
      ent.name === ".git" ||
      ent.name === "audits" ||
      ent.name === "reports"
    ) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, pred, out);
    else if (pred(ent.name, p)) out.push(p);
  }
  return out;
}

function attrs(html, attr) {
  const re = new RegExp(
    "(?:\\s|:)" + attr + "\\s*=\\s*[\"']([^\"']+)[\"']|" + attr + "\\s*=\\s*[\"']([^\"']+)[\"']",
    "gi"
  );
  // Simpler: standard attribute match
  const re2 = new RegExp(attr + "\\s*=\\s*[\"']([^\"']+)[\"']", "gi");
  const out = [];
  let m;
  while ((m = re2.exec(html))) out.push(m[1]);
  return out;
}

function checkRef(fromFile, ref) {
  const abs = resolveFrom(fromFile, ref);
  if (!abs) return;
  const key = abs + "|" + ref;
  if (checked.has(key)) return;
  checked.add(key);
  htmlRefs += 1;
  if (!existsTarget(abs)) {
    recordMissing(path.relative(ROOT, fromFile), ref, abs);
  }
}

// --- HTML pages ---
for (const file of walk(ROOT, (n) => n.endsWith(".html"))) {
  const html = fs.readFileSync(file, "utf8");
  for (const ref of [
    ...attrs(html, "href"),
    ...attrs(html, "src"),
    ...attrs(html, "data-src"),
    ...attrs(html, "poster")
  ]) {
    checkRef(file, ref);
  }
  // preload / modulepreload
  const preloadRe = /<link[^>]+rel=["'][^"']*preload[^"']*["'][^>]*>/gi;
  let pm;
  while ((pm = preloadRe.exec(html))) {
    const tag = pm[0];
    const href = /href=["']([^"']+)["']/i.exec(tag);
    if (href) checkRef(file, href[1]);
  }
}

// --- CSS @import chain (resolve vs stylesheet URL) ---
function collectCssImports(cssFile, seen = new Set()) {
  if (seen.has(cssFile)) return;
  seen.add(cssFile);
  if (!fs.existsSync(cssFile)) {
    recordMissing("(css-entry)", path.basename(cssFile), cssFile);
    return;
  }
  const css = fs.readFileSync(cssFile, "utf8");
  const re = /@import\s+(?:url\()?["']([^"')]+)["']\)?/gi;
  let m;
  while ((m = re.exec(css))) {
    cssImports += 1;
    const abs = resolveFrom(cssFile, m[1]);
    if (!abs) continue;
    if (!fs.existsSync(abs)) {
      recordMissing(path.relative(ROOT, cssFile), m[1], abs);
      continue;
    }
    if (abs.endsWith(".css")) collectCssImports(abs, seen);
  }
  // url(...) local assets in CSS (fonts/icons) — skip data/http
  const urlRe = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  while ((m = urlRe.exec(css))) {
    const ref = m[1];
    if (isExternal(ref) || ref.startsWith("data:")) continue;
    if (ref.includes("fonts.googleapis") || ref.includes("fonts.gstatic")) continue;
    const abs = resolveFrom(cssFile, ref);
    if (!abs) continue;
    // skip CSS @import already handled
    if (/\.css$/i.test(strip(ref))) continue;
    if (!existsTarget(abs) && !fs.existsSync(abs)) {
      // only flag if it looks like a local asset
      if (/\.(woff2?|ttf|otf|eot|svg|png|jpe?g|gif|webp|ico)$/i.test(strip(ref))) {
        recordMissing(path.relative(ROOT, cssFile), ref, abs);
      }
    }
  }
}

[
  "design-system/css/wds.css",
  "design-system/css/wds-dashboard-home.css",
  "design-system/css/wds-platform-boot.css",
  "design-system/css/wds-steepleaf.css",
  "design-system/css/wds-volunteer.css"
].forEach((rel) => {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    broken.push({ file: "(bundle)", ref: rel, missing: rel });
    return;
  }
  collectCssImports(abs);
});

// --- wds.js sequential loader file list ---
const wdsJs = fs.readFileSync(path.join(ROOT, "design-system/js/wds.js"), "utf8");
const arrMatch = wdsJs.match(/\[[\s\S]*?\]\.forEach\(function \(file\)/);
if (arrMatch) {
  const listBlock = arrMatch[0];
  const files = [...listBlock.matchAll(/"([^"]+\.js)"/g)].map((x) => x[1]);
  const baseDir = path.join(ROOT, "design-system/js");
  for (const file of files) {
    jsBundle += 1;
    const abs = path.join(baseDir, file);
    if (!fs.existsSync(abs)) {
      broken.push({
        file: "design-system/js/wds.js",
        ref: file,
        missing: path.relative(ROOT, abs)
      });
    }
  }
}

// Critical root data + boot assets
[
  "data/live.json",
  "data/health.json",
  "design-system/js/platform/wds-platform-boot.js",
  "design-system/css/wds-platform-boot.css",
  "map/index.html",
  "apps/shed-hunting/map/index.html",
  "favicon.svg"
].forEach((rel) => {
  if (!fs.existsSync(path.join(ROOT, rel))) {
    broken.push({ file: "(critical)", ref: rel, missing: rel });
  }
});

// Live engine must use site-root absolute data URLs
const feed = fs.readFileSync(
  path.join(ROOT, "design-system/js/outdoor-intelligence/wds-live-engine-feed.js"),
  "utf8"
);
if (!/LIVE_URL\s*=\s*["']\/data\/live\.json["']/.test(feed)) {
  broken.push({
    file: "wds-live-engine-feed.js",
    ref: "LIVE_URL",
    missing: "must be /data/live.json (site-root absolute)"
  });
}
if (!/HEALTH_URL\s*=\s*["']\/data\/health\.json["']/.test(feed)) {
  broken.push({
    file: "wds-live-engine-feed.js",
    ref: "HEALTH_URL",
    missing: "must be /data/health.json (site-root absolute)"
  });
}

// isFiniteCoord must not use Number(null) alone
const model = fs.readFileSync(
  path.join(ROOT, "design-system/js/outdoor-intelligence/wds-oip-model.js"),
  "utf8"
);
if (/function isFiniteCoord\(n\) \{\s*return isFinite\(Number\(n\)\);\s*\}/.test(model)) {
  broken.push({
    file: "wds-oip-model.js",
    ref: "isFiniteCoord",
    missing: "rejects null (Number(null)===0 bug still present)"
  });
}

// Dedup
const seen = new Set();
const uniq = [];
for (const b of broken) {
  const k = b.file + "|" + b.ref + "|" + b.missing;
  if (seen.has(k)) continue;
  seen.add(k);
  uniq.push(b);
}

const reportPath = path.join(ROOT, "docs/PRODUCTION-ASSET-AUDIT.md");
const lines = [
  "# Production Asset Audit",
  "",
  "**Generated:** " + new Date().toISOString(),
  "",
  "- HTML refs checked: **" + htmlRefs + "**",
  "- CSS @import edges: **" + cssImports + "**",
  "- wds.js modules: **" + jsBundle + "**",
  "- Missing: **" + uniq.length + "**",
  "",
  "## Method",
  "",
  "Asset URLs are resolved relative to the **referencing file** (HTML or CSS).",
  "This matches browser stylesheet `@import` behavior and avoids axe-core false positives",
  "that resolve `@import` names against the document URL.",
  "",
  uniq.length
    ? "## Missing assets\n\n" +
      uniq.map((b) => `- \`${b.file}\` → \`${b.ref}\` (missing \`${b.missing}\`)`).join("\n") +
      "\n"
    : "## Missing assets\n\nNone.\n"
];
fs.writeFileSync(reportPath, lines.join("\n"));

console.log("Production asset validation");
console.log("HTML refs:", htmlRefs, "CSS imports:", cssImports, "JS modules:", jsBundle);
console.log("Missing:", uniq.length);
if (uniq.length) {
  uniq.slice(0, 80).forEach((b) => console.log("-", b.file, "→", b.ref, "(" + b.missing + ")"));
  console.log("\nWrote", path.relative(ROOT, reportPath));
  process.exit(1);
}
console.log("\nOK — all required assets resolve.");
console.log("Wrote", path.relative(ROOT, reportPath));
