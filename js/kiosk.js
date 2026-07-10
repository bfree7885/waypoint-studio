/**
 * Waypoint Live Engine — personal synthwave kiosk (render only).
 */
(function () {
  "use strict";

  var STALE_MS = 10 * 60 * 1000;
  var timezone = "America/New_York";
  var nextUpdateIso = null;
  var lastPayload = null;
  var tickTimer = null;

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
    if (key === "warning" || key === "estimated" || key === "stale") return "swk-badge--warning";
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
    return health && health.modules && health.modules[name] ? health.modules[name].status : "unknown";
  }

  function buildLiveView(payload) {
    var userMods = payload && payload.userModules;
    var userWx = userMods && userMods.weather;
    var engineCtx = payload && payload.engineContext;
    var health = engineCtx && engineCtx.health;
    var modules = {};

    if (health && health.modules) {
      Object.keys(health.modules).forEach(function (name) {
        modules[name] = { data: health.modules[name] };
      });
    }
    if (userMods && userMods.alerts) {
      modules.alerts = { data: userMods.alerts };
    }
    if (userMods && userMods.usgsWater) {
      var riverData = userMods.usgsWater.nearest
        ? { status: "live", nearest: userMods.usgsWater.nearest, summary: userMods.usgsWater.nearest.siteName }
        : { status: userMods.usgsWater.status || "unavailable", summary: "No nearby monitored rivers" };
      modules.river_gauges = { data: riverData };
    }

    return {
      timezone: (userWx && userWx.timezone) ||
        (engineCtx && engineCtx.engine && engineCtx.engine.timezone) ||
        timezone,
      current: (userWx && userWx.current) || {},
      forecast: (userWx && userWx.forecast) || {},
      hourly: (userWx && userWx.hourly) || { nextHours: [], note: "Next hours at your location" },
      sun: (userWx && userWx.sun) || null,
      moon: (userWx && userWx.moon) || null,
      airQuality: userMods && userMods.airQuality,
      engineVersion: engineCtx && engineCtx.engine && engineCtx.engine.version,
      modules: modules
    };
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
      "<p class=\"swk-metric swk-metric--cyan\">" + esc(aqi.usAqi != null ? "AQI " + aqi.usAqi : (aqi.aqi != null ? "AQI " + aqi.aqi : "—")) + "</p>" +
      "<p class=\"swk-detail\">" + esc(aqi.category || "—") + (aqi.pm25 != null ? " · PM2.5 " + aqi.pm25 : "") + "</p>"
    );
  }

  function renderUv(live, health) {
    var value = live.current && live.current.uvIndex;
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

  function renderPollen(live, health) {
    var pollen = live.modules && live.modules.pollen && live.modules.pollen.data;
    var status = moduleStatus(health, "pollen") || (pollen && pollen.status);
    if (!pollen || status === "unavailable" || pollen.status === "unavailable") {
      return renderUnavailable("Pollen");
    }
    return "<p class=\"swk-detail\">" + esc(pollen.summary || "Pollen data unavailable") + "</p>";
  }

  function renderRiver(live, health) {
    var river = live.modules && live.modules.river_gauges && live.modules.river_gauges.data;
    var status = moduleStatus(health, "river_gauges") || (river && river.status);
    if (!river || status === "unavailable" || river.status === "unavailable") {
      return renderUnavailable("River gauge");
    }
    var nearest = river.nearest || {};
    var parts = [];
    if (nearest.stageFt != null) parts.push(nearest.stageFt + " ft stage");
    if (nearest.dischargeCfs != null) parts.push(nearest.dischargeCfs + " cfs");
    var detail = parts.length ? parts.join(" · ") : (river.summary || "River data unavailable");
    var site = nearest.siteName ? "<p class=\"swk-line\">" + esc(nearest.siteName) + "</p>" : "";
    return site + "<p class=\"swk-detail\">" + esc(detail) + "</p>";
  }

  function renderWildlife() {
    return "<p class=\"swk-detail\">Wildlife feed not connected on this kiosk yet.</p>";
  }

  function renderAlerts(live, health) {
    var alerts = live.modules && live.modules.alerts && live.modules.alerts.data;
    var status = moduleStatus(health, "alerts") || (alerts && alerts.status);
    if (status === "unavailable") return renderUnavailable("Alerts");
    var items = (alerts && alerts.items) || [];
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

  function refreshIntervalMs() {
    var ref = window.__WAYPOINT_KIOSK_REFRESH__;
    return ref && ref.refreshIntervalMs ? ref.refreshIntervalMs : 5 * 60 * 1000;
  }

  function renderUpdatedLabel(payload) {
    var refresh = payload && payload.refresh;
    var conditionsUpdated = payload && payload.conditionsUpdatedAt;
    var inFlight = refresh && refresh.inFlight;
    var error = payload && payload.error;
    var ageMs = conditionsUpdated ? Date.now() - Date.parse(conditionsUpdated) : Infinity;
    var stale = !conditionsUpdated || ageMs > refreshIntervalMs() * 2;
    var updatedEl = $("swk-updated");

    if (inFlight && !conditionsUpdated) {
      updatedEl.textContent = "Updating…";
      updatedEl.className = "swk-topbar__value swk-topbar__value--warn";
      return;
    }
    if (inFlight) {
      updatedEl.textContent = "Updating… · last " + ageLabel(conditionsUpdated);
      updatedEl.className = "swk-topbar__value swk-topbar__value--warn";
      return;
    }
    if (!conditionsUpdated) {
      updatedEl.textContent = error ? "Refresh failed — retrying" : "Waiting for conditions…";
      updatedEl.className = "swk-topbar__value" + (error ? " swk-topbar__value--stale" : "");
      return;
    }
    if (error && stale) {
      updatedEl.textContent = "Refresh failed — retrying · conditions last updated " + ageLabel(conditionsUpdated);
      updatedEl.className = "swk-topbar__value swk-topbar__value--stale";
      return;
    }
    if (stale) {
      updatedEl.textContent = "Conditions last updated " + ageLabel(conditionsUpdated);
      updatedEl.className = "swk-topbar__value swk-topbar__value--stale";
      return;
    }
    updatedEl.textContent = formatStamp(conditionsUpdated, timezone) + " · your location · " + ageLabel(conditionsUpdated);
    updatedEl.className = "swk-topbar__value";
  }

  function render(payload) {
    lastPayload = payload || lastPayload;
    if (!lastPayload) return;

    var userLoc = lastPayload.location || window.__WAYPOINT_KIOSK_LOC__;
    var userMods = lastPayload.userModules || window.__WAYPOINT_KIOSK_USER_MODULES__;
    var engineCtx = lastPayload.engineContext || null;
    var health = engineCtx && engineCtx.health ? engineCtx.health : {};
    var live = buildLiveView(lastPayload);
    var cur = live.current || {};
    var forecast = live.forecast || {};
    var overall = (health.overall && health.overall.status) || "unknown";
    var conditionsUpdated = lastPayload.conditionsUpdatedAt;
    var stale = !conditionsUpdated || Date.now() - Date.parse(conditionsUpdated) > STALE_MS;
    var displayHealth = stale ? "stale" : overall;

    timezone = live.timezone || timezone;
    nextUpdateIso = (health && health.nextScheduledUpdate) ||
      (health && health.publish && health.publish.nextScheduledRun) ||
      (lastPayload.refresh && lastPayload.refresh.nextRefreshAt) ||
      null;

    $("swk-clock").textContent = formatClock(new Date(), timezone);
    $("swk-date").textContent = formatDate(new Date(), timezone);
    setText("swk-location", (userLoc && (userLoc.displayTitle || userLoc.placeLabel)) || "Outdoor location");
    renderUpdatedLabel(lastPayload);

    var badge = $("swk-health-badge");
    badge.textContent = displayHealth;
    badge.className = "swk-badge " + badgeClass(displayHealth);

    setText("swk-temp", cur.temperatureF != null ? cur.temperatureF + "°" : "—");
    setText("swk-conditions", cur.conditions || "Conditions unavailable");

    renderFacts("swk-weather-facts", [
      { label: "Feels like", value: cur.feelsLikeF != null ? cur.feelsLikeF + "°" : "—" },
      { label: "Humidity", value: cur.humidity != null ? cur.humidity + "%" : "—" },
      { label: "Wind", value: cur.windMph != null ? cur.windMph + " mph" : "—" },
      { label: "Gusts", value: cur.windGustMph != null ? cur.windGustMph + " mph" : "—" },
      { label: "Cloud cover", value: cur.cloudCover != null ? cur.cloudCover + "%" : "—" },
      { label: "Rain chance", value: forecast.precipProbability != null ? forecast.precipProbability + "%" : "—" }
    ]);

    setText("swk-today-range",
      forecast.highF != null && forecast.lowF != null
        ? "High " + forecast.highF + "° / Low " + forecast.lowF + "°"
        : "Daily range unavailable");
    setText("swk-today-summary", forecast.summary || "Forecast unavailable");

    renderFacts("swk-now", [
      { label: "Temperature", value: cur.temperatureF != null ? cur.temperatureF + "°" : "—" },
      { label: "UV", value: cur.uvIndex != null ? String(cur.uvIndex) : "—" },
      { label: "Observed", value: formatStamp(cur.observedAt, timezone) }
    ]);

    setText("swk-hourly-note", (live.hourly && live.hourly.note) || "Next hours");
    setHtml("swk-hourly", renderHourly(live.hourly));
    setHtml("swk-photo", renderPhoto(userMods && userMods.photography));
    setHtml("swk-sun-moon", renderSunMoon(live.sun, live.moon));
    setHtml("swk-aqi", renderAqi(live.airQuality, moduleStatus(health, "air_quality")));
    setHtml("swk-uv", renderUv(live, health));
    setHtml("swk-pollen", renderPollen(live, health));
    setHtml("swk-river", renderRiver(live, health));
    setHtml("swk-wildlife", renderWildlife());
    setHtml("swk-alerts", renderAlerts(live, health));

    setText("swk-engine-version", live.engineVersion || "—");
    setHtml("swk-modules", renderModules(health));
    setText("swk-countdown", countdownLabel(nextUpdateIso));

    var enginePublished = lastPayload.enginePublishedAt;
    var engineHealthText = (health.overall && health.overall.message) || overall;
    if (enginePublished) {
      engineHealthText += " · engine published " + ageLabel(enginePublished);
    }
    setText("swk-engine-health", engineHealthText);

    var refresh = lastPayload.refresh || window.__WAYPOINT_KIOSK_REFRESH__;
    var refreshLabel = "Live";
    if (refresh && refresh.inFlight) {
      refreshLabel = "Refreshing…";
    } else if (lastPayload.error) {
      refreshLabel = "Retrying";
    } else if (refresh && refresh.nextRefreshAt) {
      refreshLabel = "Live · next in " + countdownLabel(refresh.nextRefreshAt);
    }
    setText(
      "swk-refresh",
      refreshLabel,
      "swk-statusbar__value " + (lastPayload.error ? "swk-statusbar__value--warn" : "swk-statusbar__value--ok")
    );
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

  function onRefresh(ev) {
    var detail = ev && ev.detail;
    if (!detail) return;
    if (detail.error && !detail.userModules) {
      renderError(detail.error);
      return;
    }
    render(detail);
    pulseRefresh();
  }

  document.addEventListener("waypoint:kiosk-refresh", onRefresh);
  tickTimer = window.setInterval(function () {
    $("swk-clock").textContent = formatClock(new Date(), timezone);
    setText("swk-countdown", countdownLabel(nextUpdateIso));
    if (lastPayload) renderUpdatedLabel(lastPayload);
  }, 1000);
})();
