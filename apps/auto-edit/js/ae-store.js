/**
 * Waypoint Auto Edit — recipe persistence + Library linkage
 */
(function (global) {
  "use strict";

  var RECIPE_KEY = "waypoint-auto-edit-recipes-v1";
  var MAX_RECIPES = 500;

  function Models() { return global.WaypointAutoEditModels; }
  function LibStore() { return global.WaypointPhotoLibraryStore; }
  function LibEngine() {
    return global.WaypointPhotoLibraryEngine ? global.WaypointPhotoLibraryEngine.get() : null;
  }

  function readRecipes() {
    try {
      var raw = global.localStorage.getItem(RECIPE_KEY);
      if (!raw) return [];
      var list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function writeRecipes(list) {
    try {
      global.localStorage.setItem(RECIPE_KEY, JSON.stringify((list || []).slice(0, MAX_RECIPES)));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: "Could not save edit recipes (storage full or blocked)." };
    }
  }

  function upsertRecipe(recipe) {
    var M = Models();
    var row = M.createRecipe(recipe);
    var list = readRecipes().filter(function (r) {
      if (r.id === row.id) return false;
      if (r.originalAssetId && row.originalAssetId &&
          r.originalAssetId === row.originalAssetId &&
          r.editVersion === row.editVersion) return false;
      return true;
    });
    list.unshift(row);
    return { recipe: row, persist: writeRecipes(list) };
  }

  function getRecipe(id) {
    return readRecipes().find(function (r) { return r.id === id; }) || null;
  }

  function getLatestForOriginal(originalAssetId) {
    return readRecipes().find(function (r) { return r.originalAssetId === originalAssetId; }) || null;
  }

  function persistEdit(originalAssetId, editedBlob, recipe, meta) {
    meta = meta || {};
    var M = Models();
    var store = LibStore();
    var engine = LibEngine();
    if (!originalAssetId) {
      return Promise.reject(new Error("originalAssetId is required to link an edit."));
    }
    if (!store) {
      return Promise.reject(new Error("Photo Library storage is not available."));
    }

    var version = (recipe && recipe.editVersion) || 1;
    var blobKey = M.editBlobKey(originalAssetId, version);
    var ready = engine && !engine.isReady() ? engine.init() : Promise.resolve();

    return ready.then(function () {
      var existingSibling = null;
      if (engine) {
        existingSibling = engine.list().find(function (img) {
          return img.role === "waypoint-edit" && img.originalAssetId === originalAssetId;
        }) || null;
      }
      var editAssetId = meta.editAssetId || (existingSibling && existingSibling.id) || M.uuid("edit");

      return store.putMedia(blobKey, editedBlob, "waypoint-edit").then(function () {
        var saved = upsertRecipe(Object.assign({}, recipe, {
          originalAssetId: originalAssetId,
          editAssetId: editAssetId,
          editVersion: version
        }));

        function linkLibrary() {
          if (!engine) {
            return { recipe: saved.recipe, editBlobKey: blobKey, editAssetId: editAssetId, persist: saved.persist };
          }
          var original = engine.get(originalAssetId);
          if (!original) {
            return {
              recipe: saved.recipe,
              editBlobKey: blobKey,
              editAssetId: editAssetId,
              persist: saved.persist,
              warning: "Original was not found in Photo Library; edit blob saved with recipe only."
            };
          }

          var autoEdit = Object.assign(M.emptyAutoEditModuleRef(), {
            hasEdit: true,
            editAssetId: editAssetId,
            editBlobKey: blobKey,
            recipeId: saved.recipe.id,
            editVersion: version,
            intent: saved.recipe.intent,
            createdAt: saved.recipe.createdAt,
            engineVersion: saved.recipe.engineVersion
          });

          engine.updateImage(originalAssetId, {
            moduleRefs: { autoEdit: autoEdit }
          });

          var ModelsLib = global.WaypointPhotoLibraryModels;
          if (ModelsLib && engine.upsertImage) {
            var editRow = ModelsLib.createLibraryImage({
              id: editAssetId,
              role: "waypoint-edit",
              originalAssetId: originalAssetId,
              filename: M.waypointFilename(original.filename),
              originalFilename: original.originalFilename || original.filename,
              mimeType: "image/jpeg",
              byteSize: editedBlob.size,
              captureDate: original.captureDate,
              camera: original.camera,
              // GPS omitted on edit sibling — originals keep GPS; export does not embed GPS
              gps: { lat: null, lon: null, accuracyM: null },
              width: meta.width || null,
              height: meta.height || null,
              selectionLabel: original.selectionLabel,
              favorite: !!original.favorite,
              source: "auto-edit",
              media: {
                hasOriginal: true,
                hasThumbnail: false,
                originalBlobKey: blobKey
              },
              moduleRefs: {
                autoEdit: autoEdit,
                photoCoach: original.moduleRefs && original.moduleRefs.photoCoach,
                hiddenLandscapes: original.moduleRefs && original.moduleRefs.hiddenLandscapes,
                livingScenes: original.moduleRefs && original.moduleRefs.livingScenes,
                movingScenes: original.moduleRefs && original.moduleRefs.movingScenes,
                sceneBuilder: original.moduleRefs && original.moduleRefs.sceneBuilder
              }
            });
            editRow.role = "waypoint-edit";
            editRow.originalAssetId = originalAssetId;
            engine.upsertImage(editRow);
          }

          return {
            recipe: saved.recipe,
            editBlobKey: blobKey,
            editAssetId: editAssetId,
            persist: saved.persist,
            warning: saved.persist.ok ? null : saved.persist.error
          };
        }

        return linkLibrary();
      });
    });
  }

  function loadEditBlob(editBlobKey) {
    var store = LibStore();
    if (!store) return Promise.resolve(null);
    return store.getMedia(editBlobKey).then(function (row) {
      return row && row.blob ? row.blob : null;
    });
  }

  global.WaypointAutoEditStore = {
    RECIPE_KEY: RECIPE_KEY,
    readRecipes: readRecipes,
    upsertRecipe: upsertRecipe,
    getRecipe: getRecipe,
    getLatestForOriginal: getLatestForOriginal,
    persistEdit: persistEdit,
    loadEditBlob: loadEditBlob
  };
})(typeof window !== "undefined" ? window : globalThis);
