/**
 * Waypoint Live Dashboard kiosk — reads data/live.json and data/health.json.
 */
(function () {
  "use strict";

  var REFRESH_MS = 5 * 60 * 1000;
  var STALE_MS = 3 * 60 * 60 * 1000;
  var timezone = "America/New_York";

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

  function num(value) {
    var n = Number(value);
    return Number.isFinite(n) ? n : null;
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

  function statusClass(status) {
    var key = String(status || "").toLowerCase();
    if (key === "healthy" || key === "live") return "kiosk__status--healthy";
    if (key === "warning") return "kiosk__status--warning";
    return "kiosk__status--degraded";
  }

  function renderFacts(items) {
    return items.map(function (item) {
      return (
        "<div><dt>" + esc(item.label) + "</dt><dd>" + esc(item.value) + "</dd></div>"
      );
    }).join("");
  }

  function renderHourly(hourly) {
    var rows = (hourly && hourly.nextHours) || [];
    if (!rows.length) return "<p class=\"kiosk__panel-detail\">Hourly forecast unavailable</p>";
    return rows.slice(0, 6).map(function (row) {
      return (
        "<div class=\"kiosk__hour\">" +
          "<p class=\"kiosk__hour-time\">" + esc(formatHour(row.time, timezone)) + "</p>" +
          "<p class=\"kiosk__hour-temp\">" + esc(row.temperatureF != null ? row.temperatureF + "°" : "—") + "</p>" +
          "<p class=\"kiosk__hour-cond\">" + esc(row.conditions || "") + "</p>" +
        "</div>"
      );
    }).join("");
  }

  function renderSunMoon(sun, moon) {
    var lines = [];
    if (sun) {
      lines.push("<p class=\"kiosk__metric-sub\">Sunrise " + esc(sun.sunriseFormatted || formatStamp(sun.sunrise, timezone)) + "</p>");
      lines.push("<p class=\"kiosk__metric-sub\">Sunset " + esc(sun.sunsetFormatted || formatStamp(sun.sunset, timezone)) + "</p>");
    }
    if (moon && moon.phase) {
      lines.push("<p class=\"kiosk__line\">" + esc(moon.phase) + (moon.illumination != null ? " · " + moon.illumination + "% lit" : "") + "</p>");
    }
    return lines.length ? lines.join("") : "<p class=\"kiosk__panel-detail\">Sun and moon data unavailable</p>";
  }

  function renderAqi(aqi) {
    if (!aqi || aqi.status === "unavailable") {
      return "<p class=\"kiosk__panel-detail\">Air quality unavailable</p>";
    }
    return (
      "<p class=\"kiosk__metric\">" + esc(aqi.usAqi != null ? "AQI " + aqi.usAqi : "—") + "</p>" +
      "<p class=\"kiosk__metric-sub\">" + esc(aqi.category || "—") + (aqi.pm25 != null ? " · PM2.5 " + aqi.pm25 : "") + "</p>"
    );
  }

  function renderUv(live, health) {
    var uv = (live.modules && live.modules.uv && live.modules.uv.data) || {};
    var currentUv = live.current && live.current.uvIndex;
    var value = uv.uvIndex != null ? uv.uvIndex : currentUv;
    var status = (health.modules && health.modules.uv && health.modules.uv.status) || uv.status || "—";
    if (value == null) return "<p class=\"kiosk__panel-detail\">UV index unavailable</p>";
    return (
      "<p class=\"kiosk__metric\">UV " + esc(String(value)) + "</p>" +
      "<p class=\"kiosk__metric-sub\">" + esc(String(status)) + "</p>"
    );
  }

  function renderPhoto(live) {
    var photo = (live.modules && live.modules.photography_conditions && live.modules.photography_conditions.data) || {};
    if (!photo || photo.status === "unavailable") {
      return "<p class=\"kiosk__panel-detail\">Photography outlook unavailable</p>";
    }
    return (
      "<p class=\"kiosk__metric\">" + esc(photo.score != null ? "Score " + photo.score : "—") + "</p>" +
      "<p class=\"kiosk__metric-sub\">" + esc(photo.summary || "—") + "</p>"
    );
  }

  function updateClock() {
    var now = new Date();
    $("kiosk-clock").textContent = formatClock(now, timezone);
    $("kiosk-date").textContent = formatDate(now, timezone);
  }

  function render(live, health) {
    timezone = live.timezone || timezone;
    var cur = live.current || {};
    var forecast = live.forecast || {};
    var stale = !live.updatedAt || Date.now() - Date.parse(live.updatedAt) > STALE_MS;
    var overall = (health && health.overall && health.overall.status) || "unknown";
    var publish = (health && health.publish) || {};

    $("kiosk-location").textContent = (live.location && live.location.label) || "Outdoor location";
    $("kiosk-temp").textContent = cur.temperatureF != null ? cur.temperatureF + "°" : "—";
    $("kiosk-conditions").textContent = cur.conditions || "Conditions unavailable";

    var updatedEl = $("kiosk-updated");
    updatedEl.textContent = "Last updated " + formatStamp(live.updatedAt, timezone) + " · Live Engine";
    updatedEl.className = "kiosk__updated" + (stale ? " kiosk__updated--stale" : "");

    var badge = $("kiosk-engine-badge");
    badge.textContent = "Engine " + overall;
    badge.className = "kiosk__status " + statusClass(stale ? "stale" : overall);

    $("kiosk-now").innerHTML = renderFacts([
      { label: "Feels like", value: cur.feelsLikeF != null ? cur.feelsLikeF + "°" : "—" },
      { label: "Humidity", value: cur.humidity != null ? cur.humidity + "%" : "—" },
      { label: "Wind", value: cur.windMph != null ? cur.windMph + " mph" : "—" },
      { label: "Cloud cover", value: cur.cloudCover != null ? cur.cloudCover + "%" : "—" },
      { label: "Rain chance", value: forecast.precipProbability != null ? forecast.precipProbability + "%" : "—" },
      { label: "Observed", value: formatStamp(cur.observedAt, timezone) }
    ]);

    $("kiosk-today-range").textContent =
      forecast.highF != null && forecast.lowF != null
        ? "High " + forecast.highF + "° / Low " + forecast.lowF + "°"
        : "Daily range unavailable";
    $("kiosk-today-summary").textContent = forecast.summary || "Forecast unavailable";
    $("kiosk-hourly-note").textContent = (live.hourly && live.hourly.note) || "Next hours";
    $("kiosk-hourly").innerHTML = renderHourly(live.hourly);
    $("kiosk-sun-moon").innerHTML = renderSunMoon(live.sun, live.moon);
    $("kiosk-aqi").innerHTML = renderAqi(live.airQuality);
    $("kiosk-uv").innerHTML = renderUv(live, health || {});
    $("kiosk-photo").innerHTML = renderPhoto(live);

    var footer = $("kiosk-footer");
    footer.textContent =
      "Engine health " + overall +
      " · Next run " + formatStamp(health.nextScheduledUpdate || publish.nextScheduledRun, timezone) +
      " · Data age " + ageLabel(live.updatedAt) +
      (publish.lastPublishAt ? " · Last publish " + formatStamp(publish.lastPublishAt, timezone) : "");
    footer.className = "kiosk__footer" + (stale ? " kiosk__footer--stale" : "");
  }

  function renderError(message) {
    $("kiosk-conditions").textContent = message;
    $("kiosk-temp").textContent = "—";
    var badge = $("kiosk-engine-badge");
    badge.textContent = "Engine offline";
    badge.className = "kiosk__status kiosk__status--degraded";
    $("kiosk-footer").textContent = message;
    $("kiosk-footer").className = "kiosk__footer kiosk__footer--stale";
  }

  function refresh() {
    return Promise.all([
      fetchJson("data/live.json"),
      fetchJson("data/health.json").catch(function () { return {}; })
    ]).then(function (results) {
      render(results[0], results[1] || {});
    }).catch(function (err) {
      renderError("Live data unavailable — " + (err && err.message ? err.message : "check server"));
    });
  }

  updateClock();
  setInterval(updateClock, 1000);
  refresh();
  setInterval(refresh, REFRESH_MS);
})();
