#!/usr/bin/env node
/**
 * Public Dashboard delivery verifier — ordinary URLs, multi-UA, multi-probe.
 *
 * Proves (or fails) whether the public origin currently serves Rebuild Dashboard
 * consistently. A cache-busted URL alone is NOT treated as proof that ordinary
 * users receive the current release.
 *
 * Usage:
 *   node automation/verify-dashboard-production.mjs
 *   WAYPOINT_PROD_URL=https://waypointstudio.org EXPECTED_SHORT=bbfdfb2 \
 *     node automation/verify-dashboard-production.mjs
 *   PROBES=5 REPORT_PATH=/tmp/dash-verify.json node automation/verify-dashboard-production.mjs
 *
 * Exit 0 = ordinary Dashboard delivery matches expected Rebuild build.
 * Exit 1 = delivery failure / multi-version / Recovery|Outdoor-OS markers.
 * Exit 2 = configuration error.
 */
import { createHash } from "crypto";
import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { pathToFileURL } from "url";

const PROD = (process.env.WAYPOINT_PROD_URL || "https://waypointstudio.org").replace(/\/$/, "");
const PROBES = Math.max(1, Number(process.env.PROBES || 5));
const REPORT_PATH = process.env.REPORT_PATH || "";
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS || 20000);

const USER_AGENTS = {
  desktop:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  android:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
};

