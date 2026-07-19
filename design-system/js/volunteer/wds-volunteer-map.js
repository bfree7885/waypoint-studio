/**
 * Waypoint Volunteer — Leaflet map for discovery (category colors, today/saved markers).
 */
(function (global) {
  "use strict";

  var CATEGORY_COLORS = {
    "animal-rescue": "#c47a4a",
    conservation: "#3d6b4f",
    "habitat-restoration": "#4f7a3d",
    "trail-maintenance": "#5a6b3d",
    parks: "#3d6b5a",
    "community-gardens": "#6b8f3d",
    "food-banks": "#8a6b3d",
    education: "#4a5f8a",
    museums: "#6a5a8a",
    libraries: "#5a6a8a",
    "emergency-preparedness": "#8a4a4a",
    "citizen-science": "#3d6b8a",
    "community-events": "#6b5a3d"
  };

  function colorFor(opp) {
    var cat = (opp.categories && opp.categories[0]) || "conservation";
    return CATEGORY_COLORS[cat] || "#3d6b4f";
  }

  function mountMap(el, options) {
    options = options || {};
    if (!el || !global.L) {
      return { update: function () {}, destroy: function () {} };
    }

    var map = L.map(el, {
      scrollWheelZoom: false,
      attributionControl: true
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      maxZoom: 18
    }).addTo(map);

    var layer = L.layerGroup().addTo(map);
    var center = options.center || [41.35, -74.91];
    map.setView(center, options.zoom || 11);

    function markerRadius(kind) {
      if (kind === "today") return 11;
      if (kind === "saved") return 9;
      return 7;
    }

    function update(items) {
      layer.clearLayers();
      var bounds = [];
      (items || []).forEach(function (row) {
        var opp = row.opportunity || row;
        var loc = opp.location || {};
        if (loc.lat == null || loc.lon == null) return;
        var kind = row.markerKind || "default";
        var color = kind === "today" ? "#c9a227" : kind === "saved" ? "#4a6fa5" : colorFor(opp);
        var circle = L.circleMarker([loc.lat, loc.lon], {
          radius: markerRadius(kind),
          color: color,
          fillColor: color,
          fillOpacity: 0.85,
          weight: 2
        });
        circle.bindPopup(
          "<strong>" +
            String(opp.title || "").replace(/</g, "&lt;") +
            "</strong><br/>" +
            String(loc.label || "").replace(/</g, "&lt;")
        );
        if (options.onSelect) {
          circle.on("click", function () {
            options.onSelect(opp.id);
          });
        }
        circle.addTo(layer);
        bounds.push([loc.lat, loc.lon]);
      });
      if (bounds.length >= 2) {
        try {
          map.fitBounds(bounds, { padding: [28, 28], maxZoom: 13 });
        } catch (e) {}
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 12);
      }
    }

    function destroy() {
      try {
        map.remove();
      } catch (e) {}
    }

    return { map: map, update: update, destroy: destroy };
  }

  global.WDS = global.WDS || {};
  global.WDS.volunteerMap = {
    CATEGORY_COLORS: CATEGORY_COLORS,
    colorFor: colorFor,
    mountMap: mountMap
  };
})(window);
