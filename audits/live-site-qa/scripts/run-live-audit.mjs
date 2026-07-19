#!/usr/bin/env node
/**
 * Independent live-site Playwright audit for https://waypointstudio.org
 * Audit only — does not modify application source.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium, devices } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = process.env.AUDIT_BASE_URL || "https://waypointstudio.org";
const DESKTOP = { width: 1440, height: 1000 };
const MOBILE = { width: 390, height: 844 };
const LOADING_TIMEOUT_MS = 15000;
const NAV_TIMEOUT_MS = 45000;
const MAX_ROUTES = Number(process.env.AUDIT_MAX_ROUTES || 80);

const SEED = [
  "/",
  "/about.html",
  "/privacy.html",
  "/contact.html",
  "/support.html",
  "/knowledge.html",
  "/settings.html",
  "/apps/dashboard/",
  "/apps/scenes/",
  "/apps/photo-coach/",
  "/apps/hidden-landscapes/",
  "/apps/photo-library/",
  "/apps/scenes/photographer-profile/",
  "/apps/shed-hunting/",
  "/apps/shed-hunting/map/",
  "/apps/foragecast/",
  "/apps/fieldry/",
  "/apps/signalterrain/",
  "/apps/signalterrain/cyber/",
  "/apps/signalterrain/cyber/live.html",
  "/apps/steepleaf/",
  "/apps/savant-sommelier/",
  "/apps/waypoint-volunteer/",
  "/apps/waypoint-volunteer/discover.html",
  "/apps/animal-vision/",
  "/apps/terrainbound/"
];

function ensureDirs() {
  for (const d of ["desktop", "mobile", "artifacts"]) {
    fs.mkdirSync(path.join(ROOT, d), { recursive: true });
  }
}

function slug(url) {
  try {
    const u = new URL(url);
    let p = u.pathname.replace(/\/+$/, "") || "home";
    p = p.replace(/^\//, "").replace(/[^\w.-]+/g, "_") || "home";
    return p.slice(0, 120);
  } catch {
    return "invalid";
  }
}

function sameOrigin(href) {
  try {
    const u = new URL(href, BASE);
    return u.origin === new URL(BASE).origin;
  } catch {
    return false;
  }
}

function normalize(href) {
  const u = new URL(href, BASE);
  u.hash = "";
  // drop tracking
  u.search = "";
  let p = u.pathname;
  if (!p.endsWith("/") && !p.includes(".")) p += "/";
  return u.origin + p;
}

async function collectLinks(page) {
  return page.evaluate(() => {
    const out = [];
    document.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return;
      out.push(a.href);
    });
    return out;
  });
}

async function waitUsable(page, timeout = LOADING_TIMEOUT_MS) {
  const start = Date.now();
  let stillLoading = false;
  try {
    await page.waitForLoadState("domcontentloaded", { timeout });
  } catch {
    /* continue */
  }
  // Wait until no visible boot/loading markers, or timeout
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    stillLoading = await page.evaluate(() => {
      const busy = document.querySelector('[aria-busy="true"]');
      const boot = document.querySelector(".wds-boot:not(.wds-boot--fail), .fc-loading, .sl-boot");
      const text = (document.body && document.body.innerText) || "";
      const loadingText =
        /\b(Opening|Preparing|Loading)[….]/i.test(text) &&
        !document.querySelector("main h1, main h2, .was-home__hero h1, .wpf-hero h1, .fc-summary__title, .fld-hero__title");
      return !!(busy || boot || loadingText);
    });
    if (!stillLoading) break;
    await page.waitForTimeout(400);
  }
  return {
    usableMs: Date.now() - start,
    stuckLoading: stillLoading
  };
}

