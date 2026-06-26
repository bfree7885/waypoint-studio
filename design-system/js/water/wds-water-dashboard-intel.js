/**
 * Water dashboard intelligence — hydrology from OIP + rainfall; USGS feed registry for future gauges.
 */
(function (global) {
  "use strict";

  var FEED_REGISTRY = {
    riverLevels: {
      slot: "river-levels",
      provider: "usgs-iv",
      gaugeType: "stage",
      label: "USGS river stage (IV)",
      status: "pending"
    },
    streamFlow: {
      slot: "stream-flow",
      provider: "usgs-iv",
      gaugeType: "discharge",
      label: "USGS streamflow (cfs)",
      status: "pending"
    },
    waterTemperature: {
      slot: "water-temperature",
      provider: "usgs-iv",
      gaugeType: "temperature",
      label: "USGS water temperature",
      status: "pending"
    },
    fishingConditions: {
      slot: "fishing-conditions",
      provider: "usgs-fishing",
      label: "Fishing conditions composite",
      status: "pending"
    },
    floodStatus: {
      slot: "flood-status",
      provider: "nws-flood",
      label: "NWS flood watches and stages",
      status: "pending"
    },
    reservoirConditions: {
      slot: "reservoir-conditions",
      provider: "usace-reservoir",
      label: "Reservoir pool and release data",
      status: "pending"
    },
    recentRainfall: {
      slot: "recent-rainfall",
      provider: "open-meteo",
      label: "Precipitation totals",
      status: "partial"
    },
    hydrologySummary: {
      slot: "hydrology-summary",
      provider: "composite",
      label: "Regional hydrology synthesis",
      status: "partial"
    }
  };

  function card(id, icon, label, state, headline, detail, action, source, feedKey, value) {
    var feed = FEED_REGISTRY[feedKey] || null;
    return {
      id: id,
      icon: icon,
      label: label,
      state: state || "pending",
      headline: headline,
      detail: detail || "",
      action: action || "",
      source: source || "future",
      value: value != null ? value : null,
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

  function watersheds(platform) {
    var w = platform && platform.geography && platform.geography.watersheds;
    return Array.isArray(w) && w.length ? w : [];
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

  function weatherCtx(platform) {
    var ref = platform && platform.weatherRef;
    var cur = ref && ref.current;
    var live = !!(ref && ref.meta && !ref.meta.isPlaceholder);
    var cond = ((cur && cur.conditions && cur.conditions.summary) ||
      (platform.weather && platform.weather.conditions) || "").toLowerCase();
    var rain = platform && platform.rainfall && platform.rainfall.recent;
    return {
      live: live,
      conditions: cond,
      rainy: /rain|shower|drizzle|storm|thunder/.test(cond),
      rainAmt: rain ? parseNum(rain.amount) : null,
      rainDays: rain && rain.periodDays ? rain.periodDays : 7,
      rainUnit: rain && rain.unit ? rain.unit : "in",
      rainSummary: rain && rain.summary ? rain.summary : null
    };
  }

  function watershedLabel(platform) {
    var ws = watersheds(platform);
    if (ws.length) return ws.slice(0, 3).join(" · ");
    return null;
  }

  function buildRiverLevels(platform) {
    var ws = watershedLabel(platform);
    var notes = observationsMatching(platform, /river|delaware|lackawaxen|creek crossing|water level/i);
    if (notes.length && /high|cross|flood|elevated|mud|water/i.test(notes[0].title + notes[0].body)) {
      return card(
        "river-levels", "〰", "River Levels",
        "ready",
        notes[0].title,
        notes[0].body ? notes[0].body.split(".").slice(0, 2).join(".") + "." : "",
        "Editorial note only — not a live gauge reading.",
        "editorial", "riverLevels", null
      );
    }
    return card(
      "river-levels", "〰", "River Levels",
      "empty",
      "No live gauge connected",
      ws
        ? "Primary watersheds: " + ws + ". USGS stage data will populate when gauges are linked."
        : "USGS Instantaneous Values (IV) service will supply river stage at nearby gauges.",
      "Check USGS WaterWatch for your river until live feed is active.",
      "future", "riverLevels", "—"
    );
  }

  function buildStreamFlow(platform) {
    var notes = observationsMatching(platform, /creek|stream|flow|crossing|cfs|tributary/i);
    if (notes.length) {
      return card(
        "stream-flow", "≋", "Stream Flow",
        "ready",
        "Crossing conditions noted regionally",
        notes[0].body ? notes[0].body.split(".").slice(0, 2).join(".") + "." : notes[0].title,
        "Unbridged crossings may differ from main-stem gauges.",
        "editorial", "streamFlow", null
      );
    }
    return card(
      "stream-flow", "≋", "Stream Flow",
      "empty",
      "Streamflow (cfs) not available",
      "Tributary discharge from USGS IV will support paddling and wading decisions.",
      "Treat high, muddy tributaries as unsafe until you verify locally.",
      "future", "streamFlow", "—"
    );
  }

  function buildWaterTemperature(platform, wx) {
    if (wx.rainAmt != null && wx.rainAmt > 0.5) {
      return card(
        "water-temperature", "🌡", "Water Temperature",
        "empty",
        "Gauge temperature pending",
        "Recent rain often cools small streams — surface temps lag air by hours.",
        "USGS temperature parameters will appear at selected gauge sites.",
        "expected", "waterTemperature", "—"
      );
    }
    return card(
      "water-temperature", "🌡", "Water Temperature",
      "empty",
      "No surface water temperature feed",
      "USGS water-temperature parameters (00010) will display when gauges connect.",
      "Cold headwater streams may stay below 55 °F well into summer.",
      "future", "waterTemperature", "—"
    );
  }

  function buildFishingConditions(platform, wx) {
    var ws = watershedLabel(platform);
    return card(
      "fishing-conditions", "🎣", "Fishing Conditions",
      "empty",
      "Fishing intel preview",
      ws
        ? "Future composite will combine flow, temperature, and season for " + ws.split(" · ")[0] + " tributaries."
        : "Flow, temperature, and season composite — provider not connected.",
      "Not a stocking schedule or regulations guide — verify PA Fish & Boat Commission rules.",
      "future", "fishingConditions", null
    );
  }

  function buildFloodStatus(platform, wx) {
    var notes = observationsMatching(platform, /flood|high water|standing water|crossing/i);
    if (notes.length && /flood|high|standing|cross/i.test(notes[0].title + notes[0].body)) {
      return card(
        "flood-status", "⚠", "Flood Status",
        "ready",
        "Water-related hazard noted",
        notes[0].body ? notes[0].body.split(".").slice(0, 2).join(".") + "." : notes[0].title,
        "Not an official NWS bulletin — confirm alerts before travel.",
        "editorial", "floodStatus", null
      );
    }
    if (wx.rainAmt != null && wx.rainAmt >= 2) {
      return card(
        "flood-status", "⚠", "Flood Status",
        "ready",
        "Heavy recent rainfall — monitor low areas",
        wx.rainSummary || (wx.rainAmt.toFixed(2) + " " + wx.rainUnit + " in " + wx.rainDays + " days"),
        "NWS flood products not connected — check weather.gov for official watches.",
        wx.live ? "live" : "editorial", "floodStatus", null
      );
    }
    return card(
      "flood-status", "⚠", "Flood Status",
      "empty",
      "No active flood feed",
      "NWS flood watches, warnings, and river forecast points will populate this card.",
      "After heavy rain, assume low crossings unsafe until verified.",
      "future", "floodStatus", "None"
    );
  }

  function buildReservoirConditions(platform) {
    var ws = watersheds(platform);
    var hasReservoir = ws.some(function (w) {
      return /wallenpaupack|reservoir|lake|pond/i.test(w);
    });
    var label = hasReservoir ? "Regional impoundments on watch list" : "Reservoir data pending";
    return card(
      "reservoir-conditions", "🏗", "Reservoir Conditions",
      "empty",
      label,
      hasReservoir
        ? "Pool elevation and release schedules require USACE / utility provider integration."
        : "Reservoir pool and outflow data will appear when provider connects.",
      "Check operator websites for recreation water levels and dam releases.",
      "future", "reservoirConditions", "—"
    );
  }

  function buildRecentRainfall(platform, wx) {
    if (wx.rainAmt != null) {
      var val = wx.rainAmt.toFixed(2) + " " + wx.rainUnit;
      return card(
        "recent-rainfall", "🌧", "Recent Rainfall",
        "ready",
        val + " over " + wx.rainDays + " days",
        wx.rainSummary || "Rainfall shapes stream response, soil moisture, and crossing safety.",
        wx.rainAmt >= 1
          ? "Expect elevated tributary flow for 24–48 hours after heavy totals."
          : "Light totals — main stems may rise modestly while headwaters respond quickly.",
        platform.rainfall && platform.rainfall.recent ? "editorial" : "live",
        "recentRainfall",
        val
      );
    }
    if (wx.live && wx.rainy) {
      return card(
        "recent-rainfall", "🌧", "Recent Rainfall",
        "ready",
        "Rain in current forecast",
        wx.conditions || "Live weather indicates active precipitation.",
        "Gauge totals will refine this card when rainfall archive connects fully.",
        "live", "recentRainfall", null
      );
    }
    return card(
      "recent-rainfall", "🌧", "Recent Rainfall",
      "unavailable",
      "Rainfall totals unavailable",
      "7-day precipitation totals will display from Open-Meteo and regional rainfall records.",
      "Look for dark soil, wheel ruts, and rising creeks as field evidence.",
      "educational", "recentRainfall", "—"
    );
  }

  function buildHydrologySummary(platform, wx) {
    var ws = watershedLabel(platform);
    var notes = observationsMatching(platform, /water|creek|river|crossing|rain|stream|fog/i);
    var parts = [];
    if (wx.rainAmt != null) {
      parts.push(wx.rainAmt.toFixed(2) + " " + wx.rainUnit + " rain in " + wx.rainDays + " days");
    } else if (wx.rainy) {
      parts.push("Active precipitation in forecast");
    }
    if (ws) parts.push("Watersheds: " + ws);
    if (notes.length) {
      parts.push(notes[0].title);
    }
    if (!parts.length) {
      return card(
        "hydrology-summary", "💧", "Hydrology Summary",
        "empty",
        "Awaiting hydrology signals",
        "Connect location to load watershed context and rainfall.",
        "USGS gauge integration will anchor this summary with live stage and flow.",
        "educational", "hydrologySummary", null
      );
    }
    return card(
      "hydrology-summary", "💧", "Hydrology Summary",
      "ready",
      parts[0],
      parts.slice(1).join(" · ") || "Regional hydrology snapshot — not a forecast model.",
      "Crossings, paddling, and fishing decisions still require local verification.",
      wx.rainAmt != null || notes.length ? "editorial" : "expected",
      "hydrologySummary",
      null
    );
  }

  function readyCount(cards) {
    return cards.filter(function (c) { return c.state === "ready"; }).length;
  }

  function analyze(platform) {
    if (!platform) return null;
    var wx = weatherCtx(platform);
    var cards = {
      riverLevels: buildRiverLevels(platform),
      streamFlow: buildStreamFlow(platform),
      waterTemperature: buildWaterTemperature(platform, wx),
      fishingConditions: buildFishingConditions(platform, wx),
      floodStatus: buildFloodStatus(platform, wx),
      reservoirConditions: buildReservoirConditions(platform),
      recentRainfall: buildRecentRainfall(platform, wx),
      hydrologySummary: buildHydrologySummary(platform, wx)
    };
    var list = [
      cards.riverLevels,
      cards.streamFlow,
      cards.waterTemperature,
      cards.fishingConditions,
      cards.floodStatus,
      cards.reservoirConditions,
      cards.recentRainfall,
      cards.hydrologySummary
    ];
    return {
      cards: cards,
      cardList: list,
      readyCount: readyCount(list),
      hasLiveWeather: wx.live,
      hasRainfall: wx.rainAmt != null,
      watersheds: watersheds(platform),
      feedRegistry: FEED_REGISTRY,
      regionLabel: (platform.region && platform.region.label) ||
        (platform.geography && platform.geography.ecoregion) || null
    };
  }

  function summary(intel) {
    if (!intel || !intel.cards) return null;
    var h = intel.cards.hydrologySummary;
    var r = intel.cards.recentRainfall;
    if (r && r.state === "ready" && r.headline) return r.headline;
    if (h && h.state === "ready") return h.headline;
    return intel.watersheds && intel.watersheds.length
      ? intel.watersheds[0] + " watershed"
      : "Water intelligence";
  }

  global.WDS = global.WDS || {};
  global.WDS.waterDashboardIntel = {
    analyze: analyze,
    summary: summary,
    FEED_REGISTRY: FEED_REGISTRY
  };
})(window);
