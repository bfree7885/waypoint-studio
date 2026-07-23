/**
 * Dashboard Rebuild — widget registry (Phase 3: library categories + favorites).
 * Conditions · Light · Air · Astronomy hydrate from OIP; other families stay coming-soon.
 * Authority: docs/rebuild-2026/03-dashboard-architecture.md
 */
(function (global) {
  "use strict";

  var SIZES = ["sm", "md", "lg", "anchor"];

  /** Library filter groups (Phase 3 Customize). Favorites is prefs-driven. */
  var LIBRARY_CATEGORIES = [
    { id: "weather", label: "Weather" },
    { id: "photography", label: "Photography" },
    { id: "astronomy", label: "Astronomy" },
    { id: "hiking", label: "Hiking" },
    { id: "water", label: "Water" },
    { id: "travel", label: "Travel" },
    { id: "nature", label: "Nature" },
    { id: "safety", label: "Safety" },
    { id: "favorites", label: "Favorites" }
  ];

  /** Catalog — Phase 2 live ids keep ph-* keys for local prefs continuity. */
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
      description: "Temperature, sky, precip, and wind near you.",
      emptyMessage: "Waiting for weather data."
    },
    {
      id: "ph-light",
      title: "Light",
      category: "light",
      libraryCategory: "photography",
      icon: "compass",
      size: "md",
      defaultVisible: true,
      defaultOrder: 20,
      live: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Sun, moon, and observational light windows.",
      emptyMessage: "Light windows will appear here."
    },
    {
      id: "ph-air",
      title: "Air",
      category: "air",
      libraryCategory: "weather",
      icon: "weather",
      size: "sm",
      defaultVisible: true,
      defaultOrder: 30,
      live: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Air quality with honest uncertainty.",
      emptyMessage: "Air quality unavailable for this place right now."
    },
    {
      id: "ph-astronomy",
      title: "Astronomy",
      category: "astronomy",
      libraryCategory: "astronomy",
      icon: "species",
      size: "md",
      defaultVisible: true,
      defaultOrder: 40,
      live: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Night sky context and celestial timing.",
      emptyMessage: "Sky context will appear here."
    },
    {
      id: "ph-photography",
      title: "Photography",
      category: "photography",
      libraryCategory: "photography",
      icon: "camera",
      size: "md",
      defaultVisible: false,
      defaultOrder: 50,
      live: false,
      kiosk: { show: true, chrome: "minimal" },
      description: "Light quality and photography windows.",
      emptyMessage: "Photography windows coming soon."
    },
    {
      id: "ph-rivers",
      title: "Rivers",
      category: "rivers",
      libraryCategory: "water",
      icon: "map",
      size: "sm",
      defaultVisible: false,
      defaultOrder: 60,
      live: false,
      kiosk: { show: true, chrome: "minimal" },
      description: "Nearby gauges and river status when relevant.",
      emptyMessage: "River status coming soon."
    },
    {
      id: "ph-wildlife",
      title: "Wildlife",
      category: "wildlife",
      libraryCategory: "nature",
      icon: "leaf",
      size: "md",
      defaultVisible: false,
      defaultOrder: 70,
      live: false,
      kiosk: { show: true, chrome: "minimal" },
      description: "Observational wildlife context for your place.",
      emptyMessage: "Wildlife notes coming soon."
    },
    {
      id: "ph-alerts",
      title: "Alerts",
      category: "alerts",
      libraryCategory: "safety",
      icon: "book",
      size: "sm",
      defaultVisible: true,
      defaultOrder: 80,
      live: false,
      kiosk: { show: true, chrome: "minimal" },
      description: "Official alerts — shown only when they matter.",
      emptyMessage: "No alerts to show yet."
    },
    {
      id: "ph-trails",
      title: "Trail Conditions",
      category: "trails",
      libraryCategory: "hiking",
      icon: "terrain",
      size: "md",
      defaultVisible: false,
      defaultOrder: 90,
      live: false,
      kiosk: { show: true, chrome: "minimal" },
      description: "Trail surface and access context when available.",
      emptyMessage: "Trail conditions coming soon."
    },
    {
      id: "ph-travel",
      title: "Travel",
      category: "travel",
      libraryCategory: "travel",
      icon: "compass",
      size: "md",
      defaultVisible: false,
      defaultOrder: 100,
      live: false,
      kiosk: { show: true, chrome: "minimal" },
      description: "Place-to-place outdoor context when available.",
      emptyMessage: "Travel context coming soon."
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
    return SIZES.indexOf(size) >= 0 ? size : "md";
  }

  function availability(widget) {
    if (widget && widget.live) {
      return { id: "available", label: "Available" };
    }
    return { id: "coming-soon", label: "Coming Soon" };
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

  /**
   * Honest payload — live widgets use OIP adapters; others stay coming-soon.
   */
  function getData(id, options) {
    options = options || {};
    var widget = get(id);
    if (!widget) {
      return {
        trust: "waiting",
        status: "unavailable",
        message: "Widget coming soon."
      };
    }

    if (widget.live) {
      var DataApi = Data();
      if (DataApi && DataApi.buildWidgetPayload) {
        return DataApi.buildWidgetPayload(id, options.platform || null);
      }
    }

    return {
      trust: "waiting",
      status: "placeholder",
      message: widget.emptyMessage || "Coming soon.",
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
    var inner = "";
    if (data.facts && data.facts.length) {
      inner = renderFacts(data.facts);
    } else {
      inner =
        '<p class="wdb-r-widget__status">' +
        escapeHtml(data.message || widget.emptyMessage || "Data will appear here.") +
        "</p>";
    }
    return (
      '<div class="wdb-r-widget__body" data-trust="' +
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
    version: "3.0.0-phase3",
    sizes: SIZES.slice(),
    libraryCategories: libraryCategories,
    all: all,
    get: get,
    defaultVisibleIds: defaultVisibleIds,
    defaultOrderIds: defaultOrderIds,
    normalizeSize: normalizeSize,
    availability: availability,
    byLibraryCategory: byLibraryCategory,
    iconHtml: iconHtml,
    getData: getData,
    render: renderBody,
    renderPlaceholder: renderPlaceholder,
    trustChipLabel: trustChipLabel,
    kioskEligibleIds: kioskEligibleIds
  };
})(typeof window !== "undefined" ? window : global);
