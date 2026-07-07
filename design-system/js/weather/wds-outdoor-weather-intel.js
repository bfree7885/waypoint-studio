/**
 * Outdoor Weather intelligence — derives field guidance from live weather only.
 * No fruiting predictions. No invented conditions.
 */
(function (global) {
  "use strict";

  function num(meas) {
    if (meas == null) return null;
    if (typeof meas === "number" && isFinite(meas)) return meas;
    if (typeof meas === "object" && meas.value != null) return num(meas.value);
    return null;
  }

  function rating(level, summary, detail) {
    return { level: level, summary: summary, detail: detail || "" };
  }

  function hikingComfort(pkg) {
    var cur = (pkg && pkg.current) || {};
    var today = (pkg && pkg.daily && pkg.daily[0]) || {};
    var temp = num(cur.temperature);
    var feels = num(cur.feelsLike) != null ? num(cur.feelsLike) : temp;
    var wind = cur.wind && num(cur.wind.speed);
    var pop = num(cur.precipitation && cur.precipitation.probability);
    if (pop == null && today.precipitation) pop = num(today.precipitation.probability);
    var cond = ((cur.conditions && cur.conditions.summary) || "").toLowerCase();

    if (temp == null) {
      return rating("unknown", "Awaiting live data", "Hiking comfort needs current temperature.");
    }

    var issues = [];
    if (/thunder|lightning|storm/.test(cond) || (pop != null && pop >= 70)) {
      issues.push("storms or heavy rain likely");
    } else if (pop != null && pop >= 45) {
      issues.push("rain in the forecast");
    }
    if (wind != null && wind >= 25) issues.push("strong wind on ridges");
    if (feels != null && feels >= 88) issues.push("heat stress risk");
    if (feels != null && feels <= 28) issues.push("cold exposure risk");
    if (/ice|freez|snow/.test(cond)) issues.push("icy or snowy surfaces possible");

    if (issues.length >= 2 || /thunder|lightning/.test(cond)) {
      return rating("poor", "Poor for long hikes", issues.join(" · ") + ". Consider a shorter route or wait.");
    }
    if (issues.length === 1) {
      return rating("fair", "Fair — plan accordingly", issues[0].charAt(0).toUpperCase() + issues[0].slice(1) + ".");
    }
    if (feels != null && feels >= 45 && feels <= 72 && (wind == null || wind < 18)) {
      return rating("excellent", "Excellent hiking weather", "Comfortable temperatures and manageable wind for most trails.");
    }
    if (feels != null && feels >= 38 && feels <= 80) {
      return rating("good", "Good hiking conditions", "Reasonable comfort for a full day outside with normal layers.");
    }
    return rating("fair", "Acceptable with layers", "Dress for " + Math.round(feels) + "° feels-like and check trail exposure.");
  }

  function photographyConditions(pkg, platform) {
    var cur = (pkg && pkg.current) || {};
    var cond = ((cur.conditions && cur.conditions.summary) || "").toLowerCase();
    var cloud = num(cur.cloudCover);
    var dl = platform && platform.daylight;

    if (/fog|mist/.test(cond)) {
      return rating("excellent", "Fog and mist", "Soft light in valleys — strong for forests, creeks, and macro work.");
    }
    if (cloud != null && cloud >= 40 && cloud <= 85) {
      return rating("excellent", "Diffuse light", "Cloud cover softens contrast — ideal for woodland and wildlife.");
    }
    if (/clear|mainly clear/.test(cond) && cloud != null && cloud < 25) {
      return rating("fair", "Hard light midday", "Clear sky — shoot early or late; harsh shadows at noon.");
    }
    if (dl && dl.goldenHour) {
      return rating("good", "Golden hour windows", dl.goldenHour);
    }
    if (cond) {
      return rating("good", cond.charAt(0).toUpperCase() + cond.slice(1), "Check hourly cloud trends before leaving.");
    }
    return rating("unknown", "Awaiting conditions", "Photography cues need live cloud and light data.");
  }

  function mushroomWeather(pkg) {
    var cur = (pkg && pkg.current) || {};
    var today = (pkg && pkg.daily && pkg.daily[0]) || {};
    var temp = num(cur.temperature);
    var humidity = num(cur.humidity);
    var pop = num(cur.precipitation && cur.precipitation.probability);
    var precipAmt = today.precipitation && num(today.precipitation.amount && today.precipitation.amount);
    var cond = ((cur.conditions && cur.conditions.summary) || "").toLowerCase();

    var cues = [];
    if (/rain|drizzle|shower/.test(cond)) cues.push("Rain today — soils are wetting");
    if (pop != null && pop >= 50) cues.push(pop + "% chance of rain");
    if (humidity != null && humidity >= 70) cues.push("High humidity (" + Math.round(humidity) + "%)");
    if (temp != null && temp >= 50 && temp <= 75) cues.push("Temperature in a typical fungal activity band");
    if (precipAmt != null && precipAmt > 0.05) cues.push("Measurable precipitation in the daily forecast");

    if (!cues.length && temp == null) {
      return rating("unknown", "Weather cues pending", "Mushroom-related weather context needs live humidity and rain data.");
    }
    if (!cues.length) {
      return rating("dry", "Dry weather pattern", "Little rain in the current forecast — forest floors may be drying. This describes weather only, not fruiting.");
    }
    return rating("moist", "Moisture in play", cues.join(" · ") + ". Weather context only — not a fruiting forecast.");
  }

  function outdoorRecommendation(pkg, hiking, photo, mushroom) {
    var cur = (pkg && pkg.current) || {};
    var cond = ((cur.conditions && cur.conditions.summary) || "").toLowerCase();
    var pop = num(cur.precipitation && cur.precipitation.probability);

    if (/thunder|lightning/.test(cond) || (pop != null && pop >= 75)) {
      return {
        verdict: "wait",
        headline: "Wait or choose low ground",
        detail: "Thunderstorm or heavy rain risk — postpone exposed ridges and water crossings."
      };
    }
    if (hiking.level === "poor") {
      return {
        verdict: "caution",
        headline: "Go with a backup plan",
        detail: hiking.detail
      };
    }
    if (hiking.level === "excellent" || hiking.level === "good") {
      return {
        verdict: "go",
        headline: "Good day to head outside",
        detail: "Conditions favor being outdoors — still confirm trails and water locally."
      };
    }
    if (hiking.level === "fair") {
      return {
        verdict: "caution",
        headline: "Go — but adjust expectations",
        detail: hiking.detail || "Carry layers and watch the hourly forecast."
      };
    }
    return {
      verdict: "caution",
      headline: "Check conditions before leaving",
      detail: "Live data is limited — verify weather at your trailhead."
    };
  }

  function walkingComfort(pkg) {
    var hike = hikingComfort(pkg);
    if (hike.level === "excellent") return rating("excellent", "Ideal for walking", "Comfortable air and low storm risk for neighborhood walks and parks.");
    if (hike.level === "good") return rating("good", "Good for walking", hike.detail || "Pleasant for errands on foot and short paths.");
    if (hike.level === "fair") return rating("fair", "Walkable with layers", hike.detail || "Dress for conditions and watch the hourly forecast.");
    if (hike.level === "poor") return rating("poor", "Limit outdoor walking", hike.detail || "Storms, heat, or cold may make long walks uncomfortable.");
    return rating("unknown", "Awaiting live data", "Walking comfort needs current weather.");
  }

  function wildlifeActivity(pkg, platform) {
    var cur = (pkg && pkg.current) || {};
    var temp = num(cur.temperature);
    var cond = ((cur.conditions && cur.conditions.summary) || "").toLowerCase();
    var month = new Date().getMonth() + 1;
    if (temp == null) {
      return rating("unknown", "Wildlife cues pending", "Temperature data needed for activity guidance.");
    }
    if (/thunder|storm/.test(cond)) {
      return rating("fair", "Wildlife may shelter", "Many animals reduce movement during storms — dawn windows may be quieter.");
    }
    if (temp >= 45 && temp <= 75 && month >= 3 && month <= 10) {
      return rating("good", "Active season for many species", "Mild temperatures favor diurnal wildlife — listen and scan edges at dawn and dusk.");
    }
    if (temp < 35) {
      return rating("fair", "Cold-season movement", "Look for tracks in snow or mud; activity concentrates near food and water.");
    }
    var sp = platform && platform.species && platform.species.active;
    if (sp && sp.length && sp[0].name) {
      return rating("good", "Watch for " + sp[0].name, sp[0].note || "Regional editorial species note — confirm locally.");
    }
    return rating("fair", "General field awareness", "Use eyes and ears — live species feeds not connected for this location.");
  }

  function analyze(pkg, platform) {
    if (!pkg || !pkg.meta || pkg.meta.isPlaceholder) return null;
    var hiking = hikingComfort(pkg);
    var walking = walkingComfort(pkg);
    var photo = photographyConditions(pkg, platform);
    var wildlife = wildlifeActivity(pkg, platform);
    var mushroom = mushroomWeather(pkg);
    var recommendation = outdoorRecommendation(pkg, hiking, photo, mushroom);
    return {
      hiking: hiking,
      walking: walking,
      photography: photo,
      wildlife: wildlife,
      mushroom: mushroom,
      recommendation: recommendation
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.outdoorWeatherIntel = {
    analyze: analyze,
    hikingComfort: hikingComfort,
    walkingComfort: walkingComfort,
    photographyConditions: photographyConditions,
    wildlifeActivity: wildlifeActivity,
    mushroomWeather: mushroomWeather,
    outdoorRecommendation: outdoorRecommendation
  };
})(window);