async function auditRoute(browser, url, viewportName, viewport, geoMode) {
  const contextOpts = {
    viewport,
    ignoreHTTPSErrors: true,
    userAgent:
      viewportName === "mobile"
        ? devices["iPhone 13"].userAgent
        : undefined
  };

  if (geoMode === "granted") {
    contextOpts.geolocation = { latitude: 41.3226, longitude: -74.8024 }; // Milford, PA area
    contextOpts.permissions = ["geolocation"];
  } else if (geoMode === "denied" || geoMode === "unavailable") {
    contextOpts.permissions = [];
  }

  const context = await browser.newContext(contextOpts);
  if (geoMode === "denied") {
    await context.grantPermissions([], { origin: BASE });
  }

  const page = await context.newPage();
  if (geoMode === "unavailable") {
    await page.addInitScript(() => {
      navigator.geolocation.getCurrentPosition = (success, error) => {
        if (typeof error === "function") {
          error({ code: 2, message: "Position unavailable", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
        }
      };
      navigator.geolocation.watchPosition = (success, error) => {
        if (typeof error === "function") {
          error({ code: 2, message: "Position unavailable", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
        }
        return 0;
      };
    });
  }
  const consoleErrors = [];
  const consoleWarnings = [];
  const failedRequests = [];
  const responses = [];

  page.on("console", (msg) => {
    const t = msg.type();
    const text = msg.text();
    if (t === "error") consoleErrors.push(text);
    if (t === "warning") consoleWarnings.push(text);
  });
  page.on("pageerror", (err) => {
    consoleErrors.push(String(err.message || err));
  });
  page.on("requestfailed", (req) => {
    failedRequests.push({
      url: req.url(),
      method: req.method(),
      error: req.failure() && req.failure().errorText
    });
  });
  page.on("response", (res) => {
    const status = res.status();
    if (status >= 400) {
      failedRequests.push({
        url: res.url(),
        method: res.request().method(),
        error: "HTTP " + status
      });
    }
    responses.push({ url: res.url(), status });
  });

  const started = Date.now();
  let navStatus = null;
  let finalUrl = url;
  let title = "";
  let h1 = "";
  let navError = null;
  let timings = {};
  let axe = null;
  let screenshot = null;
  let visibleFlags = {};
  let links = [];

  try {
    const resp = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS
    });
    navStatus = resp ? resp.status() : null;
    finalUrl = page.url();
    const usable = await waitUsable(page);
    timings = {
      responseMs: Date.now() - started,
      ...usable,
      perf: await page.evaluate(() => {
        const nav = performance.getEntriesByType("navigation")[0];
        if (!nav) return null;
        return {
          domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
          loadEvent: Math.round(nav.loadEventEnd),
          responseStart: Math.round(nav.responseStart),
          transferSize: nav.transferSize || null
        };
      })
    };

    title = await page.title();
    h1 = await page.evaluate(() => {
      const el =
        document.querySelector("main h1, h1, [role='main'] h1") ||
        document.querySelector("h1");
      return el ? el.textContent.trim().slice(0, 200) : "";
    });

    visibleFlags = await page.evaluate(() => {
      const text = (document.body && document.body.innerText) || "";
      return {
        hasOpening: /\bOpening[….]/i.test(text),
        hasPreparing: /\bPreparing[….]/i.test(text),
        hasLoading: /\bLoading[….]/i.test(text),
        hasSample: /\bsample\b/i.test(text),
        hasPlaceholder: /\bplaceholder\b/i.test(text),
        hasFoundation: /\bFoundation\b/.test(text),
        hasError: /\b(could not load|failed to|error|unavailable)\b/i.test(text),
        hasRetry: !!document.querySelector("[data-wds-boot-retry], button"),
        duplicateH1: document.querySelectorAll("h1").length > 1,
        bodyLen: text.length
      };
    });

    links = (await collectLinks(page)).filter(sameOrigin);

    // light interactions: click first visible primary CTA if present (stay same origin)
    try {
      const cta = page.locator("a.wds-btn--primary, button.wds-btn--primary").first();
      if (await cta.count()) {
        // don't navigate away for audit of THIS route — just check visibility
        visibleFlags.primaryCtaVisible = await cta.isVisible();
      }
    } catch {
      /* ignore */
    }

    // axe
    try {
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      axe = {
        violations: results.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.length
        })),
        passes: results.passes.length
      };
    } catch (e) {
      axe = { error: String(e.message || e) };
    }

    const shotName = `${viewportName}__${slug(finalUrl)}${geoMode && geoMode !== "default" ? "__" + geoMode : ""}.png`;
    const shotPath = path.join(ROOT, viewportName, shotName);
    await page.screenshot({ path: shotPath, fullPage: true });
    screenshot = path.relative(ROOT, shotPath);
  } catch (e) {
    navError = String(e.message || e);
    try {
      const shotName = `${viewportName}__${slug(url)}__ERROR.png`;
      const shotPath = path.join(ROOT, viewportName, shotName);
      await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {});
      screenshot = path.relative(ROOT, shotPath);
    } catch {
      /* ignore */
    }
  }

  await context.close();

  // dedupe failed requests
  const seen = new Set();
  const failedUnique = [];
  for (const f of failedRequests) {
    const k = f.url + "|" + f.error;
    if (seen.has(k)) continue;
    seen.add(k);
    failedUnique.push(f);
  }

  return {
    url,
    viewport: viewportName,
    geoMode: geoMode || "default",
    httpStatus: navStatus,
    finalUrl,
    title,
    h1,
    navError,
    timings,
    consoleErrors: [...new Set(consoleErrors)].slice(0, 40),
    consoleWarnings: [...new Set(consoleWarnings)].slice(0, 40),
    failedRequests: failedUnique.slice(0, 50),
    visibleFlags,
    axe,
    screenshot,
    discoveredLinks: links.map(normalize),
    auditedAt: new Date().toISOString()
  };
}

