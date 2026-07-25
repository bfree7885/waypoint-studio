/**
 * Waypoint Scenes — stable Scene ingestion interface.
 *
 * This is the contract Importer (and any other source) should call eventually.
 * The Scene Library does not care how the photographs arrived — it only cares
 * that they arrive through one of these ingest methods.
 *
 * Supported today:
 *   - ingestFromFolderFiles(files, meta)   // webkitdirectory / drag-drop folder
 *   - ingestFromLibraryFolder(folderMeta)  // already-imported photo-library set
 *   - ingestFromExistingShoot(shoot)       // Photo Coach shoot → Scene
 *   - ingestFromImporterPayload(payload)   // future Importer handoff shape
 */
(function (global) {
  "use strict";

  var Models = null;
  var Engine = null;

  function deps() {
    Models = global.WaypointSceneModels;
    Engine = global.WaypointSceneEngine;
    if (!Models) throw new Error("WaypointSceneModels required");
  }

  function basename(path) {
    if (!path) return "photo.jpg";
    var parts = String(path).split(/[/\\]/);
    return parts[parts.length - 1] || "photo.jpg";
  }

  function folderNameFromFiles(files) {
    if (!files || !files.length) return null;
    var rel = files[0].webkitRelativePath || files[0].name || "";
    var parts = String(rel).split(/[/\\]/);
    if (parts.length >= 2) return parts[0];
    return null;
  }

  function isImageFile(file) {
    if (!file) return false;
    if (file.type && /^image\//.test(file.type)) return true;
    return /\.(jpe?g|png|webp|heic|tif{1,2})$/i.test(file.name || "");
  }

  function guessCameraFromFilename(name) {
    // No EXIF parsing in this sprint — leave null rather than invent.
    return { make: null, model: null, lens: null, iso: null, shutter: null, aperture: null, focalLengthMm: null };
  }

  /**
   * Build a Scene from a FileList / Array of File objects (folder import).
   * Thumbnails are object URLs that the UI must revoke when done.
   */
  function ingestFromFolderFiles(files, meta) {
    deps();
    meta = meta || {};
    var list = Array.prototype.slice.call(files || []).filter(isImageFile);
    if (!list.length) {
      return { ok: false, error: "No image files found in that folder." };
    }

    var photos = list.map(function (file, idx) {
      var url = null;
      try {
        if (global.URL && global.URL.createObjectURL) {
          url = global.URL.createObjectURL(file);
        }
      } catch (e) { /* ignore */ }
      return Models.createPhoto({
        filename: basename(file.name),
        originalRef: url,
        thumbnailUrl: url,
        captureTime: file.lastModified ? new Date(file.lastModified).toISOString() : null,
        camera: guessCameraFromFilename(file.name),
        notes: null
      });
    });

    var title = meta.title || folderNameFromFiles(list) || "Imported Scene";
    var scene = Models.createScene({
      title: title,
      location: meta.location || null,
      camera: meta.camera || null,
      lens: meta.lens || null,
      importSource: meta.importSource || Models.SOURCE.manualFolder,
      captureDate: photos[0] && photos[0].captureTime,
      photos: photos,
      notes: meta.notes || null,
      tags: meta.tags || [],
      storageLocations: meta.storageLocations || ["This device"],
      status: Models.STATUS.imported
    });

    if (Engine && Engine.save) Engine.save(scene);
    return { ok: true, scene: scene, photoCount: photos.length };
  }

  /**
   * Build a Scene from an already-imported Photo Library selection.
   * `folderMeta.images` is an array of LibraryImage-like objects.
   */
  function ingestFromLibraryFolder(folderMeta) {
    deps();
    folderMeta = folderMeta || {};
    var images = Array.isArray(folderMeta.images) ? folderMeta.images : [];
    if (!images.length) {
      return { ok: false, error: "No library images provided." };
    }

    var photos = images.map(function (img) {
      var cam = img.camera || {};
      return Models.createPhoto({
        id: img.id,
        filename: img.filename || img.originalFilename || "photo.jpg",
        originalRef: "library:" + img.id,
        thumbnailUrl: img.media && img.media.thumbnailDataUrl,
        captureTime: img.captureDate,
        camera: {
          make: cam.make,
          model: cam.model,
          lens: cam.lens,
          iso: cam.iso,
          shutter: cam.shutter,
          aperture: cam.fNumber,
          focalLengthMm: cam.focalLengthMm
        },
        gps: img.gps || null,
        width: img.width,
        height: img.height,
        orientation: img.orientation,
        favorite: !!img.favorite,
        subjectHints: img.subjectHints || [],
        notes: img.photographerNotes || null,
        moduleRefs: { photoLibraryId: img.id }
      });
    });

    var firstCam = images[0] && images[0].camera;
    var scene = Models.createScene({
      title: folderMeta.title || "Imported Library Scene",
      location: folderMeta.location || null,
      camera: folderMeta.camera || (firstCam ? [firstCam.make, firstCam.model].filter(Boolean).join(" ") : null),
      lens: folderMeta.lens || (firstCam && firstCam.lens) || null,
      importSource: Models.SOURCE.importedLibrary,
      captureDate: folderMeta.captureDate || (images[0] && images[0].captureDate),
      photos: photos,
      tags: folderMeta.tags || [],
      storageLocations: ["Photo Library"],
      status: Models.STATUS.imported
    });

    if (Engine && Engine.save) Engine.save(scene);
    return { ok: true, scene: scene, photoCount: photos.length };
  }

  /**
   * Promote an existing Photo Coach shoot into a Scene so the same photographs
   * are never re-uploaded for Portfolio / Journals / Living Scenes.
   */
  function ingestFromExistingShoot(shoot) {
    deps();
    if (!shoot || !Array.isArray(shoot.images) || !shoot.images.length) {
      return { ok: false, error: "Shoot has no images." };
    }

    var photos = shoot.images.map(function (img) {
      var a = img.analysis || {};
      var cam = (a.captureMetadata) || {};
      return Models.createPhoto({
        id: img.id,
        filename: img.fileName || img.filename || "photo.jpg",
        originalRef: img.objectUrl || img.thumbnail || null,
        thumbnailUrl: img.thumbnail || img.objectUrl || null,
        captureTime: img.captureTime || null,
        camera: {
          make: cam.make,
          model: cam.model,
          lens: cam.lens,
          iso: cam.iso,
          shutter: cam.exposureTimeSec != null ? String(cam.exposureTimeSec) + "s" : null,
          aperture: cam.fNumber,
          focalLengthMm: cam.focalLengthMm
        },
        favorite: img.selectionLabel === "favorite",
        flag: img.selectionLabel === "reject" ? "reject"
          : img.selectionLabel === "keep" ? "pick" : null,
        subjectHints: [],
        notes: null,
        moduleRefs: { photoCoachShootId: shoot.id, photoCoachImageId: img.id }
      });
    });

    var scene = Models.createScene({
      title: shoot.label || shoot.title || "Reviewed Shoot",
      importSource: Models.SOURCE.existingShoot,
      captureDate: shoot.createdAt || (photos[0] && photos[0].captureTime),
      photos: photos,
      analysisStatus: Models.CAPABILITY_STATUS.ready,
      status: Models.STATUS.reviewed,
      storageLocations: ["Photo Coach"],
      tags: ["from-photo-coach"]
    });

    if (Engine && Engine.save) Engine.save(scene);
    return { ok: true, scene: scene, photoCount: photos.length };
  }

  /**
   * Future Importer contract. Shape is locked now so Importer can call it
   * without Scenes caring about SD-card internals.
   *
   * Expected payload:
   * {
   *   title, captureDate, location, gps, camera, lens,
   *   photos: [{ filename, originalPath|blobRef, thumbnailUrl, captureTime, camera, gps }],
   *   storageLocations: ["Local mirror", "Google Drive", ...]
   * }
   */
  function ingestFromImporterPayload(payload) {
    deps();
    payload = payload || {};
    var photosIn = Array.isArray(payload.photos) ? payload.photos : [];
    if (!photosIn.length) {
      return { ok: false, error: "Importer payload has no photographs." };
    }

    var photos = photosIn.map(function (p) {
      return Models.createPhoto({
        filename: p.filename,
        originalRef: p.originalPath || p.blobRef || p.originalRef || null,
        thumbnailUrl: p.thumbnailUrl || null,
        captureTime: p.captureTime || null,
        camera: p.camera || {},
        gps: p.gps || null,
        width: p.width,
        height: p.height,
        subjectHints: p.subjectHints || [],
        notes: p.notes || null
      });
    });

    var scene = Models.createScene({
      title: payload.title || "Imported Card",
      location: payload.location || null,
      gps: payload.gps || null,
      camera: payload.camera || null,
      lens: payload.lens || null,
      importSource: Models.SOURCE.importer,
      captureDate: payload.captureDate || (photos[0] && photos[0].captureTime),
      photos: photos,
      photoCount: typeof payload.photoCount === "number" ? payload.photoCount : photos.length,
      weather: payload.weather || { available: false, placeholder: true },
      notes: payload.notes || null,
      tags: payload.tags || [],
      storageLocations: payload.storageLocations || ["Importer"],
      status: Models.STATUS.imported
    });

    if (Engine && Engine.save) Engine.save(scene);
    return { ok: true, scene: scene, photoCount: scene.photoCount };
  }

  global.WaypointSceneIngest = {
    ingestFromFolderFiles: ingestFromFolderFiles,
    ingestFromLibraryFolder: ingestFromLibraryFolder,
    ingestFromExistingShoot: ingestFromExistingShoot,
    ingestFromImporterPayload: ingestFromImporterPayload,
    isImageFile: isImageFile,
    folderNameFromFiles: folderNameFromFiles
  };
})(typeof window !== "undefined" ? window : globalThis);
