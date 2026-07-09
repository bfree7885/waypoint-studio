/**
 * Status page — client-side user location (matches dashboard/kiosk).
 */
(function () {
  "use strict";

  var ENGINE_BASE = "design-system/content-engine/";

  function setUserLocation(text) {
    var el = document.getElementById("wle-user-location");
    if (el) el.textContent = text || "Unavailable";
  }

  function waitForLocationApi() {
    return new Promise(function (resolve) {
      function check() {
        if (window.WDS && WDS.location && WDS.location.bootstrap) {
          resolve();
          return;
        }
        requestAnimationFrame(check);
      }
      check();
    });
  }

  function boot() {
    waitForLocationApi()
      .then(function () {
        return WDS.location.bootstrap({ base: ENGINE_BASE, promptMount: null });
      })
      .then(function (loc) {
        var label = loc.displayTitle || loc.placeLabel ||
          (loc.city ? loc.city + ", " + (loc.stateCode || loc.state) : null) ||
          (loc.lat != null && loc.lng != null ? loc.lat.toFixed(2) + ", " + loc.lng.toFixed(2) : "Unavailable");
        setUserLocation(label);
        if (WDS.locationDebug && WDS.locationDebug.mount) {
          WDS.locationDebug.mount(loc, null, document.getElementById("wds-location-debug-mount"));
        }
      })
      .catch(function () {
        setUserLocation("Detection failed — enable location in browser");
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
