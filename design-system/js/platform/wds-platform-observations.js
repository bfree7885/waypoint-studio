/**
 * Waypoint Studio — Unified Observation Ledger (query layer)
 *
 * Reads existing private app stores and exposes a common summary envelope.
 * Does NOT invent suitability scores or fake live intelligence.
 * Persistence remains in each app; this module is the cross-app bridge.
 *
 *   WDS.platformObservations.list(options)
 *   WDS.platformObservations.stats()
 *   WDS.platformObservations.forApp(appId)
 *   WDS.platformObservations.recent(limit)
 *   WDS.platformObservations.adapters
 */
(function (global) {
  "use strict";

  var FIELDRY_KEY = "waypoint-fieldry-observations-v1";
  var SHEDS_KEY = "waypoint-sheds-observations-v1";
  var FC_JOURNAL_KEY = "foragecast.journal.v1";
  var VOLUNTEER_PLAN_KEY = "waypoint-volunteer-planning-v1";

  var SOURCE_LABEL = {
    fieldry: "field notes",
    foragecast: "journal",
    "shed-hunting": "Sheds",
    "waypoint-volunteer": "saved notes",
    "savant-sommelier": "notes",
    steepleaf: "notes",
    signalterrain: "notes",
    "landscape-interpretation": "notes",
    terrainbound: "notes",
    "openroad-pa": "notes"
  };

  function sourceLabel(appId) {
    return SOURCE_LABEL[appId] || "notes";
  }

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }

  function envelope( partial ) {
    partial = partial || {};
    return {
      id: partial.id || null,
      sourceApp: partial.sourceApp || "unknown",
      kind: partial.kind || "observation",
      title: partial.title || "Untitled",
      subtitle: partial.subtitle || null,
      recordedAt: partial.recordedAt || null,
      locationLabel: partial.locationLabel || null,
      lat: partial.lat != null ? partial.lat : null,
      lng: partial.lng != null ? partial.lng : null,
      taxonLabel: partial.taxonLabel || null,
      privacy: partial.privacy || "private",
      href: partial.href || null,
      rawRef: partial.rawRef || null,
      honesty: partial.honesty || "User-entered on this device. Not a live detection.",
      sourceLabel: partial.sourceLabel || sourceLabel(partial.sourceApp)
    };
  }

  function fromFieldry(obs) {
    if (!obs) return null;
    var taxon = obs.taxon || {};
    var loc = obs.location || {};
    var title = taxon.label || taxon.commonName || taxon.scientificName || "Field observation";
    return envelope({
      id: obs.id,
      sourceApp: "fieldry",
      kind: "wildlife-observation",
      title: title,
      subtitle: taxon.scientificName && taxon.commonName ? taxon.scientificName : null,
      recordedAt: obs.recordedAt || (obs.meta && obs.meta.createdAt) || null,
      locationLabel: [loc.county, loc.state || loc.stateCode].filter(Boolean).join(", ") || null,
      lat: loc.latitude != null ? loc.latitude : loc.lat,
      lng: loc.longitude != null ? loc.longitude : loc.lng,
      taxonLabel: title,
      privacy: (obs.privacy && obs.privacy.visibility) || "private",
      href: null,
      rawRef: { store: FIELDRY_KEY, id: obs.id },
      honesty: "Private field note on this device."
    });
  }

  function fromSheds(obs) {
    if (!obs) return null;
    var type = obs.type || "other";
    var loc = obs.location || {};
    return envelope({
      id: obs.id,
      sourceApp: "shed-hunting",
      kind: "sheds-observation",
      title: String(type).replace(/_/g, " "),
      subtitle: obs.speciesId || "cervid field note",
      recordedAt: obs.observedAt || obs.createdAt || null,
      locationLabel: null,
      lat: loc.lat,
      lng: loc.lng,
      taxonLabel: obs.speciesId || null,
      privacy: "private",
      href: "../shed-hunting/map/",
      rawRef: { store: SHEDS_KEY, id: obs.id },
      honesty: "Private Sheds field note on this device. Coordinates stay local."
    });
  }

  function fromForageJournal(entry) {
    if (!entry) return null;
    return envelope({
      id: entry.id || ("fcj_" + String(entry.at || entry.createdAt || "")),
      sourceApp: "foragecast",
      kind: "journal-note",
      title: entry.text ? String(entry.text).slice(0, 80) : "Journal note",
      subtitle: entry.speciesId || null,
      recordedAt: entry.at || entry.createdAt || null,
      locationLabel: null,
      privacy: "private",
      href: null,
      rawRef: { store: FC_JOURNAL_KEY, id: entry.id },
      honesty: "Private journal note — educational context, not a detection."
    });
  }

  function fromVolunteerSaved(item) {
    if (!item) return null;
    return envelope({
      id: item.id || item.opportunityId,
      sourceApp: "waypoint-volunteer",
      kind: "volunteer-saved",
      title: item.title || item.name || "Saved opportunity",
      subtitle: item.org || item.organization || null,
      recordedAt: item.savedAt || item.updatedAt || null,
      locationLabel: item.locationLabel || item.area || null,
      privacy: "private",
      href: null,
      rawRef: { store: VOLUNTEER_PLAN_KEY, id: item.id },
      honesty: "Saved opportunity on this device."
    });
  }

  var adapters = {
    fieldry: function () {
      var list = readJson(FIELDRY_KEY, []);
      if (!Array.isArray(list)) return [];
      return list.map(fromFieldry).filter(Boolean);
    },
    "shed-hunting": function () {
      var list = readJson(SHEDS_KEY, []);
      if (!Array.isArray(list)) return [];
      return list.map(fromSheds).filter(Boolean);
    },
    foragecast: function () {
      var list = readJson(FC_JOURNAL_KEY, []);
      if (!Array.isArray(list)) return [];
      return list.map(fromForageJournal).filter(Boolean);
    },
    "waypoint-volunteer": function () {
      var plan = readJson(VOLUNTEER_PLAN_KEY, {});
      var items = (plan && plan.items) || {};
      return Object.keys(items).map(function (id) {
        var item = items[id] || {};
        var statuses = item.statuses || [];
        if (statuses.indexOf("hidden") >= 0 || statuses.indexOf("dismissed") >= 0) return null;
        return fromVolunteerSaved({
          id: id,
          title: item.title || item.name || ("Opportunity " + id),
          org: item.org || item.organization || null,
          savedAt: item.updatedAt,
          locationLabel: item.locationLabel || item.area || null,
          statuses: statuses
        });
      }).filter(Boolean);
    }
  };

  function list(options) {
    options = options || {};
    var apps = options.apps || Object.keys(adapters);
    var out = [];
    apps.forEach(function (appId) {
      if (adapters[appId]) {
        try {
          out = out.concat(adapters[appId]());
        } catch (e) { /* ignore broken store */ }
      }
    });
    out.sort(function (a, b) {
      return String(b.recordedAt || "").localeCompare(String(a.recordedAt || ""));
    });
    if (options.limit != null) out = out.slice(0, options.limit);
    return out;
  }

  function forApp(appId) {
    return list({ apps: [appId] });
  }

  function recent(limit) {
    return list({ limit: limit != null ? limit : 12 });
  }

  function stats() {
    var all = list();
    var byApp = {};
    var taxa = {};
    all.forEach(function (o) {
      byApp[o.sourceApp] = (byApp[o.sourceApp] || 0) + 1;
      if (o.taxonLabel) taxa[String(o.taxonLabel).toLowerCase()] = true;
    });
    return {
      total: all.length,
      byApp: byApp,
      distinctTaxa: Object.keys(taxa).length,
      honesty: "Counts reflect private records on this device only."
    };
  }

  /**
   * Wildlife context for Dashboard / Sheds — factual counts only.
   */
  function wildlifeContext() {
    var fieldry = forApp("fieldry");
    var sheds = forApp("shed-hunting");
    var species = {};
    var counties = {};
    fieldry.forEach(function (o) {
      if (o.taxonLabel) species[String(o.taxonLabel).toLowerCase()] = true;
      if (o.locationLabel) counties[String(o.locationLabel).toLowerCase()] = true;
    });
    return {
      fieldryCount: fieldry.length,
      shedsCount: sheds.length,
      speciesCount: Object.keys(species).length,
      countyCount: Object.keys(counties).length,
      recent: fieldry.slice(0, 3),
      honesty: "Derived from your private field notes and Sheds records. Not a live wildlife feed."
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.platformObservations = {
    version: "1.0.0",
    FIELDRY_KEY: FIELDRY_KEY,
    SHEDS_KEY: SHEDS_KEY,
    list: list,
    forApp: forApp,
    recent: recent,
    stats: stats,
    wildlifeContext: wildlifeContext,
    sourceLabel: sourceLabel,
    adapters: adapters,
    envelope: envelope
  };
})(typeof window !== "undefined" ? window : globalThis);
