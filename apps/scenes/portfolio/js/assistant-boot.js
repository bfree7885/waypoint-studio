/**
 * Scenes Portfolio Assistant boot
 */
(function () {
  "use strict";

  function start() {
    if (!window.WaypointScenesPortfolioAssistantUI) return;
    window.WaypointScenesPortfolioAssistantUI.boot().catch(function (err) {
      var el = document.getElementById("pfa-status");
      if (el) {
        el.hidden = false;
        el.classList.add("is-error");
        el.textContent =
          "Portfolio Assistant could not start. " +
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
