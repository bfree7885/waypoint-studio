/**
 * Hidden Landscapes — boot
 */
(function (global) {
  "use strict";

  function start() {
    if (global.WaypointHLStudio && typeof global.WaypointHLStudio.mount === "function") {
      global.WaypointHLStudio.mount();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})(typeof window !== "undefined" ? window : globalThis);
