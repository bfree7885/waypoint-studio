/**
 * Flora dashboard — phenology board; observation over collection.
 */
(function (global) {
  "use strict";

  var STATE_LABELS = {
    ready: "Active",
    empty: "Quiet",
    pending: "Preview"
  };

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderLoading() {
    return (
      '<div class="wflora wflora--loading" aria-busy="true">' +
        '<div class="wflora__hero wflora__skeleton wflora__skeleton--hero"></div>' +
        '<div class="wflora__skeleton-row">' +
          '<div class="wflora__skeleton wflora__skeleton--card"></div>' +
          '<div class="wflora__skeleton wflora__skeleton--card"></div>' +
          '<div class="wflora__skeleton wflora__skeleton--card"></div>' +
        "</div>" +
        '<p class="wflora__loading-text">Loading flora phenology…</p>' +
      "</div>"
    );
  }

  function renderUnavailable(title, detail) {
    return (
      '<div class="wflora wflora--unavailable" role="alert">' +
        '<p class="wflora__unavail-title">' + escapeHtml(title) + "</p>" +
        '<p class="wflora__unavail-detail">' + escapeHtml(detail || "Set your county to load regional flora context.") + "</p>" +
      "</div>"
    );
  }

  function renderItems(items) {
    if (!items || !items.length) return "";
    return (
      '<ul class="wflora-card__list">' +
        items.map(function (item) {
          return (
            "<li>" +
              "<strong>" + escapeHtml(item.name) + "</strong>" +
              (item.status ? ' <span class="wflora-card__status-tag">' + escapeHtml(item.status) + "</span>" : "") +
              (item.note ? '<span class="wflora-card__item-note">' + escapeHtml(item.note) + "</span>" : "") +
            "</li>"
          );
        }).join("") +
      "</ul>"
    );
  }

  function floraCard(data) {
    if (!data) return "";
    var state = data.state || "empty";
    return (
      '<article class="wflora-card wflora-card--' + escapeHtml(state) + '" data-flora-card="' + escapeHtml(data.id) + '">' +
        '<header class="wflora-card__head">' +
          '<span class="wflora-card__icon" aria-hidden="true">' + escapeHtml(data.icon) + "</span>" +
          '<div class="wflora-card__titles">' +
            '<h4 class="wflora-card__label">' + escapeHtml(data.label) + "</h4>" +
            '<span class="wflora-card__state">' + escapeHtml(STATE_LABELS[state] || state) + "</span>" +
          "</div>" +
        "</header>" +
        '<p class="wflora-card__headline">' + escapeHtml(data.headline) + "</p>" +
        (data.detail ? '<p class="wflora-card__detail">' + escapeHtml(data.detail) + "</p>" : "") +
        renderItems(data.items) +
        (data.observeNote
          ? '<p class="wflora-card__observe">' + escapeHtml(data.observeNote) + "</p>"
          : "") +
        (data.feedStatus === "pending"
          ? '<span class="wflora-card__feed">Preview feed</span>'
          : "") +
      "</article>"
    );
  }

  function render(intel) {
    if (!intel) return renderUnavailable("Flora dashboard unavailable");
    return (
      '<div class="wflora">' +
        '<div class="wflora__hero">' +
          '<span class="wflora__hero-icon" aria-hidden="true">🌿</span>' +
          '<div class="wflora__hero-body">' +
            '<p class="wflora__hero-title">' + escapeHtml(intel.phenologyTitle || "Regional phenology") + "</p>" +
            '<p class="wflora__hero-meta">' + escapeHtml(intel.readyCount + " active signals · " + intel.season + " season") + "</p>" +
          "</div>" +
        "</div>" +
        '<p class="wflora__ethics">Observe and photograph — collection is not the goal of this dashboard.</p>' +
        '<div class="wflora__grid">' + intel.cardList.map(floraCard).join("") + "</div>" +
        '<footer class="wflora__foot">' +
          '<p class="wflora__attribution">' +
            escapeHtml("Phenology watch · educational timing only · " + (intel.regionLabel || "regional")) +
          "</p>" +
        "</footer>" +
      "</div>"
    );
  }

  function mount(el, options) {
    if (!el) return Promise.resolve(null);
    options = options || {};
    var Intel = global.WDS && global.WDS.floraDashboardIntel;
    var WUI = global.WDS && global.WDS.weatherUI;
    var root = options.root || el.closest("#main") || document;
    var widgetId = el.closest("[data-widget-id]") &&
      el.closest("[data-widget-id]").getAttribute("data-widget-id");

    el.setAttribute("aria-busy", "true");
    el.innerHTML = renderLoading();
    if (WUI && widgetId) WUI.updateDashCardTag(root, widgetId, "loading");

    var platform = options.platform;
    if (!platform) {
      el.innerHTML = renderUnavailable("Flora dashboard unavailable");
      el.removeAttribute("aria-busy");
      if (WUI && widgetId) WUI.updateDashCardTag(root, widgetId, "unavailable");
      return Promise.resolve(null);
    }

    var intel = Intel && Intel.analyze ? Intel.analyze(platform) : null;
    el.innerHTML = intel ? render(intel) : renderUnavailable("Flora dashboard unavailable");
    el.removeAttribute("aria-busy");
    if (WUI && widgetId) {
      WUI.updateDashCardTag(root, widgetId, "editorial");
      var sum = Intel && Intel.summary ? Intel.summary(intel) : null;
      if (sum) WUI.updateWidgetSummary(root, widgetId, sum);
    }
    return Promise.resolve(intel);
  }

  global.WDS = global.WDS || {};
  global.WDS.floraDashboardUI = { render: render, renderLoading: renderLoading, mount: mount };
})(window);
