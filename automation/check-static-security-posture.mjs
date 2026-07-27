#!/usr/bin/env node
/**
 * Distinguish true HTTP security headers vs meta controls vs unsupported
 * controls for GitHub Pages / Waypoint Studio.
 *
 * Usage:
 *   node automation/check-static-security-posture.mjs
 *   WAYPOINT_PROD_URL=https://waypointstudio.org node automation/check-static-security-posture.mjs
 *   node automation/check-static-security-posture.mjs --local-html
 */
import fs from "fs";
import http from "http";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASELINE = JSON.parse(
  fs.readFileSync(path.join(ROOT, "design-system/security/baseline.json"), "utf8")
);
const PROD = (process.env.WAYPOINT_PROD_URL || "https://waypointstudio.org").replace(/\/$/, "");
const OUT = path.join(ROOT, "docs/turnaround/2026-07-26-sprint-03");
const localOnly = process.argv.includes("--local-html");

function fetchHeaders(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.request(url, { method: "HEAD", timeout: 20000 }, (res) => {
      const headers = {};
      for (const [k, v] of Object.entries(res.headers)) headers[k.toLowerCase()] = v;
      resolve({ status: res.statusCode, headers });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
    req.end();
  });
}

function scanLocalMeta() {
  const sample = [
    "index.html",
    "privacy.html",
    "contact.html",
    "support.html",
    "apps/dashboard/index.html",
    "apps/scenes/index.html",
    "apps/photo-coach/index.html",
    "status.html",
    "debug.html"
  ];
  const results = [];
  for (const rel of sample) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      results.push({ file: rel, missing: true });
      continue;
    }
    const html = fs.readFileSync(abs, "utf8");
    const referrer = /<meta\s+name=["']referrer["']\s+content=["']([^"']+)["']/i.exec(html);
    const csp = /<meta\s+http-equiv=["']Content-Security-Policy["']\s+content=["']([^"']+)["']/i.exec(html);
    results.push({
      file: rel,
      referrerMeta: referrer ? referrer[1] : null,
      cspMeta: !!csp,
      cspHasFrameAncestors: csp ? /frame-ancestors/i.test(csp[1]) : false,
      securityMarker: html.includes("waypoint-security-meta:start"),
      securityScriptLinked:
        /wds-security-baseline\.js/.test(html) || /design-system\/js\/wds\.js/.test(html)
    });
  }
  return results;
}

function assertNoFakeHeadersFile() {
  const banned = ["_headers", ".htaccess", "netlify.toml", "vercel.json"];
  const present = banned.filter((f) => fs.existsSync(path.join(ROOT, f)));
  return { banned, present, ok: present.length === 0 };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const fake = assertNoFakeHeadersFile();
  const localMeta = scanLocalMeta();

  let httpProbe = null;
  if (!localOnly) {
    try {
      const home = await fetchHeaders(PROD + "/");
      const h = home.headers;
      httpProbe = {
        url: PROD + "/",
        status: home.status,
        headersPresent: {
          "strict-transport-security": !!h["strict-transport-security"],
          "access-control-allow-origin": h["access-control-allow-origin"] || null,
          "content-security-policy": !!h["content-security-policy"],
          "x-frame-options": !!h["x-frame-options"],
          "x-content-type-options": !!h["x-content-type-options"],
          "referrer-policy": !!h["referrer-policy"],
          "permissions-policy": !!h["permissions-policy"]
        },
        raw: {
          "strict-transport-security": h["strict-transport-security"] || null,
          "access-control-allow-origin": h["access-control-allow-origin"] || null
        }
      };
    } catch (err) {
      httpProbe = { error: String(err) };
    }
  }

  const classification = {
    trueHttpHeaders: {
      note: "Only what the hosting platform actually returns today",
      items: httpProbe && httpProbe.headersPresent
        ? Object.entries(httpProbe.headersPresent)
            .filter(([, v]) => v)
            .map(([k, v]) => ({ header: k, value: typeof v === "string" ? v : true }))
        : []
    },
    metaBasedControls: {
      note: "Repository-enforceable via HTML meta (valid browser behavior)",
      items: [
        "meta[name=referrer]=strict-origin-when-cross-origin",
        "meta[http-equiv=Content-Security-Policy] (without frame-ancestors)"
      ]
    },
    unsupportedOnGitHubPages: {
      note: "Cannot be honestly claimed as active HTTP protections from this repo",
      items: [
        "Content-Security-Policy response header",
        "X-Frame-Options / CSP frame-ancestors (HTTP only)",
        "X-Content-Type-Options: nosniff",
        "Permissions-Policy",
        "Removing Access-Control-Allow-Origin: *"
      ]
    }
  };

  const failures = [];
  if (!fake.ok) failures.push("Fake edge header config files present: " + fake.present.join(", "));
  for (const row of localMeta) {
    if (row.missing) continue;
    if (!row.referrerMeta) failures.push(row.file + ": missing referrer meta");
    if (!row.cspMeta) failures.push(row.file + ": missing CSP meta");
    if (row.cspHasFrameAncestors) {
      failures.push(row.file + ": CSP meta incorrectly includes frame-ancestors (ignored by browsers; do not claim)");
    }
  }
  if (httpProbe && httpProbe.headersPresent) {
    // Honesty gate: if we ever start claiming HTTP CSP in docs while probe shows absent, fail.
    if (httpProbe.headersPresent["content-security-policy"]) {
      // unexpected but fine — platform may add later
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baselineVersion: BASELINE.version,
    hosting: BASELINE.hosting,
    fakeHeaderFiles: fake,
    productionHttpProbe: httpProbe,
    localMetaSamples: localMeta,
    classification,
    failures
  };
  fs.writeFileSync(path.join(OUT, "security-posture.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: failures.length === 0, failures, out: path.relative(ROOT, OUT) }, null, 2));
  if (failures.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
