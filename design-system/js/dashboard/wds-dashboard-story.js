/**
 * Outdoor story — concise evidence-based summary from live data.
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

  function num(val) {
    if (val == null) return null;
    if (typeof val === "number" && isFinite(val)) return val;
    if (typeof val === "object" && val.value != null) return num(val.value);
    return null;
  }

  function build(ctx) {
    ctx = ctx || {};
    var platform = ctx.platform || {};
    var wx = platform.weatherRef;
    var hasLive = !!(wx && wx.meta && !wx.meta.isPlaceholder);
    if (!hasLive) {
      return {
        status: "empty",
        tag: { label: "Educational", className: "wdb-widget__tag--editorial" },
        summary: "Outdoor story pending",
        body: "Set your location to generate an evidence-based outdoor summary from live weather and alerts.",
        evidence: []
      };
    }

    var cur = wx.current || {};
    var temp = num(cur.temperature);
    var feels = num(cur.feelsLike);
    var cond = (cur.conditions && cur.conditions.summary) || "Current conditions";
    var pop = num(cur.precipitation && cur.precipitation.probability);
    var evidence = [];

    if (temp != null) evidence.push("Air " + Math.round(temp) + "°" + (feels != null && Math.abs(feels - temp) >= 3 ? " (feels " + Math.round(feels) + "°)" : ""));
    if (cond) evidence.push(cond);
    if (pop != null && pop >= 20) evidence.push(pop + "% rain chance");

    var dl = platform.daylight;
    if (dl && dl.sunriseFormatted && dl.sunsetFormatted) {
      evidence.push("Sun " + dl.sunriseFormatted + "–" + dl.sunsetFormatted);
    }
    if (dl && dl.goldenHour) evidence.push("Golden hour: " + dl.goldenHour);

    var aqi = platform.airQuality;
    if (aqi && aqi.status === "live" && aqi.usAqi != null) {
      evidence.push("US AQI " + aqi.usAqi);
    }

    var alerts = platform.alerts;
    if (alerts && alerts.status === "live" && alerts.items && alerts.items.length) {
      evidence.push(alerts.items.length + " NWS alert" + (alerts.items.length > 1 ? "s" : "") + " active");
    }

    var OW = global.WDS && global.WDS.outdoorWeatherIntel;
    var intel = OW && OW.analyze ? OW.analyze(wx, platform) : null;
    var scores = OW && OW.scorecard ? OW.scorecard(wx, platform) : null;

    var sentences = [];
    if (intel && intel.recommendation) {
      sentences.push(intel.recommendation.headline + ". " + intel.recommendation.detail);
    } else {
      sentences.push("Conditions are loading from your coordinates.");
    }

    if (scores && scores.outdoor && scores.outdoor.why && scores.outdoor.why.length) {
      sentences.push(scores.outdoor.why[0]);
    }

    if (intel && intel.photography && intel.photography.level === "excellent") {
      sentences.push("Photography: " + intel.photography.summary + " — " + intel.photography.detail);
    }

    var updated = wx.meta && wx.meta.fetchedAt ? new Date(wx.meta.fetchedAt).toLocaleString() : null;

    return {
      status: "ready",
      tag: { label: "Estimated", className: "wdb-widget__tag--estimated" },
      summary: sentences[0].split(".")[0],
      body: sentences.join(" "),
      evidence: evidence,
      metaFooter: "Open-Meteo · NWS · " + (updated ? "Updated " + updated : "Live data")
    };
  }

  function generate(ctx) {
    var BP = global.WDS && global.WDS.briefingPackage;
    if (BP && BP.widgetStory) return BP.widgetStory(ctx);
    return build(ctx);
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardStory = { build: build, generate: generate };
})(window);
