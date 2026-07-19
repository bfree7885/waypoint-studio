/**
 * SignalTerrain shared technology inventory — local-first.
 * Reusable by Cyber Advisor and future RF/SDR modules. Manual entry in V1;
 * automated discovery is a documented expansion point only.
 */
(function (global) {
  "use strict";

  var STORE_KEY = "st_inventory_v1";

  var CATEGORIES = [
    "operating-system",
    "browser",
    "programming-language",
    "database",
    "virtualization",
    "container",
    "router",
    "firewall",
    "nas",
    "cloud-provider",
    "developer-tool",
    "application",
    "framework",
    "other"
  ];

  function storage() {
    try {
      return global.localStorage;
    } catch (e) {
      return null;
    }
  }

  function readDoc() {
    var s = storage();
    if (!s) return { items: [], updatedAt: null };
    try {
      var raw = s.getItem(STORE_KEY);
      if (!raw) return { items: [], updatedAt: null };
      return JSON.parse(raw);
    } catch (e) {
      return { items: [], updatedAt: null };
    }
  }

  function writeDoc(doc) {
    var s = storage();
    if (!s) return false;
    doc.updatedAt = new Date().toISOString();
    s.setItem(STORE_KEY, JSON.stringify(doc));
    return true;
  }

  function list() {
    return (readDoc().items || []).slice();
  }

  function get(id) {
    return (
      list().filter(function (it) {
        return it.id === id;
      })[0] || null
    );
  }

  function upsert(item) {
    if (!item || !item.id || !item.name || !item.category) {
      throw new Error("inventory item requires id, name, category");
    }
    if (CATEGORIES.indexOf(item.category) === -1) {
      throw new Error("unknown inventory category: " + item.category);
    }
    var doc = readDoc();
    var items = doc.items || [];
    var found = false;
    var next = Object.assign(
      {
        version: null,
        tags: [],
        importance: "normal",
        criticality: "moderate",
        linkedEntityId: null,
        discovery: "manual",
        ownerNotes: "",
        vendor: null,
        internetFacing: false,
        disabled: false,
        updatedAt: new Date().toISOString()
      },
      item,
      { updatedAt: new Date().toISOString() }
    );
    items = items.map(function (it) {
      if (it.id === item.id) {
        found = true;
        return Object.assign({}, it, next);
      }
      return it;
    });
    if (!found) items.push(next);
    doc.items = items;
    writeDoc(doc);
    return get(item.id);
  }

  function remove(id) {
    var doc = readDoc();
    doc.items = (doc.items || []).filter(function (it) {
      return it.id !== id;
    });
    writeDoc(doc);
    return true;
  }

  function loadSample(items) {
    var doc = { items: (items || []).slice(), updatedAt: new Date().toISOString() };
    writeDoc(doc);
    return list();
  }

  function clear() {
    writeDoc({ items: [], updatedAt: new Date().toISOString() });
  }

  /**
   * Match inventory row to a cyber (or other) entity by linked id or fuzzy name/alias/tags.
   * Returns transparent match metadata — never a mysterious score.
   */
  function matchEntity(item, entity) {
    if (!item || !entity) {
      return { status: "unknown", method: "none", confidence: "insufficient", reasons: [] };
    }
    if (item.linkedEntityId && item.linkedEntityId === entity.id) {
      return {
        status: "matched",
        method: "linkedEntityId",
        confidence: "high",
        reasons: ["Inventory explicitly links to " + entity.id]
      };
    }
    var name = String(item.name || "").toLowerCase();
    var title = String(entity.title || "").toLowerCase();
    var aliases = (entity.aliases || []).map(function (a) {
      return String(a).toLowerCase();
    });
    var tags = (item.tags || []).map(function (t) {
      return String(t).toLowerCase();
    });
    if (name && title && (title.indexOf(name) >= 0 || name.indexOf(title) >= 0)) {
      return {
        status: "possible",
        method: "name-overlap",
        confidence: "moderate",
        reasons: ["Name overlap between inventory “" + item.name + "” and entity “" + entity.title + "”"]
      };
    }
    for (var i = 0; i < aliases.length; i++) {
      if (aliases[i] && (name.indexOf(aliases[i]) >= 0 || tags.indexOf(aliases[i]) >= 0)) {
        return {
          status: "possible",
          method: "alias-tag",
          confidence: "moderate",
          reasons: ["Alias/tag overlap: " + aliases[i]]
        };
      }
    }
    for (var j = 0; j < tags.length; j++) {
      if (title.indexOf(tags[j]) >= 0) {
        return {
          status: "possible",
          method: "tag-in-title",
          confidence: "low",
          reasons: ["Tag “" + tags[j] + "” appears in entity title — weak signal"]
        };
      }
    }
    return {
      status: "unlikely",
      method: "no-overlap",
      confidence: "low",
      reasons: ["No linked id, name, alias, or tag overlap found"]
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.signalTerrainInventory = {
    CATEGORIES: CATEGORIES,
    STORE_KEY: STORE_KEY,
    list: list,
    get: get,
    upsert: upsert,
    remove: remove,
    loadSample: loadSample,
    clear: clear,
    matchEntity: matchEntity
  };
})(typeof window !== "undefined" ? window : globalThis);
