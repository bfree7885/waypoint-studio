/**
 * Waypoint Moving Scenes — Waypoint Choice (restrained automatic motion)
 * Only confident, supported classes. Comfortable with NO MOTION FOUND.
 */
(function (global) {
  "use strict";

  function Models() {
    return global.WaypointMovingScenesModels;
  }

  /**
   * Drop incompatible auto classes. False no-motion beats wrong animation.
   * Fog/haze among trees wins over water; cloud-sea wins over lake when both weak.
   */
  function resolveSelectedConflicts(selected, confidence, analysis) {
    var byId = {};
    selected.forEach(function (s) {
      byId[s.id] = s;
    });
    var cov = (analysis && analysis.coverage) || {};
    var ev = (analysis && analysis.evidence) || {};
    var drop = {};

    if (byId.water && byId.fog) {
      // Prefer fog when fog coverage / confidence is competitive
      if ((confidence.fog || 0) + 0.08 >= (confidence.water || 0) * 0.7 || (cov.fog || 0) > 0.1) {
        drop.water = true;
      } else {
        drop.fog = true;
      }
    }
    if (byId.water && byId.clouds) {
      var vapor =
        (ev.waterCloudOverlap || 0) > 0.25 ||
        (ev.waterSkyOverlap || 0) > 0.28;
      var cloudSea =
        (cov.clouds || 0) > 0.14 &&
        (cov.waterCentroidY || 1) < 0.52 &&
        (cov.foliage || 0) < 0.08;
      // Thin water claim under dominant sky/clouds → refuse water
      var thinSkyWater =
        (cov.water || 0) < 0.14 &&
        (cov.sky || 0) > 0.3 &&
        (confidence.water || 0) < 0.65;
      if (vapor || cloudSea || thinSkyWater) drop.water = true;
    }
    if (byId.clouds && byId.fog && (cov.foliage || 0) > 0.15 && (cov.sky || 0) < 0.28) {
      // Fog among trees / forest mist — do not also animate as sky clouds
      drop.clouds = true;
    }
    // Open sky + ridge (little foliage): prefer clouds over fog veiling claim
    if (
      byId.fog &&
      (cov.sky || 0) > 0.35 &&
      (cov.foliage || 0) < 0.12 &&
      (confidence.clouds || 0) >= 0.38
    ) {
      drop.fog = true;
    }
    // Haze + fog: keep the stronger one
    if (byId.haze && byId.fog) {
      if ((confidence.fog || 0) >= (confidence.haze || 0)) drop.haze = true;
      else drop.fog = true;
    }

    return selected.filter(function (s) {
      return !drop[s.id];
    });
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

    // Incompatible materials: one scene should not claim lake + fog + cloud-sea together
    selected = resolveSelectedConflicts(selected, confidence, analysis);

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
