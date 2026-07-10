/**
 * Location debug panel — developer mode only (?debug=location or localStorage flag).
 */
(function (global) {
  "use strict";

  var FLAG_KEY = "waypoint-debug-location";

  function enabled() {
    try {
      if (global.localStorage && global.localStorage.getItem(FLAG_KEY) === "1") return true;
    } catch (e) { /* noop */ }
    try {
      return /(?:^|[?&])debug=location(?:&|$)/.test(global.location && global.location.search);
    } catch (e2) {
      return false;
    }
  }

  function esc(str) {
    if (str == null) return "—";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function ageLabel(ts) {
    if (!ts) return "—";
    var ms = Date.now() - Number(ts);
    if (!isFinite(ms) || ms < 0) return "—";
    var mins = Math.round(ms / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + " min ago";
    var hours = Math.round(mins / 60);
    if (hours < 48) return hours + " h ago";
    return Math.round(hours / 24) + " d ago";
  }

  function ageFromIso(iso) {
    if (!iso) return "—";
    var t = Date.parse(iso);
    if (!isFinite(t)) return "—";
    return ageLabel(t);
  }

  function moduleSourceRows(platform) {
    var sources = platform && platform.meta && platform.meta.moduleSources;
    if (!sources) return [];
    return Object.keys(sources).map(function (key) {
      return [key, sources[key]];
    });
  }

  function render(loc, platform) {
    if (!enabled() || !loc) return "";
    var wx = platform && platform.weatherRef;
    var wxMeta = wx && wx.meta;
    var usgs = platform && platform.usgsWater;
    var gauge = usgs && usgs.nearest;
    var engineCtx = platform && platform.engineContext;
    var engineLoc = engineCtx && engineCtx.engine && engineCtx.engine.publishLocation;
    var rows = [
      ["— User context —", ""],
      ["Location source", loc.source],
      ["User latitude", loc.lat],
      ["User longitude", loc.lng],
      ["Label source", loc.labelSource || (loc.geocodeSource ? "reverse-geocode" : "—")],
      ["Detection method", loc.detectionMethod || loc.source],
      ["GPS accuracy", loc.accuracy != null ? Math.round(loc.accuracy) + " m" : "—"],
      ["Location cache age", ageLabel(loc.timestamp)],
      ["Refresh reason", loc.refreshReason || "—"],
      ["Fallback reason", loc.fallbackReason || "—"],
      ["Place label", loc.placeLabel || loc.displayTitle || "—"],
      ["Content mode", loc.contentMode || "—"],
      ["— Data coordinates —", ""],
      ["Platform lat", platform && platform.location ? platform.location.latitude : "—"],
      ["Platform lng", platform && platform.location ? platform.location.longitude : "—"],
      ["Weather data lat", wxMeta && wxMeta.lat != null ? wxMeta.lat : "—"],
      ["Weather data lng", wxMeta && wxMeta.lng != null ? wxMeta.lng : "—"],
      ["Coord source", wxMeta && wxMeta.dataCoordSource ? wxMeta.dataCoordSource : "user"],
      ["Content source", platform && platform.meta ? platform.meta.contentSource : "—"],
      ["OIP hydrated", platform && platform.meta ? ageFromIso(platform.meta.hydratedAt) : "—"],
      ["— Engine context (metadata only) —", ""],
      ["Engine status", platform && platform.meta ? platform.meta.engineStatus : "—"],
      ["Engine health", engineCtx && engineCtx.health && engineCtx.health.overall
        ? engineCtx.health.overall.label : "—"],
      ["Engine refreshed", engineCtx && engineCtx.engine
        ? ageFromIso(engineCtx.engine.updatedAt) : "—"],
      ["Engine publish lat", engineLoc && engineLoc.lat != null ? engineLoc.lat : "—"],
      ["Engine publish lng", engineLoc && engineLoc.lng != null ? engineLoc.lng : "—"],
      ["Engine publish label", engineLoc && engineLoc.label ? engineLoc.label : "—"],
      ["Feed fresh", engineCtx && engineCtx.operational
        ? String(engineCtx.operational.isFresh) : "—"],
      ["— Module data sources —", ""]
    ];
    moduleSourceRows(platform).forEach(function (pair) {
      rows.push([pair[0], pair[1]]);
    });
    rows.push(
      ["River gauge", gauge ? gauge.siteName : (usgs && usgs.status === "no-nearby" ? "none within 50 mi" : "—")],
      ["Gauge distance", gauge && gauge.distanceKm != null ? gauge.distanceKm.toFixed(1) + " km" : "—"],
      ["Weather TZ", wxMeta && wxMeta.timezone ? wxMeta.timezone : "—"]
    );
    var body = rows.map(function (row) {
      if (row[0].indexOf("—") === 0) {
        return "<tr class=\"wds-loc-debug__section\"><th colspan=\"2\">" + esc(row[0]) + "</th></tr>";
      }
      return "<tr><th>" + esc(row[0]) + "</th><td>" + esc(row[1]) + "</td></tr>";
    }).join("");
    return (
      '<section class="wds-loc-debug" id="wds-location-debug" aria-label="Location debug">' +
        '<details open>' +
          '<summary>Location debug (developer)</summary>' +
          '<table class="wds-loc-debug__table">' + body + "</table>" +
        "</details>" +
      "</section>"
    );
  }

  function mount(loc, platform, root) {
    if (!enabled()) return;
    root = root || global.document.body;
    if (!root) return;
    var existing = global.document.getElementById("wds-location-debug");
    var html = render(loc, platform);
    if (!html) return;
    if (existing) {
      existing.outerHTML = html;
      return;
    }
    var wrap = global.document.createElement("div");
    wrap.innerHTML = html;
    root.appendChild(wrap.firstElementChild);
  }

  global.WDS = global.WDS || {};
  global.WDS.locationDebug = {
    enabled: enabled,
    render: render,
    mount: mount,
    FLAG_KEY: FLAG_KEY
  };
})(window);
