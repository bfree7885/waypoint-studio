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
        if (window.WDS.appShell && window.WDS.appShell.mount) {
          window.WDS.appShell.mount({
            appId: cfg.productId || document.documentElement.getAttribute("data-product"),
            productName: cfg.title,
            depth: 1
          });
        }
      })
      .catch(function () {
        mount.innerHTML =
          '<div class="wds-body" role="alert">' +
            "<p>This foundation page could not load. Check your connection and try again.</p>" +
            '<p><button type="button" class="wds-btn wds-btn--primary wds-btn--sm" onclick="location.reload()">Retry</button></p>' +
          "</div>";
        mount.removeAttribute("aria-busy");
      });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
