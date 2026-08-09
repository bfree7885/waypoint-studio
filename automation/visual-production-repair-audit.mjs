#!/usr/bin/env node
/**
 * Visual production repair audit — rendered layout + contrast probes.
 * Usage: node automation/visual-production-repair-audit.mjs [baseUrl]
 */
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const AUDIT = path.join(ROOT, "audits/live-site-qa");
const BASE = (process.argv[2] || "http://127.0.0.1:8791").replace(/\/$/, "");
const OUT = path.join(ROOT, "docs/visual-production-repair");
const SHOTS = path.join(OUT, "screenshots");

const VIEWPORTS = [
  { name: "w375", width: 375, height: 812 },
  { name: "w430", width: 430, height: 932 },
  { name: "w768", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 900 }
];

const ROUTES = [
  { name: "home", path: "/", waitMs: 2800 },
  { name: "about", path: "/about.html", waitMs: 1800 },
  { name: "support", path: "/support.html", waitMs: 1800 },
  { name: "contact", path: "/contact.html", waitMs: 1800 },
  { name: "privacy", path: "/privacy.html", waitMs: 1200 },
  { name: "terms", path: "/terms.html", waitMs: 1200 },
  { name: "articles", path: "/articles/", waitMs: 3500 },
  { name: "side-trails", path: "/side-trails/", waitMs: 2500 },
  { name: "incubator", path: "/incubator/", waitMs: 1800 },
  { name: "dashboard", path: "/apps/dashboard/", waitMs: 7000 },
  { name: "scenes", path: "/apps/scenes/", waitMs: 2800 },
  { name: "sheds", path: "/apps/shed-hunting/", waitMs: 2500 },
  { name: "sheds-map", path: "/apps/shed-hunting/map/", waitMs: 4000 },
  { name: "photo-coach", path: "/apps/photo-coach/", waitMs: 3500 },
  { name: "scenes-photo-coach", path: "/apps/scenes/photo-coach/", waitMs: 2500 },
  { name: "signalterrain-st", path: "/side-trails/signalterrain/", waitMs: 2200 },
  { name: "global-signals", path: "/side-trails/global-signals/", waitMs: 3500 },
  { name: "gs-articles", path: "/side-trails/global-signals/articles/", waitMs: 3000 },
  { name: "gs-explain", path: "/side-trails/global-signals/explain/", waitMs: 2200 },
  { name: "gs-countries", path: "/side-trails/global-signals/countries/", waitMs: 2500 },
  { name: "gs-industries", path: "/side-trails/global-signals/industries/", waitMs: 2500 },
  { name: "gs-citizen", path: "/side-trails/global-signals/citizen-impact/", waitMs: 2500 },
  { name: "gs-rel", path: "/side-trails/global-signals/relationships/", waitMs: 2500 },
  { name: "gs-graph", path: "/side-trails/global-signals/relationship-graph/", waitMs: 2500 },
  { name: "gs-take", path: "/side-trails/global-signals/waypoint-take/", waitMs: 2200 },
  { name: "gs-about", path: "/side-trails/global-signals/about/", waitMs: 1800 },
  { name: "foragecast", path: "/apps/foragecast/", waitMs: 2500 },
  { name: "fieldry", path: "/apps/fieldry/", waitMs: 2500 },
  { name: "signalterrain-app", path: "/apps/signalterrain/", waitMs: 2800 },
  { name: "knowledge", path: "/knowledge.html", waitMs: 2500 },
  { name: "settings", path: "/settings.html", waitMs: 1800 },
  { name: "404", path: "/404.html", waitMs: 1200 },
  { name: "article-sample", path: "/articles/samples/reading-todays-conditions.html", waitMs: 2000 }
];

