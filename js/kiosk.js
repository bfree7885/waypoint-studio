/**
 * Waypoint Live Engine — personal synthwave kiosk
 */
(function () {
  "use strict";

  var REFRESH_MS = 5 * 60 * 1000;
  var STALE_MS = 3 * 60 * 60 * 1000;
  var timezone = browserTimezone();
  var nextUpdateIso = null;
  var refreshTimer = null;
  var refreshCountdown = REFRESH_MS;
  var lastLive = null;
  var lastHealth = null;

  function browserTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
      return "America/New_York";
    }
  }

  function normalizeApi() {
    return window.WDS && WDS.kioskNormalize ? WDS.kioskNormalize : null;
  }

  function getModules() {
    var normalized = window.__WAYPOINT_KIOSK_NORMALIZED__;
    if (normalized && normalized.modules) return normalized.modules;
    return window.__WAYPOINT_KIOSK_USER_MODULES__ || null;
  }

  function getBootState() {
    return window.__WAYPOINT_KIOSK_STATE__ || { phase: "BOOTING" };
  }

  function isBootDone() {
    var phase = getBootState().phase;
    return phase === "READY" || phase === "PARTIAL" || phase === "FAILED" ||
      window.__WAYPOINT_KIOSK_BOOT_DONE__ === true;
  }

  function isLocationUnavailable(userLoc) {
    return !userLoc || userLoc.unavailable || userLoc.source === "unavailable" ||
      userLoc.lat == null || userLoc.lng == null;
  }

  function resolveTimezone(userLoc, userWx, daylight) {
    if (userWx && userWx.timezone) return userWx.timezone;
    if (daylight && daylight.timezone) return daylight.timezone;
    if (userLoc && userLoc.timezone) return userLoc.timezone;
    return browserTimezone();
  }

  function resolveLocationLabel(userLoc) {
    if (!userLoc && !isBootDone()) return "Locating…";
    if (isLocationUnavailable(userLoc)) return "Location unavailable";
    if (userLoc.displayTitle) return userLoc.displayTitle;
    if (userLoc.placeLabel) return userLoc.placeLabel;
    if (userLoc.lat != null && userLoc.lng != null) {
      var LOC = window.WDS && window.WDS.location;
      if (LOC && LOC.formatCoords) return LOC.formatCoords(userLoc.lat, userLoc.lng);
      return userLoc.lat.toFixed(2) + ", " + userLoc.lng.toFixed(2);
    }
    return "Location unavailable";
  }

  function moduleStatusMessage(phase, userLoc, mods) {
    var N = normalizeApi();
    var wxReady = mods && mods.weather && N && N.moduleReady(mods.weather, "weather");
    if (wxReady) return null;
    if (phase === "BOOTING" || phase === "RESOLVING_LOCATION") return "Waiting for your location…";
    if (isLocationUnavailable(userLoc)) return "Location unavailable";
    if (phase === "LOADING_CONDITIONS") return "Refreshing your conditions…";
    if (phase === "PARTIAL") return "Some conditions unavailable";
    if (phase === "FAILED") return "Conditions unavailable";
    if (!isBootDone()) return "Waiting for your location…";
    return "Refreshing your conditions…";
  }

  function $(id) {
    return document.getElementById(id);
  }

  function esc(value) {
    if (value == null) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fetchJson(url) {
    var bust = (url.indexOf("?") >= 0 ? "&" : "?") + "_=" + Date.now();
    return fetch(url + bust, { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error(url + " HTTP " + res.status);
      return res.json();
    });
  }

  function formatClock(now, tz) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      timeZone: tz
    }).format(now);
  }

  function formatDate(now, tz) {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: tz
    }).format(now);
  }

  function formatStamp(iso, tz) {
    if (!iso) return "—";
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: tz
      }).format(new Date(iso));
    } catch (e) {
      return iso;
    }
  }

  function formatHour(iso, tz) {
    if (!iso) return "—";
    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        timeZone: tz
      }).format(new Date(iso));
    } catch (e) {
      return iso;
    }
  }

  function ageLabel(iso) {
    if (!iso) return "—";
    var ms = Date.now() - Date.parse(iso);
    if (!Number.isFinite(ms) || ms < 0) return "—";
    var mins = Math.round(ms / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + " min ago";
    var hours = Math.round(mins / 60);
    if (hours < 48) return hours + " h ago";
    return Math.round(hours / 24) + " d ago";
  }

  function countdownLabel(iso) {
    if (!iso) return "—";
    var ms = Date.parse(iso) - Date.now();
    if (!Number.isFinite(ms)) return "—";
    if (ms <= 0) return "due now";
    var mins = Math.ceil(ms / 60000);
    if (mins < 60) return mins + " min";
    var hours = Math.floor(mins / 60);
    var rem = mins % 60;
    return hours + "h " + rem + "m";
  }

  function badgeClass(status) {
    var key = String(status || "unknown").toLowerCase();
    if (key === "healthy" || key === "healthy-degraded" || key === "live") return "swk-badge--healthy";
    if (key === "warning" || key === "estimated" || key === "partial") return "swk-badge--warning";
    return "swk-badge--degraded";
  }

  function moduleClass(status) {
    return "swk-module swk-module--" + String(status || "unknown").toLowerCase();
  }

  function setText(id, text, extraClass) {
    var el = $(id);
    if (!el) return;
    el.textContent = text;
    if (extraClass != null) el.className = extraClass;
  }

  function setHtml(id, html) {
    var el = $(id);
    if (el) el.innerHTML = html;
  }

  function renderFacts(id, items) {
    setHtml(id, items.map(function (item) {
      return "<div><dt>" + esc(item.label) + "</dt><dd>" + esc(item.value) + "</dd></div>";
    }).join(""));
  }

  function moduleStatus(health, name) {
    return health.modules && health.modules[name] ? health.modules[name].status : "unknown";
  }

  function renderHourly(hourly) {
    var rows = (hourly && hourly.nextHours) || [];
    if (!rows.length) return "<p class=\"swk-detail\">Hourly forecast unavailable</p>";
    return rows.slice(0, 6).map(function (row) {
      return (
        "<div class=\"swk-hour\">" +
          "<p class=\"swk-hour__time\">" + esc(formatHour(row.time, timezone)) + "</p>" +
          "<p class=\"swk-hour__temp\">" + esc(row.temperatureF != null ? row.temperatureF + "°" : "—") + "</p>" +
          "<p class=\"swk-hour__cond\">" + esc(row.conditions || "") + "</p>" +
        "</div>"
      );
    }).join("");
  }

  function renderUnavailable(label) {
    return "<p class=\"swk-detail\">" + esc(label) + " unavailable</p>";
  }

  function renderSunMoon(sun, moon, daylight) {
    var lines = [];
    var dl = daylight || {};
    var sunrise = sun && (sun.sunriseFormatted || sun.sunrise) || dl.sunriseFormatted || dl.sunrise;
    var sunset = sun && (sun.sunsetFormatted || sun.sunset) || dl.sunsetFormatted || dl.sunset;
    if (sunrise) {
      lines.push("<p class=\"swk-line\">Sunrise " + esc(sun && sun.sunriseFormatted ? sun.sunriseFormatted : formatStamp(sunrise, timezone)) + "</p>");
    }
    if (sunset) {
      lines.push("<p class=\"swk-line\">Sunset " + esc(sun && sun.sunsetFormatted ? sun.sunsetFormatted : formatStamp(sunset, timezone)) + "</p>");
    }
    var phase = (moon && moon.phase) || dl.moonPhase;
    var illum = moon && moon.illumination != null ? moon.illumination : dl.moonIllumination;
    if (phase) {
      lines.push("<p class=\"swk-line\">" + esc(phase) + (illum != null ? " · " + illum + "% lit" : "") + "</p>");
    }
    return lines.length ? lines.join("") : renderUnavailable("Sun and moon data");
  }

  function renderAqi(aqi) {
    if (!aqi || aqi.status === "unavailable") {
      return renderUnavailable("Air quality");
    }
    var value = aqi.usAqi != null ? aqi.usAqi : aqi.aqi;
    return (
      "<p class=\"swk-metric swk-metric--cyan\">" + esc(value != null ? "AQI " + value : "—") + "</p>" +
      "<p class=\"swk-detail\">" + esc(aqi.category || "—") + (aqi.pm25 != null ? " · PM2.5 " + aqi.pm25 : "") + "</p>"
    );
  }

  function renderUv(userWx, health) {
    var value = userWx && userWx.current ? userWx.current.uvIndex : null;
    var status = moduleStatus(health || {}, "uv");
    if (value == null) return renderUnavailable("UV index");
    return (
      "<p class=\"swk-metric swk-metric--magenta\">UV " + esc(String(value)) + "</p>" +
      "<p class=\"swk-detail\">Status " + esc(status) + "</p>"
    );
  }

  function renderPhoto(photo) {
    if (!photo || photo.status === "unavailable") {
      return renderUnavailable("Photography outlook");
    }
    return (
      "<p class=\"swk-metric swk-metric--cyan\">" + esc(photo.score != null ? "Score " + photo.score : "—") + "</p>" +
      "<p class=\"swk-detail\">" + esc(photo.summary || "—") + "</p>" +
      (photo.cloudCover != null ? "<p class=\"swk-line\">Cloud cover " + esc(String(photo.cloudCover)) + "%</p>" : "") +
      (photo.source ? "<p class=\"swk-line\">Source " + esc(photo.source) + "</p>" : "")
    );
  }

  function renderPollen() {
    return renderUnavailable("Pollen");
  }

  function renderRiver(riverData) {
    if (!riverData || riverData.status === "unavailable") {
      return renderUnavailable("River gauge");
    }
    if (riverData.status === "no-nearby" || !riverData.nearest) {
      return "<p class=\"swk-detail\">No nearby monitored rivers</p>";
    }
    var nearest = riverData.nearest || {};
    var parts = [];
    if (nearest.stageFt != null) parts.push(nearest.stageFt + " ft stage");
    if (nearest.dischargeCfs != null) parts.push(nearest.dischargeCfs + " cfs");
    var detail = parts.length ? parts.join(" · ") : (riverData.summary || "River data unavailable");
    var site = nearest.siteName ? "<p class=\"swk-line\">" + esc(nearest.siteName) + "</p>" : "";
    return site + "<p class=\"swk-detail\">" + esc(detail) + "</p>";
  }

  function renderWildlife() {
    return "<p class=\"swk-detail\">Wildlife feed not connected on this kiosk yet.</p>";
  }

  function renderAlerts(alerts) {
    if (!alerts || alerts.status === "unavailable") return renderUnavailable("Alerts");
    var items = alerts.items || [];
    if (!items.length) {
      return "<p class=\"swk-detail\">No active weather alerts</p>";
    }
    return items.slice(0, 3).map(function (item) {
      return "<p class=\"swk-alert\">" + esc(item.event || item.headline || "Alert") + "</p>";
    }).join("");
  }

  function renderModules(health, blockStatus) {
    var mods = (health && health.modules) || {};
    var keys = Object.keys(mods);
    if (!keys.length && blockStatus) {
      keys = Object.keys(blockStatus);
      return keys.map(function (name) {
        return "<span class=\"" + moduleClass(blockStatus[name]) + "\">" + esc(name) + ": " + esc(blockStatus[name]) + "</span>";
      }).join("");
    }
    return keys.map(function (name) {
      var mod = mods[name];
      return "<span class=\"" + moduleClass(mod.status) + "\">" + esc(name) + ": " + esc(mod.status) + "</span>";
    }).join("");
  }

  function safeRender(fn, fallbackId, fallbackLabel) {
    try {
      return fn();
    } catch (err) {
      console.warn("[Waypoint kiosk] render failed:", fallbackLabel, err && err.message ? err.message : err);
      return renderUnavailable(fallbackLabel);
    }
  }

  function renderBrief(userLoc, mods, userWx, wxReady, statusMessage) {
    var list = $("swk-brief-list");
    var sub = $("swk-brief-sub");
    if (!list) return;

    var place = resolveLocationLabel(userLoc);
    if (sub) {
      sub.textContent = "What you should know before heading outside near " + place + ".";
    }

    var bullets = [];
    if (statusMessage && !wxReady) {
      bullets.push(statusMessage);
    }
    if (wxReady && userWx && userWx.current) {
      var cur = userWx.current;
      var cond = cur.conditions || "Current conditions";
      if (cur.temperatureF != null) {
        bullets.push(cond + " at " + cur.temperatureF + "°" + (cur.feelsLikeF != null ? " (feels like " + cur.feelsLikeF + "°)" : "") + ".");
      } else {
        bullets.push(cond + ".");
      }
      if (cur.uvIndex != null && cur.uvIndex >= 6) {
        bullets.push("UV is elevated (index " + cur.uvIndex + ") — plan sun protection.");
      }
      if (userWx.forecast && userWx.forecast.precipProbability != null && userWx.forecast.precipProbability >= 40) {
        bullets.push("Rain chance about " + userWx.forecast.precipProbability + "% — pack a shell.");
      }
    }
    var aqi = mods && mods.airQuality;
    if (aqi && aqi.usAqi != null && aqi.usAqi >= 100) {
      bullets.push("Air quality is elevated (AQI " + aqi.usAqi + "). Ease exertion outdoors.");
    }
    var alerts = mods && mods.alerts;
    if (alerts && alerts.items && alerts.items.length) {
      bullets.push("Active weather alert: " + (alerts.items[0].event || alerts.items[0].headline || "check alerts panel") + ".");
    }
    if (!bullets.length) {
      bullets.push("Shell is ready — live outdoor cues will fill this brief as providers respond.");
    }

    /* Prefer shared dashboard brief engine when loaded (same data model). */
    var Brief = window.WDS && window.WDS.dashboardV3Brief;
    if (Brief && Brief.build && Brief.render) {
      try {
        var built = Brief.build({
          model: {
            location: { label: place },
            weather: {
              live: wxReady,
              current: userWx && userWx.current
                ? {
                    temperature: userWx.current.temperatureF,
                    uv: userWx.current.uvIndex,
                    conditions: { summary: userWx.current.conditions }
                  }
                : null
            },
            air: aqi,
            alerts: alerts,
            provider: { trust: wxReady ? "live" : "partial" }
          }
        });
        if (built && built.bullets && built.bullets.length) {
          bullets = built.bullets.slice(0, 5);
        }
      } catch (err) { /* keep local bullets */ }
    }

    list.innerHTML = bullets.slice(0, 5).map(function (b) {
      return "<li>" + esc(b) + "</li>";
    }).join("");
  }

  function render(live, health) {
    live = live || lastLive || {};
    health = health || lastHealth || {};

    var userLoc = window.__WAYPOINT_KIOSK_LOC__;
    var mods = getModules() || {};
    var userWx = mods.weather || null;
    var daylight = mods.daylight || null;
    var boot = getBootState();
    var N = normalizeApi();
    var wxReady = !!(userWx && N && N.moduleReady(userWx, "weather"));
    var hourlyReady = !!(userWx && userWx.hourly && userWx.hourly.nextHours && userWx.hourly.nextHours.length);

    timezone = resolveTimezone(userLoc, userWx, daylight);

    var stale = !live.updatedAt || Date.now() - Date.parse(live.updatedAt) > STALE_MS;
    var overall = (health && health.overall && health.overall.status) || "unknown";
    var displayHealth = stale && !wxReady ? "stale" : (boot.phase === "PARTIAL" ? "partial" : overall);

    nextUpdateIso = (health && health.nextScheduledUpdate) ||
      (health && health.publish && health.publish.nextScheduledRun) ||
      live.nextScheduledUpdate ||
      null;

    $("swk-clock").textContent = formatClock(new Date(), timezone);
    $("swk-date").textContent = formatDate(new Date(), timezone);
    setText("swk-location", resolveLocationLabel(userLoc));

    var statusMessage = moduleStatusMessage(boot.phase, userLoc, mods);
    var updatedEl = $("swk-updated");
    var userUpdated = wxReady && userWx.current && userWx.current.observedAt;
    updatedEl.textContent = userUpdated
      ? formatStamp(userUpdated, timezone) + " · your location · " + ageLabel(userUpdated)
      : (statusMessage || "Conditions unavailable");
    updatedEl.className = "swk-topbar__value" + (stale && !wxReady ? " swk-topbar__value--stale" : "");

    var badge = $("swk-health-badge");
    badge.textContent = displayHealth;
    badge.className = "swk-badge " + badgeClass(displayHealth);

    var cur = wxReady && userWx.current ? userWx.current : {};
    var forecast = wxReady && userWx.forecast ? userWx.forecast : {};

    setText("swk-temp", wxReady && cur.temperatureF != null ? cur.temperatureF + "°" : "—");
    setText("swk-conditions", wxReady ? (cur.conditions || "Conditions unavailable") : (statusMessage || "Conditions unavailable"));

    renderFacts("swk-weather-facts", [
      { label: "Feels like", value: wxReady && cur.feelsLikeF != null ? cur.feelsLikeF + "°" : "—" },
      { label: "Humidity", value: wxReady && cur.humidity != null ? cur.humidity + "%" : "—" },
      { label: "Wind", value: wxReady && cur.windMph != null ? cur.windMph + " mph" : "—" },
      { label: "Gusts", value: wxReady && cur.windGustMph != null ? cur.windGustMph + " mph" : "—" },
      { label: "Cloud cover", value: wxReady && cur.cloudCover != null ? cur.cloudCover + "%" : "—" },
      { label: "Rain chance", value: forecast.precipProbability != null ? forecast.precipProbability + "%" : "—" }
    ]);

    setText("swk-today-range",
      forecast.highF != null && forecast.lowF != null
        ? "High " + forecast.highF + "° / Low " + forecast.lowF + "°"
        : (wxReady ? "Daily range unavailable" : "—"));
    setText("swk-today-summary", wxReady ? (forecast.summary || "Forecast unavailable") : "—");

    renderFacts("swk-now", [
      { label: "Temperature", value: wxReady && cur.temperatureF != null ? cur.temperatureF + "°" : "—" },
      { label: "UV", value: cur.uvIndex != null ? String(cur.uvIndex) : "—" },
      { label: "Observed", value: wxReady ? formatStamp(cur.observedAt, timezone) : "—" }
    ]);

    setText("swk-hourly-note", hourlyReady ? userWx.hourly.note : "Next hours");
    setHtml("swk-hourly", safeRender(function () {
      return hourlyReady ? renderHourly(userWx.hourly) : renderUnavailable("Hourly forecast");
    }, "swk-hourly", "Hourly forecast"));

    setHtml("swk-photo", safeRender(function () { return renderPhoto(mods.photography); }, "swk-photo", "Photography outlook"));
    setHtml("swk-sun-moon", safeRender(function () {
      return renderSunMoon(userWx && userWx.sun, userWx && userWx.moon, daylight);
    }, "swk-sun-moon", "Sun and moon data"));
    setHtml("swk-aqi", safeRender(function () { return renderAqi(mods.airQuality); }, "swk-aqi", "Air quality"));
    setHtml("swk-uv", safeRender(function () { return renderUv(wxReady ? userWx : null, health); }, "swk-uv", "UV index"));
    setHtml("swk-pollen", renderPollen());
    setHtml("swk-river", safeRender(function () { return renderRiver(mods.usgsWater); }, "swk-river", "River gauge"));
    setHtml("swk-wildlife", renderWildlife());
    setHtml("swk-alerts", safeRender(function () { return renderAlerts(mods.alerts); }, "swk-alerts", "Alerts"));

    renderBrief(userLoc, mods, userWx, wxReady, statusMessage);

    setText("swk-engine-version", live.engineVersion || health.engineVersion || "—");
    var blockStatus = window.__WAYPOINT_KIOSK_NORMALIZED__ && window.__WAYPOINT_KIOSK_NORMALIZED__.blockStatus;
    setHtml("swk-modules", renderModules(health, blockStatus));
    setText("swk-countdown", countdownLabel(nextUpdateIso));
    setText("swk-engine-health", (health.overall && health.overall.message) || overall);
    setText("swk-refresh", "Live · next in " + Math.max(1, Math.ceil(refreshCountdown / 60000)) + " min", "swk-statusbar__value swk-statusbar__value--ok");
  }

  function renderError(message) {
    setText("swk-conditions", message);
    setText("swk-temp", "—");
    var badge = $("swk-health-badge");
    badge.textContent = "offline";
    badge.className = "swk-badge swk-badge--degraded";
    setText("swk-engine-health", message, "swk-statusbar__value swk-statusbar__value--bad");
    setText("swk-refresh", "Data fetch failed", "swk-statusbar__value swk-statusbar__value--bad");
  }

  function pulseRefresh() {
    var root = $("swk");
    if (!root) return;
    root.classList.add("swk--refreshing");
    window.setTimeout(function () {
      root.classList.remove("swk--refreshing");
    }, 180);
  }

  function refreshEngineMeta() {
    setText("swk-refresh", "Refreshing…", "swk-statusbar__value swk-statusbar__value--warn");
    return Promise.all([
      fetchJson("data/live.json"),
      fetchJson("data/health.json").catch(function () { return {}; })
    ]).then(function (results) {
      lastLive = results[0];
      lastHealth = results[1] || {};
      render(lastLive, lastHealth);
      refreshCountdown = REFRESH_MS;
      pulseRefresh();
    }).catch(function (err) {
      render(lastLive || {}, lastHealth || {});
      renderError("Live data unavailable — " + (err && err.message ? err.message : "check server"));
    });
  }

  function onKioskUpdate() {
    render(lastLive || {}, lastHealth || {});
  }

  function tick() {
    $("swk-clock").textContent = formatClock(new Date(), timezone);
    setText("swk-countdown", countdownLabel(nextUpdateIso));
    if (refreshCountdown > 0) refreshCountdown -= 1000;
    var refreshEl = $("swk-refresh");
    if (refreshEl && refreshEl.textContent.indexOf("Refreshing") === -1 && refreshEl.textContent.indexOf("failed") === -1) {
      refreshEl.textContent = "Live · next in " + Math.max(1, Math.ceil(refreshCountdown / 60000)) + " min";
    }
  }

  refreshEngineMeta();
  document.addEventListener("waypoint:kiosk-location-ready", function () {
    onKioskUpdate();
    refreshEngineMeta();
  });
  refreshTimer = window.setInterval(refreshEngineMeta, REFRESH_MS);
  window.setInterval(tick, 1000);
})();
