/**
 * Waypoint Moving Scenes — recipe + Library derivative persistence
 */
(function (global) {
  "use strict";

  var RECIPE_KEY = "waypoint-moving-scenes-recipes-v1";
  var MAX_RECIPES = 400;

  function Models() { return global.WaypointMovingScenesModels; }
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
      return { ok: false, error: "Could not save motion recipes (storage full or blocked)." };
    }
  }

  function upsertRecipe(recipe) {
    var M = Models();
    var row = M.createRecipe(recipe);
    var list = readRecipes().filter(function (r) {
      return r.id !== row.id;
    });
    list.unshift(row);
    return { recipe: row, persist: writeRecipes(list) };
  }

  function getLatestForOriginal(originalAssetId) {
    return readRecipes().find(function (r) { return r.originalAssetId === originalAssetId; }) || null;
  }

  /**
   * Persist moving derivative blob + link on original Library row.
   * Never overwrites ORIGINAL or WAYPOINT EDIT keys.
   */
  function persistMoving(originalAssetId, movingBlob, recipe, meta) {
    meta = meta || {};
    var M = Models();
    var store = LibStore();
    var engine = LibEngine();
    if (!originalAssetId) {
      return Promise.reject(new Error("originalAssetId is required."));
    }
    if (!store) {
      return Promise.reject(new Error("Photo Library storage is not available."));
    }

    var version = meta.version || 1;
    var blobKey = M.movingBlobKey(originalAssetId, version);
    var ready = engine && !engine.isReady() ? engine.init() : Promise.resolve();

    return ready.then(function () {
      var movingAssetId = meta.movingAssetId;
      if (!movingAssetId && engine) {
        var originalEarly = engine.get(originalAssetId);
        var linked = originalEarly && originalEarly.moduleRefs && originalEarly.moduleRefs.movingScenes;
        if (linked && linked.assetId) movingAssetId = linked.assetId;
        if (!movingAssetId && engine.list) {
          var existingSibling = engine.list().find(function (img) {
            return img.role === "moving-scene" && img.originalAssetId === originalAssetId;
          }) || null;
          if (existingSibling) movingAssetId = existingSibling.id;
        }
      }
      if (!movingAssetId) movingAssetId = M.uuid("moving");
      return store.putMedia(blobKey, movingBlob, "moving-scene").then(function () {
        var saved = upsertRecipe(Object.assign({}, recipe, {
          originalAssetId: originalAssetId,
          movingAssetId: movingAssetId
        }));

        if (!engine) {
          return {
            recipe: saved.recipe,
            blobKey: blobKey,
            movingAssetId: movingAssetId,
            persist: saved.persist
          };
        }

        var original = engine.get(originalAssetId);
        if (!original) {
          return {
            recipe: saved.recipe,
            blobKey: blobKey,
            movingAssetId: movingAssetId,
            persist: saved.persist,
            warning: "Original not found in Library; motion blob saved with recipe only."
          };
        }

        var movingRef = Object.assign(M.emptyMovingModuleRef(), {
          created: true,
          assetId: movingAssetId,
          blobKey: blobKey,
          recipeId: saved.recipe.id,
          sourceAssetId: saved.recipe.sourceAssetId,
          sourceRole: saved.recipe.sourceRole,
          classes: saved.recipe.classes,
          durationSec: saved.recipe.durationSec,
          strength: saved.recipe.strength,
          confidence: saved.recipe.confidence,
          noMotion: !!saved.recipe.noMotion,
          createdAt: saved.recipe.createdAt,
          engineVersion: saved.recipe.engineVersion
        });

        // Keep legacy livingScenes key in sync for older filters
        var living = Object.assign({}, (original.moduleRefs && original.moduleRefs.livingScenes) || {}, {
          created: true,
          assetId: movingAssetId
        });

        engine.updateImage(originalAssetId, {
          moduleRefs: {
            movingScenes: movingRef,
            livingScenes: living
          }
        });

        var ModelsLib = global.WaypointPhotoLibraryModels;
        if (ModelsLib && engine.upsertImage) {
          var row = ModelsLib.createLibraryImage({
            id: movingAssetId,
            role: "moving-scene",
            originalAssetId: originalAssetId,
            filename: M.movingFilename(original.filename, meta.ext || "webm"),
            originalFilename: original.originalFilename || original.filename,
            mimeType: movingBlob.type || "video/webm",
            byteSize: movingBlob.size,
            captureDate: original.captureDate,
            camera: original.camera,
            gps: { lat: null, lon: null, accuracyM: null },
            width: meta.width || null,
            height: meta.height || null,
            selectionLabel: original.selectionLabel,
            favorite: !!original.favorite,
            source: "moving-scenes",
            media: {
              hasOriginal: true,
              hasThumbnail: !!meta.posterBlob,
              originalBlobKey: blobKey,
              thumbnailDataUrl: null
            },
            moduleRefs: {
              movingScenes: movingRef,
              livingScenes: living,
              photoCoach: original.moduleRefs && original.moduleRefs.photoCoach,
              autoEdit: original.moduleRefs && original.moduleRefs.autoEdit,
              hiddenLandscapes: original.moduleRefs && original.moduleRefs.hiddenLandscapes,
              sceneBuilder: original.moduleRefs && original.moduleRefs.sceneBuilder
            }
          });
          row.role = "moving-scene";
          row.originalAssetId = originalAssetId;
          engine.upsertImage(row);

          if (meta.posterBlob && store.putMedia) {
            var posterKey = blobKey + "-poster";
            store.putMedia(posterKey, meta.posterBlob, "moving-poster").catch(function () { /* ignore */ });
          }
        }

        return {
          recipe: saved.recipe,
          blobKey: blobKey,
          movingAssetId: movingAssetId,
          persist: saved.persist,
          warning: saved.persist.ok ? null : saved.persist.error
        };
      });
    });
  }

  function loadMovingBlob(blobKey) {
    var store = LibStore();
    if (!store) return Promise.resolve(null);
    return store.getMedia(blobKey).then(function (row) {
      return row && row.blob ? row.blob : null;
    });
  }

  global.WaypointMovingScenesStore = {
    RECIPE_KEY: RECIPE_KEY,
    readRecipes: readRecipes,
    upsertRecipe: upsertRecipe,
    getLatestForOriginal: getLatestForOriginal,
    persistMoving: persistMoving,
    loadMovingBlob: loadMovingBlob
  };
})(typeof window !== "undefined" ? window : globalThis);
