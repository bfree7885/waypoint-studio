/**
 * Waypoint Studio — Regional intelligence service
 * Backward-compatible facade over WDS.outdoorIntelligence.
 * Legacy apps call regionalIntelligence.get() — returns V1 package shape.
 */
(function (global) {
  "use strict";

  var RI = global.WDS && global.WDS.regionalIntelligence;
  if (!RI) return;

  var serviceConfig = {
    contentEngineBase: "design-system/content-engine/",
    includeWeather: true,
    defaultRegionId: null
  };

  var lastSnapshot = null;

  function resolveDefaultRegionId() {
    if (serviceConfig.defaultRegionId) return serviceConfig.defaultRegionId;
    if (RI.resolveDefaultRegionId) return RI.resolveDefaultRegionId();
    var OIP = global.WDS && global.WDS.outdoorIntelligence;
    if (OIP && OIP.adapters && OIP.adapters.resolveRegionId) {
      return OIP.adapters.resolveRegionId();
    }
    return null;
  }

  function configure(options) {
    options = options || {};
    if (options.contentEngineBase) {
      serviceConfig.contentEngineBase = options.contentEngineBase.replace(/\/?$/, "/");
    }
    if (options.includeWeather != null) serviceConfig.includeWeather = !!options.includeWeather;
    if (options.defaultRegionId) serviceConfig.defaultRegionId = options.defaultRegionId;
    var OIP = global.WDS && global.WDS.outdoorIntelligence;
    if (OIP && OIP.configure) OIP.configure(options);
    return Object.assign({}, serviceConfig);
  }

  function normalizeRequest(request) {
    request = request || {};
    var loc = request.location;
    if (!loc && global.WDS && global.WDS.location) {
      loc = global.WDS.location.getState();
    }
    var OIP = global.WDS && global.WDS.outdoorIntelligence;
    var regionId = request.regionId || (loc && loc.contentBundle);
    if (!regionId && OIP && OIP.adapters && OIP.adapters.resolveRegionId) {
      regionId = OIP.adapters.resolveRegionId({ location: loc, regionId: request.regionId });
    }
    if (!regionId) regionId = resolveDefaultRegionId();
    return {
      location: loc,
      bundle: request.bundle || null,
      regionId: regionId,
      contentEngineBase: request.contentEngineBase || serviceConfig.contentEngineBase,
      includeWeather: request.includeWeather != null
        ? request.includeWeather
        : serviceConfig.includeWeather,
      weatherHints: request.weatherHints || null
    };
  }

  function attachPlatformRefs(legacy, platformPkg) {
    if (!legacy || !platformPkg) return legacy;
    legacy.v2 = platformPkg;
    legacy.outdoorIntelligence = platformPkg;
    if (platformPkg.weatherRef) legacy.weatherRef = platformPkg.weatherRef;
    if (RI.engine && RI.engine.getLast) {
      legacy.regionalIntelligence = RI.engine.getLast();
    }
    return legacy;
  }

  function get(request) {
    var OIP = global.WDS && global.WDS.outdoorIntelligence;
    if (!OIP || !OIP.get) {
      return Promise.reject(new Error("WDS.outdoorIntelligence is not available"));
    }
    return OIP.get(normalizeRequest(request)).then(function (platformPkg) {
      var legacy = platformPkg.legacy || (RI.normalizePackage ? RI.normalizePackage(platformPkg) : platformPkg);
      lastSnapshot = attachPlatformRefs(legacy, platformPkg);
      return lastSnapshot;
    });
  }

  function getFromSnapshot(snapshot) {
    lastSnapshot = RI.normalizePackage ? RI.normalizePackage(snapshot) : snapshot;
    return Promise.resolve(lastSnapshot);
  }

  function getLastSnapshot() {
    var OIP = global.WDS && global.WDS.outdoorIntelligence;
    if (OIP && OIP.getLast) {
      var platformPkg = OIP.getLast();
      if (platformPkg && platformPkg.legacy) {
        return attachPlatformRefs(RI.normalizePackage(platformPkg.legacy), platformPkg);
      }
    }
    return lastSnapshot ? (RI.normalizePackage ? RI.normalizePackage(lastSnapshot) : lastSnapshot) : null;
  }

  function clearCache() {
    lastSnapshot = null;
    var OIP = global.WDS && global.WDS.outdoorIntelligence;
    if (OIP && OIP.clearCache) OIP.clearCache();
  }

  function loadSnapshot(regionId, base) {
    regionId = regionId || resolveDefaultRegionId();
    base = (base || "design-system/regional-intelligence/snapshots/").replace(/\/?$/, "/");
    return fetch(base + regionId + ".json").then(function (res) {
      if (!res.ok) throw new Error("Regional intelligence: snapshot not found " + regionId);
      return res.json();
    }).then(getFromSnapshot);
  }

  Object.assign(RI, {
    configure: configure,
    get: get,
    getFromSnapshot: getFromSnapshot,
    getLastSnapshot: getLastSnapshot,
    loadSnapshot: loadSnapshot,
    clearCache: clearCache
  });
})(window);
