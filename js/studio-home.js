/**
 * Waypoint Studio home — Observe / Understand / Create / Share directory.
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

  function maturityLabel(app) {
    if (app.maturity) return app.maturity;
    if (app.status === "foundation") return "Foundation";
    if (app.status === "active") return "Early access";
    if (app.status === "experimental") return "Experimental";
    if (app.status === "planned") return "Planned";
    return "Live";
  }

  function renderCard(app, Nav) {
    var overview = Nav.resolveRoute(app.route, 0);
    var launch = Nav.startHereHref ? Nav.startHereHref(app, 0) : overview;
    var start = app.startHere || {};
    var startLabel = start.label || ("Open " + (app.shortTitle || app.title));
    var purpose = app.purpose || app.description || "";
    var chip = maturityLabel(app);
    var showChip = chip && chip !== "Live";
    return (
      '<article class="was-home__card">' +
        '<div class="was-home__card-head">' +
          '<h3 class="was-home__card-title"><a href="' + esc(overview) + '">' + esc(app.title) + "</a></h3>" +
          (showChip ? '<span class="was-home__status">' + esc(chip) + "</span>" : "") +
        "</div>" +
        '<p class="was-home__purpose">' + esc(purpose) + "</p>" +
        '<p class="was-home__start"><span class="was-home__start-label">Start here</span> ' +
          esc(startLabel) + "</p>" +
        '<div class="was-home__card-actions">' +
          '<a class="wds-btn wds-btn--primary wds-btn--sm" href="' + esc(launch) + '">Launch</a>' +
          (launch !== overview
            ? '<a class="wds-btn wds-btn--ghost wds-btn--sm" href="' + esc(overview) + '">Overview</a>'
            : "") +
        "</div>" +
      "</article>"
    );
  }

  function renderFallback(mount) {
    mount.innerHTML =
      '<div class="was-home__error" role="alert">' +
        "<p>Applications could not load. Check your connection and try again.</p>" +
        '<p><button type="button" class="wds-btn wds-btn--primary wds-btn--sm" onclick="location.reload()">Retry</button></p>' +
        '<p class="wds-caption"><a href="apps/dashboard/">Open Dashboard</a> · ' +
        '<a href="apps/fieldry/#/new">Fieldry</a> · <a href="apps/foragecast/">ForageCast</a> · ' +
        '<a href="apps/photo-coach/">Photo Coach</a> · <a href="apps/signalterrain/cyber/live.html#brief">SignalTerrain</a> · ' +
        '<a href="apps/waypoint-volunteer/discover.html">Volunteer</a></p>' +
      "</div>";
    mount.removeAttribute("aria-busy");
  }

  function render() {
    var mount = document.getElementById("was-home-apps");
    var Nav = global.WDS && global.WDS.appNav;
    if (!mount || !Nav) return false;
    var groups = Nav.appsByJourney ? Nav.appsByJourney() : Nav.appsByCategory();
    mount.innerHTML = groups.map(function (g) {
      var cards = g.apps.map(function (app) {
        return renderCard(app, Nav);
      }).join("");
      return (
        '<section class="was-home__section was-home__journey" aria-labelledby="was-home-' + esc(g.id) + '">' +
          '<h2 id="was-home-' + esc(g.id) + '">' + esc(g.label) + "</h2>" +
          (g.blurb ? '<p class="was-home__journey-blurb">' + esc(g.blurb) + "</p>" : "") +
          '<div class="was-home__grid">' + cards + "</div>" +
        "</section>"
      );
    }).join("");
    mount.removeAttribute("aria-busy");
    return true;
  }

  function bindStudioSearch() {
    var input = document.getElementById("was-studio-search");
    var out = document.getElementById("was-studio-search-results");
    if (!input || !out) return;
    function paint() {
      var Search = global.WDS && global.WDS.platformSearch;
      if (!Search) {
        out.innerHTML = "";
        return;
      }
      var q = input.value.trim();
      if (!q) {
        out.innerHTML = "";
        return;
      }
      var res = Search.search(q, { depth: 0, limit: 12 });
      if (!res.total) {
        out.innerHTML = '<p class="wds-honesty">No matches on this device.</p>';
        return;
      }
      out.innerHTML =
        '<p class="wds-honesty">' + esc(res.honesty) + "</p><ul>" +
        res.results.map(function (h) {
          var title = h.href
            ? '<a href="' + esc(h.href) + '">' + esc(h.title) + "</a>"
            : esc(h.title);
          return "<li>" + title +
            (h.subtitle ? " — " + esc(h.subtitle) : "") +
            "</li>";
        }).join("") + "</ul>";
    }
    var handler = paint;
    if (global.WDS && WDS.resilience && WDS.resilience.debounce) {
      handler = WDS.resilience.debounce(paint, 140);
    }
    input.addEventListener("input", handler);
  }

  function boot() {
    if (global.WDS && WDS.platformIdentity) {
      try { WDS.platformIdentity.ensure(); } catch (e) { /* ignore */ }
    }
    bindStudioSearch();
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
