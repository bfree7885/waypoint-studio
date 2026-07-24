/**
 * Dashboard Rebuild — widget registry (RC3 Sprint 6: functional catalog only).
 * Every catalog entry is live against OIP adapters — no Coming Soon tiles.
 * Authority: docs/rebuild-2026/03-dashboard-architecture.md
 */
(function (global) {
  "use strict";

  var SIZES = ["sm", "md", "lg", "anchor"];

  /** Library filter groups (Customize). Favorites is prefs-driven. */
  var LIBRARY_CATEGORIES = [
    { id: "weather", label: "Weather" },
    { id: "photography", label: "Photography" },
    { id: "astronomy", label: "Astronomy" },
    { id: "water", label: "Water" },
    { id: "safety", label: "Safety" },
    { id: "favorites", label: "Favorites" }
  ];

  /**
   * Workspace family labels — related instruments read as one group.
   */
  var FAMILIES = {
    environmental: { id: "environmental", label: "Environmental" },
    astronomy: { id: "astronomy", label: "Astronomy" },
    photography: { id: "photography", label: "Photography" },
    water: { id: "water", label: "Water" }
  };

  var CATEGORY_FAMILY = {
    conditions: "environmental",
    hourly: "environmental",
    daily: "environmental",
    wind: "environmental",
    rain: "environmental",
    air: "environmental",
    uv: "environmental",
    alerts: "environmental",
    light: "photography",
    golden: "photography",
    blue: "photography",
    photography: "photography",
    photo: "photography",
    moon: "astronomy",
    stargazing: "astronomy",
    astronomy: "astronomy",
    rivers: "water",
    water: "water"
  };

  /** Catalog — ph-* keys preserved for local prefs continuity where possible. */
  var CATALOG = [
    {
      id: "ph-conditions",
      title: "Conditions",
      category: "conditions",
      libraryCategory: "weather",
      icon: "weather",
      size: "md",
      defaultVisible: true,
      defaultOrder: 10,
      live: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Temperature, sky, and humidity near you.",
      emptyMessage: "Waiting for weather data.",
      offlineMessage: "Weather is offline right now — try again when you are connected."
    },
    {
      id: "ph-hourly",
      title: "Hourly",
      category: "hourly",
      libraryCategory: "weather",
      icon: "weather",
      size: "md",
      defaultVisible: true,
      defaultOrder: 15,
      live: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Near-term hourly temperature and precip chance.",
      emptyMessage: "Hourly forecast will appear here.",
      offlineMessage: "Hourly forecast needs a connection."
    },
    {
      id: "ph-daily",
      title: "Daily",
      category: "daily",
      libraryCategory: "weather",
      icon: "weather",
      size: "md",
      defaultVisible: false,
      defaultOrder: 18,
      live: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Today’s high, low, and precip outlook.",
      emptyMessage: "Daily outlook will appear here.",
      offlineMessage: "Daily outlook needs a connection."
    },
    {
      id: "ph-alerts",
      title: "Alerts",
      category: "alerts",
      libraryCategory: "safety",
      icon: "book",
      size: "md",
      defaultVisible: true,
      defaultOrder: 20,
      live: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Official alerts — shown only when they matter.",
      emptyMessage: "No active alerts for this place.",
      offlineMessage: "Alerts need a connection."
    },
    {
      id: "ph-wind",
      title: "Wind",
      category: "wind",
      libraryCategory: "weather",
      icon: "weather",
      size: "sm",
      defaultVisible: false,
      defaultOrder: 25,
      live: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Wind speed and gusts near you.",
      emptyMessage: "Wind readings will appear here.",
      offlineMessage: "Wind needs a connection."
    },
    {
      id: "ph-rain",
      title: "Rain",
      category: "rain",
      libraryCategory: "weather",
      icon: "weather",
      size: "sm",
      defaultVisible: false,
      defaultOrder: 28,
      live: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Precipitation chance and reported amount.",
      emptyMessage: "Rain chance will appear here.",
      offlineMessage: "Rain context needs a connection."
    },
    {
      id: "ph-air",
      title: "Air Quality",
      category: "air",
      libraryCategory: "weather",
      icon: "weather",
      size: "md",
      defaultVisible: true,
      defaultOrder: 30,
      live: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Air quality with honest uncertainty.",
      emptyMessage: "Air quality unavailable for this place right now.",
      offlineMessage: "Air quality needs a connection — it will appear when you are back online."
    },
    {
      id: "ph-uv",
      title: "UV Index",
      category: "uv",
      libraryCategory: "weather",
      icon: "weather",
      size: "sm",
      defaultVisible: false,
      defaultOrder: 35,
      live: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Ultraviolet index and exposure level.",
      emptyMessage: "UV index will appear here.",
      offlineMessage: "UV index needs a connection."
    },
    {
      id: "ph-light",
      title: "Sunrise & Sunset",
      category: "light",
      libraryCategory: "photography",
      icon: "compass",
      size: "md",
      defaultVisible: true,
      defaultOrder: 40,
      live: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Sunrise and sunset for your place.",
      emptyMessage: "Sunrise and sunset will appear here.",
      offlineMessage: "Sunrise and sunset are offline right now."
    },
    {
      id: "ph-golden",
      title: "Golden Hour",
      category: "golden",
      libraryCategory: "photography",
      icon: "camera",
      size: "sm",
      defaultVisible: false,
      defaultOrder: 45,
      live: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Golden-hour light windows.",
      emptyMessage: "Golden hour will appear here.",
      offlineMessage: "Golden hour needs a connection."
    },
    {
      id: "ph-blue",
      title: "Blue Hour",
      category: "blue",
      libraryCategory: "photography",
      icon: "camera",
      size: "sm",
      defaultVisible: false,
      defaultOrder: 48,
      live: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Blue-hour light windows.",
      emptyMessage: "Blue hour will appear here.",
      offlineMessage: "Blue hour needs a connection."
    },
    {
      id: "ph-photo",
      title: "Photo Conditions",
      category: "photo",
      libraryCategory: "photography",
      icon: "camera",
      size: "md",
      defaultVisible: false,
      defaultOrder: 50,
      live: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Cloud, wind, and light context for photography.",
      emptyMessage: "Photo conditions will appear here.",
      offlineMessage: "Photo conditions need a connection."
    },
    {
      id: "ph-moon",
      title: "Moon",
      category: "moon",
      libraryCategory: "astronomy",
      icon: "species",
      size: "md",
      defaultVisible: true,
      defaultOrder: 60,
      live: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Moon phase, illumination, and timing.",
      emptyMessage: "Moon context will appear here.",
      offlineMessage: "Moon context is offline right now."
    },
    {
      id: "ph-stargazing",
      title: "Stargazing",
      category: "stargazing",
      libraryCategory: "astronomy",
      icon: "species",
      size: "md",
      defaultVisible: false,
      defaultOrder: 65,
      live: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Night-sky favorability from clouds and moonlight.",
      emptyMessage: "Stargazing context will appear here.",
      offlineMessage: "Stargazing context is offline right now."
    },
    {
      id: "ph-rivers",
      title: "River Gauge",
      category: "rivers",
      libraryCategory: "water",
      icon: "map",
      size: "md",
      defaultVisible: false,
      defaultOrder: 70,
      live: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Nearest USGS gauge stage and flow when available.",
      emptyMessage: "River gauge readings will appear here.",
      offlineMessage: "River gauges need a connection."
    }
  ];

  var byId = Object.create(null);
  CATALOG.forEach(function (w) {
    byId[w.id] = w;
  });

  /** Removed placeholder / retired ids — soft-migrated out of saved prefs. */
  var REMOVED_IDS = [
    "ph-photography",
    "ph-wildlife",
    "ph-trails",
    "ph-travel",
    "ph-astronomy"
  ];

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
    return SIZES.indexOf(size) >= 0 ? size : "md";
  }

  function availability(widget) {
    if (widget && widget.live) {
      return { id: "available", label: "Available" };
    }
    return { id: "unavailable", label: "Unavailable" };
  }

  function libraryCategories() {
    return LIBRARY_CATEGORIES.slice();
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
    var cat = widget && widget.category ? String(widget.category) : "";
    var key = CATEGORY_FAMILY[cat] || cat || "environmental";
    return FAMILIES[key] || { id: key, label: cat || "Instruments" };
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
   * Honest payload — every catalog widget uses OIP adapters when live.
   */
  function getData(id, options) {
    options = options || {};
    var widget = get(id);
    if (!widget) {
      return {
        trust: "unavailable",
        status: "unavailable",
        message: "This instrument is not available."
      };
    }

    if (widget.live) {
      var DataApi = Data();
      if (DataApi && DataApi.buildWidgetPayload) {
        return DataApi.buildWidgetPayload(id, options.platform || null);
      }
    }

    return {
      trust: "unavailable",
      status: "unavailable",
      message: widget.emptyMessage || "This reading is unavailable.",
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
        : data.status === "placeholder"
          ? "placeholder"
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
    return (
      '<div class="wdb-r-widget__body wdb-r-widget__body--' +
      escapeHtml(state) +
      '" data-trust="' +
      escapeHtml(trust) +
      '"' +
      (data.status ? ' data-status="' + escapeHtml(data.status) + '"' : "") +
      ">" +
      inner +
      '<p class="wdb-r-widget__trust"><span class="wds-trust-chip" data-trust="' +
      escapeHtml(trust) +
      '">' +
      escapeHtml(trustChipLabel(trust)) +
      "</span></p>" +
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
    version: "3.3.0-rc3-s6",
    sizes: SIZES.slice(),
    removedIds: REMOVED_IDS.slice(),
    libraryCategories: libraryCategories,
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
