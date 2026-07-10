/**
 * Photo Coach — today's photography conditions from live intelligence
 */
(function (global) {
  "use strict";

  var U = function () { return global.PhotoCoachUtil; };

  function weatherPkg(platform) {
    return platform && (platform.weatherRef || platform.weather);
  }

  function buildSkyIntel(platform) {
    var Intel = global.WDS && global.WDS.skyDashboardIntel;
    var pkg = weatherPkg(platform);
    if (!Intel || !Intel.analyze || !pkg) return null;
    return Intel.analyze(pkg, platform);
  }

  function photographyFromPlatform(platform) {
    var PC = global.WDS && global.WDS.photographyConditions;
    if (!PC || !PC.fromPlatform) return null;
    return PC.fromPlatform(platform);
  }

  function card(label, headline, detail, level, trust) {
    var util = U();
    return (
      '<article class="pc-card pc-card--accent">' +
        '<p class="pc-card__label">' + util.escapeHtml(label) + "</p>" +
        '<p class="pc-card__value ' + util.levelClass(level) + '">' + util.escapeHtml(headline) + "</p>" +
        (detail ? '<p class="pc-card__detail">' + util.escapeHtml(detail) + "</p>" : "") +
        (trust ? '<span class="pc-card__trust">' + util.escapeHtml(trust) + "</span>" : "") +
      "</article>"
    );
  }

  function render(ctx) {
    ctx = ctx || {};
    var platform = ctx.platform;
    var util = U();
    var wx = weatherPkg(platform);
    var dl = platform && platform.daylight;
    var cur = wx && wx.current;
    var sky = buildSkyIntel(platform);
    var photo = ctx.photography || photographyFromPlatform(platform);
    var placeholder = wx && wx.meta && wx.meta.isPlaceholder;

    if (!platform || !cur || placeholder) {
      return (
        '<div class="pc-unavailable">' +
          "Live weather is not available for your location yet. Set your region above, or check back when you have a connection. " +
          "Golden hour, fog, and cloud guidance require Open-Meteo data." +
        "</div>"
      );
    }

    var html = '<div class="pc-grid">';

    if (dl) {
      html += card("Golden hour", dl.goldenHour || "See daylight", dl.sunsetFormatted ? "Sunset " + dl.sunsetFormatted : "", "good", "Live · Open-Meteo");
      html += card("Blue hour", dl.blueHour || "Twilight window", "Cool ambient light after sunset or before sunrise", "good", "Live");
      html += card("Sun angle", dl.sunriseFormatted && dl.sunsetFormatted
        ? "Sunrise " + dl.sunriseFormatted
        : "Daylight data", dl.sunsetFormatted ? "Sunset " + dl.sunsetFormatted : "", "fair", "Live");
      if (dl.moonPhase) {
        html += card("Moon", dl.moonPhase, dl.moonIllumination != null
          ? Math.round(dl.moonIllumination) + "% illuminated"
          : "Moon phase affects night photography", "fair", "Live");
      }
    }

    if (sky) {
      html += card("Sunrise quality", sky.sunriseQuality.headline, sky.sunriseQuality.detail, sky.sunriseQuality.level, "Derived · OIP");
      html += card("Sunset quality", sky.sunsetQuality.headline, sky.sunsetQuality.detail, sky.sunsetQuality.level, "Derived · OIP");
      html += card("Fog probability", sky.fogPotential.headline, sky.fogPotential.detail, sky.fogPotential.level, "Derived · OIP");
      html += card("Cloud forecast", sky.cloudCover.headline, sky.cloudCover.detail, sky.cloudCover.level, "Derived · OIP");
      html += card("Night photography", sky.nightPhotography.headline, sky.nightPhotography.detail, sky.nightPhotography.level, "Derived · OIP");
      html += card("Milky Way", sky.milkyWay.headline, sky.milkyWay.detail, sky.milkyWay.level, "Not yet available");
    }

    if (cur) {
      var wind = cur.wind && util.num(cur.wind.speed);
      var windDir = cur.wind && cur.wind.direction;
      html += card("Wind", wind != null ? Math.round(wind) + " mph" : "—",
        windDir != null ? "From " + Math.round(windDir) + "°" : "Calm wind helps reflections and macro",
        wind != null && wind < 8 ? "good" : wind != null && wind < 18 ? "fair" : "poor", "Live");
      var humidity = util.num(cur.humidity);
      var aqi = platform.airQuality;
      html += card("Air clarity", cur.conditions && cur.conditions.summary ? cur.conditions.summary : "Current sky",
        (aqi && aqi.usAqi != null ? "AQI " + aqi.usAqi + (aqi.category ? " · " + aqi.category : "") : "") +
          (humidity != null ? (aqi && aqi.usAqi != null ? " · " : "") + "Humidity " + Math.round(humidity) + "%" : ""),
        aqi && aqi.usAqi >= 100 ? "fair" : "good", "Live");
    }

    if (photo && photo.summary) {
      var photoLevel = photo.score != null && photo.score >= 80 ? "excellent"
        : photo.score != null && photo.score >= 60 ? "good" : "fair";
      html += card("Light score", photo.score != null ? String(photo.score) + " / 100" : photo.summary,
        [
          photo.cloudCover != null ? "Cloud cover " + photo.cloudCover + "%" : null,
          photo.detail || photo.summary
        ].filter(Boolean).join(" · "),
        photoLevel, photo.trust || "Live · OIP");
    }

    html += "</div>";

    var month = util.monthName(new Date());
    var seasonal = global.PhotoCoachContent && global.PhotoCoachContent.getSeasonalForDate();
    if (seasonal && seasonal.length) {
      html += '<div class="pc-seasonal"><strong>' + util.escapeHtml(month) + " opportunities:</strong> ";
      html += util.escapeHtml(seasonal.slice(0, 4).map(function (s) { return s.title; }).join(" · "));
      html += "</div>";
    }

    return html;
  }

  global.PhotoCoachConditions = {
    render: render,
    photographyFromPlatform: photographyFromPlatform
  };
})(window);
