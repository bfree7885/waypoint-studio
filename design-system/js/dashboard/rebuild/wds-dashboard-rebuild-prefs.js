/**
 * Dashboard Rebuild — local-first layout / widget preferences (Phase 3).
 * Extends waypoint-dashboard-rebuild-prefs-v1 carefully (favorites, grid columns).
 * Authority: docs/rebuild-2026/03-dashboard-architecture.md
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "waypoint-dashboard-rebuild-prefs-v1";
  var PRESETS = ["default", "minimal", "kiosk"];
  var COLUMN_OPTIONS = [1, 2, 3];
  /** In-memory customize session — mutations stay here until commit/discard. */
  var draftPrefs = null;

  function clonePrefs(prefs) {
    return normalize(JSON.parse(JSON.stringify(prefs || defaults())));
  }

  function Registry() {
    return global.WDS && global.WDS.dashboardRebuildRegistry;
  }

  function defaults() {
    var reg = Registry();
    var enabled = reg && reg.defaultVisibleIds ? reg.defaultVisibleIds() : [];
    var order = reg && reg.defaultOrderIds ? reg.defaultOrderIds() : enabled.slice();
    var sizes = {};
    if (reg && reg.all) {
      reg.all().forEach(function (w) {
        sizes[w.id] = reg.normalizeSize ? reg.normalizeSize(w.size) : w.size || "standard";
      });
    }
    return {
      version: 1,
      enabled: enabled.slice(),
      order: order.slice(),
      sizes: sizes,
      favorites: [],
      gridColumns: 3,
      preset: "default",
      kioskRefreshMs: 5 * 60 * 1000
    };
  }

  function allIds() {
    var reg = Registry();
    return reg && reg.all
      ? reg.all().map(function (w) {
          return w.id;
        })
      : [];
  }

  function normalizeOrder(order, ids) {
    var seen = Object.create(null);
    var next = [];
    (order || []).forEach(function (id) {
      if (seen[id] || ids.indexOf(id) < 0) return;
      seen[id] = true;
      next.push(id);
    });
    ids.forEach(function (id) {
      if (!seen[id]) next.push(id);
    });
    return next;
  }

  function normalizeFavorites(favorites, ids) {
    var seen = Object.create(null);
    var next = [];
    (favorites || []).forEach(function (id) {
      if (seen[id] || ids.indexOf(id) < 0) return;
      seen[id] = true;
      next.push(id);
    });
    return next;
  }

  function normalizeColumns(raw) {
    var n = Number(raw);
    return COLUMN_OPTIONS.indexOf(n) >= 0 ? n : 3;
  }

  function normalize(prefs) {
    var base = defaults();
    var ids = allIds();
    prefs = prefs || {};
    var enabled = Array.isArray(prefs.enabled)
      ? prefs.enabled.filter(function (id) {
          return ids.indexOf(id) >= 0;
        })
      : base.enabled;
    if (!enabled.length && base.enabled.length) enabled = base.enabled.slice();
    var order = normalizeOrder(prefs.order || base.order, ids);
    var sizes = {};
    var reg = Registry();
    ids.forEach(function (id) {
      var raw = prefs.sizes && prefs.sizes[id];
      var fallback = (base.sizes && base.sizes[id]) || "standard";
      sizes[id] = reg && reg.normalizeSize ? reg.normalizeSize(raw || fallback) : raw || fallback;
    });
    var preset = PRESETS.indexOf(prefs.preset) >= 0 ? prefs.preset : "default";
    var refresh = Number(prefs.kioskRefreshMs);
    if (!isFinite(refresh) || refresh < 60000) refresh = base.kioskRefreshMs;
    return {
      version: 1,
      enabled: enabled,
      order: order,
      sizes: sizes,
      favorites: normalizeFavorites(prefs.favorites, ids),
      gridColumns: normalizeColumns(
        prefs.gridColumns != null ? prefs.gridColumns : base.gridColumns
      ),
      preset: preset,
      kioskRefreshMs: refresh
    };
  }

  function loadFromStorage() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults();
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1) return defaults();
      return normalize(parsed);
    } catch (e) {
      return defaults();
    }
  }

  function load() {
    if (draftPrefs) return clonePrefs(draftPrefs);
    return loadFromStorage();
  }

  function persist(prefs) {
    var next = normalize(prefs);
    try {
      if (global.localStorage) {
        global.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
    } catch (e) {
      /* quota / private mode — keep in-memory only */
    }
    try {
      global.dispatchEvent(
        new CustomEvent("wds:dashboard-rebuild-prefs", { detail: next })
      );
    } catch (e2) {
      /* noop */
    }
    return next;
  }

  function save(prefs) {
    var next = normalize(prefs);
    if (draftPrefs) {
      draftPrefs = next;
      try {
        global.dispatchEvent(
          new CustomEvent("wds:dashboard-rebuild-prefs", { detail: next })
        );
      } catch (e) {
        /* noop */
      }
      return clonePrefs(next);
    }
    return persist(next);
  }

  function isDrafting() {
    return !!draftPrefs;
  }

  function beginDraft() {
    draftPrefs = clonePrefs(loadFromStorage());
    return clonePrefs(draftPrefs);
  }

  function commitDraft() {
    if (!draftPrefs) return loadFromStorage();
    var next = persist(draftPrefs);
    draftPrefs = null;
    return next;
  }

  function discardDraft() {
    draftPrefs = null;
    return loadFromStorage();
  }

  function reset() {
    try {
      if (global.localStorage) global.localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      /* noop */
    }
    var next = defaults();
    if (draftPrefs) {
      draftPrefs = next;
      try {
        global.dispatchEvent(
          new CustomEvent("wds:dashboard-rebuild-prefs", { detail: next })
        );
      } catch (e2) {
        /* noop */
      }
      return clonePrefs(next);
    }
    return persist(next);
  }

  function applyPreset(presetId) {
    var prefs = load();
    var reg = Registry();
    var all = reg && reg.all ? reg.all() : [];
    if (presetId === "minimal") {
      prefs.enabled = all
        .filter(function (w) {
          return w.id === "ph-conditions" || w.id === "ph-next-hours" || w.id === "ph-light";
        })
        .map(function (w) {
          return w.id;
        });
      prefs.favorites = prefs.favorites.filter(function (id) {
        return prefs.enabled.indexOf(id) >= 0;
      });
      prefs.preset = "minimal";
    } else if (presetId === "kiosk") {
      prefs.enabled =
        reg && reg.kioskEligibleIds
          ? reg.kioskEligibleIds().filter(function (id) {
              var w = reg.get(id);
              return w && w.defaultVisible;
            })
          : prefs.enabled;
      prefs.preset = "kiosk";
    } else {
      prefs = defaults();
      prefs.preset = "default";
    }
    return save(prefs);
  }

  function visibleOrdered(prefs) {
    prefs = normalize(prefs || load());
    var enabled = Object.create(null);
    prefs.enabled.forEach(function (id) {
      enabled[id] = true;
    });
    var fav = Object.create(null);
    (prefs.favorites || []).forEach(function (id) {
      fav[id] = true;
    });
    var ordered = prefs.order.filter(function (id) {
      return enabled[id];
    });
    var tops = [];
    var rest = [];
    ordered.forEach(function (id) {
      if (fav[id]) tops.push(id);
      else rest.push(id);
    });
    return tops.concat(rest);
  }

  function setEnabled(id, on) {
    var prefs = load();
    var ids = allIds();
    if (ids.indexOf(id) < 0) return prefs;
    var idx = prefs.enabled.indexOf(id);
    if (on && idx < 0) prefs.enabled.push(id);
    if (!on && idx >= 0) prefs.enabled.splice(idx, 1);
    return save(prefs);
  }

  function setSize(id, size) {
    var prefs = load();
    if (prefs.order.indexOf(id) < 0 && allIds().indexOf(id) < 0) return prefs;
    var reg = Registry();
    prefs.sizes[id] = reg && reg.normalizeSize ? reg.normalizeSize(size) : size;
    return save(prefs);
  }

  function move(id, direction) {
    var prefs = load();
    var order = prefs.order.slice();
    var i = order.indexOf(id);
    if (i < 0) return prefs;
    var j = direction < 0 ? i - 1 : i + 1;
    if (j < 0 || j >= order.length) return prefs;
    var tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
    prefs.order = order;
    return save(prefs);
  }

  function isFavorite(id, prefs) {
    prefs = prefs || load();
    return (prefs.favorites || []).indexOf(id) >= 0;
  }

  function setFavorite(id, on) {
    var prefs = load();
    var ids = allIds();
    if (ids.indexOf(id) < 0) return prefs;
    var idx = prefs.favorites.indexOf(id);
    if (on) {
      if (idx < 0) prefs.favorites.push(id);
      if (prefs.enabled.indexOf(id) < 0) prefs.enabled.push(id);
    } else if (idx >= 0) {
      prefs.favorites.splice(idx, 1);
    }
    return save(prefs);
  }

  function toggleFavorite(id) {
    return setFavorite(id, !isFavorite(id));
  }

  function setGridColumns(columns) {
    var prefs = load();
    prefs.gridColumns = normalizeColumns(columns);
    return save(prefs);
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildPrefs = {
    version: "3.1.0-mobile-customize",
    storageKey: STORAGE_KEY,
    presets: PRESETS.slice(),
    columnOptions: COLUMN_OPTIONS.slice(),
    defaults: defaults,
    load: load,
    save: save,
    reset: reset,
    normalize: normalize,
    applyPreset: applyPreset,
    visibleOrdered: visibleOrdered,
    setEnabled: setEnabled,
    setSize: setSize,
    move: move,
    isFavorite: isFavorite,
    setFavorite: setFavorite,
    toggleFavorite: toggleFavorite,
    setGridColumns: setGridColumns,
    isDrafting: isDrafting,
    beginDraft: beginDraft,
    commitDraft: commitDraft,
    discardDraft: discardDraft,
    loadFromStorage: loadFromStorage
  };
})(typeof window !== "undefined" ? window : global);
