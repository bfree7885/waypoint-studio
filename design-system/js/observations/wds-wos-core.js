/**
 * Waypoint Observation Standard (WOS) — core model
 *
 * Canonical schema designed to support research-grade environmental observations.
 * Submission, sync, and export services are separate — this module defines
 * the data shape, enums, validation helpers, and empty package factory.
 *
 *   WDS.observations.VERSION
 *   WDS.observations.SCHEMA_ID
 *   WDS.observations.emptyObservation(options)
 *   WDS.observations.normalizeObservation(raw)
 *   WDS.observations.generateId(prefix)
 *   WDS.observations.toDarwinCore(obs)  — preview mapping for research export
 */
(function (global) {
  "use strict";

  var VERSION = "1.0.0";
  var SCHEMA_ID = "https://waypoint.studio/schemas/observation/v1";

  var CONFIDENCE = Object.freeze(["certain", "likely", "possible", "uncertain", "not_recorded"]);
  var EVIDENCE_QUALITY = Object.freeze(["excellent", "good", "fair", "poor", "none", "not_assessed"]);
  var VERIFICATION_STATUS = Object.freeze([
    "unverified", "self_verified", "community", "expert", "research_confirmed", "disputed", "rejected"
  ]);
  var EXPORT_STATUS = Object.freeze(["private", "eligible", "pending", "exported", "withheld", "retracted"]);
  var LICENSE_CODES = Object.freeze(["CC0-1.0", "CC-BY-4.0", "CC-BY-NC-4.0", "all-rights-reserved", "waypoint-private"]);
  var LOCATION_PRECISION = Object.freeze(["exact", "obfuscated", "county", "hidden"]);
  var RETENTION = Object.freeze(["local-only", "device-encrypted", "account-sync", "research-archive"]);
  var QUANTITY_UNITS = Object.freeze([
    "individuals", "pairs", "clusters", "colonies", "percent_cover", "presence", "tracks", "sign", "unknown"
  ]);
  var TAXON_RANKS = Object.freeze([
    "kingdom", "phylum", "class", "order", "family", "genus", "species", "subspecies", "variety", "informal"
  ]);
  var PRODUCT_SOURCES = Object.freeze([
    "waypoint-studio", "foragecast", "fieldry", "waypoint-scenes", "shed-hunting",
    "steepleaf", "savant-sommelier", "signalterrain", "terrainbound", "import", "unknown"
  ]);

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function isoNow() {
    return new Date().toISOString();
  }

  function todayDate() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function randomHex(len) {
    var out = "";
    var chars = "0123456789abcdef";
    for (var i = 0; i < len; i += 1) {
      out += chars[Math.floor(Math.random() * 16)];
    }
    return out;
  }

  function generateId(prefix) {
    prefix = prefix || "obs";
    return prefix + "_" + randomHex(8) + "-" + randomHex(4) + "-4" + randomHex(3) +
      "-" + ["8", "9", "a", "b"][Math.floor(Math.random() * 4)] + randomHex(3) +
      "-" + randomHex(12);
  }

  function isFiniteCoord(n) {
    return isFinite(Number(n));
  }

  function pickEnum(val, allowed, fallback) {
    return allowed.indexOf(val) >= 0 ? val : fallback;
  }

  function mergeDefined(target, source) {
    if (!source || typeof source !== "object") return target;
    Object.keys(source).forEach(function (key) {
      if (source[key] !== undefined) target[key] = source[key];
    });
    return target;
  }

  function emptyObservation(options) {
    options = options || {};
    var now = isoNow();
    return {
      meta: {
        version: VERSION,
        schema: SCHEMA_ID,
        createdAt: now,
        updatedAt: now,
        source: pickEnum(options.source, PRODUCT_SOURCES, "unknown"),
        productId: options.productId || null,
        appVersion: options.appVersion || null,
        revision: 1,
        contentBundleId: options.contentBundleId || null,
        regionalIntelligenceVersion: options.regionalIntelligenceVersion || null
      },
      id: options.id || generateId("obs"),
      observer: {
        id: options.observerId || null,
        anonymous: options.anonymous !== false,
        displayName: options.displayName || null,
        localDeviceId: options.localDeviceId || null
      },
      taxon: {
        label: options.taxonLabel || "",
        commonName: options.commonName || null,
        scientificName: options.scientificName || null,
        rank: options.taxonRank || null,
        hierarchy: {
          kingdom: null,
          phylum: null,
          class: null,
          order: null,
          family: null,
          genus: null,
          species: null,
          subspecies: null
        },
        taxonId: null,
        taxonIdSource: null,
        lifeStage: null,
        organismRemarks: null
      },
      observedAt: {
        date: options.date || todayDate(),
        time: options.time || null,
        timezone: options.timezone || null,
        uncertaintyMinutes: null,
        recordedAt: now
      },
      location: {
        latitude: options.latitude != null ? Number(options.latitude) : null,
        longitude: options.longitude != null ? Number(options.longitude) : null,
        accuracyM: options.accuracyM != null ? Number(options.accuracyM) : null,
        elevationFt: options.elevationFt != null ? Number(options.elevationFt) : null,
        elevationM: null,
        elevationSource: null,
        county: options.county || null,
        state: options.state || null,
        stateCode: options.stateCode || null,
        country: options.country || "United States",
        countryCode: options.countryCode || "US",
        localityDescription: null,
        privacy: {
          precision: pickEnum(options.locationPrecision, LOCATION_PRECISION, "county"),
          publicLatitude: null,
          publicLongitude: null,
          obfuscationRadiusM: options.obfuscationRadiusM != null ? Number(options.obfuscationRadiusM) : null,
          coordinateUncertaintyM: null
        }
      },
      habitat: {
        label: null,
        habitatType: null,
        substrate: null,
        aspect: null,
        landCover: null,
        waterProximity: null,
        canopyCoverPercent: null,
        codes: []
      },
      context: {
        season: options.season || null,
        phenologyStage: options.phenologyStage || null,
        month: options.month != null ? Number(options.month) : null,
        weekOf: options.weekOf || null,
        weatherSnapshot: null,
        regionalIntelligenceRef: null
      },
      record: {
        quantity: null,
        quantityMin: null,
        quantityMax: null,
        quantityUnit: null,
        organismQuantityType: null,
        confidence: pickEnum(options.confidence, CONFIDENCE, "not_recorded"),
        notes: options.notes || null,
        evidenceQuality: "not_assessed",
        sensitiveSpecies: false,
        behavior: null,
        measurements: []
      },
      media: {
        photos: [],
        audio: [],
        video: []
      },
      verification: {
        status: "unverified",
        reviewer: null,
        verifiedAt: null,
        verificationNotes: null,
        flags: []
      },
      research: {
        exportStatus: "private",
        exportedAt: null,
        exportFormats: [],
        datasetId: null,
        recordId: null,
        withholdReason: null,
        darwinCore: null
      },
      license: {
        code: pickEnum(options.license, LICENSE_CODES, "waypoint-private"),
        url: null,
        attribution: null,
        rightsHolder: null
      },
      privacy: {
        retention: pickEnum(options.retention, RETENTION, "local-only"),
        shareWithResearchers: false,
        shareLocationPublicly: false,
        shareMediaPublicly: false,
        shareObserverIdentity: false,
        consentRecordedAt: null,
        consentVersion: null
      },
      revisions: []
    };
  }

  function normalizeHierarchy(raw) {
    var base = {
      kingdom: null, phylum: null, class: null, order: null,
      family: null, genus: null, species: null, subspecies: null
    };
    if (!raw || typeof raw !== "object") return base;
    return mergeDefined(Object.assign({}, base), raw);
  }

  function normalizeMediaList(list, kind) {
    if (!Array.isArray(list)) return [];
    return list.filter(function (item) {
      return item && item.id && item.kind === kind;
    }).map(function (item) {
      return {
        id: item.id,
        kind: kind,
        uri: item.uri != null ? String(item.uri) : null,
        mimeType: item.mimeType || null,
        caption: item.caption || null,
        takenAt: item.takenAt || null,
        widthPx: item.widthPx != null ? Number(item.widthPx) : null,
        heightPx: item.heightPx != null ? Number(item.heightPx) : null,
        durationSec: item.durationSec != null ? Number(item.durationSec) : null,
        hash: item.hash || null,
        evidenceRole: item.evidenceRole || null
      };
    });
  }

  function normalizeObservation(raw) {
    var base = emptyObservation();
    if (!raw || typeof raw !== "object") return base;

    var obs = emptyObservation({
      id: raw.id,
      source: raw.meta && raw.meta.source,
      anonymous: raw.observer && raw.observer.anonymous
    });

    if (raw.meta) mergeDefined(obs.meta, raw.meta);
    obs.meta.version = VERSION;
    obs.meta.schema = SCHEMA_ID;
    if (!obs.meta.createdAt) obs.meta.createdAt = isoNow();
    obs.meta.updatedAt = raw.meta && raw.meta.updatedAt ? raw.meta.updatedAt : isoNow();
    obs.meta.revision = Math.max(1, Number(obs.meta.revision) || 1);

    if (raw.observer) {
      obs.observer.id = raw.observer.id || null;
      obs.observer.anonymous = !!raw.observer.anonymous;
      obs.observer.displayName = raw.observer.displayName || null;
      obs.observer.localDeviceId = raw.observer.localDeviceId || null;
    }

    if (raw.taxon) {
      obs.taxon.label = raw.taxon.label || raw.taxon.commonName || raw.taxon.scientificName || "";
      obs.taxon.commonName = raw.taxon.commonName || null;
      obs.taxon.scientificName = raw.taxon.scientificName || null;
      obs.taxon.rank = pickEnum(raw.taxon.rank, TAXON_RANKS, raw.taxon.rank || null);
      obs.taxon.hierarchy = normalizeHierarchy(raw.taxon.hierarchy);
      obs.taxon.taxonId = raw.taxon.taxonId || null;
      obs.taxon.taxonIdSource = raw.taxon.taxonIdSource || null;
      obs.taxon.lifeStage = raw.taxon.lifeStage || null;
      obs.taxon.organismRemarks = raw.taxon.organismRemarks || null;
    }

    if (raw.observedAt) mergeDefined(obs.observedAt, raw.observedAt);
    if (!obs.observedAt.date) obs.observedAt.date = todayDate();

    if (raw.location) {
      mergeDefined(obs.location, raw.location);
      if (raw.location.privacy) mergeDefined(obs.location.privacy, raw.location.privacy);
      obs.location.privacy.precision = pickEnum(
        obs.location.privacy.precision, LOCATION_PRECISION, "county"
      );
      if (obs.location.latitude != null) obs.location.latitude = Number(obs.location.latitude);
      if (obs.location.longitude != null) obs.location.longitude = Number(obs.location.longitude);
    }

    if (raw.habitat) {
      mergeDefined(obs.habitat, raw.habitat);
      if (!Array.isArray(obs.habitat.codes)) obs.habitat.codes = [];
    }

    if (raw.context) mergeDefined(obs.context, raw.context);

    if (raw.record) {
      mergeDefined(obs.record, raw.record);
      obs.record.confidence = pickEnum(raw.record.confidence, CONFIDENCE, "not_recorded");
      obs.record.evidenceQuality = pickEnum(raw.record.evidenceQuality, EVIDENCE_QUALITY, "not_assessed");
      if (!Array.isArray(obs.record.measurements)) obs.record.measurements = [];
    }

    if (raw.media) {
      obs.media.photos = normalizeMediaList(raw.media.photos, "photo");
      obs.media.audio = normalizeMediaList(raw.media.audio, "audio");
      obs.media.video = normalizeMediaList(raw.media.video, "video");
    }

    if (raw.verification) {
      obs.verification.status = pickEnum(raw.verification.status, VERIFICATION_STATUS, "unverified");
      obs.verification.reviewer = raw.verification.reviewer || null;
      obs.verification.verifiedAt = raw.verification.verifiedAt || null;
      obs.verification.verificationNotes = raw.verification.verificationNotes || null;
      obs.verification.flags = Array.isArray(raw.verification.flags) ? raw.verification.flags.slice() : [];
    }

    if (raw.research) {
      obs.research.exportStatus = pickEnum(raw.research.exportStatus, EXPORT_STATUS, "private");
      mergeDefined(obs.research, raw.research);
      if (!Array.isArray(obs.research.exportFormats)) obs.research.exportFormats = [];
    }

    if (raw.license) {
      obs.license.code = pickEnum(raw.license.code, LICENSE_CODES, "waypoint-private");
      obs.license.url = raw.license.url || null;
      obs.license.attribution = raw.license.attribution || null;
      obs.license.rightsHolder = raw.license.rightsHolder || null;
    }

    if (raw.privacy) {
      obs.privacy.retention = pickEnum(raw.privacy.retention, RETENTION, "local-only");
      mergeDefined(obs.privacy, raw.privacy);
    }

    obs.revisions = Array.isArray(raw.revisions) ? raw.revisions.slice() : [];

    return obs;
  }

  function publicCoordinates(obs) {
    obs = normalizeObservation(obs);
    var priv = obs.location.privacy;
    if (priv.precision === "hidden") return { latitude: null, longitude: null };
    if (priv.precision === "county") {
      return {
        latitude: priv.publicLatitude,
        longitude: priv.publicLongitude
      };
    }
    if (priv.precision === "obfuscated") {
      return {
        latitude: priv.publicLatitude != null ? priv.publicLatitude : obs.location.latitude,
        longitude: priv.publicLongitude != null ? priv.publicLongitude : obs.location.longitude
      };
    }
    return {
      latitude: obs.location.latitude,
      longitude: obs.location.longitude
    };
  }

  function toDarwinCore(obs) {
    obs = normalizeObservation(obs);
    var coords = publicCoordinates(obs);
    var eventDate = obs.observedAt.date;
    if (obs.observedAt.time) eventDate += "T" + obs.observedAt.time;

    return {
      basisOfRecord: "HumanObservation",
      occurrenceID: obs.id,
      recordedBy: obs.observer.anonymous ? null : (obs.observer.displayName || obs.observer.id),
      eventDate: eventDate,
      verbatimLocality: obs.location.localityDescription,
      decimalLatitude: coords.latitude,
      decimalLongitude: coords.longitude,
      coordinateUncertaintyInMeters: obs.location.privacy.coordinateUncertaintyM ||
        obs.location.accuracyM || obs.location.privacy.obfuscationRadiusM,
      geodeticDatum: "WGS84",
      country: obs.location.countryCode,
      stateProvince: obs.location.state,
      county: obs.location.county,
      minimumElevationInMeters: obs.location.elevationM,
      scientificName: obs.taxon.scientificName,
      vernacularName: obs.taxon.commonName || obs.taxon.label,
      taxonRank: obs.taxon.rank,
      kingdom: obs.taxon.hierarchy.kingdom,
      phylum: obs.taxon.hierarchy.phylum,
      class: obs.taxon.hierarchy.class,
      order: obs.taxon.hierarchy.order,
      family: obs.taxon.hierarchy.family,
      genus: obs.taxon.hierarchy.genus,
      specificEpithet: obs.taxon.hierarchy.species,
      infraspecificEpithet: obs.taxon.hierarchy.subspecies,
      organismQuantity: obs.record.quantity,
      organismQuantityType: obs.record.quantityUnit,
      occurrenceStatus: "present",
      identificationVerificationStatus: obs.verification.status,
      occurrenceRemarks: obs.record.notes,
      habitat: obs.habitat.label || obs.habitat.habitatType,
      fieldNotes: obs.record.behavior,
      license: obs.license.code,
      rightsHolder: obs.license.rightsHolder
    };
  }

  function contextFromPlatform(platform) {
    if (!platform) return {};
    return {
      season: platform.calendar && platform.calendar.season,
      phenologyStage: platform.phenology && platform.phenology.stage,
      month: platform.calendar && platform.calendar.month,
      weekOf: platform.calendar && platform.calendar.weekOf,
      regionalIntelligenceRef: platform.meta
        ? { regionId: platform.meta.regionId, assembledAt: platform.meta.assembledAt }
        : null
    };
  }

  function weatherSnapshotFromPackage(weatherPkg) {
    if (!weatherPkg || !weatherPkg.current) return null;
    var cur = weatherPkg.current;
    var cond = cur.conditions || {};
    var temp = cur.temperature;
    return {
      capturedAt: isoNow(),
      source: weatherPkg.meta && weatherPkg.meta.provider,
      conditions: cond.summary || null,
      temperatureF: temp && temp.unit === "F" ? temp.value : null,
      temperatureC: temp && temp.unit === "C" ? temp.value : null,
      humidityPercent: cur.humidity && cur.humidity.value,
      precipitationActive: !!(cur.precipitation && cur.precipitation.intensity && cur.precipitation.intensity !== "none"),
      windSpeed: cur.wind && cur.wind.speed && cur.wind.speed.value,
      windUnit: cur.wind && cur.wind.speed && cur.wind.speed.unit,
      cloudCoverPercent: cur.cloudCover && cur.cloudCover.value,
      raw: cur
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.observations = {
    VERSION: VERSION,
    SCHEMA_ID: SCHEMA_ID,
    CONFIDENCE: CONFIDENCE,
    EVIDENCE_QUALITY: EVIDENCE_QUALITY,
    VERIFICATION_STATUS: VERIFICATION_STATUS,
    EXPORT_STATUS: EXPORT_STATUS,
    LICENSE_CODES: LICENSE_CODES,
    LOCATION_PRECISION: LOCATION_PRECISION,
    RETENTION: RETENTION,
    QUANTITY_UNITS: QUANTITY_UNITS,
    TAXON_RANKS: TAXON_RANKS,
    PRODUCT_SOURCES: PRODUCT_SOURCES,
    generateId: generateId,
    emptyObservation: emptyObservation,
    normalizeObservation: normalizeObservation,
    publicCoordinates: publicCoordinates,
    toDarwinCore: toDarwinCore,
    contextFromPlatform: contextFromPlatform,
    weatherSnapshotFromPackage: weatherSnapshotFromPackage
  };
})(window);
