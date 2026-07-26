#!/usr/bin/env node
/**
 * Production route + link audit crawler for Waypoint Studio.
 * Usage: node automation/audit-production-crawl.mjs [baseUrl]
 * Writes JSON evidence under docs/audits/evidence/2026-07/json/
 */
import fs from "fs";
import http from "http";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";
import { setTimeout as delay } from "timers/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = (process.argv[2] || "https://waypointstudio.org").replace(/\/$/, "");
const OUT = path.join(ROOT, "docs/audits/evidence/2026-07/json");
const CACHE_BUST = "audit=" + Date.now();

const SEED = [
  "/",
  "/apps/dashboard/",
  "/apps/scenes/",
  "/apps/photo-coach/",
  "/apps/photo-library/",
  "/apps/hidden-landscapes/",
  "/apps/scenes/living-scenes/",
  "/apps/scenes/scene-builder/",
  "/apps/scenes/photographer-profile/",
  "/apps/waypoint-scenes/",
  "/apps/shed-hunting/",
  "/apps/shed-hunting/map/",
  "/sheds/",
  "/map/",
  "/scenes/",
  "/about.html",
  "/contact.html",
  "/privacy.html",
  "/terms.html",
  "/support.html",
  "/settings.html",
  "/knowledge.html",
  "/status.html",
  "/debug.html",
  "/kiosk.html",
  "/404.html",
  "/dashboard.html",
  "/dashboard/",
  "/incubator/",
  "/volunteer/",
  "/articles/",
  "/apps/animal-vision/",
  "/apps/foragecast/",
  "/apps/fieldry/",
  "/apps/steepleaf/",
  "/apps/savant-sommelier/",
  "/apps/signalterrain/",
  "/apps/signalterrain/cyber/",
  "/apps/waypoint-volunteer/",
  "/apps/landscape-interpretation/",
  "/apps/terrainbound/",
  "/apps/photo-pipeline/",
  "/apps/dashboard/contact.html",
  "/data/build-info.json",
  "/data/live.json",
  "/data/health.json",
  "/sitemap.xml",
  "/robots.txt",
  "/site.webmanifest",
  "/waypoint-importer/",
  "/waypoint-importer/README.md",
  "/private/",
  "/reports/owner-production-audit.html",
  "/apps/scenes/portfolio/",
  "/apps/scenes/portfolio/assistant.html",
  "/apps/scenes/portfolio/builder.html",
  "/apps/scenes/portfolio/health.html",
  "/apps/scenes/portfolio/output.html"
];

function fetchUrl(url, redirects = 0) {
  return new Promise((resolve) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(
      url,
      {
        headers: {
          "User-Agent": "WaypointStudio-Production-Audit/2026-07",
          "Cache-Control": "no-cache",
          Pragma: "no-cache"
        },
        timeout: 20000
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const body = Buffer.concat(chunks);
          const loc = res.headers.location;
          if (res.statusCode >= 300 && res.statusCode < 400 && loc && redirects < 5) {
            const next = new URL(loc, url).href;
            return fetchUrl(next, redirects + 1).then((r) =>
              resolve({
                ...r,
                redirectChain: [url, ...(r.redirectChain || [])],
                finalUrl: r.finalUrl || next,
                status: r.status,
                redirectStatus: res.statusCode
              })
            );
          }
          resolve({
            url,
            finalUrl: url,
            status: res.statusCode,
            contentType: res.headers["content-type"] || "",
            body: body.toString("utf8"),
            size: body.length,
            redirectChain: [],
            headers: {
              "cache-control": res.headers["cache-control"] || null,
              "strict-transport-security": res.headers["strict-transport-security"] || null,
              "content-security-policy": res.headers["content-security-policy"] || null,
              "x-frame-options": res.headers["x-frame-options"] || null,
              "x-content-type-options": res.headers["x-content-type-options"] || null
            }
          });
        });
      }
    );
    req.on("error", (e) =>
      resolve({ url, status: 0, error: e.message, body: "", size: 0, redirectChain: [], headers: {} })
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ url, status: 0, error: "timeout", body: "", size: 0, redirectChain: [], headers: {} });
    });
  });
}

function withBust(urlPath) {
  const u = new URL(urlPath, BASE);
  if (!u.searchParams.has("audit")) u.searchParams.set("audit", String(Date.now()));
  return u.href;
}

function extractLinks(html, pageUrl) {
  const links = [];
  const re = /<(a|link|area)\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const href = m[2].trim();
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:") || href.startsWith("#")) {
      links.push({ href, kind: href.startsWith("#") ? "hash" : href.split(":")[0], resolved: null });
      continue;
    }
    try {
      const resolved = new URL(href, pageUrl).href;
      links.push({ href, kind: "url", resolved });
    } catch {
      links.push({ href, kind: "invalid", resolved: null });
    }
  }
  return links;
}

