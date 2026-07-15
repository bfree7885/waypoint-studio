/**
 * Sheds — Leaflet canvas heat / priority grid overlay.
 */
(function (global) {
  "use strict";

  var HeatGrid = L.GridLayer.extend({
    options: {
      opacity: 0.55,
      zIndex: 350,
      className: "sheds-heat-layer"
    },

    initialize: function (options) {
      L.GridLayer.prototype.initialize.call(this, options);
      this._grid = null;
      this._heatVisible = true;
      this._hostMap = null;
    },

    onAdd: function (map) {
      this._hostMap = map;
      L.GridLayer.prototype.onAdd.call(this, map);
    },

    createTile: function (coords, done) {
      var tile = document.createElement("canvas");
      tile.width = 256;
      tile.height = 256;
      tile.className = "sheds-heat-tile";
      var self = this;
      setTimeout(function () {
        self._paintTile(tile, coords);
        done(null, tile);
      }, 0);
      return tile;
    },

    _colorFor: function (priority) {
      var p = Math.max(0, Math.min(1, priority));
      if (p < 0.45) return "rgba(90, 120, 150, " + (0.12 + p * 0.25) + ")";
      if (p < 0.72) return "rgba(180, 140, 60, " + (0.22 + (p - 0.45) * 0.5) + ")";
      return "rgba(80, 140, 70, " + (0.35 + (p - 0.72) * 0.55) + ")";
    },

    _paintTile: function (tile, coords) {
      var ctx = tile.getContext("2d");
      ctx.clearRect(0, 0, 256, 256);
      var grid = this._grid;
      if (!this._heatVisible || !grid || !grid.cells || !grid.cells.length) return;
      var map = this._map;
      if (!map || !grid.bounds) return;
      var nw = map.project(L.latLng(grid.bounds.north, grid.bounds.west), coords.z);
      var se = map.project(L.latLng(grid.bounds.south, grid.bounds.east), coords.z);
      var tileX = coords.x * 256;
      var tileY = coords.y * 256;
      var cellW = (se.x - nw.x) / grid.cols;
      var cellH = (se.y - nw.y) / grid.rows;
      var i;
      for (i = 0; i < grid.cells.length; i++) {
        var cell = grid.cells[i];
        var x = nw.x + cell.col * cellW - tileX;
        var y = nw.y + cell.row * cellH - tileY;
        if (x > 256 || y > 256 || x + cellW < 0 || y + cellH < 0) continue;
        ctx.fillStyle = this._colorFor(cell.priority);
        ctx.fillRect(x, y, Math.ceil(cellW) + 1, Math.ceil(cellH) + 1);
        if (cell.band === "higher") {
          ctx.strokeStyle = "rgba(255,255,255,0.2)";
          ctx.beginPath();
          ctx.moveTo(x, y + cellH);
          ctx.lineTo(x + cellW, y);
          ctx.stroke();
        }
      }
    },

    setGrid: function (next) {
      this._grid = next;
      this.redraw();
    },

    getGrid: function () {
      return this._grid;
    },

    setHeatVisible: function (v) {
      this._heatVisible = !!v;
      var map = this._map || this._hostMap;
      if (!map) return;
      if (this._heatVisible) {
        if (!map.hasLayer(this)) this.addTo(map);
      } else if (map.hasLayer(this)) {
        map.removeLayer(this);
      } else {
        this.redraw();
      }
      if (this._map) this.redraw();
    },

    setHeatOpacity: function (op) {
      this.setOpacity(op);
    },

    nearestCell: function (latlng) {
      var grid = this._grid;
      if (!grid || !grid.cells) return null;
      var best = null;
      var bestD = Infinity;
      var i;
      for (i = 0; i < grid.cells.length; i++) {
        var c = grid.cells[i];
        var d = Math.pow(c.lat - latlng.lat, 2) + Math.pow(c.lng - latlng.lng, 2);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      return best;
    }
  });

  function createHeatLayer(map, options) {
    var layer = new HeatGrid(options || {});
    if (options && options.opacity != null) layer.setOpacity(options.opacity);
    layer.addTo(map);
    return layer;
  }

  global.WaypointShedsHeat = {
    createHeatLayer: createHeatLayer,
    HeatGrid: HeatGrid
  };
})(window);
