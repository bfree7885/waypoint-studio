/**
 * Photo Coach edit intelligence — slider-style adjustment schema.
 */
(function (global) {
  "use strict";

  var EDIT_FIELDS = [
    "exposure", "highlights", "shadows", "whites", "blacks", "contrast",
    "whiteBalance", "vibrance", "saturation", "texture", "clarity", "dehaze",
    "sharpening", "noiseReduction", "lensCorrection", "perspective", "crop"
  ];

  function adj(type, label, value, min, max, reason, effect, trust) {
    return {
      type: type,
      label: label,
      suggestedValue: value,
      min: min,
      max: max,
      reason: reason,
      expectedImprovement: effect,
      trust: trust || "Estimated"
    };
  }

  function buildFromSignals(signals) {
    signals = signals || {};
    var exposure = signals.brightness < 95 ? "+0.25 EV" : signals.brightness > 170 ? "−0.15 EV" : "0 EV";
    var highlights = signals.brightFraction > 0.05 ? "−18" : "−6";
    var shadows = signals.darkFraction > 0.25 ? "+22" : "+8";
    var contrast = signals.contrast < 32 ? "+12" : signals.contrast > 70 ? "−5" : "+6";
    var wb = signals.dominantWarm ? "Cool −350K" : signals.coolness > 0.15 ? "Warm +400K" : "Neutral";
    var clarity = signals.contrast < 35 ? "+10" : "+5";
    var dehaze = signals.contrast < 30 ? "+8" : "+2";
    var vibrance = signals.contrast < 40 ? "+8" : "+4";
    var saturation = "+3";
    var texture = "+6";
    var sharpen = signals.edgeDensity > 0.1 ? "Amount 40" : "Amount 55";
    var nr = signals.brightFraction > 0.03 ? "Luminance 8" : "Luminance 4";
    var lens = signals.vignetteLeft + signals.vignetteRight > 0.1 ? "Enable + vignette +12" : "Enable profile";

    return {
      version: "2.0.0",
      engineStatus: "disconnected",
      isDemo: true,
      trust: "Demo Analysis",
      adjustments: [
        adj("exposure", "Exposure", exposure, -2, 2,
          signals.brightness < 95 ? "Image reads dark in midtones." : "Balance overall luminance.",
          "Correct base brightness before local edits.", "Estimated"),
        adj("highlights", "Highlights", highlights, -100, 0,
          signals.brightFraction > 0.05 ? "Bright areas may be clipping." : "Protect sky and specular detail.",
          "Calmer skies and credible light.", "Estimated"),
        adj("shadows", "Shadows", shadows, 0, 100,
          signals.darkFraction > 0.25 ? "Shadows are heavy." : "Reveal subtle depth.",
          "Foreground texture without flat HDR.", "Estimated"),
        adj("whites", "Whites", signals.brightFraction > 0.04 ? "−10" : "+4", -50, 50,
          "Set white point for paper and screen.",
          "Crisp highlights without clipping.", "Estimated"),
        adj("blacks", "Blacks", signals.darkFraction > 0.2 ? "+6" : "−4", -50, 50,
          "Anchor deepest tones for print depth.",
          "Rich blacks without muddy shadows.", "Estimated"),
        adj("contrast", "Contrast", contrast, -30, 30,
          signals.contrast < 32 ? "Global contrast is low." : "Refine tonal separation.",
          "Subject presence without crunch.", "Estimated"),
        adj("whiteBalance", "White balance", wb, -10, 10,
          signals.dominantWarm ? "Warm cast detected." : "Neutralize before color grading.",
          "Believable natural color.", "Estimated"),
        adj("vibrance", "Vibrance", vibrance, 0, 30,
          "Boost muted colors before saturation.",
          "Life in foliage and sky without neon.", "Estimated"),
        adj("saturation", "Saturation", saturation, -20, 20,
          "Gentle global saturation after WB.",
          "Cohesive palette.", "Estimated"),
        adj("texture", "Texture", texture, 0, 40,
          "Micro-contrast in focused areas.",
          "Tactile detail on the anchor.", "Estimated"),
        adj("clarity", "Clarity", clarity, 0, 40,
          signals.contrast < 35 ? "Midtone snap is low." : "Local presence on subject.",
          "Separation from background.", "Estimated"),
        adj("dehaze", "Dehaze", dehaze, 0, 30,
          "Cut atmospheric flatness if present.",
          "Clearer distance and depth.", "Estimated"),
        adj("sharpening", "Sharpening", sharpen, 0, 100,
          "Output sharpening for web or print.",
          "Crisp presentation at intended size.", "Estimated"),
        adj("noiseReduction", "Noise reduction", nr, 0, 50,
          "Protect smooth areas; keep subject texture.",
          "Cleaner skies and bokeh.", "Estimated"),
        adj("lensCorrection", "Lens correction", lens, 0, 100,
          signals.vignetteLeft + signals.vignetteRight > 0.1 ? "Edge darkening detected." : "Standard profile correction.",
          "Straighter geometry and cleaner edges.", "Estimated"),
        adj("perspective", "Perspective", signals.vignetteLeft + signals.vignetteRight > 0.12 ? "Vertical −6" : "0", -20, 20,
          "Correct converging verticals when shooting upward at trees or cliffs.",
          "Architecture and trunks feel upright instead of leaning.", "Estimated"),
        adj("crop", "Crop", "See Crop Coach", 0, 100,
          signals.orientation === "portrait" ? "Vertical frame — tighten for mobile storytelling." : "Reframe for stronger thirds and fewer distractions.",
          "Clearer subject hierarchy before color grading.", "Estimated")
      ],
      pipelineNote: "Demo Analysis — values derived from brightness, contrast, and color sampling. Not pixel-level AI."
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
      ? '<span class="coach-trust coach-trust--demo">Demo Analysis</span>'
      : '<span class="coach-trust coach-trust--live">Live</span>';
    var html = '<section class="coach-card coach-card--edits" aria-labelledby="coach-edits-title">' +
      '<h3 class="coach-card__title" id="coach-edits-title">Edit recipe ' + badge + "</h3>";
    if (plan.pipelineNote) {
      html += '<p class="coach-card__note">' + escape(plan.pipelineNote) + "</p>";
    }
    html += '<ul class="coach-sliders">';
    plan.adjustments.forEach(function (a) {
      var pos = sliderPosition(a.suggestedValue, a.min != null ? a.min : -50, a.max != null ? a.max : 50);
      html += '<li class="coach-slider">' +
        '<div class="coach-slider__head">' +
          '<span class="coach-slider__label">' + escape(a.label) + "</span>" +
          '<span class="coach-slider__value">' + escape(a.suggestedValue) + "</span>" +
        "</div>" +
        '<div class="coach-slider__track" aria-hidden="true">' +
          '<div class="coach-slider__fill" style="width:' + pos + '%"></div>' +
          '<div class="coach-slider__thumb" style="left:' + pos + '%"></div>' +
        "</div>" +
        '<p class="coach-slider__why">' + escape(a.reason) + "</p>" +
        '<p class="coach-slider__effect">' + escape(a.expectedImprovement) + "</p>" +
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
