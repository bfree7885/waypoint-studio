/**
 * Photo Coach critique boot — initializes WaypointPhotoCoach without WDS.appBoot.
 */
(function () {
  "use strict";

  function boot() {
    if (window.WaypointPhotoCoach && typeof window.WaypointPhotoCoach.init === "function") {
      window.WaypointPhotoCoach.init();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
