/**
 * Outdoor Safety dashboard — calm, factual guidance from weather + regional context.
 * No fear-based language; concise recommendations only.
 */
(function (global) {
  "use strict";

  var FEED_REGISTRY = {
    tickActivity: { slot: "tick-activity", provider: "tick-model", status: "partial" },
    mosquitoActivity: { slot: "mosquito-activity", provider: "entomology-forecast", status: "pending" },
    heatRisk: { slot: "heat-risk", provider: "open-meteo", status: "partial" },
    stormRisk: { slot: "storm-risk", provider: "open-meteo", status: "partial" },
    airQuality: { slot: "air-quality", provider: "air-quality-api", status: "pending" },
    fireDanger: { slot: "fire-danger", provider: "fire-weather", status: "pending" },
    uvIndex: { slot: "uv-index", provider: "open-meteo", status: "partial" },
    waterSafety: { slot: "water-safety", provider: "composite", status: "partial" },
    generalAdvisories: { slot: "outdoor-advisories", provider: "editorial", status: "partial" }
  };

  function card(id, icon, label, level, headline, recommendation, detail, source, feedKey, value) {
    var feed = FEED_REGISTRY[feedKey] || null;
    return {
      id: id,
      icon: icon,
      label: label,
      level: level || "quiet",
      headline: headline,
      recommendation: recommendation || "",
      detail: detail || "",
      source: source || "educational",
      value: value != null ? value : null,
      feedSlot: feed ? feed.slot : null,
      feedProvider: feed ? feed.provider : null,
      feedStatus: feed ? feed.status : null
    };
  }

  function num(val) {
    if (val == null) return null;
    if (typeof val === "number" && isFinite(val)) return val;
    if (typeof val === "object" && val.value != null) return num(val.value);
    return null;
  }

  function weatherPkg(platform) {
    return (platform && platform.weatherRef) || null;
  }

  function isLive(platform) {
    var pkg = weatherPkg(platform);
    return !!(pkg && pkg.meta && !pkg.meta.isPlaceholder);
  }

  function wxCtx(platform) {
    var pkg = weatherPkg(platform);
    var cur = pkg && pkg.current;
    var today = pkg && pkg.daily && pkg.daily[0];
    var live = isLive(platform);
    var temp = num(cur && cur.temperature);
    var feels = num(cur && cur.feelsLike);
    if (feels == null) feels = temp;
    var humidity = num(cur && cur.humidity);
    var uv = num(cur && cur.uvIndex);
    var wind = cur && cur.wind && num(cur.wind.speed);
    var pop = num(cur && cur.precipitation && cur.precipitation.probability);
    if (pop == null && today && today.precipitation) pop = num(today.precipitation.probability);
    var cond = ((cur && cur.conditions && cur.conditions.summary) || "").toLowerCase();
    var rain = platform && platform.rainfall && platform.rainfall.recent;
    return {
      live: live,
      temp: temp,
      feels: feels,
      humidity: humidity,
      uv: uv,
      wind: wind,
      pop: pop,
      cond: cond,
      rainAmt: rain ? num(rain.amount) : null
    };
  }

  function monthNow(platform) {
    if (platform && platform.calendar && platform.calendar.month) return platform.calendar.month;
    return new Date().getMonth() + 1;
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

  function buildTickActivity(platform, wx, month) {
    var elevated = month >= 4 && month <= 10;
    if (wx.live && wx.temp != null && wx.temp >= 50 && wx.humidity != null && wx.humidity >= 55 && elevated) {
      return card(
        "tick-activity", "🕷", "Tick Activity",
        elevated && wx.temp >= 60 ? "moderate" : "low",
        "Tick season — check after field time",
        "Full-body tick check within a few hours of being outside; permethrin on gear helps.",
        "Activity rises with warm, humid days — stay on trail center when possible.",
        "expected", "tickActivity", null
      );
    }
    if (elevated) {
      return card(
        "tick-activity", "🕷", "Tick Activity",
        "low",
        "Tick season underway",
        "Light-colored clothing makes checks easier; focus on socks, waist, and hairline.",
        "Live humidity model pending — assume ticks in brushy edges April through October.",
        "educational", "tickActivity", null
      );
    }
    return card(
      "tick-activity", "🕷", "Tick Activity",
      "quiet",
      "Lower tick pressure expected",
      "Still check after any brush contact — mild days can surprise.",
      "Peak activity typically spring through fall in the Northeast.",
      "educational", "tickActivity", null
    );
  }

  function buildMosquitoActivity(platform, wx, month) {
    if (wx.live && wx.temp != null && wx.temp >= 60 && wx.humidity != null && wx.humidity >= 65) {
      return card(
        "mosquito-activity", "🦟", "Mosquito Activity",
        wx.humidity >= 75 ? "moderate" : "low",
        "Warm and humid — bites more likely at dusk",
        "Long sleeves or repellent near still water; head inside if swarming.",
        "Activity forecast provider not connected — use field cues.",
        wx.live ? "live" : "expected", "mosquitoActivity", null
      );
    }
    if (month >= 5 && month <= 9) {
      return card(
        "mosquito-activity", "🦟", "Mosquito Activity",
        "low",
        "Seasonal bite pressure possible",
        "Repellent for evening outings near wetlands; calm nights see more activity.",
        "Full entomology forecast coming when provider connects.",
        "educational", "mosquitoActivity", null
      );
    }
    return card(
      "mosquito-activity", "🦟", "Mosquito Activity",
      "quiet",
      "Quiet period for mosquitoes",
      "Cool or dry stretches reduce bite pressure.",
      "Preview feed pending for your area.",
      "future", "mosquitoActivity", null
    );
  }

  function buildHeatRisk(wx) {
    if (!wx.live || wx.feels == null) {
      return card(
        "heat-risk", "☀", "Heat Risk",
        "quiet",
        "Heat data unavailable",
        "On warm days: start early, carry water, and know shade on your route.",
        "Live feels-like temperature will refine this card.",
        "educational", "heatRisk", null
      );
    }
    if (wx.feels >= 92) {
      return card(
        "heat-risk", "☀", "Heat Risk",
        "elevated",
        "Feels like " + Math.round(wx.feels) + "° — pace accordingly",
        "Shorten exertion, drink regularly, and rest in shade mid-day.",
        "Heat stress builds quietly — plan turnaround time before you start.",
        "live", "heatRisk", Math.round(wx.feels) + "°"
      );
    }
    if (wx.feels >= 82) {
      return card(
        "heat-risk", "☀", "Heat Risk",
        "moderate",
        "Feels like " + Math.round(wx.feels) + "°",
        "Extra water and an earlier start make long routes more comfortable.",
        "Humidity may add load even when air temperature looks mild.",
        "live", "heatRisk", Math.round(wx.feels) + "°"
      );
    }
    return card(
      "heat-risk", "☀", "Heat Risk",
      "low",
      "Comfortable heat load",
      "Standard hydration — conditions look manageable for sustained activity.",
      "Feels like " + Math.round(wx.feels) + "° now.",
      "live", "heatRisk", Math.round(wx.feels) + "°"
    );
  }

  function buildStormRisk(wx) {
    if (!wx.live) {
      return card(
        "storm-risk", "⛈", "Storm Risk",
        "quiet",
        "Storm forecast unavailable",
        "Before ridges: check hourly forecast locally the morning you go.",
        "Live precip probability will populate when weather loads.",
        "educational", "stormRisk", null
      );
    }
    if (/thunder|lightning|storm/.test(wx.cond) || (wx.pop != null && wx.pop >= 70)) {
      return card(
        "storm-risk", "⛈", "Storm Risk",
        "elevated",
        "Storms possible today",
        "Have a below-treeline exit plan; avoid exposed summits if thunder develops.",
        wx.pop != null ? Math.round(wx.pop) + "% precip chance now" : wx.cond,
        "live", "stormRisk", wx.pop != null ? Math.round(wx.pop) + "%" : null
      );
    }
    if (wx.pop != null && wx.pop >= 40) {
      return card(
        "storm-risk", "⛈", "Storm Risk",
        "moderate",
        Math.round(wx.pop) + "% chance of rain or storms",
        "Watch the western horizon on afternoon hikes; turn back if you hear thunder.",
        "Pop-up cells are common on warm afternoons.",
        "live", "stormRisk", Math.round(wx.pop) + "%"
      );
    }
    return card(
      "storm-risk", "⛈", "Storm Risk",
      "low",
      "Low storm likelihood now",
      "Still worth a quick hourly check before long ridge routes.",
      wx.pop != null ? Math.round(wx.pop) + "% precip probability" : "Conditions look settled.",
      "live", "stormRisk", wx.pop != null ? Math.round(wx.pop) + "%" : null
    );
  }

  function buildAirQuality() {
    return card(
      "air-quality", "💨", "Air Quality",
      "quiet",
      "AQI feed not connected",
      "On hazy days, shorten exertion and watch for smoke smell.",
      "Air quality index and smoke alerts will appear when provider connects.",
      "future", "airQuality", "—"
    );
  }

  function buildFireDanger(platform, wx) {
    if (wx.live && wx.humidity != null && wx.humidity < 35 && wx.wind != null && wx.wind >= 12) {
      return card(
        "fire-danger", "🔥", "Fire Danger",
        "moderate",
        "Dry and breezy — use extra care with fire",
        "Check local burn bans; fully extinguish camp stoves and never leave coals.",
        "Fire weather index feed pending — use official state forestry notices.",
        "expected", "fireDanger", null
      );
    }
    return card(
      "fire-danger", "🔥", "Fire Danger",
      "quiet",
      "No elevated fire signal from weather",
      "Always follow local burn restrictions and campfire rules.",
      "Live fire weather index and burn ban API not connected yet.",
      "future", "fireDanger", null
    );
  }

  function buildUvIndex(wx) {
    if (!wx.live || wx.uv == null) {
      return card(
        "uv-index", "UV", "UV Index",
        "quiet",
        "UV data unavailable",
        "Hat, sunscreen, and sunglasses on open ridges regardless of index.",
        "Live UV index loads with weather data.",
        "educational", "uvIndex", null
      );
    }
    var u = Math.round(wx.uv);
    if (u >= 8) {
      return card(
        "uv-index", "UV", "UV Index",
        "elevated",
        "UV " + u + " — high exposure",
        "Sunscreen, hat, and shade breaks on open trails mid-day.",
        "Reflection from water and rock adds exposure.",
        "live", "uvIndex", String(u)
      );
    }
    if (u >= 5) {
      return card(
        "uv-index", "UV", "UV Index",
        "moderate",
        "UV " + u + " — moderate",
        "Sun protection sensible for multi-hour outings.",
        "Morning and evening windows are gentler on skin.",
        "live", "uvIndex", String(u)
      );
    }
    return card(
      "uv-index", "UV", "UV Index",
      "low",
      "UV " + u + " — low",
      "Basic sun habits still help on long days outside.",
      "Index may rise if clouds clear.",
      "live", "uvIndex", String(u)
    );
  }

  function buildWaterSafety(platform, wx) {
    var notes = observationsMatching(platform, /crossing|creek|river|water|flood|standing water/i);
    if (notes.length) {
      return card(
        "water-safety", "💧", "Water Safety",
        "moderate",
        "Water crossings need extra care",
        notes[0].title,
        "Unfastened crossings after rain — turn back is valid field judgment.",
        "editorial", "waterSafety", null
      );
    }
    if (wx.rainAmt != null && wx.rainAmt > 0.5) {
      return card(
        "water-safety", "💧", "Water Safety",
        "moderate",
        "Recent rain may raise creek levels",
        "Test crossings with a pole; link arms in groups; avoid after dark.",
        wx.rainAmt.toFixed(2) + " in recent rainfall totals.",
        "editorial", "waterSafety", null
      );
    }
    return card(
      "water-safety", "💧", "Water Safety",
      "low",
      "Standard water crossing awareness",
      "Rocks stay slick after rain even when levels drop.",
      "See Water dashboard for hydrology context.",
      "educational", "waterSafety", null
    );
  }

  function buildGeneralAdvisories(platform) {
    var notes = observationsMatching(platform, /bear|advisory|secure|alert|game commission|park|trail|mud|tick/i);
    var cons = platform && platform.conservation && platform.conservation.current;
    var items = [];
    if (notes.length) items.push(notes[0].title);
    if (cons && cons.title) items.push(cons.title);
    if (items.length) {
      return card(
        "general-advisories", "📋", "Outdoor Advisories",
        "moderate",
        items[0],
        items.length > 1 ? items[1] : "Confirm details with official sources before your trip.",
        notes[0] && notes[0].body ? notes[0].body.split(".").slice(0, 1).join(".") + "." : "",
        "editorial", "generalAdvisories", null
      );
    }
    return card(
      "general-advisories", "📋", "Outdoor Advisories",
      "quiet",
      "No regional advisories on file",
      "Check park and state agency sites the morning you head out.",
      "Editorial field notes and agency feeds will surface here.",
      "educational", "generalAdvisories", null
    );
  }

  function overallLevel(cards) {
    if (cards.some(function (c) { return c.level === "elevated"; })) return "elevated";
    if (cards.filter(function (c) { return c.level === "moderate"; }).length >= 2) return "moderate";
    if (cards.some(function (c) { return c.level === "moderate"; })) return "moderate";
    return "low";
  }

  function analyze(platform) {
    if (!platform) return null;
    var wx = wxCtx(platform);
    var month = monthNow(platform);
    var cards = {
      tickActivity: buildTickActivity(platform, wx, month),
      mosquitoActivity: buildMosquitoActivity(platform, wx, month),
      heatRisk: buildHeatRisk(wx),
      stormRisk: buildStormRisk(wx),
      airQuality: buildAirQuality(),
      fireDanger: buildFireDanger(platform, wx),
      uvIndex: buildUvIndex(wx),
      waterSafety: buildWaterSafety(platform, wx),
      generalAdvisories: buildGeneralAdvisories(platform)
    };
    var list = [
      cards.tickActivity,
      cards.mosquitoActivity,
      cards.heatRisk,
      cards.stormRisk,
      cards.airQuality,
      cards.fireDanger,
      cards.uvIndex,
      cards.waterSafety,
      cards.generalAdvisories
    ];
    return {
      cards: cards,
      cardList: list,
      overallLevel: overallLevel(list),
      hasLiveWeather: wx.live,
      feedRegistry: FEED_REGISTRY,
      regionLabel: (platform.region && platform.region.label) ||
        (platform.geography && platform.geography.ecoregion) || null
    };
  }

  function summary(intel) {
    if (!intel) return null;
    var elevated = intel.cardList.filter(function (c) { return c.level === "elevated" || c.level === "moderate"; });
    if (elevated.length) return elevated[0].headline;
    return "Conditions look manageable — plan as usual";
  }

  global.WDS = global.WDS || {};
  global.WDS.safetyDashboardIntel = { analyze: analyze, summary: summary, FEED_REGISTRY: FEED_REGISTRY };
})(window);
