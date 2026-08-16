/**
 * Hidden Landscapes — models, epistemic helpers, source identity
 */
(function (global) {
  "use strict";

  var EPISTEMIC = {
    measured: { id: "measured", label: "MEASURED", className: "hl-ep--measured" },
    computed: { id: "computed", label: "COMPUTED", className: "hl-ep--computed" },
    simulated: { id: "simulated", label: "SIMULATED", className: "hl-ep--simulated" },
    inferred: { id: "inferred", label: "INFERRED", className: "hl-ep--inferred" },
    unavailable: { id: "unavailable", label: "UNAVAILABLE", className: "hl-ep--unavailable" }
  };

  function epistemic(id) {
    return EPISTEMIC[id] || EPISTEMIC.computed;
  }

  function emptySource() {
    return {
      kind: null, // "import" | "library"
      libraryId: null,
      originalAssetId: null,
      editAssetId: null,
      hasEdit: false,
      sourceChoice: "original", // "original" | "edit"
      filename: null,
      file: null,
      objectUrl: null,
      exif: null,
      width: 0,
      height: 0
    };
  }

  function sourceLabel(src) {
    if (!src || !src.kind) return "No photograph loaded";
    var base = src.sourceChoice === "edit" ? "Waypoint Edit" : "Original";
    var name = src.filename ? " · " + src.filename : "";
    return base + name;
  }

  function analysisDefaultsToOriginal() {
    return true;
  }

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function findView(catalog, pillarId, viewId) {
    if (!catalog || !catalog.pillars) return null;
    for (var i = 0; i < catalog.pillars.length; i++) {
      var p = catalog.pillars[i];
      if (p.id !== pillarId) continue;
      for (var j = 0; j < (p.views || []).length; j++) {
        if (p.views[j].id === viewId) return { pillar: p, view: p.views[j] };
      }
    }
    return null;
  }

  function exportBasename(filename, viewId, epistemicId) {
    var stem = String(filename || "photo")
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[^a-z0-9._-]+/gi, "_")
      .slice(0, 40) || "photo";
    var ep = (epistemicId || "computed").toUpperCase();
    return stem + "_HL_" + String(viewId || "view") + "_" + ep + ".jpg";
  }

  global.WaypointHLModels = {
    EPISTEMIC: EPISTEMIC,
    epistemic: epistemic,
    emptySource: emptySource,
    sourceLabel: sourceLabel,
    analysisDefaultsToOriginal: analysisDefaultsToOriginal,
    clamp01: clamp01,
    esc: esc,
    findView: findView,
    exportBasename: exportBasename
  };
})(typeof window !== "undefined" ? window : globalThis);
