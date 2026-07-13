/**
 * Hidden Landscapes — boot
 */
(function (global) {
  "use strict";

  function fail(mountId, message) {
    var el = document.getElementById(mountId);
    if (!el) return;
    el.innerHTML = '<p class="wds-body" role="alert">' + message + "</p>";
    el.removeAttribute("aria-busy");
  }

  function boot() {
    if (!global.HiddenLandscapesStore || !global.HiddenLandscapesHome) {
      fail("hl-home-mount", "Hidden Landscapes modules failed to load.");
      fail("hl-page-mount", "Hidden Landscapes modules failed to load.");
      return;
    }

    var page = document.documentElement.getAttribute("data-hl-page") || "home";

    global.HiddenLandscapesStore.loadCatalog()
      .then(function (catalog) {
        global.HiddenLandscapesCatalog = catalog;
        if (page === "gallery" || page === "learn") {
          global.HiddenLandscapesHome.mountPlaceholder(page, catalog);
        } else {
          global.HiddenLandscapesHome.mountHome(catalog);
        }
      })
      .catch(function () {
        fail("hl-home-mount", "Could not load Hidden Landscapes catalog.");
        fail("hl-page-mount", "Could not load Hidden Landscapes catalog.");
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof window !== "undefined" ? window : globalThis);
