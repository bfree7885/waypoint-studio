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
    }
    if (temp != null && temp >= 90) cautions.push("Heat");
    if (temp != null && temp <= 25) cautions.push("Cold");

    var lookFor = "";
    var species = (platform.species && platform.species.active) ||
      (platform.phenology && platform.phenology.watch && platform.phenology.watch.activeNow) || [];
    if (species[0] && species[0].name) {
      lookFor = "Watch for " + species[0].name;
      if (species[0].note) lookFor += " — " + species[0].note;
    } else if (platform.rainfall && platform.rainfall.recent && parseNum(platform.rainfall.recent.amount) > 0.3) {
      lookFor = "Recent rain — check mushrooms and creek crossings";
    }

    var stats = [];
    if (temp != null) stats.push({ label: "Now", value: Math.round(temp) + "°" });
    if (dl && dl.sunriseFormatted) stats.push({ label: "Sunrise", value: dl.sunriseFormatted });
    if (dl && dl.sunsetFormatted) stats.push({ label: "Sunset", value: dl.sunsetFormatted });
    if (uv != null) stats.push({ label: "UV", value: String(Math.round(uv)) });
    if (pop != null && pop >= 15) stats.push({ label: "Rain", value: pop + "%" });

    var OW = global.WDS && global.WDS.outdoorWeatherIntel;
    if (OW && OW.hikingComfort && hasLive) {
      var hike = OW.hikingComfort(wxRef);
      if (hike && hike.summary && verdict === "go") {
        verdictDetail = hike.summary + (hike.detail ? " — " + hike.detail : "");
      }
    }

    return {
      verdict: verdict,
      verdictLabel: verdictLabel,
      verdictDetail: verdictDetail,
      cautions: cautions,
      lookFor: lookFor,
      stats: stats,
      hasLive: hasLive
    };
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
      '<aside class="wdb-brief wdb-brief--' + escapeHtml(b.verdict) + '" aria-label="Today outdoors at a glance">' +
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
