/**
 * Photo Library boot
 */
(function () {
  "use strict";

  function boot() {
    var Engine = window.WaypointPhotoLibraryEngine;
    var UI = window.WaypointPhotoLibraryUI;
    if (!Engine || !UI) return;
    var engine = Engine.get();
    engine.init().then(function (info) {
      UI.mount(engine);
      if (info && info.migration && info.migration.added) {
        var el = document.getElementById("pl-status");
        if (el) {
          el.hidden = false;
          el.textContent = "Brought in " + info.migration.added + " photograph(s) from earlier Photo Coach sessions.";
        }
      }
    }).catch(function (err) {
      var el = document.getElementById("pl-status");
      if (el) {
        el.hidden = false;
        el.classList.add("pl-status--error");
        el.textContent = (err && err.message) || "Photo Library could not start.";
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
