/**
 * Waypoint Studio — Weather service
 * Provider registry and fetch API. UI and content layers call this — never providers directly.
 */
(function (global) {
  "use strict";

  var W = global.WDS && global.WDS.weather;
  if (!W || !W.providers) return;

  var activeProviderId = "placeholder";
  var serviceConfig = {
    units: "us",
    providers: {}
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
    if (options.units) serviceConfig.units = options.units;
    if (options.providers) {
      serviceConfig.providers = Object.assign({}, serviceConfig.providers, options.providers);
    }
    return {
      provider: activeProviderId,
      units: serviceConfig.units
    };
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
    var req = normalizeRequest(request);
    if (!isFinite(req.lat) || !isFinite(req.lng)) {
      return Promise.reject(new Error("WDS.weather.getForecast requires lat and lng"));
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
    return Promise.resolve(provider.fetch(ctx)).then(function (pkg) {
      var normalized = W.normalizePackage(pkg);
      normalized.meta.provider = normalized.meta.provider || provider.id;
      normalized.meta.fetchedAt = normalized.meta.fetchedAt || new Date().toISOString();
      normalized.meta.lat = normalized.meta.lat == null ? req.lat : normalized.meta.lat;
      normalized.meta.lng = normalized.meta.lng == null ? req.lng : normalized.meta.lng;
      normalized.meta.units = normalized.meta.units || req.units;
      return normalized;
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
    getForecast: getForecast,
    getPlaceholderSnapshot: getPlaceholderSnapshot
  });
})(window);
