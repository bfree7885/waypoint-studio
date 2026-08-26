import { nowIso } from "./io.mjs";

/**
 * Dynamic visual review — observe the product over time, not a single freeze-frame.
 * Required for map/location/geo surfaces and any animated or watchPosition UI.
 *
 * Escaped-defect class (Sheds 2026-08-10):
 * CSS scale pulse + dual similar markers looked like oscillating dual user dots;
 * board never sampled marker stability across time.
 */

export const DYNAMIC_SCENARIOS = Object.freeze([
  "initial_load",
  "geo_acquire",
  "geo_update",
  "geo_repeated",
  "geo_denied",
  "geo_unavailable",
  "geo_low_accuracy",
  "reload",
  "resize",
  "pan",
  "zoom",
  "recenter",
  "state_transition",
  "marker_create_remove",
  "marker_stability"
]);

const MAX_STABLE_PIXEL_JITTER = 6;
const MIN_SAMPLES = 5;

function markerKey(m) {
  return String(m.role || m.kind || m.id || m.className || "unknown");
}

/**
 * @param {object} pkg
 * @param {Array} pkg.samples - [{t, markers:[{role,x,y,lat,lng}]}]
 * @param {object} [pkg.assertions]
 * @param {string[]} [pkg.scenariosCovered]
 * @param {boolean} [pkg.productionVerified]
 */
export function evaluateDynamicVisual(pkg = {}) {
  const findings = [];
  const samples = Array.isArray(pkg.samples) ? pkg.samples : [];
  const scenarios = new Set(pkg.scenariosCovered || []);

  if (samples.length < MIN_SAMPLES) {
    findings.push({
      id: "dynamic:insufficient-samples",
      severity: "P0",
      message: `Dynamic visual review needs ≥${MIN_SAMPLES} timed samples; got ${samples.length}.`
    });
  }

  const requiredScenarios = pkg.requiredScenarios || [
    "initial_load",
    "geo_acquire",
    "marker_stability",
    "resize"
  ];
  for (const s of requiredScenarios) {
    if (!scenarios.has(s) && !(pkg.assertions && pkg.assertions[s] != null)) {
      findings.push({
        id: `dynamic:missing-scenario:${s}`,
        severity: "P1",
        message: `Dynamic review did not cover scenario: ${s}`
      });
    }
  }

  // Duplicate unintended user-location markers
  for (const sample of samples) {
    const userish = (sample.markers || []).filter((m) =>
      /user|you|gps|location/i.test(markerKey(m) + " " + (m.label || ""))
    );
    const distinct = new Set(
      userish.map((m) => `${Math.round(m.x / 8)}:${Math.round(m.y / 8)}`)
    );
    if (userish.length >= 2 && distinct.size >= 2) {
      findings.push({
        id: "dynamic:duplicate-user-markers",
        severity: "P0",
        message:
          "Two or more simultaneous user-location-like markers detected — duplicate unintended location indicators."
      });
      break;
    }
  }

  // Stable input → stable representation (pixel jitter across samples for same role)
  if (samples.length >= MIN_SAMPLES && pkg.stableInput !== false) {
    const byRole = new Map();
    for (const sample of samples) {
      for (const m of sample.markers || []) {
        const role = markerKey(m);
        if (!byRole.has(role)) byRole.set(role, []);
        byRole.get(role).push({ x: m.x, y: m.y, lat: m.lat, lng: m.lng });
      }
    }
    for (const [role, pts] of byRole) {
      if (!/user|you|gps/i.test(role)) continue;
      if (pts.length < MIN_SAMPLES) continue;
      // Prefer lat/lng stability when present
      const withGeo = pts.filter((p) => p.lat != null && p.lng != null);
      if (withGeo.length >= MIN_SAMPLES) {
        const lats = withGeo.map((p) => p.lat);
        const lngs = withGeo.map((p) => p.lng);
        const dLat = Math.max(...lats) - Math.min(...lats);
        const dLng = Math.max(...lngs) - Math.min(...lngs);
        if (dLat > 1e-5 || dLng > 1e-5) {
          findings.push({
            id: "dynamic:marker-geo-oscillation",
            severity: "P0",
            message: `Stable geolocation input produced oscillating ${role} coordinates (Δlat=${dLat}, Δlng=${dLng}).`
          });
        }
      } else {
        const xs = pts.map((p) => p.x).filter((n) => Number.isFinite(n));
        const ys = pts.map((p) => p.y).filter((n) => Number.isFinite(n));
        if (xs.length >= MIN_SAMPLES) {
          const dx = Math.max(...xs) - Math.min(...xs);
          const dy = Math.max(...ys) - Math.min(...ys);
          // Allow tiny CSS anti-alias; fail on visible oscillation / pulse-scale thrash
          if (dx > MAX_STABLE_PIXEL_JITTER || dy > MAX_STABLE_PIXEL_JITTER) {
            findings.push({
              id: "dynamic:marker-screen-oscillation",
              severity: "P0",
              message: `Marker "${role}" screen position oscillated by ${Math.round(dx)}×${Math.round(dy)}px under stable input (CSS transform/animation, recentering, or duplicate markers).`
            });
          }
        }
      }
    }
  }

  if (pkg.assertions?.noDuplicateUserMarkers === false) {
    findings.push({
      id: "dynamic:assert-duplicate-user",
      severity: "P0",
      message: "Reviewer asserted duplicate user-location markers remain."
    });
  }
  if (pkg.assertions?.stableRepresentation === false) {
    findings.push({
      id: "dynamic:assert-unstable",
      severity: "P0",
      message: "Reviewer asserted stable input did not yield stable marker representation."
    });
  }
  if (pkg.assertions?.honestFallback === false) {
    findings.push({
      id: "dynamic:dishonest-fallback",
      severity: "P0",
      message:
        "Approximate/map-center fallback presented as precise user location."
    });
  }

  if (pkg.requireProduction !== false && !pkg.productionVerified) {
    findings.push({
      id: "dynamic:not-production-verified",
      severity: "P0",
      message:
        "Dynamic visual review is not production-verified — required for SUBSCRIBER READY."
    });
  }

  const hard = findings.filter((f) => ["P0", "P1"].includes(f.severity));
  return {
    evaluatedAt: nowIso(),
    kind: "dynamic_visual_review",
    status: hard.length ? "fail" : findings.length ? "conditional" : "pass",
    scenarios: DYNAMIC_SCENARIOS,
    findings,
    p0Count: findings.filter((f) => f.severity === "P0").length,
    p1Count: findings.filter((f) => f.severity === "P1").length,
    summary: hard.length
      ? `Dynamic visual review failed (${hard.length} P0/P1).`
      : "Dynamic visual review passed (marker stability + scenarios)."
  };
}

export function isMapOrGeoCampaign(campaignId) {
  return /sheds|map|geo|field/i.test(String(campaignId || ""));
}
