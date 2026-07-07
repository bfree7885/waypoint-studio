/**
 * Educational Fallback — calm field-guide panels when live data is absent.
 * Never invent observations; clearly labeled as educational, not live.
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
    "invasive-watch": "conservation",
    "restoration-projects": "conservation"
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

  function render(topicKey, options) {
    options = options || {};
    var topic = resolveTopic(topicKey);
    var pending = options.pendingLive
      ? '<p class="wdb-edu-fallback__pending" aria-live="polite">Checking for live data for your location…</p>'
      : "";

    return (
      '<div class="wdb-edu-fallback" role="region" aria-label="' + escapeHtml(topic.title) + ' — educational field guide">' +
        '<span class="wdb-edu-fallback__badge">Educational · not live data</span>' +
        '<p class="wdb-edu-fallback__why">' + escapeHtml(topic.why) + "</p>" +
        '<div class="wdb-edu-fallback__block">' +
          '<span class="wdb-edu-fallback__label">Field tip</span>' +
          '<p class="wdb-edu-fallback__text">' + escapeHtml(topic.fieldTip) + "</p>" +
        "</div>" +
        '<div class="wdb-edu-fallback__block">' +
          '<span class="wdb-edu-fallback__label">Did you know</span>' +
          '<p class="wdb-edu-fallback__text">' + escapeHtml(topic.fact) + "</p>" +
        "</div>" +
        '<p class="wdb-edu-fallback__live-note">Live weather and sun/moon use your coordinates when connected. This panel is educational — not local species or agency data.</p>' +
        pending +
      "</div>"
    );
  }

  function renderPending(topicKey, options) {
    options = options || {};
    options.pendingLive = true;
    return render(topicKey, options);
  }

  function widgetData(topicKey, options) {
    options = options || {};
    var topic = topicForWidget(options.widgetId, topicKey);
    topic = topicKey && TOPICS[topicKey] ? topicKey : topic;
    return {
      status: "educational",
      tag: { label: "Educational", className: "wdb-widget__tag--editorial" },
      summary: options.summary || resolveTopic(topic).title,
      educationalTopic: topic,
      educationalHtml: render(topic, options)
    };
  }

  function mountHtml(mountKind, options) {
    return renderPending(topicForMount(mountKind), options);
  }

  function tagEducational() {
    return { label: "Educational", className: "wdb-widget__tag--editorial" };
  }

  global.WDS = global.WDS || {};
  global.WDS.educationalFallback = {
    TOPICS: TOPICS,
    render: render,
    renderPending: renderPending,
    widgetData: widgetData,
    mountHtml: mountHtml,
    topicForWidget: topicForWidget,
    topicForMount: topicForMount,
    topicFromCategory: topicFromCategory,
    tagEducational: tagEducational
  };
})(window);
