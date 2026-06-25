/**
 * Fieldry — shared helpers
 */
(function (global) {
  "use strict";

  var OBSERVATION_TYPES = Object.freeze([
    { value: "wildlife", label: "Wildlife", glyph: "W" },
    { value: "plant", label: "Plant", glyph: "P" },
    { value: "fungi", label: "Fungi", glyph: "F" },
    { value: "habitat", label: "Habitat", glyph: "H" },
    { value: "phenology", label: "Phenology", glyph: "Ph" },
    { value: "weather", label: "Weather", glyph: "Wx" },
    { value: "trail", label: "Trail conditions", glyph: "T" },
    { value: "water", label: "Water", glyph: "Wa" },
    { value: "sky", label: "Sky", glyph: "Sk" },
    { value: "sign", label: "Sign & scat", glyph: "Sg" },
    { value: "other", label: "Other", glyph: "·" }
  ]);

  var EDUCATIONAL_TIPS = Object.freeze([
    "Describe what you observed rather than what you believe happened.",
    "Record uncertainty honestly — tentative IDs are still valuable.",
    "Photograph before collecting. Most species are best left in place.",
    "Habitat often matters as much as species identity.",
    "Scientific honesty is more valuable than false certainty.",
    "General place names protect sensitive species and private land.",
    "Weather context helps explain phenology — note conditions at observation time."
  ]);

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    try {
      var parts = dateStr.split("-");
      if (parts.length === 3) {
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return months[Number(parts[1]) - 1] + " " + Number(parts[2]) + ", " + parts[0];
      }
    } catch (e) { /* fall through */ }
    return dateStr;
  }

  function formatTime(timeStr) {
    if (!timeStr) return "";
    return timeStr;
  }

  function formatLocation(obs) {
    var loc = obs.location || {};
    var parts = [];
    if (loc.county) parts.push(loc.county + " Co.");
    if (loc.stateCode) parts.push(loc.stateCode);
    else if (loc.state) parts.push(loc.state);
    if (loc.latitude != null && loc.longitude != null) {
      parts.push(Number(loc.latitude).toFixed(4) + "°, " + Number(loc.longitude).toFixed(4) + "°");
    }
    return parts.length ? parts.join(" · ") : "Location not recorded";
  }

  function observationType(obs) {
    var t = obs.meta && obs.meta.fieldry && obs.meta.fieldry.observationType;
    if (!t) return null;
    for (var i = 0; i < OBSERVATION_TYPES.length; i += 1) {
      if (OBSERVATION_TYPES[i].value === t) return OBSERVATION_TYPES[i];
    }
    return { value: t, label: t, glyph: "·" };
  }

  function displayTitle(obs) {
    return (obs.taxon && obs.taxon.label) || "Untitled observation";
  }

  function confidenceLabel(val) {
    var labels = {
      certain: "Certain",
      likely: "Likely",
      possible: "Possible",
      uncertain: "Uncertain",
      not_recorded: "Not recorded"
    };
    return labels[val] || val || "—";
  }

  function randomTip() {
    return EDUCATIONAL_TIPS[Math.floor(Math.random() * EDUCATIONAL_TIPS.length)];
  }

  function ethicsHtml() {
    var OE = global.WDS && global.WDS.outdoorEthics;
    if (OE && OE.renderReminder) {
      return OE.renderReminder("citizenScience", { className: "fld-ethics" });
    }
    return (
      '<aside class="fld-ethics">' +
        "<p><strong>Private by default.</strong> Records stay on this device until you export them.</p>" +
      "</aside>"
    );
  }

  function integrityFootnote(obs) {
    var RI = global.WDS && global.WDS.researchIntegrity;
    if (!RI || !RI.fromObservation || !RI.renderFootnote) return "";
    return RI.renderFootnote(RI.fromObservation(obs), {
      showConfidence: true,
      showEvidence: true,
      hideUnverified: false
    });
  }

  global.FieldryUtil = {
    OBSERVATION_TYPES: OBSERVATION_TYPES,
    EDUCATIONAL_TIPS: EDUCATIONAL_TIPS,
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    formatTime: formatTime,
    formatLocation: formatLocation,
    observationType: observationType,
    displayTitle: displayTitle,
    confidenceLabel: confidenceLabel,
    randomTip: randomTip,
    ethicsHtml: ethicsHtml,
    integrityFootnote: integrityFootnote
  };
})(window);