async function mapSmoke(browser) {
  const url = BASE + "/apps/shed-hunting/map/";
  const context = await browser.newContext({
    viewport: DESKTOP,
    geolocation: { latitude: 41.3226, longitude: -74.8024 },
    permissions: ["geolocation"]
  });
  const page = await context.newPage();
  const failed = [];
  page.on("requestfailed", (r) => failed.push({ url: r.url(), error: r.failure()?.errorText }));
  page.on("response", (r) => {
    if (r.status() >= 400) failed.push({ url: r.url(), error: "HTTP " + r.status() });
  });
  const result = {
    route: url,
    steps: [],
    ok: false
  };
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    await page.waitForTimeout(3000);
    result.steps.push("loaded");
    await page.screenshot({
      path: path.join(ROOT, "desktop", "map__sheds_before.png"),
      fullPage: false
    });
    // try zoom buttons if present
    const zin = page.locator("[data-map-zoom-in], .leaflet-control-zoom-in, button:has-text('+')").first();
    if (await zin.count()) {
      await zin.click({ timeout: 3000 }).catch(() => {});
      result.steps.push("zoom-in-attempted");
    }
    // pan via mouse drag on map container
    const map = page.locator(".leaflet-container, [data-map], .sheds-map, #map").first();
    if (await map.count()) {
      const box = await map.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 40);
        await page.mouse.up();
        result.steps.push("pan-attempted");
      }
    }
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(ROOT, "desktop", "map__sheds_after.png"),
      fullPage: false
    });
    result.ok = true;
    result.failedRequests = failed.slice(0, 30);
    result.tileFailures = failed.filter((f) => /tile|openstreetmap|mapbox|cdn/i.test(f.url));
  } catch (e) {
    result.error = String(e.message || e);
  }
  await context.close();
  return result;
}

async function locationMatrix(browser) {
  const targets = [
    BASE + "/apps/dashboard/",
    BASE + "/apps/foragecast/",
    BASE + "/apps/fieldry/"
  ];
  const modes = ["granted", "denied", "unavailable"];
  const out = [];
  for (const mode of modes) {
    for (const url of targets) {
      out.push(await auditRoute(browser, url, "desktop", DESKTOP, mode));
    }
  }
  return out;
}

