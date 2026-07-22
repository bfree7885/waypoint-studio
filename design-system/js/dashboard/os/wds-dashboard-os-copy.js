/**
 * Outdoor OS — observational copy philosophy.
 * Outside summarizes conditions and possibilities; it never assigns homework.
 */
(function (global) {
  "use strict";

  var LABELS = {
    bestWindow: "Best window",
    happening: "Happening",
    whatMatters: "What matters",
    alternatePrefix: "Also worth noticing: "
  };

  /**
   * Owner-locked bans + common homework/imperative assignment patterns.
   * Applied to Best window primary/alternate (and copy tests).
   */
  var BANNED = [
    /\bdo this\b/i,
    /\byour task\b/i,
    /\btoday'?s assignment\b/i,
    /\bassignment\b/i,
    /\bhomework\b/i,
    /\blesson\b/i,
    /\bgoal for today\b/i,
    /\bcheck this off\b/i,
    /\byou should\b/i,
    /\byou need to\b/i,
    /\bgo outside now\b/i,
    /\bthen rest\b/i,
    /\brecommended action\b/i,
    /\brequired\b/i,
    /\bcomplete\b(?!ly\b)/i,
    /\bfinish\b/i,
    /\btake a walk\b/i,
    /\bstep outside\b/i,
    /\bgo outside\b/i,
    /tonight:\s*short outdoor check/i,
    /outdoor check,\s*then rest/i
  ];

  var ALLOWED_VOICE = [
    "Best window",
    "Worth noticing",
    "A quieter evening",
    "Tomorrow may offer",
    "Possible window",
    "Conditions favor",
    "Consider",
    "You may find",
    "What stands out",
    "Waypoint's take"
  ];

  function bannedHit(text) {
    var s = String(text == null ? "" : text);
    for (var i = 0; i < BANNED.length; i++) {
      if (BANNED[i].test(s)) return BANNED[i].source;
    }
    return null;
  }

  function isObservational(text) {
    return !bannedHit(text);
  }

  function assertPlanCopy(plan) {
    plan = plan || {};
    var parts = [plan.primary, plan.alternate].filter(Boolean);
    var hits = [];
    parts.forEach(function (p) {
      var h = bannedHit(p);
      if (h) hits.push({ text: p, pattern: h });
    });
    return { ok: !hits.length, hits: hits };
  }

  function alternateLine(text) {
    var s = String(text == null ? "" : text).trim();
    if (!s) return null;
    if (/^also worth noticing:/i.test(s)) return s;
    if (/^alternate:/i.test(s)) {
      return LABELS.alternatePrefix + s.replace(/^alternate:\s*/i, "");
    }
    return LABELS.alternatePrefix + s;
  }

  /**
   * Soften uncertainty without homework tone.
   * High uncertainty → provisional framing; never "you should".
   */
  function softenObservational(text, unc) {
    if (!text) return text;
    if (!unc || unc.level === "low") return text;
    if (/based on|if (the )?forecast|provisional|if conditions hold|may /i.test(text)) return text;
    if (unc.level === "high") {
      return "If conditions hold: " + String(text).replace(/^If conditions hold:\s*/i, "");
    }
    return text;
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardOSCopy = {
    LABELS: LABELS,
    BANNED: BANNED,
    ALLOWED_VOICE: ALLOWED_VOICE,
    bannedHit: bannedHit,
    isObservational: isObservational,
    assertPlanCopy: assertPlanCopy,
    alternateLine: alternateLine,
    softenObservational: softenObservational
  };
})(typeof window !== "undefined" ? window : global);
