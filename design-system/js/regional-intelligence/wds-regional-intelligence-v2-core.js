/**
 * Waypoint Studio — Regional intelligence V2 compatibility shim
 * Canonical model: WDS.outdoorIntelligence.model
 */
(function (global) {
  "use strict";

  var RI = global.WDS && global.WDS.regionalIntelligence;
  var OIP = global.WDS && global.WDS.outdoorIntelligence;
  if (!RI || !OIP || !OIP.model || !OIP.sources) return;

  var M = OIP.model;
  var S = OIP.sources;

  function fromV1Package(v1, loc) {
    if (!v1) {
      return M.normalizePackage(S.mergeLayers(S.fromLocationState(loc || M.buildFallbackLocationState())));
    }
    var merged = S.mergeLayers(
      loc ? S.fromLocationState(loc) : {},
      {
        meta: v1.meta,
        region: v1.region,
        county: v1.county,
        state: v1.state,
        location: {
          latitude: v1.coordinates && v1.coordinates.latitude,
          longitude: v1.coordinates && v1.coordinates.longitude
        },
        geography: v1.geography,
        calendar: { season: v1.season && v1.season.label, weekOf: v1.season && v1.season.weekOf },
        phenology: v1.phenology,
        species: { active: v1.species && v1.species.active },
        weather: v1.weather,
        daylight: v1.daylight,
        rainfall: v1.rainfall
      }
    );
    if (v1.weatherRef) merged = S.mergeLayers(merged, S.fromWeatherPackage(v1.weatherRef));
    return M.normalizePackage(merged);
  }

  RI.v2 = {
    VERSION: M.VERSION,
    get DEFAULT_REGION_ID() {
      return typeof OIP.DEFAULT_REGION_ID === "function"
        ? OIP.DEFAULT_REGION_ID()
        : OIP.DEFAULT_REGION_ID;
    },
    get FALLBACK() {
      return M.FALLBACK;
    },
    emptyCore: function () {
      if (RI.engine && RI.engine.emptyPackage) return RI.engine.emptyPackage();
      return M.emptyPackage();
    },
    normalizeCore: function (pkg) {
      if (RI.engine && RI.engine.normalizePackage) return RI.engine.normalizePackage(pkg);
      return M.normalizePackage(pkg);
    },
    normalizeLocationSource: M.normalizeLocationSource,
    buildFallbackLocationState: M.buildFallbackLocationState,
    buildFromLocation: function (loc, options) {
      if (RI.engine && RI.engine.buildFromLocation) {
        var pkg = RI.engine.buildFromLocation(loc);
        if (options && options.weekOf && pkg.calendar) {
          pkg.calendar.weekOf = options.weekOf;
          pkg.calendar.month = M.monthFromDate(options.date, options.weekOf);
        }
        return RI.engine.normalizePackage(pkg);
      }
      var layer = S.fromLocationState(loc);
      if (options && options.weekOf && layer.calendar) {
        layer.calendar.weekOf = options.weekOf;
        layer.calendar.month = M.monthFromDate(options.date, options.weekOf);
      }
      return M.normalizePackage(S.mergeLayers(layer));
    },
    enrichFromBundle: function (core, bundle) {
      if (RI.engine && RI.engine.enrichFromBundle) {
        return RI.engine.normalizePackage(RI.engine.enrichFromBundle(core, bundle));
      }
      return M.normalizePackage(S.mergeLayers(core, S.fromContentBundle(bundle)));
    },
    enrichFromWeather: function (core, weatherPkg) {
      return M.normalizePackage(S.mergeLayers(core, S.fromWeatherPackage(weatherPkg)));
    },
    fromV1Package: fromV1Package,
    toContext: M.toContext,
    monthFromDate: M.monthFromDate,
    isDev: M.isDev,
    devLog: M.devLog
  };
})(window);
