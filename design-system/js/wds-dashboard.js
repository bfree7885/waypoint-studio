/**
 * Waypoint Studio — Dashboard view adapter
 * Maps WDS.outdoorIntelligence packages to homepage dashboard card models.
 * Presentation only — no business logic; all data from the platform.
 */
(function (global) {
  "use strict";

  var CARD_ORDER = [
    "weather",
    "outdoor-conditions",
    "seasonal-watch",
    "species-active",
    "wildlife",
    "trails",
    "water",
    "sun-moon"
  ];

  var EDUCATIONAL = {
    "outdoor-conditions":
      "Regional air, soil, and season cues appear here once your location is set. Allow browser location or choose a county to load editorial field snapshot notes.",
    "seasonal-watch":
      "Phenology may shift week to week — blooms, fruit set, and migration windows list here when regional editorial watch data is available for your area.",
    "species-active":
      "Species to watch draw from seasonal editorial notes and field guides. Check back after regional intelligence loads, or browse the species spotlight below.",
    wildlife:
      "Wildlife activity varies by elevation and recent weather. Editorial field notes help interpret what may be moving near trails and waterways.",
    trails:
      "Trail conditions depend on recent rain, frost, and use. Mud often lingers in ravines while ridge tops dry first — always verify locally before long climbs.",
    water:
      "Creek and river levels shift with recent rain. Look for mud lines on banks and floating debris before crossing — live gauge integration is coming soon."
  };

  function sliceReady(slice) {
    if (!slice) return false;
    return slice.status === "live" || slice.status === "editorial";
  }

  function hasItems(list) {
    return Array.isArray(list) && list.length > 0;
  }

  function indexBundleCards(bundle) {
    var cards = bundle &&
      bundle.thisWeekOutdoors &&
      bundle.thisWeekOutdoors.outdoorDashboard &&
      bundle.thisWeekOutdoors.outdoorDashboard.cards;
    var map = {};
    (cards || []).forEach(function (card) {
      if (card && card.id) map[card.id] = card;
    });
    return map;
  }

  function placeholderCard(id, title, message, extras) {
    extras = extras || {};
    return Object.assign({
      id: id,
      title: title,
      source: "placeholder",
      placeholder: message || EDUCATIONAL[id] || "Regional data unavailable right now."
    }, extras);
  }

  function editorialMeta(platform) {
    if (platform.weather && platform.weather.status === "live") {
      return { source: "live", sourceLabel: "Live" };
    }
    return { source: "editorial", sourceLabel: "Editorial field snapshot" };
  }

  function formatRainfall(rainfall) {
    if (!rainfall || !rainfall.recent) return null;
    var r = rainfall.recent;
    var parts = [];
    if (r.summary) parts.push(r.summary);
    if (r.amount != null) {
      parts.push(
        r.amount + " " + (r.unit || "in") + " in " + (r.periodDays || 7) + " days"
      );
    }
    return parts.join(" · ");
  }

  function speciesGroupLabel(key) {
    var P = global.WDS && (global.WDS.researchIntegrity || global.WDS.provenance);
    if (P && P.groupLabel) {
      if (key === "activeNow") return P.groupLabel("activeNow");
      if (key === "ending") return P.groupLabel("ending");
      if (key === "comingSoon") return P.groupLabel("comingSoon");
    }
    if (key === "activeNow") return "Likely this week";
    if (key === "ending") return "May be ending";
    if (key === "comingSoon") return "On watch";
    return key;
  }

  function speciesGroups(platform) {
    var watch = platform.phenology && platform.phenology.watch;
    if (watch && (hasItems(watch.activeNow) || hasItems(watch.ending) || hasItems(watch.comingSoon))) {
      return [
        hasItems(watch.activeNow) ? { label: speciesGroupLabel("activeNow"), items: watch.activeNow } : null,
        hasItems(watch.ending) ? { label: speciesGroupLabel("ending"), items: watch.ending } : null,
        hasItems(watch.comingSoon) ? { label: speciesGroupLabel("comingSoon"), items: watch.comingSoon } : null
      ].filter(Boolean);
    }
    var sp = platform.species;
    if (sliceReady(sp)) {
      return [
        hasItems(sp.active) ? { label: speciesGroupLabel("activeNow"), items: sp.active } : null,
        hasItems(sp.ending) ? { label: speciesGroupLabel("ending"), items: sp.ending } : null,
        hasItems(sp.comingSoon) ? { label: speciesGroupLabel("comingSoon"), items: sp.comingSoon } : null
      ].filter(Boolean);
    }
    return null;
  }

  function observationsMatching(platform, pattern) {
    var obs = platform.observations;
    if (!sliceReady(obs) || !hasItems(obs.items)) return [];
    return obs.items.filter(function (item) {
      var haystack = ((item.title || "") + " " + (item.body || "")).toLowerCase();
      return pattern.test(haystack);
    });
  }

  function buildWeatherCard() {
    return { id: "weather", title: "Weather", source: "live" };
  }

  function buildSunMoonCard() {
    return { id: "sun-moon", title: "Sun / Moon", source: "live" };
  }

  function buildOutdoorConditionsCard(platform, fallback) {
    var meta = editorialMeta(platform);
    var items = [];
    var body = null;
    var w = platform.weather;

    if (sliceReady(w)) {
      if (w.conditions) body = w.conditions;
      if (w.high || w.low) {
        items.push("Today: " + [w.high, w.low].filter(Boolean).join(" / "));
      }
      if (w.summary && !body) body = w.summary;
    }

    var rainLine = formatRainfall(platform.rainfall);
    if (rainLine) items.push(rainLine);

    if (platform.calendar && platform.calendar.season) {
      items.push("Season: " + platform.calendar.season);
    }
    if (platform.phenology && platform.phenology.stage) {
      items.push("Phenology: " + platform.phenology.stage);
    }
    if (platform.geography && platform.geography.ecoregion) {
      items.push("Ecoregion: " + platform.geography.ecoregion);
    }

    if (!body && !items.length) {
      if (fallback && fallback.source !== "placeholder") return Object.assign({}, fallback);
      return placeholderCard("outdoor-conditions", "Outdoor Conditions", EDUCATIONAL["outdoor-conditions"]);
    }

    return Object.assign({
      id: "outdoor-conditions",
      title: "Outdoor Conditions",
      body: body,
      items: items.length ? items : undefined
    }, meta);
  }

  function buildSeasonalWatchCard(platform, fallback) {
    var groups = speciesGroups(platform);
    if (groups && groups.length) {
      return Object.assign({
        id: "seasonal-watch",
        title: "Seasonal Watch",
        groups: groups,
        highlight: platform.phenology && platform.phenology.summary
      }, editorialMeta(platform));
    }
    if (fallback && fallback.source !== "placeholder") return Object.assign({}, fallback);
    return placeholderCard("seasonal-watch", "Seasonal Watch", EDUCATIONAL["seasonal-watch"]);
  }

  function buildSpeciesActiveCard(platform, fallback) {
    var sp = platform.species;
    if (sliceReady(sp) && hasItems(sp.active)) {
      return Object.assign({
        id: "species-active",
        title: "Species to Watch",
        items: sp.active
      }, editorialMeta(platform));
    }
    if (fallback && fallback.source !== "placeholder") return Object.assign({}, fallback);
    return placeholderCard("species-active", "Species to Watch", EDUCATIONAL["species-active"]);
  }

  function buildWildlifeCard(platform, fallback) {
    var matches = observationsMatching(platform, /bear|wildlife|bird|deer|warbler|migrat/i);
    if (matches.length) {
      return {
        id: "wildlife",
        title: "Wildlife Notes",
        source: "editorial",
        sourceLabel: "Editorial field notes",
        body: matches[0].body,
        items: matches.slice(0, 3).map(function (n) { return n.title; })
      };
    }
    if (fallback && fallback.source !== "placeholder") return Object.assign({}, fallback);
    return placeholderCard("wildlife", "Wildlife Notes", EDUCATIONAL.wildlife);
  }

  function buildTrailsCard(platform, fallback) {
    var matches = observationsMatching(platform, /trail|mud|ridge|hike|path/i);
    if (matches.length) {
      return {
        id: "trails",
        title: "Trail Conditions",
        source: "editorial",
        sourceLabel: "Editorial field notes",
        body: matches[0].body,
        items: matches.slice(0, 3).map(function (n) { return n.title; })
      };
    }
    if (fallback && fallback.source !== "placeholder") return Object.assign({}, fallback);
    return placeholderCard("trails", "Trail Conditions", EDUCATIONAL.trails);
  }

  function buildWaterCard(platform, fallback) {
    var rainLine = formatRainfall(platform.rainfall);
    var watersheds = platform.geography && platform.geography.watersheds;
    var items = [];
    var body = null;

    if (rainLine) {
      body = platform.rainfall.recent.summary || rainLine;
      items.push(rainLine);
    }
    if (hasItems(watersheds)) {
      items.push("Watersheds: " + watersheds.join(", "));
    }

    if (body || items.length) {
      return {
        id: "water",
        title: "Water Conditions",
        source: "editorial",
        sourceLabel: "Regional field snapshot",
        body: body,
        items: items
      };
    }
    if (fallback && fallback.body && fallback.source !== "placeholder") {
      return Object.assign({}, fallback, { placeholder: undefined, source: "editorial" });
    }
    return placeholderCard("water", "Water Conditions", EDUCATIONAL.water);
  }

  var BUILDERS = {
    weather: buildWeatherCard,
    "sun-moon": buildSunMoonCard,
    "outdoor-conditions": buildOutdoorConditionsCard,
    "seasonal-watch": buildSeasonalWatchCard,
    "species-active": buildSpeciesActiveCard,
    wildlife: buildWildlifeCard,
    trails: buildTrailsCard,
    water: buildWaterCard
  };

  function buildCards(platform, bundle) {
    platform = platform || null;
    var fallbacks = indexBundleCards(bundle || {});
    if (!platform) {
      return CARD_ORDER.map(function (id) {
        var fb = fallbacks[id];
        if (fb) return Object.assign({}, fb);
        var builder = BUILDERS[id];
        return builder ? builder({ weather: {}, phenology: {}, species: {}, observations: {}, rainfall: {}, geography: {}, calendar: {} }, null) : null;
      }).filter(Boolean);
    }

    return CARD_ORDER.map(function (id) {
      var builder = BUILDERS[id];
      if (!builder) return fallbacks[id] || null;
      return builder(platform, fallbacks[id]);
    }).filter(Boolean);
  }

  function applyToBundle(bundle, platform) {
    if (!bundle) return bundle;
    var cards = buildCards(platform, bundle);
    bundle.outdoorIntelligence = platform;
    if (!bundle.thisWeekOutdoors) bundle.thisWeekOutdoors = {};
    bundle.thisWeekOutdoors.outdoorDashboard = { cards: cards };
    if (platform && platform.calendar) {
      if (platform.calendar.season) bundle.season = platform.calendar.season;
      if (platform.calendar.weekOf) bundle.weekOf = platform.calendar.weekOf;
    }
    return bundle;
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboard = {
    CARD_ORDER: CARD_ORDER,
    buildCards: buildCards,
    applyToBundle: applyToBundle,
    placeholderCard: placeholderCard,
    EDUCATIONAL: EDUCATIONAL
  };
})(window);
