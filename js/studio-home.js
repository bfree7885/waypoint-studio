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

  var BOOT_DEADLINE = Date.now() + 4000;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function statusLabel(status) {
    if (status === "foundation") return "Foundation";
    if (status === "planned") return "Planned";
    return "";
  }

  function renderFallback(mount) {
    mount.innerHTML =
      '<div class="was-home__error" role="alert">' +
        "<p>Applications could not load. Check your connection and try again.</p>" +
        '<p><button type="button" class="wds-btn wds-btn--primary wds-btn--sm" onclick="location.reload()">Retry</button></p>' +
        '<p class="wds-caption"><a href="apps/dashboard/">Open Dashboard</a> · ' +
        '<a href="apps/fieldry/">Fieldry</a> · <a href="apps/foragecast/">ForageCast</a> · ' +
        '<a href="apps/scenes/">Scenes</a></p>' +
      "</div>";
    mount.removeAttribute("aria-busy");
  }

  function render() {
    var mount = document.getElementById("was-home-apps");
    var Nav = global.WDS && global.WDS.appNav;
    if (!mount || !Nav) return false;
    var groups = Nav.appsByCategory();
    mount.innerHTML = groups.map(function (g) {
      var cards = g.apps.map(function (app) {
        var href = Nav.resolveRoute(app.route, 0);
        var chip = statusLabel(app.status);
        return (
          '<a class="was-home__card" href="' + esc(href) + '">' +
            "<strong>" + esc(app.title) + "</strong>" +
            (chip ? '<span class="was-home__status">' + esc(chip) + "</span>" : "") +
            "<span>" + esc(app.description || "") + "</span>" +
            "<em>" + (app.status === "foundation" ? "Explore" : "Open") + "</em>" +
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
    return true;
  }

  function boot() {
    if (render()) return;
    if (Date.now() >= BOOT_DEADLINE) {
      var mount = document.getElementById("was-home-apps");
      if (mount) renderFallback(mount);
      return;
    }
    setTimeout(boot, 40);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window);
