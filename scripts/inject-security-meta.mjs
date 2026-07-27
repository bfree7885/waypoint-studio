#!/usr/bin/env node
/**
 * Inject repository-enforceable security meta into HTML documents.
 *
 * GitHub Pages cannot serve custom CSP / XFO / nosniff / Permissions-Policy
 * response headers. This injector adds valid HTML meta controls only.
 * It does NOT invent _headers files and does NOT claim frame-ancestors works
 * via meta (browsers ignore frame-ancestors in meta CSP).
 *
 * Usage:
 *   node scripts/inject-security-meta.mjs
 *   node scripts/inject-security-meta.mjs --root ./_site
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(__dirname, "..");
const ROOT = path.resolve(
  process.argv.includes("--root")
    ? process.argv[process.argv.indexOf("--root") + 1]
    : process.env.WAYPOINT_SITE_ROOT || DEFAULT_ROOT
);

const BASELINE = JSON.parse(
  fs.readFileSync(path.join(DEFAULT_ROOT, "design-system/security/baseline.json"), "utf8")
);

const START = "<!-- waypoint-security-meta:start -->";
const END = "<!-- waypoint-security-meta:end -->";

const SKIP_DIR = new Set([
  ".git",
  "node_modules",
  "private",
  "audits",
  "reports",
  "automation",
  "scripts",
  "engineering",
  "docs",
  "waypoint-importer"
]);

function walkHtml(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkHtml(p, out);
    else if (ent.name.endsWith(".html")) out.push(p);
  }
  return out;
}

function snippet() {
  const referrer = BASELINE.metaControls.referrer.content;
  const csp = BASELINE.metaControls.contentSecurityPolicy.policy;
  return [
    START,
    `<meta name="referrer" content="${referrer}">`,
    `<meta http-equiv="Content-Security-Policy" content="${csp}">`,
    END
  ].join("\n  ");
}

function depthPrefix(fileAbs) {
  const rel = path.relative(ROOT, path.dirname(fileAbs));
  if (!rel || rel === ".") return "";
  const depth = rel.split(path.sep).filter(Boolean).length;
  return "../".repeat(depth);
}

function injectScript(html, fileAbs) {
  if (/wds-security-baseline\.js/.test(html)) return html;
  // Pages that load the full wds.js bundle already include the baseline.
  if (/design-system\/js\/wds\.js/.test(html)) return html;
  const prefix = depthPrefix(fileAbs);
  const tag =
    `<script src="${prefix}design-system/js/platform/wds-security-baseline.js?v=local" defer></script>`;
  if (/wds-app-nav\.js[^"']*["'][^>]*defer/.test(html)) {
    return html.replace(
      /(<script[^>]*wds-app-nav\.js[^>]*><\/script>)/,
      `$1\n  ${tag}`
    );
  }
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `  ${tag}\n</body>`);
  }
  return html;
}

function inject(html, fileAbs) {
  const block = snippet();
  let next = html;
  if (next.includes(START) && next.includes(END)) {
    next = next.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block);
  } else {
    const charsetRe = /(<meta\s+charset=["']?UTF-8["']?\s*\/?>)/i;
    if (charsetRe.test(next)) {
      next = next.replace(charsetRe, `$1\n  ${block}`);
    } else {
      const headRe = /(<head[^>]*>)/i;
      if (headRe.test(next)) next = next.replace(headRe, `$1\n  ${block}`);
    }
  }
  return injectScript(next, fileAbs);
}

const files = walkHtml(ROOT);
let changed = 0;
for (const file of files) {
  const before = fs.readFileSync(file, "utf8");
  const after = inject(before, file);
  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    changed += 1;
  }
}

console.log(
  JSON.stringify(
    {
      root: path.relative(DEFAULT_ROOT, ROOT) || ".",
      htmlFiles: files.length,
      updated: changed,
      referrer: BASELINE.metaControls.referrer.content,
      cspMeta: true,
      frameAncestorsInMeta: false
    },
    null,
    2
  )
);
