/**
 * Sheds field navigation — GPS course only.
 *
 * Turns a geolocation fix into the heading the user marker may show.
 * This is course-over-ground (coords.heading), not a phone compass.
 * No DeviceOrientation, no map bearing, no position smoothing.
 */
(function (global) {
  "use strict";

  /** Matches the map's approximate-fix threshold. Worse than this is not a course. */
  var GPS_APPROX_M = 80;
  /** Below this, a reported course is treated as stopped. Null speed does not reject. */
  var SPEED_MIN_MPS = 0.5;
  /** Shortest-turn gap at or under this eases; a larger gap snaps. */
  var EASE_MAX_DEG = 40;
  var EASE_FRACTION = 1 / 3;

  function normalizeHeading(deg) {
    if (deg == null || deg === "") return null;
    var n = Number(deg);
    if (!isFinite(n)) return null;
    return ((n % 360) + 360) % 360;
  }

  /** Shortest signed turn from `fromDeg` to `toDeg`, in (-180, 180]. */
  function circularDelta(fromDeg, toDeg) {
    var from = normalizeHeading(fromDeg);
    var to = normalizeHeading(toDeg);
    if (from == null || to == null) return null;
    return ((to - from + 540) % 360) - 180;
  }

  /**
   * Finite GPS course worth drawing, or null.
   * Accuracy worse than 80 m rejects. Finite speed under 0.5 m/s rejects.
   * Missing speed does not reject a finite heading.
   */
  function courseHeading(headingDeg, accuracyM, speedMps) {
    var heading = normalizeHeading(headingDeg);
    if (heading == null) return null;
    if (accuracyM != null && isFinite(Number(accuracyM)) && Number(accuracyM) > GPS_APPROX_M) {
      return null;
    }
    if (speedMps != null && isFinite(Number(speedMps)) && Number(speedMps) < SPEED_MIN_MPS) {
      return null;
    }
    return heading;
  }

  /**
   * Ease one-third of the way toward `nextDeg` when the turn is small.
   * Snap on a larger turn. Null next clears. Does not average across 0°.
   */
  function smoothHeading(displayedDeg, nextDeg) {
    var next = normalizeHeading(nextDeg);
    if (next == null) return null;
    var displayed = normalizeHeading(displayedDeg);
    if (displayed == null) return next;
    var delta = circularDelta(displayed, next);
    if (delta == null || Math.abs(delta) > EASE_MAX_DEG) return next;
    return normalizeHeading(displayed + delta * EASE_FRACTION);
  }

  /** Previous displayed course + a new fix → course to draw, or null immediately. */
  function resolveDisplayedHeading(displayedDeg, rawHeading, accuracyM, speedMps) {
    var course = courseHeading(rawHeading, accuracyM, speedMps);
    if (course == null) return null;
    return smoothHeading(displayedDeg, course);
  }

  var api = {
    GPS_APPROX_M: GPS_APPROX_M,
    SPEED_MIN_MPS: SPEED_MIN_MPS,
    EASE_MAX_DEG: EASE_MAX_DEG,
    EASE_FRACTION: EASE_FRACTION,
    normalizeHeading: normalizeHeading,
    circularDelta: circularDelta,
    courseHeading: courseHeading,
    smoothHeading: smoothHeading,
    resolveDisplayedHeading: resolveDisplayedHeading
  };

  global.WaypointShedsNavCourse = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
