/**
 * Dashboard V2 — category widget catalog.
 * Availability is honest: live / derived / planned / experimental / unavailable.
 * Never invents live provider values for planned widgets.
 */
(function (global) {
  "use strict";

  /* RC2 Sprint 3 taxonomy — V3 maps alerts→emergency, seasonal→wildlife when enabled */
  var CATEGORIES = [
    { id: "weather", label: "Weather", order: 10 },
    { id: "astronomy", label: "Astronomy", order: 20 },
    { id: "photography", label: "Photography", order: 30 },
    { id: "hiking", label: "Hiking and Outdoor Activity", order: 40 },
    { id: "rivers", label: "Rivers and Water", order: 50 },
    { id: "air", label: "Air and Environment", order: 60 },
    { id: "alerts", label: "Alerts and Safety", order: 70 },
    { id: "seasonal", label: "Seasonal Intelligence", order: 80 }
  ];

  /**
   * availability:
   *  live         — backed by live provider data when online
   *  derived      — computed from live weather/daylight/etc (honest, not a separate feed)
   *  planned      — catalogued but no provider yet
   *  experimental — partial / heuristic only
   *  unavailable  — cannot show values for this location/session
   */
  var WIDGETS = [
    /* ——— Weather ——— */
    { id: "wx-current", category: "weather", name: "Current Conditions", description: "Temperature, sky, wind, and humidity now.", availability: "live", defaultEnabled: true, defaultOrder: 10, tab: "weather" },
    { id: "wx-hourly", category: "weather", name: "Hourly Forecast", description: "Next several hours of temp, rain chance, and wind.", availability: "live", defaultEnabled: true, defaultOrder: 20, tab: "weather" },
    { id: "wx-multiday", category: "weather", name: "Multi-Day Forecast", description: "Daily outlook for the days ahead.", availability: "live", defaultEnabled: false, defaultOrder: 30, tab: "weather" },
    { id: "wx-precip", category: "weather", name: "Precipitation", description: "Rain/snow chances and recent rainfall context.", availability: "live", defaultEnabled: false, defaultOrder: 40, tab: "weather" },
    { id: "wx-wind", category: "weather", name: "Wind", description: "Sustained wind and gusts when reported.", availability: "live", defaultEnabled: false, defaultOrder: 50, tab: "weather" },
    { id: "wx-temp-trend", category: "weather", name: "Temp Trend", description: "How temperature shifts across the next hours.", availability: "derived", defaultEnabled: false, defaultOrder: 60, tab: "weather" },
    { id: "wx-humidity", category: "weather", name: "Humidity / Dew", description: "Relative humidity; dew point when available.", availability: "live", defaultEnabled: false, defaultOrder: 70, tab: "weather" },
    { id: "wx-visibility", category: "weather", name: "Visibility", description: "Reported visibility distance.", availability: "live", defaultEnabled: false, defaultOrder: 80, tab: "weather" },
    { id: "wx-severe", category: "alerts", name: "Severe Alerts", description: "Active NWS weather alerts for the area.", availability: "live", defaultEnabled: true, defaultOrder: 90, tab: "alerts" },

    /* ——— Astronomy ——— */
    { id: "astro-sun", category: "astronomy", name: "Sunrise / Sunset", description: "Today’s sunrise and sunset times.", availability: "derived", defaultEnabled: true, defaultOrder: 10, tab: "sun-moon" },
    { id: "astro-twilight", category: "astronomy", name: "Twilight", description: "Civil twilight end when daylight data provides it.", availability: "derived", defaultEnabled: false, defaultOrder: 20, tab: "sun-moon" },
    { id: "astro-golden", category: "astronomy", name: "Golden / Blue Hour", description: "Preferred light windows for photography.", availability: "derived", defaultEnabled: true, defaultOrder: 30, tab: "sun-moon" },
    { id: "astro-moon-phase", category: "astronomy", name: "Moon Phase", description: "Phase label and illumination.", availability: "derived", defaultEnabled: true, defaultOrder: 40, tab: "sun-moon" },
    { id: "astro-moon-times", category: "astronomy", name: "Moonrise / Moonset", description: "Moon rise and set when available.", availability: "derived", defaultEnabled: false, defaultOrder: 50, tab: "sun-moon" },
    { id: "astro-night-sky", category: "astronomy", name: "Night Sky", description: "Stargazing suitability from cloud cover and moon.", availability: "derived", defaultEnabled: false, defaultOrder: 60, tab: "sun-moon" },
    { id: "astro-cloud-stargaze", category: "astronomy", name: "Cloud Cover for Stargazing", description: "Cloud percentage for night sky clarity.", availability: "live", defaultEnabled: false, defaultOrder: 70, tab: "sun-moon" },

    /* ——— Photography ——— */
    { id: "photo-conditions", category: "photography", name: "Photography Conditions", description: "Overall light and outdoor photo readiness.", availability: "derived", defaultEnabled: true, defaultOrder: 10, tab: "photography" },
    { id: "photo-landscape", category: "photography", name: "Landscape Conditions", description: "Landscape-oriented light and sky cues.", availability: "derived", defaultEnabled: false, defaultOrder: 20, tab: "photography" },
    { id: "photo-wildlife", category: "photography", name: "Wildlife Conditions", description: "Light and weather cues for wildlife photography.", availability: "derived", defaultEnabled: false, defaultOrder: 30, tab: "photography" },
    { id: "photo-macro", category: "photography", name: "Macro Conditions", description: "Soft-light cues suited to close detail.", availability: "derived", defaultEnabled: false, defaultOrder: 40, tab: "photography" },
    { id: "photo-sunrise", category: "photography", name: "Sunrise Conditions", description: "Morning light window readiness.", availability: "derived", defaultEnabled: false, defaultOrder: 50, tab: "photography" },
    { id: "photo-sunset", category: "photography", name: "Sunset Conditions", description: "Evening light window readiness.", availability: "derived", defaultEnabled: false, defaultOrder: 60, tab: "photography" },
    { id: "photo-night", category: "photography", name: "Night Conditions", description: "Night photography cues from cloud and moon.", availability: "derived", defaultEnabled: false, defaultOrder: 70, tab: "photography" },
    { id: "photo-fog", category: "photography", name: "Fog Potential", description: "Heuristic fog likelihood from humidity and sky.", availability: "experimental", defaultEnabled: false, defaultOrder: 80, tab: "photography" },
    { id: "photo-light", category: "photography", name: "Light Quality", description: "Diffuse vs harsh light character.", availability: "derived", defaultEnabled: false, defaultOrder: 90, tab: "photography" },
    { id: "photo-wind", category: "photography", name: "Wind Impact", description: "How wind may affect shoots and subjects.", availability: "derived", defaultEnabled: false, defaultOrder: 100, tab: "photography" },
    { id: "photo-clarity", category: "photography", name: "Visibility / Clarity", description: "Visibility for distant landscape detail.", availability: "live", defaultEnabled: false, defaultOrder: 110, tab: "photography" },

    /* ——— Hiking ——— */
    { id: "hike-conditions", category: "hiking", name: "Hiking Conditions", description: "Comfort and suitability for hiking today.", availability: "derived", defaultEnabled: true, defaultOrder: 10, tab: "today" },
    { id: "hike-comfort", category: "hiking", name: "Trail Comfort", description: "Temperature, wind, and precip comfort band.", availability: "derived", defaultEnabled: false, defaultOrder: 20, tab: "today" },
    { id: "hike-heat-cold", category: "hiking", name: "Heat / Cold Stress", description: "Thermal stress cues from feels-like temperature.", availability: "derived", defaultEnabled: false, defaultOrder: 30, tab: "today" },
    { id: "hike-rain", category: "hiking", name: "Rain / Storm", description: "Precipitation and storm risk for outdoor time.", availability: "live", defaultEnabled: false, defaultOrder: 40, tab: "alerts", size: "md" },
    { id: "hike-wind", category: "hiking", name: "Wind Exposure", description: "Wind exposure for ridges and open trail.", availability: "live", defaultEnabled: false, defaultOrder: 50, tab: "today" },
    { id: "hike-daylight", category: "hiking", name: "Daylight Remaining", description: "Time left until sunset.", availability: "derived", defaultEnabled: false, defaultOrder: 60, tab: "sun-moon" },
    { id: "hike-mud", category: "hiking", name: "Mud / Wet Trails", description: "Recent rainfall context for wet footing.", availability: "experimental", defaultEnabled: false, defaultOrder: 70, tab: "today" },
    { id: "hike-insect", category: "hiking", name: "Insect Activity", description: "Seasonal insect cues — not a live trap network.", availability: "planned", defaultEnabled: false, defaultOrder: 80, tab: "today" },
    { id: "hike-uv", category: "hiking", name: "UV (Hiking)", description: "UV index for sun exposure on trail.", availability: "live", defaultEnabled: false, defaultOrder: 90, tab: "weather" },

    /* ——— Rivers ——— */
    { id: "river-nearby", category: "rivers", name: "Nearby River Gauges", description: "Closest USGS gauges with stage/flow when live.", availability: "live", defaultEnabled: true, defaultOrder: 10, tab: "rivers" },
    { id: "river-level", category: "rivers", name: "River Level", description: "Gage height at the nearest live site.", availability: "live", defaultEnabled: false, defaultOrder: 20, tab: "rivers" },
    { id: "river-trend", category: "rivers", name: "Level Trend", description: "Rising, falling, or stable stage interpretation.", availability: "live", defaultEnabled: false, defaultOrder: 30, tab: "rivers" },
    { id: "river-flood", category: "alerts", name: "Flood Risk", description: "Flood-related NWS alerts plus gauge context.", availability: "derived", defaultEnabled: false, defaultOrder: 40, tab: "alerts" },
    { id: "river-temp", category: "rivers", name: "Water Temperature", description: "Water temp when a gauge reports it.", availability: "planned", defaultEnabled: false, defaultOrder: 50, tab: "rivers" },
    { id: "river-rain", category: "rivers", name: "Rainfall Impact", description: "Recent rainfall that may affect runoff.", availability: "experimental", defaultEnabled: false, defaultOrder: 60, tab: "rivers" },
    { id: "river-freshness", category: "rivers", name: "Gauge Freshness", description: "How recently nearby gauges reported.", availability: "live", defaultEnabled: false, defaultOrder: 70, tab: "rivers" },

    /* ——— Air ——— */
    { id: "air-aqi", category: "air", name: "Air Quality", description: "US AQI and category when live.", availability: "live", defaultEnabled: true, defaultOrder: 10, tab: "air" },
    { id: "air-pollutant", category: "air", name: "Primary Pollutant", description: "Dominant pollutant when the feed provides it.", availability: "planned", defaultEnabled: false, defaultOrder: 20, tab: "air" },
    { id: "air-pollen", category: "air", name: "Pollen", description: "Pollen outlook — provider not connected yet.", availability: "planned", defaultEnabled: false, defaultOrder: 30, tab: "air" },
    { id: "air-smoke", category: "air", name: "Smoke", description: "Wildfire smoke feed — pending; AQI is the proxy.", availability: "planned", defaultEnabled: false, defaultOrder: 40, tab: "air" },
    { id: "air-uv", category: "air", name: "UV Index", description: "Current UV index from the weather feed.", availability: "live", defaultEnabled: true, defaultOrder: 50, tab: "weather" },
    { id: "air-visibility", category: "air", name: "Visibility (Air)", description: "Atmospheric visibility distance.", availability: "live", defaultEnabled: false, defaultOrder: 60, tab: "air" },
    { id: "air-env-alerts", category: "alerts", name: "Environmental Alerts", description: "Heat, air, and related official cautions.", availability: "derived", defaultEnabled: false, defaultOrder: 70, tab: "alerts" },

    /* ——— Alerts ——— */
    { id: "alert-nws", category: "alerts", name: "NWS Alerts", description: "Official National Weather Service alerts.", availability: "live", defaultEnabled: true, defaultOrder: 10, tab: "alerts" },
    { id: "alert-flood", category: "alerts", name: "Flood Alerts", description: "Flood watches and warnings when issued.", availability: "live", defaultEnabled: false, defaultOrder: 20, tab: "alerts" },
    { id: "alert-heat", category: "alerts", name: "Heat Alerts", description: "Heat advisories and excessive heat warnings.", availability: "live", defaultEnabled: false, defaultOrder: 30, tab: "alerts" },
    { id: "alert-aqi", category: "alerts", name: "AQI Caution", description: "Elevated air quality concern summary.", availability: "derived", defaultEnabled: false, defaultOrder: 40, tab: "air" },
    { id: "alert-fire", category: "alerts", name: "Fire Weather", description: "Fire weather watches/warnings when issued.", availability: "live", defaultEnabled: false, defaultOrder: 50, tab: "alerts" },
    { id: "alert-storm", category: "alerts", name: "Lightning / Storm", description: "Severe thunderstorm and lightning-related alerts.", availability: "live", defaultEnabled: false, defaultOrder: 60, tab: "alerts" },
    { id: "alert-local", category: "alerts", name: "Local Hazard Summary", description: "Combined local hazard picture from live inputs.", availability: "derived", defaultEnabled: false, defaultOrder: 70, tab: "alerts" },

    /* ——— Seasonal ——— */
    { id: "season-leaf", category: "seasonal", name: "Leaf / Phenology", description: "Seasonal leaf and plant timing — planned.", availability: "planned", defaultEnabled: false, defaultOrder: 10, tab: "today" },
    { id: "season-frost", category: "seasonal", name: "Frost", description: "Frost risk cues from overnight lows.", availability: "experimental", defaultEnabled: false, defaultOrder: 20, tab: "weather" },
    { id: "season-snow", category: "seasonal", name: "Snow", description: "Snow/ice language from conditions and alerts.", availability: "derived", defaultEnabled: false, defaultOrder: 30, tab: "weather" },
    { id: "season-mushroom", category: "seasonal", name: "Mushroom", description: "Foraging moisture cues — experimental.", availability: "experimental", defaultEnabled: false, defaultOrder: 40, tab: "today" },
    { id: "season-wildlife", category: "seasonal", name: "Wildlife Activity", description: "Seasonal wildlife activity cues.", availability: "planned", defaultEnabled: false, defaultOrder: 50, tab: "today" },
    { id: "season-migration", category: "seasonal", name: "Migration", description: "Bird migration glance — planned without eBird key.", availability: "planned", defaultEnabled: false, defaultOrder: 60, tab: "today" },
    { id: "season-summary", category: "seasonal", name: "Seasonal Change Summary", description: "Calendar season context for the location.", availability: "derived", defaultEnabled: false, defaultOrder: 70, tab: "today" },
  ];

  var DEFAULT_ENABLED = [
    "wx-current",
    "wx-hourly",
    "wx-severe",
    "astro-sun",
    "astro-golden",
    "astro-moon-phase",
    "photo-conditions",
    "hike-conditions",
    "air-aqi",
    "air-uv",
    "river-nearby"
  ];

  var AVAIL_LABEL = {
    live: "Live",
    derived: "Estimated",
    planned: "Coming later",
    experimental: "Early look",
    unavailable: "Unavailable",
    cached: "Cached",
    offline: "Offline",
    estimated: "Estimated",
    partial: "Partial",
    loading: "Updating…",
    error: "Unavailable"
  };

  function byId(id) {
    for (var i = 0; i < WIDGETS.length; i++) {
      if (WIDGETS[i].id === id) return WIDGETS[i];
    }
    return null;
  }

  function categoryById(id) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === id) return CATEGORIES[i];
    }
    return null;
  }

  function categories() {
    return CATEGORIES.slice().sort(function (a, b) {
      return a.order - b.order;
    });
  }

  function all() {
    return WIDGETS.slice();
  }

  function inCategory(categoryId) {
    return WIDGETS.filter(function (w) {
      return w.category === categoryId;
    }).sort(function (a, b) {
      return a.defaultOrder - b.defaultOrder;
    });
  }

  function defaultEnabledIds() {
    return DEFAULT_ENABLED.slice();
  }

  function availabilityLabel(state) {
    return AVAIL_LABEL[state] || state || "Unknown";
  }

  function resolveAvailability(widget, model) {
    if (!widget) return "unavailable";
    if (widget.availability === "planned") return "planned";
    if (widget.availability === "experimental") return "experimental";

    if (widget.category === "rivers" || widget.id.indexOf("river-") === 0) {
      if (widget.availability === "planned") return "planned";
      if (!model || !model.rivers || !model.rivers.live || !model.rivers.sites.length) {
        if (widget.id === "river-nearby" || widget.id === "river-level" || widget.id === "river-trend" || widget.id === "river-freshness") {
          return "unavailable";
        }
      }
    }

    if ((widget.id === "wx-current" || widget.id === "wx-hourly" || widget.id === "wx-multiday" ||
         widget.id === "wx-precip" || widget.id === "wx-wind" || widget.id === "wx-humidity" ||
         widget.id === "wx-visibility" || widget.id === "wx-temp-trend") &&
        model && model.weather && !model.weather.live) {
      return model.provider && model.provider.fromCache ? "cached" : "unavailable";
    }

    if ((widget.id === "air-aqi") && model && model.air && !model.air.live) {
      return "unavailable";
    }

    return widget.availability;
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV2Widgets = {
    CATEGORIES: CATEGORIES,
    WIDGETS: WIDGETS,
    DEFAULT_ENABLED: DEFAULT_ENABLED,
    categories: categories,
    all: all,
    byId: byId,
    categoryById: categoryById,
    inCategory: inCategory,
    defaultEnabledIds: defaultEnabledIds,
    availabilityLabel: availabilityLabel,
    resolveAvailability: resolveAvailability
  };
})(window);
