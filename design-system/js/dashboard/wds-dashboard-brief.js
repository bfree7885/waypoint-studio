/**
 * Morning brief — top-of-dashboard decision strip (OIP-driven).
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

  function build(ctx) {
    ctx = ctx || {};
    var platform = ctx.platform || {};
    var wxRef = platform.weatherRef;
    var cur = wxRef && wxRef.current;
    var today = wxRef && wxRef.daily && wxRef.daily[0];
    var dl = platform.daylight;
    var hasLive = !!(wxRef && wxRef.meta && !wxRef.meta.isPlaceholder);
    var temp = cur && parseNum(cur.temperature);
    var pop = cur && parseNum(cur.precipitation && cur.precipitation.probability);
    if (pop == null && today && today.precipitation) pop = parseNum(today.precipitation.probability);
    var cond = ((cur && cur.conditions && cur.conditions.summary) || "").toLowerCase();
    var uv = cur && parseNum(cur.uvIndex);
    if (uv == null && today) uv = parseNum(today.uvIndex);

    var verdict = "go";
    var verdictLabel = "Good day to go outside";
    var verdictDetail = "Conditions look reasonable for most outdoor plans.";
    var cautions = [];

    var alertPkg = platform.alerts;
    if (alertPkg && alertPkg.status === "live" && alertPkg.items && alertPkg.items.length) {
      var NWS = global.WDS && global.WDS.nwsAlerts;
      var severe = NWS && NWS.filterByPattern
        ? NWS.filterByPattern(alertPkg, /warning|emergency|severe|flood|thunder|tornado|blizzard|heat/i)
        : alertPkg.items;
      if (severe.length) {
        verdict = "wait";
        verdictLabel = "NWS alert — " + (severe[0].event || "active warning");
        verdictDetail = severe[0].headline || "Check weather.gov for official instructions.";
        cautions.push("NWS alert");
      }
    }

    if (/thunder|lightning|storm/.test(cond) || (pop != null && pop >= 70)) {
      verdict = "wait";
      verdictLabel = "Use caution — storms likely";
      verdictDetail = "Consider postponing exposed hikes, paddling, and ridge travel.";
      cautions.push("Storm risk");
    } else if (pop != null && pop >= 45) {
      verdict = "caution";
      verdictLabel = "Rain in the forecast";
      verdictDetail = "Pack rain layers; trails may be slick.";
      cautions.push(pop + "% precip");
    }
    if (uv != null && uv >= 8) {
      verdict = verdict === "go" ? "caution" : verdict;
      cautions.push("High UV");
      if (verdict === "caution" && verdictDetail.indexOf("UV") < 0) {
        verdictDetail = verdictDetail + " High UV increases heat stress and harsh shadows — shoot early/late and hydrate on long hikes.";
      }
    }
    if (temp != null && temp >= 90) {
      cautions.push("Heat");
      if (verdict === "go") {
        verdict = "caution";
        verdictLabel = "Heat may reduce afternoon hiking comfort";
        verdictDetail = "Start early, carry extra water, and favor shade after mid-day.";
      }
    }
    if (temp != null && temp <= 25) cautions.push("Cold");

    var humidity = cur && parseNum(cur.humidity);
    if (humidity != null && humidity >= 85 && verdict === "go") {
      verdictDetail = "Morning fog is possible — humidity is high enough that valleys may hold mist until the sun mixes the air.";
    }

    var windSpeed = cur && cur.wind
      ? (typeof cur.wind.speed === "number" ? cur.wind.speed : parseNum(cur.wind.speed && cur.wind.speed.value != null ? cur.wind.speed.value : cur.wind.speed))
      : null;
    if (windSpeed != null && windSpeed >= 18 && verdict !== "wait") {
      if (verdict === "go") verdict = "caution";
      cautions.push("Wind");
      if (verdictDetail.indexOf("telephoto") < 0) {
        verdictDetail = (verdictDetail ? verdictDetail + " " : "") +
          "Long telephoto wildlife photography may be more difficult in this wind.";
      }
    }

    var lookFor = "";
    var isNational = platform.meta && platform.meta.contentMode === "national-educational";
    var UN = global.WDS && global.WDS.usNational;
    if (!isNational) {
      var species = (platform.species && platform.species.active) ||
        (platform.phenology && platform.phenology.watch && platform.phenology.watch.activeNow) || [];
      if (species[0] && species[0].name) {
        lookFor = "Watch for " + species[0].name;
        if (species[0].note) lookFor += " — " + species[0].note;
      } else if (platform.rainfall && platform.rainfall.recent && parseNum(platform.rainfall.recent.amount) > 0.3) {
        lookFor = "Recent rain — check mushrooms and creek crossings";
      }
    } else if (hasLive && UN && UN.weatherInterpretation) {
      lookFor = UN.weatherInterpretation(wxRef);
    } else if (hasLive) {
      lookFor = "Check hourly weather before exposed hikes or water crossings.";
    }

    var stats = [];
    if (temp != null) stats.push({ label: "Now", value: Math.round(temp) + "°" });
    if (dl && dl.sunriseFormatted) stats.push({ label: "Sunrise", value: dl.sunriseFormatted });
    if (dl && dl.sunsetFormatted) stats.push({ label: "Sunset", value: dl.sunsetFormatted });
    if (uv != null) stats.push({ label: "UV", value: String(Math.round(uv)) });
    if (pop != null && pop >= 15) stats.push({ label: "Rain", value: pop + "%" });

    var OW = global.WDS && global.WDS.outdoorWeatherIntel;
    var intel = OW && OW.analyze && hasLive ? OW.analyze(wxRef, platform) : null;
    if (OW && OW.hikingComfort && hasLive && !intel) {
      var hike = OW.hikingComfort(wxRef);
      if (hike && hike.summary && verdict === "go") {
        verdictDetail = hike.summary + (hike.detail ? " — " + hike.detail : "");
      }
    }
    if (intel && intel.recommendation && verdict === "go") {
      verdictLabel = intel.recommendation.headline;
      verdictDetail = intel.recommendation.detail;
      verdict = intel.recommendation.verdict || verdict;
    }

    var Briefing = global.WDS && global.WDS.dashboardBriefing;
    var tz = Briefing && Briefing.timezoneFrom ? Briefing.timezoneFrom(platform, ctx.location) : null;
    var dateLine = Briefing && Briefing.formatDateTime
      ? Briefing.formatDateTime(new Date(), tz).dateLine
      : new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

    return {
      verdict: verdict,
      verdictLabel: verdictLabel,
      verdictDetail: verdictDetail,
      cautions: cautions,
      lookFor: lookFor,
      stats: stats,
      hasLive: hasLive,
      intel: intel,
      dateLine: dateLine
    };
  }

  function renderScoreCard(sc) {
    if (!sc) return "";
    return (
      '<div class="wdb-brief__score-card">' +
        '<span class="wdb-brief__score-label">' + escapeHtml(sc.label) + "</span>" +
        '<span class="wdb-brief__score-value">' + escapeHtml(String(sc.value)) + "</span>" +
        '<span class="wdb-brief__score-trust">' + escapeHtml(sc.trust || "Estimated") + "</span>" +
        (sc.why && sc.why[0] ? '<span class="wdb-brief__score-why">' + escapeHtml(sc.why[0]) + "</span>" : "") +
      "</div>"
    );
  }

  function renderOutdoorPanel(label, data) {
    if (!data) return "";
    return (
      '<div class="wdb-brief__outdoor-card wdb-brief__outdoor-card--' + escapeHtml(data.level || "unknown") + '">' +
        '<span class="wdb-brief__outdoor-label">' + escapeHtml(label) + "</span>" +
        '<span class="wdb-brief__outdoor-summary">' + escapeHtml(data.summary || "—") + "</span>" +
        (data.detail ? '<span class="wdb-brief__outdoor-detail">' + escapeHtml(data.detail) + "</span>" : "") +
      "</div>"
    );
  }

  function render(ctx) {
    var b = build(ctx);
    var statsHtml = b.stats.map(function (s) {
      return (
        '<div class="wdb-brief__stat">' +
          '<span class="wdb-brief__stat-label">' + escapeHtml(s.label) + "</span>" +
          '<span class="wdb-brief__stat-value">' + escapeHtml(s.value) + "</span>" +
        "</div>"
      );
    }).join("");

    return (
      '<aside class="wdb-brief wdb-brief--' + escapeHtml(b.verdict) + '" aria-label="Outdoor summary for ' + escapeHtml(b.dateLine) + '">' +
        '<div class="wdb-brief__verdict">' +
          '<span class="wdb-brief__badge">' + escapeHtml(b.verdictLabel) + "</span>" +
          '<p class="wdb-brief__detail">' + escapeHtml(b.verdictDetail) + "</p>" +
        "</div>" +
        (statsHtml ? '<div class="wdb-brief__stats">' + statsHtml + "</div>" : "") +
        (b.lookFor ? '<p class="wdb-brief__look">' + escapeHtml(b.lookFor) + "</p>" : "") +
      "</aside>"
    );
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardBrief = { build: build, render: render };
})(window);