const REBUILD_MARKERS = [
  { id: "boot-opening-workspace", re: /Opening workspace/i, required: true },
  { id: "css-rebuild", re: /wds-dashboard-rebuild\.css/i, required: true },
  { id: "data-product-dashboard", re: /data-product=["']dashboard["']/i, required: true },
];

const FORBIDDEN_DASHBOARD_MARKERS = [
  { id: "recovery-building-briefing", re: /building your briefing/i },
  { id: "recovery-shell-first", re: /Shell first\s*[—–-]\s*live conditions fill in/i },
  { id: "recovery-outdoor-overview-h1", re: /<h1[^>]*>\s*Outdoor overview\s*<\/h1>/i },
  { id: "os-css", re: /wds-dashboard-os\.css/i },
  { id: "os-boot-finding", re: /Finding today['’]s conditions/i },
  { id: "os-boot-class", re: /wdb-os-boot/i },
];

const HEADER_KEYS = [
  "age",
  "cache-control",
  "etag",
  "last-modified",
  "via",
  "x-cache",
  "x-served-by",
  "x-cache-hits",
  "content-length",
  "content-type",
  "server",
  "vary",
  "expires",
  "location",
  "fastly-debug-path",
  "fastly-debug-ttl",
  "x-fastly-request-id",
  "x-github-request-id",
];

function resolveExpectedShort() {
  if (process.env.EXPECTED_SHORT) return process.env.EXPECTED_SHORT.trim().slice(0, 7);
  if (process.env.EXPECTED_SHA) return process.env.EXPECTED_SHA.trim().slice(0, 7);
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.trim().slice(0, 7);
  try {
    return execSync("git rev-parse --short=7 HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function pickHeaders(headers) {
  const out = {};
  for (const key of HEADER_KEYS) {
    const v = headers.get(key);
    if (v != null) out[key] = v;
  }
  return out;
}

function extractBuild(html) {
  const m = html.match(/name=["']waypoint-build["']\s+content=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function extractAssetRefs(html, baseUrl) {
  const refs = [];
  const re = /(?:href|src)=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const raw = m[1];
    if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("data:")) continue;
    if (/^https?:\/\/fonts\./i.test(raw)) continue;
    try {
      const abs = new URL(raw, baseUrl).href;
      if (!abs.startsWith(PROD)) continue;
      if (/\.(css|js)(\?|$)/i.test(abs) || /wds-build\.js/i.test(abs)) refs.push({ raw, abs });
    } catch {
      /* ignore bad URLs */
    }
  }
  const seen = new Set();
  return refs.filter((r) => {
    if (seen.has(r.abs)) return false;
    seen.add(r.abs);
    return true;
  });
}

async function fetchOnce(url, { method = "GET", ua, cacheMode = "ordinary" } = {}) {
  const headers = {
    "user-agent": ua || USER_AGENTS.desktop,
    accept: method === "HEAD" ? "*/*" : "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };
  if (cacheMode === "no-cache") {
    headers["cache-control"] = "no-cache";
    headers.pragma = "no-cache";
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      redirect: "manual",
      headers,
      signal: controller.signal,
    });
    const body = method === "HEAD" ? "" : await res.text();
    return {
      ok: true,
      method,
      requestUrl: url,
      finalUrl: res.url || url,
      status: res.status,
      redirected: res.status >= 300 && res.status < 400,
      location: res.headers.get("location") || null,
      headers: pickHeaders(res.headers),
      body,
      bodyBytes: Buffer.byteLength(body, "utf8"),
      bodySha256: sha256(body),
      build: body ? extractBuild(body) : null,
    };
  } catch (err) {
    return {
      ok: false,
      method,
      requestUrl: url,
      error: err && err.message ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function followToDocument(url, opts) {
  let current = url;
  const chain = [];
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetchOnce(current, opts);
    chain.push(res);
    if (!res.ok) return { chain, document: res };
    if (res.status >= 300 && res.status < 400 && res.location) {
      current = new URL(res.location, current).href;
      continue;
    }
    return { chain, document: res };
  }
  return { chain, document: chain[chain.length - 1] };
}

function markerHits(body, list) {
  return list
    .map((m) => ({ id: m.id, hit: m.re.test(body || ""), required: !!m.required }))
    .filter((m) => m.hit || m.required);
}

function classifyDashboardDocument(doc, expectedShort) {
  const failures = [];
  const notes = [];
  if (!doc.ok) {
    failures.push(`fetch-error: ${doc.error || "unknown"}`);
    return { surface: "dashboard", pass: false, failures, notes, rebuildOk: false };
  }
  if (doc.status !== 200) {
    failures.push(`http-status-${doc.status}`);
  }
  const build = doc.build;
  if (!build) failures.push("missing-waypoint-build");
  else if (expectedShort && build !== expectedShort) {
    failures.push(`build-mismatch: got ${build}, expected ${expectedShort}`);
  }

  const required = REBUILD_MARKERS.map((m) => ({ id: m.id, hit: m.re.test(doc.body || "") }));
  for (const m of required) {
    if (!m.hit) failures.push(`missing-rebuild-marker:${m.id}`);
  }

  const forbidden = FORBIDDEN_DASHBOARD_MARKERS.filter((m) => m.re.test(doc.body || ""));
  for (const m of forbidden) failures.push(`forbidden-marker:${m.id}`);

  if (/data-product=["']studio-home["']/i.test(doc.body || "")) {
    failures.push("homepage-document-served-as-dashboard");
  }

  const rebuildOk =
    required.every((m) => m.hit) &&
    forbidden.length === 0 &&
    build === expectedShort &&
    doc.status === 200;

  if (doc.headers && doc.headers["cache-control"] && /max-age=/i.test(doc.headers["cache-control"])) {
    notes.push(
      `HTTP Cache-Control is ${doc.headers["cache-control"]} (HTML meta no-cache does not override CDN/browser HTTP caching).`,
    );
  }

  return {
    surface: "dashboard",
    pass: failures.length === 0,
    failures,
    notes,
    rebuildOk,
    build,
    requiredMarkers: required,
    forbiddenHits: forbidden.map((m) => m.id),
  };
}

function classifyHomepage(doc) {
  const failures = [];
  const notes = [];
  if (!doc.ok || doc.status !== 200) {
    failures.push(`homepage-fetch-failed:${doc.status || doc.error}`);
    return { surface: "homepage", pass: false, failures, notes };
  }
  const isHome = /data-product=["']studio-home["']/i.test(doc.body || "");
  if (!isHome) notes.push("Homepage did not expose data-product=studio-home (unexpected).");
  if (/Opening workspace/i.test(doc.body || "")) {
    notes.push("Homepage HTML unexpectedly contains Dashboard boot copy.");
  }
  if (/Outdoor overview/i.test(doc.body || "")) {
    notes.push("Homepage/support marketing may still say Outdoor overview (IA copy drift — not Dashboard HTML).");
  }
  const dashLink = /href=["'][^"']*apps\/dashboard\/["']/i.test(doc.body || "");
  if (!dashLink) failures.push("homepage-missing-apps-dashboard-link");
  return {
    surface: "homepage",
    pass: failures.length === 0,
    failures,
    notes,
    isStudioHome: isHome,
    linksToAppsDashboard: dashLink,
    build: doc.build,
  };
}

async function checkServiceWorkerRisks(ua) {
  const paths = ["/sw.js", "/service-worker.js", "/apps/dashboard/sw.js", "/serviceWorker.js"];
  const results = [];
  for (const p of paths) {
    const res = await fetchOnce(`${PROD}${p}`, { ua, cacheMode: "ordinary" });
    results.push({
      path: p,
      status: res.status,
      contentType: res.headers && res.headers["content-type"],
      looksLikeJs:
        res.ok &&
        res.status === 200 &&
        /javascript|ecmascript/i.test((res.headers && res.headers["content-type"]) || "") &&
        !/<html/i.test(res.body || ""),
      bodySha256: res.bodySha256,
    });
  }
  const manifest = await fetchOnce(`${PROD}/site.webmanifest`, { ua });
  let manifestJson = null;
  let startUrl = null;
  try {
    manifestJson = JSON.parse(manifest.body || "{}");
    startUrl = manifestJson.start_url || null;
  } catch {
    /* ignore */
  }
  return {
    swScripts: results,
    activeSwScriptFound: results.some((r) => r.looksLikeJs),
    manifest: {
      status: manifest.status,
      start_url: startUrl,
      startUrlIsHomepage: startUrl === "/" || startUrl === "./" || startUrl === "",
      bodySha256: manifest.bodySha256,
    },
  };
}

async function checkCriticalAssets(doc, ua) {
  const refs = extractAssetRefs(doc.body || "", doc.finalUrl || `${PROD}/apps/dashboard/`);
  const critical = refs.filter((r) =>
    /wds\.js|home-boot\.js|wds-dashboard-rebuild\.css|wds-app-shell\.css|wds\.css|wds-build\.js/i.test(r.abs),
  );
  const assets = [];
  for (const ref of critical) {
    const withQs = await fetchOnce(ref.abs, { ua });
    let withoutQs = null;
    try {
      const u = new URL(ref.abs);
      if (u.search) {
        u.search = "";
        withoutQs = await fetchOnce(u.href, { ua });
      }
    } catch {
      /* ignore */
    }
    assets.push({
      raw: ref.raw,
      url: ref.abs,
      status: withQs.status,
      bodySha256: withQs.bodySha256,
      bytes: withQs.bodyBytes,
      headers: withQs.headers,
      unversioned: withoutQs
        ? {
            url: withoutQs.requestUrl,
            status: withoutQs.status,
            bodySha256: withoutQs.bodySha256,
            sameAsVersioned: withoutQs.bodySha256 === withQs.bodySha256,
          }
        : null,
      markers: {
        hasDashboardRebuildMount: /dashboardRebuild\.mount/i.test(withQs.body || ""),
        hasOsBootCopy: /Finding today['’]s conditions|building your briefing/i.test(withQs.body || ""),
        isRebuildCss: /wdb-r-|wds-dashboard-rebuild/i.test(withQs.body || "") && /\.css/i.test(ref.abs),
      },
    });
  }
  return assets;
}

async function probeMatrix(expectedShort) {
  const ordinaryUrl = `${PROD}/apps/dashboard/`;
  const bustUrl = `${ordinaryUrl}?v=${encodeURIComponent(expectedShort || "probe")}&nocache=${Date.now()}`;
  const probes = [];

  for (let i = 0; i < PROBES; i++) {
    for (const [uaName, ua] of Object.entries(USER_AGENTS)) {
      const { document } = await followToDocument(ordinaryUrl, {
        ua,
        cacheMode: "ordinary",
      });
      const classification = classifyDashboardDocument(document, expectedShort);
      probes.push({
        kind: "ordinary",
        probeIndex: i + 1,
        ua: uaName,
        cacheMode: "ordinary",
        ...document,
        classification,
      });
    }
  }

  // Explicit no-cache + cache-bust — informative only; not sufficient proof alone.
  for (const [uaName, ua] of Object.entries(USER_AGENTS)) {
    const { document } = await followToDocument(bustUrl, { ua, cacheMode: "no-cache" });
    probes.push({
      kind: "cache-bust",
      probeIndex: 1,
      ua: uaName,
      cacheMode: "no-cache",
      ...document,
      classification: classifyDashboardDocument(document, expectedShort),
      note: "Cache-busted probe is supplementary; ordinary probes are authoritative for user delivery.",
    });
  }

  // HEAD on ordinary URL
  const head = await fetchOnce(ordinaryUrl, { method: "HEAD", ua: USER_AGENTS.desktop });
  probes.push({
    kind: "head",
    probeIndex: 1,
    ua: "desktop",
    cacheMode: "ordinary",
    ...head,
    classification: { surface: "dashboard", pass: head.status === 200, failures: head.status === 200 ? [] : [`head-status-${head.status}`] },
  });

  return probes;
}

function summarizeVersions(probes) {
  const docs = probes.filter((p) => p.kind === "ordinary" && p.bodySha256);
  const byHash = new Map();
  for (const p of docs) {
    const entry = byHash.get(p.bodySha256) || {
      bodySha256: p.bodySha256,
      build: p.build,
      count: 0,
      uas: new Set(),
      ages: [],
      xCaches: [],
    };
    entry.count += 1;
    entry.uas.add(p.ua);
    if (p.headers && p.headers.age != null) entry.ages.push(p.headers.age);
    if (p.headers && p.headers["x-cache"]) entry.xCaches.push(p.headers["x-cache"]);
    byHash.set(p.bodySha256, entry);
  }
  return [...byHash.values()].map((v) => ({
    bodySha256: v.bodySha256,
    build: v.build,
    count: v.count,
    uas: [...v.uas],
    ages: v.ages,
    xCaches: v.xCaches,
  }));
}

async function fetchBuildInfo() {
  const res = await fetchOnce(`${PROD}/data/build-info.json`, { ua: USER_AGENTS.desktop });
  let json = null;
  try {
    json = JSON.parse(res.body || "");
  } catch {
    /* ignore */
  }
  return { ...res, json };
}

async function main() {
  const expectedShort = resolveExpectedShort();
  if (!expectedShort) {
    console.error("No EXPECTED_SHA / EXPECTED_SHORT / git HEAD available");
    process.exit(2);
  }

  const startedAt = new Date().toISOString();
  const buildInfo = await fetchBuildInfo();
  const liveShort =
    (buildInfo.json && (buildInfo.json.shortCommit || (buildInfo.json.commit || "").slice(0, 7))) || null;

  const home = await followToDocument(`${PROD}/`, { ua: USER_AGENTS.desktop });
  const support = await followToDocument(`${PROD}/support.html`, { ua: USER_AGENTS.desktop });
  const dashHtml = await followToDocument(`${PROD}/dashboard.html`, { ua: USER_AGENTS.desktop });
  const dashIndex = await followToDocument(`${PROD}/apps/dashboard/index.html`, {
    ua: USER_AGENTS.desktop,
  });

  const probes = await probeMatrix(expectedShort);
  const versions = summarizeVersions(probes);
  const ordinary = probes.filter((p) => p.kind === "ordinary");
  const ordinaryFail = ordinary.filter((p) => !p.classification.pass);

  const sampleDoc = ordinary.find((p) => p.status === 200 && p.body) || ordinary[0];
  const assets = sampleDoc ? await checkCriticalAssets(sampleDoc, USER_AGENTS.desktop) : [];
  const swRisk = await checkServiceWorkerRisks(USER_AGENTS.desktop);

  const homepageClass = classifyHomepage(home.document);
  const supportNotes = [];
  if (support.document && /Outdoor overview/i.test(support.document.body || "")) {
    supportNotes.push("support.html still labels Dashboard as “Outdoor overview” (marketing copy).");
  }
  if (support.document && /href=["']dashboard\.html["']/i.test(support.document.body || "")) {
    supportNotes.push("support.html links via dashboard.html redirect shim (final target should be /apps/dashboard/).");
  }

  const multiVersion = versions.length > 1;
  const failures = [];
  if (liveShort && liveShort !== expectedShort) {
    failures.push(`live-build-info ${liveShort} != expected ${expectedShort}`);
  }
  if (ordinaryFail.length) {
    failures.push(`${ordinaryFail.length}/${ordinary.length} ordinary Dashboard probes failed classification`);
  }
  if (multiVersion) {
    failures.push(`multiple distinct ordinary HTML body hashes detected (${versions.length})`);
  }
  if (swRisk.activeSwScriptFound) {
    failures.push("active service-worker script URL returned JavaScript (registration risk)");
  }
  for (const a of assets) {
    if (a.status !== 200) failures.push(`critical-asset-status-${a.status}:${a.raw}`);
    if (a.markers.hasOsBootCopy) failures.push(`critical-asset-os-or-recovery-copy:${a.raw}`);
  }

  // Distinguish surfaces clearly in report
  const surfaces = {
    homepage: {
      requestUrl: `${PROD}/`,
      finalUrl: home.document.finalUrl,
      status: home.document.status,
      bodySha256: home.document.bodySha256,
      build: home.document.build,
      classification: homepageClass,
    },
    dashboardOrdinary: {
      requestUrl: `${PROD}/apps/dashboard/`,
      distinctVersions: versions,
      ordinaryProbeCount: ordinary.length,
      ordinaryPassCount: ordinary.length - ordinaryFail.length,
    },
    dashboardIndexHtml: {
      requestUrl: `${PROD}/apps/dashboard/index.html`,
      finalUrl: dashIndex.document.finalUrl,
      status: dashIndex.document.status,
      bodySha256: dashIndex.document.bodySha256,
      build: dashIndex.document.build,
      sameAsOrdinarySample: sampleDoc ? dashIndex.document.bodySha256 === sampleDoc.bodySha256 : null,
    },
    dashboardHtmlRedirect: {
      requestUrl: `${PROD}/dashboard.html`,
      chain: dashHtml.chain.map((c) => ({ status: c.status, location: c.location, finalUrl: c.finalUrl })),
      documentStatus: dashHtml.document.status,
      documentBuild: dashHtml.document.build,
      bodySha256: dashHtml.document.bodySha256,
      isRedirectShim: /location\.replace\(["']apps\/dashboard\//i.test(dashHtml.document.body || ""),
    },
    support: {
      requestUrl: `${PROD}/support.html`,
      status: support.document.status,
      bodySha256: support.document.bodySha256,
      notes: supportNotes,
    },
  };

  const pass = failures.length === 0;
  const report = {
    schema: "waypoint.dashboard.public-delivery.v1",
    startedAt,
    finishedAt: new Date().toISOString(),
    prod: PROD,
    expectedShort,
    liveBuildInfo: buildInfo.json,
    pass,
    failures,
    multiVersion,
    versions,
    surfaces,
    probes: probes.map((p) => ({
      kind: p.kind,
      probeIndex: p.probeIndex,
      ua: p.ua,
      cacheMode: p.cacheMode,
      requestUrl: p.requestUrl,
      finalUrl: p.finalUrl,
      status: p.status,
      bodySha256: p.bodySha256,
      bodyBytes: p.bodyBytes,
      build: p.build,
      headers: p.headers,
      classification: p.classification,
      error: p.error || null,
      note: p.note || null,
    })),
    assets,
    serviceWorkerAndManifest: swRisk,
    interpretation: {
      ordinaryUrlAuthoritative: true,
      cacheBustAloneNotProof: true,
      homepageVsDashboard:
        "Homepage is studio-home; Dashboard is /apps/dashboard/. Failures must name which surface.",
      cdn: "GitHub Pages + Fastly (via/x-served-by/x-cache). HTML Cache-Control max-age=600.",
    },
  };

  const summary = {
    pass,
    expectedShort,
    liveShort,
    ordinaryPass: `${ordinary.length - ordinaryFail.length}/${ordinary.length}`,
    distinctOrdinaryHashes: versions.map((v) => v.bodySha256.slice(0, 12)),
    multiVersion,
    failureCount: failures.length,
  };

  console.log(JSON.stringify({ summary, reportPath: REPORT_PATH || null }, null, 2));
  console.log("---");
  if (failures.length) {
    console.log("FAILURES:");
    for (const f of failures) console.log(` - ${f}`);
  } else {
    console.log(
      `OK — ${ordinary.length} ordinary Dashboard probes agree on Rebuild build ${expectedShort} (1 body hash).`,
    );
  }

  if (REPORT_PATH) {
    writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(`Wrote report: ${REPORT_PATH}`);
  } else {
    // Always emit machine-readable report on stdout after human summary.
    console.log("---REPORT---");
    console.log(JSON.stringify(report, null, 2));
  }

  process.exit(pass ? 0 : 1);
}

const isDirect =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirect) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
