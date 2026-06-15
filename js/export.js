(function () {
  "use strict";

  /**
   * Export handlers — see WaypointComingSoon for UI placeholders.
   * Video export, Live Photos, and desktop wallpapers are grouped under
   * coming-soon id: video-export, live-photos, desktop-wallpapers.
   */

  function notImplemented(name) {
    return function () {
      console.info(
        "[WaypointExport] " + name + " is not implemented yet. See js/export.js for integration notes."
      );
    };
  }

  /**
   * Looping video export — wire here when ready.
   * @param {object} config — scene refs from app.js getEffectConfig() plus exportCanvas
   */
  function exportVideo(config) {
    notImplemented("exportVideo")();
  }

  function exportLivePhotos(config) {
    notImplemented("exportLivePhotos")();
  }

  function exportDesktopWallpapers(config) {
    notImplemented("exportDesktopWallpapers")();
  }

  window.WaypointExport = {
    exportVideo: exportVideo,
    exportLivePhotos: exportLivePhotos,
    exportDesktopWallpapers: exportDesktopWallpapers
  };
})();
