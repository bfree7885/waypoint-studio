/**
 * WSKB profile page bootstrap
 */
(function () {
  "use strict";

  function getParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function init() {
    var mount = document.getElementById("wskb-profile");
    if (!mount || !window.WDS || !WDS.wskb) return;

    var id = getParam("id");
    var regionId = getParam("region") || "pike-county-pa";

    WDS.wskb.configure({ base: "./" });

    if (!id) {
      mount.innerHTML = "<p class=\"wskb-missing\">No species specified. Add <code>?id=</code> to the URL.</p>";
      mount.removeAttribute("aria-busy");
      return;
    }

    WDS.wskb.loadRecord(id).then(function (record) {
      if (!record || !WDS.wskbRender) {
        mount.innerHTML = "<p class=\"wskb-missing\">Species profile not found: " + id + "</p>";
        mount.removeAttribute("aria-busy");
        return;
      }
      document.title = record.names.common + " · " + record.names.scientific + " — WSKB";
      mount.innerHTML = WDS.wskbRender.renderProfile(record, { regionId: regionId });
      mount.removeAttribute("aria-busy");
    }).catch(function () {
      mount.innerHTML = "<p class=\"wskb-missing\">Could not load species profile.</p>";
      mount.removeAttribute("aria-busy");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
