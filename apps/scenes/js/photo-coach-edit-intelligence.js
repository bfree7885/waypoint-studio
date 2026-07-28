/**
 * Photo Coach edit intelligence — selective, confidence-aware suggestions.
 * Does not pretend edits were applied.
 */
(function (global) {
  "use strict";

  var EDIT_FIELDS = [
    "exposure", "highlights", "shadows", "whites", "blacks", "contrast",
    "whiteBalance", "vibrance", "saturation", "texture", "clarity", "dehaze",
    "sharpening", "noiseReduction", "lensCorrection", "perspective", "crop"
  ];

  function adj(type, label, value, min, max, reason, effect, trust, priority) {
    return {
      type: type,
      label: label,
      suggestedValue: value,
      min: min,
      max: max,
      reason: reason,
      expectedImprovement: effect,
      trust: trust || "Estimated",
      priority: priority || "secondary"
    };
  }

  function hintSet(improvements) {
    var set = {};
    (improvements || []).forEach(function (imp) {
      (imp.editHints || []).forEach(function (h) { set[h] = true; });
      if (imp.priority === "primary") {
        (imp.editHints || []).forEach(function (h) { set["primary:" + h] = true; });
      }
    });
    return set;
  }

  function buildFromSignals(signals, options) {
    signals = signals || {};
    options = options || {};
    var hints = hintSet(options.improvements);
    var outdoor = options.outdoor || null;
    var list = [];

    function want(keys, primaryBoost) {
      for (var i = 0; i < keys.length; i++) {
        if (hints[keys[i]] || hints["primary:" + keys[i]]) return true;
      }
      return !!primaryBoost;
    }

    if (signals.brightness < 90 || want(["brighten"])) {
      list.push(adj("exposure", "Brighten", "+0.3 EV", -2, 2,
        "Midtones read dark — lift the base exposure before local work.",
        "Clearer subject and more usable color.", "Estimated",
        want(["brighten"]) ? "primary" : "secondary"));
    } else if (signals.brightness > 180) {
      list.push(adj("exposure", "Exposure", "−0.2 EV", -2, 2,
        "Midtones read hot — lower exposure before adding contrast.",
        "Richer midtones and safer print headroom.", "Estimated", "primary"));
    }

    if (signals.brightFraction > 0.05 || want(["recover highlights"])) {
      list.push(adj("highlights", "Recover highlights", "−22", -100, 0,
        "Bright areas may be clipping and pulling attention from the subject.",
        "Calmer skies and more credible specular detail.", "Estimated",
        want(["recover highlights"]) || signals.brightFraction > 0.05 ? "primary" : "secondary"));
    }

    if (signals.darkFraction > 0.26 || want(["lift shadows"])) {
      list.push(adj("shadows", "Lift shadows", "+24", 0, 100,
        "Heavy shadows hide texture that carries depth and story.",
        "Foreground depth without a flat HDR look.", "Estimated",
        want(["lift shadows"]) ? "primary" : "secondary"));
    }

    if (signals.contrast < 30 || want(["increase contrast"])) {
      list.push(adj("contrast", "Increase contrast", "+12", -30, 30,
        "Low global contrast flattens subject presence, especially on mobile.",
        "Stronger separation between subject and background.", "Estimated",
        want(["increase contrast"]) ? "primary" : "secondary"));
    } else if (signals.contrast > 80 || want(["reduce contrast"])) {
      list.push(adj("contrast", "Reduce contrast", "−8", -30, 30,
        "Contrast may be crushing midtones.",
        "Softer, more printable tonal transitions.", "Estimated", "secondary"));
    }

    if (signals.warmth > 0.22 || want(["cool white balance"])) {
      list.push(adj("whiteBalance", "Cool white balance", "−350K", -10, 10,
        "Warm cast can age foliage and skew natural color.",
        "More believable outdoor color before saturation edits.", "Estimated",
        want(["cool white balance"]) ? "primary" : "secondary"));
    } else if (signals.coolness > 0.2 || want(["warm white balance"])) {
      list.push(adj("whiteBalance", "Warm white balance", "+350K", -10, 10,
        "Cool cast can make daylight scenes feel clinical unless intentional.",
        "Friendlier, more natural outdoor color.", "Estimated",
        want(["warm white balance"]) ? "primary" : "secondary"));
    }

    if (signals.saturation > 0.45 || want(["reduce saturation"])) {
      list.push(adj("saturation", "Reduce saturation", "−8", -20, 20,
        "High saturation competes with form and can look artificial outdoors.",
        "Calmer palette so shape and light lead.", "Estimated", "secondary"));
    }

    if (want(["local emphasis"]) || signals.subjectEmphasis < 0.06) {
      list.push(adj("clarity", "Local emphasis (clarity)", "+10", 0, 40,
        "Subject separation is weak — add midtone snap on the subject, not the whole frame.",
        "Immediate subject recognition.", "Estimated",
        want(["local emphasis"]) ? "primary" : "secondary"));
    }

    if ((outdoor && outdoor.airQuality && outdoor.airQuality.usAqi > 80) || signals.contrast < 28) {
      list.push(adj("dehaze", "Light dehaze", "+6", 0, 30,
        "Atmosphere may be flattening distance — use lightly so the mood stays honest.",
        "Near subject presence without sterilizing the air.", "Estimated", "secondary"));
    }

    if (want(["crop", "remove distractions by cropping"]) || signals.leftRightBalance > 0.12 || signals.subjectEmphasis < 0.05) {
      list.push(adj("crop", "Crop", "Tighten / rebalance", 0, 100,
        "Cropping removes distractions and restores visual hierarchy without inventing detail.",
        "Clearer subject and cleaner edges. Edits are suggestions only — nothing was applied.", "Estimated",
        want(["crop", "remove distractions by cropping"]) ? "primary" : "secondary"));
    }

    if (want(["rotate"]) || (signals.skyBrightness > 0.28 && signals.edgeHorizontal > 0.08)) {
      list.push(adj("perspective", "Rotate / level", "Level horizon", -20, 20,
        "A tilted horizon reads immediately in landscapes with a clear skyline.",
        "A grounded, intentional frame after a small rotate + crop.", "Estimated", "secondary"));
    }

    if (signals.blurEstimate < 45) {
      list.push(adj("sharpening", "Gentle sharpening", "Amount 35", 0, 100,
        "Softness is present — sharpen modestly for screen; do not expect a soft file to print large.",
        "Slightly clearer presentation at intended size.", "Estimated", "secondary"));
    }

    // Prefer primary first, then cap list so the recipe stays actionable
    list.sort(function (a, b) {
      if (a.priority === b.priority) return 0;
      return a.priority === "primary" ? -1 : 1;
    });
    if (list.length > 7) list = list.slice(0, 7);

    if (!list.length) {
      list.push(adj("crop", "Subtle reframe", "Optional", 0, 100,
        "No high-confidence global edit stood out — refine framing only if something distracts.",
        "Avoid stacking edits when the file is already balanced.", "Estimated", "secondary"));
    }

    return {
      version: "3.0.0",
      engineStatus: "disconnected",
      isDemo: true,
      trust: "On-device analysis",
      adjustments: list,
      pipelineNote: "Suggested edits only — nothing was applied to your file. Values come from browser image signals and your highest-impact coaching notes."
    };
  }

  function sliderPosition(value, min, max) {
    var num = parseFloat(String(value).replace(/[^\d.-]/g, ""));
    if (!isFinite(num)) return 50;
    return clamp(((num - min) / (max - min)) * 100, 5, 95);
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function escape(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderHtml(plan) {
    if (!plan || !plan.adjustments || !plan.adjustments.length) return "";
    var badge = plan.isDemo || plan.isSample
      ? '<span class="coach-trust coach-trust--demo">On-device analysis</span>'
      : '<span class="coach-trust coach-trust--live">Live</span>';
    var html = '<section class="coach-card coach-card--edits" aria-labelledby="coach-edits-title">' +
      '<h3 class="coach-card__title" id="coach-edits-title">Suggested edits ' + badge + "</h3>";
    if (plan.pipelineNote) {
      html += '<p class="coach-card__note">' + escape(plan.pipelineNote) + "</p>";
    }
    html += '<ul class="coach-sliders">';
    plan.adjustments.forEach(function (a) {
      var pos = sliderPosition(a.suggestedValue, a.min != null ? a.min : -50, a.max != null ? a.max : 50);
      var pri = a.priority === "primary"
        ? '<span class="coach-edit-priority">Try first</span>'
        : "";
      html += '<li class="coach-slider' + (a.priority === "primary" ? " coach-slider--primary" : "") + '">' +
        '<div class="coach-slider__head">' +
          '<span class="coach-slider__label">' + escape(a.label) + " " + pri + "</span>" +
          '<span class="coach-slider__value">' + escape(a.suggestedValue) + "</span>" +
        "</div>" +
        '<div class="coach-slider__track" aria-hidden="true">' +
          '<div class="coach-slider__fill" style="width:' + pos + '%"></div>' +
          '<div class="coach-slider__thumb" style="left:' + pos + '%"></div>' +
        "</div>" +
        '<p class="coach-slider__why"><strong>Why:</strong> ' + escape(a.reason) + "</p>" +
        '<p class="coach-slider__effect"><strong>Expected:</strong> ' + escape(a.expectedImprovement) + "</p>" +
      "</li>";
    });
    html += "</ul></section>";
    return html;
  }

  global.WaypointPhotoCoachEditIntel = {
    EDIT_FIELDS: EDIT_FIELDS,
    buildFromSignals: buildFromSignals,
    renderHtml: renderHtml
  };
})(window);
