/**
 * Waypoint Outdoor Intelligence Platform — source mappers
 * Maps WDS.location, content bundles, and weather into the canonical package.
 */
(function (global) {
  "use strict";

  var OIP = global.WDS && global.WDS.outdoorIntelligence;
  var RI = global.WDS && global.WDS.regionalIntelligence;
  if (!OIP || !OIP.model) return;

  var M = OIP.model;

  function fromLocationState(loc) {
    if (!loc) return {};
    var source = M.normalizeLocationSource(loc.source, loc.isDefault);
    var label = loc.name ? loc.name + (loc.stateCode ? ", " + loc.stateCode : "") : null;
    return {
      meta: {
        regionId: loc.regionId,
        contentBundleId: loc.contentBundle,
        isFallbackLocation: source === "fallback",
        sources: { location: source }
      },
      location: {
        source: source,
        latitude: Number(loc.lat),
        longitude: Number(loc.lng),
        accuracyM: loc.accuracy != null ? Number(loc.accuracy) : null,
        distanceKm: loc.distanceKm != null ? Number(loc.distanceKm) : null
      },
      region: {
        id: loc.regionId || loc.contentBundle,
        label: label
      },
      county: { name: loc.name, stateCode: loc.stateCode },
      state: { name: loc.state, code: loc.stateCode },
      elevation: {
        feet: loc.elevationFt != null ? Number(loc.elevationFt) : null,
        available: loc.elevationFt != null && isFinite(Number(loc.elevationFt))
      },
      geography: { bioregion: loc.bioregion || null },
      calendar: { season: loc.seasonNote || null },
      weather: loc.weather
        ? {
            status: "editorial",
            high: loc.weather.high || null,
            low: loc.weather.low || null,
            conditions: loc.weather.conditions || null,
            source: "regions-index",
            isLive: false
          }
        : undefined
    };
  }

  function mapSpeciesList(list) {
    return (list || []).map(M.normalizeSpeciesEntry).filter(function (s) {
      return s && s.name;
    });
  }

  function fromContentBundle(bundle) {
    if (!bundle) return {};
    var region = bundle.region || {};
    var profile = bundle.regionalIntelligenceProfile || {};
    var two = bundle.thisWeekOutdoors || {};
    var sw = bundle.seasonalWatch || {};
    var editorialWeather = two.weather || null;

    var layer = {
      meta: {
        regionId: region.id,
        contentBundleId: region.id,
        sources: { bundle: region.id || "content-bundle" }
      },
      region: {
        id: region.id,
        label: region.name ? region.name + (region.stateCode ? ", " + region.stateCode : "") : null
      },
      county: { name: region.name, stateCode: region.stateCode },
      state: { name: region.state, code: region.stateCode },
      geography: {
        ecoregion: profile.ecoregion || region.bioregion || null,
        bioregion: region.bioregion || null,
        dominantForest: profile.dominantForest || null,
        watersheds: region.watersheds || []
      },
      elevation: {
        feet: profile.elevationFt != null ? Number(profile.elevationFt) : null,
        note: profile.elevationNote || null,
        available: profile.elevationFt != null && isFinite(Number(profile.elevationFt))
      },
      calendar: {
        season: bundle.season || null,
        weekOf: bundle.weekOf || null,
        month: M.monthFromDate(null, bundle.weekOf)
      },
      phenology: {
        status: profile.phenologyStage || sw.title ? "editorial" : "placeholder",
        stage: profile.phenologyStage || bundle.season || null,
        summary: sw.title || null,
        notes: profile.phenologyStage ? [profile.phenologyStage] : [],
        watch: {
          activeNow: mapSpeciesList(sw.activeNow),
          ending: mapSpeciesList(sw.ending),
          comingSoon: mapSpeciesList(sw.comingSoon)
        }
      },
      species: {
        status: sw.activeNow && sw.activeNow.length ? "editorial" : "placeholder",
        active: mapSpeciesList(sw.activeNow),
        ending: mapSpeciesList(sw.ending),
        comingSoon: mapSpeciesList(sw.comingSoon)
      },
      observations: {
        status: bundle.regionalFieldNotes && bundle.regionalFieldNotes.length ? "editorial" : "placeholder",
        items: (bundle.regionalFieldNotes || []).slice()
      },
      conservation: bundle.conservationUpdate
        ? { status: "editorial", current: bundle.conservationUpdate }
        : { status: "placeholder", current: null },
      research: bundle.researchBrief
        ? { status: "editorial", current: bundle.researchBrief }
        : { status: "placeholder", current: null }
    };

    if (profile.recentRainfall) {
      layer.rainfall = {
        recent: {
          periodDays: profile.recentRainfall.periodDays,
          amount: profile.recentRainfall.amountIn != null
            ? profile.recentRainfall.amountIn
            : profile.recentRainfall.amount,
          unit: profile.recentRainfall.unit || "in",
          summary: profile.recentRainfall.summary || "",
          source: profile.recentRainfall.source || "editorial"
        }
      };
    }

    if (profile.daylight) {
      layer.daylight = {
        status: "editorial",
        sunrise: profile.daylight.sunrise || null,
        sunset: profile.daylight.sunset || null,
        dayLengthHours: profile.daylight.dayLengthHours != null ? profile.daylight.dayLengthHours : null,
        timezone: profile.daylight.timezone || null,
        source: profile.daylight.source || "editorial"
      };
      layer.timezone = profile.daylight.timezone || null;
    }

    if (editorialWeather) {
      layer.weather = {
        status: "editorial",
        high: editorialWeather.high || null,
        low: editorialWeather.low || null,
        conditions: editorialWeather.conditions || null,
        source: "content-bundle",
        isLive: false
      };
    }

    return layer;
  }

  function fromPlatformExtensions(bundle) {
    if (!bundle) return {};
    var full = fromContentBundle(bundle);
    return {
      species: full.species,
      phenology: full.phenology,
      observations: full.observations,
      conservation: full.conservation,
      research: full.research,
      rainfall: full.rainfall
    };
  }

  function fromWeatherPackage(weatherPkg) {
    if (!weatherPkg) return {};
    if (RI && RI.sources && RI.sources.fromWeatherPackage) {
      var v1Layer = RI.sources.fromWeatherPackage(weatherPkg);
      var cur = weatherPkg.current || {};
      var today = weatherPkg.daily && weatherPkg.daily[0];
      var isLive = !!(weatherPkg.meta && !weatherPkg.meta.isPlaceholder);

      function formatMeas(meas) {
        if (!meas || meas.value == null) return null;
        return String(meas.value) + (meas.unit ? " " + meas.unit : "");
      }

      return {
        weather: {
          status: isLive ? "live" : "editorial",
          summary: v1Layer.weather && v1Layer.weather.summary,
          conditions: v1Layer.weather && v1Layer.weather.conditions,
          high: v1Layer.weather && v1Layer.weather.high,
          low: v1Layer.weather && v1Layer.weather.low,
          precipitationProbability: v1Layer.weather && v1Layer.weather.precipitationProbability,
          source: v1Layer.weather && v1Layer.weather.source,
          isLive: isLive
        },
        daylight: (function () {
          var editorial = v1Layer.daylight || {};
          var DU = global.WDS && global.WDS.daylightUtils;
          if (DU && DU.enrichFromWeather) {
            return DU.enrichFromWeather(weatherPkg, editorial);
          }
          return {
            status: isLive ? "live" : (editorial.source ? "editorial" : "placeholder"),
            sunrise: cur.sunrise || editorial.sunrise,
            sunset: cur.sunset || editorial.sunset,
            dayLengthHours: editorial.dayLengthHours,
            timezone: (weatherPkg.meta && weatherPkg.meta.timezone) || editorial.timezone,
            source: (weatherPkg.meta && weatherPkg.meta.provider) || editorial.source
          };
        })(),
        timezone: weatherPkg.meta && weatherPkg.meta.timezone,
        weatherRef: weatherPkg
      };
    }
    return { weatherRef: weatherPkg };
  }

  function deepMerge(target, source) {
    if (!source || typeof source !== "object") return target;
    Object.keys(source).forEach(function (key) {
      var val = source[key];
      if (val === undefined) return;
      if (val && typeof val === "object" && !Array.isArray(val)) {
        target[key] = deepMerge(
          target[key] && typeof target[key] === "object" ? Object.assign({}, target[key]) : {},
          val
        );
      } else if (val !== null) {
        target[key] = val;
      }
    });
    return target;
  }

  function mergeLayers() {
    var merged = M.emptyPackage();
    for (var i = 0; i < arguments.length; i += 1) {
      var layer = arguments[i];
      if (!layer) continue;
      merged = M.normalizePackage(deepMerge(merged, layer));
    }
    return merged;
  }

  function toLegacyV1(pkg) {
    if (RI && RI.normalizePackage) {
      return RI.normalizePackage({
        meta: {
          version: RI.VERSION || "1.0.0",
          assembledAt: pkg.meta.assembledAt,
          regionId: pkg.meta.regionId,
          contentBundleId: pkg.meta.contentBundleId,
          isPlaceholder: pkg.weather.status !== "live",
          sources: pkg.meta.sources
        },
        region: pkg.region,
        county: pkg.county,
        state: pkg.state,
        coordinates: {
          latitude: pkg.location.latitude,
          longitude: pkg.location.longitude
        },
        geography: {
          elevationFt: pkg.elevation.feet,
          elevationNote: pkg.elevation.note,
          ecoregion: pkg.geography.ecoregion,
          bioregion: pkg.geography.bioregion,
          dominantForest: pkg.geography.dominantForest,
          watersheds: pkg.geography.watersheds
        },
        season: { label: pkg.calendar.season, weekOf: pkg.calendar.weekOf },
        phenology: {
          stage: pkg.phenology.stage,
          summary: pkg.phenology.summary
        },
        weather: pkg.weather,
        rainfall: pkg.rainfall,
        daylight: pkg.daylight,
        species: { active: pkg.species.active },
        weatherRef: pkg.weatherRef
      });
    }
    return null;
  }

  OIP.sources = {
    fromLocationState: fromLocationState,
    fromContentBundle: fromContentBundle,
    fromPlatformExtensions: fromPlatformExtensions,
    fromWeatherPackage: fromWeatherPackage,
    mergeLayers: mergeLayers,
    toLegacyV1: toLegacyV1
  };
})(window);