function classifyPage(res, pathName) {
  const body = res.body || "";
  const lower = body.toLowerCase();
  const flags = [];
  if (/coming soon|coming later|not connected yet|incubator|placeholder|future experience|early scene builder/i.test(body)) {
    flags.push("unfinished-language");
  }
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(body) && !/example|docs|comment/i.test(pathName)) {
    flags.push("localhost-reference");
  }
  if (/instrument not connected|phase \d shell|dashboard rebuild|outdoor os/i.test(body)) {
    flags.push("developer-chrome");
  }
  if (res.status === 404 || /page not found|404/i.test(body.slice(0, 2000))) flags.push("not-found");
  if (res.status >= 500) flags.push("server-error");
  if (res.status === 0) flags.push("unreachable");
  if (/wds-dashboard-rebuild/.test(body)) flags.push("dashboard-rebuild");
  if (/wds-dashboard-os/.test(body)) flags.push("dashboard-os");
  if (/leaflet/i.test(body)) flags.push("leaflet-map");
  let visual = "unknown";
  if (res.status === 200 && /text\/html/.test(res.contentType || "")) {
    if (flags.includes("not-found")) visual = "broken";
    else if (flags.includes("unfinished-language")) visual = "incomplete";
    else if (pathName.includes("debug") || pathName.includes("status") || pathName.includes("kiosk"))
      visual = "internal";
    else visual = "current";
  } else if (res.status === 200) visual = "asset";
  else if (res.status >= 300 && res.status < 400) visual = "redirect";
  else visual = "broken";
  return { flags, visual, title: (body.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || null };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const routeResults = [];
  const allLinks = [];
  const visited = new Set();
  const queue = SEED.slice();

  // Also seed from sitemap
  const sm = await fetchUrl(withBust("/sitemap.xml"));
  if (sm.status === 200) {
    const locs = [...sm.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    for (const loc of locs) {
      try {
        const p = new URL(loc).pathname + (new URL(loc).pathname.endsWith("/") || loc.includes(".") ? "" : "/");
        if (!queue.includes(p) && !queue.includes(new URL(loc).pathname)) queue.push(new URL(loc).pathname);
      } catch {}
    }
  }

  for (const seed of queue) {
    const pathName = seed.startsWith("http") ? new URL(seed).pathname : seed;
    if (visited.has(pathName)) continue;
    visited.add(pathName);
    const url = seed.startsWith("http") ? seed + (seed.includes("?") ? "&" : "?") + CACHE_BUST : withBust(seed);
    const res = await fetchUrl(url);
    const meta = classifyPage(res, pathName);
    const links = /text\/html/.test(res.contentType || "") ? extractLinks(res.body, res.finalUrl || url) : [];
    for (const l of links) {
      allLinks.push({ from: pathName, ...l });
      if (l.resolved && l.resolved.startsWith(BASE) && !visited.has(new URL(l.resolved).pathname)) {
        const p = new URL(l.resolved).pathname;
        // crawl only same-origin HTML-ish paths, skip large assets
        if (!/\.(css|js|png|jpe?g|webp|gif|svg|woff2?|ttf|map|json|xml|ico)$/i.test(p)) {
          if (!queue.includes(p) && queue.length < 250) queue.push(p);
        }
      }
    }
    routeResults.push({
      path: pathName,
      status: res.status,
      finalUrl: res.finalUrl,
      redirectChain: res.redirectChain,
      contentType: res.contentType,
      size: res.size,
      title: meta.title,
      visual: meta.visual,
      flags: meta.flags,
      headers: res.headers,
      error: res.error || null,
      linkCount: links.length
    });
    await delay(40);
  }

  // Follow unique internal destinations for link integrity
  const internalDests = [
    ...new Set(
      allLinks
        .filter((l) => l.resolved && l.resolved.startsWith(BASE))
        .map((l) => {
          try {
            return new URL(l.resolved).pathname;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
    )
  ];

  const linkProbe = [];
  for (const dest of internalDests) {
    if (/\.(css|js|png|jpe?g|webp|gif|svg|woff2?|ttf|map|ico)$/i.test(dest)) {
      // light probe assets
    }
    const res = await fetchUrl(withBust(dest));
    linkProbe.push({
      path: dest,
      status: res.status,
      finalUrl: res.finalUrl,
      ok: res.status >= 200 && res.status < 400,
      error: res.error || null
    });
    await delay(20);
  }

  const brokenLinks = linkProbe.filter((l) => !l.ok);
  const localhostLinks = allLinks.filter((l) => /localhost|127\.0\.0\.1/.test(l.href + (l.resolved || "")));
  const externalLinks = allLinks.filter((l) => l.resolved && !l.resolved.startsWith(BASE) && l.kind === "url");

  const summary = {
    base: BASE,
    crawledAt: new Date().toISOString(),
    routes: routeResults.length,
    linksExtracted: allLinks.length,
    uniqueInternalDestinations: internalDests.length,
    brokenInternalDestinations: brokenLinks.length,
    localhostReferences: localhostLinks.length,
    externalLinks: externalLinks.length,
    unfinishedRoutes: routeResults.filter((r) => r.flags.includes("unfinished-language")).map((r) => r.path),
    brokenRoutes: routeResults.filter((r) => r.visual === "broken" || r.status === 0 || r.status >= 400).map((r) => ({
      path: r.path,
      status: r.status,
      error: r.error
    })),
    productionBuild: routeResults.find((r) => r.path === "/data/build-info.json") || null
  };

  // Parse build-info if present
  const bi = routeResults.find((r) => r.path === "/data/build-info.json");
  if (bi) {
    try {
      const fetched = await fetchUrl(withBust("/data/build-info.json"));
      summary.productionBuild = JSON.parse(fetched.body);
    } catch {}
  }

  fs.writeFileSync(path.join(OUT, "route-results.json"), JSON.stringify(routeResults, null, 2));
  fs.writeFileSync(path.join(OUT, "link-extract.json"), JSON.stringify(allLinks, null, 2));
  fs.writeFileSync(path.join(OUT, "link-probe.json"), JSON.stringify(linkProbe, null, 2));
  fs.writeFileSync(path.join(OUT, "crawl-summary.json"), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(OUT, "broken-links.json"), JSON.stringify(brokenLinks, null, 2));

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
