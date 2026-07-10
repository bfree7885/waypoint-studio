/**
 * Photo Coach — critique view rendering (presentation only).
 */
(function (global) {
  "use strict";

  function esc(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
    } catch (e) {
      return iso;
    }
  }

  function renderListItem(record) {
    var thumb = record.thumbnail
      ? '<img class="pc-history__thumb" src="' + esc(record.thumbnail) + '" alt="">'
      : '<div class="pc-history__thumb pc-history__thumb--empty" aria-hidden="true"></div>';
    return (
      '<li class="pc-history__item">' +
        '<button type="button" class="pc-history__open" data-id="' + esc(record.id) + '">' +
          thumb +
          '<span class="pc-history__meta">' +
            '<span class="pc-history__name">' + esc(record.filename || "Photo") + "</span>" +
            '<span class="pc-history__sub">' +
              esc(formatDate(record.analyzedAt)) +
              (record.score != null ? " · Score " + esc(record.score) : "") +
            "</span>" +
          "</span>" +
        "</button>" +
        '<button type="button" class="pc-history__delete" data-id="' + esc(record.id) + '" aria-label="Delete analysis">×</button>' +
      "</li>"
    );
  }

  function renderHistoryList(records) {
    if (!records || !records.length) {
      return '<p class="pc-muted">No analyses yet. Upload a photo to get your first critique.</p>';
    }
    return (
      '<ul class="pc-history__list">' +
        records.map(renderListItem).join("") +
      "</ul>"
    );
  }

  function renderSection(title, items, key) {
    if (!items || !items.length) return "";
    var lis = items.map(function (item) {
      var aspect = item.aspect || item.action || item.suggestion || "";
      var text = item.text || item.detail || "";
      return (
        "<li>" +
          (aspect ? '<span class="pc-critique__tag">' + esc(aspect) + "</span> " : "") +
          esc(text) +
        "</li>"
      );
    }).join("");
    return (
      '<section class="pc-critique__section" aria-labelledby="pc-' + key + '">' +
        '<h3 class="pc-critique__heading" id="pc-' + key + '">' + esc(title) + "</h3>" +
        '<ul class="pc-critique__list">' + lis + "</ul>" +
      "</section>"
    );
  }

  function renderCritique(critique, imageUrl) {
    if (!critique) return "";
    var preview = imageUrl
      ? '<figure class="pc-preview"><img src="' + esc(imageUrl) + '" alt="Uploaded photograph"></figure>'
      : "";

    return (
      '<article class="pc-critique">' +
        preview +
        '<header class="pc-critique__head">' +
          '<h2 class="pc-critique__title">' + esc(critique.filename || "Your photo") + "</h2>" +
          '<p class="pc-critique__meta">' +
            '<span class="pc-badge">Heuristic analysis</span>' +
            (critique.score != null ? ' · <span class="pc-score">' + esc(critique.score) + "/100</span>" : "") +
            (critique.analyzedAt ? " · " + esc(formatDate(critique.analyzedAt)) : "") +
          "</p>" +
        "</header>" +
        '<section class="pc-critique__section pc-critique__section--impression" aria-labelledby="pc-impression">' +
          '<h3 class="pc-critique__heading" id="pc-impression">Overall impression</h3>' +
          '<p class="pc-critique__prose">' + esc(critique.overallImpression) + "</p>" +
        "</section>" +
        renderSection("What works", critique.whatWorks, "works") +
        renderSection("What weakens it", critique.whatWeakens, "weakens") +
        renderSection("Suggested edits", critique.suggestedEdits, "edits") +
        renderSection("Next time", critique.nextTime, "next") +
        '<p class="pc-engine-note" role="status">Based on browser pixel sampling' +
          (critique.metadata && critique.metadata.exifSource === "embedded" ? " and embedded EXIF" : "") +
          ". Not a connected vision model.</p>" +
      "</article>"
    );
  }

  function renderUploadZone() {
    return (
      '<section class="pc-upload" aria-labelledby="pc-upload-title">' +
        '<h1 class="pc-upload__title" id="pc-upload-title">Photo Coach</h1>' +
        '<p class="pc-upload__lead">Upload a photo. Get a thoughtful critique — what works, what to refine, and what to try next time.</p>' +
        '<label class="pc-drop" id="pc-drop">' +
          '<input type="file" id="pc-file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" hidden>' +
          '<span class="pc-drop__icon" aria-hidden="true">↑</span>' +
          '<span class="pc-drop__label">Drop a photo here or click to upload</span>' +
          '<span class="pc-drop__hint">JPEG or PNG · up to 25 MB</span>' +
        "</label>" +
        '<p class="pc-status" id="pc-status" role="status" aria-live="polite"></p>' +
      "</section>"
    );
  }

  function renderShell() {
    return (
      renderUploadZone() +
      '<section class="pc-workspace" id="pc-workspace" hidden></section>' +
      '<section class="pc-recent" aria-labelledby="pc-recent-title">' +
        '<h2 class="pc-recent__title" id="pc-recent-title">Recent analyses</h2>' +
        '<div id="pc-history"></div>' +
      "</section>"
    );
  }

  global.PhotoCoachCritiqueRenderer = {
    renderShell: renderShell,
    renderCritique: renderCritique,
    renderHistoryList: renderHistoryList,
    esc: esc
  };
})(window);
