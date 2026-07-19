#!/usr/bin/env node
/**
 * Pre-deploy production link & route validation.
 * Run before release: node automation/validate-production-links.mjs
 *
 * Exit 1 if any broken local refs, foundation absolute site-root traps,
 * or missing critical public pages.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import vm from "vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SKIP = ["http://", "https://", "mailto:", "tel:", "data:", "javascript:", "#", "//"];

const broken = [];
const warnings = [];
let checked = 0;

function isExternal(u) {
  return SKIP.some((p) => u.startsWith(p));
}

function strip(u) {
  return u.split("#")[0].split("?")[0];
}

function resolveFrom(htmlFile, ref) {
  const cleaned = strip(ref.trim());
  if (!cleaned || isExternal(cleaned)) return null;
  if (cleaned.startsWith("/")) {
    // Site-root absolute — only OK for known root public files
    return path.join(ROOT, cleaned.replace(/^\//, ""));
  }
  return path.normalize(path.join(path.dirname(htmlFile), cleaned));
}

function attrs(html, attr) {
  const re = new RegExp(attr + "\\s*=\\s*[\"']([^\"']+)[\"']", "gi");
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

function walkHtml(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".git") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkHtml(p, files);
    else if (ent.name.endsWith(".html")) files.push(p);
  }
  return files;
}

// --- HTML refs ---
for (const file of walkHtml(ROOT)) {
  const html = fs.readFileSync(file, "utf8");
  const rel = path.relative(ROOT, file);
  for (const ref of [...attrs(html, "href"), ...attrs(html, "src")]) {
    // Decode common HTML entities in hrefs for existence check
    const decoded = ref.replace(/&amp;/g, "&");
    const target = resolveFrom(file, decoded);
    if (!target) continue;
    checked += 1;
    if (!fs.existsSync(target)) {
      if (fs.existsSync(target + ".html")) continue;
      if (fs.existsSync(path.join(target, "index.html"))) continue;
      broken.push({ file: rel, ref, missing: path.relative(ROOT, target) });
    }
  }

  // Flag empty busy mounts without boot shell (landing risk)
  if (/aria-busy="true"\s*>\s*<\/div>/i.test(html) && !/data-wds-boot/.test(html)) {
    warnings.push({ file: rel, issue: "empty aria-busy mount without boot shell" });
  }
  if (/\bOpening\.\.\.|Preparing\.\.\./i.test(html) && !/wds-boot/.test(html)) {
    warnings.push({ file: rel, issue: "generic Opening/Preparing copy without shared boot" });
  }
}

// --- Foundation routeHref regression ---
const foundationCode = fs.readFileSync(
  path.join(ROOT, "design-system/js/platform/wds-platform-foundation.js"),
  "utf8"
);
global.window = global;
vm.runInThisContext(foundationCode, { filename: "wds-platform-foundation.js" });
const F = global.WDS.platformFoundation;
if (!F || typeof F.routeHref !== "function") {
  // routeHref may not be exported — test via renderRoutes behavior by re-reading source contract
  if (!/slice\(1\)|strip.*leading/i.test(foundationCode) && /path\.indexOf\("\/"\) === 0\) return path/.test(foundationCode)) {
    broken.push({
      file: "design-system/js/platform/wds-platform-foundation.js",
      ref: "routeHref",
      missing: "leading-slash still treated as site-root"
    });
  }
} else {
  const href = F.routeHref("/map/");
  if (href === "/map/") {
    broken.push({
      file: "wds-platform-foundation.js",
      ref: "routeHref(/map/)",
      missing: "must be app-relative map/"
    });
  }
}

// Source-level assertion (exported or not)
if (/if \(path\.indexOf\("http"\) === 0 \|\| path\.indexOf\("\/"\) === 0\) return path;/.test(foundationCode)) {
  broken.push({
    file: "design-system/js/platform/wds-platform-foundation.js",
    ref: "routeHref",
    missing: "old site-root absolute return still present"
  });
}
if (!/path\.charAt\(0\) === "\/"\) return path\.slice\(1\)/.test(foundationCode) &&
    !/strip one leading slash/i.test(foundationCode)) {
  // allow alternate implementations that normalize
  if (!/slice\(1\)/.test(foundationCode)) {
    warnings.push({
      file: "wds-platform-foundation.js",
      issue: "could not confirm leading-slash strip in routeHref"
    });
  }
}

// foundation.json must not use site-root absolute ready routes
for (const file of walkHtml(ROOT).length ? [] : []) {
  /* noop */
}
function walkJson(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".git") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkJson(p);
    else if (ent.name === "foundation.json") {
      const data = JSON.parse(fs.readFileSync(p, "utf8"));
      (data.routes || []).forEach((r) => {
        if (r.ready && r.path && r.path.startsWith("/") && r.path !== "/") {
          broken.push({
            file: path.relative(ROOT, p),
            ref: r.path,
            missing: "ready route still absolute site-root style"
          });
        }
      });
    }
  }
}
walkJson(path.join(ROOT, "apps"));

// Critical public pages
[
  "index.html",
  "about.html",
  "privacy.html",
  "contact.html",
  "support.html",
  "settings.html",
  "apps/dashboard/index.html",
  "apps/foragecast/index.html",
  "apps/fieldry/index.html",
  "apps/photo-coach/index.html",
  "apps/scenes/index.html",
  "apps/shed-hunting/index.html",
  "apps/shed-hunting/map/index.html"
].forEach((rel) => {
  if (!fs.existsSync(path.join(ROOT, rel))) {
    broken.push({ file: "(checklist)", ref: rel, missing: rel });
  }
});

// Deduplicate broken
const seen = new Set();
const uniq = [];
for (const b of broken) {
  const k = b.file + "|" + b.ref;
  if (seen.has(k)) continue;
  seen.add(k);
  uniq.push(b);
}

console.log("Production link validation");
console.log("Checked local refs:", checked);
console.log("Broken:", uniq.length);
console.log("Warnings:", warnings.length);
if (uniq.length) {
  console.log("\nBroken:");
  uniq.slice(0, 60).forEach((b) => console.log("-", b.file, "→", b.ref, "(" + b.missing + ")"));
}
if (warnings.length) {
  console.log("\nWarnings (sample):");
  warnings.slice(0, 25).forEach((w) => console.log("-", w.file, "—", w.issue));
}

const report = path.join(ROOT, "docs/PRODUCTION-BROKEN-ROUTE-REPORT.md");
fs.writeFileSync(
  report,
  "# Broken Route Report\n\n**Generated:** " +
    new Date().toISOString().slice(0, 10) +
    "\n\n- Checked: **" +
    checked +
    "**\n- Broken: **" +
    uniq.length +
    "**\n- Warnings: **" +
    warnings.length +
    "**\n\n" +
    (uniq.length
      ? "## Broken\n\n" +
        uniq.map((b) => `- \`${b.file}\` → \`${b.ref}\` (${b.missing})`).join("\n") +
        "\n"
      : "## Broken\n\nNone.\n") +
    (warnings.length
      ? "\n## Warnings\n\n" +
        warnings
          .slice(0, 80)
          .map((w) => `- \`${w.file}\` — ${w.issue}`)
          .join("\n") +
        "\n"
      : "")
);
console.log("\nWrote", path.relative(ROOT, report));

if (uniq.length) process.exit(1);
console.log("\nOK — no broken production links detected.");
