/**
 * Dashboard V3 — shared Waypoint’s Take interpretation component.
 * Deterministic rules now; shape is stable so future AI needs no UI changes.
 *
 * Output contract (stable):
 * {
 *   title: "Waypoint’s Take",
 *   bullets: string[],
 *   source: "rules" | "ai",
 *   generatedAt: ISO string,
 *   widgetId?: string,
 *   traces?: object[]
 * }
 */
(function (global) {
  "use strict";

  function api(name) {
    return global.WDS && global.WDS[name] ? global.WDS[name] : null;
  }

  function esc(s) {
    var M = api("dashboardV2Model");
    return M && M.escapeHtml ? M.escapeHtml(s) : String(s == null ? "" : s);
  }

  function num(v) {
    var M = api("dashboardV2Model");
    return M && M.num ? M.num(v) : typeof v === "number" && isFinite(v) ? v : null;
  }

  /**
   * Board-level take — wraps existing deterministic engine.
   */
  function forBoard(input) {
    var Take = api("dashboardV2Take");
    var generated =
      Take && Take.generateWaypointsTake
        ? Take.generateWaypointsTake(input || {})
        : { bullets: [], trustNote: null, generatedAt: new Date().toISOString() };
    return {
      title: generated.title || "Waypoint’s Take",
      bullets: (generated.bullets || []).slice(),
      source: "rules",
      generatedAt: generated.generatedAt || new Date().toISOString(),
      trustNote: generated.trustNote || null,
      traces: generated.traces || [],
      scope: "board"
    };
  }

  /**
   * Per-widget take — short local interpretation (1–3 bullets).
   * Future AI can replace interpretWidgetRules without changing render().
   */
  function forWidget(widgetId, model, opts) {
    opts = opts || {};
    var Cat = api("dashboardV2Widgets");
    var widget = opts.widget || (Cat && Cat.byId ? Cat.byId(widgetId) : null);
    var bullets = interpretWidgetRules(widgetId, model, widget);
    return {
      title: "Waypoint’s Take",
      bullets: bullets.slice(0, 3),
      source: opts.source || "rules",
      generatedAt: new Date().toISOString(),
      widgetId: widgetId,
      scope: "widget",
      traces: bullets.map(function (t, i) {
        return { rule: "widget-" + widgetId + "-" + i, text: t };
      })
    };
  }

  function interpretWidgetRules(widgetId, model, widget) {
    model = model || {};
    var bullets = [];
    var weather = model.weather || {};
    var c = weather.current || {};
    var air = model.air || {};
    var alerts = (model.alerts && model.alerts.items) || [];
    var rivers = model.rivers || {};
    var photo = model.photography || {};
    var moon = model.moon || {};
    var daylight = model.daylight || {};

    function push(t) {
      if (t && bullets.indexOf(t) < 0) bullets.push(t);
    }

    var cat = widget && widget.category ? widget.category : "";
    var id = widgetId || "";

    if (alerts.length && (cat === "emergency" || cat === "alerts" || id.indexOf("alert-") === 0 || id === "wx-severe")) {
      push("Active alert nearby — verify official guidance before outdoor plans.");
    }

    if (id === "wx-current" || id === "wx-hourly") {
      var t = num(c.tempF != null ? c.tempF : c.temperature);
      if (t != null) {
        if (t >= 85) push("Warm now — pace midday effort and carry water.");
        else if (t <= 40) push("Cold conditions — dress in layers for the trail.");
        else push("Temperatures look workable for outdoor time with normal layers.");
      } else if (!weather.live) {
        push("Waiting on live weather before refining this cue.");
      }
      var pop = num(c.precipChance != null ? c.precipChance : c.precipitation && c.precipitation.probability);
      if (pop != null && pop >= 50) push("Rain chance is elevated — pack a shell.");
    }

    if (id.indexOf("photo-") === 0 || cat === "photography") {
      if (photo.summary) push(String(photo.summary).slice(0, 140));
      else if (photo.level === "excellent") push("Light looks favorable for field photography.");
      else if (daylight.goldenHour) push("Golden hour window: " + daylight.goldenHour + ".");
      else push("Use cloud cover and golden hour cues before committing to a shoot.");
    }

    if (id.indexOf("hike-") === 0 || cat === "hiking") {
      push("Match pace to temperature, wind, and remaining daylight.");
      if (daylight.sunsetFormatted) push("Sunset around " + daylight.sunsetFormatted + " — plan return with buffer.");
    }

    if (id.indexOf("river-") === 0 || cat === "rivers") {
      if (rivers.live && rivers.sites && rivers.sites[0]) {
        var site = rivers.sites[0];
        push(
          "Nearest gauge (" +
            (site.name || "USGS") +
            ") is the best local stage/flow cue — treat flood language seriously."
        );
      } else {
        push("River context is incomplete here — check a nearby USGS gauge before water plans.");
      }
    }

    if (id.indexOf("air-") === 0 || cat === "air") {
      if (air.live && air.aqi != null) {
        if (air.aqi >= 101) push("Elevated AQI — shorten outdoor exertion if sensitive.");
        else push("Air quality looks manageable for typical outdoor activity.");
      } else {
        push("Air quality feed is incomplete — use caution if smoke or haze is visible.");
      }
    }

    if (id.indexOf("astro-") === 0 || cat === "astronomy") {
      if (moon.phase) push("Moon: " + moon.phase + (moon.illumination != null ? " (~" + Math.round(moon.illumination) + "% lit)" : "") + ".");
      if (daylight.sunriseFormatted && daylight.sunsetFormatted) {
        push("Daylight " + daylight.sunriseFormatted + "–" + daylight.sunsetFormatted + ".");
      }
      if (!bullets.length) push("Night-sky clarity depends on cloud cover and moon brightness.");
    }

    if (cat === "wildlife" || cat === "seasonal" || id.indexOf("season-") === 0) {
      push("Seasonal wildlife cues are interpretive — verify with local sightings when it matters.");
    }

    if (cat === "travel" || id.indexOf("travel-") === 0) {
      push("Trip readiness here is derived from forecast cues, not live road cameras.");
    }

    if (cat === "favorites" || id.indexOf("fav-") === 0) {
      push("Pinned essentials stay on this device until you change the layout.");
    }

    if (!bullets.length) {
      if (widget && widget.availability === "planned") {
        push("Planned widget — no live provider yet; catalogued for a future data layer.");
      } else {
        push("Use this widget as a glanceable cue alongside Today’s Outdoor Brief.");
      }
    }

    return bullets.slice(0, 3);
  }

  /**
   * Stable HTML for board or widget Take section.
   * AI swap later: same render(take) call.
   */
  function render(take, opts) {
    opts = opts || {};
    take = take || { bullets: [], title: "Waypoint’s Take", source: "rules" };
    var bullets = Array.isArray(take.bullets) ? take.bullets : [];
    var max = opts.max != null ? opts.max : take.scope === "widget" ? 3 : 8;
    var cls = opts.className || (take.scope === "widget" ? "wdb-v3-widget__take" : "wdb-v3-take wdb-v2-take");
    var idAttr = opts.id ? ' id="' + esc(opts.id) + '"' : "";
    var empty = opts.showEmpty !== false;

    if (!bullets.length && !empty) return "";
    if (!bullets.length) {
      return (
        '<div class="' +
        cls +
        '" data-wdb-v3-take data-take-source="' +
        esc(take.source || "rules") +
        '"' +
        idAttr +
        ">" +
        '<p class="wdb-v3-take__label wdb-v3-widget__take-label">' +
        esc(take.title || "Waypoint’s Take") +
        "</p>" +
        '<p class="wdb-v3-take__empty">Interpretation pending.</p></div>'
      );
    }

    return (
      '<div class="' +
      cls +
      '" data-wdb-v3-take data-take-source="' +
      esc(take.source || "rules") +
      '" data-take-scope="' +
      esc(take.scope || "board") +
      '"' +
      idAttr +
      ">" +
      '<p class="wdb-v3-take__label wdb-v3-widget__take-label">' +
      esc(take.title || "Waypoint’s Take") +
      "</p>" +
      "<ul class=\"wdb-v3-take__list\">" +
      bullets
        .slice(0, max)
        .map(function (b) {
          return "<li>" + esc(String(b)) + "</li>";
        })
        .join("") +
      "</ul></div>"
    );
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV3Take = {
    VERSION: "3.1.0",
    forBoard: forBoard,
    forWidget: forWidget,
    interpretWidgetRules: interpretWidgetRules,
    render: render
  };
})(window);
