/**
 * Dashboard Rebuild — functional tile catalog registry.
 * Every entry is live: payloads read the shared OIP platform package or
 * documented local calculations. No placeholders, no Coming Soon.
 * Authority: docs/rebuild-2026/03-dashboard-architecture.md
 */
(function (global) {
  "use strict";

  /**
   * Authoritative tile size model — equal-width columns by default.
   * Legacy sm/md/lg/anchor/half/compact map through normalizeSize.
   */
  var SIZES = ["standard", "wide", "featured"];
  var LEGACY_SIZE_MAP = {
    sm: "standard",
    md: "standard",
    lg: "wide",
    anchor: "featured",
    small: "standard",
    half: "standard",
    compact: "standard",
    standard: "standard",
    wide: "wide",
    featured: "featured"
  };

  /** Library categories — grouped catalog browsing. Favorites is prefs-driven. */
  var LIBRARY_CATEGORIES = [
    {
      id: "weather",
      label: "Weather",
      description: "Current readings and short-range forecast from Open-Meteo."
    },
    {
      id: "photography",
      label: "Photography",
      description: "Light windows and sky conditions calculated for this place."
    },
    {
      id: "astronomy",
      label: "Astronomy",
      description: "Sun, moon, and night-sky context."
    },
    {
      id: "air",
      label: "Air and Environment",
      description: "Air quality, UV, and outdoor exposure context."
    },
    {
      id: "hiking",
      label: "Hiking and Trails",
      description: "Condition estimates for time outside. Not trail reports."
    },
    {
      id: "water",
      label: "Rivers and Water",
      description: "Nearest USGS gauge, rainfall, and official flood alerts."
    },
    {
      id: "wildlife",
      label: "Wildlife and Birding",
      description: "Observation-condition aids. Never a prediction of animals."
    },
    {
      id: "travel",
      label: "Travel and Access",
      description: "Weather-driven travel context for your location."
    },
    {
      id: "safety",
      label: "Alerts and Safety",
      description: "Official NWS alerts plus explained risk summaries."
    },
    { id: "favorites", label: "Favorites", description: "Instruments you pinned." }
  ];

  /** Workspace family labels — related instruments read as one group. */
  var FAMILIES = {
    weather: { id: "weather", label: "Weather" },
    photography: { id: "photography", label: "Photography" },
    astronomy: { id: "astronomy", label: "Astronomy" },
    air: { id: "air", label: "Air and Environment" },
    hiking: { id: "hiking", label: "Hiking and Trails" },
    water: { id: "water", label: "Rivers and Water" },
    wildlife: { id: "wildlife", label: "Wildlife and Birding" },
    travel: { id: "travel", label: "Travel and Access" },
    safety: { id: "safety", label: "Alerts and Safety" }
  };

  var SRC_OPEN_METEO = "Open-Meteo";
  var SRC_NWS = "NOAA / National Weather Service";
  var SRC_USGS = "USGS Water Services";
  var SRC_CALC = "Waypoint calculation";

  /**
   * Catalog — 32 functional instruments across nine categories.
   * `dataDependencies` names the shared platform slices each tile reads so a
   * single failing provider only affects the tiles that depend on it.
   */
  var CATALOG = [
    /* ——— Weather ——— */
    {
      id: "ph-conditions",
      title: "Current Conditions",
      category: "conditions",
      libraryCategory: "weather",
      icon: "weather",
      size: "standard",
      defaultVisible: true,
      defaultOrder: 10,
      dataDependencies: ["weatherRef.current"],
      sourceLabel: SRC_OPEN_METEO,
      description: "Temperature, apparent temperature, sky, wind, humidity, and precipitation.",
      emptyMessage: "Waiting for weather data.",
      offlineMessage: "Weather is offline right now — try again when you are connected."
    },
    {
      id: "ph-hourly",
      title: "Hourly Forecast",
      category: "hourly",
      libraryCategory: "weather",
      icon: "weather",
      size: "standard",
      defaultVisible: true,
      defaultOrder: 20,
      dataDependencies: ["weatherRef.hourly"],
      sourceLabel: SRC_OPEN_METEO,
      description: "The next several hours of temperature and precipitation chance.",
      emptyMessage: "Hourly forecast unavailable for this place right now."
    },
    {
      id: "ph-forecast",
      title: "Daily Forecast",
      category: "forecast",
      libraryCategory: "weather",
      icon: "weather",
      size: "standard",
      defaultVisible: false,
      defaultOrder: 30,
      dataDependencies: ["weatherRef.daily"],
      sourceLabel: SRC_OPEN_METEO,
      description: "Highs, lows, and precipitation chance for the coming days.",
      emptyMessage: "Daily forecast unavailable for this place right now."
    },
    {
      id: "ph-wind",
      title: "Wind",
      category: "wind",
      libraryCategory: "weather",
      icon: "compass",
      size: "standard",
      defaultVisible: false,
      defaultOrder: 40,
      dataDependencies: ["weatherRef.current.wind"],
      sourceLabel: SRC_OPEN_METEO,
      description: "Speed, gusts, direction, and a plain-language outdoor reading.",
      emptyMessage: "Wind readings unavailable for this place right now."
    },
    {
      id: "ph-precip",
      title: "Precipitation Window",
      category: "precipitation",
      libraryCategory: "weather",
      icon: "weather",
      size: "standard",
      defaultVisible: false,
      defaultOrder: 50,
      dataDependencies: ["weatherRef.hourly"],
      sourceLabel: SRC_OPEN_METEO,
      description: "When precipitation is expected and the next likely dry stretch.",
      emptyMessage: "Precipitation timing unavailable for this place right now."
    },

    /* ——— Photography ——— */
    {
      id: "ph-golden",
      title: "Golden Hour",
      category: "light",
      libraryCategory: "photography",
      icon: "camera",
      size: "standard",
      defaultVisible: true,
      defaultOrder: 60,
      dataDependencies: ["daylight"],
      sourceLabel: SRC_CALC,
      description: "Morning and evening golden-hour windows with sunrise and sunset.",
      emptyMessage: "Golden hour will appear once sunrise and sunset arrive."
    },
    {
      id: "ph-blue",
      title: "Blue Hour",
      category: "light",
      libraryCategory: "photography",
      icon: "camera",
      size: "standard",
      defaultVisible: false,
      defaultOrder: 70,
      dataDependencies: ["daylight"],
      sourceLabel: SRC_CALC,
      description: "Morning and evening blue-hour windows for this date.",
      emptyMessage: "Blue hour will appear once sunrise and sunset arrive."
    },
    {
      id: "ph-photo",
      title: "Photography Conditions",
      category: "photography",
      libraryCategory: "photography",
      icon: "camera",
      size: "standard",
      defaultVisible: false,
      defaultOrder: 80,
      dataDependencies: ["weatherRef.current", "daylight"],
      sourceLabel: SRC_CALC,
      description: "Light, cloud, wind, and precipitation read together as conditions.",
      emptyMessage: "Photography conditions need weather data for this place."
    },
    {
      id: "ph-sky",
      title: "Cloud and Sky",
      category: "sky",
      libraryCategory: "photography",
      icon: "weather",
      size: "standard",
      defaultVisible: false,
      defaultOrder: 90,
      dataDependencies: ["weatherRef.current"],
      sourceLabel: SRC_OPEN_METEO,
      description: "Cloud cover and sky character, with dramatic-sky potential noted.",
      emptyMessage: "Cloud cover unavailable for this place right now."
    },
    {
      id: "ph-night-photo",
      title: "Night Photography",
      category: "night",
      libraryCategory: "photography",
      icon: "species",
      size: "standard",
      defaultVisible: false,
      defaultOrder: 100,
      dataDependencies: ["daylight", "weatherRef.current"],
      sourceLabel: SRC_CALC,
      description: "Moon illumination and cloud cover read for night shooting.",
      emptyMessage: "Night conditions need moon and cloud data."
    },

    /* ——— Astronomy ——— */
    {
      id: "ph-sun",
      title: "Sun and Daylight",
      category: "astronomy",
      libraryCategory: "astronomy",
      icon: "compass",
      size: "standard",
      defaultVisible: true,
      defaultOrder: 110,
      dataDependencies: ["daylight"],
      sourceLabel: SRC_CALC,
      description: "Sunrise, sunset, day length, and solar midpoint.",
      emptyMessage: "Sun times will appear for this place shortly."
    },
    {
      id: "ph-moon",
      title: "Moon Phase",
      category: "astronomy",
      libraryCategory: "astronomy",
      icon: "species",
      size: "standard",
      defaultVisible: false,
      defaultOrder: 120,
      dataDependencies: ["daylight"],
      sourceLabel: SRC_CALC,
      description: "Current lunar phase and illumination, computed locally.",
      emptyMessage: "Moon phase will appear once the date resolves."
    },
    {
      id: "ph-dark-sky",
      title: "Dark-Sky Window",
      category: "astronomy",
      libraryCategory: "astronomy",
      icon: "species",
      size: "standard",
      defaultVisible: false,
      defaultOrder: 130,
      dataDependencies: ["daylight", "weatherRef.current"],
      sourceLabel: SRC_CALC,
      description: "Astronomical twilight, moon interference, and cloud cover together.",
      emptyMessage: "Dark-sky context needs twilight and cloud data."
    },

    /* ——— Air and Environment ——— */
    {
      id: "ph-air",
      title: "Air Quality",
      category: "air",
      libraryCategory: "air",
      icon: "leaf",
      size: "standard",
      defaultVisible: true,
      defaultOrder: 140,
      dataDependencies: ["airQuality"],
      sourceLabel: SRC_OPEN_METEO,
      description: "US AQI, PM2.5, and the matching health category.",
      emptyMessage: "Air quality unavailable for this place right now.",
      offlineMessage: "Air quality needs a connection — it will appear when you are back online."
    },
    {
      id: "ph-uv",
      title: "UV Index",
      category: "uv",
      libraryCategory: "air",
      icon: "compass",
      size: "standard",
      defaultVisible: false,
      defaultOrder: 150,
      dataDependencies: ["weatherRef.current.uvIndex", "weatherRef.daily"],
      sourceLabel: SRC_OPEN_METEO,
      description: "Current UV index, daily maximum, and exposure category.",
      emptyMessage: "UV index unavailable for this place right now."
    },
    {
      id: "ph-exposure",
      title: "Outdoor Exposure",
      category: "exposure",
      libraryCategory: "air",
      icon: "leaf",
      size: "standard",
      defaultVisible: false,
      defaultOrder: 160,
      dataDependencies: ["airQuality", "weatherRef.current"],
      sourceLabel: SRC_CALC,
      description: "Air quality, UV, and apparent temperature summarized together.",
      emptyMessage: "Exposure summary needs air and weather data."
    },

    /* ——— Hiking and Trails ——— */
    {
      id: "ph-hiking-window",
      title: "Hiking Window",
      category: "hiking",
      libraryCategory: "hiking",
      icon: "terrain",
      size: "standard",
      defaultVisible: true,
      defaultOrder: 170,
      dataDependencies: ["weatherRef.hourly", "daylight", "alerts"],
      sourceLabel: SRC_CALC,
      description: "The calmer upcoming hours based on precipitation, wind, and daylight.",
      emptyMessage: "Hiking window needs hourly weather for this place."
    },
    {
      id: "ph-daylight-left",
      title: "Daylight Remaining",
      category: "daylight",
      libraryCategory: "hiking",
      icon: "compass",
      size: "standard",
      defaultVisible: true,
      defaultOrder: 180,
      dataDependencies: ["daylight"],
      sourceLabel: SRC_CALC,
      description: "Time until sunset and the end of usable civil twilight.",
      emptyMessage: "Daylight remaining needs sunset time for this place."
    },
    {
      id: "ph-trail-estimate",
      title: "Trail Condition Estimate",
      category: "trails",
      libraryCategory: "hiking",
      icon: "terrain",
      size: "standard",
      defaultVisible: false,
      defaultOrder: 190,
      dataDependencies: ["weatherRef.current", "weatherRef.hourly"],
      sourceLabel: SRC_CALC,
      description: "Mud, ice, or heat likelihood estimated from recent weather. Not a trail report.",
      emptyMessage: "Trail estimate needs recent precipitation and temperature."
    },
    {
      id: "ph-pack",
      title: "Pack Guidance",
      category: "pack",
      libraryCategory: "hiking",
      icon: "book",
      size: "standard",
      defaultVisible: false,
      defaultOrder: 200,
      dataDependencies: ["weatherRef.current", "daylight"],
      sourceLabel: SRC_CALC,
      description: "A few condition-based suggestions. Not a complete safety checklist.",
      emptyMessage: "Pack guidance needs current conditions."
    },

    /* ——— Rivers and Water ——— */
    {
      id: "ph-river",
      title: "River Level",
      category: "rivers",
      libraryCategory: "water",
      icon: "map",
      size: "standard",
      defaultVisible: true,
      defaultOrder: 210,
      dataDependencies: ["usgsWater"],
      sourceLabel: SRC_USGS,
      description: "Nearest USGS gauge height and discharge with distance.",
      emptyMessage: "No USGS gauge reporting near this location."
    },
    {
      id: "ph-rainfall",
      title: "Recent Rainfall",
      category: "rainfall",
      libraryCategory: "water",
      icon: "weather",
      size: "standard",
      defaultVisible: false,
      defaultOrder: 220,
      dataDependencies: ["weatherRef.hourly"],
      sourceLabel: SRC_OPEN_METEO,
      description: "Recent precipitation totals with an estimated runoff note.",
      emptyMessage: "Recent rainfall needs hourly precipitation data."
    },
    {
      id: "ph-flood",
      title: "Flood Context",
      category: "flood",
      libraryCategory: "water",
      icon: "map",
      size: "standard",
      defaultVisible: false,
      defaultOrder: 230,
      dataDependencies: ["alerts"],
      sourceLabel: SRC_NWS,
      description: "Official flood-related alerts for this location, when issued.",
      emptyMessage: "No flood alerts for this place."
    },

    /* ——— Wildlife and Birding ——— */
    {
      id: "ph-birding",
      title: "Birding Conditions",
      category: "birding",
      libraryCategory: "wildlife",
      icon: "species",
      size: "standard",
      defaultVisible: false,
      defaultOrder: 240,
      dataDependencies: ["weatherRef.current", "daylight"],
      sourceLabel: SRC_CALC,
      description: "Wind, precipitation, and time of day as an observation aid.",
      emptyMessage: "Birding conditions need current weather."
    },
    {
      id: "ph-wildlife-window",
      title: "Wildlife Observation Window",
      category: "wildlife",
      libraryCategory: "wildlife",
      icon: "leaf",
      size: "standard",
      defaultVisible: true,
      defaultOrder: 250,
      dataDependencies: ["daylight", "weatherRef.current"],
      sourceLabel: SRC_CALC,
      description: "Dawn and dusk windows with wind and moon context.",
      emptyMessage: "Observation windows need sunrise and sunset."
    },
    {
      id: "ph-seasonal",
      title: "Seasonal Context",
      category: "seasonal",
      libraryCategory: "wildlife",
      icon: "leaf",
      size: "standard",
      defaultVisible: false,
      defaultOrder: 260,
      dataDependencies: ["location", "daylight"],
      sourceLabel: SRC_CALC,
      description: "Season and day-length trend for this date and latitude.",
      emptyMessage: "Seasonal context needs the local date."
    },

    /* ——— Travel and Access ——— */
    {
      id: "ph-driving",
      title: "Driving Conditions",
      category: "driving",
      libraryCategory: "travel",
      icon: "compass",
      size: "standard",
      defaultVisible: false,
      defaultOrder: 270,
      dataDependencies: ["weatherRef.current"],
      sourceLabel: SRC_CALC,
      description: "Precipitation, freezing risk, and wind read for travel. Not road reports.",
      emptyMessage: "Driving context needs current weather."
    },
    {
      id: "ph-travel-window",
      title: "Outdoor Travel Window",
      category: "travel",
      libraryCategory: "travel",
      icon: "map",
      size: "standard",
      defaultVisible: false,
      defaultOrder: 280,
      dataDependencies: ["weatherRef.hourly", "daylight", "alerts"],
      sourceLabel: SRC_CALC,
      description: "A calmer departure window based on precipitation, alerts, and daylight.",
      emptyMessage: "Travel window needs hourly weather."
    },
    {
      id: "ph-place",
      title: "Location Summary",
      category: "place",
      libraryCategory: "travel",
      icon: "map",
      size: "standard",
      defaultVisible: false,
      defaultOrder: 290,
      dataDependencies: ["location", "elevation", "daylight"],
      sourceLabel: SRC_OPEN_METEO,
      description: "Selected place, timezone, and elevation when reported.",
      emptyMessage: "Location details will appear once a place is set."
    },

    /* ——— Alerts and Safety ——— */
    {
      id: "ph-alerts",
      title: "Active Weather Alerts",
      category: "alerts",
      libraryCategory: "safety",
      icon: "book",
      size: "standard",
      defaultVisible: true,
      defaultOrder: 300,
      dataDependencies: ["alerts"],
      sourceLabel: SRC_NWS,
      description: "Official alerts with severity and expiration, shown only when active.",
      emptyMessage: "No active alerts for this place."
    },
    {
      id: "ph-risk",
      title: "Outdoor Risk Summary",
      category: "risk",
      libraryCategory: "safety",
      icon: "book",
      size: "standard",
      defaultVisible: true,
      defaultOrder: 310,
      dataDependencies: ["alerts", "weatherRef.current", "airQuality"],
      sourceLabel: SRC_CALC,
      description: "Combines alerts, wind, air quality, and temperature, naming each input.",
      emptyMessage: "Risk summary needs weather and alert data."
    },
    {
      id: "ph-freeze",
      title: "Freeze or Ice Risk",
      category: "freeze",
      libraryCategory: "safety",
      icon: "weather",
      size: "standard",
      defaultVisible: false,
      defaultOrder: 320,
      dataDependencies: ["weatherRef.current", "weatherRef.hourly"],
      sourceLabel: SRC_CALC,
      description: "Freezing likelihood estimated from temperature and precipitation.",
      emptyMessage: "Freeze risk needs temperature and precipitation."
    }
  ];

  /* Every catalog entry is functional: live payload + selectable. */
  CATALOG.forEach(function (w) {
    w.live = true;
    w.catalogAvailable = true;
    w.kiosk = w.kiosk || { show: true, chrome: "minimal" };
  });

  var byId = Object.create(null);
  CATALOG.forEach(function (w) {
    byId[w.id] = w;
  });

  function Data() {
    return global.WDS && global.WDS.dashboardRebuildData;
  }

  function all() {
    return CATALOG.slice().sort(function (a, b) {
      return (a.defaultOrder || 0) - (b.defaultOrder || 0);
    });
  }

  function get(id) {
    return byId[id] || null;
  }

  function defaultVisibleIds() {
    return all()
      .filter(function (w) {
        return !!w.defaultVisible;
      })
      .map(function (w) {
        return w.id;
      });
  }

  function defaultOrderIds() {
    return all().map(function (w) {
      return w.id;
    });
  }

  function normalizeSize(size) {
    var key = String(size == null ? "" : size).toLowerCase();
    if (LEGACY_SIZE_MAP[key]) return LEGACY_SIZE_MAP[key];
    return SIZES.indexOf(size) >= 0 ? size : "standard";
  }

  function availability(widget) {
    if (widget && (widget.live || widget.catalogAvailable)) {
      return { id: "available", label: "Available" };
    }
    return { id: "unavailable", label: "Unavailable" };
  }

  function libraryCategories() {
    return LIBRARY_CATEGORIES.slice();
  }

  /** Selectable categories exclude the prefs-driven Favorites pseudo-tab. */
  function selectableCategories() {
    return LIBRARY_CATEGORIES.filter(function (c) {
      return c.id !== "favorites";
    });
  }

  function byLibraryCategory(categoryId, prefs) {
    var Prefs = global.WDS && global.WDS.dashboardRebuildPrefs;
    if (categoryId === "favorites") {
      var favs =
        prefs && prefs.favorites
          ? prefs.favorites.slice()
          : Prefs && Prefs.load
            ? Prefs.load().favorites || []
            : [];
      return favs
        .map(function (id) {
          return get(id);
        })
        .filter(Boolean);
    }
    if (!categoryId || categoryId === "all") return all();
    return all().filter(function (w) {
      return w.libraryCategory === categoryId;
    });
  }

  function categoryIdsFor(categoryId) {
    return byLibraryCategory(categoryId, null).map(function (w) {
      return w.id;
    });
  }

  function iconHtml(widget) {
    var Icons = global.WDS && global.WDS.icons;
    var name = (widget && widget.icon) || "compass";
    if (Icons && Icons.svg) {
      var svg = Icons.svg(name, { className: "wdb-r-catalog__icon-svg", decorative: true });
      if (svg) return svg;
    }
    var letter = String((widget && widget.title) || "?").charAt(0).toUpperCase();
    return '<span class="wdb-r-catalog__icon-fallback" aria-hidden="true">' + letter + "</span>";
  }

  function familyFor(widget) {
    var key = (widget && widget.libraryCategory) || "weather";
    return FAMILIES[key] || { id: key, label: key };
  }

  function trustChipLabel(trust) {
    var t = String(trust || "waiting").toLowerCase();
    if (t === "live") return "Live";
    if (t === "cached") return "Cached";
    if (t === "partial") return "Partial";
    if (t === "offline") return "Offline";
    if (t === "estimated") return "Estimated";
    if (t === "unavailable") return "Unavailable";
    if (t === "pending" || t === "waiting") return "Waiting";
    return "Waiting";
  }

  function trustAttr(trust) {
    var t = String(trust || "waiting").toLowerCase();
    if (t === "pending") return "waiting";
    if (t === "estimated") return "estimated";
    if (t === "unavailable") return "unavailable";
    return t || "waiting";
  }

  function humanMessage(widget, data) {
    widget = widget || {};
    data = data || {};
    var trust = trustAttr(data.trust || "waiting");
    if (data.message) return data.message;
    if (trust === "offline") {
      return widget.offlineMessage || "You appear offline. Readings will return when connected.";
    }
    if (trust === "unavailable") {
      return widget.emptyMessage || "This reading is unavailable for this place right now.";
    }
    return widget.emptyMessage || "Data will appear here.";
  }

  /**
   * Payload comes from the shared platform package. A tile whose dependency is
   * missing reports honestly instead of failing the whole workspace.
   */
  function getData(id, options) {
    options = options || {};
    var widget = get(id);
    if (!widget) {
      return {
        trust: "waiting",
        status: "unavailable",
        message: "This instrument is not available yet."
      };
    }

    var DataApi = Data();
    if (DataApi && DataApi.buildWidgetPayload) {
      var payload = null;
      try {
        payload = DataApi.buildWidgetPayload(id, options.platform || null);
      } catch (e) {
        payload = null;
      }
      if (payload) {
        /* Credit the provider that actually answered, not the default. */
        if (!payload.source && widget.sourceLabel === SRC_OPEN_METEO && DataApi.weatherSource) {
          var actual = DataApi.weatherSource(options.platform || null);
          if (actual) payload.source = actual;
        }
        return payload;
      }
    }

    return {
      trust: "waiting",
      status: "empty",
      message: widget.emptyMessage || "Data will appear here.",
      widgetId: widget.id,
      category: widget.category
    };
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderFacts(facts) {
    if (!facts || !facts.length) return "";
    return (
      '<dl class="wdb-r-widget__facts">' +
      facts
        .map(function (f) {
          return (
            '<div class="wdb-r-widget__fact">' +
            "<dt>" +
            escapeHtml(f.label) +
            "</dt>" +
            "<dd>" +
            escapeHtml(f.value) +
            (f.note
              ? ' <span class="wdb-r-widget__note">' + escapeHtml(f.note) + "</span>"
              : "") +
            "</dd>" +
            "</div>"
          );
        })
        .join("") +
      "</dl>"
    );
  }

  function renderBody(widget, data) {
    widget = widget || {};
    data = data || getData(widget.id);
    var trust = trustAttr(data.trust || "waiting");
    var state =
      trust === "offline" || trust === "unavailable"
        ? trust
        : data.status === "empty"
          ? "waiting"
          : trust === "waiting"
            ? "waiting"
            : "ready";
    var inner = "";
    if (data.facts && data.facts.length) {
      inner = renderFacts(data.facts);
    } else {
      inner =
        '<div class="wdb-r-widget__state wdb-r-widget__state--' +
        escapeHtml(state) +
        '">' +
        '<p class="wdb-r-widget__status">' +
        escapeHtml(humanMessage(widget, data)) +
        "</p>" +
        "</div>";
    }
    var note =
      data.interpretation && data.facts && data.facts.length
        ? '<p class="wdb-r-widget__interpretation">' + escapeHtml(data.interpretation) + "</p>"
        : "";
    var basis = data.basis
      ? '<p class="wdb-r-widget__basis">' + escapeHtml(data.basis) + "</p>"
      : "";
    var sourceLabel = data.source || widget.sourceLabel;
    var source =
      sourceLabel && data.facts && data.facts.length
        ? '<span class="wdb-r-widget__source">' + escapeHtml(sourceLabel) + "</span>"
        : "";
    return (
      '<div class="wdb-r-widget__body wdb-r-widget__body--' +
      escapeHtml(state) +
      '" data-trust="' +
      escapeHtml(trust) +
      '"' +
      (data.status ? ' data-status="' + escapeHtml(data.status) + '"' : "") +
      ">" +
      inner +
      note +
      basis +
      '<p class="wdb-r-widget__trust"><span class="wds-trust-chip" data-trust="' +
      escapeHtml(trust) +
      '">' +
      escapeHtml(trustChipLabel(trust)) +
      "</span>" +
      source +
      "</p>" +
      "</div>"
    );
  }

  function renderPlaceholder(widget, data) {
    return renderBody(widget, data);
  }

  function kioskEligibleIds() {
    return all()
      .filter(function (w) {
        return w.kiosk && w.kiosk.show !== false;
      })
      .map(function (w) {
        return w.id;
      });
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildRegistry = {
    version: "4.0.0-tile-catalog",
    sizes: SIZES.slice(),
    libraryCategories: libraryCategories,
    selectableCategories: selectableCategories,
    categoryIdsFor: categoryIdsFor,
    all: all,
    get: get,
    defaultVisibleIds: defaultVisibleIds,
    defaultOrderIds: defaultOrderIds,
    normalizeSize: normalizeSize,
    availability: availability,
    byLibraryCategory: byLibraryCategory,
    familyFor: familyFor,
    iconHtml: iconHtml,
    getData: getData,
    render: renderBody,
    renderPlaceholder: renderPlaceholder,
    trustChipLabel: trustChipLabel,
    humanMessage: humanMessage,
    kioskEligibleIds: kioskEligibleIds
  };
})(typeof window !== "undefined" ? window : global);
