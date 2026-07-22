/**
 * Dashboard Rebuild — widget registry (Phase 1: placeholders only).
 * Catalog anticipates future families; no live instruments yet.
 * Authority: docs/rebuild-2026/03-dashboard-architecture.md
 */
(function (global) {
  "use strict";

  var SIZES = ["sm", "md", "lg", "anchor"];

  /** Placeholder catalog — validates framework; anticipates widget families. */
  var PLACEHOLDERS = [
    {
      id: "ph-conditions",
      title: "Conditions",
      category: "conditions",
      size: "md",
      defaultVisible: true,
      defaultOrder: 10,
      kiosk: { show: true, chrome: "minimal" },
      description: "Temperature, sky, precip, and wind near you.",
      emptyMessage: "Waiting for weather data."
    },
    {
      id: "ph-light",
      title: "Light",
      category: "light",
      size: "md",
      defaultVisible: true,
      defaultOrder: 20,
      kiosk: { show: true, chrome: "minimal" },
      description: "Sun, moon, and observational light windows.",
      emptyMessage: "Light windows will appear here."
    },
    {
      id: "ph-air",
      title: "Air",
      category: "air",
      size: "sm",
      defaultVisible: true,
      defaultOrder: 30,
      kiosk: { show: true, chrome: "minimal" },
      description: "Air quality with honest uncertainty.",
      emptyMessage: "Connect a provider to display conditions."
    },
    {
      id: "ph-astronomy",
      title: "Astronomy",
      category: "astronomy",
      size: "md",
      defaultVisible: true,
      defaultOrder: 40,
      kiosk: { show: true, chrome: "minimal" },
      description: "Night sky context and celestial timing.",
      emptyMessage: "Sky context will appear here."
    },
    {
      id: "ph-photography",
      title: "Photography",
      category: "photography",
      size: "md",
      defaultVisible: true,
      defaultOrder: 50,
      kiosk: { show: true, chrome: "minimal" },
      description: "Light quality and photography windows.",
      emptyMessage: "Photography windows will appear here."
    },
    {
      id: "ph-rivers",
      title: "Rivers",
      category: "rivers",
      size: "sm",
      defaultVisible: true,
      defaultOrder: 60,
      kiosk: { show: true, chrome: "minimal" },
      description: "Nearby gauges and river status when relevant.",
      emptyMessage: "River status will appear here."
    },
    {
      id: "ph-wildlife",
      title: "Wildlife",
      category: "wildlife",
      size: "md",
      defaultVisible: false,
      defaultOrder: 70,
      kiosk: { show: true, chrome: "minimal" },
      description: "Observational wildlife context for your place.",
      emptyMessage: "Wildlife notes will appear here."
    },
    {
      id: "ph-alerts",
      title: "Alerts",
      category: "alerts",
      size: "sm",
      defaultVisible: false,
      defaultOrder: 80,
      kiosk: { show: true, chrome: "minimal" },
      description: "Official alerts — shown only when they matter.",
      emptyMessage: "No alerts to show yet."
    },
    {
      id: "ph-trails",
      title: "Trail Conditions",
      category: "trails",
      size: "md",
      defaultVisible: false,
      defaultOrder: 90,
      kiosk: { show: true, chrome: "minimal" },
      description: "Trail surface and access context when available.",
      emptyMessage: "Trail conditions will appear here."
    }
  ];

  var byId = Object.create(null);
  PLACEHOLDERS.forEach(function (w) {
    byId[w.id] = w;
  });

  function all() {
    return PLACEHOLDERS.slice().sort(function (a, b) {
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

  /**
   * Honest placeholder payload — never invents live numbers.
   */
  function getData(id) {
    var widget = get(id);
    if (!widget) {
      return {
        trust: "waiting",
        status: "unavailable",
        message: "Widget coming soon."
      };
    }
    return {
      trust: "waiting",
      status: "placeholder",
      message: widget.emptyMessage || "Data will appear here.",
      widgetId: widget.id,
      category: widget.category
    };
  }

  function trustChipLabel(trust) {
    var t = String(trust || "waiting").toLowerCase();
    if (t === "live") return "Live";
    if (t === "cached") return "Cached";
    if (t === "partial") return "Partial";
    if (t === "offline") return "Offline";
    if (t === "pending" || t === "waiting") return "Waiting";
    return "Waiting";
  }

  function renderPlaceholder(widget, data) {
    widget = widget || {};
    data = data || getData(widget.id);
    var trust = data.trust || "waiting";
    return (
      '<div class="wdb-r-widget__body" data-trust="' +
      String(trust) +
      '">' +
      '<p class="wdb-r-widget__status">' +
      escapeHtml(data.message || "Data will appear here.") +
      "</p>" +
      '<p class="wdb-r-widget__trust"><span class="wds-trust-chip" data-trust="' +
      escapeHtml(trust) +
      '">' +
      escapeHtml(trustChipLabel(trust)) +
      "</span></p>" +
      "</div>"
    );
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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
    version: "1.1.0-phase1-polish",
    sizes: SIZES.slice(),
    all: all,
    get: get,
    defaultVisibleIds: defaultVisibleIds,
    defaultOrderIds: defaultOrderIds,
    normalizeSize: normalizeSize,
    getData: getData,
    renderPlaceholder: renderPlaceholder,
    kioskEligibleIds: kioskEligibleIds
  };
})(typeof window !== "undefined" ? window : global);
