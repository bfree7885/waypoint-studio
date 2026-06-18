/**
 * Waypoint Studio — Regional intelligence sources
 * Maps location state, content bundles, and weather packages into the normalized model.
 * No prediction logic — assembly only.
 */
(function (global) {
  "use strict";

  var RI = global.WDS && global.WDS.regionalIntelligence;
  if (!RI) return;

  function editorialWeatherSummary(weather) {
    if (!weather) return null;
    var parts = [];
    if (weather.high && weather.low) parts.push(weather.high + " / " + weather.low);
    if (weather.conditions) parts.push(weather.conditions);
    return parts.join(" · ") || null;
  }

  function formatMeasurement(meas) {
    if (!meas || meas.value == null) return null;
    return String(meas.value) + (meas.unit ? " " + meas.unit : "");
  }

  function fromLocation(loc) {
    if (!loc) return {};
    return {
      meta: {
        regionId: loc.regionId,
        contentBundleId: loc.contentBundle,
        sources: { location: loc.source || "unknown" }
      },
      region: {
        id: loc.regionId,
        label: loc.name ? loc.name + (loc.stateCode ? ", " + loc.stateCode : "") : null
      },
      county: { name: loc.name, stateCode: loc.stateCode },
      state: { name: loc.state, code: loc.stateCode },
      coordinates: {
        latitude: loc.lat,
        longitude: loc.lng
      },
      geography: {
        elevationFt: loc.elevationFt != null ? loc.elevationFt : null,
        bioregion: loc.bioregion || null
      },
      season: { label: loc.seasonNote || null },
      weather: loc.weather
        ? {
            high: loc.weather.high || null,
            low: loc.weather.low || null,
            conditions: loc.weather.conditions || null,
            summary: editorialWeatherSummary(loc.weather),
            source: "regions-index",
            isLive: false
          }
        : undefined
    };
  }

  function mapActiveSpecies(bundle) {
    var sw = bundle && bundle.seasonalWatch;
    if (!sw) return [];
    var list = sw.activeNow || [];
    return list.map(RI.normalizeSpeciesEntry).filter(function (s) {
      return s && s.name;
    });
  }

  function fromContentBundle(bundle) {
    if (!bundle) return {};
    var region = bundle.region || {};
    var profile = bundle.regionalIntelligenceProfile || {};
    var two = bundle.thisWeekOutdoors || {};
    var editorialWeather = two.weather || null;

    return {
      meta: {
        regionId: region.id,
        contentBundleId: region.id,
        scope: region.defaultScope || bundle.scope || null,
        sources: { bundle: region.id || "content-bundle" }
      },
      region: {
        id: region.id,
        label: region.name
          ? region.name + (region.stateCode ? ", " + region.stateCode : "")
          : null
      },
      county: { name: region.name, stateCode: region.stateCode },
      state: { name: region.state, code: region.stateCode },
      geography: {
        elevationFt: profile.elevationFt != null ? profile.elevationFt : null,
        elevationNote: profile.elevationNote || null,
        ecoregion: profile.ecoregion || region.bioregion || null,
        bioregion: region.bioregion || null,
        dominantForest: profile.dominantForest || null,
        watersheds: region.watersheds || []
      },
      season: {
        label: bundle.season || null,
        weekOf: bundle.weekOf || null
      },
      phenology: {
        stage: profile.phenologyStage || bundle.season || null,
        summary: bundle.seasonalWatch && bundle.seasonalWatch.title
          ? bundle.seasonalWatch.title
          : null
      },
      weather: editorialWeather
        ? {
            high: editorialWeather.high || null,
            low: editorialWeather.low || null,
            conditions: editorialWeather.conditions || null,
            summary: editorialWeatherSummary(editorialWeather),
            source: "content-bundle",
            isLive: false
          }
        : undefined,
      rainfall: profile.recentRainfall
        ? {
            recent: {
              periodDays: profile.recentRainfall.periodDays,
              amount: profile.recentRainfall.amountIn != null
                ? profile.recentRainfall.amountIn
                : profile.recentRainfall.amount,
              unit: profile.recentRainfall.unit || "in",
              summary: profile.recentRainfall.summary || "",
              source: profile.recentRainfall.source || "editorial"
            }
          }
        : undefined,
      daylight: profile.daylight
        ? {
            sunrise: profile.daylight.sunrise || null,
            sunset: profile.daylight.sunset || null,
            dayLengthHours: profile.daylight.dayLengthHours != null
              ? profile.daylight.dayLengthHours
              : null,
            timezone: profile.daylight.timezone || null,
            source: profile.daylight.source || "editorial"
          }
        : undefined,
      species: { active: mapActiveSpecies(bundle) }
    };
  }

  function fromWeatherPackage(weatherPkg) {
    if (!weatherPkg) return {};
    var cur = weatherPkg.current || {};
    var cond = cur.conditions || {};
    var summaryParts = [];
    if (cur.temperature) summaryParts.push(formatMeasurement(cur.temperature));
    if (cond.summary) summaryParts.push(cond.summary);

    return {
      weather: {
        summary: summaryParts.join(" · ") || null,
        conditions: cond.summary || null,
        source: weatherPkg.meta && weatherPkg.meta.provider,
        isLive: !(weatherPkg.meta && weatherPkg.meta.isPlaceholder)
      },
      daylight: {
        sunrise: cur.sunrise || null,
        sunset: cur.sunset || null,
        dayLengthHours: null,
        timezone: weatherPkg.meta && weatherPkg.meta.timezone,
        source: weatherPkg.meta && weatherPkg.meta.provider
      },
      weatherRef: weatherPkg
    };
  }

  function mergeLayers() {
    var merged = RI.emptyPackage();
    for (var i = 0; i < arguments.length; i += 1) {
      var layer = arguments[i];
      if (!layer) continue;
      merged = RI.normalizePackage(deepMerge(merged, layer));
    }
    return merged;
  }

  function deepMerge(target, source) {
    if (!source || typeof source !== "object") return target;
    Object.keys(source).forEach(function (key) {
      var val = source[key];
      if (val === undefined) return;
      if (val && typeof val === "object" && !Array.isArray(val)) {
        target[key] = deepMerge(target[key] && typeof target[key] === "object" ? Object.assign({}, target[key]) : {}, val);
      } else if (val !== null) {
        target[key] = val;
      }
    });
    return target;
  }

  RI.sources = {
    fromLocation: fromLocation,
    fromContentBundle: fromContentBundle,
    fromWeatherPackage: fromWeatherPackage,
    mergeLayers: mergeLayers,
    editorialWeatherSummary: editorialWeatherSummary
  };
})(window);
