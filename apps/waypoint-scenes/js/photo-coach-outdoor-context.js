/**
 * Outdoor context panel for Photo Coach — reads Dashboard ecosystem snapshot.
 */
(function (global) {
  "use strict";

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function loadContext() {
    try {
      var raw = sessionStorage.getItem("waypoint-outdoor-context-v1");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function render(ctx) {
    ctx = ctx || loadContext();
    if (!ctx) {
      return (
        '<div class="coach-outdoor-context coach-outdoor-context--empty">' +
          '<h3 class="coach-outdoor-context__title">Field conditions</h3>' +
          '<p class="muted">Open the <a href="../../">Waypoint Dashboard</a> with your location to attach live outdoor context to coached sessions.</p>' +
        "</div>"
      );
    }
    var loc = ctx.location || {};
    var locLine = [loc.city, loc.county, loc.state].filter(Boolean).join(", ") ||
      (loc.lat != null ? loc.lat.toFixed(2) + ", " + loc.lng.toFixed(2) : "Your area");

    var lines = [];
    if (ctx.weather && ctx.weather.temp != null) {
      lines.push(Math.round(ctx.weather.temp) + "° · " + (ctx.weather.conditions || "live weather"));
    }
    if (ctx.daylight && ctx.daylight.goldenHour) {
      lines.push("Golden hour: " + ctx.daylight.goldenHour);
    }
    if (ctx.photography && ctx.photography.summary) {
      lines.push("Photo: " + ctx.photography.summary);
    }
    if (ctx.water && ctx.water.siteName) {
      lines.push("Water: " + ctx.water.siteName +
        (ctx.water.stageFt != null ? " · " + ctx.water.stageFt + " ft" : ""));
    }
    if (ctx.alerts && ctx.alerts.count) {
      lines.push(ctx.alerts.count + " NWS alert(s) active");
    }

    var updated = ctx.savedAt ? new Date(ctx.savedAt).toLocaleString() : "—";

    return (
      '<div class="coach-outdoor-context">' +
        '<h3 class="coach-outdoor-context__title">Field conditions <span class="coach-trust coach-trust--live">From Dashboard</span></h3>' +
        '<p class="coach-outdoor-context__loc">' + escapeHtml(locLine) + "</p>" +
        (ctx.briefingHeadline
          ? '<p class="coach-outdoor-context__headline">' + escapeHtml(ctx.briefingHeadline) + "</p>"
          : "") +
        '<ul class="coach-outdoor-context__list">' +
          lines.map(function (l) { return "<li>" + escapeHtml(l) + "</li>"; }).join("") +
        "</ul>" +
        (ctx.challenge
          ? '<p class="coach-outdoor-context__challenge"><strong>Today\'s challenge:</strong> ' + escapeHtml(ctx.challenge) + "</p>"
          : "") +
        '<p class="coach-outdoor-context__meta">Snapshot · Updated ' + escapeHtml(updated) + "</p>" +
      "</div>"
    );
  }

  function attachToSession(session) {
    var ctx = loadContext();
    if (!session) return session;
    session.outdoorContext = ctx;
    return session;
  }

  global.WaypointPhotoCoachOutdoorContext = {
    load: loadContext,
    render: render,
    attachToSession: attachToSession
  };
})(window);
