#!/usr/bin/env node
/**
 * Visual production repair — contrast + shell coherence regression gates.
 * Usage: node automation/test-visual-production-repair.mjs [baseUrl]
 */
import path from "path";
import { createRequire } from "module";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const AUDIT = path.join(ROOT, "audits/live-site-qa");
const BASE = (process.argv[2] || "http://127.0.0.1:8791").replace(/\/$/, "");

const CASES = [
  {
    name: "gs-home-badge",
    path: "/side-trails/global-signals/",
    waitMs: 3500,
    viewport: { width: 375, height: 812 },
    selector: ".gsh-badge",
    minRatio: 4.5
  },
  {
    name: "gs-explore-btn",
    path: "/side-trails/global-signals/",
    waitMs: 3500,
    viewport: { width: 430, height: 932 },
    selector: ".gsh-search__go",
    minRatio: 4.5
  },
  {
    name: "gs-explain-cta",
    path: "/side-trails/global-signals/explain/",
    waitMs: 2200,
    viewport: { width: 375, height: 812 },
    selector: ".gs-cta--primary",
    minRatio: 4.5
  },
  {
    name: "sheds-primary-cta",
    path: "/apps/shed-hunting/",
    waitMs: 2200,
    viewport: { width: 375, height: 812 },
    selector: ".xp-stage__cta .wds-btn--primary",
    minRatio: 4.5
  },
  {
    name: "st-continuity-no-clip",
    path: "/side-trails/signalterrain/",
    waitMs: 2200,
    viewport: { width: 375, height: 812 },
    assert: "st-brand"
  },
  {
    name: "articles-take",
    path: "/articles/",
    waitMs: 3500,
    viewport: { width: 390, height: 1400 },
    selector: ".wds-take__body, .waf-card .wds-take__body",
    minRatio: 4.5,
    optional: true
  },
  {
    name: "contact-hero",
    path: "/contact.html",
    waitMs: 1800,
    viewport: { width: 375, height: 812 },
    selector: ".wcs-hero h1",
    minRatio: 4.5
  },
  {
    name: "foragecast-reliability",
    path: "/apps/foragecast/",
    waitMs: 2500,
    viewport: { width: 375, height: 812 },
    selector: ".fc-reliability",
    minRatio: 4.5,
    optional: true
  }
];

const CONTRAST_FN = `(() => {
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
    if (a < 0.15) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  };
  const bgOf = (el) => {
    let n = el;
    while (n && n.nodeType === 1) {
      const bg = parseColor(getComputedStyle(n).backgroundColor);
      if (bg) return bg;
      n = n.parentElement;
    }
    return parseColor(getComputedStyle(document.body).backgroundColor) || [8, 15, 28];
  };
  window.__wdsContrast = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return { found: false };
    const style = getComputedStyle(el);
    const fg = parseColor(style.color);
    const bg = bgOf(el);
    if (!fg) return { found: true, ratio: 0, reason: "no-fg" };
    const L1 = relLum(fg);
    const L2 = relLum(bg);
    const hi = Math.max(L1, L2);
    const lo = Math.min(L1, L2);
    const ratio = (hi + 0.05) / (lo + 0.05);
    return {
      found: true,
      ratio: Math.round(ratio * 100) / 100,
      fg: style.color,
      bg: "rgb(" + bg.join(",") + ")",
      text: (el.textContent || "").trim().slice(0, 48)
    };
  };
  window.__wdsStBrand = () => {
    const brand = document.querySelector(".st-brand-mark");
    const strip = document.querySelector(".wds-studio-continuity");
    if (!brand || !strip) return { ok: false, reason: "missing" };
    const br = brand.getBoundingClientRect();
    const sr = strip.getBoundingClientRect();
    const clipped = br.top < sr.bottom - 1;
    return {
      ok: !clipped && br.height > 8 && br.width > 8,
      brandTop: br.top,
      stripBottom: sr.bottom,
      clipped
    };
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
  const chromium = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  let failed = 0;
  try {
    for (const c of CASES) {
      const page = await browser.newPage({
        viewport: c.viewport,
        isMobile: c.viewport.width <= 430,
        hasTouch: c.viewport.width <= 430
      });
      await page.goto(BASE + c.path, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(c.waitMs);
      await page.evaluate(CONTRAST_FN);
      if (c.assert === "st-brand") {
        const r = await page.evaluate(() => window.__wdsStBrand());
        const pass = r && r.ok;
        console.log(`${pass ? "PASS" : "FAIL"} ${c.name}`, r);
        if (!pass) failed += 1;
      } else {
        const r = await page.evaluate((sel) => window.__wdsContrast(sel), c.selector);
        if (!r.found) {
          if (c.optional) {
            console.log(`SKIP ${c.name} (selector absent)`);
          } else {
            console.log(`FAIL ${c.name} (selector missing)`);
            failed += 1;
          }
        } else {
          const pass = r.ratio >= c.minRatio;
          console.log(`${pass ? "PASS" : "FAIL"} ${c.name} ratio=${r.ratio} need>=${c.minRatio}`, r.text);
          if (!pass) failed += 1;
        }
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  if (failed) {
    console.error(`\nVISUAL REPAIR: ${failed} failure(s)`);
    process.exit(1);
  }
  console.log("\nVISUAL REPAIR: PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
