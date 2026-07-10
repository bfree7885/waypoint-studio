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

  function render(loc, platform) {
    if (!enabled() || !loc) return "";
    var wx = platform && platform.weatherRef;
    var wxMeta = wx && wx.meta;
    var usgs = platform && platform.usgsWater;
    var gauge = usgs && usgs.nearest;
    var rows = [
      ["Location source", loc.source],
      ["Latitude", loc.lat],
      ["Longitude", loc.lng],
      ["Label source", loc.labelSource || (loc.geocodeSource ? "reverse-geocode" : "—")],
      ["Detection method", loc.detectionMethod || loc.source],
      ["GPS accuracy", loc.accuracy != null ? Math.round(loc.accuracy) + " m" : "—"],
      ["Timestamp", loc.detectedAt || (loc.timestamp ? new Date(loc.timestamp).toISOString() : "—")],
      ["Cache age", ageLabel(loc.timestamp)],
      ["Refresh reason", loc.refreshReason || "—"],
      ["Fallback reason", loc.fallbackReason || "—"],
      ["Reverse geocoder", loc.geocodeSource || "—"],
      ["Place label", loc.placeLabel || loc.displayTitle || "—"],
      ["City", loc.city || "—"],
      ["County", loc.county || "—"],
      ["State", loc.stateCode || loc.state || "—"],
      ["Nearest indexed county", loc.nearestIndexedCounty || "—"],
      ["Indexed region eligible", loc.indexedRegionEligible != null ? String(loc.indexedRegionEligible) : "—"],
      ["Distance to index", loc.distanceKm != null ? loc.distanceKm + " km" : "—"],
      ["River gauge", gauge ? gauge.siteName : (usgs && usgs.status === "no-nearby" ? "none within 50 mi" : "—")],
      ["Gauge distance", gauge && gauge.distanceKm != null ? gauge.distanceKm.toFixed(1) + " km" : "—"],
      ["Gauge fallback", usgs && usgs.fallbackReason ? usgs.fallbackReason : "—"],
      ["Weather provider TZ", wxMeta && wxMeta.timezone ? wxMeta.timezone : "—"],
      ["Content mode", loc.contentMode || "—"]
    ];
    var body = rows.map(function (row) {
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
