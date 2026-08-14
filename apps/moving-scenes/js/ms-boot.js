/**
 * Waypoint Moving Scenes boot
 */
(function (global) {
  "use strict";
  function start() {
    if (global.WaypointMovingScenesUI) global.WaypointMovingScenesUI.boot();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})(typeof window !== "undefined" ? window : globalThis);
