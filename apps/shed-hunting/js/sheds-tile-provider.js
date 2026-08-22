/**
 * Sheds basemap tile providers — production-safe defaults.
 *
 * Do not use OSMF public raster tiles (tile.openstreetmap.org): that service
 * is donation-funded, has no SLA, and blocks production web apps by returning
 * HTTP 200 placeholder PNGs with `x-blocked` (gray gaps with no tileerror).
 *
 * Defaults: CARTO Voyager (street) + Esri World Topo (contours).
 * Optional override via window.WAYPOINT_MAP_TILE_CONFIG or
 * <meta name="waypoint-map-tiles" content='{"streetUrl":"..."}'>.
 */
(function (global) {
  "use strict";

  var OSM_PUBLIC_HOST_RE = /(^|\.)tile\.openstreetmap\.org$/i;

  var DEFAULTS = {
    streetId: "carto-voyager",
    streetLabel: "Street",
    streetUrl: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    streetSubdomains: "abcd",
    streetMaxZoom: 20,
    streetAttribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
      '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    topoId: "esri-world-topo",
    topoLabel: "Topographic",
    topoUrl: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    topoMaxZoom: 19,
    topoAttribution:
      "Tiles &copy; Esri &mdash; Esri, USGS, NOAA, and the GIS User Community"
  };

  function readMetaConfig() {
    try {
      var el = global.document && global.document.querySelector('meta[name="waypoint-map-tiles"]');
      if (!el) return null;
      var raw = el.getAttribute("content");
      if (!raw || raw === "local" || raw.charAt(0) !== "{") return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function mergeConfig() {
    var cfg = Object.assign({}, DEFAULTS);
    var meta = readMetaConfig();
    if (meta && typeof meta === "object") Object.assign(cfg, meta);
    if (global.WAYPOINT_MAP_TILE_CONFIG && typeof global.WAYPOINT_MAP_TILE_CONFIG === "object") {
      Object.assign(cfg, global.WAYPOINT_MAP_TILE_CONFIG);
    }
    return cfg;
  }

  function hostOfTemplate(url) {
    var s = String(url || "")
      .replace(/\{s\}/gi, "a")
      .replace(/\{r\}/gi, "")
      .replace(/\{[zyx]\}/gi, "0");
    var m = s.match(/^https?:\/\/([^/]+)/i);
    return m ? m[1].toLowerCase() : "";
  }

  function assertNotOsmPublic(url, role) {
    var host = hostOfTemplate(url);
    if (OSM_PUBLIC_HOST_RE.test(host)) {
      throw new Error(
        "Sheds refuses OSMF public tiles for " +
          role +
          " (" +
          host +
          "). Use a production tile provider. See docs/sheds/map-reliability-owner-review.md"
      );
    }
  }

  function createLayer(L, opts) {
    opts = opts || {};
    assertNotOsmPublic(opts.url, opts.id || "layer");
    var layerOpts = {
      maxZoom: opts.maxZoom || 19,
      attribution: opts.attribution || "",
      updateWhenIdle: false,
      keepBuffer: opts.keepBuffer != null ? opts.keepBuffer : 3
    };
    if (opts.subdomains) layerOpts.subdomains = opts.subdomains;
    var layer = L.tileLayer(opts.url, layerOpts);
    layer._shedsProviderId = opts.id || "custom";
    layer._shedsProviderLabel = opts.label || opts.id || "Map";
    return layer;
  }

  /**
   * Intelligent tile retry + status callbacks.
   * Leaflet tileerror covers network/decode failures; OSMF blocked PNGs
   * never fire tileerror (HTTP 200) — avoided by refusing that host.
   */
  function attachReliability(layer, hooks) {
    hooks = hooks || {};
    var fails = 0;
    var loads = 0;
    var pendingRetry = new WeakMap();

    function emit() {
      if (typeof hooks.onStatus === "function") {
        hooks.onStatus({
          loads: loads,
          fails: fails,
          providerId: layer._shedsProviderId,
          providerLabel: layer._shedsProviderLabel,
          degraded: fails >= 3 && loads === 0,
          struggling: fails >= 6 && fails > loads
        });
      }
    }

    layer.on("loading", function () {
      if (typeof hooks.onLoading === "function") hooks.onLoading(true);
    });
    layer.on("load", function () {
      if (typeof hooks.onLoading === "function") hooks.onLoading(false);
      emit();
    });
    layer.on("tileload", function () {
      loads += 1;
      if (fails > 0) fails -= 1;
      emit();
    });
    layer.on("tileerror", function (ev) {
      fails += 1;
      emit();
      var tile = ev && ev.tile;
      if (!tile || !tile.src) return;
      var attempt = (pendingRetry.get(tile) || 0) + 1;
      pendingRetry.set(tile, attempt);
      if (attempt > 3) return;
      var src = tile.src.replace(/([?&])shedsRetry=\d+/, "").replace(/\?$/, "");
      var sep = src.indexOf("?") >= 0 ? "&" : "?";
      var next = src + sep + "shedsRetry=" + attempt;
      global.setTimeout(function () {
        try {
          tile.src = next;
        } catch (e) { /* */ }
      }, 280 * attempt);
    });
    return layer;
  }

  function createBasemaps(L) {
    if (!L || !L.tileLayer) throw new Error("Leaflet required");
    var cfg = mergeConfig();
    var street = createLayer(L, {
      id: cfg.streetId,
      label: cfg.streetLabel,
      url: cfg.streetUrl,
      subdomains: cfg.streetSubdomains,
      maxZoom: cfg.streetMaxZoom,
      attribution: cfg.streetAttribution,
      keepBuffer: 3
    });
    var topo = createLayer(L, {
      id: cfg.topoId,
      label: cfg.topoLabel,
      url: cfg.topoUrl,
      maxZoom: cfg.topoMaxZoom,
      attribution: cfg.topoAttribution,
      keepBuffer: 2
    });
    return {
      config: cfg,
      street: street,
      topo: topo,
      baseLayers: (function () {
        var o = {};
        o[cfg.streetLabel] = street;
        o[cfg.topoLabel] = topo;
        return o;
      })()
    };
  }

  global.WaypointShedsTiles = {
    DEFAULTS: DEFAULTS,
    mergeConfig: mergeConfig,
    createBasemaps: createBasemaps,
    attachReliability: attachReliability,
    assertNotOsmPublic: assertNotOsmPublic,
    isOsmPublicHost: function (host) {
      return OSM_PUBLIC_HOST_RE.test(String(host || ""));
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
