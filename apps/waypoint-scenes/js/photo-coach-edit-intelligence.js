/**
 * Photo Coach edit intelligence — production schema for adjustment recommendations.
 * No fake pixel analysis; structures ready for future vision/processing engine.
 */
(function (global) {
  "use strict";

  var EDIT_TYPES = [
    "exposure", "highlights", "shadows", "contrast", "whiteBalance",
    "texture", "clarity", "dehaze", "sharpening", "noiseReduction",
    "lensCorrection", "crop", "perspective"
  ];

  function adjustment(type, label, suggestedValue, reason, expectedImprovement, trust) {
    return {
      type: type,
      label: label,
      suggestedValue: suggestedValue,
      reason: reason,
      expectedImprovement: expectedImprovement,
      trust: trust || "Estimated"
    };
  }

  function sampleEditPlan(critique) {
    return {
      version: "1.0.0",
      engineStatus: "disconnected",
      isSample: true,
      trust: "Demo sample",
      adjustments: [
        adjustment("crop", "Crop", "4:5 vertical, −8% left, −5% top",
          "Removes bright edge competing with the subject.",
          "Stronger subject dominance and cleaner frame edges.",
          "Estimated"),
        adjustment("exposure", "Shadow recovery", "+0.25 EV shadows",
          "Foreground and shade areas are slightly underexposed.",
          "Recovers depth and texture without a flat HDR appearance.",
          "Estimated"),
        adjustment("highlights", "Highlight recovery", "−0.15 EV highlights",
          "Sky and rim highlights have minor headroom use.",
          "Preserves sky credibility while keeping natural contrast.",
          "Estimated"),
        adjustment("whiteBalance", "Shadow tint", "Green −3 in shadows",
          "Magenta cast common in open-shade forest scenes.",
          "Neutralizes distracting color before global edits.",
          "Estimated"),
        adjustment("contrast", "Local contrast", "Mild S-curve on subject mask",
          "Subject could separate more from midtone background.",
          "Adds presence without crunchy global contrast.",
          "Estimated"),
        adjustment("clarity", "Clarity (masked)", "+8 on subject only",
          "Primary anchor benefits from micro-contrast.",
          "Adds tactile presence without halos in sky.",
          "Estimated"),
        adjustment("sharpening", "Output sharpening", "Moderate for web export",
          "Center sharpness is good; verify after crop at 100%.",
          "Crisp web presentation without oversharpening noise.",
          "Estimated"),
        adjustment("noiseReduction", "Luminance NR", "Light, sky and bokeh only",
          "ISO is clean; protect focused areas from smearing.",
          "Cleaner smooth areas while keeping subject texture.",
          "Estimated")
      ],
      pipelineNote: "Analysis engine not connected — adjustments illustrate the structured edit plan format."
    };
  }

  function emptyEditPlan() {
    return {
      version: "1.0.0",
      engineStatus: "disconnected",
      isSample: false,
      trust: "Not yet available",
      adjustments: [],
      pipelineNote: "Connect the edit intelligence engine to generate adjustments from image data."
    };
  }

  function renderHtml(plan) {
    if (!plan || !plan.adjustments || !plan.adjustments.length) return "";
    var badge = plan.isSample
      ? '<span class="coach-trust coach-trust--demo">Demo sample</span>'
      : '<span class="coach-trust coach-trust--live">Live</span>';
    var html = '<section class="coach-section coach-section--edits"><h3 class="coach-section__title">Edit intelligence ' + badge + "</h3>";
    if (plan.pipelineNote) {
      html += '<p class="coach-muted">' + escape(plan.pipelineNote) + "</p>";
    }
    html += '<ol class="coach-edit-plan">';
    plan.adjustments.forEach(function (a) {
      html += "<li><strong>" + escape(a.label) + ":</strong> " + escape(a.suggestedValue) +
        '<span class="coach-edit-plan__reason">' + escape(a.reason) + "</span>" +
        '<span class="coach-edit-plan__improve">' + escape(a.expectedImprovement) + "</span>" +
        '<span class="coach-edit-plan__trust">' + escape(a.trust) + "</span></li>";
    });
    html += "</ol></section>";
    return html;
  }

  function escape(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  global.WaypointPhotoCoachEditIntel = {
    EDIT_TYPES: EDIT_TYPES,
    adjustment: adjustment,
    sampleEditPlan: sampleEditPlan,
    emptyEditPlan: emptyEditPlan,
    renderHtml: renderHtml
  };
})(window);
