/**
 * Steepleaf — tea collection & brew session store (private, on-device).
 * Schema 1.1 — Product Recovery Phase 1.
 * Never seeds fabricated journals or sample tasting notes.
 */
(function (global) {
  "use strict";

  var TEA_KEY = "waypoint-steepleaf-teas-v1";
  var BREW_KEY = "waypoint-steepleaf-brews-v1";
  var PREF_KEY = "waypoint-steepleaf-prefs-v1";
  var SCHEMA = "1.1.0";

  var TEA_TYPES = [
    { id: "green", label: "Green" },
    { id: "white", label: "White" },
    { id: "yellow", label: "Yellow" },
    { id: "oolong", label: "Oolong" },
    { id: "black", label: "Black / red" },
    { id: "sheng-puer", label: "Sheng puer" },
    { id: "shou-puer", label: "Shou puer" },
    { id: "heicha", label: "Dark tea (heicha)" },
    { id: "matcha", label: "Matcha" },
    { id: "herbal", label: "Herbal / tisane" },
    { id: "other", label: "Other" }
  ];

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function read(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function readPrefs() {
    try {
      var raw = localStorage.getItem(PREF_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writePrefs(prefs) {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(prefs || {}));
      return true;
    } catch (e) {
      return false;
    }
  }

  function normalizeTea(t) {
    if (!t || typeof t !== "object") return null;
    return {
      schemaVersion: SCHEMA,
      id: t.id || "tea_" + uuid(),
      name: t.name || "Untitled tea",
      type: t.type || null,
      origin: t.origin || null,
      region: t.region || null,
      harvestYear: t.harvestYear != null && t.harvestYear !== "" ? Number(t.harvestYear) || t.harvestYear : null,
      vendor: t.vendor || null,
      storageLocation: t.storageLocation || null,
      remainingQuantity: t.remainingQuantity || null,
      favorite: !!t.favorite,
      purchaseDate: t.purchaseDate || null,
      purchasePrice: t.purchasePrice || null,
      flavorNotes: Array.isArray(t.flavorNotes) ? t.flavorNotes : [],
      notes: t.notes || null,
      privacy: "private",
      createdAt: t.createdAt || nowIso(),
      updatedAt: t.updatedAt || t.createdAt || nowIso()
    };
  }

  function normalizeBrew(b) {
    if (!b || typeof b !== "object") return null;
    return {
      schemaVersion: SCHEMA,
      id: b.id || "brew_" + uuid(),
      teaId: b.teaId || null,
      teaNameSnapshot: b.teaNameSnapshot || null,
      brewedAt: b.brewedAt || nowIso(),
      waterTempC: b.waterTempC != null && b.waterTempC !== "" ? Number(b.waterTempC) : null,
      leafGrams: b.leafGrams != null && b.leafGrams !== "" ? Number(b.leafGrams) : null,
      waterMl: b.waterMl != null && b.waterMl !== "" ? Number(b.waterMl) : null,
      steepSeconds: b.steepSeconds != null && b.steepSeconds !== "" ? Number(b.steepSeconds) : null,
      infusions: Array.isArray(b.infusions) ? b.infusions : [],
      infusionCount: b.infusionCount != null ? Number(b.infusionCount) : b.infusions && b.infusions.length ? b.infusions.length : null,
      vessel: b.vessel || null,
      flavorNotes: Array.isArray(b.flavorNotes) ? b.flavorNotes : [],
      mood: b.mood || null,
      rating: b.rating != null && b.rating !== "" ? Number(b.rating) : null,
      notes: b.notes || null,
      privacy: "private",
      createdAt: b.createdAt || nowIso(),
      updatedAt: b.updatedAt || b.createdAt || nowIso()
    };
  }

  function createTea(partial) {
    return normalizeTea(Object.assign({ createdAt: nowIso(), updatedAt: nowIso() }, partial || {}));
  }

  function createBrew(partial) {
    return normalizeBrew(Object.assign({ createdAt: nowIso(), updatedAt: nowIso() }, partial || {}));
  }

  function listTeas() {
    return read(TEA_KEY)
      .map(normalizeTea)
      .filter(Boolean)
      .sort(function (a, b) {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
      });
  }

  function listBrews() {
    return read(BREW_KEY)
      .map(normalizeBrew)
      .filter(Boolean)
      .sort(function (a, b) {
        return String(b.brewedAt || "").localeCompare(String(a.brewedAt || ""));
      });
  }

  function getTea(id) {
    return listTeas().filter(function (t) {
      return t.id === id;
    })[0] || null;
  }

  function getBrew(id) {
    return listBrews().filter(function (b) {
      return b.id === id;
    })[0] || null;
  }

  function saveTea(tea) {
    var n = normalizeTea(tea);
    if (!n) return false;
    n.updatedAt = nowIso();
    var all = read(TEA_KEY).filter(function (t) {
      return t.id !== n.id;
    });
    all.unshift(n);
    return write(TEA_KEY, all.slice(0, 500));
  }

  function saveBrew(brew) {
    var n = normalizeBrew(brew);
    if (!n) return false;
    n.updatedAt = nowIso();
    if (!n.teaNameSnapshot && n.teaId) {
      var tea = getTea(n.teaId);
      if (tea) n.teaNameSnapshot = tea.name;
    }
    var all = read(BREW_KEY).filter(function (b) {
      return b.id !== n.id;
    });
    all.unshift(n);
    return write(BREW_KEY, all.slice(0, 800));
  }

  function deleteTea(id) {
    var all = read(TEA_KEY).filter(function (t) {
      return t.id !== id;
    });
    return write(TEA_KEY, all);
  }

  function deleteBrew(id) {
    var all = read(BREW_KEY).filter(function (b) {
      return b.id !== id;
    });
    return write(BREW_KEY, all);
  }

  function brewsForTea(teaId) {
    return listBrews().filter(function (b) {
      return b.teaId === teaId;
    });
  }

  function searchAll(q) {
    var query = String(q || "")
      .toLowerCase()
      .trim();
    if (!query) return { teas: listTeas(), brews: listBrews() };
    var teas = listTeas().filter(function (t) {
      var blob = [
        t.name,
        t.type,
        t.origin,
        t.region,
        t.vendor,
        t.storageLocation,
        t.notes,
        (t.flavorNotes || []).join(" ")
      ]
        .join(" ")
        .toLowerCase();
      return blob.indexOf(query) >= 0;
    });
    var teaIds = {};
    teas.forEach(function (t) {
      teaIds[t.id] = true;
    });
    var brews = listBrews().filter(function (b) {
      var tea = getTea(b.teaId);
      var blob = [
        b.teaNameSnapshot,
        tea && tea.name,
        b.notes,
        b.mood,
        b.vessel,
        (b.flavorNotes || []).join(" ")
      ]
        .join(" ")
        .toLowerCase();
      return blob.indexOf(query) >= 0 || (b.teaId && teaIds[b.teaId]);
    });
    return { teas: teas, brews: brews };
  }

  function exportBundle() {
    return {
      schemaVersion: SCHEMA,
      exportedAt: nowIso(),
      privacy: "private",
      teas: listTeas(),
      brews: listBrews(),
      preferences: getPreferences()
    };
  }

  function importBundle(bundle, mode) {
    if (!bundle || !Array.isArray(bundle.teas)) return { ok: false, error: "Invalid bundle" };
    mode = mode || "merge";
    var teas = mode === "replace" ? [] : read(TEA_KEY);
    var brews = mode === "replace" ? [] : read(BREW_KEY);
    var teaMap = {};
    teas.forEach(function (t) {
      teaMap[t.id] = t;
    });
    (bundle.teas || []).forEach(function (t) {
      var n = normalizeTea(t);
      if (n) teaMap[n.id] = n;
    });
    var brewMap = {};
    brews.forEach(function (b) {
      brewMap[b.id] = b;
    });
    (bundle.brews || []).forEach(function (b) {
      var n = normalizeBrew(b);
      if (n) brewMap[n.id] = n;
    });
    var okT = write(TEA_KEY, Object.keys(teaMap).map(function (k) {
      return teaMap[k];
    }).slice(0, 500));
    var okB = write(BREW_KEY, Object.keys(brewMap).map(function (k) {
      return brewMap[k];
    }).slice(0, 800));
    if (bundle.preferences) setPreferences(bundle.preferences);
    return { ok: okT && okB };
  }

  function getPreferences() {
    var p = readPrefs();
    return {
      preferredTypes: Array.isArray(p.preferredTypes) ? p.preferredTypes : [],
      defaultVessel: p.defaultVessel || "gaiwan",
      units: p.units || "metric",
      showLearningTips: p.showLearningTips !== false
    };
  }

  function setPreferences(partial) {
    var cur = getPreferences();
    return writePrefs(Object.assign({}, cur, partial || {}));
  }

  function clearAll() {
    try {
      localStorage.removeItem(TEA_KEY);
      localStorage.removeItem(BREW_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  global.WaypointSteepleaf = {
    TEA_KEY: TEA_KEY,
    BREW_KEY: BREW_KEY,
    PREF_KEY: PREF_KEY,
    SCHEMA: SCHEMA,
    TEA_TYPES: TEA_TYPES,
    createTea: createTea,
    createBrew: createBrew,
    listTeas: listTeas,
    listBrews: listBrews,
    getTea: getTea,
    getBrew: getBrew,
    saveTea: saveTea,
    saveBrew: saveBrew,
    deleteTea: deleteTea,
    deleteBrew: deleteBrew,
    brewsForTea: brewsForTea,
    searchAll: searchAll,
    exportBundle: exportBundle,
    importBundle: importBundle,
    getPreferences: getPreferences,
    setPreferences: setPreferences,
    clearAll: clearAll,
    normalizeTea: normalizeTea,
    normalizeBrew: normalizeBrew
  };
})(typeof window !== "undefined" ? window : globalThis);
