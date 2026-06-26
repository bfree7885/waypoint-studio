/**
 * Outdoor Safety dashboard — calm layout, concise recommendations.
 */
(function (global) {
  "use strict";

  var LEVEL_LABELS = {
    low: "Low",
    moderate: "Moderate",
    elevated: "Elevated",
    quiet: "Quiet"
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
      '<div class="wsafe wsafe--loading" aria-busy="true">' +
        '<div class="wsafe__banner wsafe__skeleton wsafe__skeleton--banner"></div>' +
        '<div class="wsafe__skeleton-row">' +
          '<div class="wsafe__skeleton wsafe__skeleton--card"></div>' +
          '<div class="wsafe__skeleton wsafe__skeleton--card"></div>' +
          '<div class="wsafe__skeleton wsafe__skeleton--card"></div>' +
        "</div>" +
        '<p class="wsafe__loading-text">Loading outdoor safety…</p>' +
      "</div>"
    );
  }

  function renderUnavailable(title, detail) {
    return (
      '<div class="wsafe wsafe--unavailable" role="alert">' +
        '<p class="wsafe__unavail-title">' + escapeHtml(title) + "</p>" +
        '<p class="wsafe__unavail-detail">' + escapeHtml(detail || "Set your county to load safety context.") + "</p>" +
      "</div>"
    );
  }

  function safetyCard(data) {
    if (!data) return "";
    var level = data.level || "quiet";
    return (
      '<article class="wsafe-card wsafe-card--' + escapeHtml(level) + '" data-safety-card="' + escapeHtml(data.id) + '">' +
        '<header class="wsafe-card__head">' +
          '<span class="wsafe-card__icon" aria-hidden="true">' + escapeHtml(data.icon) + "</span>" +
          '<div class="wsafe-card__meta">' +
            '<h4 class="wsafe-card__label">' + escapeHtml(data.label) + "</h4>" +
            '<span class="wsafe-card__level">' + escapeHtml(LEVEL_LABELS[level] || level) + "</span>" +
          "</div>" +
          (data.value
            ? '<span class="wsafe-card__value">' + escapeHtml(String(data.value)) + "</span>"
            : "") +
        "</header>" +
        '<p class="wsafe-card__headline">' + escapeHtml(data.headline) + "</p>" +
        (data.recommendation
          ? '<p class="wsafe-card__rec"><span class="wsafe-card__rec-label">Plan</span> ' +
            escapeHtml(data.recommendation) + "</p>"
          : "") +
        (data.detail
          ? '<p class="wsafe-card__detail">' + escapeHtml(data.detail) + "</p>"
          : "") +
      "</article>"
    );
  }

  function calmBanner(intel) {
    var level = intel.overallLevel || "low";
    var msg = level === "elevated"
      ? "A few factors worth planning for today — nothing urgent, just good to know."
      : level === "moderate"
        ? "Some moderate signals — small adjustments to your plan may help."
        : "Conditions look manageable for outdoor time.";
    return (
      '<div class="wsafe__banner wsafe__banner--' + escapeHtml(level) + '" role="status">' +
        '<span class="wsafe__banner-icon" aria-hidden="true">◎</span>' +
        '<p class="wsafe__banner-text">' + escapeHtml(msg) + "</p>" +
      "</div>"
    );
  }

  function render(intel) {
    if (!intel) return renderUnavailable("Safety dashboard unavailable");
    return (
      '<div class="wsafe" data-safety-live="' + (intel.hasLiveWeather ? "weather" : "regional") + '">' +
        calmBanner(intel) +
        '<div class="wsafe__grid">' + intel.cardList.map(safetyCard).join("") + "</div>" +
        '<footer class="wsafe__foot">' +
          '<p class="wsafe__attribution">' +
            escapeHtml("Calm guidance only · verify official alerts · " + (intel.regionLabel || "regional")) +
          "</p>" +
        "</footer>" +
      "</div>"
    );
  }

  function mount(el, options) {
    if (!el) return Promise.resolve(null);
    options = options || {};
    var Intel = global.WDS && global.WDS.safetyDashboardIntel;
    var W = function () { return global.WDS && global.WDS.weather; };
    var WUI = global.WDS && global.WDS.weatherUI;
    var root = options.root || el.closest("#main") || document;
    var widgetId = el.closest("[data-widget-id]") &&
      el.closest("[data-widget-id]").getAttribute("data-widget-id");

    function finish(platform) {
      var intel = Intel && Intel.analyze ? Intel.analyze(platform) : null;
      if (!intel) {
        el.innerHTML = renderUnavailable("Safety dashboard unavailable");
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

    el.setAttribute("aria-busy", "true");
    el.innerHTML = renderLoading();
    if (WUI && widgetId) WUI.updateDashCardTag(root, widgetId, "loading");

    var platform = options.platform;
    if (platform && isLivePlatform(platform)) {
      return Promise.resolve(finish(platform));
    }

    if (platform && W() && WUI) {
      var req = WUI.buildRequest ? WUI.buildRequest(options) : options;
      return W().getForecast(req).then(function (pkg) {
        var p = Object.assign({}, platform, { weatherRef: pkg });
        return finish(p);
      }).catch(function () {
        return finish(platform);
      });
    }

    return Promise.resolve(finish(platform));
  }

  function isLivePlatform(platform) {
    var pkg = platform && platform.weatherRef;
    return !!(pkg && pkg.meta && !pkg.meta.isPlaceholder);
  }

  global.WDS = global.WDS || {};
  global.WDS.safetyDashboardUI = { render: render, renderLoading: renderLoading, mount: mount };
})(window);
