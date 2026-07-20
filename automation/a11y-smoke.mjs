#!/usr/bin/env node
/**
 * Accessibility smoke — axe-core wcag2a/aa on critical Studio routes.
 * Prefers Playwright + @axe-core/playwright from audits/live-site-qa.
 * Usage: node automation/a11y-smoke.mjs [baseUrl]
 */
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const AUDIT = path.join(ROOT, "audits/live-site-qa");
const BASE = process.argv[2] || "http://127.0.0.1:8080";
const CRITICAL_IMPACTS = new Set(["critical", "serious"]);

const ROUTES = [
  { name: "home", path: "/", waitMs: 3500 },
  { name: "about", path: "/about.html", waitMs: 2500 },
  { name: "contact", path: "/contact.html", waitMs: 2500 },
  { name: "support", path: "/support.html", waitMs: 2500 },
  { name: "knowledge", path: "/knowledge.html", waitMs: 4000 },
  { name: "settings", path: "/settings.html", waitMs: 2500 },
  { name: "dashboard", path: "/apps/dashboard/", waitMs: 10000 },
  { name: "scenes", path: "/apps/scenes/", waitMs: 3500 },
  { name: "fieldry", path: "/apps/fieldry/", waitMs: 4000 },
  { name: "foragecast", path: "/apps/foragecast/", waitMs: 4000 }
];

async function loadAuditDeps() {
  const require = createRequire(path.join(AUDIT, "package.json"));
  let chromium;
  let AxeBuilder;
  try {
    ({ chromium } = await import(pathToFileURL(path.join(AUDIT, "node_modules/playwright/index.mjs")).href));
  } catch {
    chromium = require("playwright").chromium;
  }
  try {
    AxeBuilder = (await import(pathToFileURL(path.join(AUDIT, "node_modules/@axe-core/playwright/dist/index.js")).href)).default;
  } catch {
    AxeBuilder = require("@axe-core/playwright").default;
  }
  return { chromium, AxeBuilder };
}

async function main() {
  if (!fs.existsSync(path.join(AUDIT, "node_modules/@axe-core/playwright"))) {
    console.error("Missing audits/live-site-qa deps. Run: cd audits/live-site-qa && npm install");
    process.exit(1);
  }
  const { chromium, AxeBuilder } = await loadAuditDeps();
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || undefined
  });
  const results = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    for (const route of ROUTES) {
      const url = BASE + route.path;
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.waitForTimeout(route.waitMs);
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        results.push({
          route: route.name,
          path: route.path,
          violations: (axe.violations || []).map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: (v.nodes || []).length,
            help: v.help
          }))
        });
      } catch (err) {
        results.push({ route: route.name, path: route.path, error: String(err && err.message || err) });
      }
    }
    await context.close();
  } finally {
    await browser.close();
  }

  let failed = false;
  console.log(`A11y smoke — ${BASE}\n`);
  for (const r of results) {
    if (r.error) {
      console.log(`${r.route}: FAIL — ${r.error}`);
      failed = true;
      continue;
    }
    const serious = (r.violations || []).filter((v) => CRITICAL_IMPACTS.has(v.impact));
    const mild = (r.violations || []).filter((v) => !CRITICAL_IMPACTS.has(v.impact));
    if (serious.length) {
      failed = true;
      console.log(
        `${r.route}: FAIL — ${serious.length} serious/critical: ` +
          serious.map((v) => `${v.id}(${v.nodes})`).join(", ")
      );
    } else {
      console.log(
        `${r.route}: PASS` +
          (mild.length
            ? ` — ${mild.length} non-blocking: ${mild.map((v) => v.id).join(", ")}`
            : "")
      );
    }
  }
  if (failed) process.exitCode = 1;
  else console.log("\nA11Y SMOKE: PASS");
}

main().catch((err) => {
  console.error("a11y-smoke failed:", err.message || err);
  process.exit(1);
});
