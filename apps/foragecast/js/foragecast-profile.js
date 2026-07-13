/**
 * ForageCast — property profile v2 (private, local-first)
 * Rich land inventory + derived feature list for Today recommendations.
 * Photos stored in IndexedDB; profile metadata in localStorage.
 */
(function (global) {
  "use strict";

  var PROFILE_KEY = "waypoint-foragecast-property-v1";
  var INTENT_KEY = "waypoint-foragecast-intent-v1";
  var PHOTO_DB = "waypoint-foragecast-photos-v1";
  var PHOTO_STORE = "photos";
  var MAX_PHOTOS = 12;
  var MAX_PHOTO_EDGE = 960;
  var JPEG_QUALITY = 0.72;

  function readJson(key, fallback) {
    try {
      var raw = global.localStorage && global.localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      if (global.localStorage) global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function defaultProperty() {
    return {
      version: 2,
      name: "",
      locationLabel: "",
      usdaZone: "",
      acreage: "",
      goals: [],
      landTypes: [],
      orchard: [],
      berries: [],
      gardenTypes: [],
      wildlife: [],
      water: [],
      infrastructure: [],
      photos: [],
      notes: "",
      features: [],
      wizardCompleted: false,
      wizardDismissed: false,
      updatedAt: null
    };
  }

  function defaultIntent() {
    return { version: 1, priorities: ["forage"], updatedAt: null };
  }

  function unique(list) {
    var out = [];
    var seen = Object.create(null);
    (list || []).forEach(function (id) {
      if (!id || seen[id]) return;
      seen[id] = true;
      out.push(id);
    });
    return out;
  }

  function migrateV1(p) {
    var next = defaultProperty();
    next.name = p.name || "";
    next.notes = p.notes || "";
    next.features = Array.isArray(p.features) ? p.features.slice() : [];
    next.wizardCompleted = next.features.length > 0;
    // Reverse-map common features into structured fields when possible.
    var feat = next.features;
    function has(id) { return feat.indexOf(id) >= 0; }
    if (has("apple-trees")) next.orchard.push({ id: "apple-1", species: "apple", quantity: 1, age: "unknown", notes: "" });
    if (has("pear-trees")) next.orchard.push({ id: "pear-1", species: "pear", quantity: 1, age: "unknown", notes: "" });
    if (has("peach-trees")) next.orchard.push({ id: "peach-1", species: "peach", quantity: 1, age: "unknown", notes: "" });
    if (has("cherry-trees")) next.orchard.push({ id: "cherry-1", species: "cherry", quantity: 1, age: "unknown", notes: "" });
    if (has("pawpaws")) next.orchard.push({ id: "pawpaw-1", species: "pawpaw", quantity: 1, age: "unknown", notes: "" });
    if (has("hazelnuts")) next.orchard.push({ id: "hazel-1", species: "hazelnut", quantity: 1, age: "unknown", notes: "" });
    if (has("maple-trees")) next.orchard.push({ id: "maple-1", species: "maple", quantity: 1, age: "unknown", notes: "" });
    if (has("blueberries")) next.berries.push("blueberries");
    if (has("vegetable-garden")) next.gardenTypes.push("vegetable-garden");
    if (has("mushroom-logs")) next.infrastructure.push("mushroom-logs");
    if (has("beehives")) next.infrastructure.push("apiary");
    if (has("compost")) next.infrastructure.push("compost");
    if (has("pond")) next.water.push("pond");
    if (has("chickens")) next.infrastructure.push("chicken-coop");
    if (has("native-meadow")) next.landTypes.push("meadow");
    if (has("food-forest")) next.landTypes.push("food-forest");
    if (has("wild-edges")) next.landTypes.push("woodland");
    return next;
  }

  function normalize(p) {
    if (!p) return defaultProperty();
    if (!p.version || p.version < 2) p = migrateV1(p);
    var d = defaultProperty();
    Object.keys(d).forEach(function (k) {
      if (p[k] == null) p[k] = d[k];
    });
    ["goals", "landTypes", "berries", "gardenTypes", "wildlife", "water", "infrastructure", "photos", "features"].forEach(function (k) {
      if (!Array.isArray(p[k])) p[k] = [];
    });
    if (!Array.isArray(p.orchard)) p.orchard = [];
    p.version = 2;
    return p;
  }

  /**
   * Build the flat feature ids used by ForageCastToday from rich profile fields.
   * catalog is optional; without it only explicit orchard/garden mappings apply.
   */
  function deriveFeatures(property, catalog) {
    property = normalize(property);
    var features = [];
    var orchardMap = {};
    var landMap = {};
    var berryMap = {};
    var gardenMap = {};
    var waterMap = {};
    var infraMap = {};
    var wildMap = {};

    function index(list, map) {
      (list || []).forEach(function (item) {
        if (item && item.id) map[item.id] = item.feature || null;
      });
    }

    if (catalog) {
      index(catalog.orchardSpecies, orchardMap);
      index(catalog.landTypes, landMap);
      index(catalog.berries, berryMap);
      index(catalog.gardenTypes, gardenMap);
      index(catalog.water, waterMap);
      index(catalog.infrastructure, infraMap);
      index(catalog.wildlife, wildMap);
    } else {
      orchardMap = { apple: "apple-trees", pear: "pear-trees", peach: "peach-trees", cherry: "cherry-trees", pawpaw: "pawpaws", hazelnut: "hazelnuts", maple: "maple-trees", plum: "apple-trees" };
      landMap = { woodland: "wild-edges", "forest-edge": "wild-edges", "young-forest": "wild-edges", "mature-forest": "wild-edges", meadow: "native-meadow", "food-forest": "food-forest", pond: "pond", creek: "pond" };
      berryMap = { blueberries: "blueberries" };
      gardenMap = { "raised-beds": "vegetable-garden", "traditional-rows": "vegetable-garden", containers: "vegetable-garden", greenhouse: "vegetable-garden", "high-tunnel": "vegetable-garden", "cold-frame": "vegetable-garden", "vegetable-garden": "vegetable-garden" };
      waterMap = { pond: "pond" };
      infraMap = { compost: "compost", "mushroom-logs": "mushroom-logs", apiary: "beehives", "chicken-coop": "chickens" };
      wildMap = { "pollinator-gardens": "native-meadow" };
    }

    (property.orchard || []).forEach(function (tree) {
      if (!tree || !tree.species) return;
      var qty = Number(tree.quantity);
      if (!isNaN(qty) && qty <= 0) return;
      var f = orchardMap[tree.species];
      if (f) features.push(f);
    });
    (property.landTypes || []).forEach(function (id) {
      if (landMap[id]) features.push(landMap[id]);
    });
    (property.berries || []).forEach(function (id) {
      if (berryMap[id]) features.push(berryMap[id]);
    });
    (property.gardenTypes || []).forEach(function (id) {
      if (gardenMap[id]) features.push(gardenMap[id]);
    });
    (property.water || []).forEach(function (id) {
      if (waterMap[id]) features.push(waterMap[id]);
    });
    (property.infrastructure || []).forEach(function (id) {
      if (infraMap[id]) features.push(infraMap[id]);
    });
    (property.wildlife || []).forEach(function (id) {
      if (wildMap[id]) features.push(wildMap[id]);
    });

    // Preserve any legacy features not otherwise represented.
    (property.features || []).forEach(function (f) { features.push(f); });

    return unique(features);
  }

  function syncIntentFromGoals(property) {
    var goals = property.goals || [];
    if (!goals.length) return;
    saveIntent({ priorities: goals.slice() });
  }

  function loadProperty() {
    return normalize(readJson(PROFILE_KEY, null));
  }

  function saveProperty(next, catalog) {
    next = normalize(next || defaultProperty());
    next.features = deriveFeatures(next, catalog);
    next.updatedAt = new Date().toISOString();
    writeJson(PROFILE_KEY, next);
    if (next.goals && next.goals.length) syncIntentFromGoals(next);
    return next;
  }

  function loadIntent() {
    var i = readJson(INTENT_KEY, null);
    if (!i) {
      var p = loadProperty();
      if (p.goals && p.goals.length) return { version: 1, priorities: p.goals.slice(), updatedAt: null };
      return defaultIntent();
    }
    if (!Array.isArray(i.priorities) || !i.priorities.length) i.priorities = ["forage"];
    return i;
  }

  function saveIntent(next) {
    next = next || defaultIntent();
    next.version = 1;
    next.updatedAt = new Date().toISOString();
    writeJson(INTENT_KEY, next);
    return next;
  }

  function hasFeature(property, featureId) {
    property = property || loadProperty();
    var feats = property.features && property.features.length
      ? property.features
      : deriveFeatures(property);
    return feats.indexOf(featureId) >= 0;
  }

  function isConfigured(property) {
    property = property || loadProperty();
    if (property.wizardCompleted || property.wizardDismissed) return true;
    return deriveFeatures(property).length > 0 ||
      !!(property.name || property.locationLabel || property.usdaZone) ||
      (property.landTypes && property.landTypes.length) ||
      (property.orchard && property.orchard.length) ||
      (property.gardenTypes && property.gardenTypes.length);
  }

  function needsWizard(property) {
    property = property || loadProperty();
    return !property.wizardCompleted && !property.wizardDismissed && !isConfigured(property);
  }

  function summarize(property, catalog) {
    property = normalize(property);
    var orchardCount = (property.orchard || []).reduce(function (sum, t) {
      var q = Number(t.quantity);
      return sum + (isNaN(q) || q < 1 ? 1 : q);
    }, 0);
    var labels = [];
    function pushLabels(ids, list) {
      var map = {};
      (list || []).forEach(function (item) { map[item.id] = item.label; });
      (ids || []).forEach(function (id) {
        if (map[id]) labels.push(map[id]);
      });
    }
    if (catalog) {
      pushLabels(property.landTypes, catalog.landTypes);
      pushLabels(property.gardenTypes, catalog.gardenTypes);
      pushLabels(property.berries, catalog.berries);
      pushLabels(property.water, catalog.water);
      pushLabels(property.infrastructure, catalog.infrastructure);
      pushLabels(property.wildlife, catalog.wildlife);
      (property.orchard || []).forEach(function (t) {
        var sp = (catalog.orchardSpecies || []).find(function (s) { return s.id === t.species; });
        if (sp) labels.push((t.quantity || 1) + "× " + sp.label);
      });
    }
    return {
      name: property.name || "Untitled property",
      locationLabel: property.locationLabel || "",
      usdaZone: property.usdaZone || "",
      acreage: property.acreage || "",
      orchardTreeCount: orchardCount,
      featureCount: deriveFeatures(property, catalog).length,
      photoCount: (property.photos || []).length,
      labels: labels.slice(0, 24),
      goals: property.goals || []
    };
  }

  function openPhotoDb() {
    return new Promise(function (resolve, reject) {
      if (!global.indexedDB) {
        reject(new Error("Photos need a browser with IndexedDB."));
        return;
      }
      var req = global.indexedDB.open(PHOTO_DB, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(PHOTO_STORE)) {
          db.createObjectStore(PHOTO_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error("Photo storage failed.")); };
    });
  }

  function putPhotoBlob(id, blob, meta) {
    return openPhotoDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(PHOTO_STORE, "readwrite");
        tx.objectStore(PHOTO_STORE).put({
          id: id,
          blob: blob,
          category: meta && meta.category,
          caption: meta && meta.caption,
          createdAt: (meta && meta.createdAt) || new Date().toISOString()
        });
        tx.oncomplete = function () { resolve(id); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function getPhotoBlob(id) {
    return openPhotoDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(PHOTO_STORE, "readonly");
        var req = tx.objectStore(PHOTO_STORE).get(id);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function deletePhotoBlob(id) {
    return openPhotoDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(PHOTO_STORE, "readwrite");
        tx.objectStore(PHOTO_STORE).delete(id);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function compressImageFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) {
        reject(new Error("Choose an image file."));
        return;
      }
      if (file.size > 12 * 1024 * 1024) {
        reject(new Error("Keep photos under 12 MB."));
        return;
      }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
        var w = Math.max(1, Math.round(img.naturalWidth * scale));
        var h = Math.max(1, Math.round(img.naturalHeight * scale));
        var canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        canvas.toBlob(function (blob) {
          if (!blob) reject(new Error("Could not process photo."));
          else resolve(blob);
        }, "image/jpeg", JPEG_QUALITY);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read that photo."));
      };
      img.src = url;
    });
  }

  function addPhoto(file, category, caption) {
    var property = loadProperty();
    if ((property.photos || []).length >= MAX_PHOTOS) {
      return Promise.reject(new Error("You can keep up to " + MAX_PHOTOS + " property photos on this device."));
    }
    return compressImageFile(file).then(function (blob) {
      var id = "photo-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
      var meta = {
        id: id,
        category: category || "entire-property",
        caption: caption || "",
        createdAt: new Date().toISOString()
      };
      return putPhotoBlob(id, blob, meta).then(function () {
        property.photos = property.photos || [];
        property.photos.push(meta);
        saveProperty(property);
        return meta;
      });
    });
  }

  function removePhoto(id) {
    var property = loadProperty();
    property.photos = (property.photos || []).filter(function (p) { return p.id !== id; });
    saveProperty(property);
    return deletePhotoBlob(id);
  }

  function photoObjectUrl(id) {
    return getPhotoBlob(id).then(function (row) {
      if (!row || !row.blob) return null;
      return URL.createObjectURL(row.blob);
    });
  }

  global.ForageCastProfile = {
    PROFILE_KEY: PROFILE_KEY,
    INTENT_KEY: INTENT_KEY,
    loadProperty: loadProperty,
    saveProperty: saveProperty,
    loadIntent: loadIntent,
    saveIntent: saveIntent,
    hasFeature: hasFeature,
    isConfigured: isConfigured,
    needsWizard: needsWizard,
    defaultProperty: defaultProperty,
    defaultIntent: defaultIntent,
    deriveFeatures: deriveFeatures,
    summarize: summarize,
    normalize: normalize,
    addPhoto: addPhoto,
    removePhoto: removePhoto,
    photoObjectUrl: photoObjectUrl,
    MAX_PHOTOS: MAX_PHOTOS
  };
})(typeof window !== "undefined" ? window : globalThis);
