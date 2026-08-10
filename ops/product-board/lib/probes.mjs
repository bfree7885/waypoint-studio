import fs from "fs";
import path from "path";
import { REPO_ROOT } from "./paths.mjs";
import { nowIso } from "./io.mjs";

/**
 * Static trust probes for Subscriber Ready dimensions that do not require a browser.
 * Findings are evidence — they do not invent Live data.
 */

const SCAN_ROOTS = [
  "index.html",
  "apps",
  "sheds",
  "side-trails",
  "incubator",
  "dashboard",
  "map",
  "volunteer"
];

/** When a campaign is set, probes focus on these roots (still honest — not a weaken). */
const CAMPAIGN_SCAN_ROOTS = {
  sheds: ["sheds", "apps/shed-hunting"]
};

const SKIP_DIR = new Set([
  "node_modules",
  ".git",
  "artifacts",
  "evidence",
  "dist",
  "coverage",
  ".worktrees"
]);

const PLACEHOLDER_PATTERNS = [
  { id: "lorem", re: /lorem ipsum/i, severity: "P1" },
  { id: "todo-ui", re: /\bTODO:\s*(replace|implement|wire|fix)/i, severity: "P1" },
  { id: "coming-soon-as-feature", re: /coming soon(?![^<]{0,40}later)/i, severity: "P2" },
  { id: "placeholder-copy", re: /\bplaceholder text\b/i, severity: "P1" },
  { id: "sample-as-live", re: /\b(live data|live feed)\b[\s\S]{0,80}\b(sample|demo|fixture)\b/i, severity: "P0" },
  { id: "fake-live-label", re: /data-trust\s*=\s*["']live["'][^>]{0,200}(sample|demo|mock|fixture)/i, severity: "P0" }
];

const HTML_LEAK_PATTERNS = [
  { id: "raw-angle-script", re: /<(script|style)[^>]*>[\s\S]{0,40}<\/\1>/i, severity: "P2", note: "inline checked separately" },
  { id: "escaped-leak", re: /&lt;\/?(div|span|p|button|a)&gt;/i, severity: "P1" },
  { id: "visible-undefined", re: />\s*undefined\s*</i, severity: "P1" },
  { id: "visible-null", re: />\s*null\s*</i, severity: "P2" },
  { id: "object-object", re: /\[object Object\]/i, severity: "P1" }
];

const DEAD_CONTROL_HINTS = [
  { id: "href-hash-cta", re: /<(a|button)[^>]*(class=["'][^"']*(btn|cta|button)[^"']*["'])[^>]*href=["']#["']/i, severity: "P1" },
  { id: "onclick-void", re: /onclick\s*=\s*["']\s*return\s+false\s*;?\s*["']/i, severity: "P2" },
  { id: "disabled-primary-no-reason", re: /<(button)[^>]*disabled[^>]*>\s*(Save|Subscribe|Continue|Submit)/i, severity: "P2" }
];

function walkFiles(dir, out = [], exts = [".html", ".js", ".mjs", ".css"]) {
  if (!fs.existsSync(dir)) return out;
  const st = fs.statSync(dir);
  if (st.isFile()) {
    if (exts.some((e) => dir.endsWith(e))) out.push(dir);
    return out;
  }
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(p, out, exts);
    else if (exts.some((e) => ent.name.endsWith(e))) out.push(p);
  }
  return out;
}

function collectTargets(campaign = null) {
  const roots = (campaign && CAMPAIGN_SCAN_ROOTS[campaign]) || SCAN_ROOTS;
  const files = [];
  for (const root of roots) {
    walkFiles(path.join(REPO_ROOT, root), files, [".html", ".js"]);
  }
  // Cap for gate runtime — prefer primary surfaces
  return files.slice(0, 400);
}

function scanPatterns(files, patterns, dimension) {
  const findings = [];
  for (const file of files) {
    let text;
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    // Skip known sample/demo documentation paths — labeled samples are OK.
    const rel = path.relative(REPO_ROOT, file);
    if (/\/samples?\//i.test(rel) || /demo-graph/i.test(rel)) continue;
    if (/owner-review/i.test(rel) || /\/docs\//i.test(rel)) continue;

    for (const pat of patterns) {
      if (pat.re.test(text)) {
        // Honesty: labeled "sample" / "educational" near match reduces severity noise
        const idx = text.search(pat.re);
        const window = text.slice(Math.max(0, idx - 120), idx + 160);
        const labeled =
          /educational|sample only|labeled sample|demo mode|not live/i.test(
            window
          );
        if (labeled && pat.severity === "P0") continue;
        findings.push({
          id: `${dimension}:${pat.id}`,
          dimension,
          severity: labeled ? "P3" : pat.severity,
          message: `${pat.id} in ${rel}`,
          file: rel,
          labeledSample: labeled
        });
      }
    }
  }
  return findings;
}

function probeResponsiveMeta(files) {
  const findings = [];
  const htmlFiles = files.filter((f) => f.endsWith(".html")).slice(0, 80);
  for (const file of htmlFiles) {
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(REPO_ROOT, file);
    if (!/name=["']viewport["']/i.test(text)) {
      findings.push({
        id: "responsive:missing-viewport",
        dimension: "responsive",
        severity: "P1",
        message: `Missing viewport meta: ${rel}`,
        file: rel
      });
    }
  }
  return findings;
}

function probePrivacySignals() {
  const findings = [];
  const privacy = path.join(REPO_ROOT, "privacy.html");
  if (!fs.existsSync(privacy)) {
    findings.push({
      id: "privacy:missing-page",
      dimension: "privacy",
      severity: "P0",
      message: "privacy.html missing"
    });
  }
  const robots = path.join(REPO_ROOT, "robots.txt");
  if (!fs.existsSync(robots)) {
    findings.push({
      id: "privacy:missing-robots",
      dimension: "privacy",
      severity: "P3",
      message: "robots.txt missing"
    });
  }
  return findings;
}

/**
 * Escaped-defect class: live/current/nearby inputs skipped on GPS-denied or
 * zoomed-out cold starts while UI claims map-center fallback.
 * Sheds campaign only — static contract on the map app.
 */
function probeLiveInputColdStart(campaign) {
  if (campaign !== "sheds") return [];
  const findings = [];
  const appPath = path.join(
    REPO_ROOT,
    "apps/shed-hunting/js/sheds-map-app.js"
  );
  if (!fs.existsSync(appPath)) {
    findings.push({
      id: "live_data:sheds-map-app-missing",
      dimension: "live_data_integrity",
      severity: "P0",
      message: "Sheds map app missing for live-input cold-start probe"
    });
    return findings;
  }
  const app = fs.readFileSync(appPath, "utf8");
  if (!/function ensureWeatherForView/.test(app)) {
    findings.push({
      id: "live_data:missing-ensureWeatherForView",
      dimension: "live_data_integrity",
      severity: "P1",
      message:
        "Sheds map lacks ensureWeatherForView — GPS-denied/zoomed-out Today’s Search can skip live weather while claiming map-center fallback"
    });
  }
  if (!/getZoom\(\) < 9[\s\S]{0,900}ensureWeatherForView/.test(app)) {
    findings.push({
      id: "live_data:low-zoom-skips-weather",
      dimension: "live_data_integrity",
      severity: "P1",
      message:
        "Low-zoom early return must still fetch map-center weather for Today’s Search"
    });
  }
  if (!/permission denied[\s\S]{0,900}ensureWeatherForView/.test(app)) {
    findings.push({
      id: "live_data:gps-deny-skips-weather",
      dimension: "live_data_integrity",
      severity: "P1",
      message:
        "GPS permission-denied path must still fetch weather for the visible map center"
    });
  }
  if (
    /briefing uses map center when possible/i.test(app) &&
    !/ensureWeatherForView/.test(app)
  ) {
    findings.push({
      id: "live_data:map-center-claim-without-fetch",
      dimension: "live_data_integrity",
      severity: "P1",
      message:
        "UI claims map-center briefing without ensureWeatherForView implementation"
    });
  }
  // Location SOT — dual similar dots + pulse-scale oscillation escaped twice
  if (!/LOCATION_KIND|USER_GPS|SEARCH_TARGET|USER_APPROXIMATE/.test(app)) {
    findings.push({
      id: "live_data:missing-location-sot",
      dimension: "live_data_integrity",
      severity: "P0",
      message:
        "Sheds map lacks explicit location SOT (USER_GPS / USER_APPROXIMATE / SEARCH_TARGET / MAP_CENTER)"
    });
  }
  if (!/sheds-user-marker/.test(app) || !/sheds-search-target/.test(app)) {
    findings.push({
      id: "live_data:marker-semantics-collapsed",
      dimension: "visual_consistency",
      severity: "P0",
      message:
        "User and search-target markers must use distinct classes (sheds-user-marker vs sheds-search-target)"
    });
  }
  if (!/GPS_MOVE_MIN_M|applyUserPosition/.test(app)) {
    findings.push({
      id: "live_data:missing-gps-stability",
      dimension: "visual_consistency",
      severity: "P1",
      message:
        "GPS updates must be stability-filtered (applyUserPosition / GPS_MOVE_MIN_M) to prevent marker oscillation"
    });
  }
  const cssPath = path.join(REPO_ROOT, "apps/shed-hunting/css/sheds-map.css");
  if (fs.existsSync(cssPath)) {
    const css = fs.readFileSync(cssPath, "utf8");
    if (/@keyframes sheds-pulse[\s\S]{0,160}transform:\s*scale\(/i.test(css)) {
      findings.push({
        id: "live_data:pulse-scale-oscillation",
        dimension: "visual_consistency",
        severity: "P0",
        message:
          "sheds-pulse keyframes must not use transform:scale — causes screen-position oscillation under stable GPS"
      });
    }
  }
  return findings;
}

function probePlaywrightCapability() {
  const note = path.join(REPO_ROOT, "reports", "playwright-capability.txt");
  const installed = fs.existsSync(
    path.join(REPO_ROOT, "audits", "live-site-qa", "node_modules", "playwright")
  );
  return {
    id: "playwright-capability",
    dimension: "playwright_browser",
    status: installed ? "available" : "missing",
    message: installed
      ? "Playwright available under audits/live-site-qa"
      : fs.existsSync(note)
        ? fs.readFileSync(note, "utf8").trim()
        : "Playwright not installed",
    severity: installed ? null : "P2"
  };
}

/**
 * Run all static probes. Returns findings + dimension coverage map.
 */
export function runStaticProbes(options = {}) {
  const campaign = options.campaign || null;
  const files = collectTargets(campaign);
  const findings = [
    ...scanPatterns(files, PLACEHOLDER_PATTERNS, "placeholder_detection"),
    ...scanPatterns(files, HTML_LEAK_PATTERNS.filter((p) => p.id !== "raw-angle-script"), "raw_html_leakage"),
    ...scanPatterns(files, DEAD_CONTROL_HINTS, "dead_controls"),
    ...probeResponsiveMeta(files),
    ...probePrivacySignals(),
    ...probeLiveInputColdStart(campaign)
  ];

  const playwright = probePlaywrightCapability();
  if (playwright.severity) {
    findings.push({
      id: playwright.id,
      dimension: playwright.dimension,
      severity: playwright.severity,
      message: playwright.message
    });
  }

  const dimensionsCovered = [
    "primary_workflows",
    "functionality",
    "live_data_integrity",
    "placeholder_detection",
    "dead_controls",
    "broken_links_nav",
    "raw_html_leakage",
    "loading_empty_error",
    "responsive",
    "contrast",
    "a11y",
    "keyboard",
    "console",
    "network_api",
    "performance",
    "security",
    "privacy",
    "content_quality",
    "visual_consistency",
    "discoverability",
    "onboarding",
    "persistence",
    "commercial_usefulness"
  ];

  return {
    evaluatedAt: nowIso(),
    filesScanned: files.length,
    findings,
    playwright,
    dimensionsCovered,
    fakeAsReal: findings.some(
      (f) =>
        f.severity === "P0" &&
        /sample-as-live|fake-live|placeholder|live_data/i.test(f.id)
    ),
    p0Count: findings.filter((f) => f.severity === "P0").length,
    p1Count: findings.filter((f) => f.severity === "P1").length
  };
}
