/**
 * Trail Conditions dashboard — park operations layout.
 */
(function (global) {
  "use strict";

  var STATUS_LABELS = {
    clear: "Clear",
    caution: "Caution",
    closed: "Closed",
    unknown: "No feed"
  };

  var SOURCE_LABELS = {
    live: "Live",
    editorial: "Regional",
    expected: "Inferred",
    educational: "Educational",
    future: "Future feed"
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
      '<div class="wtrail wtrail--loading" aria-busy="true">' +
        '<div class="wtrail__ops-bar wtrail__skeleton wtrail__skeleton--bar"></div>' +
        '<div class="wtrail__skeleton-row">' +
          '<div class="wtrail__skeleton wtrail__skeleton--card"></div>' +
          '<div class="wtrail__skeleton wtrail__skeleton--card"></div>' +
          '<div class="wtrail__skeleton wtrail__skeleton--card"></div>' +
        "</div>" +
        '<p class="wtrail__loading-text">Loading trail operations…</p>' +
      "</div>"
    );
  }

  function renderError(title, detail) {
    return (
      '<div class="wtrail wtrail--error" role="alert">' +
        '<p class="wtrail__error-title">' + escapeHtml(title) + "</p>" +
        '<p class="wtrail__error-detail">' + escapeHtml(detail || "Regional trail intelligence unavailable.") + "</p>" +
      "</div>"
    );
  }

  function opsCard(data) {
    if (!data) return "";
    var statusClass = "wtrail-card--" + (data.status || "unknown");
    var statusLabel = STATUS_LABELS[data.status] || "No feed";
    var sourceLabel = SOURCE_LABELS[data.source] || "Educational";
    return (
      '<article class="wtrail-card ' + statusClass + '" data-trail-card="' + escapeHtml(data.id) + '"' +
        (data.feedSlot ? ' data-feed-slot="' + escapeHtml(data.feedSlot) + '"' : "") +
        (data.feedProvider ? ' data-feed-provider="' + escapeHtml(data.feedProvider) + '"' : "") +
      ">" +
        '<header class="wtrail-card__head">' +
          '<span class="wtrail-card__icon" aria-hidden="true">' + escapeHtml(data.icon) + "</span>" +
          '<div class="wtrail-card__titles">' +
            '<h4 class="wtrail-card__label">' + escapeHtml(data.label) + "</h4>" +
            '<span class="wtrail-card__status wtrail-card__status--' + escapeHtml(data.status) + '">' +
              escapeHtml(statusLabel) +
            "</span>" +
          "</div>" +
        "</header>" +
        '<p class="wtrail-card__headline">' + escapeHtml(data.headline) + "</p>" +
        (data.detail
          ? '<p class="wtrail-card__detail">' + escapeHtml(data.detail) + "</p>"
          : "") +
        '<p class="wtrail-card__action">' +
          '<span class="wtrail-card__action-label">Action</span> ' +
          escapeHtml(data.action) +
        "</p>" +
        '<footer class="wtrail-card__foot">' +
          '<span class="wtrail-card__source">' + escapeHtml(sourceLabel) + "</span>" +
          (data.feedStatus === "pending"
            ? '<span class="wtrail-card__feed-pending">Feed pending</span>'
            : data.feedStatus === "partial"
              ? '<span class="wtrail-card__feed-partial">Partial data</span>'
              : "") +
        "</footer>" +
      "</article>"
    );
  }

  function opsBanner(intel) {
    var status = intel.overallStatus || "unknown";
    var label = STATUS_LABELS[status] || "No feed";
    return (
      '<div class="wtrail__ops-bar wtrail__ops-bar--' + escapeHtml(status) + '" role="status">' +
        '<span class="wtrail__ops-label">Operations snapshot</span>' +
        '<span class="wtrail__ops-status">' + escapeHtml(label) + "</span>" +
        '<span class="wtrail__ops-note">' +
          escapeHtml(
            intel.hasLiveWeather
              ? "Regional intel + live weather · verify agency sources before heading out"
              : "Regional intel only · verify agency sources before heading out"
          ) +
        "</span>" +
      "</div>"
    );
  }

  function render(intel) {
    if (!intel) {
      return renderError("Trail operations unavailable", "Set your county to load regional trail context.");
    }
    return (
      '<div class="wtrail" data-trail-live="' + (intel.hasLiveWeather ? "weather" : "regional") + '">' +
        opsBanner(intel) +
        '<div class="wtrail__grid">' +
          intel.cardList.map(opsCard).join("") +
        "</div>" +
        '<footer class="wtrail__foot">' +
          '<p class="wtrail__attribution">' +
            escapeHtml("Park operations view · not an official agency bulletin") +
            (intel.regionLabel ? " · " + intel.regionLabel : "") +
          "</p>" +
        "</footer>" +
      "</div>"
    );
  }

  function mount(el, options) {
    if (!el) return Promise.resolve(null);
    options = options || {};
    var Intel = global.WDS && global.WDS.trailDashboardIntel;
    var WUI = global.WDS && global.WDS.weatherUI;
    var root = options.root || el.closest("#main") || document;
    var widgetId = el.closest("[data-widget-id]") &&
      el.closest("[data-widget-id]").getAttribute("data-widget-id");

    function finish(platform) {
      var intel = Intel && Intel.analyze ? Intel.analyze(platform) : null;
      if (!intel) {
        el.innerHTML = renderError("Trail operations unavailable");
        el.removeAttribute("aria-busy");
        if (WUI && widgetId) WUI.updateDashCardTag(root, widgetId, "unavailable");
        return null;
      }
      el.innerHTML = render(intel);
      el.removeAttribute("aria-busy");
      if (WUI && widgetId) {
        WUI.updateDashCardTag(root, widgetId, intel.hasLiveWeather ? "live" : "editorial");
        var sum = Intel.summary ? Intel.summary(intel) : null;
        if (sum) WUI.updateWidgetSummary(root, widgetId, sum);
      }
      return intel;
    }

    var platform = options.platform;
    if (platform) {
      return Promise.resolve(finish(platform));
    }

    el.setAttribute("aria-busy", "true");
    el.innerHTML = renderLoading();
    if (WUI && widgetId) WUI.updateDashCardTag(root, widgetId, "loading");

    el.innerHTML = renderError("Location required", "Set your county to load trail operations.");
    el.removeAttribute("aria-busy");
    if (WUI && widgetId) WUI.updateDashCardTag(root, widgetId, "unavailable");
    return Promise.resolve(null);
  }

  function mountAll(root, options) {
    if (!root) return Promise.resolve([]);
    options = options || {};
    var nodes = root.querySelectorAll('[data-wds-weather-mount="trail-dashboard"]');
    var jobs = [];
    for (var i = 0; i < nodes.length; i += 1) {
      jobs.push(mount(nodes[i], options));
    }
    return Promise.all(jobs);
  }

  global.WDS = global.WDS || {};
  global.WDS.trailDashboardUI = {
    render: render,
    renderLoading: renderLoading,
    mount: mount,
    mountAll: mountAll
  };
})(window);
