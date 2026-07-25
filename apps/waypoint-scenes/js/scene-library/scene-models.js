/**
 * Waypoint Scenes — Scene data model (v1).
 *
 * A Scene is the single source of truth for one outdoor photography session.
 * Every downstream capability (Photo Coach, Portfolio Advisor, Living Scenes,
 * Outdoor Journals, Print Studio) reads from — and writes back to — a Scene.
 *
 * This module is pure (no DOM, no storage) so it can be unit-tested directly.
 */
(function (global) {
  "use strict";

  var SCHEMA_VERSION = "1.0.0";

  // Lifecycle status of the Scene itself.
  var STATUS = {
    imported: "imported",
    reviewing: "reviewing",
    reviewed: "reviewed",
    archived: "archived"
  };

  // Per-capability progress. "not-started" keeps buttons honest (foundation states).
  var CAPABILITY_STATUS = {
    notStarted: "not-started",
    inProgress: "in-progress",
    ready: "ready",
    complete: "complete"
  };

  // Stable ingestion sources. Importer will eventually pass "importer".
  var SOURCE = {
    importer: "importer",
    manualFolder: "manual-folder",
    dragDrop: "drag-drop",
    importedLibrary: "imported-library",
    existingShoot: "existing-shoot",
    sample: "sample"
  };

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) {
      try { return global.crypto.randomUUID(); } catch (e) { /* fall through */ }
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function num(v) {
    return typeof v === "number" && isFinite(v) ? v : null;
  }

  function str(v) {
    return v == null ? null : String(v);
  }

  /**
   * A single photograph inside a Scene. Lightweight by design — full-resolution
   * originals are referenced, never embedded, so large shoots stay cheap.
   */
  function createPhoto(input) {
    input = input || {};
    var cam = input.camera || {};
    return {
      id: input.id || uuid(),
      filename: str(input.filename) || "photo.jpg",
      // Reference to the original bytes — an object URL, library id, or path.
      // The Scene never stores the full-resolution pixels itself.
      originalRef: str(input.originalRef),
      thumbnailUrl: str(input.thumbnailUrl),
      captureTime: str(input.captureTime),
      camera: {
        make: str(cam.make),
        model: str(cam.model),
        lens: str(cam.lens),
        iso: num(cam.iso),
        shutter: str(cam.shutter),
        aperture: num(cam.aperture),
        focalLengthMm: num(cam.focalLengthMm)
      },
      gps: input.gps
        ? { lat: num(input.gps.lat), lon: num(input.gps.lon) }
        : null,
      width: num(input.width),
      height: num(input.height),
      orientation: str(input.orientation),
      favorite: !!input.favorite,
      flag: str(input.flag), // "pick" | "reject" | null
      rating: num(input.rating), // 0-5 placeholder for future ratings UI
      subjectHints: Array.isArray(input.subjectHints) ? input.subjectHints.slice() : [],
      notes: str(input.notes),
      // Where each downstream capability has touched this photo.
      moduleRefs: input.moduleRefs || {}
    };
  }

  /**
   * A Scene — one imported session and the workspace everything grows from.
   */
  function createScene(input) {
    input = input || {};
    var photos = Array.isArray(input.photos)
      ? input.photos.map(createPhoto)
      : [];

    var scene = {
      schemaVersion: SCHEMA_VERSION,
      id: input.id || uuid(),
      title: str(input.title) || "Untitled Scene",
      createdDate: str(input.createdDate) || nowIso(),
      captureDate: str(input.captureDate) || null,
      location: str(input.location),
      gps: input.gps
        ? { lat: num(input.gps.lat), lon: num(input.gps.lon) }
        : null,
      importSource: input.importSource || SOURCE.manualFolder,
      camera: str(input.camera),
      lens: str(input.lens),
      // Cover imagery. `coverImageId` points at a photo; `coverImageUrl` is a
      // resolved fallback (e.g. a committed sample asset) for rendering.
      coverImageId: str(input.coverImageId),
      coverImageUrl: str(input.coverImageUrl),
      thumbnailUrl: str(input.thumbnailUrl) || str(input.coverImageUrl),
      weather: input.weather || { available: false, placeholder: true },
      notes: str(input.notes),
      status: input.status || STATUS.imported,
      analysisStatus: input.analysisStatus || CAPABILITY_STATUS.notStarted,
      portfolioStatus: input.portfolioStatus || CAPABILITY_STATUS.notStarted,
      journalStatus: input.journalStatus || CAPABILITY_STATUS.notStarted,
      livingScenesStatus: input.livingScenesStatus || CAPABILITY_STATUS.notStarted,
      favoriteImageId: str(input.favoriteImageId),
      tags: Array.isArray(input.tags) ? input.tags.slice() : [],
      storageLocations: Array.isArray(input.storageLocations)
        ? input.storageLocations.slice()
        : [],
      lastOpenedAt: str(input.lastOpenedAt),
      isSample: !!input.isSample,
      photos: photos,
      photoCount: photos.length,
      exifSummary: input.exifSummary || null
    };

    // Photo count is always derived from the photo array unless explicitly
    // provided (demo scenes may declare a count larger than materialized photos).
    if (typeof input.photoCount === "number" && input.photoCount > photos.length) {
      scene.photoCount = input.photoCount;
    }

    if (!scene.captureDate && photos.length) {
      scene.captureDate = photos[0].captureTime || null;
    }
    if (!scene.exifSummary) {
      scene.exifSummary = summarizeExif(scene);
    }
    if (!scene.coverImageId && photos.length) {
      scene.coverImageId = photos[0].id;
    }
    if (!scene.coverImageUrl) {
      var cover = findPhoto(scene, scene.coverImageId) || photos[0];
      if (cover) scene.coverImageUrl = cover.thumbnailUrl;
    }
    if (!scene.thumbnailUrl) scene.thumbnailUrl = scene.coverImageUrl;
    return scene;
  }

  function findPhoto(scene, photoId) {
    if (!scene || !photoId) return null;
    for (var i = 0; i < scene.photos.length; i++) {
      if (scene.photos[i].id === photoId) return scene.photos[i];
    }
    return null;
  }

  function median(nums) {
    if (!nums.length) return null;
    var s = nums.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  /**
   * Derive an EXIF summary across a Scene's photos. Honest about missing data:
   * fields with no evidence report null rather than inventing values.
   */
  function summarizeExif(scene) {
    var photos = (scene && scene.photos) || [];
    if (!photos.length) {
      return {
        available: false,
        cameras: [],
        lenses: [],
        focalLengths: [],
        isoRange: null,
        apertureRange: null,
        timeSpan: null
      };
    }

    var cameras = {};
    var lenses = {};
    var focal = {};
    var isos = [];
    var apertures = [];
    var times = [];

    photos.forEach(function (p) {
      var c = p.camera || {};
      var camName = [c.make, c.model].filter(Boolean).join(" ").trim();
      if (camName) cameras[camName] = (cameras[camName] || 0) + 1;
      if (c.lens) lenses[c.lens] = (lenses[c.lens] || 0) + 1;
      if (c.focalLengthMm != null) focal[c.focalLengthMm] = (focal[c.focalLengthMm] || 0) + 1;
      if (c.iso != null) isos.push(c.iso);
      if (c.aperture != null) apertures.push(c.aperture);
      if (p.captureTime) {
        var t = Date.parse(p.captureTime);
        if (!isNaN(t)) times.push(t);
      }
    });

    function topKeys(map, limit) {
      return Object.keys(map)
        .sort(function (a, b) { return map[b] - map[a]; })
        .slice(0, limit);
    }

    var focalKeys = topKeys(focal, 3)
      .map(function (f) { return Number(f); })
      .sort(function (a, b) { return a - b; });

    var timeSpan = null;
    if (times.length) {
      times.sort(function (a, b) { return a - b; });
      timeSpan = { start: new Date(times[0]).toISOString(), end: new Date(times[times.length - 1]).toISOString() };
    }

    var available = !!(Object.keys(cameras).length || Object.keys(lenses).length ||
      isos.length || apertures.length || focalKeys.length);

    return {
      available: available,
      cameras: topKeys(cameras, 3),
      lenses: topKeys(lenses, 3),
      focalLengths: focalKeys,
      isoRange: isos.length ? { min: Math.min.apply(null, isos), max: Math.max.apply(null, isos), median: median(isos) } : null,
      apertureRange: apertures.length ? { min: Math.min.apply(null, apertures), max: Math.max.apply(null, apertures) } : null,
      timeSpan: timeSpan
    };
  }

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function formatClock(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    var h = d.getHours();
    var m = d.getMinutes();
    var ampm = h >= 12 ? "PM" : "AM";
    var h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return h12 + ":" + pad(m) + " " + ampm;
  }

  /**
   * Build the human-facing shoot summary described in the sprint spec.
   * Subjects/weather/AI are honest placeholders when there is no evidence.
   */
  function buildShootSummary(scene) {
    var exif = (scene && scene.exifSummary) || summarizeExif(scene);
    var count = scene ? scene.photoCount : 0;

    var subjectCounts = {};
    (scene ? scene.photos : []).forEach(function (p) {
      (p.subjectHints || []).forEach(function (s) {
        subjectCounts[s] = (subjectCounts[s] || 0) + 1;
      });
    });
    var subjects = Object.keys(subjectCounts).sort(function (a, b) {
      return subjectCounts[b] - subjectCounts[a];
    }).slice(0, 6);

    var timeText = null;
    if (exif.timeSpan) {
      var s = formatClock(exif.timeSpan.start);
      var e = formatClock(exif.timeSpan.end);
      if (s && e) timeText = s === e ? s : (s + " and " + e);
    }

    return {
      photoCount: count,
      timeText: timeText,
      timeSpan: exif.timeSpan,
      focalLengths: exif.focalLengths || [],
      cameras: exif.cameras || [],
      lenses: exif.lenses || [],
      isoRange: exif.isoRange || null,
      apertureRange: exif.apertureRange || null,
      subjects: subjects,
      subjectsAvailable: subjects.length > 0,
      weather: { available: false, placeholder: true },
      aiObservations: { available: false, placeholder: true }
    };
  }

  global.WaypointSceneModels = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    STATUS: STATUS,
    CAPABILITY_STATUS: CAPABILITY_STATUS,
    SOURCE: SOURCE,
    uuid: uuid,
    createPhoto: createPhoto,
    createScene: createScene,
    findPhoto: findPhoto,
    summarizeExif: summarizeExif,
    buildShootSummary: buildShootSummary,
    formatClock: formatClock
  };
})(typeof window !== "undefined" ? window : globalThis);
