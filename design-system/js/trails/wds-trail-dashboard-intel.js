/**
 * Trail dashboard intelligence — park operations from OIP platform + weather context.
 * Feed registry prepares slots for future live agency and crowd providers.
 */
(function (global) {
  "use strict";

  var FEED_REGISTRY = {
    trailConditions: {
      slot: "trail-conditions",
      provider: "trail-reports",
      label: "Agency trail condition reports",
      status: "pending"
    },
    trailClosures: {
      slot: "trail-closures",
      provider: "nps-trail-closures",
      label: "NPS / USFS trail closure feed",
      status: "pending"
    },
    parkAlerts: {
      slot: "park-alerts",
      provider: "nps-alerts",
      label: "National park alert API",
      status: "pending"
    },
    parkingAlerts: {
      slot: "parking-alerts",
      provider: "crowd-reports",
      label: "Trailhead parking / crowd data",
      status: "pending"
    },
    trailDifficulty: {
      slot: "trail-difficulty",
      provider: "trail-metadata",
      label: "Trail grade and exposure metadata",
      status: "pending"
    },
    recentRainImpact: {
      slot: "recent-rain-impact",
      provider: "open-meteo",
      label: "Precipitation and rainfall totals",
      status: "partial"
    },
    mudPotential: {
      slot: "mud-potential",
      provider: "trail-reports",
      label: "Soil moisture and tread reports",
      status: "partial"
    },
    bridgeClosures: {
      slot: "bridge-closures",
      provider: "nps-alerts",
      label: "Bridge and crossing closures",
      status: "pending"
    },
    stateParkNotices: {
      slot: "state-park-notices",
      provider: "pa-dcnr",
      label: "State park notice feed",
      status: "pending"
    }
  };

  function card(id, icon, label, status, headline, detail, action, source, feedKey) {
    var feed = FEED_REGISTRY[feedKey] || null;
    return {
      id: id,
      icon: icon,
      label: label,
      status: status || "unknown",
      headline: headline,
      detail: detail || "",
      action: action || "Verify at the trailhead before you go.",
      source: source || "educational",
      feedSlot: feed ? feed.slot : null,
      feedProvider: feed ? feed.provider : null,
      feedStatus: feed ? feed.status : null
    };
  }

  function parseNum(val) {
    if (val == null) return null;
    if (typeof val === "number" && isFinite(val)) return val;
    if (typeof val === "object" && val.value != null) return parseNum(val.value);
    return null;
  }

  function observationsMatching(platform, pattern) {
    var obs = platform && platform.observations;
    if (!obs || !obs.items || !obs.items.length) return [];
    var re = pattern instanceof RegExp ? pattern : new RegExp(pattern, "i");
    return obs.items.filter(function (item) {
      var hay = ((item.title || "") + " " + (item.body || "")).toLowerCase();
      return re.test(hay);
    });
  }

  function conservation(platform) {
    var c = platform && platform.conservation;
    if (!c || c.status === "placeholder" || !c.current) return null;
    return c.current;
  }

  function weatherCtx(platform) {
    var ref = platform && platform.weatherRef;
    var cur = ref && ref.current;
    var live = !!(ref && ref.meta && !ref.meta.isPlaceholder);
    var today = ref && ref.daily && ref.daily[0];
    var cond = ((cur && cur.conditions && cur.conditions.summary) ||
      (platform.weather && platform.weather.conditions) || "").toLowerCase();
    var temp = parseNum(cur && cur.temperature);
    var feels = parseNum(cur && cur.feelsLike);
    var precip = parseNum(cur && cur.precipitation && cur.precipitation.amount);
    var precipProb = parseNum(cur && cur.precipitation && cur.precipitation.probability);
    if (precipProb == null && today && today.precipitation) {
      precipProb = parseNum(today.precipitation.probability);
    }
    var rain = platform && platform.rainfall && platform.rainfall.recent;
    var rainAmt = rain ? parseNum(rain.amount) : null;
    var rainDays = rain && rain.periodDays ? rain.periodDays : 7;
    return {
      live: live,
      temp: temp,
      feels: feels != null ? feels : temp,
      conditions: cond,
      precip: precip,
      precipProb: precipProb,
      rainy: /rain|shower|drizzle|storm|thunder/.test(cond),
      rainAmt: rainAmt,
      rainDays: rainDays,
      rainSummary: rain && rain.summary ? rain.summary : null
    };
  }

  function seasonFromPlatform(platform) {
    var label = (platform && platform.calendar && platform.calendar.season) || "";
    var lower = String(label).toLowerCase();
    if (/winter/.test(lower)) return "winter";
    if (/spring/.test(lower)) return "spring";
    if (/summer/.test(lower)) return "summer";
    if (/fall|autumn/.test(lower)) return "fall";
    var m = new Date().getMonth() + 1;
    if (m >= 3 && m <= 5) return "spring";
    if (m >= 6 && m <= 8) return "summer";
    if (m >= 9 && m <= 11) return "fall";
    return "winter";
  }

  function buildTrailConditions(platform) {
    var notes = observationsMatching(platform, /trail|mud|ridge|hike|path|tread/i);
    if (notes.length) {
      var n = notes[0];
      var caution = /mud|water|flood|ice|closed|standing/i.test(n.title + " " + n.body);
      return card(
        "trail-conditions", "🥾", "Trail Conditions",
        caution ? "caution" : "clear",
        n.title,
        n.body ? n.body.split(".").slice(0, 2).join(".") + "." : "Regional editorial field note — not a live tread survey.",
        "Confirm at the trailhead; conditions change with elevation and aspect.",
        "editorial", "trailConditions"
      );
    }
    var wx = weatherCtx(platform);
    if (wx.rainy || (wx.rainAmt != null && wx.rainAmt > 0.3)) {
      return card(
        "trail-conditions", "🥾", "Trail Conditions",
        "caution",
        "Recent rain may affect low trails and crossings",
        wx.rainSummary || "Rain in the forecast or recent totals suggest soft tread in ravines.",
        "Ridge routes often dry first; creek bottoms hold moisture longest.",
        wx.live ? "live" : "expected", "trailConditions"
      );
    }
    return card(
      "trail-conditions", "🥾", "Trail Conditions",
      "unknown",
      "No live tread report for your area",
      "Ridge tops typically dry before ravines after rain — elevation and aspect matter more than calendar.",
      "Check agency sites and recent trip reports before committing to a long loop.",
      "educational", "trailConditions"
    );
  }

  function buildTrailClosures(platform) {
    var notes = observationsMatching(platform, /clos|detour|blocked|shutdown/i);
    var cons = conservation(platform);
    if (cons && /detour|clos|maintenance|temporary/i.test(cons.title + " " + cons.summary)) {
      return card(
        "trail-closures", "⛔", "Trail Closures",
        "caution",
        cons.title,
        cons.summary,
        cons.whatYouCanDo || "Follow marked detours and official signage.",
        "editorial", "trailClosures"
      );
    }
    if (notes.length) {
      return card(
        "trail-closures", "⛔", "Trail Closures",
        "caution",
        notes[0].title,
        notes[0].body ? notes[0].body.split(".").slice(0, 2).join(".") + "." : "",
        "Confirm with the managing agency before your visit.",
        "editorial", "trailClosures"
      );
    }
    return card(
      "trail-closures", "⛔", "Trail Closures",
      "unknown",
      "No closure feed connected",
      "Live agency closure lists will populate this card when the trail-reports provider connects.",
      "Always check NPS, state park, and municipal sites the morning you go.",
      "future", "trailClosures"
    );
  }

  function buildParkAlerts(platform) {
    var cons = conservation(platform);
    if (cons) {
      return card(
        "park-alerts", "🏞", "Park Alerts",
        /maintenance|detour|erosion|project/i.test(cons.title + cons.summary) ? "caution" : "clear",
        cons.title,
        cons.summary,
        cons.whatYouCanDo || "Stay on marked paths; respect active work zones.",
        "editorial", "parkAlerts"
      );
    }
    var notes = observationsMatching(platform, /park|nps|dwgnra|game commission|alert|advisory/i);
    if (notes.length) {
      return card(
        "park-alerts", "🏞", "Park Alerts",
        "caution",
        notes[0].title,
        notes[0].body ? notes[0].body.split(".").slice(0, 2).join(".") + "." : "",
        "Confirm with official park channels — editorial summary only.",
        "editorial", "parkAlerts"
      );
    }
    return card(
      "park-alerts", "🏞", "Park Alerts",
      "unknown",
      "Park alert API not connected",
      "National and regional park-wide notices will appear when the nps-alerts provider connects.",
      "Bookmark your destination's official alerts page until live feed is active.",
      "future", "parkAlerts"
    );
  }

  function buildParkingAlerts(platform) {
    var notes = observationsMatching(platform, /parking|lot|trailhead|crowd|full/i);
    if (notes.length) {
      return card(
        "parking-alerts", "🅿", "Parking Alerts",
        "caution",
        notes[0].title,
        notes[0].body || "Regional note mentioning parking or trailhead access.",
        "Arrive early on weekends; have a backup trailhead in mind.",
        "editorial", "parkingAlerts"
      );
    }
    return card(
      "parking-alerts", "🅿", "Parking Alerts",
      "unknown",
      "No live lot status",
      "Popular trailhead fill times vary by season — crowd-reports provider not connected yet.",
      "Plan a weekday start or secondary access point for busy parks.",
      "future", "parkingAlerts"
    );
  }

  function buildTrailDifficulty(platform, wx, season) {
    var elev = platform && platform.elevation && platform.elevation.feet;
    var OW = global.WDS && global.WDS.outdoorWeatherIntel;
    var hiking = OW && OW.hikingComfort && platform.weatherRef
      ? OW.hikingComfort(platform.weatherRef) : null;
    if (hiking) {
      var status = hiking.level === "poor" ? "caution" :
        hiking.level === "excellent" || hiking.level === "good" ? "clear" : "caution";
      return card(
        "trail-difficulty", "⛰", "Trail Difficulty",
        status,
        hiking.headline || "Hiking comfort index",
        hiking.detail,
        elev != null
          ? "Regional elevation ~" + Math.round(elev) + " ft — adjust route length for heat, wind, and exposure."
          : "Match route grade to group fitness; turn back is always an option.",
        wx.live ? "live" : "expected", "trailDifficulty"
      );
    }
    if (season === "winter") {
      return card(
        "trail-difficulty", "⛰", "Trail Difficulty",
        "caution",
        "Winter routes need extra margin",
        "Ice, short daylight, and cold exposure raise effective difficulty on the same map grade.",
        "Carry traction, layers, and a turnaround time.",
        "educational", "trailDifficulty"
      );
    }
    return card(
      "trail-difficulty", "⛰", "Trail Difficulty",
      "unknown",
      "Route difficulty depends on fitness and conditions",
      "Without live weather context, use topo grade, distance, and elevation gain as your baseline.",
      "Start with a shorter loop; add distance only after you read today's tread.",
      "educational", "trailDifficulty"
    );
  }

  function buildRecentRainImpact(platform, wx) {
    if (wx.rainAmt != null) {
      var heavy = wx.rainAmt >= 1;
      return card(
        "recent-rain-impact", "🌧", "Recent Rain Impact",
        heavy ? "caution" : wx.rainAmt > 0.1 ? "caution" : "clear",
        wx.rainAmt.toFixed(2) + " in over " + wx.rainDays + " days",
        wx.rainSummary || "Recent rainfall affects creek crossings and soft soils.",
        heavy
          ? "Expect delayed drying in ravines; allow extra time at water crossings."
          : "Light totals — ridges may already be firm while bottoms stay soft.",
        wx.live || platform.rainfall ? "live" : "editorial", "recentRainImpact"
      );
    }
    if (wx.live && (wx.rainy || (wx.precipProb != null && wx.precipProb >= 50))) {
      return card(
        "recent-rain-impact", "🌧", "Recent Rain Impact",
        "caution",
        "Rain in current forecast",
        wx.conditions ? "Conditions: " + wx.conditions : "Precipitation may affect tread within 24–48 hours.",
        "Delay creek-heavy routes until after a dry day if possible.",
        "live", "recentRainImpact"
      );
    }
    return card(
      "recent-rain-impact", "🌧", "Recent Rain Impact",
      "unknown",
      "Rainfall totals not available",
      "Live gauge and 7-day rainfall totals will sharpen this card when fully connected.",
      "Look for standing water in wheel ruts and dark soil as field evidence.",
      "educational", "recentRainImpact"
    );
  }

  function buildMudPotential(platform, wx, season) {
    var notes = observationsMatching(platform, /mud|muddy|standing water|soft tread/i);
    if (notes.length) {
      return card(
        "mud-potential", "🟤", "Mud Potential",
        "caution",
        "Mud reported regionally",
        notes[0].body ? notes[0].body.split(".").slice(0, 2).join(".") + "." : notes[0].title,
        "Stay on durable surfaces; avoid widening trails to bypass mud.",
        "editorial", "mudPotential"
      );
    }
    if ((wx.rainAmt != null && wx.rainAmt > 0.25) || wx.rainy) {
      return card(
        "mud-potential", "🟤", "Mud Potential",
        "caution",
        "Elevated mud risk after recent rain",
        "Low sections and north-facing tread hold moisture longer than rocky ridges.",
        "Waterproof footwear; turn back rather than cutting switchbacks.",
        wx.live ? "live" : "expected", "mudPotential"
      );
    }
    if (season === "spring") {
      return card(
        "mud-potential", "🟤", "Mud Potential",
        "caution",
        "Spring thaw may keep ravines soft",
        "Freeze–thaw cycles and leaf litter hold water on shaded slopes.",
        "Favor ridge routes until soils firm up.",
        "educational", "mudPotential"
      );
    }
    return card(
      "mud-potential", "🟤", "Mud Potential",
      "clear",
      "Mud risk appears low from available signals",
      "No recent rain signal and no editorial mud reports — still verify locally.",
      "After any rain event, assume ravines wet for 24–48 hours.",
      "educational", "mudPotential"
    );
  }

  function buildBridgeClosures(platform) {
    var cons = conservation(platform);
    if (cons && /bridge|crossing|streambank|detour|access path/i.test(cons.title + " " + cons.summary)) {
      return card(
        "bridge-closures", "🌉", "Bridge Closures",
        "caution",
        "Crossing or access work reported",
        cons.summary,
        cons.whatYouCanDo || "Use marked detours; do not enter closed construction zones.",
        "editorial", "bridgeClosures"
      );
    }
    var notes = observationsMatching(platform, /bridge|crossing|creek|ford|stream/i);
    if (notes.length && /high|mud|water|cross/i.test(notes[0].title + notes[0].body)) {
      return card(
        "bridge-closures", "🌉", "Bridge Closures",
        "caution",
        "Water crossing caution",
        notes[0].body ? notes[0].body.split(".").slice(0, 2).join(".") + "." : notes[0].title,
        "Unbridged crossings may be unsafe after rain — not the same as a formal closure.",
        "editorial", "bridgeClosures"
      );
    }
    return card(
      "bridge-closures", "🌉", "Bridge Closures",
      "unknown",
      "No bridge closure feed",
      "Formal bridge and footbridge closures will list here when agency alerts connect.",
      "Treat high, fast water as a closure even if no sign is posted.",
      "future", "bridgeClosures"
    );
  }

  function buildStateParkNotices(platform) {
    var notes = observationsMatching(platform, /state park|dcnr|pennsylvania park|bureau/i);
    if (notes.length) {
      return card(
        "state-park-notices", "🏛", "State Park Notices",
        "caution",
        notes[0].title,
        notes[0].body ? notes[0].body.split(".").slice(0, 2).join(".") + "." : "",
        "Confirm on the official state park website.",
        "editorial", "stateParkNotices"
      );
    }
    return card(
      "state-park-notices", "🏛", "State Park Notices",
      "unknown",
      "State park feed not connected",
      "Pennsylvania DCNR and other state park notice APIs will populate this card when integrated.",
      "Check state park home pages for burn bans, swim closures, and construction.",
      "future", "stateParkNotices"
    );
  }

  function overallStatus(cards) {
    if (cards.some(function (c) { return c.status === "closed"; })) return "closed";
    if (cards.filter(function (c) { return c.status === "caution"; }).length >= 3) return "caution";
    if (cards.some(function (c) { return c.status === "caution"; })) return "caution";
    if (cards.every(function (c) { return c.status === "unknown"; })) return "unknown";
    return "clear";
  }

  function analyze(platform) {
    if (!platform) return null;
    var wx = weatherCtx(platform);
    var season = seasonFromPlatform(platform);
    var cards = {
      trailConditions: buildTrailConditions(platform),
      trailClosures: buildTrailClosures(platform),
      parkAlerts: buildParkAlerts(platform),
      parkingAlerts: buildParkingAlerts(platform),
      trailDifficulty: buildTrailDifficulty(platform, wx, season),
      recentRainImpact: buildRecentRainImpact(platform, wx),
      mudPotential: buildMudPotential(platform, wx, season),
      bridgeClosures: buildBridgeClosures(platform),
      stateParkNotices: buildStateParkNotices(platform)
    };
    var list = [
      cards.trailConditions,
      cards.trailClosures,
      cards.parkAlerts,
      cards.parkingAlerts,
      cards.trailDifficulty,
      cards.recentRainImpact,
      cards.mudPotential,
      cards.bridgeClosures,
      cards.stateParkNotices
    ];
    return {
      cards: cards,
      cardList: list,
      overallStatus: overallStatus(list),
      hasLiveWeather: wx.live,
      feedRegistry: FEED_REGISTRY,
      regionLabel: (platform.region && platform.region.label) ||
        (platform.geography && platform.geography.ecoregion) || null
    };
  }

  function summary(intel) {
    if (!intel || !intel.cards) return null;
    var t = intel.cards.trailConditions;
    var m = intel.cards.mudPotential;
    if (t && m) return t.headline + " · " + m.headline;
    return t ? t.headline : null;
  }

  global.WDS = global.WDS || {};
  global.WDS.trailDashboardIntel = {
    analyze: analyze,
    summary: summary,
    FEED_REGISTRY: FEED_REGISTRY
  };
})(window);
