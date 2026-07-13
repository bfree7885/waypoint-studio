/**
 * ForageCast Today — synthesize location × weather × season × property × intent
 * into a short, actionable plan. No remote AI; deterministic local rules.
 */
(function (global) {
  "use strict";

  function monthIndex(date) {
    return (date || new Date()).getMonth(); // 0-11
  }

  function seasonBucket(m) {
    if (m >= 2 && m <= 4) return "spring";
    if (m >= 5 && m <= 7) return "summer";
    if (m >= 8 && m <= 10) return "autumn";
    return "winter";
  }

  function weatherSignals(platform, homeData) {
    var signals = {
      rainSoon: false,
      rainRecentHint: false,
      hot: false,
      frostRisk: false,
      skipWater: false,
      rainInchesHint: null,
      conditionText: ""
    };
    var weather = platform && platform.modules && platform.modules.weather;
    var current = weather && weather.current;
    var daily = weather && weather.daily;
    if (current && current.conditions) signals.conditionText = String(current.conditions);
    if (daily && Array.isArray(daily) && daily.length) {
      var next = daily[0] || {};
      var precip = Number(next.precipitationSum != null ? next.precipitationSum : next.precipMm);
      if (!isNaN(precip) && precip >= 5) {
        signals.rainSoon = true;
        signals.skipWater = true;
        signals.rainInchesHint = (precip / 25.4).toFixed(1);
      }
      var tmin = Number(next.temperatureMin != null ? next.temperatureMin : next.tMin);
      if (!isNaN(tmin) && tmin <= 2) signals.frostRisk = true;
      var tmax = Number(next.temperatureMax != null ? next.temperatureMax : next.tMax);
      if (!isNaN(tmax) && tmax >= 30) signals.hot = true;
    }
    var rs = homeData && homeData.regionalStatus && homeData.regionalStatus.weather;
    if (rs && /rain|thunder|shower/i.test(String(rs.conditions || ""))) {
      signals.rainSoon = true;
      signals.rainRecentHint = true;
    }
    if (rs && /moist|elevated/i.test(String(rs.soilMoisture || ""))) {
      signals.rainRecentHint = true;
    }
    return signals;
  }

  function intentBoost(intent, pillars) {
    var set = {};
    (intent.priorities || []).forEach(function (id) {
      set[id] = true;
    });
    var score = 0;
    (pillars || []).forEach(function (p) {
      // map intent ids roughly
      if (p === "foraging" && set.forage) score += 3;
      if (p === "orchard" && (set["orchard-management"] || set["grow-food"] || set.homesteading)) score += 3;
      if (p === "garden" && (set["grow-food"] || set["seed-saving"] || set.homesteading || set["herbal-medicine"])) score += 3;
      if (p === "food-forest" && (set.permaculture || set["native-plants"] || set["wildlife-habitat"] || set["grow-food"])) score += 2;
      if (p === "permaculture" && (set.permaculture || set["wildlife-habitat"] || set.homesteading || set["native-plants"])) score += 3;
    });
    return score;
  }

  function has(features, id) {
    return (features || []).indexOf(id) >= 0;
  }

  function templates(ctx) {
    var season = ctx.season;
    var wx = ctx.weather;
    var f = ctx.features;
    var actions = [];

    function add(action) {
      actions.push(action);
    }

    // —— Foraging / wild ——
    if (has(f, "wild-edges") || !ctx.configured) {
      if (season === "spring") {
        add({
          id: "morel-window",
          pillar: "foraging",
          features: ["wild-edges"],
          title: "Check low wooded edges for morels after recent moisture.",
          why: "Spring timing favors ash–elm margins and old orchard edges — verify every ID.",
          href: "season-table.html",
          priority: 70
        });
      }
      if (season === "summer" && (wx.rainSoon || wx.rainRecentHint)) {
        add({
          id: "chanterelle-watch",
          pillar: "foraging",
          features: ["wild-edges"],
          title: "Watch oak ridges for chanterelles after this rainfall pattern.",
          why: "Warm rain after dry spells often improves summer fruiting signals — still an estimate, not a guarantee.",
          href: "season-table.html",
          priority: 74
        });
      }
      if (season === "autumn") {
        add({
          id: "autumn-forage",
          pillar: "foraging",
          features: ["wild-edges"],
          title: "Walk woodland edges for nuts and late mushrooms.",
          why: "Autumn is a strong window for mast and many late fungi — harvest only what you can identify.",
          href: "foraging.html",
          priority: 68
        });
      }
    }

    if (has(f, "mushroom-logs")) {
      add({
        id: "log-moisture",
        pillar: "foraging",
        features: ["mushroom-logs"],
        title: wx.skipWater
          ? "Skip watering mushroom logs — rain is in the forecast."
          : "Check mushroom log moisture; water if the surface feels dry.",
        why: "Log cultures respond to moisture pulses more than calendars.",
        href: "foraging.html",
        priority: wx.skipWater ? 82 : 64
      });
    }

    // —— Orchard ——
    if (has(f, "apple-trees")) {
      if (season === "spring" || season === "summer") {
        add({
          id: "thin-apples",
          pillar: "orchard",
          features: ["apple-trees"],
          title: "Thin apple clusters for fruit size and disease airflow.",
          why: "Crowded fruitlets compete and hold moisture against the skin.",
          href: "pillar.html?id=orchard",
          priority: season === "early" ? 60 : 78
        });
      }
      if (season === "autumn") {
        add({
          id: "harvest-apples",
          pillar: "orchard",
          features: ["apple-trees"],
          title: "Check apple maturity — harvest when seeds darken and fruit releases easily.",
          why: "Variety timing varies; taste and seed color beat calendar alone.",
          href: "pillar.html?id=orchard",
          priority: 80
        });
      }
      if (wx.frostRisk) {
        add({
          id: "frost-orchard",
          pillar: "orchard",
          features: ["apple-trees", "peach-trees", "pear-trees"],
          title: "Frost risk overnight — protect tender orchard bloom if still open.",
          why: "Near-freezing nights can damage open blossoms.",
          href: "pillar.html?id=orchard",
          priority: 95
        });
      }
    }

    if (has(f, "peach-trees")) {
      if (season === "summer") {
        add({
          id: "peach-prune",
          pillar: "orchard",
          features: ["peach-trees"],
          title: "Summer-prune peaches for light into the canopy.",
          why: "Open centers dry faster and ripen more evenly.",
          href: "pillar.html?id=orchard",
          priority: 72
        });
        add({
          id: "brown-rot",
          pillar: "orchard",
          features: ["peach-trees"],
          title: "Inspect peaches for brown rot — remove soft fruit promptly.",
          why: "Humidity after rain raises disease pressure on ripening stone fruit.",
          href: "pillar.html?id=orchard",
          priority: wx.rainRecentHint ? 84 : 66
        });
      }
    }

    if (has(f, "cherry-trees") && (season === "spring" || season === "summer")) {
      add({
        id: "harvest-cherries",
        pillar: "orchard",
        features: ["cherry-trees"],
        title: "Check cherries for harvest — birds often arrive first.",
        why: "Short harvest windows reward daily observation.",
        href: "pillar.html?id=orchard",
        priority: 76
      });
    }

    if (has(f, "blueberries")) {
      if (season === "summer") {
        add({
          id: "blueberry-peak",
          pillar: "orchard",
          features: ["blueberries"],
          title: "Blueberries may be entering peak harvest — pick every few days.",
          why: "Berries ripen in waves; frequent picks reduce waste and bird loss.",
          href: "pillar.html?id=orchard",
          priority: 83
        });
      }
      add({
        id: "blueberry-mulch",
        pillar: "orchard",
        features: ["blueberries"],
        title: "Refresh acidic mulch around blueberries if soil is bare.",
        why: "Mulch steadies moisture and protects shallow roots.",
        href: "pillar.html?id=orchard",
        priority: 58
      });
    }

    if ((has(f, "apple-trees") || has(f, "pear-trees") || has(f, "peach-trees")) && wx.skipWater) {
      add({
        id: "skip-orchard-water",
        pillar: "orchard",
        features: ["apple-trees", "pear-trees", "peach-trees"],
        title: "Skip orchard irrigation tomorrow" +
          (wx.rainInchesHint ? " (about " + wx.rainInchesHint + "\" rain expected)." : " — rain is expected."),
        why: "Avoid watering into a wet forecast; roots prefer air as much as moisture.",
        href: "pillar.html?id=orchard",
        priority: 88
      });
    }

    // —— Garden ——
    if (has(f, "vegetable-garden")) {
      if (wx.skipWater) {
        add({
          id: "skip-garden-water",
          pillar: "garden",
          features: ["vegetable-garden"],
          title: "Skip watering the garden — rain is on the way.",
          why: "Overwatering before rain wastes effort and can invite disease.",
          href: "pillar.html?id=garden",
          priority: 90
        });
      } else if (wx.hot) {
        add({
          id: "deep-water",
          pillar: "garden",
          features: ["vegetable-garden"],
          title: "Water garden beds deeply in the morning.",
          why: "Heat raises evaporation; deep morning water reduces leaf wetness overnight.",
          href: "pillar.html?id=garden",
          priority: 79
        });
      }
      if (season === "spring" || season === "summer") {
        add({
          id: "succession",
          pillar: "garden",
          features: ["vegetable-garden"],
          title: "Sow a succession crop where beds have space.",
          why: "Empty soil invites weeds; succession keeps food coming.",
          href: "pillar.html?id=garden",
          priority: 62
        });
      }
      if (season === "summer" || season === "autumn") {
        add({
          id: "mulch-garden",
          pillar: "garden",
          features: ["vegetable-garden"],
          title: "Top up mulch where soil is exposed.",
          why: "Mulch buffers heat and holds moisture between rains.",
          href: "pillar.html?id=garden",
          priority: 60
        });
      }
    }

    // —— Food forest ——
    if (has(f, "food-forest") || has(f, "pawpaws") || has(f, "hazelnuts")) {
      add({
        id: "guild-mulch",
        pillar: "food-forest",
        features: ["food-forest", "pawpaws", "hazelnuts"],
        title: "Mulch tree guilds and check companion plants.",
        why: "Young perennials compete less when moisture and organic matter stay steady.",
        href: "pillar.html?id=food-forest",
        priority: 61
      });
      if (season === "spring" || season === "summer") {
        add({
          id: "comfrey",
          pillar: "food-forest",
          features: ["food-forest"],
          title: "Cut comfrey before flowering for chop-and-drop mulch.",
          why: "Dynamic accumulators return nutrients when cut at the right stage.",
          href: "pillar.html?id=food-forest",
          priority: 63
        });
      }
    }

    if (has(f, "native-meadow") || has(f, "beehives")) {
      add({
        id: "pollinator",
        pillar: "food-forest",
        features: ["native-meadow", "beehives"],
        title: "Leave a flowering strip for pollinators — avoid mowing bloom.",
        why: "Orchard and garden yields depend on insect work.",
        href: "pillar.html?id=food-forest",
        priority: 65
      });
    }

    // —— Permaculture ——
    if (has(f, "compost")) {
      add({
        id: "compost-turn",
        pillar: "permaculture",
        features: ["compost"],
        title: wx.rainSoon
          ? "Cover compost before rain; turn on a dry day."
          : "Turn or aerate compost if the pile is dense and cool.",
        why: "Air and moisture balance drives useful breakdown.",
        href: "pillar.html?id=permaculture",
        priority: 59
      });
    }

    if (has(f, "pond") && wx.rainSoon) {
      add({
        id: "rainwater",
        pillar: "permaculture",
        features: ["pond"],
        title: "Note rainwater capture — check overflow paths before the storm.",
        why: "Storms are the cheapest irrigation when directed well.",
        href: "pillar.html?id=permaculture",
        priority: 70
      });
    }

    if (has(f, "chickens")) {
      add({
        id: "chicken-range",
        pillar: "permaculture",
        features: ["chickens"],
        title: "Rotate chicken access away from wet garden beds.",
        why: "Birds help with pests but compact and scratch soft soil.",
        href: "pillar.html?id=permaculture",
        priority: 57
      });
    }

    if (has(f, "maple-trees") && season === "winter") {
      add({
        id: "maple-prep",
        pillar: "permaculture",
        features: ["maple-trees"],
        title: "Prepare maple tap gear before late-winter thaw cycles.",
        why: "Freeze–thaw windows are short; readiness matters more than force.",
        href: "pillar.html?id=permaculture",
        priority: 55
      });
    }

    // Unconfigured soft prompts
    if (!ctx.configured) {
      add({
        id: "setup-property",
        pillar: "today",
        features: [],
        title: "Tell ForageCast what grows on your land.",
        why: "Today’s plan only recommends actions for features you actually have.",
        href: "property-setup.html",
        priority: 50
      });
      add({
        id: "wild-walk",
        pillar: "foraging",
        features: [],
        title: "Take a short habitat walk and note moisture, aspect, and trees.",
        why: "Until your property profile is set, careful observation is the best daily action.",
        href: "foraging.html",
        priority: 52
      });
    }

    return actions;
  }

  function buildPlan(options) {
    options = options || {};
    var property = options.property || (global.ForageCastProfile && ForageCastProfile.loadProperty()) || { features: [] };
    var intent = options.intent || (global.ForageCastProfile && ForageCastProfile.loadIntent()) || { priorities: ["forage"] };
    if (global.ForageCastProfile && ForageCastProfile.deriveFeatures) {
      property.features = ForageCastProfile.deriveFeatures(property);
    }
    if ((!intent.priorities || !intent.priorities.length) && property.goals && property.goals.length) {
      intent = { priorities: property.goals.slice() };
    }
    var platform = options.platform || null;
    var homeData = options.homeData || null;
    var now = options.now || new Date();
    var season = seasonBucket(monthIndex(now));
    var calendarSeason = platform && platform.calendar && platform.calendar.season;
    if (calendarSeason && /spring/i.test(calendarSeason)) season = "spring";
    else if (calendarSeason && /summer/i.test(calendarSeason)) season = "summer";
    else if (calendarSeason && /fall|autumn/i.test(calendarSeason)) season = "autumn";
    else if (calendarSeason && /winter/i.test(calendarSeason)) season = "winter";

    var features = property.features || [];
    var configured = global.ForageCastProfile && ForageCastProfile.isConfigured
      ? ForageCastProfile.isConfigured(property)
      : features.length > 0;
    var wx = weatherSignals(platform, homeData);
    var raw = templates({
      season: season,
      weather: wx,
      features: features,
      configured: configured
    });

    var filtered = raw.filter(function (a) {
      if (!a.features || !a.features.length) return true;
      if (!configured) return a.id === "setup-property" || a.id === "wild-walk" || a.pillar === "foraging";
      return a.features.some(function (fid) { return features.indexOf(fid) >= 0; });
    });

    filtered.forEach(function (a) {
      a.score = (a.priority || 50) + intentBoost(intent, [a.pillar]);
    });

    filtered.sort(function (a, b) { return b.score - a.score; });

    var limit = options.limit != null ? options.limit : 8;
    var selected = filtered.slice(0, Math.max(3, Math.min(10, limit)));

    return {
      generatedAt: now.toISOString(),
      season: season,
      weather: wx,
      configured: configured,
      actions: selected,
      equation: "Location × Weather × Season × Property × User Intent = Today's Action Plan",
      mission: "Understand the season. Care for your land. Harvest at the right time."
    };
  }

  global.ForageCastToday = {
    buildPlan: buildPlan,
    seasonBucket: seasonBucket,
    weatherSignals: weatherSignals
  };
})(typeof window !== "undefined" ? window : globalThis);
