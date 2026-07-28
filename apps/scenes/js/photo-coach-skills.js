/**
 * Photo Coach skill tracking — per-dimension history from saved sessions.
 */
(function (global) {
  "use strict";

  var DIMENSIONS = [
    "composition", "lighting", "color", "exposure", "technical",
    "sharpness", "noise", "storytelling", "subject"
  ];

  function scoreFromCritique(critique, key) {
    if (!critique) return null;
    if (key === "overall") return critique.overallScore;
    var block = critique[key];
    if (!block) return null;
    var s = 70;
    if (block.strengths && block.strengths.length > block.improvements.length) s += 10;
    if (block.improvements && block.improvements.length > 2) s -= 10;
    return Math.max(40, Math.min(95, s));
  }

  function buildProfile() {
    var P = global.WaypointPhotoCoachPortfolio;
    if (!P || !P.listSessions) return null;
    var sessions = P.listSessions().filter(function (s) { return s.critique; });
    if (!sessions.length) return null;

    var dims = {};
    DIMENSIONS.forEach(function (d) { dims[d] = []; });

    sessions.forEach(function (s) {
      DIMENSIONS.forEach(function (d) {
        var sc = scoreFromCritique(s.critique, d);
        if (sc != null) dims[d].push(sc);
      });
    });

    var strengths = [];
    var growth = [];
    DIMENSIONS.forEach(function (d) {
      if (!dims[d].length) return;
      var avg = Math.round(dims[d].reduce(function (a, b) { return a + b; }, 0) / dims[d].length);
      var entry = { skill: d, average: avg, samples: dims[d].length };
      if (avg >= 78) strengths.push(entry);
      else if (avg <= 65) growth.push(entry);
    });

    strengths.sort(function (a, b) { return b.average - a.average; });
    growth.sort(function (a, b) { return a.average - b.average; });

    return {
      sessionCount: sessions.length,
      overallAverage: P.skillSummary() ? P.skillSummary().averageScore : null,
      strengths: strengths.slice(0, 3),
      growthAreas: growth.slice(0, 3),
      dimensions: dims
    };
  }

  function renderHtml() {
    var profile = buildProfile();
    if (!profile) {
      return '<p class="coach-skills coach-skills--empty muted">Save coached sessions to build a skill profile across composition, light, color, and more.</p>';
    }
    var html = '<div class="coach-skills"><h3 class="coach-skills__title">Skill profile</h3>';
    html += '<p class="coach-skills__meta">' + profile.sessionCount + " sessions";
    if (profile.overallAverage != null) html += " · avg " + profile.overallAverage + "/100";
    html += "</p>";
    if (profile.strengths.length) {
      html += '<p class="coach-skills__label">Strengths</p><ul class="coach-skills__list">';
      profile.strengths.forEach(function (s) {
        html += "<li>" + s.skill + " · " + s.average + "/100</li>";
      });
      html += "</ul>";
    }
    if (profile.growthAreas.length) {
      html += '<p class="coach-skills__label">Growth areas</p><ul class="coach-skills__list">';
      profile.growthAreas.forEach(function (s) {
        html += "<li>" + s.skill + " · " + s.average + "/100</li>";
      });
      html += "</ul>";
    }
    html += "</div>";
    return html;
  }

  global.WaypointPhotoCoachSkills = {
    DIMENSIONS: DIMENSIONS,
    buildProfile: buildProfile,
    renderHtml: renderHtml,
    scoreFromCritique: scoreFromCritique
  };
})(window);
