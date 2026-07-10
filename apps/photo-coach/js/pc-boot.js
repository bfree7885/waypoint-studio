/**
 * Photo Coach — boot (no dashboard dependency).
 */
(function (global) {
  "use strict";

  function boot() {
    if (!global.PhotoCoachApp) {
      requestAnimationFrame(boot);
      return;
    }
    global.PhotoCoachApp.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window);
