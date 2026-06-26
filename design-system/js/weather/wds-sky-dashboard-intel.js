/**
 * Sky dashboard intelligence — photography conditions from live weather + daylight.
 */
(function (global) {
  "use strict";

  function num(meas) {
    if (meas == null) return null;
    if (typeof meas === "number" && isFinite(meas)) return meas;
    if (typeof meas === "object" && meas.value != null) return num(meas.value);
    return null;
  }

  function verdict(level, headline, detail) {
    return { level: level, headline: headline, detail: detail || "" };
  }

  function analyze(pkg, platform) {
    if (!pkg || !pkg.meta || pkg.meta.isPlaceholder) return null;
    var cur = pkg.current || {};
    var cond = ((cur.conditions && cur.conditions.summary) || "").toLowerCase();
    var cloud = num(cur.cloudCover);
    var dl = platform && platform.daylight;

    var sunriseQuality;
    if (/fog|mist/.test(cond)) {
      sunriseQuality = verdict("excellent", "Soft dawn light", "Fog or mist — ideal for valleys and forest scenes.");
    } else if (cloud != null && cloud >= 35 && cloud <= 80) {
      sunriseQuality = verdict("excellent", "Diffuse sunrise", "Broken clouds catch color without harsh contrast.");
    } else if (/clear|mainly clear/.test(cond)) {
      sunriseQuality = verdict("good", "Clear horizon", "Arrive early — color may be brief on a clear sky.");
    } else if (/rain|storm|overcast/.test(cond)) {
      sunriseQuality = verdict("poor", "Limited color", "Heavy cloud or rain — low sunrise drama expected.");
    } else {
      sunriseQuality = verdict("fair", "Mixed potential", cond || "Check hourly cloud cover before leaving.");
    }

    var sunsetQuality;
    if (cloud != null && cloud >= 40 && cloud <= 75) {
      sunsetQuality = verdict("excellent", "Cloud deck sunset", "Mid-level clouds often glow after the sun drops.");
    } else if (/clear|mainly clear/.test(cond)) {
      sunsetQuality = verdict("good", "Clear evening", "Hard rim light on ridges — shoot into the sun for silhouettes.");
    } else if (/fog|mist|overcast|rain/.test(cond)) {
      sunsetQuality = verdict("fair", "Muted sunset", "Atmosphere may flatten color — look for local breaks.");
    } else {
      sunsetQuality = verdict("fair", "Variable", "Watch western horizon in the hourly forecast.");
    }

    var fogPotential;
    if (/fog|mist/.test(cond)) {
      fogPotential = verdict("high", "Fog likely now", "Valleys and water edges — best at dawn before it lifts.");
    } else if (cloud != null && cloud > 70 && num(cur.humidity) >= 75) {
      fogPotential = verdict("moderate", "Fog possible at dawn", "High humidity and cloud cover — check low areas at sunrise.");
    } else if (num(cur.humidity) >= 85 && (num(cur.temperature) == null || num(cur.temperature) <= 55)) {
      fogPotential = verdict("moderate", "Radiation fog risk", "Cool, humid overnight setup — valleys first.");
    } else {
      fogPotential = verdict("low", "Fog unlikely", "Current humidity and cloud cover don't favor valley fog.");
    }

    var cloudCover = verdict(
      cloud != null ? (cloud < 30 ? "clear" : cloud < 60 ? "mixed" : "overcast") : "unknown",
      cloud != null ? Math.round(cloud) + "% now" : "—",
      cond ? cond.charAt(0).toUpperCase() + cond.slice(1) : ""
    );

    var nightPhoto;
    var moonIllum = dl && dl.moonIllumination;
    if (moonIllum != null && moonIllum <= 15 && cloud != null && cloud < 40) {
      nightPhoto = verdict("excellent", "Dark sky friendly", "Low moonlight and manageable clouds for stars.");
    } else if (moonIllum != null && moonIllum <= 35) {
      nightPhoto = verdict("good", "Usable night window", "Some moon glow — expose for sky or foreground separately.");
    } else if (moonIllum != null && moonIllum > 60) {
      nightPhoto = verdict("poor", "Bright moon", "Milky Way and faint stars washed out — good for moonlit landscapes.");
    } else {
      nightPhoto = verdict("fair", "Check moon phase", (dl && dl.moonPhase) || "Moon brightness affects star visibility.");
    }

    var milkyWay = verdict(
      "preview",
      "Preview",
      dl && dl.moonIllumination != null && dl.moonIllumination <= 20
        ? "Dark moon phase favors Milky Way — aurora API not connected yet."
        : "Milky Way forecast requires astronomy provider — coming soon."
    );

    var aurora = verdict(
      "preview",
      "Preview",
      "Geomagnetic aurora forecast not connected for your latitude yet."
    );

    return {
      sunriseQuality: sunriseQuality,
      sunsetQuality: sunsetQuality,
      fogPotential: fogPotential,
      cloudCover: cloudCover,
      nightPhotography: nightPhoto,
      milkyWay: milkyWay,
      aurora: aurora
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.skyDashboardIntel = { analyze: analyze };
})(window);
