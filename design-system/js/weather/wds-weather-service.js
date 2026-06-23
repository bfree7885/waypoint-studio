/**
 * Waypoint Studio — Weather service
 * Provider registry and fetch API. UI and content layers call this — never providers directly.
 */
(function (global) {
  "use strict";

  var W = global.WDS && global.WDS.weather;
  if (!W || !W.providers) return;

  var activeProviderId = "open-meteo";
  var fallbackProviderId = "placeholder";
  var serviceConfig = {
    units: "us",
    providers: {},
    fallback: true
  };

  function listProviders() {
    return Object.keys(W.providers).map(function (id) {
      var p = W.providers[id];
      return {
        id: p.id,
        label: p.label,
        requiresCredentials: !!p.requiresCredentials
      };
    });
  }

  function getProvider(id) {
    return W.providers[id] || null;
  }

  function setProvider(id) {
    if (!W.providers[id]) {
      throw new Error("WDS.weather: unknown provider \"" + id + "\"");
    }
    activeProviderId = id;
    return activeProviderId;
  }

  function getActiveProvider() {
    return W.providers[activeProviderId] || W.providers.placeholder;
  }

  function configure(options) {
    options = options || {};
    if (options.provider) setProvider(options.provider);
    if (options.fallback != null) serviceConfig.fallback = !!options.fallback;
    if (options.units) serviceConfig.units = options.units;
    if (options.providers) {
      serviceConfig.providers = Object.assign({}, serviceConfig.providers, options.providers);
    }
    return {
      provider: activeProviderId,
      units: serviceConfig.units,
      fallback: serviceConfig.fallback
    };
  }

  function resolveCoords(request) {
    request = request || {};
    var intel = request.intelligence || request.regionalIntelligence;
    if (intel && intel.coordinates) {
      var lat = Number(intel.coordinates.latitude);
      var lng = Number(intel.coordinates.longitude);
      if (isFinite(lat) && isFinite(lng)) {
        return {
          lat: lat,
          lng: lng,
          timezone: (intel.daylight && intel.daylight.timezone) ||
            (intel.meta && intel.meta.timezone) ||
            request.timezone ||
            null
        };
      }
    }
    var loc = request.location;
    if (!loc && global.WDS && global.WDS.location) {
      loc = global.WDS.location.getState();
    }
    if (loc && isFinite(Number(loc.lat)) && isFinite(Number(loc.lng))) {
      return {
        lat: Number(loc.lat),
        lng: Number(loc.lng),
        timezone: request.timezone || null
      };
    }
    if (isFinite(Number(request.lat)) && isFinite(Number(request.lng))) {
      return {
        lat: Number(request.lat),
        lng: Number(request.lng),
        timezone: request.timezone || null
      };
    }
    return null;
  }

  function resolveRequest(request) {
    request = request || {};
    var coords = resolveCoords(request);
    var req = normalizeRequest(request);
    if (coords) {
      req.lat = coords.lat;
      req.lng = coords.lng;
      req.timezone = coords.timezone || req.timezone;
    }
    req.intelligence = request.intelligence || request.regionalIntelligence || null;
    req.location = request.location || null;
    req.fallback = request.fallback != null ? request.fallback : serviceConfig.fallback;
    return req;
  }

  function normalizeRequest(request) {
    request = request || {};
    return {
      lat: Number(request.lat),
      lng: Number(request.lng),
      units: request.units || serviceConfig.units || "us",
      timezone: request.timezone || null,
      hints: request.hints || null,
      signal: request.signal || null
    };
  }

  function getForecast(request) {
    var req = resolveRequest(request);
    if (!isFinite(req.lat) || !isFinite(req.lng)) {
      return Promise.reject(new Error("WDS.weather.getForecast requires coordinates from location or regional intelligence"));
    }
    var provider = getActiveProvider();
    var ctx = {
      lat: req.lat,
      lng: req.lng,
      units: req.units,
      timezone: req.timezone,
      hints: req.hints,
      signal: req.signal,
      config: serviceConfig.providers[provider.id] || {}
    };

    function finalize(pkg) {
      var normalized = W.normalizePackage(pkg);
      normalized.meta.provider = normalized.meta.provider || provider.id;
      normalized.meta.fetchedAt = normalized.meta.fetchedAt || new Date().toISOString();
      normalized.meta.lat = normalized.meta.lat == null ? req.lat : normalized.meta.lat;
      normalized.meta.lng = normalized.meta.lng == null ? req.lng : normalized.meta.lng;
      normalized.meta.units = normalized.meta.units || req.units;
      return normalized;
    }

    return Promise.resolve(provider.fetch(ctx)).then(finalize).catch(function (err) {
      if (!req.fallback || provider.id === fallbackProviderId) {
        throw err;
      }
      var fallback = W.providers[fallbackProviderId];
      if (!fallback) throw err;
      return Promise.resolve(fallback.fetch(ctx)).then(function (pkg) {
        pkg = finalize(pkg);
        pkg.meta.fallbackFrom = provider.id;
        pkg.meta.fallbackReason = err && err.message ? err.message : "provider failed";
        return pkg;
      });
    });
  }

  function getPlaceholderSnapshot(request) {
    var req = normalizeRequest(request);
    return Promise.resolve(W.buildPlaceholderPackage({
      lat: req.lat,
      lng: req.lng,
      units: req.units,
      timezone: req.timezone,
      hints: req.hints,
      config: {}
    }));
  }

  function registerProvider(provider) {
    if (!provider || !provider.id || typeof provider.fetch !== "function") {
      throw new Error("WDS.weather.registerProvider requires id and fetch()");
    }
    W.providers[provider.id] = provider;
    return provider.id;
  }

  Object.assign(W, {
    listProviders: listProviders,
    getProvider: getProvider,
    setProvider: setProvider,
    getActiveProvider: getActiveProvider,
    registerProvider: registerProvider,
    configure: configure,
    resolveCoords: resolveCoords,
    resolveRequest: resolveRequest,
    getForecast: getForecast,
    getPlaceholderSnapshot: getPlaceholderSnapshot
  });
})(window);
