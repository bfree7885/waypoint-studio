/**
 * Waypoint Scenes — Scene Library engine.
 *
 * List / search / filter / sort over Scenes. Pure enough for unit tests.
 * Persistence is delegated to WaypointSceneStore.
 */
(function (global) {
  "use strict";

  var Models = null;
  var Store = null;
  var ready = false;

  function deps() {
    Models = global.WaypointSceneModels;
    Store = global.WaypointSceneStore;
    if (!Models || !Store) throw new Error("Scene models and store required");
  }

  function init(opts) {
    deps();
    opts = opts || {};
    ready = true;
    if (opts.seedDemo) {
      var Demo = global.WaypointSceneDemo;
      if (Demo && Demo.ensureSeeded) Demo.ensureSeeded();
    }
    return true;
  }

  function isReady() { return ready; }

  function list() {
    deps();
    return Store.loadIndex().slice();
  }

  function get(id) {
    deps();
    return Store.getById(id);
  }

  function save(scene) {
    deps();
    if (!scene) return false;
    scene.photoCount = Array.isArray(scene.photos) ? Math.max(scene.photoCount || 0, scene.photos.length) : (scene.photoCount || 0);
    scene.exifSummary = Models.summarizeExif(scene);
    return Store.upsert(scene);
  }

  function remove(id) {
    deps();
    return Store.remove(id);
  }

  function touchOpened(id) {
    var scene = get(id);
    if (!scene) return null;
    scene.lastOpenedAt = new Date().toISOString();
    save(scene);
    return scene;
  }

  function setFavoriteImage(sceneId, photoId) {
    var scene = get(sceneId);
    if (!scene) return null;
    scene.favoriteImageId = photoId || null;
    scene.photos.forEach(function (p) {
      p.favorite = p.id === photoId;
    });
    save(scene);
    return scene;
  }

  function updatePhoto(sceneId, photoId, patch) {
    var scene = get(sceneId);
    if (!scene) return null;
    var photo = Models.findPhoto(scene, photoId);
    if (!photo) return null;
    patch = patch || {};
    Object.keys(patch).forEach(function (k) {
      if (k === "id" || k === "camera") return;
      photo[k] = patch[k];
    });
    if (patch.camera) {
      Object.keys(patch.camera).forEach(function (k) {
        photo.camera[k] = patch.camera[k];
      });
    }
    if (patch.favorite === true) scene.favoriteImageId = photoId;
    save(scene);
    return { scene: scene, photo: photo };
  }

  function haystack(scene) {
    var parts = [
      scene.title,
      scene.location,
      scene.camera,
      scene.lens,
      scene.notes,
      scene.captureDate,
      scene.createdDate,
      (scene.tags || []).join(" "),
      (scene.storageLocations || []).join(" "),
      scene.importSource
    ];
    (scene.photos || []).forEach(function (p) {
      parts.push(p.filename);
      if (p.camera) {
        parts.push(p.camera.make, p.camera.model, p.camera.lens);
      }
      if (p.subjectHints) parts.push(p.subjectHints.join(" "));
      if (p.notes) parts.push(p.notes);
    });
    return parts.filter(Boolean).join(" ").toLowerCase();
  }

  /**
   * Search + filter + sort. Options:
   *   q            string
   *   sort         recent | alpha | capture | camera | location | favorites
   *   favoriteOnly boolean
   *   camera       string
   *   location     string
   *   status       string
   */
  function query(opts) {
    deps();
    opts = opts || {};
    var q = (opts.q || "").trim().toLowerCase();
    var sort = opts.sort || "recent";
    var list = Store.loadIndex().slice();

    if (q) {
      list = list.filter(function (s) { return haystack(s).indexOf(q) >= 0; });
    }
    if (opts.favoriteOnly) {
      list = list.filter(function (s) { return !!s.favoriteImageId; });
    }
    if (opts.camera) {
      var cam = String(opts.camera).toLowerCase();
      list = list.filter(function (s) {
        return (s.camera || "").toLowerCase().indexOf(cam) >= 0;
      });
    }
    if (opts.location) {
      var loc = String(opts.location).toLowerCase();
      list = list.filter(function (s) {
        return (s.location || "").toLowerCase().indexOf(loc) >= 0;
      });
    }
    if (opts.status) {
      list = list.filter(function (s) { return s.status === opts.status; });
    }

    function dateVal(iso) {
      if (!iso) return 0;
      var t = Date.parse(iso);
      return isNaN(t) ? 0 : t;
    }

    list.sort(function (a, b) {
      switch (sort) {
        case "alpha":
          return String(a.title || "").localeCompare(String(b.title || ""));
        case "capture":
          return dateVal(b.captureDate) - dateVal(a.captureDate);
        case "camera":
          return String(a.camera || "").localeCompare(String(b.camera || ""));
        case "location":
          return String(a.location || "").localeCompare(String(b.location || ""));
        case "favorites":
          return (b.favoriteImageId ? 1 : 0) - (a.favoriteImageId ? 1 : 0) ||
            dateVal(b.lastOpenedAt || b.createdDate) - dateVal(a.lastOpenedAt || a.createdDate);
        case "recent":
        default:
          return dateVal(b.lastOpenedAt || b.createdDate) - dateVal(a.lastOpenedAt || a.createdDate);
      }
    });

    return list;
  }

  function buildShootSummary(sceneId) {
    deps();
    var scene = typeof sceneId === "string" ? get(sceneId) : sceneId;
    if (!scene) return null;
    return Models.buildShootSummary(scene);
  }

  global.WaypointSceneEngine = {
    init: init,
    isReady: isReady,
    list: list,
    get: get,
    save: save,
    remove: remove,
    touchOpened: touchOpened,
    setFavoriteImage: setFavoriteImage,
    updatePhoto: updatePhoto,
    query: query,
    buildShootSummary: buildShootSummary
  };
})(typeof window !== "undefined" ? window : globalThis);