async function interactionSmoke(browser) {
  const notes = [];
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();

  // Home search
  try {
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    const search = page.locator("#was-studio-search");
    if (await search.count()) {
      await search.fill("fieldry");
      await page.waitForTimeout(500);
      const results = await page.locator("#was-studio-search-results li, #was-studio-search-results a").count();
      notes.push({
        test: "studio-home-search",
        ok: results > 0,
        detail: `results=${results}`
      });
      await page.screenshot({
        path: path.join(ROOT, "desktop", "interaction__home_search.png")
      });
    } else {
      notes.push({ test: "studio-home-search", ok: false, detail: "search input missing" });
    }
  } catch (e) {
    notes.push({ test: "studio-home-search", ok: false, detail: String(e.message || e) });
  }

  // Contact form validation without submit of real message — fill then clear / check required
  try {
    await page.goto(BASE + "/contact.html", { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    const form = page.locator("form").first();
    if (await form.count()) {
      const email = page.locator('input[type="email"], input[name*="email" i]').first();
      if (await email.count()) {
        await email.fill("not-an-email");
        await email.blur();
        notes.push({
          test: "contact-email-field-present",
          ok: true,
          detail: "filled invalid email; did not submit form"
        });
      } else {
        notes.push({ test: "contact-form", ok: true, detail: "form present; no email field found" });
      }
      await page.screenshot({
        path: path.join(ROOT, "desktop", "interaction__contact.png"),
        fullPage: true
      });
    } else {
      notes.push({ test: "contact-form", ok: false, detail: "no form" });
    }
  } catch (e) {
    notes.push({ test: "contact-form", ok: false, detail: String(e.message || e) });
  }

  // Keyboard focus visibility on home
  try {
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const style = window.getComputedStyle(el);
      return {
        tag: el.tagName,
        text: (el.textContent || "").trim().slice(0, 80),
        outline: style.outlineStyle + " " + style.outlineWidth
      };
    });
    notes.push({
      test: "keyboard-tab-focus",
      ok: !!focused,
      detail: JSON.stringify(focused)
    });
  } catch (e) {
    notes.push({ test: "keyboard-tab-focus", ok: false, detail: String(e.message || e) });
  }

  await context.close();
  return notes;
}

