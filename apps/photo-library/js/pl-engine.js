/**
 * WaypointPhotoLibraryEngine — import, search, filter, collections, module lookups
 */
(function (global) {
  "use strict";

  var SUBJECT_FILTERS = [
    "landscape",
    "wildlife",
    "plants",
    "fungi",
    "water",
    "macro",
    "portrait"
  ];

  function Models() { return global.WaypointPhotoLibraryModels; }
  function Store() { return global.WaypointPhotoLibraryStore; }

  function fingerprint(file) {
    if (!file) return "";
    return [file.name || "", file.size != null ? file.size : "", file.lastModified != null ? file.lastModified : ""].join("::");
  }

  function readImageDims(blobOrUrl) {
    return new Promise(function (resolve) {
      var url = typeof blobOrUrl === "string" ? blobOrUrl : URL.createObjectURL(blobOrUrl);
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth || img.width;
        var h = img.naturalHeight || img.height;
        if (typeof blobOrUrl !== "string") {
          try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
        }
        resolve({ width: w, height: h, aspectRatio: h ? Math.round((w / h) * 1000) / 1000 : null });
      };
      img.onerror = function () {
        if (typeof blobOrUrl !== "string") {
          try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
        }
        resolve({ width: null, height: null, aspectRatio: null });
      };
      img.src = url;
    });
  }

  function makeThumb(blob, maxEdge) {
    maxEdge = maxEdge || 320;
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () {
        try {
          var scale = maxEdge / Math.max(img.naturalWidth, img.naturalHeight);
          var canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          var dataUrl = canvas.toDataURL("image/jpeg", 0.72);
          URL.revokeObjectURL(url);
          resolve(dataUrl);
        } catch (e) {
          URL.revokeObjectURL(url);
          resolve(null);
        }
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  }

  function dataUrlToBlob(dataUrl) {
    if (!dataUrl || dataUrl.indexOf("data:") !== 0) return null;
    try {
      var parts = dataUrl.split(",");
      var mime = (parts[0].match(/:(.*?);/) || [])[1] || "image/jpeg";
      var bin = atob(parts[1]);
      var arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return new Blob([arr], { type: mime });
    } catch (e) {
      return null;
    }
  }

  function createEngine() {
    var images = [];
    var collections = [];
    var ready = false;
    var lastPersistError = null;

    function persist() {
      var ok = Store().saveIndex(images);
      Store().saveCollections(collections);
      if (!ok) {
        lastPersistError = "Could not save the library index (browser storage full or blocked). In-session changes may be lost if you close this tab.";
      } else {
        lastPersistError = null;
      }
      return ok;
    }

    function byId(id) {
      for (var i = 0; i < images.length; i++) {
        if (images[i].id === id) return images[i];
      }
      return null;
    }

    function collectionById(id) {
      for (var i = 0; i < collections.length; i++) {
        if (collections[i].id === id) return collections[i];
      }
      return null;
    }

    function init() {
      images = Store().loadIndex();
      collections = Store().loadCollections();
      ready = true;
      return Promise.resolve(migrateFromLegacy().then(function (report) {
        return { imageCount: images.length, collectionCount: collections.length, migration: report };
      }));
    }

    function migrateFromLegacy() {
      var meta = Store().loadMeta();
      if (meta.migrationVersion >= 1) {
        return Promise.resolve({ skipped: true, version: meta.migrationVersion });
      }
      var added = 0;
      var M = Models();

      // Portfolio sessions → library rows (thumbnails only)
      try {
        var sessionsRaw = global.localStorage.getItem("waypoint-photo-coach-sessions-v1");
        var sessions = sessionsRaw ? JSON.parse(sessionsRaw) : [];
        (sessions || []).forEach(function (sess) {
          if (!sess || !sess.id) return;
          var exists = images.some(function (img) {
            return img.legacy && img.legacy.portfolioSessionId === sess.id;
          });
          if (exists) return;
          var cam = sess.camera || {};
          var image = M.createLibraryImage({
            filename: sess.imageName || "photo.jpg",
            originalFilename: sess.imageName || "photo.jpg",
            importDate: sess.savedAt || new Date().toISOString(),
            captureDate: (sess.exif && (sess.exif.dateTimeOriginal || sess.exif.dateTime)) || null,
            camera: {
              make: cam.make || (sess.exif && sess.exif.make) || null,
              model: cam.model || (sess.exif && sess.exif.model) || null,
              lens: cam.lens || (sess.exif && (sess.exif.lens || sess.exif.lensModel)) || null,
              focalLengthMm: (sess.exif && sess.exif.focalLengthMm) || null,
              fNumber: (sess.exif && sess.exif.fNumber) || null,
              iso: (sess.exif && sess.exif.iso) || null,
              exposureTimeSec: (sess.exif && sess.exif.exposureTimeSec) || null
            },
            favorite: !!sess.favorite,
            selectionLabel: null,
            thumbnailDataUrl: sess.thumbnail || null,
            hasThumbnail: !!sess.thumbnail,
            source: "migration-portfolio",
            legacy: { portfolioSessionId: sess.id },
            moduleRefs: {
              photoCoach: {
                analysisStatus: sess.critique ? "analyzed" : "not-analyzed",
                portfolioSessionId: sess.id,
                analyzedAt: sess.savedAt || null,
                letterGrade: sess.grade || (sess.critique && sess.critique.overallGrade && sess.critique.overallGrade.letter) || null,
                overallScore: sess.score != null ? sess.score : (sess.critique && sess.critique.overallScore) || null
              }
            }
          });
          images.unshift(image);
          added++;
        });
      } catch (e) { /* ignore corrupt legacy */ }

      // Growth PhotoRecords without portfolio match
      try {
        var recordsRaw = global.localStorage.getItem("waypoint-photo-records-v1");
        var records = recordsRaw ? JSON.parse(recordsRaw) : [];
        (records || []).forEach(function (rec) {
          if (!rec || !rec.uuid) return;
          var exists = images.some(function (img) {
            return (img.legacy && img.legacy.photoRecordUuid === rec.uuid) ||
              (rec.portfolioSessionId && img.legacy && img.legacy.portfolioSessionId === rec.portfolioSessionId);
          });
          if (exists) {
            images.forEach(function (img) {
              if (img.legacy && img.legacy.portfolioSessionId === rec.portfolioSessionId) {
                img.legacy.photoRecordUuid = rec.uuid;
                img.moduleRefs.photoCoach.photoRecordId = rec.uuid;
                if (rec.selectionLabel) img.selectionLabel = rec.selectionLabel;
                if (rec.selectionLabel === "favorite") img.favorite = true;
              }
            });
            return;
          }
          var image = M.createLibraryImage({
            filename: rec.originalFilename || "photo.jpg",
            captureDate: rec.captureDateTime || null,
            importDate: rec.analyzedAt || new Date().toISOString(),
            camera: rec.camera || {},
            gps: rec.location && rec.location.lat != null
              ? { lat: rec.location.lat, lon: rec.location.lng }
              : {},
            selectionLabel: rec.selectionLabel || null,
            favorite: rec.selectionLabel === "favorite",
            subjectHints: rec.subjectCategories || [],
            thumbnailDataUrl: rec.thumbnail || null,
            hasThumbnail: !!rec.thumbnail,
            source: "migration-record",
            legacy: { photoRecordUuid: rec.uuid, portfolioSessionId: rec.portfolioSessionId || null },
            moduleRefs: {
              photoCoach: {
                analysisStatus: rec.aiCritique ? "analyzed" : "not-analyzed",
                photoRecordId: rec.uuid,
                portfolioSessionId: rec.portfolioSessionId || null,
                shootId: rec.shootId || null,
                analyzedAt: rec.analyzedAt || null,
                letterGrade: rec.aiCritique && rec.aiCritique.letterGrade,
                overallScore: rec.overallScore
              }
            }
          });
          images.unshift(image);
          added++;
        });
      } catch (e2) { /* ignore */ }

      persist();
      meta.migrationVersion = 1;
      meta.migratedAt = new Date().toISOString();
      Store().saveMeta(meta);
      return Promise.resolve({ skipped: false, added: added, version: 1 });
    }

    function importFiles(fileList) {
      var files = [];
      for (var i = 0; i < (fileList || []).length; i++) files.push(fileList[i]);
      var results = { imported: [], skippedDuplicates: 0, errors: [] };

      function next(idx) {
        if (idx >= files.length) {
          persist();
          return Promise.resolve(results);
        }
        var file = files[idx];
        if (!file || !file.type || file.type.indexOf("image/") !== 0) {
          results.errors.push({ fileName: file && file.name, message: "Unsupported file type." });
          return next(idx + 1);
        }
        var fp = fingerprint(file);
        if (fp && images.some(function (img) { return img.contentFingerprint === fp; })) {
          results.skippedDuplicates++;
          return next(idx + 1);
        }

        return Promise.resolve()
          .then(function () {
            return makeThumb(file);
          })
          .then(function (thumb) {
            return readImageDims(file).then(function (dims) {
              return { thumb: thumb, dims: dims };
            });
          })
          .then(function (pack) {
            var M = Models();
            var image = M.createLibraryImage({
              filename: file.name,
              originalFilename: file.name,
              mimeType: file.type,
              byteSize: file.size,
              contentFingerprint: fp,
              width: pack.dims.width,
              height: pack.dims.height,
              aspectRatio: pack.dims.aspectRatio,
              orientation: pack.dims.width && pack.dims.height
                ? (pack.dims.width >= pack.dims.height ? "landscape" : "portrait")
                : null,
              thumbnailDataUrl: pack.thumb,
              hasThumbnail: !!pack.thumb,
              hasOriginal: true,
              source: "upload"
            });
            image.media.originalBlobKey = image.id;
            image.media.hasOriginal = true;

            return Store().putMedia(image.id, file, "original").then(function () {
              images.unshift(image);
              results.imported.push(image);
            });
          })
          .catch(function (err) {
            results.errors.push({
              fileName: file.name,
              message: (err && err.message) || "Import failed."
            });
          })
          .then(function () {
            return next(idx + 1);
          });
      }

      return next(0);
    }

    function updateImage(id, patch) {
      var img = byId(id);
      if (!img) return null;
      Object.keys(patch || {}).forEach(function (k) {
        if (k === "id" || k === "schemaVersion") return;
        if (patch[k] === undefined) return;
        if (k === "camera" || k === "gps" || k === "media" || k === "moduleRefs" || k === "legacy") {
          img[k] = Object.assign({}, img[k] || {}, patch[k] || {});
        } else {
          img[k] = patch[k];
        }
      });
      img.updatedAt = new Date().toISOString();
      if (img.selectionLabel === "favorite") img.favorite = true;
      persist();
      return img;
    }

    function deleteImage(id) {
      var img = byId(id);
      if (!img) return Promise.resolve(false);
      images = images.filter(function (row) { return row.id !== id; });
      collections.forEach(function (col) {
        col.imageIds = (col.imageIds || []).filter(function (iid) { return iid !== id; });
        if (col.coverImageId === id) col.coverImageId = col.imageIds[0] || null;
      });
      persist();
      var tasks = [];
      if (img.media && img.media.originalBlobKey) {
        tasks.push(Store().deleteMedia(img.media.originalBlobKey).catch(function () { return false; }));
      }
      return Promise.all(tasks).then(function () { return true; });
    }

    function createCollection(name, description) {
      var col = Models().createCollection({ name: name, description: description || null });
      collections.unshift(col);
      persist();
      return col;
    }

    function updateCollection(id, patch) {
      var col = collectionById(id);
      if (!col) return null;
      if (patch.name != null) col.name = patch.name;
      if (patch.description != null) col.description = patch.description;
      if (patch.coverImageId !== undefined) col.coverImageId = patch.coverImageId;
      col.updatedAt = new Date().toISOString();
      persist();
      return col;
    }

    function deleteCollection(id) {
      collections = collections.filter(function (c) { return c.id !== id; });
      images.forEach(function (img) {
        img.collectionIds = (img.collectionIds || []).filter(function (cid) { return cid !== id; });
      });
      persist();
      return true;
    }

    function addToCollection(collectionId, imageId) {
      var col = collectionById(collectionId);
      var img = byId(imageId);
      if (!col || !img) return false;
      if (col.imageIds.indexOf(imageId) < 0) col.imageIds.push(imageId);
      if ((img.collectionIds || []).indexOf(collectionId) < 0) {
        img.collectionIds = (img.collectionIds || []).concat([collectionId]);
      }
      if (!col.coverImageId) col.coverImageId = imageId;
      col.updatedAt = new Date().toISOString();
      img.updatedAt = new Date().toISOString();
      persist();
      return true;
    }

    function removeFromCollection(collectionId, imageId) {
      var col = collectionById(collectionId);
      var img = byId(imageId);
      if (col) {
        col.imageIds = (col.imageIds || []).filter(function (id) { return id !== imageId; });
        if (col.coverImageId === imageId) col.coverImageId = col.imageIds[0] || null;
        col.updatedAt = new Date().toISOString();
      }
      if (img) {
        img.collectionIds = (img.collectionIds || []).filter(function (id) { return id !== collectionId; });
        img.updatedAt = new Date().toISOString();
      }
      persist();
      return true;
    }

    function addTag(imageId, tag) {
      var img = byId(imageId);
      if (!img) return null;
      var t = Models().normalizeTag(tag);
      if (!t) return img;
      if (img.tags.indexOf(t) < 0) img.tags.push(t);
      img.updatedAt = new Date().toISOString();
      persist();
      return img;
    }

    function removeTag(imageId, tag) {
      var img = byId(imageId);
      if (!img) return null;
      var t = Models().normalizeTag(tag);
      img.tags = (img.tags || []).filter(function (x) { return x !== t; });
      img.updatedAt = new Date().toISOString();
      persist();
      return img;
    }

    function matchesQuery(img, q) {
      if (!q) return true;
      var needle = String(q).toLowerCase().trim();
      if (!needle) return true;
      var hay = [
        img.filename,
        img.originalFilename,
        (img.tags || []).join(" "),
        img.camera && img.camera.make,
        img.camera && img.camera.model,
        img.camera && img.camera.lens,
        (img.subjectHints || []).join(" "),
        img.photographerNotes,
        img.selectionLabel,
        img.favorite ? "favorite" : "",
        (img.collectionIds || []).map(function (cid) {
          var c = collectionById(cid);
          return c ? c.name : "";
        }).join(" ")
      ].join(" ").toLowerCase();
      return hay.indexOf(needle) >= 0;
    }

    function matchesFilters(img, filters) {
      filters = filters || {};
      if (filters.favorite && !img.favorite && img.selectionLabel !== "favorite") return false;
      if (filters.keep && img.selectionLabel !== "keep" && img.selectionLabel !== "favorite") return false;
      if (filters.maybe && img.selectionLabel !== "maybe") return false;
      if (filters.reject && img.selectionLabel !== "reject") return false;
      if (filters.shootId) {
        var sid = img.moduleRefs && img.moduleRefs.photoCoach && img.moduleRefs.photoCoach.shootId;
        if (sid !== filters.shootId) return false;
      }
      if (filters.hasExif) {
        var cam = img.camera || {};
        if (!(cam.make || cam.model || cam.focalLengthMm || cam.iso || img.captureDate)) return false;
      }
      if (filters.analyzed) {
        var st = img.moduleRefs && img.moduleRefs.photoCoach && img.moduleRefs.photoCoach.analysisStatus;
        if (st !== "analyzed") return false;
      }
      if (filters.notAnalyzed) {
        var st2 = img.moduleRefs && img.moduleRefs.photoCoach && img.moduleRefs.photoCoach.analysisStatus;
        if (st2 === "analyzed") return false;
      }
      if (filters.hiddenLandscapes) {
        if (!img.moduleRefs || !img.moduleRefs.hiddenLandscapes || !img.moduleRefs.hiddenLandscapes.available) {
          // Available means "can open in HL" — media present
          if (!(img.media && (img.media.hasOriginal || img.media.hasThumbnail))) return false;
        }
      }
      if (filters.livingScene) {
        if (!img.moduleRefs || !img.moduleRefs.livingScenes || !img.moduleRefs.livingScenes.created) return false;
      }
      if (filters.orientation && img.orientation !== filters.orientation) return false;
      if (filters.collectionId) {
        if ((img.collectionIds || []).indexOf(filters.collectionId) < 0) return false;
      }
      if (filters.subject) {
        var sub = String(filters.subject).toLowerCase();
        var hints = (img.subjectHints || []).join(" ").toLowerCase() + " " + (img.tags || []).join(" ");
        if (hints.indexOf(sub) < 0) return false;
      }
      return true;
    }

    function sortImages(list, sort) {
      var arr = list.slice();
      sort = sort || "import-desc";
      arr.sort(function (a, b) {
        if (sort === "import-asc") {
          return String(a.importDate || "").localeCompare(String(b.importDate || ""));
        }
        if (sort === "capture-desc") {
          return String(b.captureDate || b.importDate || "").localeCompare(String(a.captureDate || a.importDate || ""));
        }
        if (sort === "capture-asc") {
          return String(a.captureDate || a.importDate || "").localeCompare(String(b.captureDate || b.importDate || ""));
        }
        if (sort === "name") {
          return String(a.filename || "").localeCompare(String(b.filename || ""));
        }
        if (sort === "rating") {
          return (b.rating || 0) - (a.rating || 0);
        }
        // import-desc default
        return String(b.importDate || "").localeCompare(String(a.importDate || ""));
      });
      return arr;
    }

    function search(options) {
      options = options || {};
      var filtered = images.filter(function (img) {
        return matchesQuery(img, options.query) && matchesFilters(img, options.filters);
      });
      return sortImages(filtered, options.sort);
    }

    function getOriginalBlob(id) {
      var img = byId(id);
      if (!img) return Promise.resolve(null);
      var key = (img.media && img.media.originalBlobKey) || id;
      return Store().getMedia(key).then(function (row) {
        return row && row.blob ? row.blob : null;
      });
    }

    function getOriginalFile(id) {
      return getOriginalBlob(id).then(function (blob) {
        if (!blob) return null;
        var img = byId(id);
        var name = (img && img.filename) || "photo.jpg";
        var type = (img && img.mimeType) || blob.type || "image/jpeg";
        try {
          return new File([blob], name, { type: type, lastModified: Date.now() });
        } catch (e) {
          // Older browsers
          blob.name = name;
          return blob;
        }
      });
    }

    function linkPhotoCoachResult(libraryId, payload) {
      payload = payload || {};
      return updateImage(libraryId, {
        moduleRefs: {
          photoCoach: {
            analysisStatus: payload.analysisStatus || "analyzed",
            photoRecordId: payload.photoRecordId || null,
            portfolioSessionId: payload.portfolioSessionId || null,
            shootId: payload.shootId || null,
            shootImageId: payload.shootImageId || null,
            analyzedAt: payload.analyzedAt || new Date().toISOString(),
            letterGrade: payload.letterGrade || null,
            overallScore: payload.overallScore != null ? payload.overallScore : null,
            narrativeSummary: payload.narrativeSummary || null,
            confidenceTier: payload.confidenceTier || null
          }
        },
        selectionLabel: payload.selectionLabel !== undefined
          ? payload.selectionLabel
          : (byId(libraryId) && byId(libraryId).selectionLabel),
        favorite: payload.selectionLabel === "favorite"
          ? true
          : (payload.selectionLabel !== undefined
            ? false
            : (payload.favorite !== undefined ? !!payload.favorite : undefined)),
        subjectHints: payload.subjectHints || (byId(libraryId) && byId(libraryId).subjectHints) || [],
        coachSummary: payload.coachSummary || payload.narrativeSummary || null,
        outdoorContext: payload.outdoorContext !== undefined
          ? payload.outdoorContext
          : (byId(libraryId) && byId(libraryId).outdoorContext)
      });
    }

    function markHiddenLandscapes(libraryId, available) {
      return updateImage(libraryId, {
        moduleRefs: {
          hiddenLandscapes: {
            available: available !== false,
            variationIds: (byId(libraryId) && byId(libraryId).moduleRefs.hiddenLandscapes.variationIds) || [],
            lastModeId: null,
            lastExportAt: null
          }
        }
      });
    }

    return {
      id: "PhotoLibraryEngine",
      version: "1.0.0",
      SUBJECT_FILTERS: SUBJECT_FILTERS,
      init: init,
      isReady: function () { return ready; },
      getLastPersistError: function () { return lastPersistError; },
      list: function () { return images.slice(); },
      listShoots: function () {
        var map = Object.create(null);
        images.forEach(function (img) {
          var sid = img.moduleRefs && img.moduleRefs.photoCoach && img.moduleRefs.photoCoach.shootId;
          if (!sid) return;
          if (!map[sid]) {
            map[sid] = { id: sid, imageIds: [], count: 0, analyzedAt: null };
          }
          map[sid].imageIds.push(img.id);
          map[sid].count++;
          var at = img.moduleRefs.photoCoach.analyzedAt;
          if (at && (!map[sid].analyzedAt || at > map[sid].analyzedAt)) map[sid].analyzedAt = at;
        });
        return Object.keys(map).map(function (k) { return map[k]; })
          .sort(function (a, b) { return String(b.analyzedAt || "").localeCompare(String(a.analyzedAt || "")); });
      },
      listCollections: function () { return collections.slice(); },
      get: byId,
      getCollection: collectionById,
      importFiles: importFiles,
      updateImage: updateImage,
      deleteImage: deleteImage,
      createCollection: createCollection,
      updateCollection: updateCollection,
      deleteCollection: deleteCollection,
      addToCollection: addToCollection,
      removeFromCollection: removeFromCollection,
      addTag: addTag,
      removeTag: removeTag,
      search: search,
      getOriginalBlob: getOriginalBlob,
      getOriginalFile: getOriginalFile,
      linkPhotoCoachResult: linkPhotoCoachResult,
      markHiddenLandscapes: markHiddenLandscapes,
      migrateFromLegacy: migrateFromLegacy,
      fingerprint: fingerprint
    };
  }

  var singleton = null;

  function getEngine() {
    if (!singleton) singleton = createEngine();
    return singleton;
  }

  global.WaypointPhotoLibraryEngine = {
    create: createEngine,
    get: getEngine,
    SUBJECT_FILTERS: SUBJECT_FILTERS
  };

  global.WaypointScenesEngines = global.WaypointScenesEngines || {};
  global.WaypointScenesEngines.PhotoLibraryEngineFactory = createEngine;
})(typeof window !== "undefined" ? window : globalThis);
