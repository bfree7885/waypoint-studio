/**
 * Waypoint Studio — Happening Now
 * Rule-based educational outdoor notes from region, season, month, weather, and phenology.
 * Not predictions — tentative field cues only.
 */
(function (global) {
  "use strict";

  var PREFIXES = ["Likely", "Watch for", "Conditions may favor", "Seasonal note"];

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseNumber(val) {
    if (val == null) return null;
    if (typeof val === "number" && isFinite(val)) return val;
    if (typeof val === "object" && val.value != null) return parseNumber(val.value);
    var n = parseFloat(String(val).replace(/[^\d.-]/g, ""));
    return isFinite(n) ? n : null;
  }

  function monthFromContext(bundle, intel) {
    var weekOf = (bundle && bundle.weekOf) || (intel && intel.season && intel.season.weekOf);
    if (weekOf) {
      var parts = String(weekOf).split("-");
      if (parts.length >= 2) {
        var m = parseInt(parts[1], 10);
        if (m >= 1 && m <= 12) return m;
      }
    }
    return new Date().getMonth() + 1;
  }

  function seasonKey(bundle, intel, month) {
    var label = (intel && intel.phenology && intel.phenology.stage) ||
      (intel && intel.season && intel.season.label) ||
      (bundle && bundle.season) ||
      "";
    var lower = String(label).toLowerCase();
    if (/winter/.test(lower)) return "winter";
    if (/spring/.test(lower)) return "spring";
    if (/summer/.test(lower)) return "summer";
    if (/fall|autumn/.test(lower)) return "fall";
    if (month >= 3 && month <= 5) return "spring";
    if (month >= 6 && month <= 8) return "summer";
    if (month >= 9 && month <= 11) return "fall";
    return "winter";
  }

  function hasSpecies(speciesList, patterns) {
    if (!speciesList || !speciesList.length) return false;
    return speciesList.some(function (entry) {
      var name = String(entry.name || entry.commonName || "").toLowerCase();
      var status = String(entry.status || "").toLowerCase();
      var haystack = name + " " + status;
      return patterns.some(function (pattern) {
        return haystack.indexOf(String(pattern).toLowerCase()) >= 0;
      });
    });
  }

  function conditionsText(ctx) {
    return String(ctx.conditions || "").toLowerCase();
  }

  function isRainy(ctx) {
    if (ctx.precipProb != null && ctx.precipProb >= 40) return true;
    if (ctx.recentRain) return true;
    return /rain|shower|drizzle|thunder|storm/.test(conditionsText(ctx));
  }

  function isHumidWarm(ctx) {
    var tempOk = ctx.tempF == null || (ctx.tempF >= 58 && ctx.tempF <= 88);
    var humidOk = ctx.humidity == null || ctx.humidity >= 60;
    return tempOk && humidOk;
  }

  function buildContext(input) {
    input = input || {};
    var intel = input.intelligence || input.regionalIntelligence || null;
    var bundle = input.bundle || null;
    var month = monthFromContext(bundle, intel);
    var season = seasonKey(bundle, intel, month);
    var weatherRef = intel && intel.weatherRef;
    var cur = weatherRef && weatherRef.current;
    var today = weatherRef && weatherRef.daily && weatherRef.daily[0];
    var tempF = parseNumber(cur && cur.temperature);
    var humidity = parseNumber(cur && cur.humidity);
    var precipProb = parseNumber(cur && cur.precipitation && cur.precipitation.probability);
    if (precipProb == null && today && today.precipitation) {
      precipProb = parseNumber(today.precipitation.probability);
    }
    if (tempF == null && intel && intel.weather) {
      tempF = parseNumber(intel.weather.high) || parseNumber(intel.weather.low);
    }
    var conditions = (cur && cur.conditions && cur.conditions.summary) ||
      (intel && intel.weather && intel.weather.conditions) ||
      (bundle && bundle.thisWeekOutdoors && bundle.thisWeekOutdoors.weather && bundle.thisWeekOutdoors.weather.conditions) ||
      "";
    var recentRain = !!(intel && intel.rainfall && intel.rainfall.recent &&
      parseNumber(intel.rainfall.recent.amount) > 0.25);
    var speciesActive = (intel && intel.species && intel.species.active) || [];
    if (!speciesActive.length && bundle && bundle.seasonalWatch) {
      speciesActive = (bundle.seasonalWatch.activeNow || []).concat(bundle.seasonalWatch.comingSoon || []);
    }

    return {
      month: month,
      season: season,
      seasonLabel: (intel && intel.season && intel.season.label) || (bundle && bundle.season) || season,
      region: intel && intel.region,
      bioregion: intel && intel.geography && intel.geography.bioregion,
      tempF: tempF,
      humidity: humidity,
      precipProb: precipProb,
      conditions: conditions,
      recentRain: recentRain,
      speciesActive: speciesActive,
      phenologyStage: (intel && intel.phenology && intel.phenology.stage) || null,
      hasLiveWeather: !!(weatherRef && weatherRef.meta && !weatherRef.meta.isPlaceholder)
    };
  }

  var RULES = [
    {
      id: "mushrooms-after-rain",
      category: "foraging",
      match: function (ctx) {
        return isRainy(ctx) && (ctx.tempF == null || (ctx.tempF >= 50 && ctx.tempF <= 82));
      },
      score: function (ctx) {
        var s = 70;
        if (ctx.precipProb != null) s += ctx.precipProb / 4;
        if (ctx.recentRain) s += 15;
        if (hasSpecies(ctx.speciesActive, ["morel", "chanterelle", "oyster", "mushroom"])) s += 10;
        return s;
      },
      note: function () {
        return {
          prefix: "Conditions may favor",
          text: "mushroom fruiting on shaded hardwood slopes a few days after rain — confirm every ID with multiple field marks"
        };
      }
    },
    {
      id: "morel-late-spring",
      category: "foraging",
      match: function (ctx) {
        return (ctx.season === "spring" || ctx.month === 5) &&
          hasSpecies(ctx.speciesActive, ["morel"]);
      },
      score: function () { return 62; },
      note: function () {
        return {
          prefix: "Watch for",
          text: "late-spring morels on river terraces and disturbed ground below ~1,200 ft as soils warm"
        };
      }
    },
    {
      id: "ticks-warm-humid",
      category: "safety",
      match: function (ctx) {
        return ctx.month >= 3 && ctx.month <= 11 && isHumidWarm(ctx);
      },
      score: function (ctx) {
        var s = 65;
        if (ctx.humidity != null && ctx.humidity >= 70) s += 10;
        if (ctx.tempF != null && ctx.tempF >= 65) s += 8;
        return s;
      },
      note: function () {
        return {
          prefix: "Watch for",
          text: "ticks in tall grass, trail margins, and leaf litter when weather is warm and humid"
        };
      }
    },
    {
      id: "songbirds-dawn",
      category: "wildlife",
      match: function (ctx) {
        return ctx.month >= 3 && ctx.month <= 8;
      },
      score: function (ctx) {
        var s = 55;
        if (ctx.season === "spring") s += 20;
        if (hasSpecies(ctx.speciesActive, ["warbler", "thrush", "vireo", "songbird"])) s += 12;
        return s;
      },
      note: function () {
        return {
          prefix: "Likely",
          text: "songbird activity near dawn as territories are established — try a five-minute sound map from one spot"
        };
      }
    },
    {
      id: "berries-summer",
      category: "foraging",
      match: function (ctx) {
        return ctx.month >= 6 && ctx.month <= 9;
      },
      score: function (ctx) {
        var s = 50;
        if (hasSpecies(ctx.speciesActive, ["blueberry", "blackberry", "raspberry", "berry"])) s += 18;
        if (ctx.month === 7 || ctx.month === 8) s += 10;
        return s;
      },
      note: function (ctx) {
        var fruit = hasSpecies(ctx.speciesActive, ["blueberry"]) ? "blueberries" : "summer berries";
        return {
          prefix: "Seasonal note",
          text: fruit + " may be ripening on sunny edges and old openings — taste only what you can identify with confidence"
        };
      }
    },
    {
      id: "deer-dusk",
      category: "wildlife",
      match: function (ctx) {
        return ctx.month >= 9 || ctx.month <= 2 || ctx.season === "fall";
      },
      score: function (ctx) {
        var s = 48;
        if (ctx.season === "fall") s += 22;
        if (hasSpecies(ctx.speciesActive, ["deer", "whitetail"])) s += 10;
        return s;
      },
      note: function () {
        return {
          prefix: "Likely",
          text: "deer movement near field edges and riparian corridors around dusk as feeding patterns shift with daylight"
        };
      }
    },
    {
      id: "wildflowers-spring",
      category: "phenology",
      match: function (ctx) {
        return ctx.season === "spring" || (ctx.month >= 3 && ctx.month <= 5);
      },
      score: function (ctx) {
        var s = 58;
        if (hasSpecies(ctx.speciesActive, ["laurel", "trillium", "ephemeral", "wildflower"])) s += 15;
        return s;
      },
      note: function () {
        return {
          prefix: "Seasonal note",
          text: "wildflowers and shrubs may be blooming on cool north slopes and ravines — compare bloom stage week to week"
        };
      }
    },
    {
      id: "laurel-bloom",
      category: "phenology",
      match: function (ctx) {
        return (ctx.month >= 5 && ctx.month <= 6) ||
          hasSpecies(ctx.speciesActive, ["mountain laurel", "laurel"]);
      },
      score: function () { return 64; },
      note: function () {
        return {
          prefix: "Watch for",
          text: "mountain laurel blooms on shaded ledges and north-facing slopes — photograph, do not collect in protected areas"
        };
      }
    },
    {
      id: "valley-fog-dawn",
      category: "weather",
      match: function (ctx) {
        return /fog|mist|overcast|cloud/.test(conditionsText(ctx)) ||
          (ctx.humidity != null && ctx.humidity >= 85 && ctx.tempF != null && ctx.tempF <= 65);
      },
      score: function (ctx) {
        var s = 52;
        if (/fog|mist/.test(conditionsText(ctx))) s += 20;
        return s;
      },
      note: function () {
        return {
          prefix: "Conditions may favor",
          text: "valley fog and soft light at dawn along rivers and low basins — useful for landscape and sound observation"
        };
      }
    },
    {
      id: "afternoon-storms",
      category: "weather",
      match: function (ctx) {
        return isHumidWarm(ctx) && (ctx.precipProb == null || ctx.precipProb >= 25);
      },
      score: function (ctx) {
        var s = 56;
        if (ctx.precipProb != null && ctx.precipProb >= 50) s += 15;
        if (/thunder|storm|shower/.test(conditionsText(ctx))) s += 12;
        return s;
      },
      note: function () {
        return {
          prefix: "Likely",
          text: "afternoon showers or storms when air is humid and warm — morning field time may be more comfortable"
        };
      }
    },
    {
      id: "trail-mud-after-rain",
      category: "trails",
      match: function (ctx) {
        return isRainy(ctx) || ctx.recentRain;
      },
      score: function (ctx) {
        var s = 54;
        if (ctx.recentRain) s += 12;
        return s;
      },
      note: function () {
        return {
          prefix: "Watch for",
          text: "muddy tread in ravines and low crossings after rain while ridge tops may dry sooner"
        };
      }
    },
    {
      id: "bear-campgrounds",
      category: "wildlife",
      match: function (ctx) {
        return (ctx.season === "spring" || ctx.season === "summer" || ctx.month >= 4) &&
          hasSpecies(ctx.speciesActive, ["bear"]);
      },
      score: function () { return 60; },
      note: function () {
        return {
          prefix: "Seasonal note",
          text: "bear activity may increase near campgrounds and feeders — secure food and trash at dawn and dusk"
        };
      }
    },
    {
      id: "fall-color",
      category: "phenology",
      match: function (ctx) {
        return ctx.season === "fall" || (ctx.month >= 9 && ctx.month <= 10);
      },
      score: function () { return 57; },
      note: function () {
        return {
          prefix: "Seasonal note",
          text: "hardwood slopes may show early color as nights cool — compare elevation bands on the same bearing"
        };
      }
    },
    {
      id: "winter-tracks",
      category: "wildlife",
      match: function (ctx) {
        return ctx.season === "winter" || ctx.month === 12 || ctx.month <= 2;
      },
      score: function () { return 45; },
      note: function () {
        return {
          prefix: "Seasonal note",
          text: "animal tracks and evergreen ID may be easier after light snow or frost on quiet trails"
        };
      }
    },
    {
      id: "summer-heat-ridges",
      category: "safety",
      match: function (ctx) {
        return ctx.season === "summer" && ctx.tempF != null && ctx.tempF >= 78;
      },
      score: function (ctx) {
        return 50 + Math.min(20, (ctx.tempF - 78) * 2);
      },
      note: function () {
        return {
          prefix: "Watch for",
          text: "strong sun and heat on exposed ridges — carry water and plan shade breaks"
        };
      }
    }
  ];

  var FALLBACK_RULES = [
    {
      id: "fallback-spring",
      category: "season",
      match: function (ctx) { return ctx.season === "spring"; },
      score: function () { return 20; },
      note: function () {
        return {
          prefix: "Seasonal note",
          text: "spring migrants and early blooms often shift week to week — compare the same route on each visit"
        };
      }
    },
    {
      id: "fallback-summer",
      category: "season",
      match: function (ctx) { return ctx.season === "summer"; },
      score: function () { return 20; },
      note: function () {
        return {
          prefix: "Seasonal note",
          text: "summer insect and plant activity peaks in warm weeks — note what is flowering or fruiting locally"
        };
      }
    },
    {
      id: "fallback-fall",
      category: "season",
      match: function (ctx) { return ctx.season === "fall"; },
      score: function () { return 20; },
      note: function () {
        return {
          prefix: "Seasonal note",
          text: "fall feeding and movement patterns may shift with cooling nights — observe at dawn and dusk"
        };
      }
    },
    {
      id: "fallback-winter",
      category: "season",
      match: function (ctx) { return ctx.season === "winter"; },
      score: function () { return 20; },
      note: function () {
        return {
          prefix: "Seasonal note",
          text: "winter woods reveal structure and sign — practice reading tracks and tree silhouettes on short loops"
        };
      }
    }
  ];

  function evaluateRules(ctx, rules) {
    var hits = [];
    rules.forEach(function (rule) {
      if (!rule.match(ctx)) return;
      var body = rule.note(ctx);
      if (!body || !body.text) return;
      hits.push({
        id: rule.id,
        category: rule.category,
        prefix: PREFIXES.indexOf(body.prefix) >= 0 ? body.prefix : "Seasonal note",
        text: body.text,
        score: rule.score(ctx)
      });
    });
    return hits;
  }

  function selectNotes(ctx, options) {
    options = options || {};
    var min = options.min != null ? options.min : 3;
    var max = options.max != null ? options.max : 5;
    var hits = evaluateRules(ctx, RULES);
    if (hits.length < min) {
      hits = hits.concat(evaluateRules(ctx, FALLBACK_RULES));
    }
    hits.sort(function (a, b) { return b.score - a.score; });
    var picked = [];
    var usedCategories = {};
    hits.forEach(function (hit) {
      if (picked.length >= max) return;
      if (usedCategories[hit.category] && picked.length >= min) return;
      if (picked.some(function (p) { return p.id === hit.id; })) return;
      picked.push(hit);
      usedCategories[hit.category] = true;
    });
    if (picked.length < min) {
      hits.forEach(function (hit) {
        if (picked.length >= min) return;
        if (picked.some(function (p) { return p.id === hit.id; })) return;
        picked.push(hit);
      });
    }
    return picked.slice(0, max);
  }

  function generate(input) {
    var ctx = buildContext(input);
    return {
      context: ctx,
      notes: selectNotes(ctx, input.options)
    };
  }

  function renderNote(note) {
    return (
      "<li>" +
        '<span class="wce-happening__prefix">' + escapeHtml(note.prefix) + "</span>" +
        '<span class="wce-happening__text">' + escapeHtml(note.text) + "</span>" +
      "</li>"
    );
  }

  function renderModule(result) {
    result = result || {};
    var notes = result.notes || [];
    if (!notes.length) {
      return (
        '<div class="wce-happening wce-happening--empty">' +
          '<h3 class="wce-happening__label">Happening now</h3>' +
          '<p class="wce-happening__empty">Regional cues are unavailable right now. Check back after location and weather load.</p>' +
        "</div>"
      );
    }
    return (
      '<aside class="wce-happening" id="happening-now" aria-labelledby="wce-happening-title">' +
        '<h3 class="wce-happening__label" id="wce-happening-title">Happening now</h3>' +
        '<p class="wce-happening__lead">Tentative outdoor cues for your region this week — confirm in the field.</p>' +
        '<ul class="wce-happening__list">' +
          notes.map(renderNote).join("") +
        "</ul>" +
        '<p class="wce-happening__disclaimer">Rule-based regional notes, not forecasts. Conditions vary by elevation, aspect, and microclimate.</p>' +
      "</aside>"
    );
  }

  function renderLoading() {
    return (
      '<aside class="wce-happening wce-happening--loading" id="happening-now" aria-busy="true" aria-live="polite">' +
        '<h3 class="wce-happening__label">Happening now</h3>' +
        '<p class="wce-happening__loading">Building regional field notes…</p>' +
      "</aside>"
    );
  }

  function mount(el, options) {
    if (!el) return Promise.resolve(null);
    options = options || {};
    el.setAttribute("aria-busy", "true");
    el.innerHTML = renderLoading();

    var result = generate({
      intelligence: options.intelligence || options.regionalIntelligence,
      bundle: options.bundle,
      location: options.location,
      options: options.noteOptions
    });

    el.innerHTML = renderModule(result);
    el.removeAttribute("aria-busy");
    return Promise.resolve(result);
  }

  function mountAll(root, options) {
    if (!root) return Promise.resolve([]);
    options = options || {};
    var mounts = root.querySelectorAll("[data-wds-happening-now-mount]");
    var jobs = [];
    mounts.forEach(function (el) {
      jobs.push(mount(el, options));
    });
    return Promise.all(jobs);
  }

  global.WDS = global.WDS || {};
  global.WDS.happeningNow = {
    PREFIXES: PREFIXES,
    buildContext: buildContext,
    generate: generate,
    selectNotes: selectNotes,
    renderModule: renderModule,
    renderLoading: renderLoading,
    mount: mount,
    mountAll: mountAll
  };
})(window);
