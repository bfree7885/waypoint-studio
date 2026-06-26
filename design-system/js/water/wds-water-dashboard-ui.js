/**
 * Water intelligence dashboard — hydrology ops with loading, empty, and unavailable states.
 */
(function (global) {
  "use strict";

  var STATE_LABELS = {
    ready: "Live / regional",
    empty: "Awaiting data",
    unavailable: "Unavailable",
    pending: "Feed pending"
  };

  var SOURCE_LABELS = {
    live: "Live",
    editorial: "Regional",
    expected: "Inferred",
    educational: "Educational",
    future: "USGS / NWS pending"
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
      '<div class="wwater wwater--loading" aria-busy="true">' +
        '<div class="wwater__hero wwater__skeleton wwater__skeleton--hero"></div>' +
        '<div class="wwater__skeleton-row">' +
          '<div class="wwater__skeleton wwater__skeleton--card"></div>' +
          '<div class="wwater__skeleton wwater__skeleton--card"></div>' +
          '<div class="wwater__skeleton wwater__skeleton--card"></div>' +
          '<div class="wwater__skeleton wwater__skeleton--card"></div>' +
        "</div>" +
        '<p class="wwater__loading-text">Loading water intelligence…</p>' +
      "</div>"
    );
  }

  function renderUnavailable(title, detail) {
    return (
      '<div class="wwater wwater--unavailable" role="alert">' +
        '<div class="wwater__unavail-icon" aria-hidden="true">💧</div>' +
        '<p class="wwater__unavail-title">' + escapeHtml(title) + "</p>" +
        '<p class="wwater__unavail-detail">' + escapeHtml(detail || "Set your county to load regional water context.") + "</p>" +
      "</div>"
    );
  }

  function renderEmptyBanner(intel) {
    if (intel.readyCount > 0) return "";
    return (
      '<div class="wwater__empty-banner" role="status">' +
        '<span class="wwater__empty-label">Empty state</span>' +
        '<p class="wwater__empty-text">' +
          escapeHtml(
            "No live USGS gauges connected yet — watershed context and rainfall will still display when available."
          ) +
        "</p>" +
      "</div>"
    );
  }

  function waterHero(intel) {
    var ws = intel.watersheds && intel.watersheds.length
      ? intel.watersheds.join(" · ")
      : "Watershed context loading";
    var signal = intel.readyCount + " of " + intel.cardList.length + " signals active";
    return (
      '<div class="wwater__hero">' +
        '<span class="wwater__hero-icon" aria-hidden="true">💧</span>' +
        '<div class="wwater__hero-body">' +
          '<p class="wwater__hero-watershed">' + escapeHtml(ws) + "</p>" +
          '<p class="wwater__hero-meta">' + escapeHtml(signal) +
            (intel.hasLiveWeather ? " · live weather" : "") +
          "</p>" +
        "</div>" +
      "</div>"
    );
  }

  function waterCard(data) {
    if (!data) return "";
    var state = data.state || "pending";
    var stateClass = "wwater-card--" + state;
    var stateLabel = STATE_LABELS[state] || state;
    var sourceLabel = SOURCE_LABELS[data.source] || "Pending";
    var isEmpty = state === "empty" || state === "unavailable" || state === "pending";

    return (
      '<article class="wwater-card ' + stateClass + '" data-water-card="' + escapeHtml(data.id) + '"' +
        ' data-water-state="' + escapeHtml(state) + '"' +
        (data.feedSlot ? ' data-feed-slot="' + escapeHtml(data.feedSlot) + '"' : "") +
        (data.feedProvider ? ' data-feed-provider="' + escapeHtml(data.feedProvider) + '"' : "") +
      ">" +
        '<header class="wwater-card__head">' +
          '<span class="wwater-card__icon" aria-hidden="true">' + escapeHtml(data.icon) + "</span>" +
          '<div class="wwater-card__titles">' +
            '<h4 class="wwater-card__label">' + escapeHtml(data.label) + "</h4>" +
            '<span class="wwater-card__state wwater-card__state--' + escapeHtml(state) + '">' +
              escapeHtml(stateLabel) +
            "</span>" +
          "</div>" +
          (data.value != null && data.value !== "—" && !isEmpty
            ? '<span class="wwater-card__value">' + escapeHtml(String(data.value)) + "</span>"
            : isEmpty && data.value
              ? '<span class="wwater-card__value wwater-card__value--muted">' + escapeHtml(String(data.value)) + "</span>"
              : "") +
        "</header>" +
        '<p class="wwater-card__headline">' + escapeHtml(data.headline) + "</p>" +
        (data.detail
          ? '<p class="wwater-card__detail">' + escapeHtml(data.detail) + "</p>"
          : "") +
        (data.action
          ? '<p class="wwater-card__action">' + escapeHtml(data.action) + "</p>"
          : "") +
        '<footer class="wwater-card__foot">' +
          '<span class="wwater-card__source">' + escapeHtml(sourceLabel) + "</span>" +
          (data.feedStatus === "pending"
            ? '<span class="wwater-card__feed-tag">USGS slot</span>'
            : data.feedStatus === "partial"
              ? '<span class="wwater-card__feed-tag wwater-card__feed-tag--partial">Partial</span>'
              : "") +
        "</footer>" +
      "</article>"
    );
  }

  function render(intel) {
    if (!intel) {
      return renderUnavailable("Water intelligence unavailable", "Regional outdoor context could not be loaded.");
    }
    return (
      '<div class="wwater" data-water-live="' + (intel.hasLiveWeather ? "weather" : "regional") + '">' +
        waterHero(intel) +
        renderEmptyBanner(intel) +
        '<div class="wwater__grid">' +
          intel.cardList.map(waterCard).join("") +
        "</div>" +
        '<footer class="wwater__foot">' +
          '<p class="wwater__attribution">' +
            escapeHtml("Hydrology view · USGS IV integration prepared · not an official bulletin") +
            (intel.regionLabel ? " · " + intel.regionLabel : "") +
          "</p>" +
        "</footer>" +
      "</div>"
    );
  }

  function mount(el, options) {
    if (!el) return Promise.resolve(null);
    options = options || {};
    var Intel = global.WDS && global.WDS.waterDashboardIntel;
    var WUI = global.WDS && global.WDS.weatherUI;
    var root = options.root || el.closest("#main") || document;
    var widgetId = el.closest("[data-widget-id]") &&
      el.closest("[data-widget-id]").getAttribute("data-widget-id");

    function finish(platform) {
      if (!platform) {
        el.innerHTML = renderUnavailable("Water intelligence unavailable");
        el.removeAttribute("aria-busy");
        if (WUI && widgetId) WUI.updateDashCardTag(root, widgetId, "unavailable");
        return null;
      }
      var intel = Intel && Intel.analyze ? Intel.analyze(platform) : null;
      if (!intel) {
        el.innerHTML = renderUnavailable("Water intelligence unavailable");
        el.removeAttribute("aria-busy");
        if (WUI && widgetId) WUI.updateDashCardTag(root, widgetId, "unavailable");
        return null;
      }
      el.innerHTML = render(intel);
      el.removeAttribute("aria-busy");
      if (WUI && widgetId) {
        var tag = intel.readyCount > 0
          ? (intel.hasLiveWeather ? "live" : "editorial")
          : "editorial";
        WUI.updateDashCardTag(root, widgetId, tag);
        var sum = Intel.summary ? Intel.summary(intel) : null;
        if (sum) WUI.updateWidgetSummary(root, widgetId, sum);
      }
      return intel;
    }

    el.setAttribute("aria-busy", "true");
    el.innerHTML = renderLoading();
    if (WUI && widgetId) WUI.updateDashCardTag(root, widgetId, "loading");

    var platform = options.platform;
    return Promise.resolve(finish(platform));
  }

  function mountAll(root, options) {
    if (!root) return Promise.resolve([]);
    options = options || {};
    var nodes = root.querySelectorAll('[data-wds-weather-mount="water-dashboard"]');
    var jobs = [];
    for (var i = 0; i < nodes.length; i += 1) {
      jobs.push(mount(nodes[i], options));
    }
    return Promise.all(jobs);
  }

  global.WDS = global.WDS || {};
  global.WDS.waterDashboardUI = {
    render: render,
    renderLoading: renderLoading,
    renderUnavailable: renderUnavailable,
    mount: mount,
    mountAll: mountAll
  };
})(window);
