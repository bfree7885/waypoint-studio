/**
 * Waypoint Studio home — application directory from nav config.
 */
(function (global) {
  "use strict";

  // Preserve bookmarks that pointed at the old root Dashboard.
  (function redirectLegacyDashboardHashes() {
    var h = String(global.location && global.location.hash || "");
    if (!h) return;
    var dash =
      /outdoor-dashboard|wdb-section-|how-waypoint-works|wds-content-engine/i.test(h);
    if (dash) {
      global.location.replace("apps/dashboard/" + h);
    }
  })();

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function render() {
    var mount = document.getElementById("was-home-apps");
    var Nav = global.WDS && global.WDS.appNav;
    if (!mount || !Nav) return;
    var groups = Nav.appsByCategory();
    mount.innerHTML = groups.map(function (g) {
      var cards = g.apps.map(function (app) {
        var href = Nav.resolveRoute(app.route, 0);
        return (
          '<a class="was-home__card" href="' + esc(href) + '">' +
            "<strong>" + esc(app.title) + "</strong>" +
            "<span>" + esc(app.description || "") + "</span>" +
            "<em>Open</em>" +
          "</a>"
        );
      }).join("");
      return (
        '<section class="was-home__section" aria-labelledby="was-home-' + esc(g.id) + '">' +
          '<h2 id="was-home-' + esc(g.id) + '">' + esc(g.label) + "</h2>" +
          '<div class="was-home__grid">' + cards + "</div>" +
        "</section>"
      );
    }).join("");
    mount.removeAttribute("aria-busy");
  }

  function boot() {
    if (global.WDS && global.WDS.appNav) render();
    else setTimeout(boot, 20);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window);
