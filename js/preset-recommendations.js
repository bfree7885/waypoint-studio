(function (global) {
  "use strict";

  /**
   * Maps WaypointSceneAnalyzer output to scene preset recommendations.
   */
  function recommend(analysis) {
    var f = analysis.features;
    var d = analysis.depth;
    var candidates = [];

    function add(id, score, reason) {
      if (score <= 0) return;
      candidates.push({ presetId: id, score: score, reason: reason });
    }

    add(
      "mountain-wind",
      (f.mountains * 0.55 + f.sky * 0.35 + f.clouds * 0.2) * (f.mountains > 0.32 ? 1 : 0.4),
      "Mountains and open sky — alpine air suits this frame."
    );

    add(
      "rippling-water",
      f.water * 0.85 + (f.sky * 0.15) * (f.water > 0.25 ? 1 : 0),
      "Water detected — gentle surface motion and soft drift."
    );

    add(
      "still-lake",
      f.water * 0.55 + (1 - f.trees) * 0.2 + (1 - d.foreground) * 0.1,
      "Calm water — mirror-still mood with minimal movement."
    );

    add(
      "firefly-evening",
      f.trees * 0.7 + f.fields * 0.25 + (1 - f.snow) * 0.1,
      "Forest or tree cover — warm evening fireflies fit well."
    );

    add(
      "winter-stillness",
      f.snow * 0.9 + (f.sky * 0.1) * (f.snow > 0.35 ? 1 : 0.3),
      "Snow and cold tones — quiet winter snowfall."
    );

    add(
      "morning-mist",
      f.sky * 0.35 + f.clouds * 0.35 + f.fields * 0.2 + f.trees * 0.15,
      "Open sky with soft cloud cover — dawn mist works beautifully."
    );

    add(
      "dense-fog",
      f.trees * 0.35 + f.mountains * 0.35 + f.fields * 0.25,
      "Layered landscape — dense fog adds depth and mystery."
    );

    add(
      "golden-hour",
      f.fields * 0.4 + f.sky * 0.3 + f.trees * 0.2 + (1 - f.snow) * 0.15,
      "Warm open scene — golden light rays and floating dust."
    );

    add(
      "blue-hour",
      f.sky * 0.45 + f.water * 0.25 + (1 - f.snow) * 0.15,
      "Cool sky tones — twilight haze and slow drift."
    );

    add(
      "thunderstorm",
      f.clouds * 0.4 + f.sky * 0.25 + f.water * 0.2 + f.mountains * 0.15,
      "Heavy cloud cover — dramatic rain and rolling fog."
    );

    add(
      "spring-rain",
      f.trees * 0.35 + f.fields * 0.35 + f.water * 0.2,
      "Green midground — light spring rain and fresh leaves."
    );

    if (d.foreground > 0.45 && f.trees > 0.3) {
      add("dense-fog", 0.45 + f.trees * 0.2, "Strong foreground with trees — mist adds separation.");
    }

    candidates.sort(function (a, b) {
      return b.score - a.score;
    });

    var seen = {};
    var unique = [];
    var i;
    for (i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      if (seen[c.presetId]) continue;
      seen[c.presetId] = true;
      unique.push(c);
      if (unique.length >= 3) break;
    }

    return unique;
  }

  function depthSummary(depth) {
    var parts = [];
    if (depth.background >= 0.35) parts.push("distant sky and peaks");
    if (depth.midground >= 0.35) parts.push("midground land or water");
    if (depth.foreground >= 0.35) parts.push("near foreground detail");
    if (!parts.length) return "Subtle depth — balanced layers across the frame.";
    return "Depth layers: " + parts.join(" · ") + ".";
  }

  global.WaypointPresetRecommendations = {
    recommend: recommend,
    depthSummary: depthSummary
  };
})(window);
