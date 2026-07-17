/**
 * Waypoint Evidence Card — explainable recommendations & claims.
 * Prefer labels over fake percentages. Silence empty sections.
 * @see docs/WAYPOINT-TRUST-FRAMEWORK.md
 * @see docs/WAYPOINT-EVIDENCE-MODEL.md
 */
(function (global) {
  "use strict";

  var CONFIDENCE_LABELS = {
    "very-high": "Very High",
    high: "High",
    moderate: "Moderate",
    limited: "Limited",
    preliminary: "Preliminary",
    unknown: "Unknown"
  };

  var KIND_LABELS = {
    "observed-data": "Observed data",
    prediction: "Prediction",
    research: "Research",
    "historical-record": "Historical record",
    "editorial-interpretation": "Editorial interpretation",
    "ai-synthesis": "AI synthesis",
    "user-observation": "User observation",
    government: "Government source",
    "professional-organization": "Professional organization",
    unknown: "Unknown"
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function confidenceLabel(id) {
    return CONFIDENCE_LABELS[id] || id || "Unknown";
  }

  function kindLabel(id) {
    return KIND_LABELS[id] || id || "";
  }

  function listSection(title, items, className) {
    if (!items || !items.length) return "";
    return (
      '<section class="wte-card__section ' +
      className +
      '">' +
      '<h4 class="wte-card__section-title">' +
      esc(title) +
      "</h4>" +
      "<ul>" +
      items
        .map(function (item) {
          return "<li>" + esc(item) + "</li>";
        })
        .join("") +
      "</ul></section>"
    );
  }

  function sourcesHtml(sources) {
    if (!sources || !sources.length) return "";
    return (
      '<section class="wte-card__section wte-card__sources">' +
      '<h4 class="wte-card__section-title">Sources</h4>' +
      "<ul>" +
      sources
        .map(function (s) {
          var kind = s.kind ? '<span class="wte-card__kind">' + esc(kindLabel(s.kind)) + "</span> " : "";
          if (s.url) {
            return (
              "<li>" +
              kind +
              '<a href="' +
              esc(s.url) +
              '" target="_blank" rel="noopener noreferrer">' +
              esc(s.label) +
              "</a></li>"
            );
          }
          return "<li>" + kind + "<span>" + esc(s.label) + "</span></li>";
        })
        .join("") +
      "</ul></section>"
    );
  }

  /**
   * @param {object} spec — Evidence Card fields (see schema-v1.json)
   */
  function render(spec) {
    spec = spec || {};
    if (!spec.title && !spec.claim) return "";

    var demo = spec.reviewStatus === "demonstration";
    var conf = spec.confidence
      ? '<p class="wte-card__confidence"><span class="wte-card__confidence-label">Confidence</span> ' +
        esc(confidenceLabel(spec.confidence)) +
        (spec.confidenceNote ? ' <span class="wte-card__confidence-note">· ' + esc(spec.confidenceNote) + "</span>" : "") +
        "</p>"
      : "";

    var epistemic = spec.epistemicKind
      ? '<p class="wte-card__epistemic">' + esc(kindLabel(spec.epistemicKind)) + "</p>"
      : "";

    var related = (spec.relatedResearch || [])
      .map(function (id) {
        return esc(String(id));
      })
      .filter(Boolean);

    var products = (spec.products || []).map(function (p) {
      return esc(String(p));
    });

    return (
      '<article class="wte-card' +
      (demo ? " wte-card--demo" : "") +
      '" data-wte-evidence-card' +
      (spec.id ? ' data-wte-id="' + esc(spec.id) + '"' : "") +
      ">" +
      '<header class="wte-card__header">' +
      (demo ? '<p class="wte-card__demo">Demonstration — not verified live guidance</p>' : "") +
      '<h3 class="wte-card__title">' +
      esc(spec.title || "Explanation") +
      "</h3>" +
      epistemic +
      '<p class="wte-card__claim">' +
      esc(spec.claim) +
      "</p>" +
      conf +
      "</header>" +
      listSection("Based on", spec.basedOn, "wte-card__based") +
      listSection("Uncertainty", spec.uncertainty, "wte-card__uncertainty") +
      sourcesHtml(spec.sources) +
      (spec.whyItMatters
        ? '<section class="wte-card__section"><h4 class="wte-card__section-title">Why this matters</h4><p>' +
          esc(spec.whyItMatters) +
          "</p></section>"
        : "") +
      (related.length
        ? listSection("Related research", related, "wte-card__related")
        : "") +
      (products.length
        ? '<p class="wte-card__products"><span class="wte-card__section-title">Applicable products</span> ' +
          products.join(" · ") +
          "</p>"
        : "") +
      (spec.lastUpdated
        ? '<p class="wte-card__updated">Last updated · ' + esc(spec.lastUpdated) + "</p>"
        : "") +
      "</article>"
    );
  }

  /**
   * Compact context for WDS.researchIntegrity.renderFootnote when available.
   */
  function toResearchIntegrity(spec) {
    spec = spec || {};
    var provenance = "educational";
    if (spec.epistemicKind === "prediction") provenance = "prediction";
    else if (spec.epistemicKind === "observed-data" || spec.epistemicKind === "user-observation")
      provenance = "observation";
    else if (spec.epistemicKind === "government") provenance = "verified";
    else if (spec.reviewStatus === "demonstration") provenance = "placeholder";

    return {
      provenance: provenance,
      confidence: null,
      evidence: spec.evidenceQuality || null,
      disclaimer: spec.confidenceNote || spec.whyItMatters || null,
      sources: (spec.sources || []).map(function (s) {
        return { label: s.label, url: s.url, accessedAt: s.accessedAt };
      })
    };
  }

  function normalizeConfidence(id, map) {
    if (!id) return "unknown";
    if (CONFIDENCE_LABELS[id]) return id;
    map = map || {};
    if (map.engineCrosswalk && map.engineCrosswalk[id]) return map.engineCrosswalk[id];
    if (map.worthNoticingCrosswalk && map.worthNoticingCrosswalk[id]) return map.worthNoticingCrosswalk[id];
    if (map.wosToRecommendation && map.wosToRecommendation[id]) return map.wosToRecommendation[id];
    return "unknown";
  }

  global.WDS = global.WDS || {};
  global.WDS.evidenceCard = {
    version: "1.0.0",
    render: render,
    toResearchIntegrity: toResearchIntegrity,
    confidenceLabel: confidenceLabel,
    kindLabel: kindLabel,
    normalizeConfidence: normalizeConfidence,
    CONFIDENCE_LABELS: CONFIDENCE_LABELS,
    KIND_LABELS: KIND_LABELS,
    docPath: "docs/WAYPOINT-TRUST-FRAMEWORK.md"
  };
})(typeof window !== "undefined" ? window : globalThis);
