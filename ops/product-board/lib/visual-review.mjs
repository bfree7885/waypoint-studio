import fs from "fs";
import path from "path";
import { nowIso } from "./io.mjs";

/**
 * Screenshot-first visual review — generating screenshots is never enough.
 * Agents must analyze each required viewport and record explicit observations.
 *
 * Escaped-defect class (Sheds 2026-08-10 false positives):
 * attestations cited "CDP screenshots" while production showed dual location
 * dots, truncation, unexplained control stacks, and prototype-quality chrome.
 */

export const REQUIRED_VIEWPORTS = Object.freeze([
  { id: "mobile-375", width: 375, height: 812, kind: "phone" },
  { id: "mobile-430", width: 430, height: 932, kind: "phone" },
  { id: "tablet", width: 768, height: 1024, kind: "tablet" },
  { id: "laptop", width: 1366, height: 768, kind: "laptop" },
  { id: "desktop-1440", width: 1440, height: 900, kind: "desktop" },
  { id: "desktop-1728", width: 1728, height: 900, kind: "desktop" }
]);

export const OBSERVATION_CHECKS = Object.freeze([
  "clipping",
  "overflow",
  "truncation",
  "overlap",
  "escape",
  "crowdedCorners",
  "controlPlacement",
  "unexplainedControls",
  "hierarchy",
  "readability",
  "spacing",
  "density",
  "unusedSpace",
  "mapVsProductHierarchy",
  "nextActionClarity",
  "intentionalDesign"
]);

const MIN_OBSERVATION_CHARS = 80;

function viewportCovered(entry, required) {
  const w = Number(entry.width || entry.viewportWidth || 0);
  const h = Number(entry.height || entry.viewportHeight || 0);
  const id = String(entry.id || entry.viewportId || "");
  if (id && id === required.id) return true;
  // Allow ±24px tolerance on common laptop/desktop sizes
  return Math.abs(w - required.width) <= 24 && Math.abs(h - required.height) <= 48;
}

/**
 * Evaluate a screenshot-analysis evidence package.
 * @param {object} pkg
 * @param {Array} pkg.viewports - per-viewport records with screenshotPath + observations
 * @param {string} [pkg.productionUrl]
 * @param {string} [pkg.buildId]
 * @param {boolean} [pkg.productionVerified]
 */
export function evaluateScreenshotAnalysis(pkg = {}) {
  const findings = [];
  const viewports = Array.isArray(pkg.viewports) ? pkg.viewports : [];

  if (!viewports.length) {
    findings.push({
      id: "visual:no-viewport-records",
      severity: "P0",
      message:
        "Screenshot analysis package empty — capturing images without written observations cannot pass visual review."
    });
  }

  if (pkg.screenshotsGenerated === true && !viewports.some((v) => v.observations)) {
    findings.push({
      id: "visual:screenshots-without-analysis",
      severity: "P0",
      message:
        "Screenshots were generated but not analyzed — generating screenshot ≠ visual review."
    });
  }

  for (const req of REQUIRED_VIEWPORTS) {
    const hit = viewports.find((v) => viewportCovered(v, req));
    if (!hit) {
      findings.push({
        id: `visual:missing-viewport:${req.id}`,
        severity: "P1",
        message: `Required viewport missing from screenshot analysis: ${req.id} (${req.width}×${req.height})`
      });
      continue;
    }

    const obs = String(hit.observations || hit.analysis || "").trim();
    if (obs.length < MIN_OBSERVATION_CHARS) {
      findings.push({
        id: `visual:thin-observations:${req.id}`,
        severity: "P0",
        message: `Viewport ${req.id} lacks explicit written observations (≥${MIN_OBSERVATION_CHARS} chars). Screenshot file alone is insufficient.`
      });
    }

    const checks = hit.checks || hit.checklist || {};
    for (const key of OBSERVATION_CHECKS) {
      if (checks[key] === undefined || checks[key] === null) {
        findings.push({
          id: `visual:unchecked:${req.id}:${key}`,
          severity: "P1",
          message: `Viewport ${req.id} did not evaluate check "${key}"`
        });
      } else if (checks[key] === "fail" || checks[key] === false) {
        findings.push({
          id: `visual:fail:${req.id}:${key}`,
          severity: "P1",
          message: `Viewport ${req.id} failed visual check "${key}": ${hit.notes?.[key] || obs.slice(0, 160)}`
        });
      }
    }

    if (hit.screenshotPath) {
      // Path may be relative to repo; existence is best-effort when absolute/relative given.
      const candidate = path.isAbsolute(hit.screenshotPath)
        ? hit.screenshotPath
        : hit.screenshotPath;
      if (path.isAbsolute(candidate) && !fs.existsSync(candidate)) {
        findings.push({
          id: `visual:missing-file:${req.id}`,
          severity: "P2",
          message: `Screenshot path for ${req.id} does not exist: ${hit.screenshotPath}`
        });
      }
    } else {
      findings.push({
        id: `visual:no-screenshot-path:${req.id}`,
        severity: "P1",
        message: `Viewport ${req.id} has observations but no screenshotPath artifact`
      });
    }
  }

  // Production-first: Subscriber Ready visual package must name production URL + build
  if (pkg.requireProduction !== false) {
    if (!pkg.productionVerified) {
      findings.push({
        id: "visual:not-production-verified",
        severity: "P0",
        message:
          "Visual review is not production-verified — final SUBSCRIBER READY cannot be local-only."
      });
    }
    if (!pkg.productionUrl || !/^https?:\/\//i.test(String(pkg.productionUrl))) {
      findings.push({
        id: "visual:missing-production-url",
        severity: "P0",
        message: "Screenshot analysis missing productionUrl"
      });
    }
    if (!pkg.buildId) {
      findings.push({
        id: "visual:missing-build-id",
        severity: "P1",
        message: "Screenshot analysis missing buildId/commit for the inspected surface"
      });
    }
  }

  const hard = findings.filter((f) => ["P0", "P1"].includes(f.severity));
  return {
    evaluatedAt: nowIso(),
    kind: "screenshot_analysis",
    status: hard.length ? "fail" : findings.length ? "conditional" : "pass",
    requiredViewports: REQUIRED_VIEWPORTS,
    observationChecks: OBSERVATION_CHECKS,
    findings,
    p0Count: findings.filter((f) => f.severity === "P0").length,
    p1Count: findings.filter((f) => f.severity === "P1").length,
    summary: hard.length
      ? `Screenshot analysis failed (${hard.length} P0/P1).`
      : "Screenshot analysis passed with explicit per-viewport observations."
  };
}

/** True when an attestation note is theater (mentions screenshots, no analysis proof). */
export function isThinVisualAttestation(notes = "") {
  const n = String(notes || "");
  if (n.length < 120) return true;
  const claimsShot = /screenshot|cdp|capture|viewport/i.test(n);
  const hasAnalysis =
    /observ|clip|truncat|overlap|hierarch|oscillat|marker|control stack|commercial|prototype|crowded|density/i.test(
      n
    );
  return claimsShot && !hasAnalysis;
}
