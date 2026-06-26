/**
 * Foraging dashboard intelligence — seasonal context with strict observation ethics.
 * Never implies guaranteed locations or encourages overharvesting.
 */
(function (global) {
  "use strict";

  var FEED_REGISTRY = {
    speciesInSeason: { slot: "species-in-season", provider: "phenology-network", status: "partial" },
    recentRainfall: { slot: "recent-rainfall", provider: "open-meteo", status: "partial" },
    habitatMoisture: { slot: "habitat-moisture", provider: "composite", status: "partial" },
    soilTemperature: { slot: "soil-temperature", provider: "soil-sensor-network", status: "pending" },
    educationalNotes: { slot: "foraging-education", provider: "editorial", status: "partial" }
  };

  var ETHICS_LEAD = "Identify with confidence · Observe before collecting · No location guarantees";

  function card(id, icon, label, state, headline, detail, ethicsNote, source, feedKey, items) {
    var feed = FEED_REGISTRY[feedKey] || null;
    return {
      id: id,
      icon: icon,
      label: label,
      state: state || "empty",
      headline: headline,
      detail: detail || "",
      ethicsNote: ethicsNote || "",
      items: items || [],
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

  function allSpecies(platform) {
    var out = [];
    var sp = platform && platform.species;
    var watch = platform && platform.phenology && platform.phenology.watch;
    function push(list, bucket) {
      if (!list || !list.length) return;
      list.forEach(function (e) {
        out.push({ name: e.name, status: e.status, note: e.note, bucket: bucket });
      });
    }
    if (watch) {
      push(watch.activeNow, "active");
      push(watch.ending, "ending");
      push(watch.comingSoon, "coming");
    } else if (sp) {
      push(sp.active, "active");
      push(sp.ending, "ending");
      push(sp.comingSoon, "coming");
    }
    return out;
  }

  function edibleSpecies(platform, bundle) {
    var all = allSpecies(platform);
    var edibleRe = /morel|chanterelle|mushroom|fungi|berry|blueberry|ramps|leek|edible|fungus|oyster|bolete/i;
    var filtered = all.filter(function (e) {
      var hay = ((e.name || "") + " " + (e.note || "")).toLowerCase();
      return edibleRe.test(hay);
    });
    if (filtered.length) return filtered;

    var fp = bundle && bundle.foragecastPreview;
    if (fp && fp.fruitingOutlook && fp.fruitingOutlook.length) {
      return fp.fruitingOutlook.slice(0, 5).map(function (row) {
        return {
          name: row.species || row.name || "Species",
          status: row.status || "watch",
          note: row.note || "Educational outlook — not a harvest guarantee",
          bucket: "outlook"
        };
      });
    }
    return [];
  }

  function weatherCtx(platform) {
    var ref = platform && platform.weatherRef;
    var cur = ref && ref.current;
    var live = !!(ref && ref.meta && !ref.meta.isPlaceholder);
    var rain = platform && platform.rainfall && platform.rainfall.recent;
    var humidity = parseNum(cur && cur.humidity);
    var temp = parseNum(cur && cur.temperature);
    var cond = ((cur && cur.conditions && cur.conditions.summary) || "").toLowerCase();
    return {
      live: live,
      rainAmt: rain ? parseNum(rain.amount) : null,
      rainDays: rain && rain.periodDays ? rain.periodDays : 7,
      rainUnit: rain && rain.unit ? rain.unit : "in",
      rainSummary: rain && rain.summary ? rain.summary : null,
      humidity: humidity,
      temp: temp,
      rainy: /rain|shower|drizzle|storm/.test(cond)
    };
  }

  function buildSpeciesInSeason(platform, bundle) {
    var species = edibleSpecies(platform, bundle);
    if (species.length) {
      return card(
        "species-in-season", "🍄", "Species in Season",
        "ready",
        species.length + " species on regional watch",
        "Timing is educational — fruiting and ripening vary by microclimate and year.",
        "Never treat watch lists as harvest maps. Confirm ID with multiple field marks.",
        "editorial", "speciesInSeason",
        species.slice(0, 6).map(function (s) {
          return {
            name: s.name,
            status: s.bucket === "ending" ? "ending" : (s.status || s.bucket),
            note: s.note || ""
          };
        })
      );
    }
    return card(
      "species-in-season", "🍄", "Species in Season",
      "empty",
      "No edible species flagged this week",
      "Regional phenology watch will list fungi and plants when seasons shift — not location data.",
      "Use ForageCast to learn habitat patterns, not spot lists.",
      "educational", "speciesInSeason", []
    );
  }

  function buildRecentRainfall(platform, wx) {
    if (wx.rainAmt != null) {
      return card(
        "recent-rainfall", "🌧", "Recent Rainfall",
        "ready",
        wx.rainAmt.toFixed(2) + " " + wx.rainUnit + " in " + wx.rainDays + " days",
        wx.rainSummary || "Moisture context shapes fruiting potential — not a fruiting guarantee.",
        "Rain helps explain ecology; it does not reveal where to collect.",
        platform.rainfall && platform.rainfall.recent ? "editorial" : "live",
        "recentRainfall", []
      );
    }
    if (wx.live && wx.rainy) {
      return card(
        "recent-rainfall", "🌧", "Recent Rainfall",
        "ready",
        "Active precipitation in forecast",
        "Wet periods may favor fungi a few days later — verify every ID in the field.",
        "Observation window, not a collection schedule.",
        "live", "recentRainfall", []
      );
    }
    return card(
      "recent-rainfall", "🌧", "Recent Rainfall",
      "unavailable",
      "Rainfall totals unavailable",
      "7-day precipitation will display when regional rainfall records load.",
      "Note soil moisture and leaf litter by feel — field evidence over apps.",
      "educational", "recentRainfall", []
    );
  }

  function buildHabitatMoisture(platform, wx) {
    var OW = global.WDS && global.WDS.outdoorWeatherIntel;
    var mushroom = OW && OW.mushroomWeather && platform.weatherRef
      ? OW.mushroomWeather(platform.weatherRef) : null;
    if (mushroom && mushroom.headline) {
      return card(
        "habitat-moisture", "💧", "Habitat Moisture",
        "ready",
        mushroom.headline,
        mushroom.detail || "Weather-informed moisture cue — habitat varies within a mile.",
        "Investigate shaded hardwood slopes after rain; leave small specimens and cut at soil line.",
        wx.live ? "live" : "expected", "habitatMoisture", []
      );
    }
    if (wx.rainAmt != null && wx.rainAmt > 0.3) {
      return card(
        "habitat-moisture", "💧", "Habitat Moisture",
        "ready",
        "Recent rain may elevate soil moisture",
        "Valley bottoms and north slopes often retain moisture longer than open ridges.",
        "Look for habitat partners (tree species, slope aspect) — not pinned coordinates.",
        "editorial", "habitatMoisture", []
      );
    }
    if (wx.humidity != null && wx.humidity >= 70) {
      return card(
        "habitat-moisture", "💧", "Habitat Moisture",
        "empty",
        "Humid conditions — moisture may linger in shade",
        "Humidity " + Math.round(wx.humidity) + "% — microhabitat still drives fruiting.",
        "Log conditions in Fieldry for your own learning curve.",
        wx.live ? "live" : "expected", "habitatMoisture", []
      );
    }
    return card(
      "habitat-moisture", "💧", "Habitat Moisture",
      "empty",
      "Moisture signals limited this week",
      "Habitat moisture integrates rain, humidity, and substrate — full model pending.",
      "Dry litter and cracked soil suggest low fruiting pressure — still investigate ethically.",
      "educational", "habitatMoisture", []
    );
  }

  function buildSoilTemperature() {
    return card(
      "soil-temperature", "🌡", "Soil Temperature",
      "pending",
      "Soil temperature feed pending",
      "Subsurface temperature probes and modeled soil temps will support phenology timing.",
      "Until connected, note sun aspect and recent nights — cool soils delay spring fungi.",
      "future", "soilTemperature", []
    );
  }

  function buildEducationalNotes(platform, bundle) {
    var notes = [];
    var sw = bundle && bundle.seasonalWatch;
    if (sw && sw.watchCards && sw.watchCards.length) {
      sw.watchCards.forEach(function (wc) {
        if (wc.observeEthically) notes.push(wc.name + ": " + wc.observeEthically);
      });
    }
    if (sw && sw.outdoorChallenge) {
      notes.push("Field challenge: " + sw.outdoorChallenge);
    }
    notes.push("Cut fungi at soil line; leave young specimens.");
    notes.push("Never share exact harvest coordinates publicly.");
    notes.push("When in doubt, photograph and do not collect.");

    return card(
      "educational-notes", "📖", "Educational Notes",
      notes.length > 2 ? "ready" : "ready",
      "Observation over collection",
      "Foraging intelligence teaches timing and habitat literacy — not guaranteed yields.",
      ETHICS_LEAD,
      "editorial", "educationalNotes",
      notes.slice(0, 5).map(function (n) {
        return { name: n, status: "", note: "" };
      })
    );
  }

  function analyze(platform, bundle) {
    if (!platform) return null;
    bundle = bundle || {};
    var wx = weatherCtx(platform);
    var cards = {
      speciesInSeason: buildSpeciesInSeason(platform, bundle),
      recentRainfall: buildRecentRainfall(platform, wx),
      habitatMoisture: buildHabitatMoisture(platform, wx),
      soilTemperature: buildSoilTemperature(),
      educationalNotes: buildEducationalNotes(platform, bundle)
    };
    var list = [
      cards.speciesInSeason,
      cards.recentRainfall,
      cards.habitatMoisture,
      cards.soilTemperature,
      cards.educationalNotes
    ];
    return {
      cards: cards,
      cardList: list,
      ethicsLead: ETHICS_LEAD,
      readyCount: list.filter(function (c) { return c.state === "ready"; }).length,
      hasLiveWeather: wx.live,
      feedRegistry: FEED_REGISTRY,
      regionLabel: (platform.region && platform.region.label) ||
        (platform.geography && platform.geography.ecoregion) || null
    };
  }

  function summary(intel) {
    if (!intel || !intel.cards) return null;
    var s = intel.cards.speciesInSeason;
    if (s && s.state === "ready") return s.headline;
    var r = intel.cards.recentRainfall;
    if (r && r.state === "ready") return r.headline;
    return "Foraging conditions";
  }

  global.WDS = global.WDS || {};
  global.WDS.foragingDashboardIntel = {
    analyze: analyze,
    summary: summary,
    FEED_REGISTRY: FEED_REGISTRY,
    ETHICS_LEAD: ETHICS_LEAD
  };
})(window);
