/**
 * Waypoint Live Engine — personal synthwave kiosk
 */
(function () {
  "use strict";

  var REFRESH_MS = 5 * 60 * 1000;
  var STALE_MS = 3 * 60 * 60 * 1000;
  var timezone = "America/New_York";
  var nextUpdateIso = null;
  var refreshTimer = null;
  var refreshCountdown = REFRESH_MS;

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

  function renderUv(live, health) {
    var uv = moduleData(live, "uv") || {};
    var value = uv.uvIndex != null ? uv.uvIndex : (live.current && live.current.uvIndex);
    var status = moduleStatus(health, "uv") || uv.status;
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
    var pollen = moduleData(live, "pollen") || {};
    var status = moduleStatus(health, "pollen") || pollen.status;
    if (!pollen || status === "unavailable" || pollen.status === "unavailable") {
      return renderUnavailable("Pollen");
    }
    return "<p class=\"swk-detail\">" + esc(pollen.summary || "Pollen data unavailable") + "</p>";
  }

  function renderRiver(live, health) {
    var river = moduleData(live, "river_gauges") || {};
    var status = moduleStatus(health, "river_gauges") || river.status;
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
    var alerts = moduleData(live, "alerts") || live.alerts || {};
    var status = moduleStatus(health, "alerts") || alerts.status;
    if (status === "unavailable") return renderUnavailable("Alerts");
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
    if (userWx && userWx.userLocation) {
      live = Object.assign({}, live, {
        timezone: userWx.timezone || live.timezone,
        current: Object.assign({}, live.current, userWx.current),
        forecast: Object.assign({}, live.forecast, userWx.forecast),
        hourly: userWx.hourly || live.hourly,
        sun: userWx.sun || live.sun
      });
    }
    if (userMods && userMods.airQuality) {
      live = Object.assign({}, live, { airQuality: userMods.airQuality });
    }
    if (userMods && userMods.alerts) {
      live = Object.assign({}, live, {
        modules: Object.assign({}, live.modules, {
          alerts: { data: userMods.alerts }
        })
      });
    }
    if (userMods && userMods.usgsWater) {
      var riverData = userMods.usgsWater.nearest
        ? { status: "live", nearest: userMods.usgsWater.nearest, summary: userMods.usgsWater.nearest.siteName }
        : { status: userMods.usgsWater.status || "unavailable", summary: "No nearby monitored rivers" };
      live = Object.assign({}, live, {
        modules: Object.assign({}, live.modules, {
          river_gauges: { data: riverData }
        })
      });
    }
    timezone = live.timezone || timezone;
    var cur = live.current || {};
    var forecast = live.forecast || {};
    var stale = !live.updatedAt || Date.now() - Date.parse(live.updatedAt) > STALE_MS;
    var overall = (health && health.overall && health.overall.status) || "unknown";
    var displayHealth = stale ? "stale" : overall;

    nextUpdateIso = (health && health.nextScheduledUpdate) ||
      (health && health.publish && health.publish.nextScheduledRun) ||
      live.nextScheduledUpdate ||
      null;

    $("swk-clock").textContent = formatClock(new Date(), timezone);
    $("swk-date").textContent = formatDate(new Date(), timezone);
    setText("swk-location", (userLoc && (userLoc.displayTitle || userLoc.placeLabel)) ||
      (live.location && live.location.label) || "Outdoor location");

    var updatedEl = $("swk-updated");
    var userUpdated = userWx && userWx.current && userWx.current.observedAt;
    updatedEl.textContent = (userUpdated ? formatStamp(userUpdated, timezone) + " · your location" : formatStamp(live.updatedAt, timezone)) +
      " · " + ageLabel(userUpdated || live.updatedAt);
    updatedEl.className = "swk-topbar__value" + (stale ? " swk-topbar__value--stale" : "");

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
    setHtml("swk-sun-moon", renderSunMoon(
      (userWx && userWx.sun) || live.sun,
      (userWx && userWx.moon) || live.moon
    ));
    setHtml("swk-aqi", renderAqi(live.airQuality, moduleStatus(health, "air_quality")));
    setHtml("swk-uv", renderUv(live, health || {}));
    setHtml("swk-pollen", renderPollen(live, health || {}));
    setHtml("swk-river", renderRiver(live, health || {}));
    setHtml("swk-wildlife", renderWildlife());
    setHtml("swk-alerts", renderAlerts(live, health || {}));

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
