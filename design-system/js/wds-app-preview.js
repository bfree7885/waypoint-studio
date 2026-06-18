/**
 * Waypoint Studio — app preview page renderer
 */
(function () {
  "use strict";

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function listItems(items, extraClass) {
    return (items || []).map(function (item) {
      return "<li>" + escapeHtml(item) + "</li>";
    }).join("") ? '<ul class="wap-list' + (extraClass ? " " + extraClass : "") + '">' +
      (items || []).map(function (item) { return "<li>" + escapeHtml(item) + "</li>"; }).join("") +
      "</ul>" : "";
  }

  function render(data) {
    var statusClass = data.status === "live" ? "wap-status--live" : "wap-status--preview";
    var liveLink = data.liveToolHref
      ? '<p class="wap-live-link"><a href="' + escapeHtml(data.liveToolHref) + '">' + escapeHtml(data.liveToolLabel || "Open tool") + " →</a></p>"
      : "";

  return (
      '<section class="wap-hero" aria-labelledby="wap-title">' +
        '<p class="wds-eyebrow">' + escapeHtml(data.eyebrow) + "</p>" +
        '<h1 class="wap-hero__title" id="wap-title">' + escapeHtml(data.name) + "</h1>" +
        '<p class="wap-hero__mission">' + escapeHtml(data.mission) + "</p>" +
        '<span class="wap-status ' + statusClass + '">' + escapeHtml(data.statusLabel) + "</span>" +
        liveLink +
      "</section>" +
      '<section class="wap-section" aria-labelledby="wap-learn-title">' +
        '<p class="wap-section__eyebrow">Learn today</p>' +
        '<h2 class="wap-section__title" id="wap-learn-title">What you can study this week</h2>' +
        listItems(data.learnToday) +
      "</section>" +
      '<section class="wap-section" aria-labelledby="wap-coming-title">' +
        '<p class="wap-section__eyebrow">Coming</p>' +
        '<h2 class="wap-section__title" id="wap-coming-title">Features in development</h2>' +
        listItems(data.comingSoon, "wap-list--coming") +
      "</section>" +
      '<section class="wap-section" aria-labelledby="wap-preview-title">' +
        '<p class="wap-section__eyebrow">Preview</p>' +
        '<h2 class="wap-section__title" id="wap-preview-title">' + escapeHtml(data.preview.title) + "</h2>" +
        '<div class="wap-preview">' +
          '<div class="wap-preview__frame" role="img" aria-label="' + escapeHtml(data.preview.placeholderLabel) + '">' +
            '<span class="wap-preview__label">' + escapeHtml(data.preview.placeholderLabel) + "</span>" +
            '<p class="wap-preview__hint">' + escapeHtml(data.preview.placeholderHint) + "</p>" +
          "</div>" +
          '<div class="wap-preview__body"><p>' + escapeHtml(data.preview.description) + "</p></div>" +
        "</div>" +
      "</section>" +
      '<a class="wap-back" href="' + escapeHtml(data.homeLink || "../../#experiences") + '">← All experiences</a>'
    );
  }

  function init() {
    var mount = document.getElementById("wds-app-preview");
    if (!mount) return;

    var src = mount.getAttribute("data-preview-src") || "data/preview.json";

    fetch(src)
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load " + src);
        return res.json();
      })
      .then(function (data) {
        mount.innerHTML = render(data);
        mount.removeAttribute("aria-busy");
        if (data.name) document.title = data.name + " — Waypoint Studio";
      })
      .catch(function (err) {
        mount.innerHTML = "<p class=\"wds-body\" style=\"padding:2rem;\">Could not load preview: " + escapeHtml(err.message) + "</p>";
        mount.removeAttribute("aria-busy");
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
