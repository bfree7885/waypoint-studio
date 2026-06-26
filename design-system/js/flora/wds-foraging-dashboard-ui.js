/**
 * Foraging dashboard — habitat literacy with strict observation ethics.
 */
(function (global) {
  "use strict";

  var STATE_LABELS = {
    ready: "Active",
    empty: "Quiet",
    unavailable: "Unavailable",
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
      '<div class="wforage wforage--loading" aria-busy="true">' +
        '<div class="wforage__ethics-bar wforage__skeleton wforage__skeleton--bar"></div>' +
        '<div class="wforage__skeleton-row">' +
          '<div class="wforage__skeleton wforage__skeleton--card"></div>' +
          '<div class="wforage__skeleton wforage__skeleton--card"></div>' +
        "</div>" +
        '<p class="wforage__loading-text">Loading foraging context…</p>' +
      "</div>"
    );
  }

  function renderUnavailable(title, detail) {
    return (
      '<div class="wforage wforage--unavailable" role="alert">' +
        '<p class="wforage__unavail-title">' + escapeHtml(title) + "</p>" +
        '<p class="wforage__unavail-detail">' + escapeHtml(detail || "Set your county to load foraging context.") + "</p>" +
      "</div>"
    );
  }

  function renderItems(items) {
    if (!items || !items.length) return "";
    return (
      '<ul class="wforage-card__list">' +
        items.map(function (item) {
          if (!item.name) return "";
          return (
            "<li>" +
              (item.status ? '<span class="wforage-card__item-tag">' + escapeHtml(item.status) + "</span> " : "") +
              escapeHtml(item.name) +
              (item.note ? " — " + escapeHtml(item.note) : "") +
            "</li>"
          );
        }).join("") +
      "</ul>"
    );
  }

  function forageCard(data) {
    if (!data) return "";
    var state = data.state || "empty";
    return (
      '<article class="wforage-card wforage-card--' + escapeHtml(state) + '" data-forage-card="' + escapeHtml(data.id) + '">' +
        '<header class="wforage-card__head">' +
          '<span class="wforage-card__icon" aria-hidden="true">' + escapeHtml(data.icon) + "</span>" +
          '<div class="wforage-card__titles">' +
            '<h4 class="wforage-card__label">' + escapeHtml(data.label) + "</h4>" +
            '<span class="wforage-card__state">' + escapeHtml(STATE_LABELS[state] || state) + "</span>" +
          "</div>" +
        "</header>" +
        '<p class="wforage-card__headline">' + escapeHtml(data.headline) + "</p>" +
        (data.detail ? '<p class="wforage-card__detail">' + escapeHtml(data.detail) + "</p>" : "") +
        renderItems(data.items) +
        (data.ethicsNote
          ? '<p class="wforage-card__ethics">' + escapeHtml(data.ethicsNote) + "</p>"
          : "") +
        (data.feedStatus === "pending"
          ? '<span class="wforage-card__feed">Feed pending</span>'
          : data.feedStatus === "partial"
            ? '<span class="wforage-card__feed wforage-card__feed--partial">Partial</span>'
            : "") +
      "</article>"
    );
  }

  function render(intel) {
    if (!intel) return renderUnavailable("Foraging dashboard unavailable");
    return (
      '<div class="wforage">' +
        '<div class="wforage__ethics-bar" role="note">' +
          '<span class="wforage__ethics-icon" aria-hidden="true">◎</span>' +
          '<p class="wforage__ethics-text">' + escapeHtml(intel.ethicsLead) + "</p>" +
        "</div>" +
        '<div class="wforage__grid">' + intel.cardList.map(forageCard).join("") + "</div>" +
        '<footer class="wforage__foot">' +
          '<p class="wforage__attribution">' +
            escapeHtml("Educational foraging context only · not harvest advice · " + (intel.regionLabel || "regional")) +
            ' · <a class="wforage__link" href="apps/foragecast/">Open ForageCast</a>' +
          "</p>" +
        "</footer>" +
      "</div>"
    );
  }

  function mount(el, options) {
    if (!el) return Promise.resolve(null);
    options = options || {};
    var Intel = global.WDS && global.WDS.foragingDashboardIntel;
    var WUI = global.WDS && global.WDS.weatherUI;
    var root = options.root || el.closest("#main") || document;
    var widgetId = el.closest("[data-widget-id]") &&
      el.closest("[data-widget-id]").getAttribute("data-widget-id");

    el.setAttribute("aria-busy", "true");
    el.innerHTML = renderLoading();
    if (WUI && widgetId) WUI.updateDashCardTag(root, widgetId, "loading");

    var platform = options.platform;
    var bundle = options.bundle || {};
    if (!platform) {
      el.innerHTML = renderUnavailable("Foraging dashboard unavailable");
      el.removeAttribute("aria-busy");
      if (WUI && widgetId) WUI.updateDashCardTag(root, widgetId, "unavailable");
      return Promise.resolve(null);
    }

    var intel = Intel && Intel.analyze ? Intel.analyze(platform, bundle) : null;
    el.innerHTML = intel ? render(intel) : renderUnavailable("Foraging dashboard unavailable");
    el.removeAttribute("aria-busy");
    if (WUI && widgetId) {
      WUI.updateDashCardTag(root, widgetId, intel.hasLiveWeather ? "live" : "editorial");
      var sum = Intel && Intel.summary ? Intel.summary(intel) : null;
      if (sum) WUI.updateWidgetSummary(root, widgetId, sum);
    }
    return Promise.resolve(intel);
  }

  global.WDS = global.WDS || {};
  global.WDS.foragingDashboardUI = { render: render, renderLoading: renderLoading, mount: mount };
})(window);