const PROBE = `(() => {
  const relLum = (rgb) => {
    const f = (c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
  };
  const parseColor = (s) => {
    if (!s || s === "transparent" || s === "rgba(0, 0, 0, 0)") return null;
    const m = s.match(/rgba?\\((\\d+)[,\\s]+(\\d+)[,\\s]+(\\d+)(?:[,\\s/]+([\\d.]+))?\\)/i);
    if (!m) return null;
    const a = m[4] === undefined ? 1 : Number(m[4]);
    if (a < 0.2) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3]), a];
  };
  const bgOf = (el) => {
    let n = el;
    while (n && n.nodeType === 1) {
      const bg = parseColor(getComputedStyle(n).backgroundColor);
      if (bg) return bg;
      n = n.parentElement;
    }
    return parseColor(getComputedStyle(document.body).backgroundColor) || [10, 14, 20, 1];
  };
  const contrast = (fg, bg) => {
    const L1 = relLum(fg);
    const L2 = relLum(bg);
    const hi = Math.max(L1, L2);
    const lo = Math.min(L1, L2);
    return (hi + 0.05) / (lo + 0.05);
  };

  const doc = document.documentElement;
  const issues = [];
  if (doc.scrollWidth > doc.clientWidth + 2) {
    issues.push({
      kind: "overflow-x",
      detail: doc.scrollWidth + ">" + doc.clientWidth
    });
  }

  const textNodes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let node;
  while ((node = walker.nextNode())) {
    if (!node.offsetParent && getComputedStyle(node).position !== "fixed") continue;
    const style = getComputedStyle(node);
    if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) < 0.15) continue;
    const text = (node.innerText || "").trim();
    if (!text || text.length < 2) continue;
    // leaf-ish text containers
    const childText = Array.from(node.children).some((c) => (c.innerText || "").trim().length > 0);
    if (childText && !/^(H[1-6]|P|A|BUTTON|LABEL|SPAN|LI|TD|TH|SMALL)$/i.test(node.tagName)) continue;
    const color = parseColor(style.color);
    if (!color) continue;
    const bg = bgOf(node);
    const ratio = contrast(color, bg);
    const fontSize = parseFloat(style.fontSize) || 16;
    const bold = (parseInt(style.fontWeight, 10) || 400) >= 600;
    const need = fontSize >= 18 || bold ? 3.0 : 4.5;
    if (ratio < need) {
      textNodes.push({
        tag: node.tagName.toLowerCase(),
        cls: (node.className || "").toString().slice(0, 80),
        sample: text.slice(0, 60).replace(/\\s+/g, " "),
        ratio: Math.round(ratio * 100) / 100,
        need,
        fg: style.color,
        bg: "rgb(" + bg.slice(0, 3).join(",") + ")"
      });
    }
    if (textNodes.length >= 12) break;
  }
  for (const t of textNodes) issues.push({ kind: "contrast", ...t });

  // clipped / overflowing interactive
  const controls = Array.from(document.querySelectorAll("a, button, input, select, textarea, .wds-btn"));
  let clipped = 0;
  for (const el of controls) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (r.right > window.innerWidth + 2 || r.left < -2) clipped += 1;
  }
  if (clipped) issues.push({ kind: "clipped-controls", count: clipped });

  const shell = !!document.querySelector(".was-shell, [data-wds-app-shell], .wds-studio-continuity, #wds-studio-continuity");
  const fonts = getComputedStyle(document.body).fontFamily;
  const title = document.title;
  const h1 = (document.querySelector("h1")?.textContent || "").trim().slice(0, 80);

  return {
    title,
    h1,
    shell,
    fonts: fonts.slice(0, 120),
    scrollWidth: doc.scrollWidth,
    clientWidth: doc.clientWidth,
    issues
  };
})()`;

async function loadPlaywright() {
  const require = createRequire(path.join(AUDIT, "package.json"));
  try {
    return (await import(pathToFileURL(path.join(AUDIT, "node_modules/playwright/index.mjs")).href)).chromium;
  } catch {
    return require("playwright").chromium;
  }
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const chromium = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const report = { base: BASE, at: new Date().toISOString(), results: [] };
  try {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.width <= 430,
        hasTouch: vp.width <= 430
      });
      for (const route of ROUTES) {
        const url = BASE + route.path;
        const entry = { viewport: vp.name, route: route.name, path: route.path, ok: true, issues: [] };
        try {
          const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
          entry.status = res ? res.status() : 0;
          await page.waitForTimeout(route.waitMs);
          const probe = await page.evaluate(PROBE);
          entry.probe = {
            title: probe.title,
            h1: probe.h1,
            shell: probe.shell,
            fonts: probe.fonts,
            scrollWidth: probe.scrollWidth,
            clientWidth: probe.clientWidth
          };
          entry.issues = probe.issues || [];
          if (entry.status >= 400) {
            entry.ok = false;
            entry.issues.push({ kind: "http", status: entry.status });
          }
          if (entry.issues.some((i) => i.kind === "overflow-x" || i.kind === "contrast" || i.kind === "clipped-controls")) {
            entry.ok = false;
            const shot = `${vp.name}__${route.name}.png`;
            await page.screenshot({ path: path.join(SHOTS, shot), fullPage: false });
            entry.screenshot = shot;
          }
        } catch (err) {
          entry.ok = false;
          entry.error = String(err.message || err);
        }
        report.results.push(entry);
        const mark = entry.ok ? "PASS" : "FAIL";
        const issueKinds = [...new Set(entry.issues.map((i) => i.kind))].join(",") || "-";
        console.log(`${mark} ${vp.name} ${route.name} [${issueKinds}]`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }

  const fails = report.results.filter((r) => !r.ok);
  report.summary = {
    total: report.results.length,
    fail: fails.length,
    pass: report.results.length - fails.length,
    contrastFails: fails.filter((r) => r.issues.some((i) => i.kind === "contrast")).length,
    overflowFails: fails.filter((r) => r.issues.some((i) => i.kind === "overflow-x")).length
  };
  fs.writeFileSync(path.join(OUT, "audit-report.json"), JSON.stringify(report, null, 2));
  console.log("\nSUMMARY", report.summary);
  console.log("Wrote", path.join(OUT, "audit-report.json"));
  if (fails.length) process.exitCode = 2;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
