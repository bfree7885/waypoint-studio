/**
 * Dashboard Rebuild — widget registry (tile layout repair).
 * Functional catalog only; Coming Soon placeholders removed from the library.
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

  /** Library filter groups. Favorites is prefs-driven. */
  var LIBRARY_CATEGORIES = [
    { id: "weather", label: "Weather" },
    { id: "photography", label: "Photography" },
    { id: "astronomy", label: "Astronomy" },
    { id: "safety", label: "Safety" },
    { id: "favorites", label: "Favorites" }
  ];

  /** Workspace family labels — related instruments read as one group. */
  var FAMILIES = {
    environmental: { id: "environmental", label: "Environmental" },
    astronomy: { id: "astronomy", label: "Astronomy" },
    photography: { id: "photography", label: "Photography" }
  };

  var CATEGORY_FAMILY = {
    conditions: "environmental",
    air: "environmental",
    alerts: "environmental",
    astronomy: "astronomy",
    light: "photography"
  };

  /**
   * Catalog — only functional instruments.
   * Coming-soon placeholders are removed from the selectable library until they ship.
   * Phase 2 live ids keep ph-* keys for local prefs continuity.
   */
  var CATALOG = [
    {
      id: "ph-conditions",
      title: "Conditions",
      category: "conditions",
      libraryCategory: "weather",
      icon: "weather",
      size: "standard",
      defaultVisible: true,
      defaultOrder: 10,
      live: true,
      catalogAvailable: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Temperature, sky, precip, and wind near you.",
      emptyMessage: "Waiting for weather data.",
      offlineMessage: "Weather is offline right now — try again when you are connected."
    },
    {
      id: "ph-air",
      title: "Air",
      category: "air",
      libraryCategory: "weather",
      icon: "weather",
      size: "standard",
      defaultVisible: true,
      defaultOrder: 20,
      live: true,
      catalogAvailable: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Air quality with honest uncertainty.",
      emptyMessage: "Air quality unavailable for this place right now.",
      offlineMessage: "Air quality needs a connection — it will appear when you are back online."
    },
    {
      id: "ph-alerts",
      title: "Alerts",
      category: "alerts",
      libraryCategory: "safety",
      icon: "book",
      size: "standard",
      defaultVisible: true,
      defaultOrder: 30,
      live: false,
      catalogAvailable: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Official alerts — shown only when they matter.",
      emptyMessage: "No active alerts for this place."
    },
    {
      id: "ph-astronomy",
      title: "Astronomy",
      category: "astronomy",
      libraryCategory: "astronomy",
      icon: "species",
      size: "standard",
      defaultVisible: true,
      defaultOrder: 40,
      live: true,
      catalogAvailable: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Night sky context and celestial timing.",
      emptyMessage: "Sky context will appear here.",
      offlineMessage: "Sky context is offline right now."
    },
    {
      id: "ph-light",
      title: "Light",
      category: "light",
      libraryCategory: "photography",
      icon: "compass",
      size: "standard",
      defaultVisible: true,
      defaultOrder: 50,
      live: true,
      catalogAvailable: true,
      kiosk: { show: true, chrome: "minimal" },
      description: "Sunrise, sunset, and observational light windows.",
      emptyMessage: "Sunrise and light windows will appear here.",
      offlineMessage: "Light windows are offline right now."
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
   * Honest payload — live widgets use OIP adapters; catalog-available empty tiles
   * keep a useful empty state (not Coming Soon).
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

    if (widget.live) {
      var DataApi = Data();
      if (DataApi && DataApi.buildWidgetPayload) {
        return DataApi.buildWidgetPayload(id, options.platform || null);
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
    version: "3.3.0-tile-layout",
    sizes: SIZES.slice(),
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
