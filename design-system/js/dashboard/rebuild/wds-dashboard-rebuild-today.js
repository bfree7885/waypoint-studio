/**
 * Dashboard Rebuild — Today Outside summary (Phase 3).
 * Compact panel; observational lines from live widget data — never coaching.
 * Authority: docs/rebuild-2026/03-dashboard-architecture.md
 */
(function (global) {
  "use strict";

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function placeLabel(ctx) {
    ctx = ctx || {};
    if (ctx.placeLabel) return String(ctx.placeLabel);
    if (ctx.displayTitle) return String(ctx.displayTitle);
    if (ctx.name) return String(ctx.name);
    return "Place not set";
  }

  function timeContext(now) {
    now = now || new Date();
    try {
      return now.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
    } catch (e) {
      return now.toISOString();
    }
  }

  function trustLabel(trust) {
    var t = String(trust || "waiting").toLowerCase();
    if (t === "live") return "Live";
    if (t === "cached") return "Cached";
    if (t === "partial") return "Partial";
    if (t === "offline") return "Offline";
    if (t === "estimated") return "Estimated";
    if (t === "unavailable") return "Unavailable";
    if (t === "pending" || t === "waiting") return "Waiting";
    return "Waiting";
  }

  function trustAttr(trust) {
    var t = String(trust || "waiting").toLowerCase();
    if (t === "pending") return "waiting";
    if (t === "unavailable") return "unavailable";
    return t || "waiting";
  }

  function defaultLines() {
    var Data = global.WDS && global.WDS.dashboardRebuildData;
    if (Data && Data.waitingTodayLines) return Data.waitingTodayLines();
    return [
      "Summary settling as place and weather arrive.",
      "Conditions will appear here.",
      "Light and air settle independently."
    ];
  }

  var BANNED_LINE =
    /you should|don't forget|do not forget|dont forget|great day for|perfect day for|do this|try |remember to|homework|assignment|go now|coaching|best activity/i;

  function resolveLines(ctx) {
    ctx = ctx || {};
    if (Array.isArray(ctx.lines) && ctx.lines.length) {
      return ctx.lines.slice(0, 8).filter(function (line) {
        return line && !BANNED_LINE.test(String(line));
      });
    }
    var Data = global.WDS && global.WDS.dashboardRebuildData;
    if (ctx.platform && Data && Data.composeTodayLines) {
      var composed = Data.composeTodayLines(ctx.platform);
      if (composed && composed.length) return composed;
    }
    return defaultLines();
  }

  function providerLine(ctx) {
    ctx = ctx || {};
    var platform = ctx.platform;
    if (!platform) return null;
    var bits = [];
    var wx = platform.weatherRef;
    if (wx && wx.meta && !wx.meta.isPlaceholder) {
      var prov = wx.meta.provider || wx.meta.source || null;
      if (prov) {
        var label = String(prov);
        if (/open-?meteo/i.test(label)) label = "Open-Meteo";
        else if (/nws|weather\.gov/i.test(label)) label = "NWS";
        bits.push(label);
      }
    }
    if (platform.alerts && platform.alerts.items && platform.alerts.items.length) {
      bits.push("NWS alerts");
    }
    if (platform.airQuality && platform.airQuality.status === "live") {
      bits.push("air quality");
    }
    if (!bits.length) return null;
    return "Based on " + bits.join(" · ");
  }

  function seasonLine(ctx) {
    ctx = ctx || {};
    var platform = ctx.platform;
    if (!platform) return null;
    var Season = global.WDS && global.WDS.dashboardSeason;
    var loc = ctx.location || {};
    var now = ctx.now || null;
    var opts = {
      now: now,
      lat: loc.lat != null ? loc.lat : loc.latitude,
      timeZone: loc.timezone || platform.timezone || (platform.daylight && platform.daylight.timezone) || null
    };
    if (Season && typeof Season.displayLine === "function") {
      var resolved = Season.displayLine(platform, opts);
      if (!resolved || !resolved.text) return null;
      return resolved.text;
    }
    if (Season && typeof Season.containsImpossibleSeasonCopy === "function") {
      var blob =
        String((platform.calendar && platform.calendar.season) || "") +
        " " +
        String((platform.phenology && platform.phenology.stage) || "");
      if (Season.containsImpossibleSeasonCopy(blob, opts)) return null;
    }
    return null;
  }

  function render(ctx) {
    ctx = ctx || {};
    var place = placeLabel(ctx);
    var when = timeContext(ctx.now);
    var trust = trustAttr(ctx.trust || "waiting");
    var lines = resolveLines(ctx);
    var source = providerLine(ctx);
    var season = seasonLine(ctx);
    return (
      '<section class="wdb-r-today" data-wdb-r-today aria-labelledby="wdb-r-today-title">' +
      '<header class="wdb-r-today__header">' +
      "<div>" +
      '<p class="wdb-r-today__kicker">Outside today</p>' +
      '<h2 id="wdb-r-today-title" class="wdb-r-today__title">What the day looks like</h2>' +
      "</div>" +
      '<p class="wdb-r-today__meta">' +
      '<span class="wdb-r-today__place">' +
      escapeHtml(place) +
      "</span>" +
      '<span class="wdb-r-today__sep" aria-hidden="true"> · </span>' +
      '<span class="wdb-r-today__time">' +
      escapeHtml(when) +
      "</span>" +
      '<span class="wdb-r-today__sep" aria-hidden="true"> · </span>' +
      '<span class="wds-trust-chip" data-trust="' +
      escapeHtml(trust) +
      '">' +
      escapeHtml(trustLabel(trust)) +
      "</span>" +
      "</p>" +
      (source
        ? '<p class="wdb-r-today__source">' + escapeHtml(source) + "</p>"
        : "") +
      (season
        ? '<p class="wdb-r-today__season" data-wdb-r-today-season>' + escapeHtml(season) + "</p>"
        : "") +
      "</header>" +
      '<div class="wdb-r-today__body" data-wdb-r-today-body>' +
      '<ul class="wdb-r-today__lines">' +
      lines
        .map(function (line) {
          return "<li>" + escapeHtml(line) + "</li>";
        })
        .join("") +
      "</ul>" +
      "</div>" +
      '<div class="wdb-r-today__alerts" data-wdb-r-today-alerts hidden></div>' +
      "</section>"
    );
  }

  function mount(host, ctx) {
    if (!host) return null;
    host.innerHTML = render(ctx);
    return host.querySelector("[data-wdb-r-today]");
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildToday = {
    version: "3.1.0-discover",
    render: render,
    mount: mount,
    placeLabel: placeLabel,
    timeContext: timeContext,
    resolveLines: resolveLines,
    providerLine: providerLine,
    seasonLine: seasonLine
  };
})(typeof window !== "undefined" ? window : global);
