/**
 * Loads data/foundation.json and mounts WDS.platformFoundation.
 */
(function () {
  "use strict";
  function boot() {
    var mount = document.getElementById("wds-foundation-mount");
    if (!mount || !window.WDS || !window.WDS.platformFoundation) return;
    var src = mount.getAttribute("data-foundation-src") || "data/foundation.json";
    fetch(src)
      .then(function (r) {
        if (!r.ok) throw new Error("Foundation config missing");
        return r.json();
      })
      .then(function (cfg) {
        window.WDS.platformFoundation.mount(mount, cfg);
        if (window.WDS.platformShell) {
          window.WDS.platformShell.mount({
            currentId: cfg.productId || document.documentElement.getAttribute("data-product"),
            productName: cfg.title,
            depth: 1
          });
        }
      })
      .catch(function (err) {
        mount.innerHTML =
          '<p class="wds-body">Foundation page could not load. ' +
          String(err && err.message ? err.message : err) +
          "</p>";
        mount.removeAttribute("aria-busy");
      });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
