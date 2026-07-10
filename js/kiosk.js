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

  function browserTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
      return "America/New_York";
    }
  }

  function isEnginePublishLive(live) {
    if (!live || !live.location) return false;
    var PG = window.WDS && window.WDS.platformGuard;
    if (PG && PG.isEnginePublishPoint) {
      return PG.isEnginePublishPoint(live.location.lat, live.location.lng);
    }
    var LOC = window.WDS && window.WDS.location;
    if (LOC && LOC.isEnginePublishPoint) {
      return LOC.isEnginePublishPoint(live.location.lat, live.location.lng);
    }
    return false;
  }

  function hasUserWeather(userMods) {
    return !!(userMods && userMods.weather && userMods.weather.userLocation);
  }

  function resolveTimezone(userLoc, userWx) {
    if (userWx && userWx.timezone) return userWx.timezone;
    if (userLoc && userLoc.timezone) return userLoc.timezone;
    return browserTimezone();
  }

  function resolveLocationLabel(userLoc) {
    if (!userLoc) return "Locating…";
    if (userLoc.unavailable || userLoc.source === "unavailable") return "Location unavailable";
    if (userLoc.displayTitle) return userLoc.displayTitle;
    if (userLoc.placeLabel) return userLoc.placeLabel;
    if (userLoc.lat != null && userLoc.lng != null) {
      var LOC = window.WDS && window.WDS.location;
      if (LOC && LOC.formatCoords) return LOC.formatCoords(userLoc.lat, userLoc.lng);
      return userLoc.lat.toFixed(2) + ", " + userLoc.lng.toFixed(2);
    }
    return "Location unavailable";
  }

  function logKioskDiagnostics(userLoc, userMods, live) {
    var diag = window.WDS && window.WDS.location && window.WDS.location.getDiagnostics
      ? window.WDS.location.getDiagnostics()
      : null;
    console.info("[Waypoint kiosk]", {
      locationSource: userLoc && userLoc.source,
      latitude: userLoc && userLoc.lat,
      longitude: userLoc && userLoc.lng,
      timezone: resolveTimezone(userLoc, userMods && userMods.weather),
      cacheUsed: diag && diag.cacheUsed,
      locationAttempts: diag && diag.attempts,
      userWeatherReady: hasUserWeather(userMods),
      enginePublishLiveJson: isEnginePublishLive(live),
      engineLocationIgnored: isEnginePublishLive(live)
    });
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
    if (key === "warning" || key === "estimated") return "swk-badge--warning";
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

  function moduleData(live, name) {
    return live.modules && live.modules[name] && live.modules[name].data
      ? live.modules[name].data
      : null;
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

  function renderSunMoon(sun, moon) {
    var lines = [];
    if (sun) {
      lines.push("<p class=\"swk-line\">Sunrise " + esc(sun.sunriseFormatted || formatStamp(sun.sunrise, timezone)) + "</p>");
      lines.push("<p class=\"swk-line\">Sunset " + esc(sun.sunsetFormatted || formatStamp(sun.sunset, timezone)) + "</p>");
    }
    if (moon && moon.phase) {
      lines.push("<p class=\"swk-line\">" + esc(moon.phase) + (moon.illumination != null ? " · " + moon.illumination + "% lit" : "") + "</p>");
    }
    return lines.length ? lines.join("") : renderUnavailable("Sun and moon data");
  }

  function renderAqi(aqi, status) {
    if (!aqi || aqi.status === "unavailable" || status === "unavailable") {
      return renderUnavailable("Air quality");
    }
    return (
      "<p class=\"swk-metric swk-metric--cyan\">" + esc(aqi.usAqi != null ? "AQI " + aqi.usAqi : "—") + "</p>" +
      "<p class=\"swk-detail\">" + esc(aqi.category || "—") + (aqi.pm25 != null ? " · PM2.5 " + aqi.pm25 : "") + "</p>"
    );
  }

  function renderUv(userWx, health) {
    var value = userWx && userWx.current ? userWx.current.uvIndex : null;
    var status = moduleStatus(health, "uv");
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

  function renderModules(health) {
    var mods = (health && health.modules) || {};
    return Object.keys(mods).map(function (name) {
      var mod = mods[name];
      return "<span class=\"" + moduleClass(mod.status) + "\">" + esc(name) + ": " + esc(mod.status) + "</span>";
    }).join("");
  }

  function render(live, health) {
    var userLoc = window.__WAYPOINT_KIOSK_LOC__;
    var userMods = window.__WAYPOINT_KIOSK_USER_MODULES__;
    var userWx = userMods && userMods.weather;
    var userReady = hasUserWeather(userMods);

    timezone = resolveTimezone(userLoc, userWx);
    logKioskDiagnostics(userLoc, userMods, live);

    var stale = !live.updatedAt || Date.now() - Date.parse(live.updatedAt) > STALE_MS;
    var overall = (health && health.overall && health.overall.status) || "unknown";
    var displayHealth = stale ? "stale" : overall;

    nextUpdateIso = (health && health.nextScheduledUpdate) ||
      (health && health.publish && health.publish.nextScheduledRun) ||
      live.nextScheduledUpdate ||
      null;

    $("swk-clock").textContent = formatClock(new Date(), timezone);
    $("swk-date").textContent = formatDate(new Date(), timezone);
    setText("swk-location", resolveLocationLabel(userLoc));

    var updatedEl = $("swk-updated");
    var userUpdated = userReady && userWx.current && userWx.current.observedAt;
    updatedEl.textContent = userUpdated
      ? formatStamp(userUpdated, timezone) + " · your location · " + ageLabel(userUpdated)
      : (userReady ? "Refreshing your conditions…" : "Waiting for your location…");
    updatedEl.className = "swk-topbar__value" + (stale && !userReady ? " swk-topbar__value--stale" : "");

    var badge = $("swk-health-badge");
    badge.textContent = displayHealth;
    badge.className = "swk-badge " + badgeClass(displayHealth);

    var cur = userReady ? (userWx.current || {}) : {};
    var forecast = userReady ? (userWx.forecast || {}) : {};

    setText("swk-temp", userReady && cur.temperatureF != null ? cur.temperatureF + "°" : "—");
    setText("swk-conditions", userReady ? (cur.conditions || "Conditions unavailable") : "Waiting for your location…");

    renderFacts("swk-weather-facts", [
      { label: "Feels like", value: userReady && cur.feelsLikeF != null ? cur.feelsLikeF + "°" : "—" },
      { label: "Humidity", value: userReady && cur.humidity != null ? cur.humidity + "%" : "—" },
      { label: "Wind", value: userReady && cur.windMph != null ? cur.windMph + " mph" : "—" },
      { label: "Gusts", value: userReady && cur.windGustMph != null ? cur.windGustMph + " mph" : "—" },
      { label: "Cloud cover", value: userReady && cur.cloudCover != null ? cur.cloudCover + "%" : "—" },
      { label: "Rain chance", value: userReady && forecast.precipProbability != null ? forecast.precipProbability + "%" : "—" }
    ]);

    setText("swk-today-range",
      userReady && forecast.highF != null && forecast.lowF != null
        ? "High " + forecast.highF + "° / Low " + forecast.lowF + "°"
        : "Daily range unavailable");
    setText("swk-today-summary", userReady ? (forecast.summary || "Forecast unavailable") : "—");

    renderFacts("swk-now", [
      { label: "Temperature", value: userReady && cur.temperatureF != null ? cur.temperatureF + "°" : "—" },
      { label: "UV", value: userReady && cur.uvIndex != null ? String(cur.uvIndex) : "—" },
      { label: "Observed", value: userReady ? formatStamp(cur.observedAt, timezone) : "—" }
    ]);

    setText("swk-hourly-note", userReady && userWx.hourly ? userWx.hourly.note : "Next hours");
    setHtml("swk-hourly", userReady ? renderHourly(userWx.hourly) : renderUnavailable("Hourly forecast"));
    setHtml("swk-photo", renderPhoto(userMods && userMods.photography));
    setHtml("swk-sun-moon", userReady
      ? renderSunMoon(userWx.sun, userWx.moon)
      : renderUnavailable("Sun and moon data"));
    setHtml("swk-aqi", renderAqi(userMods && userMods.airQuality, userReady ? "live" : "unavailable"));
    setHtml("swk-uv", renderUv(userWx, health || {}));
    setHtml("swk-pollen", renderPollen());
    setHtml("swk-river", renderRiver(userMods && userMods.usgsWater));
    setHtml("swk-wildlife", renderWildlife());
    setHtml("swk-alerts", renderAlerts(userMods && userMods.alerts));

    setText("swk-engine-version", live.engineVersion || health.engineVersion || "—");
    setHtml("swk-modules", renderModules(health));
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

  function refresh() {
    setText("swk-refresh", "Refreshing…", "swk-statusbar__value swk-statusbar__value--warn");
    return Promise.all([
      fetchJson("data/live.json"),
      fetchJson("data/health.json").catch(function () { return {}; })
    ]).then(function (results) {
      render(results[0], results[1] || {});
      refreshCountdown = REFRESH_MS;
      pulseRefresh();
    }).catch(function (err) {
      renderError("Live data unavailable — " + (err && err.message ? err.message : "check server"));
    });
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

  refresh();
  document.addEventListener("waypoint:kiosk-location-ready", function () {
    refresh();
  });
  refreshTimer = window.setInterval(refresh, REFRESH_MS);
  window.setInterval(tick, 1000);
})();
