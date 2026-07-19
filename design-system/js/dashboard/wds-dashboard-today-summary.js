/**
 * Today's Summary — interpretive outdoor intelligence (Product Recovery).
 * Summarizes conditions as plain-language bullets. Does not duplicate widget metrics.
 */
(function (global) {
  "use strict";

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseNum(val) {
    if (val == null) return null;
    if (typeof val === "number" && isFinite(val)) return val;
    if (typeof val === "object" && val.value != null) return parseNum(val.value);
    var n = parseFloat(String(val).replace(/[^\d.-]/g, ""));
    return isFinite(n) ? n : null;
  }

  function pushUnique(list, text, priority) {
    if (!text) return;
    var t = String(text).replace(/\s+/g, " ").trim();
    if (!t) return;
    var lc = t.toLowerCase();
    for (var i = 0; i < list.length; i++) {
      if (list[i].text.toLowerCase() === lc) return;
      // soft dedupe: same leading clause
      if (list[i].text.toLowerCase().slice(0, 28) === lc.slice(0, 28)) return;
    }
    list.push({ text: t, priority: priority == null ? 50 : priority });
  }

  /**
   * Build interpretive bullets from live OIP. Never invents readings.
   */
  function buildBullets(ctx) {
    ctx = ctx || {};
    var platform = ctx.platform || {};
    var bullets = [];
    var hasLive = !!(platform.weatherRef && platform.weatherRef.meta && !platform.weatherRef.meta.isPlaceholder);
    var pending = !platform.meta || !platform.meta.hydratedAt;

    if (pending && !hasLive) {
      return {
        ready: false,
        headline: "Reading outdoor conditions…",
        bullets: [{ text: "Weather, light, air, and water cues appear here as soon as live data arrives.", priority: 1 }],
        verdict: "loading"
      };
    }

    var wx = platform.weatherRef;
    var cur = wx && wx.current;
    var today = wx && wx.daily && wx.daily[0];
    var dl = platform.daylight;
    var OW = global.WDS && global.WDS.outdoorWeatherIntel;
    var hike = OW && OW.hikingComfort && hasLive ? OW.hikingComfort(wx) : null;
    var photo = OW && OW.photographyConditions && hasLive ? OW.photographyConditions(wx, platform) : null;

    if (hike && hike.summary) {
      pushUnique(bullets, hike.summary + (hike.detail && hike.level === "excellent" ? "" : ""), 10);
      if (hike.level === "excellent" || hike.level === "good") {
        // keep single hiking line — detail reserved for Weather tab
      } else if (hike.detail) {
        pushUnique(bullets, hike.detail, 12);
      }
    }

    if (dl && dl.goldenHour) {
      var gh = String(dl.goldenHour).trim();
      if (/^golden hour/i.test(gh)) {
        pushUnique(bullets, gh.replace(/\.*$/, "") + ".", 20);
      } else {
        pushUnique(bullets, "Golden hour: " + gh.replace(/\.*$/, "") + ".", 20);
      }
    } else if (dl && dl.sunsetFormatted) {
      pushUnique(bullets, "Sunset around " + dl.sunsetFormatted + " — plan last light accordingly.", 22);
    }

    var uv = cur && parseNum(cur.uvIndex);
    if (uv == null && today) uv = parseNum(today.uvIndex);
    if (uv != null && uv >= 6) {
      pushUnique(bullets, "UV becomes high after mid-morning (index near " + Math.round(uv) + ") — shade and sunscreen matter.", 25);
    } else if (uv != null && uv >= 3) {
      pushUnique(bullets, "Moderate UV today — sun protection still worthwhile on open ridges.", 26);
    } else if (uv != null) {
      pushUnique(bullets, "UV stays low today.", 27);
    }

    var aqi = platform.airQuality
      ? (platform.airQuality.usAqi != null ? platform.airQuality.usAqi : platform.airQuality.aqi)
      : null;
    var aqiCat = platform.airQuality && platform.airQuality.category;
    if (aqi != null) {
      if (aqi <= 50) pushUnique(bullets, "AQI excellent" + (aqiCat ? " (" + aqiCat + ")" : "") + ".", 30);
      else if (aqi <= 100) pushUnique(bullets, "AQI moderate — sensitive people may notice outdoor exertion.", 30);
      else pushUnique(bullets, "Elevated AQI (" + aqi + ") — consider shorter or lower-intensity outdoor plans.", 28);
    }

    var water = platform.water || platform.usgsWater;
    var stageNote = null;
    if (water && water.status === "live" && water.sites && water.sites[0]) {
      var site = water.sites[0];
      var stage = parseNum(site.gageHeight != null ? site.gageHeight : site.stage);
      var flow = parseNum(site.streamflow != null ? site.streamflow : site.discharge);
      if (site.interpretation) stageNote = site.interpretation;
      else if (stage != null) stageNote = "Nearby river gage around " + stage.toFixed(1) + " ft";
      else if (flow != null) stageNote = "Nearby streamflow reported";
    }
    if (stageNote) {
      var riverLine = stageNote;
      if (!/\.$/.test(riverLine)) riverLine += ".";
      if (!/river|gage|stream|water|flow|level/i.test(riverLine)) {
        riverLine = "River levels: " + riverLine;
      }
      pushUnique(bullets, riverLine, 35);
    }

    var alerts = platform.alerts;
    var alertItems = alerts && alerts.items ? alerts.items : [];
    if (alerts && alerts.status === "live" && alertItems.length) {
      var first = alertItems[0];
      pushUnique(bullets, "Active alert: " + (first.event || first.headline || "NWS advisory") + " — see Alerts tab.", 5);
    } else if (hasLive || (alerts && alerts.status === "live")) {
      pushUnique(bullets, "No active weather alerts.", 40);
    }

    if (dl && dl.sunriseFormatted) {
      pushUnique(bullets, "Wildlife activity often peaks around sunrise (" + dl.sunriseFormatted + ").", 45);
    }

    if (photo && photo.summary && photo.level === "excellent") {
      pushUnique(bullets, "Photography light looks strong: " + photo.summary + ".", 48);
    }

    var rain = cur && parseNum(cur.precipitation && cur.precipitation.probability);
    if (rain == null && today && today.precipitation) rain = parseNum(today.precipitation.probability);
    if (rain != null && rain >= 45) {
      pushUnique(bullets, rain + "% chance of precipitation — pack a shell if you head out.", 15);
    }

    // Species / phenology cue (one line max)
    var species = (platform.species && platform.species.active) ||
      (platform.phenology && platform.phenology.watch && platform.phenology.watch.activeNow) || [];
    if (species[0] && species[0].name) {
      pushUnique(bullets, "Seasonal watch: " + species[0].name +
        (species[0].note ? " — " + species[0].note : ".") , 55);
    }

    bullets.sort(function (a, b) { return a.priority - b.priority; });
    // Cap: summary should stay scannable
    if (bullets.length > 8) bullets = bullets.slice(0, 8);

    var Brief = global.WDS && global.WDS.dashboardBrief;
    var brief = Brief && Brief.build ? Brief.build(ctx) : null;
    var headline = (brief && brief.verdictLabel) || (hike && hike.summary) || "Outdoor conditions";
    var verdict = (brief && brief.verdict) || (hike && hike.level) || "go";

    return {
      ready: true,
      headline: headline,
      detail: brief && brief.verdictDetail ? brief.verdictDetail : "",
      bullets: bullets,
      verdict: verdict,
      dateLine: brief && brief.dateLine ? brief.dateLine : ""
    };
  }

  function render(ctx) {
    var s = buildBullets(ctx);
    // Page-level summary: verdict only — full bullets live on the Today tab (no duplicate lists).
    return (
      '<section class="wdb-today-summary wdb-today-summary--' + escapeHtml(s.verdict || "go") +
        '" aria-labelledby="wdb-today-summary-title" data-wdb-today-summary>' +
        '<header class="wdb-today-summary__head">' +
          '<p class="wdb-today-summary__eyebrow">Today\'s Summary</p>' +
          '<h2 class="wdb-today-summary__title" id="wdb-today-summary-title">' + escapeHtml(s.headline) + "</h2>" +
          (s.dateLine ? '<p class="wdb-today-summary__date">' + escapeHtml(s.dateLine) + "</p>" : "") +
          (s.detail
            ? '<p class="wdb-today-summary__lede">' + escapeHtml(s.detail) + "</p>"
            : (!s.ready
              ? '<p class="wdb-today-summary__lede">Live conditions will fill in momentarily.</p>'
              : "")) +
        "</header>" +
        '<p class="wdb-today-summary__cue">Open <strong>Today</strong> for the full briefing — other tabs hold the detail.</p>' +
      "</section>"
    );
  }

  /** Today tab body — interpretive bullets (detail lives in other tabs). */
  function renderTodayPanel(ctx) {
    var s = buildBullets(ctx);
    if (!s.ready) {
      return (
        '<div class="wdb-tab-panel-inner wdb-tab-panel-inner--today" data-wdb-today-panel>' +
          '<p class="wdb-today-summary__empty">Building today\'s interpretation…</p>' +
        "</div>"
      );
    }
    var items = (s.bullets || []).map(function (b) {
      return "<li>" + escapeHtml(b.text) + "</li>";
    }).join("");
    return (
      '<div class="wdb-tab-panel-inner wdb-tab-panel-inner--today" data-wdb-today-panel>' +
        '<p class="wdb-tab-panel__intro">What matters outside right now — interpretation, not a second copy of every gauge.</p>' +
        (items
          ? '<ul class="wdb-today-summary__list wdb-today-summary__list--panel">' + items + "</ul>"
          : '<p class="wdb-today-summary__empty">No interpretive cues yet for this location.</p>') +
      "</div>"
    );
  }

  global.WDS = global.WDS || {};
  global.WDS.todaySummary = {
    buildBullets: buildBullets,
    render: render,
    renderTodayPanel: renderTodayPanel
  };
})(window);
