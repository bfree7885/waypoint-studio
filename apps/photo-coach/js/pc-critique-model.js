/**
 * Photo Coach — critique data model (no analysis logic).
 */
(function (global) {
  "use strict";

  var VERSION = "1.0.0";

  function emptyCritique() {
    return {
      version: VERSION,
      id: null,
      analyzedAt: null,
      filename: null,
      score: null,
      trustLabel: "Heuristic analysis",
      engineType: "pixel-heuristic",
      overallImpression: null,
      whatWorks: [],
      whatWeakens: [],
      suggestedEdits: [],
      nextTime: [],
      metadata: null
    };
  }

  function normalizeItem(text, aspect) {
    return {
      aspect: aspect || "General",
      text: String(text || "").trim()
    };
  }

  function normalizeEdit(action, detail) {
    return {
      action: action || "Adjust",
      detail: detail || ""
    };
  }

  function normalizeNext(suggestion, detail) {
    return {
      suggestion: suggestion || "",
      detail: detail || ""
    };
  }

  function validate(critique) {
    if (!critique || typeof critique !== "object") return false;
    return !!(critique.overallImpression && Array.isArray(critique.whatWorks));
  }

  global.PhotoCoachCritiqueModel = {
    VERSION: VERSION,
    emptyCritique: emptyCritique,
    normalizeItem: normalizeItem,
    normalizeEdit: normalizeEdit,
    normalizeNext: normalizeNext,
    validate: validate
  };
})(window);
