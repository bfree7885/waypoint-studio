(function (global) {
  "use strict";

  function notImplemented(name) {
    return function () {
      console.info(
        "[WaypointExport] " + name + " is not implemented yet. See js/export.js for integration notes."
      );
    };
  }

  function exportVideo(config) {
    notImplemented("exportVideo")();
  }

  function exportLivePhotos(config) {
    notImplemented("exportLivePhotos")();
  }

  function exportDesktopWallpapers(config) {
    notImplemented("exportDesktopWallpapers")();
  }

  /**
   * Download the export preview canvas as a PNG snapshot.
   * @param {HTMLCanvasElement} canvas
   * @param {string} [filename]
   * @returns {boolean}
   */
  function downloadSnapshot(canvas, filename) {
    if (!canvas || !canvas.width || !canvas.height) return false;

    try {
      canvas.toBlob(function (blob) {
        if (!blob) return;
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = filename || "waypoint-scene.png";
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, "image/png");
      return true;
    } catch (e) {
      console.warn("[WaypointExport] Snapshot download failed.", e);
      return false;
    }
  }

  global.WaypointExport = {
    exportVideo: exportVideo,
    exportLivePhotos: exportLivePhotos,
    exportDesktopWallpapers: exportDesktopWallpapers,
    downloadSnapshot: downloadSnapshot
  };
})(window);
