/**
 * Waypoint Scenes — Portfolio Website Output boot
 */
(function (global) {
  "use strict";

  function start() {
    var UI = global.WaypointScenesPortfolioOutputUI;
    if (!UI || !UI.boot) {
      console.error("[Scenes Portfolio Output] UI missing");
      return;
    }
    UI.boot().catch(function (err) {
      console.error("[Scenes Portfolio Output] boot failed", err);
      var el = document.getElementById("pfo-status");
      if (el) {
        el.hidden = false;
        el.textContent = "Could not start website gallery workspace on this device.";
        el.classList.add("is-error");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})(typeof window !== "undefined" ? window : globalThis);
