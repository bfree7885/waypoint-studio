/**
 * Waypoint Auto Edit boot
 */
(function (global) {
  "use strict";
  function start() {
    if (global.WaypointAutoEditUI) global.WaypointAutoEditUI.boot();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})(typeof window !== "undefined" ? window : globalThis);
