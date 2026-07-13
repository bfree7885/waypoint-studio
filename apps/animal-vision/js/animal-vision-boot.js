/**
 * Animal Vision boot — load species config, then start the UI.
 */
(function () {
  "use strict";

  function fail(msg) {
    var el = document.getElementById("av-status");
    if (el) {
      el.textContent = msg;
      el.classList.add("is-error");
    }
  }

  function boot() {
    var AV = window.WaypointAnimalVision;
    if (!AV || !AV.species || !AV.app) {
      fail("Animal Vision could not start.");
      return;
    }
    var src = document.documentElement.getAttribute("data-species-src") || "data/species.json";
    AV.species.load(src).then(function () {
      AV.app.init();
    }).catch(function () {
      fail("Species configuration could not be loaded. Check your connection and try again.");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
