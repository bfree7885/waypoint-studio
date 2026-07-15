/**
 * Operational block fallback — Loading / Unavailable panels when live data is absent.
 * Never invent observations; never leave blank or endless pending states.
 */
(function (global) {
  "use strict";

  var TOPICS = {
    weather: {
      title: "Weather",
      why: "Weather shapes every outdoor decision — temperature, wind, and rain influence wildlife movement, plant and fungi fruiting, trail mud, stream crossings, and how long you can stay comfortable in the field.",
      fieldTip: "Before you leave, note the forecast and the last 48 hours of rain. A clear morning after overnight rain often means fog in valleys and tacky soil on north-facing slopes.",
      fact: "Cold fronts can trigger bird fallouts and push hawks to ride ridge lift — the same pressure change that clears skies can concentrate migration along ridgelines."
    },
    wildlife: {
      title: "Wildlife",
      why: "Wildlife activity follows daily and seasonal rhythms — food, cover, temperature, and daylight drive when animals move and where you are likely to notice sign.",
      fieldTip: "Scan edges and transitions: field borders, stream corridors, and forest openings. Move slowly, pause often, and use binoculars before approaching.",
      fact: "Many songbirds migrate at night and land to feed at dawn — the hour after sunrise is often the richest window for listening, not just looking."
    },
    foraging: {
      title: "Foraging",
      why: "Wild foods appear where habitat, moisture, and season align. Understanding those patterns helps you investigate ethically instead of harvesting blindly.",
      fieldTip: "Identify every species with multiple characteristics before any harvest. When uncertain, photograph, note habitat, and leave the specimen in place.",
      fact: "Fungi fruiting often follows sustained soil moisture and a favorable soil temperature band — the mushroom is the fruiting body of a much larger underground network."
    },
    water: {
      title: "Water",
      why: "Watersheds connect ridges to valleys — stream flow, temperature, and clarity reflect recent rain, land use, and the health of aquatic habitat upstream.",
      fieldTip: "Look for mud lines on rocks, debris against fallen logs, and cloudy water after storms before deciding to cross or wade.",
      fact: "Headwater streams stay colder and clearer than downstream reaches because smaller catchments respond faster to rain but also recover more quickly between storms."
    },
    trails: {
      title: "Trails",
      why: "Trail conditions depend on soil type, slope, shade, and recent use. Good trail etiquette protects habitat and keeps routes open for everyone.",
      fieldTip: "Walk through muddy patches on durable surfaces when possible rather than widening the tread by going around — Leave No Trace asks us to minimize impact.",
      fact: "North-facing slopes and ravines hold moisture and ice longer than south-facing ridges — the same hike can be dry on top and muddy below."
    },
    astronomy: {
      title: "Sun & Moon",
      why: "Sunrise, sunset, moon phase, and darkness timing affect navigation safety, photography light, and when nocturnal wildlife becomes active.",
      fieldTip: "Check moonrise and moonset before a night hike or Milky Way session — a bright moon washes out faint stars but can beautifully illuminate landscapes.",
      fact: "Astronomical twilight ends when the sun is 18° below the horizon — the darkest skies for stargazing come in the hours before moonrise or after moonset."
    },
    photography: {
      title: "Photography",
      why: "Outdoor photography rewards patience with light. Composition and exposure choices help you show habitat context without disturbing what you came to observe.",
      fieldTip: "Place the horizon on the upper or lower third of the frame, not the center — and check for distracting branches at the edges before you click.",
      fact: "The hour after sunrise and before sunset (golden hour) gives warm, directional light that reveals texture on bark, leaves, and rock faces."
    },
    safety: {
      title: "Safety",
      why: "Outdoor hazards — heat, storms, ticks, UV, and terrain — are manageable when you anticipate them and plan margins for changing conditions.",
      fieldTip: "Tell someone your route and return time. Carry water, a warm layer, and rain protection even on days that start clear.",
      fact: "UV index rises quickly on hazy summer days — reflection off water and snow can double exposure compared with shaded forest trails."
    },
    conservation: {
      title: "Conservation",
      why: "Stewardship connects personal field time to habitat health — invasive species, erosion, and recreation pressure all affect the places we return to.",
      fieldTip: "Stay on durable surfaces, pack out all litter including fruit peels, and report trail damage to land managers when you see it.",
      fact: "Invasive plants often green up earlier in spring than natives — learning to recognize a few local invaders helps protect vulnerable ecosystems."
    },
    flora: {
      title: "Flora",
      why: "Plant phenology — leaf-out, bloom, fruit, and senescence — marks seasonal progression and provides context for wildlife activity and habitat conditions.",
      fieldTip: "Photograph the same plant or vista each week through a season — repeat observation reveals timing you cannot see in a single visit.",
      fact: "Elevation changes effective season by roughly three to five days per 100 meters of climb in many temperate forests."
    },
    "my-dashboard": {
      title: "Your dashboard",
      why: "Personalizing your dashboard helps you focus on the outdoor intelligence that matters most for how you explore — morning brief, photography, foraging, or full explorer mode.",
      fieldTip: "Use Customize to show wildlife or trail widgets before a hike, or hide sections you do not need on quiet mornings at home.",
      fact: "Field notebooks work best with consistent habits — even three lines about weather and one species noticed builds a valuable personal phenology record."
    }
  };

  var CATEGORY_TOPICS = {
    conditions: "weather",
    "sun-moon": "astronomy",
    safety: "safety",
    wildlife: "wildlife",
    foraging: "foraging",
    flora: "flora",
    water: "water",
    trails: "trails",
    photography: "photography",
    astronomy: "astronomy",
    conservation: "conservation",
    "my-dashboard": "my-dashboard"
  };

  var MOUNT_TOPICS = {
    "outdoor-weather": "weather",
    current: "weather",
    hourly: "weather",
    daily: "weather",
    wind: "weather",
    uv: "weather",
    dashboard: "weather",
    "sun-moon": "astronomy",
    "sun-moon-dashboard": "astronomy",
    "photography-dashboard": "photography",
    "wildlife-dashboard": "wildlife",
    "trail-dashboard": "trails",
    "water-dashboard": "water",
    "flora-dashboard": "flora",
    "foraging-dashboard": "foraging",
    "safety-dashboard": "safety",
    sunrise: "astronomy",
    sunset: "astronomy",
    "golden-hour": "astronomy",
    "blue-hour": "astronomy",
    "moon-phase": "astronomy",
    moonrise: "astronomy",
    moonset: "astronomy",
    "cloud-cover": "photography",
    "fog-potential": "photography"
  };

  var WIDGET_TOPICS = {
    "outdoor-weather": "weather",
    "current-weather": "weather",
    "hourly-forecast": "weather",
    "weekly-forecast": "weather",
    wind: "weather",
    "air-quality": "weather",
    "glance-temp": "weather",
    "glance-sunrise": "astronomy",
    "glance-uv": "weather",
    "todays-outdoor-highlights": "weather",
    "sun-moon-dashboard": "astronomy",
    sunrise: "astronomy",
    sunset: "astronomy",
    "golden-hour": "astronomy",
    "blue-hour": "astronomy",
    "moon-phase": "astronomy",
    moonrise: "astronomy",
    moonset: "astronomy",
    "wildlife-dashboard": "wildlife",
    "wildlife-activity": "wildlife",
    "bird-migration": "wildlife",
    "amphibian-activity": "wildlife",
    "insect-activity": "wildlife",
    "foraging-dashboard": "foraging",
    "mushroom-outlook": "foraging",
    "berry-conditions": "foraging",
    "seasonal-edibles": "foraging",
    "recent-rainfall": "foraging",
    "flora-dashboard": "flora",
    "bloom-calendar": "flora",
    "tree-phenology": "flora",
    "wildflower-activity": "flora",
    "fall-color": "flora",
    "water-dashboard": "water",
    "river-levels": "water",
    "stream-flow": "water",
    "water-temperature": "water",
    "flood-status": "water",
    "trail-dashboard": "trails",
    "trail-conditions": "trails",
    "trail-closures": "trails",
    "park-alerts": "trails",
    "parking-updates": "trails",
    "photography-conditions-dashboard": "photography",
    "sunrise-quality": "photography",
    "sunset-quality": "photography",
    "fog-potential": "photography",
    "cloud-cover": "photography",
    "milky-way": "astronomy",
    aurora: "astronomy",
    "planet-visibility": "astronomy",
    "visible-planets": "astronomy",
    "iss-passes": "astronomy",
    "meteor-showers": "astronomy",
    "dark-sky-rating": "astronomy",
    "safety-dashboard": "safety",
    "tick-activity": "safety",
    "mosquito-activity": "safety",
    "fire-danger": "safety",
    "heat-risk": "safety",
    "storm-risk": "safety",
    "uv-index": "safety",
    "conservation-news": "conservation",
    "volunteer-events": "conservation",
    "volunteer-opportunities": "conservation",
    "invasive-watch": "conservation",
    "invasive-species-alerts": "conservation",
    "restoration-projects": "conservation",
    "habitat-projects": "conservation"
  };

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function resolveTopic(key) {
    if (!key) return TOPICS.weather;
    var topicKey = CATEGORY_TOPICS[key] || MOUNT_TOPICS[key] || WIDGET_TOPICS[key] || key;
    return TOPICS[topicKey] || TOPICS.weather;
  }

  function topicForWidget(widgetId, category) {
    if (widgetId && WIDGET_TOPICS[widgetId]) return WIDGET_TOPICS[widgetId];
    if (category && CATEGORY_TOPICS[category]) return CATEGORY_TOPICS[category];
    return category || "weather";
  }

  function topicForMount(mountKind) {
    return MOUNT_TOPICS[mountKind] || "weather";
  }

  function topicFromCategory(category) {
    return CATEGORY_TOPICS[category] || category || "weather";
  }

  function Rel() {
    return global.WDS && global.WDS.dashboardReliability;
  }

  function opsBadge(state) {
    var R = Rel();
    if (R && R.tagFor) return R.tagFor(state).label;
    if (state === "loading") return "Loading";
    if (state === "offline") return "Offline";
    if (state === "cached") return "Cached";
    if (state === "partial") return "Partial";
    if (state === "error") return "Error";
    return "Provider Unavailable";
  }

  function opsWhy(title, state, options) {
    var R = Rel();
    options = options || {};
    if (state === "loading") {
      return R && R.waitingCopy
        ? R.waitingCopy(options.mountKind)
        : "Waiting for outdoor data…";
    }
    if (R && R.unavailableCopy) {
      return R.unavailableCopy(options.mountKind, { state: state });
    }
    if (state === "offline") return "You appear to be offline.";
    if (state === "cached") return "Showing the last known conditions from this device.";
    return "Provider temporarily unavailable for " + title + ".";
  }

  function opsNote(state, options) {
    options = options || {};
    if (state === "loading") {
      return "This block hydrates independently and will settle to Live, Partial, Cached, Offline, or Provider Unavailable.";
    }
    if (state === "offline") {
      return "Reconnect to refresh live providers. Other dashboard blocks continue when offline caches exist.";
    }
    if (state === "cached") {
      var age = Rel() && Rel().ageLabel ? Rel().ageLabel(options.updatedAt) : null;
      return (age ? age + ". " : "") + "Values may be out of date until a live provider responds.";
    }
    if (state === "partial") {
      return "Some providers succeeded; others timed out or failed. Retry individual blocks or wait for the next refresh.";
    }
    if (state === "error") {
      return "A hard error occurred for this provider. Retry this block — other blocks are unaffected.";
    }
    return "Upstream provider did not return usable data in this load cycle. Other dashboard blocks continue to render.";
  }

  function render(topicKey, options) {
    options = options || {};
    var topic = resolveTopic(topicKey);
    var title = topic && topic.title ? topic.title : "Outdoor data";
    var R = Rel();
    var state = R && R.resolveOperationalState
      ? R.resolveOperationalState(options)
      : (options.pendingLive ? "loading" : "provider-unavailable");
    var loading = state === "loading";
    return (
      '<div class="wdb-edu-fallback wdb-edu-fallback--ops" data-ops-state="' + escapeHtml(state) + '" role="region" aria-label="' + escapeHtml(title) + ' — operational status" aria-busy="' + (loading ? "true" : "false") + '">' +
        '<span class="wdb-edu-fallback__badge">' + escapeHtml(opsBadge(state)) + "</span>" +
        '<p class="wdb-edu-fallback__why"><strong>' + escapeHtml(title) + ':</strong> ' +
          escapeHtml(opsWhy(title, state, options)) +
        "</p>" +
        '<p class="wdb-edu-fallback__live-note">' +
          escapeHtml(opsNote(state, options)) +
        "</p>" +
      "</div>"
    );
  }

  function renderPending(topicKey, options) {
    options = options || {};
    options.pendingLive = true;
    options.state = "loading";
    return render(topicKey, options);
  }

  function renderUnavailable(topicKey, options) {
    options = options || {};
    options.pendingLive = false;
    if (!options.state) {
      var R = Rel();
      if (R && !R.isOnline()) options.state = "offline";
      else options.state = "provider-unavailable";
    }
    return render(topicKey, options);
  }

  function widgetData(topicKey, options) {
    options = options || {};
    var topic = topicForWidget(options.widgetId, topicKey);
    topic = topicKey && TOPICS[topicKey] ? topicKey : topic;
    var R = Rel();
    var state = R && R.resolveOperationalState
      ? R.resolveOperationalState(options)
      : (options.pendingLive ? "loading" : "provider-unavailable");
    var tag = R && R.tagFor ? R.tagFor(state) : {
      label: state === "loading" ? "Loading" : "Provider Unavailable",
      className: state === "loading" ? "wdb-widget__tag--loading" : "wdb-widget__tag--unavailable"
    };
    return {
      status: state === "loading" ? "loading" : "unavailable",
      tag: tag,
      summary: options.summary || resolveTopic(topic).title,
      educationalTopic: topic,
      educationalHtml: render(topic, options),
      body: opsWhy(resolveTopic(topic).title, state, options),
      opsState: state
    };
  }

  function mountHtml(mountKind, options) {
    options = options || {};
    options.mountKind = mountKind;
    return renderPending(topicForMount(mountKind), options);
  }

  function tagEducational() {
    var R = Rel();
    if (R && R.tagFor) return R.tagFor("provider-unavailable");
    return { label: "Provider Unavailable", className: "wdb-widget__tag--unavailable" };
  }

  global.WDS = global.WDS || {};
  global.WDS.educationalFallback = {
    TOPICS: TOPICS,
    render: render,
    renderPending: renderPending,
    renderUnavailable: renderUnavailable,
    widgetData: widgetData,
    mountHtml: mountHtml,
    topicForWidget: topicForWidget,
    topicForMount: topicForMount,
    topicFromCategory: topicFromCategory,
    tagEducational: tagEducational
  };
})(window);
