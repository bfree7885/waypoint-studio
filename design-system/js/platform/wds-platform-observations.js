/**
 * Waypoint Studio — Shared Observation Timeline service.
 *
 * Existing product stores remain authoritative. Adapters project their records
 * into one read-only observation schema; no migration or duplicate database is
 * created.
 */
(function (global) {
  "use strict";

  var VERSION = "2.0.0";
  var SCHEMA_ID = "https://waypointstudio.org/schemas/platform-observation/v2";
  var KINDS = Object.freeze([
    "photo", "journal", "sighting", "weather", "trip", "article",
    "species", "trail-condition", "general"
  ]);
  var FIELDRY_KEY = "waypoint-fieldry-observations-v1";
  var SHEDS_KEY = "waypoint-sheds-observations-v1";
  var FC_JOURNAL_KEY = "foragecast.journal.v1";
  var PHOTO_KEY = "waypoint-photo-library-index-v1";
  var PHOTO_SHOOTS_KEY = "waypoint-photo-coach-shoots-v1";
  var SHEDS_SESSIONS_KEY = "waypoint-sheds-sessions-v1";
  var VOLUNTEER_PLAN_KEY = "waypoint-volunteer-planning-v1";
  var articleCache = Object.create(null);
  var listeners = [];

  function array(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    return value == null || value === "" ? [] : [value];
  }

  function text(value) {
    return value == null ? "" : String(value).trim();
  }

  function finite(value) {
    if (value == null || value === "") return null;
    var parsed = Number(value);
    return isFinite(parsed) ? parsed : null;
  }

  function timestamp(value) {
    if (!value) return null;
    if (typeof value === "object") {
      if (value.recordedAt) return timestamp(value.recordedAt);
      if (value.date) return timestamp(value.date + (value.time ? "T" + value.time : ""));
      return null;
    }
    var date = new Date(value);
    return isFinite(date.getTime()) ? date.toISOString() : null;
  }

  function readJson(key, fallback) {
    try {
      var raw = global.localStorage && global.localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  function stableId(sourceId, kind, rawId) {
    return [text(sourceId) || "unknown", text(kind) || "general", text(rawId) || "unidentified"]
      .join(":")
      .replace(/[^a-zA-Z0-9:._-]/g, "-");
  }

  function normalizeLocation(raw) {
    raw = raw || {};
    var privacy = raw.privacy || {};
    if (typeof privacy === "string") privacy = { visibility: privacy };
    var precision = text(raw.precision || privacy.precision) || "hidden";
    return {
      label: text(raw.label || raw.locationLabel || raw.localityDescription ||
        [raw.county, raw.state || raw.stateCode].filter(Boolean).join(", ")) || null,
      latitude: finite(raw.latitude != null ? raw.latitude : (raw.lat != null ? raw.lat : raw.publicLatitude)),
      longitude: finite(raw.longitude != null ? raw.longitude : (raw.lng != null ? raw.lng : raw.publicLongitude)),
      precision: precision,
      sensitive: !!(raw.sensitive || privacy.sensitive)
    };
  }

  function create(partial) {
    partial = partial || {};
    var source = partial.source || {};
    var subject = partial.subject || {};
    var privacy = partial.privacy || {};
    if (typeof privacy === "string") privacy = { visibility: privacy };
    var kind = KINDS.indexOf(partial.kind) >= 0 ? partial.kind : "general";
    var rawId = partial.rawId || partial.id || source.recordId;
    var observedAt = timestamp(partial.observedAt || partial.recordedAt || partial.updatedAt);
    var recordedAt = timestamp(partial.recordedAt || partial.createdAt || observedAt) || new Date().toISOString();
    var location = normalizeLocation(partial.location || {
      label: partial.locationLabel,
      lat: partial.lat,
      lng: partial.lng
    });
    return {
      schema: SCHEMA_ID,
      schemaVersion: VERSION,
      id: partial.timelineId || stableId(source.id || partial.sourceApp, kind, rawId),
      kind: kind,
      title: text(partial.title) || "Untitled observation",
      summary: text(partial.summary || partial.subtitle || partial.notes) || null,
      observedAt: observedAt || recordedAt,
      recordedAt: recordedAt,
      updatedAt: timestamp(partial.updatedAt) || recordedAt,
      source: {
        id: text(source.id || partial.sourceApp) || "unknown",
        label: text(source.label) || null,
        recordId: text(source.recordId || rawId) || null,
        provider: text(source.provider) || null
      },
      subject: {
        kind: text(subject.kind) || (partial.taxonLabel ? "species" : null),
        id: text(subject.id) || null,
        label: text(subject.label || partial.taxonLabel) || null,
        scientificName: text(subject.scientificName) || null
      },
      location: location,
      media: array(partial.media).map(function (item) {
        item = item || {};
        return {
          kind: text(item.kind) || "photo",
          id: text(item.id) || null,
          thumbnail: text(item.thumbnail || item.thumbnailDataUrl) || null,
          alt: text(item.alt || item.caption) || null
        };
      }),
      context: {
        tags: array(partial.tags || (partial.context && partial.context.tags)).map(text).filter(Boolean),
        categories: array(partial.categories || (partial.context && partial.context.categories)).map(text).filter(Boolean),
        season: text(partial.season || (partial.context && partial.context.season)) || null,
        weather: partial.weather || (partial.context && partial.context.weather) || null
      },
      privacy: {
        visibility: text(privacy.visibility || privacy.level || partial.visibility) || "private",
        retention: text(privacy.retention) || "source-controlled",
        locationPrecision: location.precision,
        localOnly: privacy.localOnly !== false && !partial.public
      },
      provenance: {
        method: text(partial.method) || "source-adapter",
        sourceRef: partial.rawRef || null,
        canonicalUrl: text(partial.canonicalUrl) || null,
        attribution: text(partial.attribution) || null
      },
      links: {
        primary: text(partial.href || (partial.links && partial.links.primary)) || null,
        external: !!(partial.external || (partial.links && partial.links.external))
      },
      sourceApp: text(source.id || partial.sourceApp) || "unknown",
      subtitle: text(partial.subtitle || partial.summary) || null,
      locationLabel: location.label,
      lat: location.latitude,
      lng: location.longitude,
      taxonLabel: text(subject.label || partial.taxonLabel) || null,
      href: text(partial.href || (partial.links && partial.links.primary)) || null,
      rawRef: partial.rawRef || null,
      honesty: text(partial.honesty) ||
        "Adapted from its source record. Details and privacy remain controlled by the source."
    };
  }

  function envelope(partial) {
    return create(partial);
  }

  function normalize(raw) {
    if (raw && raw.schema === SCHEMA_ID && raw.schemaVersion === VERSION) return raw;
    return create(raw);
  }

  function validate(observation) {
    var errors = [];
    if (!observation || typeof observation !== "object") return { ok: false, errors: ["Observation must be an object."] };
    if (observation.schema !== SCHEMA_ID) errors.push("Unknown schema.");
    if (!observation.id) errors.push("Missing id.");
    if (KINDS.indexOf(observation.kind) < 0) errors.push("Unsupported kind.");
    if (!observation.title) errors.push("Missing title.");
    if (!timestamp(observation.observedAt)) errors.push("Invalid observedAt.");
    if (!observation.source || !observation.source.id) errors.push("Missing source.");
    return { ok: errors.length === 0, errors: errors };
  }

  function fromFieldry(obs) {
    if (!obs) return null;
    var taxon = obs.taxon || {};
    var meta = obs.meta || {};
    var fieldry = meta.fieldry || {};
    var label = taxon.label || taxon.commonName || taxon.scientificName || "Field observation";
    return create({
      rawId: obs.id,
      kind: "sighting",
      title: label,
      summary: obs.record && obs.record.notes,
      observedAt: obs.observedAt,
      recordedAt: meta.createdAt,
      updatedAt: meta.updatedAt,
      source: { id: "fieldry", label: "Fieldry", recordId: obs.id },
      subject: {
        kind: fieldry.category || fieldry.observationType || "species",
        id: taxon.taxonId,
        label: taxon.commonName || label,
        scientificName: taxon.scientificName
      },
      location: obs.location,
      media: obs.media && obs.media.photos,
      tags: [fieldry.category, fieldry.observationType],
      privacy: {
        visibility: "private",
        retention: obs.privacy && obs.privacy.retention,
        localOnly: true
      },
      href: "/apps/fieldry/#/obs/" + encodeURIComponent(obs.id),
      rawRef: { store: FIELDRY_KEY, id: obs.id },
      honesty: "Private Fieldry observation on this device. Identification reflects the saved record."
    });
  }

  function shedsKind(type) {
    if (/trail|crossing|access|pressure|search_completed/.test(type)) return "trail-condition";
    if (/deer|shed|sign/.test(type)) return "sighting";
    return "journal";
  }

  function fromSheds(obs) {
    if (!obs) return null;
    var type = text(obs.type) || "other";
    return create({
      rawId: obs.id,
      kind: shedsKind(type),
      title: type.replace(/_/g, " "),
      summary: obs.note,
      observedAt: obs.observedAt,
      recordedAt: obs.createdAt,
      updatedAt: obs.updatedAt,
      source: { id: "shed-hunting", label: "Sheds", recordId: obs.id },
      subject: { kind: "species", id: obs.speciesId, label: obs.speciesId },
      location: obs.location,
      tags: [type],
      privacy: { visibility: "private", retention: "local-only", localOnly: true },
      href: "/apps/shed-hunting/map/",
      rawRef: { store: SHEDS_KEY, id: obs.id },
      honesty: "Private Sheds field note on this device. Exact coordinates are not shown in the timeline."
    });
  }

  function fromForageJournal(entry) {
    if (!entry) return null;
    var rawId = entry.id || ("journal-" + text(entry.at || entry.createdAt));
    return create({
      rawId: rawId,
      kind: "journal",
      title: text(entry.title) || (entry.text ? text(entry.text).slice(0, 80) : "ForageCast journal note"),
      summary: entry.text,
      observedAt: entry.at || entry.createdAt,
      recordedAt: entry.createdAt || entry.at,
      source: { id: "foragecast", label: "ForageCast", recordId: rawId },
      subject: { kind: "species", id: entry.speciesId, label: entry.speciesName || entry.speciesId },
      tags: entry.tags,
      privacy: { visibility: "private", retention: "local-only", localOnly: true },
      href: "/apps/foragecast/journal.html",
      rawRef: { store: FC_JOURNAL_KEY, id: entry.id },
      honesty: "Private ForageCast journal note on this device; it is not a verified detection."
    });
  }

  function fromPhoto(photo) {
    if (!photo) return null;
    var camera = photo.camera || {};
    var gps = photo.gps || {};
    var cameraLabel = [camera.make, camera.model].filter(Boolean).join(" ");
    return create({
      rawId: photo.id,
      kind: "photo",
      title: text(photo.filename || photo.originalFilename) || "Photograph",
      summary: photo.photographerNotes || cameraLabel || null,
      observedAt: photo.captureDate || photo.importDate,
      recordedAt: photo.importDate,
      updatedAt: photo.updatedAt,
      source: { id: "photo-library", label: "Photo Library", recordId: photo.id },
      subject: {
        kind: "photo-subject",
        label: array(photo.subjectHints)[0] || null
      },
      location: {
        latitude: gps.latitude != null ? gps.latitude : gps.lat,
        longitude: gps.longitude != null ? gps.longitude : gps.lng,
        label: gps.label,
        precision: "exact",
        sensitive: true
      },
      media: photo.media && photo.media.thumbnailDataUrl
        ? [{ kind: "photo", id: photo.id, thumbnail: photo.media.thumbnailDataUrl, alt: photo.filename }]
        : [],
      tags: photo.tags,
      privacy: { visibility: "private", retention: "local-only", localOnly: true },
      href: "/apps/photo-library/",
      rawRef: { store: PHOTO_KEY, id: photo.id },
      honesty: "Private Photo Library metadata on this device. The image is not uploaded by the timeline."
    });
  }

  function fromTrip(trip, sourceId, label, store, href) {
    if (!trip) return null;
    var rawId = trip.id || text(trip.startedAt || trip.createdAt);
    var distance = finite(trip.distanceM);
    var summary = text(trip.notes || trip.summary);
    if (!summary && distance != null) summary = (distance / 1609.344).toFixed(1) + " mi recorded";
    return create({
      rawId: rawId,
      kind: "trip",
      title: text(trip.title || trip.name) || (label + " outing"),
      summary: summary,
      observedAt: trip.startedAt || trip.captureDate || trip.createdAt,
      recordedAt: trip.createdAt || trip.startedAt,
      updatedAt: trip.updatedAt || trip.endedAt,
      source: { id: sourceId, label: label, recordId: rawId },
      subject: { kind: "outing", id: trip.speciesId, label: trip.speciesId },
      weather: trip.weatherSummary,
      tags: [trip.status, trip.activePreset],
      privacy: { visibility: "private", retention: "local-only", localOnly: true },
      href: href,
      rawRef: { store: store, id: rawId },
      honesty: "Private outing summary on this device. Detailed paths remain in the source app."
    });
  }

  function fromArticle(article) {
    if (!article) return null;
    var rawId = article.id || article.canonicalUrl;
    return create({
      rawId: rawId,
      kind: "article",
      title: article.title,
      summary: article.summary,
      observedAt: article.publishedAt || article.discoveredAt,
      recordedAt: article.discoveredAt || article.publishedAt,
      updatedAt: article.updatedAt,
      source: {
        id: "articles",
        label: article.sourceName || "Articles",
        recordId: rawId,
        provider: article.sourceName
      },
      subject: { kind: "article-topic", label: array(article.categories)[0] || null },
      location: { label: array(article.geographicScopes)[0], precision: "regional" },
      categories: article.categories,
      privacy: { visibility: "public", retention: "publisher-controlled", localOnly: false },
      public: true,
      canonicalUrl: article.canonicalUrl,
      attribution: article.sourceName,
      href: article.canonicalUrl,
      external: true,
      rawRef: { store: "data/articles/articles.json", id: rawId },
      honesty: "Waypoint curates this link; the publisher owns and maintains the original article."
    });
  }

  function fromSpecies(species) {
    if (!species) return null;
    var rawId = species.id || species.taxonId || species.scientificName || species.commonName;
    return create({
      rawId: rawId,
      kind: "species",
      title: species.commonName || species.label || species.scientificName || "Species",
      summary: species.summary || species.description,
      observedAt: species.observedAt || species.updatedAt || species.createdAt,
      recordedAt: species.createdAt || species.updatedAt,
      source: {
        id: species.sourceId || "species",
        label: species.sourceLabel || "Species record",
        recordId: rawId
      },
      subject: {
        kind: "species",
        id: species.taxonId || species.id,
        label: species.commonName || species.label,
        scientificName: species.scientificName
      },
      location: species.location,
      tags: species.tags,
      privacy: species.privacy || { visibility: "private", localOnly: true },
      href: species.href,
      honesty: species.honesty || "Species context from the named source; presence is not implied."
    });
  }

  function fromVolunteerSaved(item) {
    if (!item) return null;
    var rawId = item.id || item.opportunityId;
    return create({
      rawId: rawId,
      kind: "general",
      title: item.title || item.name || "Saved volunteer opportunity",
      summary: item.org || item.organization,
      observedAt: item.savedAt || item.updatedAt,
      recordedAt: item.savedAt || item.updatedAt,
      source: { id: "waypoint-volunteer", label: "Volunteer", recordId: rawId },
      location: { label: item.locationLabel || item.area, precision: "regional" },
      categories: ["volunteer"],
      privacy: { visibility: "private", retention: "local-only", localOnly: true },
      href: "/apps/waypoint-volunteer/saved/",
      rawRef: { store: VOLUNTEER_PLAN_KEY, id: rawId },
      honesty: "Saved volunteer opportunity on this device."
    });
  }

  function currentWeather() {
    var WDS = global.WDS || {};
    var platform = WDS.outdoorIntelligence && WDS.outdoorIntelligence.getLast
      ? WDS.outdoorIntelligence.getLast()
      : null;
    var weather = platform && (platform.weatherRef || platform.weather);
    var current = weather && weather.current;
    if (!current) return [];
    var conditions = current.conditions || {};
    var observed = current.observedAt || (weather.meta && weather.meta.fetchedAt) ||
      (platform.meta && platform.meta.hydratedAt);
    var temperature = current.temperature && current.temperature.value != null
      ? current.temperature.value + (current.temperature.unit || "°")
      : null;
    return [create({
      rawId: observed || "current",
      kind: "weather",
      title: text(conditions.summary) || "Current weather",
      summary: temperature ? "Temperature " + temperature : null,
      observedAt: observed,
      recordedAt: observed,
      source: {
        id: "weather",
        label: "Current conditions",
        provider: weather.meta && weather.meta.provider,
        recordId: observed || "current"
      },
      location: platform.location,
      weather: current,
      privacy: { visibility: "public", retention: "ephemeral", localOnly: false },
      public: true,
      href: "/apps/dashboard/",
      honesty: "Current conditions from the active weather provider; check the timestamp before use."
    })];
  }

  function currentTrailCondition() {
    var WDS = global.WDS || {};
    var platform = WDS.outdoorIntelligence && WDS.outdoorIntelligence.getLast
      ? WDS.outdoorIntelligence.getLast()
      : null;
    var trails = platform && platform.trailConditions;
    if (!trails || (!trails.summary && !trails.status && !array(trails.trails).length)) return [];
    var recorded = trails.updatedAt || trails.fetchedAt || (trails.meta && trails.meta.fetchedAt) ||
      (platform.meta && platform.meta.hydratedAt);
    return [create({
      rawId: recorded || "current",
      kind: "trail-condition",
      title: trails.summary || "Trail conditions",
      summary: array(trails.closures).length
        ? array(trails.closures).length + " closure notice" + (array(trails.closures).length === 1 ? "" : "s")
        : null,
      observedAt: recorded,
      recordedAt: recorded,
      source: {
        id: "trail-conditions",
        label: "Trail conditions",
        provider: trails.provider,
        recordId: recorded || "current"
      },
      location: platform.location,
      categories: ["trails"],
      privacy: { visibility: "public", retention: "ephemeral", localOnly: false },
      public: true,
      href: "/apps/dashboard/",
      honesty: "Derived from available trail and weather context; verify official closure notices."
    })];
  }

  var adapters = {
    fieldry: function () {
      return array(readJson(FIELDRY_KEY, [])).map(fromFieldry).filter(Boolean);
    },
    "shed-hunting": function () {
      return array(readJson(SHEDS_KEY, [])).map(fromSheds).filter(Boolean);
    },
    foragecast: function () {
      return array(readJson(FC_JOURNAL_KEY, [])).map(fromForageJournal).filter(Boolean);
    },
    "photo-library": function () {
      return array(readJson(PHOTO_KEY, [])).map(fromPhoto).filter(Boolean);
    },
    trips: function () {
      var sheds = array(readJson(SHEDS_SESSIONS_KEY, [])).map(function (trip) {
        return fromTrip(trip, "shed-hunting", "Sheds", SHEDS_SESSIONS_KEY, "/apps/shed-hunting/map/");
      });
      var shoots = array(readJson(PHOTO_SHOOTS_KEY, [])).map(function (trip) {
        return fromTrip(trip, "waypoint-scenes", "Scenes", PHOTO_SHOOTS_KEY, "/apps/scenes/");
      });
      return sheds.concat(shoots).filter(Boolean);
    },
    "waypoint-volunteer": function () {
      var plan = readJson(VOLUNTEER_PLAN_KEY, {});
      var items = (plan && plan.items) || {};
      return Object.keys(items).map(function (id) {
        var item = items[id] || {};
        var statuses = array(item.statuses);
        if (statuses.indexOf("hidden") >= 0 || statuses.indexOf("dismissed") >= 0) return null;
        return fromVolunteerSaved(Object.assign({ id: id }, item));
      }).filter(Boolean);
    },
    weather: currentWeather,
    "trail-conditions": currentTrailCondition
  };

  function filterAndSort(items, options) {
    options = options || {};
    var kinds = array(options.kinds || options.types);
    var sources = array(options.sources || options.apps);
    var since = timestamp(options.since);
    var until = timestamp(options.until);
    var seen = Object.create(null);
    var out = items.map(normalize).filter(function (item) {
      if (seen[item.id]) return false;
      seen[item.id] = true;
      if (kinds.length && kinds.indexOf(item.kind) < 0) return false;
      if (sources.length && sources.indexOf(item.source.id) < 0) return false;
      if (since && item.observedAt < since) return false;
      if (until && item.observedAt > until) return false;
      return true;
    });
    out.sort(function (a, b) {
      var byObserved = String(b.observedAt || "").localeCompare(String(a.observedAt || ""));
      return byObserved || a.id.localeCompare(b.id);
    });
    if (options.maxPerKind && typeof options.maxPerKind === "object") {
      var kindCounts = {};
      out = out.filter(function (item) {
        var maximum = Number(options.maxPerKind[item.kind]);
        if (!isFinite(maximum) || maximum < 0) return true;
        kindCounts[item.kind] = (kindCounts[item.kind] || 0) + 1;
        return kindCounts[item.kind] <= maximum;
      });
    }
    if (options.limit != null) out = out.slice(0, Math.max(0, Number(options.limit) || 0));
    return out;
  }

  function list(options) {
    options = options || {};
    var selected = array(options.adapters || options.apps);
    if (!selected.length) selected = Object.keys(adapters);
    var out = array(options.extra);
    selected.forEach(function (id) {
      if (!adapters[id]) return;
      try {
        out = out.concat(array(adapters[id](options)));
      } catch (error) { /* broken source store must not break the shared timeline */ }
    });
    return filterAndSort(out, options);
  }

  function articleUrl(depth) {
    if (depth >= 2) return "../../../data/articles/articles.json";
    if (depth === 1) return "../../data/articles/articles.json";
    return "/data/articles/articles.json";
  }

  function loadArticlePayload(url) {
    url = url || articleUrl(0);
    if (articleCache[url]) return articleCache[url];
    if (typeof global.fetch !== "function") return Promise.resolve({ articles: [] });
    articleCache[url] = global.fetch(url, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("Articles HTTP " + response.status);
        return response.json();
      })
      .catch(function () { return { articles: [] }; });
    return articleCache[url];
  }

  function query(options) {
    options = options || {};
    var localOptions = Object.assign({}, options);
    delete localOptions.limit;
    var local = list(localOptions);
    if (options.includeArticles === false) return Promise.resolve(local);
    return loadArticlePayload(options.articlesUrl || articleUrl(options.depth || 0))
      .then(function (payload) {
        var articles = array(payload && payload.articles).map(fromArticle).filter(Boolean);
        return filterAndSort(local.concat(articles), options);
      });
  }

  function forApp(appId) {
    return list({ sources: [appId] });
  }

  function recent(limit) {
    return list({ limit: limit != null ? limit : 12 });
  }

  function stats(items) {
    var all = items ? filterAndSort(array(items), {}) : list();
    var bySource = {};
    var byKind = {};
    var taxa = {};
    all.forEach(function (item) {
      bySource[item.source.id] = (bySource[item.source.id] || 0) + 1;
      byKind[item.kind] = (byKind[item.kind] || 0) + 1;
      if (item.subject.kind === "species" && item.subject.label) taxa[item.subject.label.toLowerCase()] = true;
    });
    return {
      total: all.length,
      byApp: bySource,
      bySource: bySource,
      byKind: byKind,
      distinctTaxa: Object.keys(taxa).length,
      honesty: "Counts reflect records available to this browser from their original sources."
    };
  }

  function wildlifeContext() {
    var fieldry = forApp("fieldry");
    var sheds = forApp("shed-hunting");
    var species = {};
    var places = {};
    fieldry.forEach(function (item) {
      if (item.subject.label) species[item.subject.label.toLowerCase()] = true;
      if (item.location.label) places[item.location.label.toLowerCase()] = true;
    });
    return {
      fieldryCount: fieldry.length,
      shedsCount: sheds.length,
      speciesCount: Object.keys(species).length,
      countyCount: Object.keys(places).length,
      recent: fieldry.slice(0, 3),
      honesty: "Derived from private Fieldry and Sheds records available on this device."
    };
  }

  function registerAdapter(id, adapter) {
    if (!id || typeof adapter !== "function") return false;
    adapters[id] = adapter;
    notify({ source: id, reason: "adapter-registered" });
    return true;
  }

  function subscribe(listener) {
    if (typeof listener !== "function") return function () {};
    listeners.push(listener);
    return function () {
      listeners = listeners.filter(function (item) { return item !== listener; });
    };
  }

  function notify(detail) {
    listeners.slice().forEach(function (listener) {
      try { listener(detail || {}); } catch (error) { /* isolated subscriber */ }
    });
    try {
      if (global.dispatchEvent && typeof global.CustomEvent === "function") {
        global.dispatchEvent(new global.CustomEvent("waypoint:observations-changed", { detail: detail || {} }));
      }
    } catch (error2) { /* custom events are optional */ }
  }

  var watchedKeys = [
    FIELDRY_KEY, SHEDS_KEY, FC_JOURNAL_KEY, PHOTO_KEY,
    PHOTO_SHOOTS_KEY, SHEDS_SESSIONS_KEY
  ];
  if (global.addEventListener) {
    global.addEventListener("storage", function (event) {
      if (watchedKeys.indexOf(event.key) >= 0) notify({ source: event.key, reason: "storage" });
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.platformObservations = {
    version: VERSION,
    schema: SCHEMA_ID,
    kinds: KINDS,
    FIELDRY_KEY: FIELDRY_KEY,
    SHEDS_KEY: SHEDS_KEY,
    create: create,
    normalize: normalize,
    envelope: envelope,
    validate: validate,
    list: list,
    query: query,
    forApp: forApp,
    recent: recent,
    stats: stats,
    wildlifeContext: wildlifeContext,
    adapters: adapters,
    registerAdapter: registerAdapter,
    subscribe: subscribe,
    notify: notify,
    loadArticlePayload: loadArticlePayload,
    fromFieldry: fromFieldry,
    fromSheds: fromSheds,
    fromForageJournal: fromForageJournal,
    fromPhoto: fromPhoto,
    fromTrip: fromTrip,
    fromArticle: fromArticle,
    fromSpecies: fromSpecies,
    fromVolunteerSaved: fromVolunteerSaved
  };
})(typeof window !== "undefined" ? window : globalThis);
