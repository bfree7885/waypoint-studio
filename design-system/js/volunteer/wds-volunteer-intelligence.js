/**
 * Waypoint Volunteer — Opportunity Intelligence Engine v1
 *
 * Soft recommendations for "What good can I do today?"
 * Never gamifies. Always explains. Scores stay private.
 */
(function (global) {
  "use strict";

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function haversineMiles(aLat, aLon, bLat, bLon) {
    if (aLat == null || aLon == null || bLat == null || bLon == null) return null;
    var R = 3958.8;
    var toRad = Math.PI / 180;
    var dLat = (bLat - aLat) * toRad;
    var dLon = (bLon - aLon) * toRad;
    var lat1 = aLat * toRad;
    var lat2 = bLat * toRad;
    var h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10;
  }

  function intelOf(opp) {
    return opp.intelligence || {};
  }

  function facetScores(opp) {
    var i = intelOf(opp);
    var minutes = (opp.estimatedDuration && opp.estimatedDuration.minutes) || 90;
    var effortMap = { light: 25, moderate: 55, strenuous: 85 };
    return {
      serviceImpact: i.serviceImpact != null ? i.serviceImpact : 60,
      travelEffort: i.travelEffort || "moderate",
      outdoorSuitability: i.outdoorSuitability != null ? i.outdoorSuitability : opp.setting === "outdoor" ? 70 : 20,
      weatherSuitability: null,
      accessibility: i.accessibilityFit != null ? i.accessibilityFit : 50,
      familyFriendly: !!(opp.familyFriendly || i.kidFriendly),
      kidFriendly: !!i.kidFriendly,
      seniorFriendly: !!i.seniorFriendly,
      dogFriendly: !!i.dogFriendly,
      wheelchairFriendly: !!i.wheelchairFriendly,
      indoorOutdoor: opp.setting,
      durationMinutes: minutes,
      physicalIntensity: effortMap[opp.physicalEffort] || 50,
      skillRequirement: i.skillRequirement || "none",
      dropInFriendly: !!i.dropInFriendly,
      recurring: !!(opp.schedule && opp.schedule.kind === "recurring"),
      remote: !!i.remote,
      virtual: !!i.virtual,
      causeTags: i.causeTags || []
    };
  }

  function weatherSuitability(opp, ctx) {
    var w = (ctx && ctx.weather) || {};
    var reasons = [];
    var score = 70;
    var outdoor = opp.setting === "outdoor" || opp.setting === "mixed";
    var indoor = opp.setting === "indoor";
    var sensitive = opp.weatherSensitive !== false && outdoor;

    if (!w.available) {
      return { score: 65, reasons: ["Weather unavailable — using gentle defaults."], honesty: "unavailable" };
    }

    if (w.isHeavyRain || (w.isRaining && w.precipProbability >= 60)) {
      if (indoor || intelOf(opp).remote || intelOf(opp).virtual) {
        score = 92;
        reasons.push("Heavy rain makes indoor or remote opportunities a better choice.");
      } else if (sensitive) {
        score = 28;
        reasons.push("Rain reduces suitability for outdoor work.");
      }
    } else if (w.isHot && sensitive) {
      score = 40;
      reasons.push("High heat reduces suitability for outdoor cleanup and trail work.");
      if ((opp.estimatedDuration && opp.estimatedDuration.minutes) <= 75) {
        score += 12;
        reasons.push("A shorter outdoor shift is kinder in the heat.");
      }
    } else if (w.isCool && outdoor && !w.isRaining) {
      score = 94;
      reasons.push("Excellent day for outdoor stewardship — temperatures are cool and no rain is expected.");
    } else if (w.isFair && outdoor) {
      score = 86;
      reasons.push("Fair weather supports outdoor volunteering today.");
    } else if (indoor) {
      score = 78;
      reasons.push("Indoor opportunities stay steady regardless of outdoor weather.");
    }

    if (w.isWindy && outdoor && (opp.categories || []).indexOf("trail-maintenance") !== -1) {
      score -= 8;
      reasons.push("Gusty wind can make trail work less comfortable.");
    }

    if (w.afternoonRainLikely && outdoor && !w.isRaining) {
      score -= 10;
      reasons.push("Afternoon rain looks possible — morning outdoor help may fit better.");
    }

    return { score: clamp(score, 0, 100), reasons: reasons, honesty: "live" };
  }

  function buildInsights(ctx) {
    var insights = [];
    var w = ctx.weather || {};
    if (w.available && w.isCool && !w.isRaining) {
      insights.push({
        id: "cool-outdoor",
        tone: "hopeful",
        message: "Cool, dry conditions favor trail work, planting, and outdoor stewardship.",
        priority: 50
      });
    }
    if (w.available && (w.isHeavyRain || w.isRaining)) {
      insights.push({
        id: "rain-indoor",
        tone: "practical",
        message: "Wet weather — indoor pantry, library, or remote help may feel easier.",
        priority: 60
      });
    }
    if (w.available && w.isHot) {
      insights.push({
        id: "heat",
        tone: "practical",
        message: "High heat — prefer shorter outdoor shifts, shade, or indoor options.",
        priority: 45
      });
    }
    if (ctx.isWeekend) {
      insights.push({
        id: "weekend",
        tone: "hopeful",
        message: "Weekend hours often open family-friendly outdoor work days.",
        priority: 25
      });
    }
    if (ctx.season === "spring" || ctx.season === "fall") {
      insights.push({
        id: "planting-season",
        tone: "seasonal",
        message: "This season is a natural window for planting and habitat restoration.",
        priority: 30
      });
    }
    insights.sort(function (a, b) {
      return b.priority - a.priority;
    });
    return insights;
  }

  function profileFit(opp, profile, distanceMiles) {
    profile = profile || {};
    var reasons = [];
    var score = 55;
    var i = intelOf(opp);
    var causes = profile.causes || [];
    if (causes.length) {
      var hit = (opp.categories || []).some(function (c) {
        return causes.indexOf(c) !== -1;
      }) || (i.causeTags || []).some(function (t) {
        return causes.indexOf(t) !== -1;
      });
      if (hit) {
        score += 18;
        reasons.push("Matches causes you care about.");
      } else {
        score -= 6;
      }
    }

    var maxMiles = profile.preferredTravelMiles != null ? profile.preferredTravelMiles : 25;
    if (distanceMiles != null) {
      if (distanceMiles <= maxMiles * 0.5) {
        score += 12;
        reasons.push("Within an easy travel radius.");
      } else if (distanceMiles <= maxMiles) {
        score += 4;
      } else if (!(i.remote || i.virtual)) {
        score -= 20;
        reasons.push("Farther than your preferred travel distance.");
      }
    }
    if (i.remote || i.virtual) {
      score += 8;
      reasons.push("No travel required.");
    }

    var prefDur = profile.preferredDurationMinutes || 120;
    var minutes = (opp.estimatedDuration && opp.estimatedDuration.minutes) || 90;
    if (minutes <= prefDur) score += 8;
    else if (minutes > prefDur * 1.5) score -= 10;

    var io = profile.indoorOutdoor || "any";
    if (io !== "any" && opp.setting !== io && !(io === "outdoor" && opp.setting === "mixed")) {
      score -= 12;
    }

    if (profile.accessibilityNeeded && i.wheelchairFriendly) {
      score += 14;
      reasons.push("Marked wheelchair-friendlier in this sample listing.");
    } else if (profile.accessibilityNeeded && (i.accessibilityFit || 0) < 50) {
      score -= 15;
    }

    if (profile.kidFriendlyPreferred && (i.kidFriendly || opp.familyFriendly)) {
      score += 10;
      reasons.push("Family- and kid-friendly option.");
    }

    var ability = profile.physicalAbility || "moderate";
    var effort = opp.physicalEffort || "moderate";
    if (ability === "light" && effort === "strenuous") score -= 25;
    if (ability === "light" && effort === "moderate") score -= 8;
    if (ability === "vigorous" && effort === "light") score += 4;

    if (profile.availableWeekends === false && /saturday|sunday|weekend/i.test((opp.schedule && opp.schedule.whenLabel) || "")) {
      score -= 18;
    }
    if (profile.availableWeekdays === false && /weekday/i.test((opp.schedule && opp.schedule.whenLabel) || "")) {
      score -= 18;
    }

    return { score: clamp(score, 0, 100), reasons: reasons };
  }

  function scoreOpportunity(opp, ctx, profile, opts) {
    opts = opts || {};
    var facets = facetScores(opp);
    var wx = weatherSuitability(opp, ctx);
    facets.weatherSuitability = wx.score;
    var origin = (ctx && ctx.location) || {};
    var loc = opp.location || {};
    var distanceMiles = haversineMiles(origin.lat, origin.lon, loc.lat, loc.lon);
    if (intelOf(opp).remote || intelOf(opp).virtual) distanceMiles = 0;

    var fit = profileFit(opp, profile, distanceMiles);
    var service = facets.serviceImpact;
    var outdoorBoost = facets.outdoorSuitability;

    var overall = Math.round(
      service * 0.28 +
        wx.score * 0.28 +
        fit.score * 0.26 +
        outdoorBoost * 0.1 +
        facets.accessibility * 0.08
    );

    if (opts.preferTodayOutdoor && opp.setting === "indoor" && wx.score < 50) {
      /* keep */
    }

    var reasons = []
      .concat(wx.reasons.slice(0, 2))
      .concat(fit.reasons.slice(0, 2));
    if (!reasons.length) {
      reasons.push("A steady option that fits today's soft filters.");
    }

    return {
      opportunityId: opp.id,
      overall: clamp(overall, 0, 100),
      facets: facets,
      distanceMiles: distanceMiles,
      weather: wx,
      profileFit: fit,
      reasons: reasons,
      honesty: {
        data: (opp.meta && opp.meta.status) || "sample",
        weather: wx.honesty || (ctx && ctx.honesty) || "unavailable",
        scoring: "estimated"
      }
    };
  }

  function recommendToday(opportunities, ctx, profile, opts) {
    opts = opts || {};
    var planning = global.WDS && global.WDS.volunteerPlanning;
    var insights = buildInsights(ctx || {});
    var pool = (opportunities || []).filter(function (o) {
      if (planning && planning.isHidden(o.id)) return false;
      return true;
    });

    var ranked = pool
      .map(function (o) {
        return { opportunity: o, score: scoreOpportunity(o, ctx, profile, opts) };
      })
      .sort(function (a, b) {
        return b.score.overall - a.score.overall;
      });

    var top = ranked[0] || null;
    var alternatives = ranked.slice(1, 4);

    return {
      insights: insights,
      top: top,
      alternatives: alternatives,
      ranked: ranked,
      context: ctx,
      honesty: {
        catalog: "demo",
        weather: (ctx && ctx.honesty) || "unavailable",
        scoring: "estimated"
      }
    };
  }

  function matchesDiscoveryFilters(opp, f, scoreRow) {
    f = f || {};
    if (f.setting && f.setting !== "any" && opp.setting !== f.setting) {
      if (!(f.setting === "outdoor" && opp.setting === "mixed")) return false;
    }
    if (f.duration === "hour" && !(opp.estimatedDuration && opp.estimatedDuration.minutes <= 75))
      return false;
    if (f.duration === "half" && !(opp.estimatedDuration && opp.estimatedDuration.minutes <= 180))
      return false;
    if (f.family && !opp.familyFriendly && !intelOf(opp).kidFriendly) return false;
    if (f.weekend) {
      var when = ((opp.schedule && opp.schedule.whenLabel) || "").toLowerCase();
      if (when.indexOf("saturday") === -1 && when.indexOf("sunday") === -1 && when.indexOf("weekend") === -1)
        return false;
    }
    if (f.today) {
      /* soft — keep all; ranking handles today */
    }
    if (f.seasonal && !opp.seasonal && (intelOf(opp).causeTags || []).indexOf("seasonal") === -1)
      return false;
    if (f.remote && !(intelOf(opp).remote || intelOf(opp).virtual)) return false;
    if (f.virtual && !intelOf(opp).virtual) return false;
    if (f.accessible && !intelOf(opp).wheelchairFriendly && (intelOf(opp).accessibilityFit || 0) < 70)
      return false;
    if (f.outdoorToday && opp.setting === "indoor" && !intelOf(opp).remote) return false;
    if (f.category && f.category !== "any" && (opp.categories || []).indexOf(f.category) === -1)
      return false;
    if (f.interest && f.interest !== "any" && (opp.categories || []).indexOf(f.interest) === -1)
      return false;
    if (f.skill && f.skill !== "any") {
      if ((opp.requiredSkills || []).indexOf(f.skill) === -1) return false;
    }
    if (f.effort && f.effort !== "any" && opp.physicalEffort !== f.effort) return false;
    if (f.organizationId && opp.organizationId !== f.organizationId) return false;
    if (f.maxMiles != null && scoreRow && scoreRow.distanceMiles != null) {
      if (!(intelOf(opp).remote || intelOf(opp).virtual) && scoreRow.distanceMiles > Number(f.maxMiles))
        return false;
    }
    if (f.causeTag && f.causeTag !== "any") {
      if ((intelOf(opp).causeTags || []).indexOf(f.causeTag) === -1 && (opp.categories || []).indexOf(f.causeTag) === -1)
        return false;
    }
    return true;
  }

  global.WDS = global.WDS || {};
  global.WDS.volunteerIntelligence = {
    facetScores: facetScores,
    weatherSuitability: weatherSuitability,
    scoreOpportunity: scoreOpportunity,
    recommendToday: recommendToday,
    matchesDiscoveryFilters: matchesDiscoveryFilters,
    haversineMiles: haversineMiles,
    buildInsights: buildInsights
  };
})(window);