async function main() {
  ensureDirs();
  const startedAt = new Date().toISOString();
  console.log("Live audit starting", BASE, startedAt);

  const browser = await chromium.launch({ headless: true });
  const queue = [...SEED.map((p) => normalize(BASE + p))];
  const seen = new Set();
  const routeResults = [];

  // Crawl + desktop audit
  while (queue.length && seen.size < MAX_ROUTES) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    // skip binary-ish
    if (/\.(png|jpe?g|gif|svg|webp|css|js|json|map|ico|woff2?)(\?|$)/i.test(url)) continue;
    seen.add(url);
    console.log(`[desktop ${seen.size}/${MAX_ROUTES}]`, url);
    const result = await auditRoute(browser, url, "desktop", DESKTOP, "default");
    routeResults.push(result);
    for (const link of result.discoveredLinks || []) {
      if (!seen.has(link) && sameOrigin(link)) queue.push(link);
    }
  }

  // Mobile audit for seed + high-value routes (subset)
  const mobileTargets = [
    ...SEED.map((p) => normalize(BASE + p)),
    ...routeResults
      .filter((r) => r.httpStatus && r.httpStatus >= 400)
      .map((r) => r.finalUrl || r.url)
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 35);

  for (const url of mobileTargets) {
    console.log("[mobile]", url);
    routeResults.push(await auditRoute(browser, url, "mobile", MOBILE, "default"));
  }

  console.log("[location matrix]");
  const locationResults = await locationMatrix(browser);
  routeResults.push(...locationResults);

  console.log("[map smoke]");
  const mapResult = await mapSmoke(browser);

  console.log("[interactions]");
  const interactions = await interactionSmoke(browser);

  await browser.close();

  // Persist machine-readable
  const payload = {
    base: BASE,
    startedAt,
    finishedAt: new Date().toISOString(),
    viewports: { desktop: DESKTOP, mobile: MOBILE },
    routeCount: routeResults.length,
    routes: routeResults,
    map: mapResult,
    interactions
  };
  fs.writeFileSync(path.join(ROOT, "route-results.json"), JSON.stringify(payload, null, 2));

  // Console errors md
  const byRouteErr = {};
  for (const r of routeResults) {
    if (!r.consoleErrors?.length) continue;
    const key = `${r.viewport} ${r.finalUrl || r.url}`;
    byRouteErr[key] = r.consoleErrors;
  }
  fs.writeFileSync(
    path.join(ROOT, "console-errors.md"),
    "# Console Errors\n\n" +
      Object.entries(byRouteErr)
        .map(([k, errs]) => `## ${k}\n\n` + errs.map((e) => `- \`${e.replace(/`/g, "'")}\``).join("\n") + "\n")
        .join("\n") || "_No console errors captured._\n"
  );

  // Network failures
  const byRouteNet = {};
  for (const r of routeResults) {
    if (!r.failedRequests?.length) continue;
    const key = `${r.viewport} ${r.finalUrl || r.url}`;
    byRouteNet[key] = r.failedRequests;
  }
  fs.writeFileSync(
    path.join(ROOT, "network-failures.md"),
    "# Network Failures\n\n" +
      Object.entries(byRouteNet)
        .map(
          ([k, rows]) =>
            `## ${k}\n\n` +
            rows.map((f) => `- \`${f.method || "GET"}\` ${f.url} — ${f.error}`).join("\n") +
            "\n"
        )
        .join("\n") || "_No failed network requests captured._\n"
  );

  // Accessibility summary
  const a11yLines = ["# Accessibility Findings\n", "Automated axe-core (wcag2a/aa) via @axe-core/playwright.\n"];
  for (const r of routeResults.filter((x) => x.viewport === "desktop" && x.axe && x.axe.violations)) {
    if (!r.axe.violations.length) continue;
    a11yLines.push(`## ${r.finalUrl || r.url}\n`);
    for (const v of r.axe.violations) {
      a11yLines.push(`- **${v.id}** (${v.impact}) — ${v.description} — nodes: ${v.nodes}`);
    }
    a11yLines.push("");
  }
  if (a11yLines.length <= 2) a11yLines.push("_No axe violations reported on audited desktop routes._\n");
  fs.writeFileSync(path.join(ROOT, "accessibility.md"), a11yLines.join("\n"));

  // Performance
  const slow = routeResults
    .filter((r) => r.timings && (r.timings.usableMs > 5000 || r.timings.stuckLoading))
    .map((r) => ({
      url: r.finalUrl || r.url,
      viewport: r.viewport,
      usableMs: r.timings.usableMs,
      stuckLoading: r.timings.stuckLoading,
      perf: r.timings.perf
    }));
  fs.writeFileSync(
    path.join(ROOT, "performance.md"),
    "# Performance Observations\n\n" +
      "Measured via Playwright navigation timing + custom usable-content wait (not Lighthouse).\n\n" +
      `Routes audited: **${routeResults.length}**\n\n` +
      "## Slow or stuck (>5s usable wait or still loading)\n\n" +
      (slow.length
        ? slow
            .map(
              (s) =>
                `- \`${s.viewport}\` ${s.url} — usableMs=${s.usableMs}` +
                (s.stuckLoading ? " **STUCK LOADING**" : "")
            )
            .join("\n")
        : "_None flagged._") +
      "\n\n## Map smoke\n\n```json\n" +
      JSON.stringify(mapResult, null, 2) +
      "\n```\n"
  );

  // Defects synthesis
  const defects = [];
  function addDefect(d) {
    defects.push(d);
  }

  for (const r of routeResults) {
    const route = r.finalUrl || r.url;
    if (r.navError) {
      addDefect({
        id: `NAV-${slug(route)}-${r.viewport}`,
        severity: "P0",
        route,
        viewport: r.viewport,
        steps: [`Navigate to ${r.url}`],
        expected: "Page loads",
        actual: r.navError,
        evidence: r.screenshot,
        repair: "Investigate deploy/routing or server error"
      });
    }
    if (r.httpStatus && r.httpStatus >= 400) {
      addDefect({
        id: `HTTP-${r.httpStatus}-${slug(route)}`,
        severity: r.httpStatus === 404 ? "P0" : "P1",
        route,
        viewport: r.viewport,
        steps: [`GET ${r.url}`],
        expected: "2xx",
        actual: `HTTP ${r.httpStatus} → ${route}`,
        evidence: r.screenshot,
        repair: "Fix route, redirect, or remove link"
      });
    }
    if (r.timings?.stuckLoading) {
      addDefect({
        id: `LOAD-${slug(route)}-${r.viewport}`,
        severity: "P1",
        route,
        viewport: r.viewport,
        steps: [`Open ${route}`, "Wait 15s"],
        expected: "Main content usable",
        actual: "Still showed loading/boot/busy state after 15s",
        evidence: r.screenshot,
        repair: "Fix boot timeout, provider hang, or JS error"
      });
    }
    if (r.consoleErrors?.length) {
      addDefect({
        id: `CONSOLE-${slug(route)}-${r.viewport}`,
        severity: "P2",
        route,
        viewport: r.viewport,
        steps: [`Open ${route}`, "Observe console"],
        expected: "No page errors",
        actual: r.consoleErrors.slice(0, 5).join(" | "),
        evidence: "console-errors.md",
        repair: "Fix JS exceptions / missing modules"
      });
    }
    const criticalNet = (r.failedRequests || []).filter(
      (f) => !/fonts\.g|google|analytics|doubleclick/i.test(f.url)
    );
    if (criticalNet.length) {
      addDefect({
        id: `NET-${slug(route)}-${r.viewport}`,
        severity: "P2",
        route,
        viewport: r.viewport,
        steps: [`Open ${route}`],
        expected: "Assets and APIs succeed or degrade honestly",
        actual: criticalNet
          .slice(0, 5)
          .map((f) => `${f.error} ${f.url}`)
          .join(" | "),
        evidence: "network-failures.md",
        repair: "Fix asset paths / API error handling"
      });
    }
    if (r.visibleFlags?.duplicateH1) {
      addDefect({
        id: `H1-${slug(route)}`,
        severity: "P3",
        route,
        viewport: r.viewport,
        steps: [`Open ${route}`],
        expected: "Single primary H1",
        actual: "Multiple H1 elements",
        evidence: r.screenshot,
        repair: "Consolidate heading hierarchy"
      });
    }
    if (r.axe?.violations?.some((v) => v.impact === "critical" || v.impact === "serious")) {
      addDefect({
        id: `A11Y-${slug(route)}`,
        severity: "P2",
        route,
        viewport: r.viewport,
        steps: [`Open ${route}`, "Run axe"],
        expected: "No serious/critical axe violations",
        actual: r.axe.violations
          .filter((v) => v.impact === "critical" || v.impact === "serious")
          .map((v) => v.id)
          .join(", "),
        evidence: "accessibility.md",
        repair: "Address axe findings"
      });
    }
  }

  if (mapResult && !mapResult.ok) {
    addDefect({
      id: "MAP-sheds",
      severity: "P1",
      route: BASE + "/apps/shed-hunting/map/",
      viewport: "desktop",
      steps: ["Open Sheds map", "Attempt pan/zoom"],
      expected: "Map interactive",
      actual: mapResult.error || "map smoke failed",
      evidence: "desktop/map__sheds_before.png",
      repair: "Fix map boot / Leaflet assets"
    });
  }

  // Deduplicate similar defects by id
  const defectMap = new Map();
  for (const d of defects) {
    if (!defectMap.has(d.id)) defectMap.set(d.id, d);
  }
  const defectList = [...defectMap.values()].sort((a, b) =>
    a.severity.localeCompare(b.severity)
  );

  let defectsMd = `# Defects — Live Site QA\n\n**Base:** ${BASE}\n**Generated:** ${new Date().toISOString()}\n\nTotal unique defects: **${defectList.length}**\n\n`;
  for (const d of defectList) {
    defectsMd += `## ${d.severity} — ${d.id}\n\n`;
    defectsMd += `- **Route:** ${d.route}\n`;
    defectsMd += `- **Viewport:** ${d.viewport}\n`;
    defectsMd += `- **Steps:** ${d.steps.join(" → ")}\n`;
    defectsMd += `- **Expected:** ${d.expected}\n`;
    defectsMd += `- **Actual:** ${d.actual}\n`;
    defectsMd += `- **Evidence:** ${d.evidence}\n`;
    defectsMd += `- **Suggested repair:** ${d.repair}\n\n`;
  }
  fs.writeFileSync(path.join(ROOT, "DEFECTS.md"), defectsMd);

  // Executive README drafted lightly here; enrichment script may refine
  const p0 = defectList.filter((d) => d.severity === "P0").length;
  const p1 = defectList.filter((d) => d.severity === "P1").length;
  const stuck = routeResults.filter((r) => r.timings?.stuckLoading).length;
  const httpBad = routeResults.filter((r) => r.httpStatus && r.httpStatus >= 400).length;

  fs.writeFileSync(
    path.join(ROOT, "artifacts/summary.json"),
    JSON.stringify(
      {
        base: BASE,
        startedAt,
        finishedAt: new Date().toISOString(),
        routesAudited: routeResults.length,
        uniqueDesktopRoutes: seen.size,
        defects: defectList.length,
        p0,
        p1,
        stuckLoading: stuck,
        httpErrors: httpBad,
        mapOk: !!(mapResult && mapResult.ok),
        interactions
      },
      null,
      2
    )
  );

  console.log("Audit complete.");
  console.log("Routes:", routeResults.length, "Defects:", defectList.length, "P0:", p0, "P1:", p1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
