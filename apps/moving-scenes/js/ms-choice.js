/**
 * Waypoint Moving Scenes — Waypoint Choice (restrained automatic motion)
 * Only confident, supported classes. Comfortable with NO MOTION FOUND.
 */
(function (global) {
  "use strict";

  function Models() {
    return global.WaypointMovingScenesModels;
  }

  function choose(analysis, options) {
    options = options || {};
    var M = Models();
    var meta = M.CLASS_META;
    var threshold = options.threshold != null
      ? options.threshold
      : (analysis && analysis.autoThreshold) || 0.42;
    var confidence = (analysis && analysis.confidence) || {};
    var selected = [];
    var deferred = [];
    var honesty = [];
    var order = ["clouds", "water", "fog", "haze"];

    order.forEach(function (id) {
      var info = meta[id] || { label: id, supported: false };
      var conf = confidence[id] != null ? confidence[id] : 0;
      if (!info.supported) {
        deferred.push({ id: id, confidence: conf, reason: info.deferReason || "Deferred" });
        return;
      }
      if (conf >= threshold) {
        selected.push({
          id: id,
          label: info.label,
          confidence: conf,
          waterType: id === "water" ? (analysis.waterType || "lake") : null
        });
      } else if (conf >= threshold * 0.55) {
        honesty.push(
          info.label + " looks possible but confidence is too low for automatic motion (" +
            Math.round(conf * 100) + "%)."
        );
      }
    });

    // Explicitly list known unsupported detections as deferred
    ["foliage", "grass", "rain", "snow", "light", "stars", "parallax"].forEach(function (id) {
      var info = meta[id];
      var conf = confidence[id] != null ? confidence[id] : 0;
      if (info && !info.supported) {
        deferred.push({ id: id, confidence: conf, reason: info.deferReason });
      }
    });

    if (analysis && analysis.wildlifeProtected) {
      honesty.push("Wildlife subject kept stable — environment may move; the animal does not.");
    }

    var noMotion = selected.length === 0;
    if (noMotion) {
      honesty.unshift("No natural motion confidently detected. The photograph stays still.");
    } else {
      honesty.unshift(
        "Waypoint Choice: " +
          selected.map(function (s) { return s.label; }).join(", ") +
          " — restrained, localized motion only."
      );
    }

    return {
      classes: selected.map(function (s) { return s.id; }),
      selected: selected,
      deferred: deferred,
      noMotion: noMotion,
      strength: "natural",
      durationSec: M.DEFAULT_DURATION_SEC,
      directionDeg: null,
      honestyNotes: honesty,
      threshold: threshold,
      summary: noMotion
        ? "No motion found"
        : selected.map(function (s) { return s.label; }).join(" · ")
    };
  }

  global.WaypointMovingScenesChoice = {
    choose: choose
  };
})(typeof window !== "undefined" ? window : globalThis);
