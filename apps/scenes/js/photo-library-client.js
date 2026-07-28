/**
 * Shared Photo Library client for Photo Coach / Hidden Landscapes.
 * Loads a File from IndexedDB by libraryId without re-upload.
 */
(function (global) {
  "use strict";

  function ensureEngine() {
    var Eng = global.WaypointPhotoLibraryEngine;
    if (!Eng) return null;
    return Eng.get();
  }

  function parseLibraryIdFromLocation() {
    try {
      var params = new URLSearchParams(global.location.search || "");
      return params.get("libraryId") || params.get("photoId") || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * @returns {Promise<{id:string, file:File|Blob, image:object}|null>}
   */
  function resolveLibraryFile(libraryId) {
    var id = libraryId || parseLibraryIdFromLocation();
    if (!id) return Promise.resolve(null);
    var engine = ensureEngine();
    if (!engine) return Promise.resolve(null);

    function load() {
      return engine.getOriginalFile(id).then(function (file) {
        var image = engine.get(id);
        if (!file) {
          // Fall back: thumbnail data URL → blob for HL/Coach preview path
          if (image && image.media && image.media.thumbnailDataUrl) {
            var dataUrl = image.media.thumbnailDataUrl;
            return fetch(dataUrl)
              .then(function (r) { return r.blob(); })
              .then(function (blob) {
                try {
                  file = new File([blob], (image && image.filename) || "photo.jpg", {
                    type: blob.type || "image/jpeg"
                  });
                } catch (e) {
                  file = blob;
                }
                return { id: id, file: file, image: image, fromThumbnail: true };
              });
          }
          return null;
        }
        return { id: id, file: file, image: image, fromThumbnail: false };
      });
    }

    if (!engine.isReady()) {
      return engine.init().then(load);
    }
    return load();
  }

  global.WaypointPhotoLibraryClient = {
    parseLibraryIdFromLocation: parseLibraryIdFromLocation,
    resolveLibraryFile: resolveLibraryFile
  };
})(typeof window !== "undefined" ? window : globalThis);
