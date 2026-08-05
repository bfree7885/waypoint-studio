/**
 * Waypoint Outdoor Intelligence — shared deterministic recommendation engine.
 *
 * Pure API:
 *   WDS.outdoorRecommendations.recommend(context, options)
 *   WDS.outdoorRecommendations.recommendFor(surface, context, options)
 *
 * Browser adapters:
 *   WDS.outdoorRecommendations.collectContext(options)
 *   WDS.outdoorRecommendations.mount(element, options)
 *
 * Recommendations are rule matches, never predictions or AI output.
 */
(function (global) {
  "use strict";

  var VERSION = "1.0.0";
  var SURFACES = ["dashboard", "articles", "scenes", "sheds"];
  var DOMAINS = [
    "weather", "season", "species", "phenology", "astronomy", "geology",
    "trail-conditions", "camera-activity", "photo-metadata",
    "recent-observations", "article-categories", "location"
  ];
  var PHOTO_INDEX_KEY = "waypoint-photo-library-index-v1";
  var PHOTO_PROFILE_KEY = "waypoint-photo-coach-profile-v1";
  var PHOTO_SHOOTS_KEY = "waypoint-photo-coach-shoots-v1";

  function arr(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    return value == null || value === "" ? [] : [value];
  }

  function text(value) {
    return value == null ? "" : String(value).trim();
  }

  function lower(value) {
    return text(value).toLowerCase();
  }

  function number(value) {
    if (value == null) return null;
    if (typeof value === "object" && value.value != null) return number(value.value);
    var parsed = Number(value);
    return isFinite(parsed) ? parsed : null;
  }

  function iso(value) {
    var date = value ? new Date(value) : null;
    return date && isFinite(date.getTime()) ? date.toISOString() : null;
  }

  function seasonFromDate(value) {
    var month = (value ? new Date(value) : new Date()).getMonth() + 1;
    if (month >= 3 && month <= 5) return "spring";
    if (month >= 6 && month <= 8) return "summer";
    if (month >= 9 && month <= 11) return "fall";
    return "winter";
  }

  function normalizeLocation(raw) {
    raw = raw || {};
    return {
      label: text(raw.label || raw.displayTitle || raw.placeLabel || raw.name) || null,
      region: text(raw.region || raw.regionLabel || raw.state || raw.stateCode) || null,
      scope: text(raw.scope || raw.geographicScope) || null,
      lat: number(raw.lat != null ? raw.lat : raw.latitude),
      lng: number(raw.lng != null ? raw.lng : raw.longitude),
      source: text(raw.source) || "unavailable"
    };
  }

  function normalizeWeather(raw) {
    raw = raw || {};
    var current = raw.current || raw;
    var conditions = current.conditions || raw.conditions || {};
    var precipitation = current.precipitation || raw.precipitation || {};
    var wind = current.wind || raw.wind || {};
    return {
      available: !!(raw.status === "live" || raw.meta || current.observedAt || text(conditions.summary || conditions)),
      conditions: text(conditions.summary || conditions),
      temperatureF: number(current.temperature != null ? current.temperature : raw.temperatureF),
      feelsLikeF: number(current.feelsLike != null ? current.feelsLike : raw.feelsLikeF),
      precipitationProbability: number(
        precipitation.probability != null ? precipitation.probability : raw.precipitationProbability
      ),
      windMph: number(wind.gust != null ? wind.gust : (wind.speed != null ? wind.speed : raw.windMph)),
      cloudCover: number(current.cloudCover != null ? current.cloudCover : raw.cloudCover),
      alerts: arr(raw.alerts && raw.alerts.items ? raw.alerts.items : raw.alerts)
    };
  }

  function normalizeContext(input) {
    input = input || {};
    var platform = input.platform || {};
    var daylight = input.astronomy || platform.daylight || {};
    var articles = arr(input.articles);
    var categories = arr(input.articleCategories);
    return {
      now: iso(input.now) || new Date().toISOString(),
      weather: normalizeWeather(input.weather || platform.weatherRef || platform.weather || {}),
      season: lower(input.season || (platform.calendar && platform.calendar.season)) || seasonFromDate(input.now),
      species: arr(input.species || (platform.species && platform.species.items)),
      phenology: arr(input.phenology || (platform.phenology && (platform.phenology.items || platform.phenology))),
      astronomy: {
        moonIllumination: number(
          daylight.moonIllumination != null ? daylight.moonIllumination : daylight.illumination
        ),
        cloudCover: number(daylight.cloudCover),
        events: arr(daylight.events || daylight.notableEvents),
        sunrise: daylight.sunrise || null,
        sunset: daylight.sunset || null
      },
      geology: arr(input.geology || (platform.geology && (platform.geology.items || platform.geology.features))),
      trailConditions: input.trailConditions || platform.trailConditions || {},
      cameraActivity: input.cameraActivity || {},
      photoMetadata: arr(input.photoMetadata),
      recentObservations: arr(input.recentObservations || (platform.observations && platform.observations.items)),
      articleCategories: categories.map(lower).filter(Boolean),
      articles: articles,
      location: normalizeLocation(input.location || platform.location || {}),
      privacy: input.privacy || "Local context is evaluated on this device."
    };
  }

  function blob(values) {
    return arr(values).map(function (value) {
      return lower(typeof value === "object" ? JSON.stringify(value) : value);
    }).join(" ");
  }

  function has(values, pattern) {
    return pattern.test(blob(values));
  }

  function recommendation(rule, score, title, summary, action, evidence, context) {
    return {
      id: rule.id,
      version: VERSION,
      kind: rule.kind || "observation",
      domains: rule.domains.slice(),
      surfaces: rule.surfaces.slice(),
      score: Math.max(0, Math.min(100, Math.round(score))),
      title: title,
      summary: summary,
      action: action || null,
      evidence: evidence.filter(Boolean),
      reason: evidence.filter(Boolean).join(" · "),
      confidence: rule.confidence || "contextual",
      honesty: rule.honesty || "Deterministic guidance from the available context; verify current field conditions.",
      generatedAt: context.now
    };
  }

  var RULES = [
    {
      id: "weather-active-alert", kind: "safety", domains: ["weather", "location"],
      surfaces: SURFACES, confidence: "observed",
      evaluate: function (c) {
        if (!c.weather.alerts.length) return null;
        var alert = c.weather.alerts[0] || {};
        var label = text(alert.event || alert.headline || alert.title) || "active weather alert";
        return recommendation(this, 98, "Check the active weather alert",
          label + " may change today’s field plan. Read the official notice before heading out.",
          { label: "Review conditions", href: "/apps/dashboard/" },
          ["weather alert", c.location.label], c);
      }
    },
    {
      id: "weather-wet-trails", kind: "field-condition", domains: ["weather", "trail-conditions"],
      surfaces: ["dashboard", "sheds"], confidence: "contextual",
      evaluate: function (c) {
        var wx = c.weather;
        var trail = c.trailConditions || {};
        var wet = /rain|storm|shower|drizzle|snow|sleet/i.test(wx.conditions) ||
          (wx.precipitationProbability != null && wx.precipitationProbability >= 60) ||
          has([trail], /mud|flood|wet|closure|closed/);
        if (!wet) return null;
        var score = has([trail], /closure|closed|flood/) ? 94 : 84;
        return recommendation(this, score, "Treat trail access as conditional",
          "Wet weather or reported trail impacts can make tread fragile and crossings less predictable.",
          { label: "Review trail conditions", href: "/apps/dashboard/" },
          [wx.conditions || "wet-weather signal", has([trail], /closure|closed/) ? "closure signal" : null], c);
      }
    },
    {
      id: "weather-strong-wind", kind: "safety", domains: ["weather", "trail-conditions"],
      surfaces: ["dashboard", "scenes", "sheds"], confidence: "contextual",
      evaluate: function (c) {
        if (c.weather.windMph == null || c.weather.windMph < 25) return null;
        return recommendation(this, c.weather.windMph >= 35 ? 93 : 81, "Plan around exposed terrain",
          "Strong wind can affect dead limbs, ridgelines, camera stability, and comfortable observation.",
          { label: "Open today’s conditions", href: "/apps/dashboard/" },
          [Math.round(c.weather.windMph) + " mph wind or gust"], c);
      }
    },
    {
      id: "astronomy-clear-dark-sky", kind: "opportunity", domains: ["astronomy", "weather", "location"],
      surfaces: ["dashboard", "articles", "scenes"], confidence: "estimated",
      evaluate: function (c) {
        var moon = c.astronomy.moonIllumination;
        var cloud = c.weather.cloudCover != null ? c.weather.cloudCover : c.astronomy.cloudCover;
        if (moon == null || moon > 35 || (cloud != null && cloud > 45)) return null;
        return recommendation(this, 79, "Consider a low-moon night session",
          "Lower moonlight and limited cloud cover can support stars, silhouettes, and careful nocturnal observation.",
          { label: "Plan a scene", href: "/apps/scenes/" },
          ["moon illumination " + Math.round(moon) + "%", cloud != null ? "cloud cover " + Math.round(cloud) + "%" : null], c);
      }
    },
    {
      id: "astronomy-event", kind: "opportunity", domains: ["astronomy", "location"],
      surfaces: ["dashboard", "articles", "scenes"], confidence: "contextual",
      evaluate: function (c) {
        if (!c.astronomy.events.length) return null;
        var event = c.astronomy.events[0];
        var label = text(event.name || event.title || event);
        return recommendation(this, 83, "Put " + label + " on the observation list",
          "An astronomical event is most useful when paired with local sky, horizon, and weather checks.",
          { label: "Explore astronomy reading", href: "/articles/?category=Astronomy" },
          [label, c.location.label], c);
      }
    },
    {
      id: "phenology-seasonal-change", kind: "observation", domains: ["phenology", "season", "location"],
      surfaces: ["dashboard", "articles", "scenes"], confidence: "contextual",
      evaluate: function (c) {
        if (!c.phenology.length) return null;
        var cue = text(c.phenology[0].title || c.phenology[0].label || c.phenology[0]);
        return recommendation(this, 77, "Watch the current seasonal transition",
          cue + " is a useful cue to compare across elevation, exposure, and repeat visits.",
          { label: "Browse seasonal field notes", href: "/articles/?category=Seasonal" },
          [cue, c.season, c.location.label], c);
      }
    },
    {
      id: "season-default-observation", kind: "observation", domains: ["season", "location"],
      surfaces: ["dashboard", "articles", "scenes"], confidence: "seasonal",
      evaluate: function (c) {
        var prompts = {
          spring: ["Compare first leaf and bloom timing", "Look for change across sun exposure and elevation."],
          summer: ["Notice shade, water, and insect activity", "Compare cooler pockets with open, exposed ground."],
          fall: ["Track color and seed change", "Repeat observations reveal how slope and species affect timing."],
          winter: ["Read tracks, structure, and weathering", "Snow, bare canopy, and low light make hidden patterns easier to compare."]
        };
        var prompt = prompts[c.season];
        if (!prompt) return null;
        return recommendation(this, 55, prompt[0], prompt[1],
          { label: "Open Articles", href: "/articles/" }, [c.season, c.location.label], c);
      }
    },
    {
      id: "species-recent-observation", kind: "follow-up", domains: ["species", "recent-observations", "article-categories"],
      surfaces: ["dashboard", "articles", "sheds"], confidence: "personal",
      evaluate: function (c) {
        var observation = c.recentObservations[0];
        if (!observation && !c.species.length) return null;
        var subject = text(
          observation && (observation.taxonLabel || observation.title) ||
          c.species[0] && (c.species[0].commonName || c.species[0].label || c.species[0])
        ) || "recent species";
        return recommendation(this, 74, "Follow up on " + subject,
          "A repeat visit can turn one sighting into a useful comparison of behavior, habitat, and timing.",
          { label: "Find related reading", href: "/articles/?q=" + encodeURIComponent(subject) },
          [subject, observation && observation.recordedAt ? "recent local observation" : "species context"], c);
      }
    },
    {
      id: "sheds-cervid-context", kind: "field-plan", domains: ["species", "season", "recent-observations", "location"],
      surfaces: ["sheds"], confidence: "contextual",
      evaluate: function (c) {
        var cervid = has(c.species.concat(c.recentObservations), /deer|elk|moose|cervid|antler|shed/);
        var searchSeason = c.season === "winter" || c.season === "spring";
        return recommendation(this, cervid ? 82 : (searchSeason ? 64 : 56),
          searchSeason ? "Compare habitat signs before searching" : "Use the off-season to read habitat",
          searchSeason
            ? "Use tracks, browse, bedding cover, and access pressure as observations—not as a guarantee of finds."
            : "Map browse, bedding cover, crossings, and access pressure now; seasonal context never guarantees a find.",
          { label: "Open Sheds map", href: "/apps/shed-hunting/map/" },
          [cervid ? "cervid observation context" : c.season + " timing", c.location.label], c);
      }
    },
    {
      id: "geology-landscape-reading", kind: "learning", domains: ["geology", "location", "article-categories"],
      surfaces: ["dashboard", "articles", "scenes"], confidence: "contextual",
      evaluate: function (c) {
        if (!c.geology.length && c.articleCategories.indexOf("geology") < 0) return null;
        var feature = c.geology[0];
        var label = text(feature && (feature.name || feature.label || feature.type || feature)) || "local geology";
        return recommendation(this, 68, "Read the landscape through " + label,
          "Rock, slope, drainage, and erosion patterns can explain both habitats and photographic structure.",
          { label: "Explore geology articles", href: "/articles/?category=Geology" },
          [label, c.location.label], c);
      }
    },
    {
      id: "camera-recent-practice", kind: "practice", domains: ["camera-activity", "photo-metadata", "season"],
      surfaces: ["scenes"], confidence: "personal",
      evaluate: function (c) {
        var count = number(c.cameraActivity.recentShootCount);
        if (!count && !c.photoMetadata.length) return null;
        var metadata = blob(c.photoMetadata);
        var focus = /macro|close|flower|fung/i.test(metadata) ? "close observation" :
          /telephoto|bird|wildlife|200mm|300mm|400mm|500mm|600mm/i.test(metadata) ? "long-lens observation" :
          /night|astro|star|milky/i.test(metadata) ? "night work" : "your recent visual pattern";
        return recommendation(this, 73, "Build the next session around " + focus,
          "Repeat one recent approach under different light or weather, then compare what changed.",
          { label: "Open Scenes", href: "/apps/scenes/" },
          [count ? count + " recent shoot" + (count === 1 ? "" : "s") : null, focus], c);
      }
    },
    {
      id: "camera-profile-goal", kind: "practice", domains: ["camera-activity", "photo-metadata"],
      surfaces: ["scenes"], confidence: "personal",
      evaluate: function (c) {
        var goals = arr(c.cameraActivity.goals);
        if (!goals.length) return null;
        var goal = text(goals[0]).replace(/[-_]/g, " ");
        return recommendation(this, 61, "Practice " + goal + " deliberately",
          "Choose one scene where that goal is visible, make a small set, and review the differences.",
          { label: "Start a calm review", href: "/apps/photo-coach/" },
          ["local photography goal"], c);
      }
    }
  ];

  function articleRecommendations(context, surface) {
    return context.articles.map(function (article) {
      var scopes = arr(article.geographicScopes);
      var categories = arr(article.categories);
      var categoryMatch = categories.some(function (category) {
        return context.articleCategories.indexOf(lower(category)) >= 0;
      });
      var locationTerms = [context.location.scope, context.location.region, context.location.label]
        .map(lower).filter(Boolean);
      var locationMatch = locationTerms.length && scopes.some(function (scope) {
        var normalizedScope = lower(scope);
        return locationTerms.some(function (term) {
          return normalizedScope === term || term.indexOf(normalizedScope) >= 0 || normalizedScope.indexOf(term) >= 0;
        });
      });
      var base = number(article.relevanceScore);
      var score = (base != null ? base : 45) + (categoryMatch ? 8 : 0) + (locationMatch ? 10 : 0);
      return {
        id: "article:" + text(article.id || article.canonicalUrl || article.title),
        version: VERSION,
        kind: "article",
        domains: ["article-categories", "location"],
        surfaces: SURFACES.slice(),
        score: Math.max(0, Math.min(100, Math.round(score))),
        title: text(article.title) || "Field reading",
        summary: text(article.summary) || "Summary unavailable from this publisher feed.",
        action: article.canonicalUrl ? { label: "Read original", href: article.canonicalUrl, external: true } : null,
        evidence: [
          categories.length ? categories.slice(0, 2).join(", ") : null,
          locationMatch ? scopes[0] : null,
          article.sourceName || null
        ].filter(Boolean),
        reason: "Article relevance score with available category and location context.",
        confidence: "curated",
        honesty: "Waypoint curates this link; the publisher owns the original article.",
        generatedAt: context.now,
        article: article
      };
    }).filter(function (item) {
      var articleText = [item.article.categories, item.article.title];
      if (surface === "sheds") {
        return has(articleText, /wildlife|habitat|conservation|forest|season|deer|elk|moose|cervid/);
      }
      if (surface === "scenes") {
        return has(articleText, /photograph|astronom|hidden landscape|infrared|geolog|night sky/) ||
          /bird|eagle|owl|hawk|falcon|warbler|heron|egret|osprey|migration/.test(lower(item.article.title));
      }
      return true;
    });
  }

  function recommend(input, options) {
    options = options || {};
    var context = normalizeContext(input);
    var surface = lower(options.surface);
    var kinds = arr(options.kinds).map(lower);
    var results = [];
    RULES.forEach(function (rule) {
      if (surface && rule.surfaces.indexOf(surface) < 0) return;
      var result = rule.evaluate(context);
      if (result) results.push(result);
    });
    if (options.includeArticles !== false) {
      results = results.concat(articleRecommendations(context, surface));
    }
    if (kinds.length) {
      results = results.filter(function (item) { return kinds.indexOf(lower(item.kind)) >= 0; });
    }
    results.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.id.localeCompare(b.id);
    });
    var seen = {};
    results = results.filter(function (item) {
      var key = item.kind === "article" && item.action && item.action.href
        ? "article:" + item.action.href
        : item.id;
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
    if (surface === "scenes" || surface === "sheds") {
      var articleCount = 0;
      results = results.filter(function (item) {
        if (item.kind !== "article") return true;
        articleCount += 1;
        return articleCount <= 1;
      });
    }
    return results.slice(0, options.limit != null ? options.limit : 8);
  }

  function recommendFor(surface, context, options) {
    options = Object.assign({}, options || {}, { surface: surface });
    return recommend(context, options);
  }

  function readJson(key, fallback) {
    try {
      var raw = global.localStorage && global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function photoContext() {
    var photos = readJson(PHOTO_INDEX_KEY, []);
    var profile = readJson(PHOTO_PROFILE_KEY, {});
    var shoots = readJson(PHOTO_SHOOTS_KEY, []);
    photos = Array.isArray(photos) ? photos : [];
    shoots = Array.isArray(shoots) ? shoots : [];
    return {
      cameraActivity: {
        recentShootCount: shoots.length,
        lastActiveAt: shoots[0] && (shoots[0].updatedAt || shoots[0].createdAt),
        goals: arr(profile && profile.goals)
      },
      photoMetadata: photos.slice(0, 30).map(function (photo) {
        return photo.metadata || photo.exif || photo;
      })
    };
  }

  function platformContext() {
    var WDS = global.WDS || {};
    var platform = WDS.outdoorIntelligence && WDS.outdoorIntelligence.getLast
      ? WDS.outdoorIntelligence.getLast()
      : null;
    var location = WDS.location && WDS.location.getState ? WDS.location.getState() : null;
    if (!location) location = readJson("wds-location-v3", null);
    var observations = WDS.platformObservations && WDS.platformObservations.recent
      ? WDS.platformObservations.recent(20)
      : [];
    return { platform: platform, location: location, recentObservations: observations };
  }

  function articlesUrl(depth) {
    if (depth === 1) return "../../data/articles/articles.json";
    if (depth >= 2) return "../../../data/articles/articles.json";
    return "/data/articles/articles.json";
  }

  function collectContext(options) {
    options = options || {};
    var context = Object.assign({}, platformContext(), photoContext(), options.context || {});
    if (options.articles) {
      context.articles = options.articles;
      return Promise.resolve(context);
    }
    if (typeof global.fetch !== "function") return Promise.resolve(context);
    return global.fetch(options.articlesUrl || articlesUrl(options.depth || 0), { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("Articles HTTP " + response.status);
        return response.json();
      })
      .then(function (payload) {
        context.articles = arr(payload && payload.articles);
        return context;
      })
      .catch(function () {
        context.articles = [];
        return context;
      });
  }

  function escapeHtml(value) {
    return text(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function render(items, options) {
    options = options || {};
    var heading = options.heading || "Worth noticing";
    if (!items.length) {
      return '<p class="wds-or__empty">No recommendation is justified by the available context right now.</p>';
    }
    return '<div class="wds-or__head"><p class="wds-or__eyebrow">Outdoor intelligence</p><h2>' +
      escapeHtml(heading) + '</h2></div><div class="wds-or__list">' +
      items.map(function (item) {
        var action = item.action
          ? '<a class="wds-or__action" href="' + escapeHtml(item.action.href) + '"' +
            (item.action.external ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" +
            escapeHtml(item.action.label) + "</a>"
          : "";
        return '<article class="wds-or__card" data-recommendation-id="' + escapeHtml(item.id) + '">' +
          '<p class="wds-or__kind">' + escapeHtml(item.kind.replace(/-/g, " ")) + "</p>" +
          "<h3>" + escapeHtml(item.title) + "</h3>" +
          "<p>" + escapeHtml(item.summary) + "</p>" +
          (item.evidence.length ? '<p class="wds-or__evidence">Why: ' + escapeHtml(item.evidence.join(" · ")) + "</p>" : "") +
          action + "</article>";
      }).join("") + '</div><p class="wds-or__honesty">Rule-based suggestions from available local and public context. No AI; field conditions can change.</p>';
  }

  function mount(element, options) {
    options = options || {};
    if (!element) return Promise.resolve([]);
    element.hidden = false;
    element.className = (element.className + " wds-or").trim();
    element.setAttribute("aria-busy", "true");
    return collectContext(options).then(function (context) {
      var items = recommendFor(options.surface || "dashboard", context, {
        limit: options.limit != null ? options.limit : 3,
        kinds: options.kinds,
        includeArticles: options.includeArticles
      });
      element.innerHTML = render(items, options);
      element.removeAttribute("aria-busy");
      return items;
    }).catch(function () {
      element.innerHTML = '<p class="wds-or__empty">Recommendations are unavailable right now.</p>';
      element.removeAttribute("aria-busy");
      return [];
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.outdoorRecommendations = {
    version: VERSION,
    domains: DOMAINS.slice(),
    surfaces: SURFACES.slice(),
    rules: RULES.slice(),
    normalizeContext: normalizeContext,
    recommend: recommend,
    recommendFor: recommendFor,
    collectContext: collectContext,
    render: render,
    mount: mount
  };
})(typeof window !== "undefined" ? window : globalThis);
