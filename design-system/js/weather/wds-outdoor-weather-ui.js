/**
 * Outdoor Weather — premium dashboard anchor widget UI
 */
(function (global) {
  "use strict";

  var W = function () { return global.WDS && global.WDS.weather; };
  var WUI = function () { return global.WDS && global.WDS.weatherUI; };
  var Intel = function () { return global.WDS && global.WDS.outdoorWeatherIntel; };

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

  function fmtTime(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    } catch (e) {
      return iso;
    }
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso + (iso.length === 10 ? "T12:00:00" : "")).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric"
      });
    } catch (e) {
      return iso;
    }
  }

  function fmtHour(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric" });
    } catch (e) {
      return iso;
    }
  }

  function iconClass(icon) {
    var key = (icon || "unknown").toLowerCase().replace(/\s+/g, "-");
    return "wds-weather-icon wds-weather-icon--" + escapeHtml(key);
  }

  function windLine(wind) {
    var ui = WUI();
    if (!wind || !ui) return "—";
    var parts = [];
    if (wind.speed) parts.push(fmt(wind.speed));
    if (wind.direction && wind.direction.label) parts.push(wind.direction.label);
    return parts.join(" ");
  }

  function rainChance(cur, today) {
    var pop = cur && cur.precipitation && cur.precipitation.probability;
    if (pop != null) return pop + "%";
    if (today && today.precipitation && today.precipitation.probability != null) {
      return today.precipitation.probability + "%";
    }
    return "—";
  }

  function levelClass(level) {
    if (level === "excellent" || level === "go") return "wow-outdoor__level--good";
    if (level === "good" || level === "moist") return "wow-outdoor__level--ok";
    if (level === "fair" || level === "caution") return "wow-outdoor__level--fair";
    if (level === "poor" || level === "wait" || level === "dry") return "wow-outdoor__level--poor";
    return "";
  }

  function renderLoading() {
    return (
      '<div class="wow wow--loading" aria-busy="true" aria-label="Loading outdoor weather">' +
        '<div class="wow__skeleton wow__skeleton--hero"></div>' +
        '<div class="wow__skeleton-row">' +
          '<div class="wow__skeleton wow__skeleton--metric"></div>' +
          '<div class="wow__skeleton wow__skeleton--metric"></div>' +
          '<div class="wow__skeleton wow__skeleton--metric"></div>' +
          '<div class="wow__skeleton wow__skeleton--metric"></div>' +
        "</div>" +
        '<div class="wow__skeleton wow__skeleton--strip"></div>' +
        '<p class="wow__loading-text">Loading live outdoor conditions…</p>' +
      "</div>"
    );
  }

  function renderError(detail) {
    return (
      '<div class="wow wow--error" role="alert">' +
        '<p class="wow__error-title">Outdoor weather unavailable</p>' +
        '<p class="wow__error-detail">' +
          escapeHtml(detail || "We could not load live forecast data. Check your connection or try again. We never show invented weather.") +
        "</p>" +
      "</div>"
    );
  }

  function renderEditorial(platform) {
    var w = platform && platform.weather;
    if (!w || w.status !== "editorial") return renderError("No live forecast and no regional snapshot available.");
    var highLow = [w.high, w.low].filter(Boolean).join(" / ");
    return (
      '<div class="wow wow--editorial">' +
        '<p class="wow__editorial-badge">Educational · not live</p>' +
        '<div class="wow__hero wow__hero--editorial">' +
          (highLow ? '<p class="wow__temp">' + escapeHtml(highLow) + "</p>" : "") +
          '<p class="wow__condition">' + escapeHtml(w.conditions || w.summary || "Regional snapshot") + "</p>" +
        "</div>" +
        '<p class="wow__editorial-note">Live Open-Meteo forecast could not be loaded. This regional editorial snapshot is not current conditions — verify outdoors.</p>' +
      "</div>"
    );
  }

  function renderOutdoorPanel(label, data) {
    if (!data) return "";
    return (
      '<div class="wow-outdoor__card ' + levelClass(data.level || data.verdict) + '">' +
        '<h4 class="wow-outdoor__label">' + escapeHtml(label) + "</h4>" +
        '<p class="wow-outdoor__summary">' + escapeHtml(data.summary || data.headline) + "</p>" +
        (data.detail ? '<p class="wow-outdoor__detail">' + escapeHtml(data.detail) + "</p>" : "") +
      "</div>"
    );
  }

  function renderRecommendation(rec) {
    if (!rec) return "";
    return (
      '<div class="wow-rec wow-rec--' + escapeHtml(rec.verdict) + '">' +
        '<p class="wow-rec__label">Outdoor recommendation</p>' +
        '<p class="wow-rec__headline">' + escapeHtml(rec.headline) + "</p>" +
        '<p class="wow-rec__detail">' + escapeHtml(rec.detail) + "</p>" +
      "</div>"
    );
  }

  function render(pkg, platform) {
    var cur = pkg.current || {};
    var today = pkg.daily && pkg.daily[0];
    var cond = cur.conditions || {};
    var intel = Intel() && Intel().analyze ? Intel().analyze(pkg, platform) : null;

    var hourly = (pkg.hourly || []).slice(0, 24);
    var hourlyHtml = hourly.map(function (row) {
      var c = row.conditions || {};
      return (
        '<li class="wow-hourly__item">' +
          '<time class="wow-hourly__time">' + escapeHtml(fmtHour(row.time)) + "</time>" +
          '<span class="' + iconClass(c.icon) + ' wow-hourly__icon" aria-hidden="true"></span>' +
          '<span class="wow-hourly__temp">' + escapeHtml(fmt(row.temperature, 0)) + "</span>" +
          '<span class="wow-hourly__pop">' +
            (row.precipitation && row.precipitation.probability != null ? escapeHtml(row.precipitation.probability + "%") : "") +
          "</span>" +
        "</li>"
      );
    }).join("");

    var daily = (pkg.daily || []).slice(0, 5);
    var dailyHtml = daily.map(function (row, i) {
      var c = row.conditions || {};
      return (
        '<li class="wow-daily__item' + (i === 0 ? " wow-daily__item--today" : "") + '">' +
          '<span class="wow-daily__date">' + escapeHtml(i === 0 ? "Today" : fmtDate(row.date)) + "</span>" +
          '<span class="' + iconClass(c.icon) + ' wow-daily__icon" aria-hidden="true"></span>' +
          '<span class="wow-daily__temps">' +
            escapeHtml(fmt(row.temperatureHigh, 0)) + '<span class="wow-daily__sep">/</span>' + escapeHtml(fmt(row.temperatureLow, 0)) +
          "</span>" +
          '<span class="wow-daily__pop">' +
            (row.precipitation && row.precipitation.probability != null ? escapeHtml(row.precipitation.probability + "%") : "") +
          "</span>" +
        "</li>"
      );
    }).join("");

    var meta = pkg.meta || {};
    var updated = meta.fetchedAt
      ? new Date(meta.fetchedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
      : null;

    return (
      '<div class="wow" data-outdoor-weather-live="true">' +
        '<div class="wow__hero">' +
          '<div class="wow__hero-main">' +
            '<span class="' + iconClass(cond.icon) + ' wow__icon" aria-hidden="true"></span>' +
            '<div class="wow__readout">' +
              '<p class="wow__temp">' + escapeHtml(fmt(cur.temperature, 0)) + "</p>" +
              '<p class="wow__condition">' + escapeHtml(cond.summary || "—") + "</p>" +
              (cur.feelsLike ? '<p class="wow__feels">Feels like ' + escapeHtml(fmt(cur.feelsLike, 0)) + "</p>" : "") +
            "</div>" +
          "</div>" +
          '<dl class="wow__now-metrics">' +
            '<div class="wow__metric"><dt>Humidity</dt><dd>' + escapeHtml(fmt(cur.humidity, 0)) + "</dd></div>" +
            '<div class="wow__metric"><dt>Wind</dt><dd>' + escapeHtml(windLine(cur.wind)) + "</dd></div>" +
            '<div class="wow__metric"><dt>Rain chance</dt><dd>' + escapeHtml(rainChance(cur, today)) + "</dd></div>" +
            '<div class="wow__metric"><dt>Today</dt><dd>' +
              escapeHtml(fmt(today && today.temperatureHigh, 0)) + " / " + escapeHtml(fmt(today && today.temperatureLow, 0)) +
            "</dd></div>" +
          "</dl>" +
        "</div>" +

        (hourly.length
          ? '<section class="wow__hourly" aria-label="Hourly forecast">' +
              '<h4 class="wow__section-title">Hourly</h4>' +
              '<ul class="wow-hourly__strip">' + hourlyHtml + "</ul>" +
            "</section>"
          : "") +

        (daily.length
          ? '<section class="wow__daily" aria-label="Five-day forecast">' +
              '<h4 class="wow__section-title">Next 5 days</h4>' +
              '<ul class="wow-daily__list">' + dailyHtml + "</ul>" +
            "</section>"
          : "") +

        (intel
          ? '<section class="wow__outdoor" aria-label="Outdoor guidance">' +
              '<h4 class="wow__section-title">For your day outside</h4>' +
              '<div class="wow-outdoor__grid">' +
                renderOutdoorPanel("Hiking comfort", intel.hiking) +
                renderOutdoorPanel("Photography", intel.photography) +
                renderOutdoorPanel("Mushroom weather", intel.mushroom) +
              "</div>" +
              renderRecommendation(intel.recommendation) +
            "</section>"
          : "") +

        '<footer class="wow__foot">' +
          '<p class="wow__attribution">Live · ' + escapeHtml(meta.attribution || meta.provider || "Open-Meteo") +
            (updated ? " · Updated " + escapeHtml(updated) : "") + "</p>" +
        "</footer>" +
      "</div>"
    );
  }

  function summaryFromPackage(pkg) {
    if (!pkg || !pkg.current) return null;
    var cur = pkg.current;
    var cond = cur.conditions && cur.conditions.summary;
    var temp = fmt(cur.temperature, 0);
    var feels = fmt(cur.feelsLike, 0);
    var line = temp + (cond ? " — " + cond : "");
    if (feels && feels !== "—" && feels !== temp) line = temp + " (feels " + feels + ") — " + (cond || "");
    return line;
  }

  function mount(el, options) {
    if (!el || !W()) return Promise.resolve(null);
    options = options || {};
    var WUISvc = WUI();
    var root = options.root || el.closest("#main") || document;
    var widgetId = el.closest("[data-widget-id]") && el.closest("[data-widget-id]").getAttribute("data-widget-id");
    var kind = "outdoor-weather";

    function isLive(pkg) {
      return !!(pkg && pkg.meta && !pkg.meta.isPlaceholder);
    }

    function resolvePkg() {
      return options.package ||
        (options.platform && options.platform.weatherRef) ||
        null;
    }

    function finish(pkg) {
      if (isLive(pkg)) {
        el.innerHTML = render(pkg, options.platform);
        el.removeAttribute("aria-busy");
        if (WUISvc && widgetId) {
          WUISvc.updateDashCardTag(root, widgetId, "live");
          var sum = summaryFromPackage(pkg);
          if (sum && WUISvc.updateWidgetSummary) WUISvc.updateWidgetSummary(root, widgetId, sum);
        }
        return pkg;
      }
      var platform = options.platform ||
        (options.intelligence && options.intelligence.outdoorIntelligence) || null;
      if (platform && platform.weather && platform.weather.status === "editorial") {
        el.innerHTML = renderEditorial(platform);
        el.removeAttribute("aria-busy");
        if (WUISvc && widgetId) WUISvc.updateDashCardTag(root, widgetId, "editorial");
        return null;
      }
      el.innerHTML = renderError();
      el.removeAttribute("aria-busy");
      if (WUISvc && widgetId) WUISvc.updateDashCardTag(root, widgetId, "unavailable");
      return null;
    }

    var existing = resolvePkg();
    if (existing && isLive(existing)) {
      return Promise.resolve(finish(existing));
    }

    el.setAttribute("aria-busy", "true");
    el.innerHTML = renderLoading();
    if (WUISvc && widgetId) WUISvc.updateDashCardTag(root, widgetId, "loading");

    var req = WUISvc && WUISvc.buildRequest ? WUISvc.buildRequest(options) : options;
    return W().getForecast(req).then(finish).catch(function () {
      var platform = options.platform;
      if (platform && platform.weather && platform.weather.status === "editorial") {
        el.innerHTML = renderEditorial(platform);
        el.removeAttribute("aria-busy");
        if (WUISvc && widgetId) WUISvc.updateDashCardTag(root, widgetId, "editorial");
        return null;
      }
      el.innerHTML = renderError();
      el.removeAttribute("aria-busy");
      if (WUISvc && widgetId) WUISvc.updateDashCardTag(root, widgetId, "unavailable");
      return null;
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.outdoorWeatherUI = {
    render: render,
    renderLoading: renderLoading,
    renderError: renderError,
    summaryFromPackage: summaryFromPackage,
    mount: mount
  };
})(window);
