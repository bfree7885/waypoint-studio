/**
 * Fieldry life list — categories + derived personal collection index.
 * Computed from WOS observations. No leaderboards or social ranking.
 */
(function (global) {
  "use strict";

  var CATEGORIES = [
    { id: "birds", label: "Birds" },
    { id: "mammals", label: "Mammals" },
    { id: "reptiles", label: "Reptiles" },
    { id: "amphibians", label: "Amphibians" },
    { id: "fish", label: "Fish" },
    { id: "insects", label: "Insects" },
    { id: "butterflies", label: "Butterflies" },
    { id: "dragonflies", label: "Dragonflies" },
    { id: "plants", label: "Plants" },
    { id: "trees", label: "Trees" },
    { id: "mushrooms", label: "Mushrooms" },
    { id: "lichens", label: "Lichens" },
    { id: "rocks", label: "Rocks" },
    { id: "minerals", label: "Minerals" },
    { id: "clouds", label: "Clouds" },
    { id: "weather", label: "Weather" },
    { id: "other", label: "Other observations" }
  ];

  var CATEGORY_BY_ID = {};
  CATEGORIES.forEach(function (c) { CATEGORY_BY_ID[c.id] = c; });

  function fieldryExt(obs) {
    if (!obs) return {};
    if (obs.extensions && obs.extensions.fieldry) return obs.extensions.fieldry;
    if (obs.meta && obs.meta.fieldry) return obs.meta.fieldry;
    return {};
  }

  function getCategory(obs) {
    var ext = fieldryExt(obs);
    var cat = ext.category ||
      (obs && obs.record && obs.record.category) ||
      "other";
    return CATEGORY_BY_ID[cat] ? cat : "other";
  }

  function categoryLabel(id) {
    return (CATEGORY_BY_ID[id] && CATEGORY_BY_ID[id].label) || "Other observations";
  }

  function isUnidentified(obs) {
    var ext = fieldryExt(obs);
    if (ext.unidentified === true) return true;
    if (ext.identificationStatus === "unidentified") return true;
    var conf = obs && obs.record && obs.record.confidence;
    if (conf === "uncertain" && !((obs.taxon && obs.taxon.taxonId) || ext.knowledgeId)) {
      var label = ((obs.taxon && (obs.taxon.commonName || obs.taxon.label)) || "").toLowerCase();
      if (/^unknown\b|^unidentified\b|to identify/.test(label)) return true;
    }
    return false;
  }

  function normKey(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function subjectKey(obs) {
    var ext = fieldryExt(obs);
    if (ext.knowledgeId) return "knowledge:" + ext.knowledgeId;
    if (obs.taxon && obs.taxon.taxonId) {
      return (obs.taxon.taxonIdSource || "taxon") + ":" + obs.taxon.taxonId;
    }
    if (isUnidentified(obs)) {
      var custom = normKey(obs.taxon && (obs.taxon.commonName || obs.taxon.label));
      return "unidentified:" + getCategory(obs) + ":" + (custom || "unknown");
    }
    var name = normKey(
      (obs.taxon && (obs.taxon.scientificName || obs.taxon.commonName || obs.taxon.label)) || ""
    );
    if (!name) name = "untitled";
    return "name:" + getCategory(obs) + ":" + name;
  }

  function subjectDisplay(obs) {
    var ext = fieldryExt(obs);
    if (ext.knowledgeCommon || ext.knowledgeScientific) {
      return {
        commonName: ext.knowledgeCommon || (obs.taxon && obs.taxon.commonName) || null,
        scientificName: ext.knowledgeScientific || (obs.taxon && obs.taxon.scientificName) || null,
        label: (obs.taxon && obs.taxon.label) || ext.knowledgeCommon || "Observation"
      };
    }
    return {
      commonName: obs.taxon && obs.taxon.commonName || null,
      scientificName: obs.taxon && obs.taxon.scientificName || null,
      label: (obs.taxon && obs.taxon.label) || "Observation"
    };
  }

  function summarizeLifeList(observations) {
    var counts = {};
    CATEGORIES.forEach(function (c) { counts[c.id] = 0; });
    var days = {};
    (observations || []).forEach(function (obs) {
      var cat = getCategory(obs);
      counts[cat] = (counts[cat] || 0) + 1;
      var d = obs && obs.observedAt && obs.observedAt.date;
      if (d) days[d] = true;
    });
    return {
      total: (observations || []).length,
      byCategory: CATEGORIES.map(function (c) {
        return { id: c.id, label: c.label, count: counts[c.id] || 0 };
      }),
      uniqueDays: Object.keys(days).length,
      categoriesExplored: CATEGORIES.filter(function (c) {
        return c.id !== "other" && (counts[c.id] || 0) > 0;
      }).length
    };
  }

  /**
   * Derive unique life-list entries from observations.
   * @returns {Array<{key, category, commonName, scientificName, label, firstObserved, lastObserved, count, unidentified, knowledgeId, taxonId, observationIds, confidence}>}
   */
  function deriveLifeList(observations, options) {
    options = options || {};
    var map = {};
    (observations || []).forEach(function (obs) {
      if (!obs || !obs.id) return;
      var key = subjectKey(obs);
      var display = subjectDisplay(obs);
      var ext = fieldryExt(obs);
      var date = (obs.observedAt && obs.observedAt.date) || "";
      var entry = map[key];
      if (!entry) {
        entry = {
          key: key,
          category: getCategory(obs),
          commonName: display.commonName,
          scientificName: display.scientificName,
          label: display.label,
          firstObserved: date || null,
          lastObserved: date || null,
          count: 0,
          unidentified: isUnidentified(obs),
          knowledgeId: ext.knowledgeId || null,
          taxonId: (obs.taxon && obs.taxon.taxonId) || null,
          taxonIdSource: (obs.taxon && obs.taxon.taxonIdSource) || null,
          observationIds: [],
          confidence: (obs.record && obs.record.confidence) || null
        };
        map[key] = entry;
      }
      entry.count += 1;
      entry.observationIds.push(obs.id);
      entry.unidentified = entry.unidentified && isUnidentified(obs);
      if (date) {
        if (!entry.firstObserved || date < entry.firstObserved) entry.firstObserved = date;
        if (!entry.lastObserved || date > entry.lastObserved) entry.lastObserved = date;
      }
      if (!entry.knowledgeId && ext.knowledgeId) entry.knowledgeId = ext.knowledgeId;
      if (!entry.commonName && display.commonName) entry.commonName = display.commonName;
      if (!entry.scientificName && display.scientificName) entry.scientificName = display.scientificName;
    });

    var list = Object.keys(map).map(function (k) { return map[k]; });
    var sort = options.sort || "recent";
    if (sort === "most") {
      list.sort(function (a, b) {
        if (b.count !== a.count) return b.count - a.count;
        return (b.lastObserved || "").localeCompare(a.lastObserved || "");
      });
    } else if (sort === "first") {
      list.sort(function (a, b) {
        return (a.firstObserved || "").localeCompare(b.firstObserved || "");
      });
    } else if (sort === "name") {
      list.sort(function (a, b) {
        return (a.commonName || a.label || "").localeCompare(b.commonName || b.label || "");
      });
    } else {
      list.sort(function (a, b) {
        return (b.lastObserved || "").localeCompare(a.lastObserved || "");
      });
    }

    if (options.category && options.category !== "all") {
      list = list.filter(function (e) { return e.category === options.category; });
    }
    if (options.unidentifiedOnly) {
      list = list.filter(function (e) { return e.unidentified; });
    }
    if (options.query) {
      var q = normKey(options.query);
      list = list.filter(function (e) {
        return normKey([e.commonName, e.scientificName, e.label, e.category].join(" ")).indexOf(q) >= 0;
      });
    }
    return list;
  }

  global.WaypointFieldryLifeList = {
    CATEGORIES: CATEGORIES,
    CATEGORY_BY_ID: CATEGORY_BY_ID,
    getCategory: getCategory,
    categoryLabel: categoryLabel,
    fieldryExt: fieldryExt,
    isUnidentified: isUnidentified,
    subjectKey: subjectKey,
    subjectDisplay: subjectDisplay,
    summarizeLifeList: summarizeLifeList,
    deriveLifeList: deriveLifeList
  };
})(typeof window !== "undefined" ? window : global);
