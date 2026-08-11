/**
 * Dashboard Rebuild — widget registry (depth attack).
 * Functional catalog only; honest LIVE / DERIVED instruments.
 * Authority: docs/rebuild-2026/03-dashboard-architecture.md
 */
(function (global) {
  "use strict";

  /**
   * Authoritative tile size model.
   * Small / Standard / Wide / Featured.
   */
  var SIZES = ["small", "standard", "wide", "featured"];
  var LEGACY_SIZE_MAP = {
    sm: "small",
    md: "standard",
    lg: "wide",
    anchor: "featured",
    half: "standard",
    compact: "small",
    small: "small",
    standard: "standard",
    wide: "wide",
    featured: "featured"
  };

  /** Library filter groups. Favorites is prefs-driven. */
  var LIBRARY_CATEGORIES = [
    { id: "core", label: "Core" },
    { id: "sky", label: "Sky & light" },
    { id: "air", label: "Air" },
    { id: "weather", label: "Weather" },
    { id: "field", label: "Field" },
    { id: "favorites", label: "Favorites" }
  ];

  var LIBRARY_GROUP_ORDER = ["core", "sky", "air", "weather", "field"];

  /** Workspace family labels — related instruments read as one group. */
  var FAMILIES = {
    now: { id: "now", label: "Now outside" },
    soon: { id: "soon", label: "Coming soon" },
    environmental: { id: "environmental", label: "Air & alerts" },
    sky: { id: "sky", label: "Sky & light" },
    field: { id: "field", label: "Before you go" }
  };

  var CATEGORY_FAMILY = {
    conditions: "now",
    next: "soon",
    precip: "soon",
    range: "soon",
    air: "environmental",
    alerts: "environmental",
    wind: "environmental",
    comfort: "environmental",
    light: "sky",
    astronomy: "sky",
    uv: "sky",
    doorway: "field"
  };

  /**
   * Catalog — only functional instruments with real adapters.
   */
  var CATALOG = [
    {
      id: "ph-conditions",
      title: "Conditions",
      category: "conditions",
      libraryCategory: "core",
      libraryGroup: "core",
      icon: "weather",
      size: "featured",
      defaultVisible: true,
      defaultOrder: 10,
      live: true,
      catalogAvailable: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Temperature, sky, precip, and wind near you — right now.",
      emptyMessage: "Waiting for weather data.",
      offlineMessage: "Weather is offline right now — try again when you are connected."
    },
    {
      id: "ph-next-hours",
      title: "Next hours",
      category: "next",
      libraryCategory: "core",
      libraryGroup: "core",
      icon: "weather",
      size: "wide",
      defaultVisible: true,
      defaultOrder: 20,
      live: true,
      catalogAvailable: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "What the next few hours look like — temp, precip, sky.",
      emptyMessage: "Hourly outlook will appear here.",
      offlineMessage: "Hourly outlook needs a connection."
    },
    {
      id: "ph-doorway",
      title: "Before you go",
      category: "doorway",
      libraryCategory: "field",
      libraryGroup: "field",
      icon: "compass",
      size: "wide",
      defaultVisible: true,
      defaultOrder: 30,
      live: true,
      catalogAvailable: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "A short derived brief from alerts, precip, air, UV, wind, and sunset.",
      emptyMessage: "Before-you-go notes settle as instruments arrive.",
      offlineMessage: "Before-you-go notes need a connection."
    },
    {
      id: "ph-alerts",
      title: "Alerts",
      category: "alerts",
      libraryCategory: "core",
      libraryGroup: "core",
      icon: "book",
      size: "standard",
      defaultVisible: true,
      defaultOrder: 40,
      live: true,
      catalogAvailable: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Official NWS alerts — shown when they matter.",
      emptyMessage: "No active alerts for this place.",
      offlineMessage: "Alerts need a connection."
    },
    {
      id: "ph-air",
      title: "Air",
      category: "air",
      libraryCategory: "air",
      libraryGroup: "air",
      icon: "weather",
      size: "standard",
      defaultVisible: true,
      defaultOrder: 50,
      live: true,
      catalogAvailable: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Air quality with honest uncertainty.",
      emptyMessage: "Air quality unavailable for this place right now.",
      offlineMessage: "Air quality needs a connection — it will appear when you are back online."
    },
    {
      id: "ph-precip-window",
      title: "Rain timing",
      category: "precip",
      libraryCategory: "weather",
      libraryGroup: "weather",
      icon: "weather",
      size: "standard",
      defaultVisible: true,
      defaultOrder: 60,
      live: true,
      catalogAvailable: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "When precip chance rises in the next hours.",
      emptyMessage: "Rain timing will appear when hourly precip arrives.",
      offlineMessage: "Rain timing needs a connection."
    },
    {
      id: "ph-uv",
      title: "UV",
      category: "uv",
      libraryCategory: "sky",
      libraryGroup: "sky",
      icon: "compass",
      size: "small",
      defaultVisible: true,
      defaultOrder: 70,
      live: true,
      catalogAvailable: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "UV index now and today’s max when reported.",
      emptyMessage: "UV will appear when the provider reports it.",
      offlineMessage: "UV needs a connection."
    },
    {
      id: "ph-light",
      title: "Light",
      category: "light",
      libraryCategory: "sky",
      libraryGroup: "sky",
      icon: "compass",
      size: "standard",
      defaultVisible: true,
      defaultOrder: 80,
      live: true,
      catalogAvailable: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Sunrise, sunset, and observational light windows.",
      emptyMessage: "Sunrise and light windows will appear here.",
      offlineMessage: "Light windows are offline right now."
    },
    {
      id: "ph-astronomy",
      title: "Astronomy",
      category: "astronomy",
      libraryCategory: "sky",
      libraryGroup: "sky",
      icon: "species",
      size: "standard",
      defaultVisible: true,
      defaultOrder: 90,
      live: true,
      catalogAvailable: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Night sky context and celestial timing.",
      emptyMessage: "Sky context will appear here.",
      offlineMessage: "Sky context is offline right now."
    },
    {
      id: "ph-wind",
      title: "Wind",
      category: "wind",
      libraryCategory: "weather",
      libraryGroup: "weather",
      icon: "weather",
      size: "small",
      defaultVisible: false,
      defaultOrder: 100,
      live: true,
      catalogAvailable: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Wind speed and gusts near you.",
      emptyMessage: "Wind will appear with weather.",
      offlineMessage: "Wind needs a connection."
    },
    {
      id: "ph-comfort",
      title: "How it feels",
      category: "comfort",
      libraryCategory: "air",
      libraryGroup: "air",
      icon: "weather",
      size: "small",
      defaultVisible: false,
      defaultOrder: 110,
      live: true,
      catalogAvailable: true,
      kiosk: { show: false },
      description: "Derived feel from temperature, humidity, and feels-like.",
      emptyMessage: "Comfort reading settles with temperature."
    },
    {
      id: "ph-day-range",
      title: "Today’s range",
      category: "range",
      libraryCategory: "weather",
      libraryGroup: "weather",
      icon: "weather",
      size: "standard",
      defaultVisible: false,
      defaultOrder: 120,
      live: true,
      catalogAvailable: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Today’s high, low, and precip probability.",
      emptyMessage: "Today’s range will appear with the daily forecast.",
      offlineMessage: "Daily range needs a connection."
    }
  ];

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

  function libraryGroupOrder() {
    return LIBRARY_GROUP_ORDER.slice();
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
      return w.libraryCategory === categoryId || w.libraryGroup === categoryId;
    });
  }

  function familyFor(widget) {
    var cat = widget && widget.category ? String(widget.category) : "";
    var key = CATEGORY_FAMILY[cat] || cat || "environmental";
    return FAMILIES[key] || { id: key, label: cat || "Instruments" };
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

  function DataApi() {
    return Data();
  }

  function trustChipLabel(trust) {
    var t = String(trust || "waiting").toLowerCase();
    if (t === "live") return "Live";
    if (t === "cached") return "Cached";
    if (t === "partial") return "Partial";
    if (t === "offline") return "Offline";
    if (t === "estimated") return "Estimated";
    if (t === "derived") return "Derived";
    if (t === "unavailable") return "Unavailable";
    if (t === "pending" || t === "waiting") return "Waiting";
    return "Waiting";
  }

  function trustAttr(trust) {
    var t = String(trust || "waiting").toLowerCase();
    if (t === "pending") return "waiting";
    if (t === "estimated") return "estimated";
    if (t === "derived") return "derived";
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

    if (widget.live) {
      var api = DataApi();
      if (api && api.buildWidgetPayload) {
        return api.buildWidgetPayload(id, options.platform || null);
      }
    }

    if (widget.catalogAvailable) {
      return {
        trust: "waiting",
        status: "empty",
        message: widget.emptyMessage || "Data will appear here.",
        widgetId: widget.id,
        category: widget.category
      };
    }

    return {
      trust: "unavailable",
      status: "unavailable",
      message: widget.emptyMessage || "This instrument is not available yet.",
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

  function renderGraphic(data) {
    var G = global.WDS && global.WDS.dashboardRebuildGraphics;
    if (!G || !G.render || !data || !data.graphic) return "";
    try {
      return G.render(data.graphic) || "";
    } catch (e) {
      return "";
    }
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
          : data.status === "empty"
            ? "waiting"
            : trust === "waiting"
              ? "waiting"
              : "ready";
    var graphic = state === "ready" ? renderGraphic(data) : "";
    var inner = "";
    if (data.facts && data.facts.length) {
      inner = graphic + renderFacts(data.facts);
    } else {
      inner =
        graphic +
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
    version: "4.0.0-depth",
    sizes: SIZES.slice(),
    libraryCategories: libraryCategories,
    libraryGroupOrder: libraryGroupOrder,
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
