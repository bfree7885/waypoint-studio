/**
 * Waypoint Studio home — RC3 primary product hierarchy.
 * Observe. Discover. Understand.
 */
(function (global) {
  "use strict";

  (function redirectLegacyDashboardHashes() {
    var h = String(global.location && global.location.hash || "");
    if (!h) return;
    if (/outdoor-dashboard|wdb-section-|how-waypoint-works|wds-content-engine/i.test(h)) {
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

  function byId(Nav, id) {
    var apps = Nav.listApps ? Nav.listApps() : [];
    for (var i = 0; i < apps.length; i++) if (apps[i].id === id) return apps[i];
    return null;
  }

  function renderCard(app, Nav, opts) {
    opts = opts || {};
    var overview = Nav.resolveRoute(app.route, 0);
    var launch = Nav.startHereHref ? Nav.startHereHref(app, 0) : overview;
    var start = app.startHere || {};
    var startLabel = start.label || ("Open " + (app.shortTitle || app.title));
    var purpose = app.purpose || app.description || "";
    var chip = maturityLabel(app);
    var showChip = chip && chip !== "Live";
    var badge = opts.badge
      ? '<span class="was-home__status">' + esc(opts.badge) + "</span>"
      : showChip
        ? '<span class="was-home__status">' + esc(chip) + "</span>"
        : "";
    return (
      '<article class="was-home__card' + (opts.primary ? " was-home__card--primary" : "") + '">' +
        '<div class="was-home__card-head">' +
          '<h3 class="was-home__card-title"><a href="' + esc(overview) + '">' + esc(app.title) + "</a></h3>" +
          badge +
        "</div>" +
        '<p class="was-home__purpose">' + esc(purpose) + "</p>" +
        '<p class="was-home__start"><span class="was-home__start-label">Start here</span> ' +
          esc(startLabel) + "</p>" +
        '<div class="was-home__card-actions">' +
          '<a class="wds-btn wds-btn--primary wds-btn--sm" href="' + esc(launch) + '">Open</a>' +
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
        '<p class="wds-caption"><a href="apps/dashboard/">Dashboard</a> · ' +
        '<a href="apps/scenes/">Scenes</a> · <a href="apps/shed-hunting/">Sheds</a> · ' +
        '<a href="apps/waypoint-volunteer/">Volunteer</a></p>' +
      "</div>";
    mount.removeAttribute("aria-busy");
  }

  function cfgIds(cfg, key, fallback) {
    return (cfg && cfg[key] && cfg[key].length) ? cfg[key] : fallback;
  }

  function render() {
    var mount = document.getElementById("was-home-apps");
    var Nav = global.WDS && global.WDS.appNav;
    if (!mount || !Nav) return false;
    var cfg = Nav.config ? Nav.config() : {};
    var primaryIds = cfgIds(cfg, "homePrimary", ["dashboard", "scenes", "sheds", "volunteer"]);
    var incubatorIds = cfgIds(cfg, "homeIncubator", ["signalterrain", "steepleaf", "savant-sommelier"]);
    var supportingIds = cfgIds(cfg, "homeSupporting", ["foragecast", "fieldry", "landscape-interpretation"]);

    var primaryCards = primaryIds
      .map(function (id) {
        var lookup = id === "volunteer" ? "waypoint-volunteer" : id;
        var app = byId(Nav, lookup);
        if (!app) return "";
        var badge = lookup === "scenes" || lookup === "sheds" ? "Flagship" : "Free";
        return renderCard(app, Nav, { primary: true, badge: badge });
      })
      .join("");

    var html = "";
    html +=
      '<section class="was-home__section" aria-labelledby="was-home-primary">' +
        '<h2 id="was-home-primary">Primary products</h2>' +
        '<p class="was-home__journey-blurb">Four ways to begin. Working tools on this platform — not a directory of every prototype.</p>' +
        '<div class="was-home__grid was-home__grid--primary">' + primaryCards + "</div>" +
      "</section>";

    html +=
      '<section class="was-home__section was-home__take-wrap" aria-labelledby="was-home-take">' +
        '<h2 id="was-home-take">Waypoint’s Take</h2>' +
        '<div class="wds-take" data-wds-take data-take-surface="homepage"></div>' +
      "</section>";

    html +=
      '<section class="was-home__section" aria-labelledby="was-home-articles">' +
        '<h2 id="was-home-articles">Articles</h2>' +
        '<p class="was-home__journey-blurb">Shared learning that supports every flagship experience — not a separate product.</p>' +
        '<p><a class="wds-btn wds-btn--secondary wds-btn--sm" href="articles/">Browse Articles</a></p>' +
      "</section>";

    var incLinks = incubatorIds.map(function (id) {
      var app = byId(Nav, id);
      if (!app) return "";
      return '<li><a href="' + esc(Nav.resolveRoute(app.route, 0)) + '">' + esc(app.title) + "</a> — " + esc(maturityLabel(app)) + "</li>";
    }).join("");

    html +=
      '<section class="was-home__section was-home__incubator" aria-labelledby="was-home-incubator">' +
        '<h2 id="was-home-incubator">Incubator</h2>' +
        '<p class="was-home__journey-blurb">Future products, held quietly — not primary Launch peers.</p>' +
        "<ul>" + incLinks + "</ul>" +
        '<p><a href="incubator/">View Incubator</a></p>' +
      "</section>";

    var sup = supportingIds.map(function (id) {
      var app = byId(Nav, id);
      if (!app) return "";
      return '<a href="' + esc(Nav.resolveRoute(app.route, 0)) + '">' + esc(app.title) + "</a>";
    }).filter(Boolean).join(" · ");

    html +=
      '<section class="was-home__section was-home__supporting" aria-labelledby="was-home-supporting">' +
        '<h2 id="was-home-supporting" class="was-home__quiet-title">Supporting capabilities</h2>' +
        '<p class="was-home__journey-blurb">Preserved and reachable, not flagship peers: ' +
          sup + ".</p>" +
      "</section>";

    mount.innerHTML = html;
    mount.removeAttribute("aria-busy");
    var takeEl = mount.querySelector("[data-wds-take]");
    var Take = global.WDS && global.WDS.take;
    if (takeEl && Take && Take.mount) {
      Take.mount(takeEl, Take.homepageDefault ? Take.homepageDefault() : { body: "" });
    }
    return true;
  }

  function bindStudioSearch() {
    var input = document.getElementById("was-studio-search");
    var out = document.getElementById("was-studio-search-results");
    var Search = global.WDS && global.WDS.platformSearch;
    if (!input || !out || !Search || !Search.search) return;
    var t = null;
    input.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var q = input.value.trim();
        if (q.length < 2) {
          out.innerHTML = "";
          return;
        }
        var hits = Search.search(q, { limit: 8 }) || [];
        out.innerHTML = hits.length
          ? "<ul>" + hits.map(function (h) {
              return "<li><a href=\"" + esc(h.href || "#") + "\">" + esc(h.title || h.label || "Result") + "</a></li>";
            }).join("") + "</ul>"
          : "<p class=\"wds-caption\">No matches</p>";
      }, 180);
    });
  }

  function boot() {
    if (render()) {
      bindStudioSearch();
      return;
    }
    if (Date.now() < BOOT_DEADLINE) {
      setTimeout(boot, 50);
      return;
    }
    var mount = document.getElementById("was-home-apps");
    if (mount) renderFallback(mount);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof window !== "undefined" ? window : globalThis);
