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

  function seasonFromDate(date) {
    if (!date || isNaN(date.getTime())) return null;
    var m = date.getMonth();
    if (m >= 2 && m <= 4) return "Spring";
    if (m >= 5 && m <= 7) return "Summer";
    if (m >= 8 && m <= 10) return "Fall";
    return "Winter";
  }

  function environmentImpact(ctx) {
    if (!ctx) return "";
    if (ctx.synthesis && ctx.synthesis.why) {
      return ctx.synthesis.happening + " " + ctx.synthesis.why;
    }
    if (ctx.version >= 2 && ctx.photography && ctx.photography.what) {
      return ctx.photography.what + (ctx.photography.why ? " " + ctx.photography.why : "");
    }
    var parts = [];
    if (ctx.weather && ctx.weather.conditions) {
      parts.push(ctx.weather.conditions + " conditions affect contrast and how much dehaze or clarity you need in post");
    }
    if (ctx.weather && ctx.weather.windMph != null && ctx.weather.windMph > 12) {
      parts.push("wind at " + Math.round(ctx.weather.windMph) + " mph can soften foliage and water — sharpness coaching may reflect motion");
    }
    if (ctx.daylight && ctx.daylight.goldenHour) {
      parts.push("golden-hour light explains warm shadows and long-form dimension in the frame");
    }
    if (ctx.daylight && ctx.daylight.blueHour) {
      parts.push("blue-hour cool bias rewards careful white balance before saturation");
    }
    if (ctx.airQuality && ctx.airQuality.usAqi != null && ctx.airQuality.usAqi > 80) {
      parts.push("elevated AQI can reduce distant clarity — atmospheric haze is environmental, not just exposure");
    }
    if (ctx.water && ctx.water.siteName) {
      parts.push("nearby water (" + ctx.water.siteName + ") often shapes reflections and local humidity");
    }
    return parts.length ? parts.join(". ") + "." : "Field context helps explain timing, light quality, and what to expect on your next visit.";
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
          '<p class="muted">Optional. Photo Coach works on its own. If you have recently opened the <a href="../../">outdoor dashboard</a> with your location, weather and light context can appear here to enrich coaching — it is never required.</p>' +
        "</div>"
      );
    }
    var loc = ctx.location || {};
    var locLine = [loc.city, loc.county, loc.state].filter(Boolean).join(", ") ||
      (loc.lat != null ? loc.lat.toFixed(2) + ", " + loc.lng.toFixed(2) : "Your area");

    var lines = [];
    var season = seasonFromDate(ctx.savedAt ? new Date(ctx.savedAt) : new Date());
    if (season) lines.push("Season: " + season);
    if (ctx.weather && ctx.weather.temp != null) {
      lines.push(Math.round(ctx.weather.temp) + "° · " + (ctx.weather.conditions || "live weather"));
    }
    if (ctx.airQuality && ctx.airQuality.usAqi != null) {
      lines.push("AQI " + ctx.airQuality.usAqi + (ctx.airQuality.category ? " (" + ctx.airQuality.category + ")" : ""));
    }
    if (ctx.daylight && ctx.daylight.blueHour) {
      lines.push("Blue hour: " + ctx.daylight.blueHour);
    }
    if (ctx.daylight && ctx.daylight.goldenHour) {
      lines.push("Golden hour: " + ctx.daylight.goldenHour);
    }
    if (ctx.daylight && ctx.daylight.moonPhase) {
      lines.push("Moon: " + ctx.daylight.moonPhase);
    }
    if (ctx.synthesis && ctx.synthesis.whatToPhotograph) {
      lines.push("Shoot: " + ctx.synthesis.whatToPhotograph);
    } else if (ctx.photography && ctx.photography.what) {
      lines.push("Photo: " + ctx.photography.what);
    } else if (ctx.photography && ctx.photography.summary) {
      lines.push("Photo: " + ctx.photography.summary);
    }
    if (ctx.safety && ctx.safety.what) {
      lines.push("Safety: " + ctx.safety.what);
    } else if (ctx.safety && ctx.safety.summary) {
      lines.push("Safety: " + ctx.safety.summary);
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
          ? '<p class="coach-outdoor-context__challenge"><strong>Today\'s mission:</strong> ' + escapeHtml(ctx.challenge) + "</p>"
          : "") +
        (ctx.critiquePrep
          ? '<p class="coach-outdoor-context__prep muted">Critique context: ' +
              escapeHtml([
                ctx.critiquePrep.weatherAware ? "weather-aware" : null,
                ctx.critiquePrep.seasonAware ? "season-aware" : null,
                ctx.critiquePrep.goldenHourAware ? "golden-hour" : null,
                ctx.critiquePrep.moonAware ? "moon-aware" : null,
                ctx.critiquePrep.waterAware ? "water-aware" : null
              ].filter(Boolean).join(" · ")) + "</p>"
          : "") +
        '<p class="coach-outdoor-context__impact"><strong>How the environment affects this photo:</strong> ' +
          escapeHtml(environmentImpact(ctx)) + "</p>" +
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
    attachToSession: attachToSession,
    seasonFromDate: seasonFromDate,
    environmentImpact: environmentImpact
  };
})(window);
