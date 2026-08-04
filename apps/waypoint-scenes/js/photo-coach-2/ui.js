/**
 * Photo Coach 2.0 — minimal review UI renderer (education sections).
 */
(function (global) {
  "use strict";

  var Evidence = global.WaypointPhotoCoach2Evidence;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderEvidence(evidence) {
    if (!evidence || !evidence.length) {
      return '<p class="pc2-evidence pc2-evidence--missing">No region or EXIF citation</p>';
    }
    return evidence.map(function (e) {
      var label = Evidence ? Evidence.formatEvidenceLabel(e) : "";
      var note = e.note ? '<span class="pc2-evidence__note">' + esc(e.note) + "</span>" : "";
      return (
        '<p class="pc2-evidence">' +
        '<span class="pc2-evidence__kind">' + esc(e.kind || "evidence") + "</span>" +
        '<span class="pc2-evidence__label">' + esc(label) + "</span>" +
        note +
        "</p>"
      );
    }).join("");
  }

  function renderRecommendation(rec) {
    return (
      '<li class="pc2-rec">' +
      '<p class="pc2-rec__text">' + esc(rec.text) + "</p>" +
      renderEvidence(rec.evidence) +
      (rec.confidence != null
        ? '<p class="pc2-rec__conf">Confidence ' + esc(String(Math.round(rec.confidence * 100))) + "%</p>"
        : "") +
      "</li>"
    );
  }

  function renderSection(section) {
    var recs = (section.recommendations || []).map(renderRecommendation).join("");
    var summary = section.summary
      ? '<p class="pc2-section__summary">' + esc(section.summary) + "</p>"
      : "";
    var body = recs
      ? '<ul class="pc2-rec-list">' + recs + "</ul>"
      : '<p class="pc2-section__empty">Awaiting analysis for this section.</p>';
    return (
      '<article class="pc2-section" data-section="' + esc(section.id) + '" data-status="' + esc(section.status) + '">' +
      '<header class="pc2-section__head">' +
      "<h3>" + esc(section.title) + "</h3>" +
      '<span class="pc2-section__status">' + esc(section.status) + "</span>" +
      "</header>" +
      summary +
      body +
      "</article>"
    );
  }

  function renderReview(review, mount) {
    if (!mount) return "";
    if (!review) {
      mount.innerHTML = '<p class="pc2-empty">No review yet.</p>';
      return mount.innerHTML;
    }
    var meta =
      '<header class="pc2-review__meta">' +
      '<p class="pc2-review__provider">' + esc(review.providerLabel || review.providerId || "provider") + "</p>" +
      '<p class="pc2-review__image">' + esc(review.imageName || "Untitled image") + "</p>" +
      '<p class="pc2-review__status">Engine: ' + esc(review.engineStatus) +
      (review.isPlaceholder ? " · placeholder" : "") +
      (review.isSample ? " · sample" : "") +
      "</p>" +
      "</header>";
    var sections = (review.sections || []).map(renderSection).join("");
    var html = '<div class="pc2-review">' + meta + '<div class="pc2-sections">' + sections + "</div></div>";
    mount.innerHTML = html;
    return html;
  }

  global.WaypointPhotoCoach2UI = {
    renderReview: renderReview,
    renderSection: renderSection
  };
})(typeof window !== "undefined" ? window : globalThis);
