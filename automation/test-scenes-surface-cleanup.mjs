#!/usr/bin/env node
/**
 * Sprint 5 — Scenes surface honesty + link integrity.
 * Run from repo root: node automation/test-scenes-surface-cleanup.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const failures = [];

function ok(cond, msg) {
  if (!cond) failures.push(msg);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function extractHrefs(html) {
  const hrefs = [];
  const re = /href=["']([^"'#]+)["']/gi;
  let m;
  while ((m = re.exec(html))) hrefs.push(m[1]);
  return hrefs;
}

function resolveHref(fromFile, href) {
  if (/^(https?:|mailto:|javascript:|data:)/i.test(href)) return { external: true, href };
  const baseDir = path.dirname(path.join(root, fromFile));
  let target = path.resolve(baseDir, href);
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    target = path.join(target, "index.html");
  }
  return { external: false, href, target, exists: fs.existsSync(target) };
}

// —— Live tools present ——
[
  "apps/scenes/index.html",
  "apps/photo-coach/index.html",
  "apps/photo-library/index.html",
  "apps/hidden-landscapes/index.html"
].forEach((p) => ok(exists(p), `missing live surface ${p}`));

// —— Dead portfolio routes must not exist as product pages ——
ok(!exists("apps/scenes/portfolio/index.html"), "portfolio index unexpectedly present");
ok(!exists("apps/scenes/portfolio/builder.html"), "portfolio builder unexpectedly present");

// —— Hub language ——
const hub = read("apps/scenes/index.html");
ok(/Available now/i.test(hub), "hub missing Available now");
ok(/Experimental/i.test(hub), "hub missing Experimental");
ok(/Future direction/i.test(hub), "hub missing Future direction");
ok(/Photo Coach/i.test(hub) && /Photo Library/i.test(hub), "hub missing live tools");
ok(/Hidden Landscapes/i.test(hub), "hub missing Hidden Landscapes");
ok(/Outdoor Journals/i.test(hub) && /Not available/i.test(hub), "hub should name Outdoor Journals as absent");
ok(/Portfolio suite/i.test(hub) && /Not deployed/i.test(hub), "hub should name Portfolio as not deployed");
ok(!/href=["'][^"']*portfolio/i.test(hub), "hub must not link to portfolio routes");
ok(!/href=["']\.\.\/waypoint-scenes/i.test(hub), "hub must not promote legacy monolith as primary CTA");

// —— Photo Coach CSS decoupled from monolith paths ——
const coach = read("apps/photo-coach/index.html");
const coachProfile = read("apps/photo-coach/profile/index.html");
ok(!/waypoint-scenes\/css\//.test(coach), "photo-coach still links waypoint-scenes CSS");
ok(!/waypoint-scenes\/css\//.test(coachProfile), "photo-coach profile still links waypoint-scenes CSS");
ok(exists("apps/photo-coach/css/studio-shell.css"), "missing vendored studio-shell.css");
ok(exists("apps/photo-coach/css/photo-coach.css"), "missing vendored photo-coach.css");
ok(/href=["']css\/studio-shell\.css["']/.test(coach), "photo-coach should load local studio-shell.css");
ok(/href=["']css\/photo-coach\.css["']/.test(coach), "photo-coach should load local photo-coach.css");

// —— Nav registry demotes futures ——
const nav = JSON.parse(read("design-system/ecosystem/nav-registry.json"));
const scenes = (nav.apps || nav.products || nav).find
  ? null
  : null;
const scenesApp = (Array.isArray(nav.apps) ? nav.apps : []).find((a) => a.id === "scenes")
  || (Array.isArray(nav.products) ? nav.products : []).find((a) => a.id === "scenes");
let scenesNode = scenesApp;
if (!scenesNode && Array.isArray(nav)) scenesNode = nav.find((a) => a.id === "scenes");
if (!scenesNode && nav.apps && typeof nav.apps === "object" && !Array.isArray(nav.apps)) {
  scenesNode = nav.apps.scenes;
}
// nav-registry shape: { apps: [ ... ] }
if (!scenesNode) {
  const raw = read("design-system/ecosystem/nav-registry.json");
  const m = raw.match(/"id":\s*"scenes"[\s\S]*?"features":\s*(\[[\s\S]*?\])\s*,\s*"purpose"/);
  ok(m, "could not locate scenes features in nav-registry");
  if (m) {
    const features = JSON.parse(m[1]);
    const ids = features.map((f) => f.id);
    ok(!ids.includes("living-scenes"), "nav-registry still lists living-scenes feature");
    ok(!ids.includes("scene-builder"), "nav-registry still lists scene-builder feature");
    ok(!ids.includes("photographer-profile"), "nav-registry still lists photographer-profile feature");
    ok(ids.includes("photo-coach") && ids.includes("photo-library"), "nav-registry missing live features");
  }
} else {
  const ids = (scenesNode.features || []).map((f) => f.id);
  ok(!ids.includes("living-scenes"), "nav-registry still lists living-scenes feature");
  ok(!ids.includes("scene-builder"), "nav-registry still lists scene-builder feature");
  ok(!ids.includes("photographer-profile"), "nav-registry still lists photographer-profile feature");
}

const catalog = read("design-system/js/platform/wds-platform-catalog.js");
ok(!/Living Scenes, Scene Builder/.test(catalog), "platform catalog still lists futures as live peers");
ok(/available now/i.test(catalog), "platform catalog should say available now");

// —— Preview pages labeled ——
["living-scenes", "scene-builder", "photographer-profile"].forEach((slug) => {
  const html = read(`apps/scenes/${slug}/index.html`);
  ok(/Preview only/i.test(html), `${slug} missing Preview only label`);
  ok(/not finished/i.test(html), `${slug} missing not finished label`);
});

const legacy = read("apps/waypoint-scenes/index.html");
ok(/Legacy studio/i.test(legacy), "legacy studio missing Legacy studio banner/copy");
ok(/href=["']\.\.\/scenes\/["']/.test(legacy), "legacy studio should link to Scenes hub");

// —— Link crawl from key Scenes HTML ——
const pages = [
  "apps/scenes/index.html",
  "apps/scenes/living-scenes/index.html",
  "apps/scenes/scene-builder/index.html",
  "apps/scenes/photographer-profile/index.html",
  "apps/photo-coach/index.html",
  "apps/photo-library/index.html",
  "apps/hidden-landscapes/index.html",
  "apps/waypoint-scenes/index.html"
];

pages.forEach((page) => {
  const html = read(page);
  extractHrefs(html).forEach((href) => {
    if (href.startsWith("#") || href.startsWith("?")) return;
    if (/portfolio/i.test(href)) {
      failures.push(`${page} links to portfolio: ${href}`);
      return;
    }
    const res = resolveHref(page, href);
    if (res.external) return;
    // Skip design-system deep CSS that always exists via wds.css bundle paths checked separately
    if (!res.exists) {
      // Allow font/cdn already filtered; allow empty
      failures.push(`${page} dead link → ${href} (resolved ${res.target})`);
    }
  });
});

// —— Redirect stubs ——
["photo-coach", "photo-library", "hidden-landscapes"].forEach((slug) => {
  ok(exists(`apps/scenes/${slug}/index.html`), `missing redirect stub apps/scenes/${slug}/`);
});

if (failures.length) {
  console.error("FAIL — Scenes surface cleanup checks:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("PASS — Scenes surface cleanup checks (" + pages.length + " pages crawled)");
