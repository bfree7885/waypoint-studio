/**
 * Wildlife Activity dashboard — outdoor intelligence cards (not species education).
 */
(function (global) {
  "use strict";

  var SOURCE_LABELS = {
    observed: "Observed",
    expected: "Expected",
    educational: "Educational",
    future: "Future live source"
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
      '<div class="wwild wwild--loading" aria-busy="true">' +
        '<div class="wwild__skeleton-row">' +
          '<div class="wwild__skeleton wwild__skeleton--card"></div>' +
          '<div class="wwild__skeleton wwild__skeleton--card"></div>' +
          '<div class="wwild__skeleton wwild__skeleton--card"></div>' +
        "</div>" +
        '<p class="wwild__loading-text">Loading wildlife intelligence…</p>' +
      "</div>"
    );
  }

  function renderError(title, detail) {
    return (
      '<div class="wwild wwild--error" role="alert">' +
        '<p class="wwild__error-title">' + escapeHtml(title) + "</p>" +
        '<p class="wwild__error-detail">' + escapeHtml(detail || "Regional outdoor intelligence unavailable.") + "</p>" +
      "</div>"
    );
  }

  function activityCard(data) {
    if (!data) return "";
    var sourceClass = "wwild-card--" + (data.source || "educational");
    var sourceLabel = SOURCE_LABELS[data.source] || "Educational";
    var confLabel = data.confidence === "moderate" ? "Moderate confidence" : "Low confidence";
    return (
      '<article class="wwild-card ' + sourceClass + '" data-wildlife-card="' + escapeHtml(data.id) + '">' +
        '<header class="wwild-card__head">' +
          '<span class="wwild-card__icon" aria-hidden="true">' + escapeHtml(data.icon) + "</span>" +
          '<h4 class="wwild-card__label">' + escapeHtml(data.label) + "</h4>" +
        "</header>" +
        '<p class="wwild-card__happening">' + escapeHtml(data.happening) + "</p>" +
        '<div class="wwild-card__block">' +
          '<span class="wwild-card__block-label">Why</span>' +
          '<p class="wwild-card__block-text">' + escapeHtml(data.why) + "</p>" +
        "</div>" +
        '<div class="wwild-card__block wwild-card__block--attention">' +
          '<span class="wwild-card__block-label">Pay attention</span>' +
          '<p class="wwild-card__block-text">' + escapeHtml(data.attention) + "</p>" +
        "</div>" +
        '<footer class="wwild-card__foot">' +
          '<span class="wwild-card__source">' + escapeHtml(sourceLabel) + "</span>" +
          '<span class="wwild-card__confidence">' + escapeHtml(confLabel) + "</span>" +
        "</footer>" +
      "</article>"
    );
  }

  function render(intel) {
    if (!intel) {
      return renderError("Wildlife intelligence unavailable", "Connect location to load regional outdoor context.");
    }
    var cards = [
      intel.wildlifeActivity,
      intel.birdActivity,
      intel.amphibianActivity,
      intel.reptileActivity,
      intel.insectActivity,
      intel.rutCalendar,
      intel.migration
    ];
    return (
      '<div class="wwild" data-wildlife-live="' + (intel.hasLiveWeather ? "weather" : "regional") + '">' +
        '<div class="wwild__grid">' +
          cards.map(activityCard).join("") +
        "</div>" +
        '<footer class="wwild__foot">' +
          '<p class="wwild__attribution">' +
            escapeHtml(
              intel.hasLiveWeather
                ? "Regional intelligence · live weather context · tentative cues only"
                : "Regional intelligence · tentative cues only — verify in the field"
            ) +
            (intel.regionLabel ? " · " + intel.regionLabel : "") +
          "</p>" +
        "</footer>" +
      "</div>"
    );
  }

  function mount(el, options) {
    if (!el) return Promise.resolve(null);
    options = options || {};
    var Intel = global.WDS && global.WDS.wildlifeDashboardIntel;
    var WUI = global.WDS && global.WDS.weatherUI;
    var root = options.root || el.closest("#main") || document;
    var widgetId = el.closest("[data-widget-id]") &&
      el.closest("[data-widget-id]").getAttribute("data-widget-id");

    function finish(platform) {
      var intel = Intel && Intel.analyze ? Intel.analyze(platform) : null;
      if (!intel) {
        el.innerHTML = renderError("Wildlife intelligence unavailable");
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
    if (platform && (platform.species || platform.phenology || platform.observations)) {
      return Promise.resolve(finish(platform));
    }

    el.setAttribute("aria-busy", "true");
    el.innerHTML = renderLoading();
    if (WUI && widgetId) WUI.updateDashCardTag(root, widgetId, "loading");

    if (platform) return Promise.resolve(finish(platform));

    el.innerHTML = renderError("Location required", "Set your county to load regional wildlife intelligence.");
    el.removeAttribute("aria-busy");
    if (WUI && widgetId) WUI.updateDashCardTag(root, widgetId, "unavailable");
    return Promise.resolve(null);
  }

  function mountAll(root, options) {
    if (!root) return Promise.resolve([]);
    options = options || {};
    var nodes = root.querySelectorAll('[data-wds-weather-mount="wildlife-dashboard"]');
    var jobs = [];
    for (var i = 0; i < nodes.length; i += 1) {
      jobs.push(mount(nodes[i], options));
    }
    return Promise.all(jobs);
  }

  global.WDS = global.WDS || {};
  global.WDS.wildlifeDashboardUI = {
    render: render,
    renderLoading: renderLoading,
    mount: mount,
    mountAll: mountAll
  };
})(window);
