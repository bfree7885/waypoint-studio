/**
 * Scenes Portfolio boot
 */
(function () {
  "use strict";

  function start() {
    if (!window.WaypointScenesPortfolioUI) return;
    window.WaypointScenesPortfolioUI.boot().catch(function (err) {
      var el = document.getElementById("pf-status");
      if (el) {
        el.hidden = false;
        el.classList.add("is-error");
        el.textContent =
          "Portfolio workspace could not start. " +
          (err && err.message ? err.message : "Unknown error");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
