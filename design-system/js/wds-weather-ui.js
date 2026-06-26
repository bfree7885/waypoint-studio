/**
 * Waypoint Studio — Weather UI components
 * Renders normalized WDS.weather packages. No provider logic here.
 */
(function (global) {
  "use strict";

  var W = global.WDS && global.WDS.weather;

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatMeasurement(meas, digits) {
    if (!meas || meas.value == null) return "—";
    var val = Number(meas.value);
    if (!isFinite(val)) return "—";
    return (digits != null ? val.toFixed(digits) : String(Math.round(val * 10) / 10)) + (meas.unit ? " " + meas.unit : "");
  }

  function formatTime(iso, options) {
    if (!iso) return "—";
    options = options || {};
    try {
      return new Date(iso).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: options.timeZoneName
      });
    } catch (e) {
      return iso;
    }
  }

  function formatDate(iso) {
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

  function formatHour(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric" });
    } catch (e) {
      return iso;
    }
  }

  function windLine(windObj) {
    if (!windObj) return "—";
    var parts = [];
    if (windObj.speed) parts.push(formatMeasurement(windObj.speed));
    if (windObj.direction && windObj.direction.label) parts.push(windObj.direction.label);
    if (windObj.gust) parts.push("gusts " + formatMeasurement(windObj.gust));
    return parts.length ? parts.join(" · ") : "—";
  }

  function precipLine(precip) {
    if (!precip) return "—";
    var parts = [];
    if (precip.probability != null) parts.push(precip.probability + "% chance");
    if (precip.amount && precip.amount.value) parts.push(formatMeasurement(precip.amount));
    if (!parts.length && precip.intensity && precip.intensity !== "none") parts.push(precip.intensity);
    return parts.length ? parts.join(" · ") : "None";
  }

  function highLowLine(today) {
    if (!today || !today.temperatureHigh || !today.temperatureLow) return "—";
    return formatMeasurement(today.temperatureHigh, 0) + " / " + formatMeasurement(today.temperatureLow, 0);
  }

  function rainChanceLine(cur, today) {
    var precip = cur && cur.precipitation;
    if (precip && precip.probability != null) return precip.probability + "%";
    if (today && today.precipitation && today.precipitation.probability != null) {
      return today.precipitation.probability + "%";
    }
    return "—";
  }

  function renderLoading(kind) {
    if (kind === "outdoor-weather") {
      var OW = global.WDS && global.WDS.outdoorWeatherUI;
      if (OW && OW.renderLoading) return OW.renderLoading();
    }
    if (kind === "sun-moon-dashboard" || kind === "photography-dashboard") {
      var SK = global.WDS && global.WDS.skyDashboardUI;
      if (SK && SK.renderLoading) return SK.renderLoading(kind);
    }
    if (kind === "wildlife-dashboard") {
      var WL = global.WDS && global.WDS.wildlifeDashboardUI;
      if (WL && WL.renderLoading) return WL.renderLoading();
    }
    if (kind === "trail-dashboard") {
      var TR = global.WDS && global.WDS.trailDashboardUI;
      if (TR && TR.renderLoading) return TR.renderLoading();
    }
    if (kind === "water-dashboard") {
      var WA = global.WDS && global.WDS.waterDashboardUI;
      if (WA && WA.renderLoading) return WA.renderLoading();
    }
    var label = kind === "sun-moon"
      ? "Loading sun and moon…"
      : "Loading current conditions…";
    return (
      '<div class="wds-weather wds-weather--loading" aria-busy="true">' +
        '<p class="wds-weather-loading">' +
          '<span class="wds-weather-loading__spinner" aria-hidden="true"></span>' +
          escapeHtml(label) +
        "</p>" +
      "</div>"
    );
  }

  function hasEditorialWeather(platform) {
    if (!platform || !platform.weather) return false;
    var w = platform.weather;
    return w.status === "editorial" && (w.conditions || w.high || w.low || w.summary);
  }

  function hasEditorialDaylight(platform) {
    if (!platform || !platform.daylight) return false;
    var d = platform.daylight;
    return (d.status === "editorial" || d.status === "live") && (d.sunrise || d.sunset);
  }

  function renderEditorialWeather(platform) {
    var w = platform.weather || {};
    var highLow = [w.high, w.low].filter(Boolean).join(" / ");
    return (
      '<div class="wds-weather wds-weather--editorial">' +
        '<section class="wds-weather-current" aria-label="Regional weather snapshot">' +
          '<div class="wds-weather-current__main">' +
            '<div class="wds-weather-current__readout">' +
              (highLow ? '<p class="wds-weather-current__temp">' + escapeHtml(highLow) + "</p>" : "") +
              '<p class="wds-weather-current__summary">' +
                escapeHtml(w.conditions || w.summary || "Regional field snapshot — confirm conditions locally.") +
              "</p>" +
            "</div>" +
          "</div>" +
        "</section>" +
        '<p class="wds-weather__attribution">Regional field snapshot · live forecast unavailable</p>' +
      "</div>"
    );
  }

  function renderEditorialSunMoon(platform) {
    var d = platform.daylight || {};
    var dayLength = d.dayLengthHours != null ? d.dayLengthHours + " h daylight" : null;
    return (
      '<div class="wds-weather wds-weather--editorial wds-weather--sun-moon">' +
        '<section class="wds-weather-sun" aria-label="Sunrise and sunset">' +
          '<div class="wds-weather-sun__item">' +
            '<span class="wds-weather-sun__label">Sunrise</span>' +
            '<span class="wds-weather-sun__time">' + escapeHtml(d.sunrise || "—") + "</span>" +
          "</div>" +
          '<div class="wds-weather-sun__item">' +
            '<span class="wds-weather-sun__label">Sunset</span>' +
            '<span class="wds-weather-sun__time">' + escapeHtml(d.sunset || "—") + "</span>" +
          "</div>" +
        "</section>" +
        (dayLength ? '<p class="wds-weather-sun-moon__note">' + escapeHtml(dayLength) + "</p>" : "") +
        '<p class="wds-weather__attribution">Regional field snapshot · moon phase data coming soon</p>' +
      "</div>"
    );
  }

  function renderEducationalSunMoon() {
    return (
      '<div class="wds-weather wds-weather--editorial wds-weather--sun-moon">' +
        '<p class="wds-weather-error__detail">' +
          escapeHtml("Day length shifts through the season — sunrise and sunset load from regional intelligence when available.") +
        "</p>" +
      "</div>"
    );
  }

  function renderError(detail) {
    return (
      '<div class="wds-weather wds-weather--error" role="alert">' +
        '<p class="wds-weather-error__title">Weather unavailable</p>' +
        '<p class="wds-weather-error__detail">' +
          escapeHtml(detail || "We could not load live conditions right now. Other dashboard cards still reflect regional field notes.") +
        "</p>" +
      "</div>"
    );
  }

  function cardIdFromMount(el) {
    var article = el && el.closest(".wce-dash-card");
    if (article && article.id) return article.id.replace(/^dashboard-/, "");
    var widget = el && el.closest(".wdb-widget[data-widget-id]");
    if (widget) return widget.getAttribute("data-widget-id");
    return null;
  }

  function updateWidgetTag(root, widgetId, state) {
    if (!root || !widgetId) return;
    var card = root.querySelector('[data-widget-id="' + widgetId + '"]');
    if (!card) return;
    var tag = card.querySelector(".wdb-widget__tag");
    if (!tag) return;
    if (state === "live") {
      tag.textContent = "Live";
      tag.className = "wdb-widget__tag wdb-widget__tag--live";
      return;
    }
    if (state === "loading") {
      tag.textContent = "Loading";
      tag.className = "wdb-widget__tag wdb-widget__tag--preview";
      return;
    }
    if (state === "unavailable") {
      tag.textContent = "Unavailable";
      tag.className = "wdb-widget__tag wdb-widget__tag--unavailable";
      return;
    }
    if (state === "editorial") {
      tag.textContent = "Educational";
      tag.className = "wdb-widget__tag wdb-widget__tag--editorial";
    }
  }

  function updateWidgetSummary(root, widgetId, summary) {
    if (!root || !widgetId || summary == null) return;
    var card = root.querySelector('[data-widget-id="' + widgetId + '"]');
    if (!card) return;
    var el = card.querySelector(".wdb-widget__summary");
    if (el) el.textContent = summary;
  }

  function summaryForMount(kind, pkg) {
    if (!pkg || !isLivePackage(pkg)) return null;
    var cur = pkg.current || {};
    var today = pkg.daily && pkg.daily[0];
    var cond = cur.conditions && cur.conditions.summary;
    if (kind === "current") {
      var temp = formatMeasurement(cur.temperature, 0);
      var feels = formatMeasurement(cur.feelsLike, 0);
      var line = temp;
      if (feels && feels !== "—" && feels !== temp) line += ", feels " + feels;
      if (cond) line += " — " + cond;
      return line;
    }
    if (kind === "hourly") return "Next 24 hours · " + (cond || "live");
    if (kind === "daily") return "7-day · today " + highLowLine(today);
    if (kind === "wind") return windLine(cur.wind);
    if (kind === "uv") return cur.uvIndex ? "UV " + formatMeasurement(cur.uvIndex, 0) : "UV index";
    if (kind === "sunrise" && cur.sunrise) return formatTime(cur.sunrise);
    if (kind === "sunset" && cur.sunset) return formatTime(cur.sunset);
    if (kind === "outdoor-weather") {
      var OW = global.WDS && global.WDS.outdoorWeatherUI;
      return OW && OW.summaryFromPackage ? OW.summaryFromPackage(pkg) : cond;
    }
    if (kind === "cloud-cover") return formatMeasurement(cur.cloudCover, 0) + " cloud cover";
    return cond || null;
  }

  function updateDashCardTag(root, cardId, state) {
    updateWidgetTag(root, cardId, state);
    if (!root || !cardId) return;
    var card = root.querySelector("#dashboard-" + cardId);
    if (!card) return;
    var tag = card.querySelector(".wce-dash-card__tag");
    if (!tag) return;
    if (state === "live") {
      tag.textContent = "Live";
      tag.className = "wce-dash-card__tag wce-dash-card__tag--live";
      return;
    }
    if (state === "loading") {
      tag.textContent = "Loading";
      tag.className = "wce-dash-card__tag wce-dash-card__tag--soon";
      return;
    }
    if (state === "unavailable") {
      tag.textContent = "Unavailable";
      tag.className = "wce-dash-card__tag wce-dash-card__tag--unavailable";
      return;
    }
    if (state === "editorial") {
      tag.textContent = "Regional";
      tag.className = "wce-dash-card__tag wce-dash-card__tag--regional";
    }
  }

  function isLivePackage(pkg) {
    return !!(pkg && pkg.meta && !pkg.meta.isPlaceholder);
  }

  function resolvePackage(options) {
    var pkg = options.package ||
      (options.platform && options.platform.weatherRef) ||
      (options.intelligence && options.intelligence.weatherRef);
    return isLivePackage(pkg) ? pkg : null;
  }

  function resolvePlatform(options) {
    return options.platform ||
      (options.intelligence && options.intelligence.outdoorIntelligence) ||
      (options.intelligence && options.intelligence.v2) ||
      null;
  }

  function iconClass(icon) {
    var key = (icon || "unknown").toLowerCase().replace(/\s+/g, "-");
    return "wds-weather-icon wds-weather-icon--" + escapeHtml(key);
  }

  function renderMetric(label, value, detail) {
    return (
      '<div class="wds-weather-metric">' +
        '<dt class="wds-weather-metric__label">' + escapeHtml(label) + "</dt>" +
        '<dd class="wds-weather-metric__value">' + escapeHtml(value) + "</dd>" +
        (detail ? '<dd class="wds-weather-metric__detail">' + escapeHtml(detail) + "</dd>" : "") +
      "</div>"
    );
  }

  function renderCurrent(pkg) {
    var cur = (pkg && pkg.current) || {};
    var cond = cur.conditions || {};
    var today = (pkg && pkg.daily && pkg.daily[0]) || {};
    return (
      '<section class="wds-weather-current" aria-label="Current conditions">' +
        '<div class="wds-weather-current__main">' +
          '<span class="' + iconClass(cond.icon) + '" aria-hidden="true"></span>' +
          '<div class="wds-weather-current__readout">' +
            '<p class="wds-weather-current__temp">' + escapeHtml(formatMeasurement(cur.temperature, 0)) + "</p>" +
            '<p class="wds-weather-current__summary">' + escapeHtml(cond.summary || "—") + "</p>" +
            (cur.feelsLike ? '<p class="wds-weather-current__feels">Feels like ' + escapeHtml(formatMeasurement(cur.feelsLike, 0)) + "</p>" : "") +
          "</div>" +
        "</div>" +
        '<dl class="wds-weather-metrics wds-weather-metrics--compact wds-weather-current__details" aria-label="Current details">' +
          renderMetric("Humidity", formatMeasurement(cur.humidity, 0)) +
          renderMetric("Wind", windLine(cur.wind)) +
          renderMetric("Rain chance", rainChanceLine(cur, today)) +
          renderMetric("Today", highLowLine(today), "High / low") +
        "</dl>" +
      "</section>"
    );
  }

  function renderDashboardStats(pkg) {
    var cur = (pkg && pkg.current) || {};
    var today = (pkg && pkg.daily && pkg.daily[0]) || {};
    return (
      '<dl class="wds-weather-dashboard__stats" aria-label="Today at a glance">' +
        renderMetric("Today", highLowLine(today), "High / low") +
        renderMetric("Rain chance", rainChanceLine(cur, today)) +
        renderMetric("Wind", windLine(cur.wind)) +
      "</dl>"
    );
  }

  function renderSun(pkg) {
    var cur = (pkg && pkg.current) || {};
    return (
      '<section class="wds-weather-sun" aria-label="Sunrise and sunset">' +
        '<div class="wds-weather-sun__item">' +
          '<span class="wds-weather-sun__label">Sunrise</span>' +
          '<span class="wds-weather-sun__time">' + escapeHtml(formatTime(cur.sunrise)) + "</span>" +
        "</div>" +
        '<div class="wds-weather-sun__item">' +
          '<span class="wds-weather-sun__label">Sunset</span>' +
          '<span class="wds-weather-sun__time">' + escapeHtml(formatTime(cur.sunset)) + "</span>" +
        "</div>" +
      "</section>"
    );
  }

  function renderMetrics(pkg) {
    var cur = (pkg && pkg.current) || {};
    return (
      '<dl class="wds-weather-metrics" aria-label="Weather details">' +
        renderMetric("Humidity", formatMeasurement(cur.humidity, 0)) +
        renderMetric("Wind", windLine(cur.wind)) +
        renderMetric("Precipitation", precipLine(cur.precipitation)) +
        renderMetric("Cloud cover", formatMeasurement(cur.cloudCover, 0)) +
        renderMetric("Pressure", formatMeasurement(cur.pressure, 2)) +
        renderMetric("UV index", cur.uvIndex ? formatMeasurement(cur.uvIndex, 0) : "—") +
      "</dl>"
    );
  }

  function renderHourly(pkg) {
    var rows = (pkg && pkg.hourly) || [];
    if (!rows.length) {
      return '<p class="wds-weather-empty">Hourly forecast unavailable.</p>';
    }
    var items = rows.slice(0, 24).map(function (row) {
      var cond = row.conditions || {};
      return (
        '<li class="wds-weather-hourly__item">' +
          '<time class="wds-weather-hourly__time" datetime="' + escapeHtml(row.time || "") + '">' + escapeHtml(formatHour(row.time)) + "</time>" +
          '<span class="' + iconClass(cond.icon) + ' wds-weather-hourly__icon" aria-hidden="true"></span>' +
          '<span class="wds-weather-hourly__temp">' + escapeHtml(formatMeasurement(row.temperature, 0)) + "</span>" +
          '<span class="wds-weather-hourly__pop">' +
            (row.precipitation && row.precipitation.probability != null ? escapeHtml(row.precipitation.probability + "%") : "") +
          "</span>" +
        "</li>"
      );
    }).join("");
    return (
      '<section class="wds-weather-hourly" aria-label="Hourly forecast when live data is available">' +
        '<h4 class="wds-weather-section-title">Hourly</h4>' +
        '<ul class="wds-weather-hourly__strip">' + items + "</ul>" +
      "</section>"
    );
  }

  function renderDaily(pkg) {
    var rows = (pkg && pkg.daily) || [];
    if (!rows.length) {
      return '<p class="wds-weather-empty">Daily forecast unavailable.</p>';
    }
    var items = rows.map(function (row) {
      var cond = row.conditions || {};
      return (
        '<li class="wds-weather-daily__row">' +
          '<span class="wds-weather-daily__date">' + escapeHtml(formatDate(row.date)) + "</span>" +
          '<span class="' + iconClass(cond.icon) + ' wds-weather-daily__icon" aria-hidden="true"></span>' +
          '<span class="wds-weather-daily__summary">' + escapeHtml(cond.summary || "—") + "</span>" +
          '<span class="wds-weather-daily__temps">' +
            escapeHtml(formatMeasurement(row.temperatureHigh, 0)) + " / " + escapeHtml(formatMeasurement(row.temperatureLow, 0)) +
          "</span>" +
          '<span class="wds-weather-daily__sun">' +
            (row.sunrise ? "↑ " + escapeHtml(formatTime(row.sunrise)) : "") +
            (row.sunset ? " ↓ " + escapeHtml(formatTime(row.sunset)) : "") +
          "</span>" +
        "</li>"
      );
    }).join("");
    return (
      '<section class="wds-weather-daily" aria-label="Daily forecast when live data is available">' +
        '<h4 class="wds-weather-section-title">7-day</h4>' +
        '<ol class="wds-weather-daily__list">' + items + "</ol>" +
      "</section>"
    );
  }

  function renderAttribution(pkg) {
    var meta = (pkg && pkg.meta) || {};
    var RI = global.WDS && global.WDS.researchIntegrity;
    if (RI && RI.renderFootnote) {
      if (meta.isPlaceholder) {
        return (
          '<div class="wds-weather__integrity">' +
          RI.renderFootnote({ provenance: "placeholder", disclaimer: "Live forecast unavailable" }) +
          "</div>"
        );
      }
      if (meta.provider && meta.provider !== "placeholder") {
        return (
          '<div class="wds-weather__integrity">' +
          RI.renderFootnote({
            provenance: "live",
            source: { label: meta.provider },
            uncertainty: "Forecasts change — note time of reading"
          }, { showBadge: true, showSource: true }) +
          "</div>"
        );
      }
    }
    var parts = [];
    if (meta.isPlaceholder) parts.push("Preview data");
    else if (meta.attribution) parts.push(meta.attribution);
    if (meta.provider && meta.provider !== "placeholder") parts.push(meta.provider);
    if (!parts.length) return "";
    return '<p class="wds-weather__attribution">' + escapeHtml(parts.join(" · ")) + "</p>";
  }

  function renderDashboard(pkg) {
    return (
      '<div class="wds-weather wds-weather--dashboard">' +
        renderCurrent(pkg) +
        renderDashboardStats(pkg) +
        renderSun(pkg) +
        renderAttribution(pkg) +
      "</div>"
    );
  }

  function renderSunMoon(pkg) {
    return (
      '<div class="wds-weather wds-weather--sun-moon">' +
        renderSun(pkg) +
        '<p class="wds-weather-sun-moon__note">Moon phase data coming soon.</p>' +
        renderAttribution(pkg) +
      "</div>"
    );
  }

  function renderPanel(pkg) {
    return (
      '<div class="wds-weather wds-weather--panel">' +
        renderCurrent(pkg) +
        renderMetrics(pkg) +
        renderSun(pkg) +
        renderHourly(pkg) +
        renderDaily(pkg) +
        renderAttribution(pkg) +
      "</div>"
    );
  }

  function buildRequest(options) {
    options = options || {};
    var req = W.resolveRequest
      ? W.resolveRequest(options)
      : {
          lat: options.lat,
          lng: options.lng,
          units: options.units,
          timezone: options.timezone,
          hints: options.hints,
          intelligence: options.intelligence || options.regionalIntelligence || null,
          platform: options.platform || null,
          location: options.location || null,
          fallback: false
        };
    if (options.fallback != null) req.fallback = options.fallback;
    else if (req.fallback == null) req.fallback = false;
    return req;
  }

  function mount(el, renderer, options) {
    if (!el || !W) return Promise.resolve(null);
    options = options || {};
    var root = options.root || el.closest("#main") || document;
    var cardId = cardIdFromMount(el);
    var kind = el.getAttribute("data-wds-weather-mount") || "dashboard";
    var existing = resolvePackage(options);

    function finish(pkg) {
      if (isLivePackage(pkg)) {
        el.innerHTML = renderer(pkg);
        el.removeAttribute("aria-busy");
        if (cardId) {
          updateDashCardTag(root, cardId, "live");
          var sum = summaryForMount(kind, pkg);
          if (sum) updateWidgetSummary(root, cardId, sum);
        }
        return pkg;
      }

      var platform = resolvePlatform(options);
      if (kind === "dashboard" && platform && hasEditorialWeather(platform)) {
        el.innerHTML = renderEditorialWeather(platform);
        el.removeAttribute("aria-busy");
        if (cardId) updateDashCardTag(root, cardId, "editorial");
        return null;
      }
      if (kind === "sun-moon" && platform && hasEditorialDaylight(platform)) {
        el.innerHTML = renderEditorialSunMoon(platform);
        el.removeAttribute("aria-busy");
        if (cardId) updateDashCardTag(root, cardId, "editorial");
        return null;
      }
      if (kind === "sun-moon") {
        el.innerHTML = renderEducationalSunMoon();
        el.removeAttribute("aria-busy");
        if (cardId) updateDashCardTag(root, cardId, "editorial");
        return null;
      }

      el.innerHTML = renderError();
      el.removeAttribute("aria-busy");
      if (cardId) updateDashCardTag(root, cardId, "unavailable");
      return null;
    }

    if (existing) {
      return Promise.resolve(finish(existing));
    }

    el.setAttribute("aria-busy", "true");
    el.innerHTML = renderLoading(kind);
    if (cardId) updateDashCardTag(root, cardId, "loading");

    return W.getForecast(buildRequest(options)).then(finish).catch(function () {
      el.innerHTML = renderError();
      el.removeAttribute("aria-busy");
      if (cardId) updateDashCardTag(root, cardId, "unavailable");
      return null;
    });
  }

  function renderWindOnly(pkg) {
    var cur = (pkg && pkg.current) || {};
    return (
      '<dl class="wds-weather-metrics wds-weather-metrics--compact" aria-label="Wind">' +
        renderMetric("Wind", windLine(cur.wind)) +
        renderMetric("Gusts", cur.wind && cur.wind.gust ? formatMeasurement(cur.wind.gust) : "—") +
      "</dl>"
    );
  }

  function renderUvOnly(pkg) {
    var cur = (pkg && pkg.current) || {};
    var uv = cur.uvIndex ? formatMeasurement(cur.uvIndex, 0) : "—";
    return (
      '<dl class="wds-weather-metrics wds-weather-metrics--compact" aria-label="UV index">' +
        renderMetric("UV index", uv) +
        renderMetric("Exposure", uv !== "—" && Number(cur.uvIndex.value) >= 6 ? "High — cover up" : "Moderate") +
      "</dl>"
    );
  }

  function renderSunriseOnly(pkg) {
    var cur = (pkg && pkg.current) || {};
    return (
      '<p class="wdb-widget__value">' + escapeHtml(formatTime(cur.sunrise)) + "</p>" +
      '<p class="wdb-widget__value-note">Today\'s sunrise</p>'
    );
  }

  function renderSunsetOnly(pkg) {
    var cur = (pkg && pkg.current) || {};
    return (
      '<p class="wdb-widget__value">' + escapeHtml(formatTime(cur.sunset)) + "</p>" +
      '<p class="wdb-widget__value-note">Today\'s sunset</p>'
    );
  }

  function renderCloudCoverOnly(pkg) {
    var cur = (pkg && pkg.current) || {};
    return (
      '<p class="wdb-widget__value">' + escapeHtml(formatMeasurement(cur.cloudCover, 0)) + "</p>" +
      '<p class="wdb-widget__value-note">Cloud cover now</p>'
    );
  }

  function renderHourlyOnly(pkg) {
    return renderHourly(pkg);
  }

  function renderDailyOnly(pkg) {
    return renderDaily(pkg);
  }

  function renderForecast(pkg) {
    return renderDaily(pkg) + renderHourly(pkg);
  }

  function renderCurrentOnly(pkg) {
    return renderCurrent(pkg) + renderDashboardStats(pkg);
  }

  function mountForecast(el, options) {
    return mount(el, renderForecast, options);
  }

  function mountSunOnly(el, options) {
    return mount(el, renderSun, options);
  }

  function mountCurrent(el, options) {
    return mount(el, renderCurrentOnly, options);
  }

  function mountSunMoon(el, options) {
    return mount(el, renderSunMoon, options);
  }

  function mountDashboard(el, options) {
    return mount(el, renderDashboard, options);
  }

  function mountPanel(el, options) {
    return mount(el, renderPanel, options);
  }

  function mountHourly(el, options) {
    return mount(el, renderHourlyOnly, options);
  }

  function mountDaily(el, options) {
    return mount(el, renderDailyOnly, options);
  }

  function mountWind(el, options) {
    return mount(el, renderWindOnly, options);
  }

  function mountUv(el, options) {
    return mount(el, renderUvOnly, options);
  }

  function mountSunrise(el, options) {
    return mount(el, renderSunriseOnly, options);
  }

  function mountSunset(el, options) {
    return mount(el, renderSunsetOnly, options);
  }

  function mountCloudCover(el, options) {
    return mount(el, renderCloudCoverOnly, options);
  }

  function mountAll(root, options) {
    if (!root || !W) return Promise.resolve([]);
    options = options || {};
    var mounts = root.querySelectorAll("[data-wds-weather-mount]");
    var jobs = [];
    mounts.forEach(function (el) {
      var kind = el.getAttribute("data-wds-weather-mount") || "dashboard";
      if (kind === "panel") jobs.push(mountPanel(el, options));
      else if (kind === "sun-moon") jobs.push(mountSunMoon(el, options));
      else if (kind === "forecast") jobs.push(mountForecast(el, options));
      else if (kind === "hourly") jobs.push(mountHourly(el, options));
      else if (kind === "daily") jobs.push(mountDaily(el, options));
      else if (kind === "wind") jobs.push(mountWind(el, options));
      else if (kind === "uv") jobs.push(mountUv(el, options));
      else if (kind === "sunrise") jobs.push(mountSunrise(el, options));
      else if (kind === "sunset") jobs.push(mountSunset(el, options));
      else if (kind === "cloud-cover") jobs.push(mountCloudCover(el, options));
      else if (kind === "outdoor-weather") {
        var OW = global.WDS && global.WDS.outdoorWeatherUI;
        jobs.push(OW ? OW.mount(el, options) : mount(el, renderError, options));
      }
      else if (kind === "sun-moon-dashboard") {
        var SK = global.WDS && global.WDS.skyDashboardUI;
        jobs.push(SK ? SK.mountSunMoon(el, options) : mount(el, renderError, options));
      }
      else if (kind === "photography-dashboard") {
        var SKp = global.WDS && global.WDS.skyDashboardUI;
        jobs.push(SKp ? SKp.mountPhotography(el, options) : mount(el, renderError, options));
      }
      else if (kind === "wildlife-dashboard") {
        var WL = global.WDS && global.WDS.wildlifeDashboardUI;
        jobs.push(WL ? WL.mount(el, options) : mount(el, renderError, options));
      }
      else if (kind === "trail-dashboard") {
        var TR = global.WDS && global.WDS.trailDashboardUI;
        jobs.push(TR ? TR.mount(el, options) : mount(el, renderError, options));
      }
      else if (kind === "water-dashboard") {
        var WA = global.WDS && global.WDS.waterDashboardUI;
        jobs.push(WA ? WA.mount(el, options) : mount(el, renderError, options));
      }
      else if (kind === "sun") jobs.push(mountSunOnly(el, options));
      else if (kind === "current") jobs.push(mountCurrent(el, options));
      else jobs.push(mountDashboard(el, options));
    });
    return Promise.all(jobs);
  }

  global.WDS = global.WDS || {};
  global.WDS.weatherUI = {
    escapeHtml: escapeHtml,
    formatMeasurement: formatMeasurement,
    renderLoading: renderLoading,
    renderError: renderError,
    renderCurrent: renderCurrent,
    renderSun: renderSun,
    renderMetrics: renderMetrics,
    renderDashboardStats: renderDashboardStats,
    renderHourly: renderHourly,
    renderDaily: renderDaily,
    renderDashboard: renderDashboard,
    renderEditorialWeather: renderEditorialWeather,
    renderEditorialSunMoon: renderEditorialSunMoon,
    renderSunMoon: renderSunMoon,
    renderPanel: renderPanel,
    updateDashCardTag: updateDashCardTag,
    updateWidgetTag: updateWidgetTag,
    updateWidgetSummary: updateWidgetSummary,
    buildRequest: buildRequest,
    renderForecast: renderForecast,
    renderCurrentOnly: renderCurrentOnly,
    mountForecast: mountForecast,
    mountSunOnly: mountSunOnly,
    mountCurrent: mountCurrent,
    mount: mount,
    mountDashboard: mountDashboard,
    mountSunMoon: mountSunMoon,
    mountPanel: mountPanel,
    mountAll: mountAll
  };
})(window);
