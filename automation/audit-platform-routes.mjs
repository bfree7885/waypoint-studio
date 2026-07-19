#!/usr/bin/env node
/**
 * Static route / asset integrity audit for Waypoint Studio.
 * Checks HTML href/src targets exist; reports broken local links and missing scripts/styles.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SKIP_PREFIXES = [
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
const warnings = [];
let checked = 0;

function isExternal(u) {
  return SKIP_PREFIXES.some((p) => u.startsWith(p));
}

function stripQueryHash(u) {
  return u.split("#")[0].split("?")[0];
}

function resolveFrom(htmlFile, ref) {
  const cleaned = stripQueryHash(ref.trim());
  if (!cleaned || isExternal(cleaned)) return null;
  if (cleaned.startsWith("/")) {
    return path.join(ROOT, cleaned.replace(/^\//, ""));
  }
  return path.normalize(path.join(path.dirname(htmlFile), cleaned));
}

function collectAttrs(html, attr) {
  const re = new RegExp(attr + "\\s*=\\s*[\"']([^\"']+)[\"']", "gi");
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

function walkHtml(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".git" || ent.name === ".tmp") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkHtml(p, files);
    else if (ent.name.endsWith(".html")) files.push(p);
  }
  return files;
}

const htmlFiles = walkHtml(ROOT);
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const refs = [
    ...collectAttrs(html, "href"),
    ...collectAttrs(html, "src"),
    ...collectAttrs(html, "data-src")
  ];
  for (const ref of refs) {
    const target = resolveFrom(file, ref);
    if (!target) continue;
    checked += 1;
    if (!fs.existsSync(target)) {
      // Allow directory links that imply index.html
      if (fs.existsSync(target + ".html")) continue;
      if (fs.existsSync(path.join(target, "index.html"))) continue;
      broken.push({
        file: path.relative(ROOT, file),
        ref,
        missing: path.relative(ROOT, target)
      });
    }
  }

  if (/console\.(log|debug)\(/.test(html)) {
    warnings.push({ file: path.relative(ROOT, file), issue: "inline console logging" });
  }
}

// App index presence checklist
const requiredApps = [
  "apps/dashboard/index.html",
  "apps/foragecast/index.html",
  "apps/savant-sommelier/index.html",
  "apps/fieldry/index.html",
  "apps/shed-hunting/index.html",
  "apps/signalterrain/index.html",
  "apps/steepleaf/index.html",
  "apps/waypoint-volunteer/index.html",
  "apps/photo-coach/index.html",
  "apps/scenes/index.html",
  "apps/hidden-landscapes/index.html",
  "index.html"
];
for (const rel of requiredApps) {
  if (!fs.existsSync(path.join(ROOT, rel))) {
    broken.push({ file: "(checklist)", ref: rel, missing: rel });
  }
}

const uniq = [];
const seen = new Set();
for (const b of broken) {
  const key = b.file + "|" + b.ref;
  if (seen.has(key)) continue;
  seen.add(key);
  uniq.push(b);
}

console.log("Checked local refs:", checked);
console.log("Broken:", uniq.length);
console.log("Warnings:", warnings.length);
if (uniq.length) {
  console.log("\nBroken links/assets:");
  uniq.slice(0, 80).forEach((b) => {
    console.log("-", b.file, "→", b.ref, "(missing", b.missing + ")");
  });
  if (uniq.length > 80) console.log("… and", uniq.length - 80, "more");
}

const reportPath = path.join(ROOT, "docs/PLATFORM-ROUTE-AUDIT-RESULTS.md");
const body =
  "# Platform Route Audit Results\n\n" +
  "**Generated:** " +
  new Date().toISOString().slice(0, 10) +
  "\n\n" +
  "- Local refs checked: **" +
  checked +
  "**\n" +
  "- Broken: **" +
  uniq.length +
  "**\n" +
  "- Warnings: **" +
  warnings.length +
  "**\n\n" +
  (uniq.length
    ? "## Broken\n\n" +
      uniq
        .slice(0, 120)
        .map((b) => `- \`${b.file}\` → \`${b.ref}\` (missing \`${b.missing}\`)`)
        .join("\n") +
      "\n"
    : "## Broken\n\nNone found.\n");

fs.writeFileSync(reportPath, body);
console.log("\nWrote", path.relative(ROOT, reportPath));

// Soft exit: report but do not fail CI hard on historical debt unless catastrophic
if (uniq.length > 200) process.exit(1);
