/**
 * Sun & Moon + Photography — premium sky dashboard widgets
 */
(function (global) {
  "use strict";

  var W = function () { return global.WDS && global.WDS.weather; };
  var WUI = function () { return global.WDS && global.WDS.weatherUI; };
  var DU = function () { return global.WDS && global.WDS.daylightUtils; };

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmt(meas, digits) {
    var ui = WUI();
    return ui && ui.formatMeasurement ? ui.formatMeasurement(meas, digits) : "—";
  }

  function isLive(pkg) {
    return !!(pkg && pkg.meta && !pkg.meta.isPlaceholder);
  }

  function daylightFrom(platform, pkg) {
    if (platform && platform.daylight && platform.daylight.sunrise) {
      return platform.daylight;
    }
    if (pkg && DU() && DU().enrichFromWeather) {
      return DU().enrichFromWeather(pkg, {});
    }
    return null;
  }

  function renderLoading(kind) {
    var label = kind === "photography-dashboard"
      ? "Loading photography conditions…"
      : "Loading sun and moon…";
    return (
      '<div class="wsky wsky--loading" aria-busy="true">' +
        '<div class="wsky__skeleton wsky__skeleton--hero"></div>' +
        '<div class="wsky__skeleton-row">' +
          '<div class="wsky__skeleton wsky__skeleton--cell"></div>' +
          '<div class="wsky__skeleton wsky__skeleton--cell"></div>' +
          '<div class="wsky__skeleton wsky__skeleton--cell"></div>' +
          '<div class="wsky__skeleton wsky__skeleton--cell"></div>' +
        "</div>" +
        '<p class="wsky__loading-text">' + escapeHtml(label) + "</p>" +
      "</div>"
    );
  }

  function renderError(title, detail) {
    return (
      '<div class="wsky wsky--error" role="alert">' +
        '<p class="wsky__error-title">' + escapeHtml(title) + "</p>" +
        '<p class="wsky__error-detail">' + escapeHtml(detail || "Live sky data unavailable. We never show invented times.") + "</p>" +
      "</div>"
    );
  }

  function timeCell(icon, label, value, sub) {
    if (!value) return "";
    return (
      '<div class="wsky-time">' +
        '<span class="wsky-time__icon" aria-hidden="true">' + escapeHtml(icon) + "</span>" +
        '<span class="wsky-time__label">' + escapeHtml(label) + "</span>" +
        '<span class="wsky-time__value">' + escapeHtml(value) + "</span>" +
        (sub ? '<span class="wsky-time__sub">' + escapeHtml(sub) + "</span>" : "") +
      "</div>"
    );
  }

  function renderSunMoon(pkg, platform) {
    var dl = daylightFrom(platform, pkg);
    if (!dl || (!dl.sunrise && !dl.sunriseFormatted)) {
      return renderError("Sun & moon unavailable", "Daylight data could not be loaded for your location.");
    }

    var rise = dl.sunriseFormatted || (DU() && DU().formatTime ? DU().formatTime(dl.sunrise) : dl.sunrise);
    var set = dl.sunsetFormatted || (DU() && DU().formatTime ? DU().formatTime(dl.sunset) : dl.sunset);
    var live = isLive(pkg) || dl.status === "live";
    var moonEmoji = dl.moonPhaseEmoji || "☽";

    return (
      '<div class="wsky wsky--sun-moon" data-sky-live="' + (live ? "true" : "false") + '">' +
        '<div class="wsky__sun-hero">' +
          '<span class="wsky__hero-icon" aria-hidden="true">☀</span>' +
          '<div class="wsky__hero-times">' +
            '<div class="wsky-time wsky-time--hero">' +
              '<span class="wsky-time__icon" aria-hidden="true">↑</span>' +
              '<span class="wsky-time__label">Sunrise</span>' +
              '<span class="wsky-time__value">' + escapeHtml(rise || "—") + "</span>" +
            "</div>" +
            '<div class="wsky-time wsky-time--hero">' +
              '<span class="wsky-time__icon" aria-hidden="true">↓</span>' +
              '<span class="wsky-time__label">Sunset</span>' +
              '<span class="wsky-time__value">' + escapeHtml(set || "—") + "</span>" +
            "</div>" +
          "</div>" +
          (dl.dayLengthHours != null
            ? '<p class="wsky__daylength">' + escapeHtml(dl.dayLengthHours) + " h daylight</p>"
            : "") +
        "</div>" +

        '<div class="wsky__section">' +
          '<h4 class="wsky__section-title">Twilight & light</h4>' +
          '<div class="wsky__grid">' +
            timeCell("◐", "Civil · morning", dl.civilTwilightMorning) +
            timeCell("◐", "Civil · evening", dl.civilTwilightEvening) +
            timeCell("◑", "Nautical · morning", dl.nauticalTwilightMorning) +
            timeCell("◑", "Nautical · evening", dl.nauticalTwilightEvening) +
            timeCell("✦", "Golden hour · AM", dl.goldenHourMorning) +
            timeCell("✦", "Golden hour · PM", dl.goldenHourEvening) +
            timeCell("◉", "Blue hour · AM", dl.blueHourMorning) +
            timeCell("◉", "Blue hour · PM", dl.blueHourEvening) +
          "</div>" +
        "</div>" +

        '<div class="wsky__section wsky__moon">' +
          '<h4 class="wsky__section-title">Moon</h4>' +
          '<div class="wsky__moon-hero">' +
            '<span class="wsky__moon-icon" aria-hidden="true">' + moonEmoji + "</span>" +
            '<div class="wsky__moon-readout">' +
              '<p class="wsky__moon-phase">' + escapeHtml(dl.moonPhase || "—") + "</p>" +
              (dl.moonIllumination != null
                ? '<p class="wsky__moon-illum">' + escapeHtml(dl.moonIllumination) + "% illuminated</p>"
                : "") +
            "</div>" +
          "</div>" +
          '<div class="wsky__grid wsky__grid--2">' +
            timeCell("☾↑", "Moonrise", dl.moonrise || "—") +
            timeCell("☾↓", "Moonset", dl.moonset || "—") +
          "</div>" +
        "</div>" +

        '<footer class="wsky__foot">' +
          '<p class="wsky__attribution">' + (live ? "Live · Open-Meteo" : "Educational · verify locally") + "</p>" +
        "</footer>" +
      "</div>"
    );
  }

  function photoCard(icon, label, data, isPreview) {
    if (!data) return "";
    var levelClass = "wsky-photo__card--" + (data.level || "unknown");
    if (isPreview) levelClass = "wsky-photo__card--preview";
    return (
      '<div class="wsky-photo__card ' + levelClass + '">' +
        '<span class="wsky-photo__icon" aria-hidden="true">' + escapeHtml(icon) + "</span>" +
        '<span class="wsky-photo__label">' + escapeHtml(label) + "</span>" +
        '<span class="wsky-photo__headline">' + escapeHtml(data.headline) + "</span>" +
        (data.detail ? '<span class="wsky-photo__detail">' + escapeHtml(data.detail) + "</span>" : "") +
        (isPreview ? '<span class="wsky-photo__badge">Preview</span>' : "") +
      "</div>"
    );
  }

  function renderPhotography(pkg, platform) {
    var Intel = global.WDS && global.WDS.skyDashboardIntel;
    var intel = Intel && Intel.analyze ? Intel.analyze(pkg, platform) : null;
    if (!intel) {
      return renderError("Photography conditions unavailable", "Live weather is required for photography guidance.");
    }

    return (
      '<div class="wsky wsky--photography" data-sky-live="true">' +
        '<div class="wsky-photo__grid">' +
          photoCard("🌅", "Sunrise quality", intel.sunriseQuality) +
          photoCard("🌇", "Sunset quality", intel.sunsetQuality) +
          photoCard("🌫", "Fog potential", intel.fogPotential) +
          photoCard("☁", "Cloud cover", intel.cloudCover) +
          photoCard("★", "Night photography", intel.nightPhotography) +
          photoCard("🌌", "Milky Way", intel.milkyWay, true) +
          photoCard("✨", "Aurora", intel.aurora, true) +
        "</div>" +
        '<footer class="wsky__foot">' +
          '<p class="wsky__attribution">Live weather · placeholders marked Preview</p>' +
        "</footer>" +
      "</div>"
    );
  }

  function summarySunMoon(platform, pkg) {
    var dl = daylightFrom(platform, pkg);
    if (!dl) return null;
    var parts = [];
    if (dl.sunriseFormatted || dl.sunrise) parts.push("↑ " + (dl.sunriseFormatted || dl.sunrise));
    if (dl.moonPhase) parts.push(dl.moonPhase);
    return parts.join(" · ") || null;
  }

  function summaryPhotography(platform, pkg) {
    var Intel = global.WDS && global.WDS.skyDashboardIntel;
    var intel = Intel && Intel.analyze ? Intel.analyze(pkg, platform) : null;
    if (!intel) return null;
    return intel.sunriseQuality.headline + " · " + intel.cloudCover.headline;
  }

  function mount(el, options, kind) {
    if (!el || !W()) return Promise.resolve(null);
    options = options || {};
    kind = kind || el.getAttribute("data-wds-weather-mount") || "sun-moon-dashboard";
    var WUISvc = WUI();
    var root = options.root || el.closest("#main") || document;
    var widgetId = el.closest("[data-widget-id]") && el.closest("[data-widget-id]").getAttribute("data-widget-id");
    var renderer = kind === "photography-dashboard" ? renderPhotography : renderSunMoon;
    var summaryFn = kind === "photography-dashboard" ? summaryPhotography : summarySunMoon;

    function finish(pkg) {
      var platform = options.platform;
      if (kind === "photography-dashboard" && !isLive(pkg)) {
        el.innerHTML = renderError("Photography conditions unavailable", "Live weather is required for photography guidance.");
        el.removeAttribute("aria-busy");
        if (WUISvc && widgetId) WUISvc.updateDashCardTag(root, widgetId, "unavailable");
        return null;
      }
      if (isLive(pkg) || (platform && platform.daylight && platform.daylight.sunrise)) {
        el.innerHTML = renderer(pkg, platform);
        el.removeAttribute("aria-busy");
        if (WUISvc && widgetId) {
          WUISvc.updateDashCardTag(root, widgetId, isLive(pkg) ? "live" : "editorial");
          var sum = summaryFn(platform, pkg);
          if (sum) WUISvc.updateWidgetSummary(root, widgetId, sum);
        }
        return pkg;
      }
      if (platform && platform.daylight && platform.daylight.status === "editorial") {
        el.innerHTML = renderer(null, platform);
        el.removeAttribute("aria-busy");
        if (WUISvc && widgetId) WUISvc.updateDashCardTag(root, widgetId, "editorial");
        return null;
      }
      el.innerHTML = renderError("Sky data unavailable");
      el.removeAttribute("aria-busy");
      if (WUISvc && widgetId) WUISvc.updateDashCardTag(root, widgetId, "unavailable");
      return null;
    }

    var existing = options.package || (options.platform && options.platform.weatherRef);
    if (existing && isLive(existing)) {
      return Promise.resolve(finish(existing));
    }
    if (options.platform && options.platform.daylight && options.platform.daylight.sunrise && !kind.includes("photography")) {
      return Promise.resolve(finish(existing));
    }

    el.setAttribute("aria-busy", "true");
    el.innerHTML = renderLoading(kind);
    if (WUISvc && widgetId) WUISvc.updateDashCardTag(root, widgetId, "loading");

    var req = WUISvc && WUISvc.buildRequest ? WUISvc.buildRequest(options) : options;
    return W().getForecast(req).then(finish).catch(function () {
      el.innerHTML = renderError("Could not load live sky data");
      el.removeAttribute("aria-busy");
      if (WUISvc && widgetId) WUISvc.updateDashCardTag(root, widgetId, "unavailable");
      return null;
    });
  }

  function mountSunMoon(el, options) {
    return mount(el, options, "sun-moon-dashboard");
  }

  function mountPhotography(el, options) {
    return mount(el, options, "photography-dashboard");
  }

  global.WDS = global.WDS || {};
  global.WDS.skyDashboardUI = {
    renderSunMoon: renderSunMoon,
    renderPhotography: renderPhotography,
    renderLoading: renderLoading,
    mountSunMoon: mountSunMoon,
    mountPhotography: mountPhotography,
    mount: mount
  };
})(window);
