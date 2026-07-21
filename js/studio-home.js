/**
 * Waypoint Studio home — immersive outdoor landing (RC3 IA preserved).
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

  /**
   * Human thoughts — not module marketing.
   * Dashboard is the lead; other paths are progressively quieter.
   */
  var EXPERIENCE = {
    dashboard: {
      title: "How is today?",
      line: "A trusted morning brief before you leave.",
      go: "Open today’s brief",
      quiet: "Start here",
      lead: true
    },
    scenes: {
      title: "Photograph",
      line: "Review today’s shoot — then grow.",
      go: "Review today’s shoot",
      quiet: "Craft"
    },
    sheds: {
      title: "Hunt",
      line: "The woods first. Where should I search?",
      go: "Open today’s search",
      quiet: "Field"
    },
    volunteer: {
      title: "Help",
      line: "What good can I do today?",
      go: "See nearby opportunities",
      quiet: "Hope"
    },
    "waypoint-volunteer": {
      title: "Help",
      line: "What good can I do today?",
      go: "See nearby opportunities",
      quiet: "Hope"
    }
  };

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

  function renderExperienceCard(app, Nav, exp) {
    var overview = Nav.resolveRoute(app.route, 0);
    var launch = Nav.startHereHref ? Nav.startHereHref(app, 0) : overview;
    var href = launch || overview;
    var leadClass = exp.lead ? " was-home__card--lead" : " was-home__card--next";
    return (
      '<a class="was-home__card was-home__card--experience was-home__card--primary' + leadClass + '" href="' + esc(href) + '">' +
        '<p class="was-home__quiet-badge">' + esc(exp.quiet || "") + "</p>" +
        '<h3 class="was-home__card-title">' + esc(exp.title || app.shortTitle || app.title) + "</h3>" +
        '<p class="was-home__experience">' + esc(exp.line) + "</p>" +
        '<span class="was-home__card-go">' + esc(exp.go || "Open") + "</span>" +
      "</a>"
    );
  }

  function renderFallback(mount) {
    mount.innerHTML =
      '<div class="was-home__error" role="alert">' +
        "<p>Experiences could not load. Check your connection and try again.</p>" +
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

    var leadHtml = "";
    var nextHtml = "";
    primaryIds.forEach(function (id) {
      var lookup = id === "volunteer" ? "waypoint-volunteer" : id;
      var app = byId(Nav, lookup);
      if (!app) return;
      var exp = EXPERIENCE[lookup] || EXPERIENCE[id] || {
        title: app.shortTitle || app.title,
        line: app.purpose || app.description || "",
        go: "Open",
        quiet: ""
      };
      var card = renderExperienceCard(app, Nav, exp);
      if (exp.lead) leadHtml += card;
      else nextHtml += card;
    });

    var html = "";
    html +=
      '<section class="was-home__section" aria-labelledby="was-home-primary">' +
        '<h2 id="was-home-primary">What brings you outside?</h2>' +
        '<p class="was-home__journey-blurb">Start with the day. Photograph, hunt, and help when you’re ready — not a directory of software modules.</p>' +
        '<div class="was-home__journey-lead">' + leadHtml + "</div>" +
        (nextHtml
          ? '<p class="was-home__journey-then">Then</p><div class="was-home__grid was-home__grid--next">' + nextHtml + "</div>"
          : "") +
      "</section>";

    html +=
      '<section class="was-home__section was-home__take-wrap" aria-labelledby="was-home-take">' +
        '<h2 id="was-home-take">Waypoint’s Take</h2>' +
        '<p class="was-home__journey-blurb">A calm outdoor companion — facts, interpretation, suggestions, and uncertainty labeled.</p>' +
        '<div class="wds-take" data-wds-take data-take-surface="homepage"></div>' +
      "</section>";

    html +=
      '<section class="was-home__section" aria-labelledby="was-home-articles">' +
        '<h2 id="was-home-articles">Learn while you’re out</h2>' +
        '<p class="was-home__journey-blurb">Articles are context for every journey — not a separate product you must leave the trail for.</p>' +
        '<p><a class="was-home__articles-link" href="articles/">Browse Articles</a></p>' +
      "</section>";

    var incLinks = incubatorIds.map(function (id) {
      var app = byId(Nav, id);
      if (!app) return "";
      return '<li><a href="' + esc(Nav.resolveRoute(app.route, 0)) + '">' + esc(app.title) + "</a> — " + esc(maturityLabel(app)) + "</li>";
    }).join("");

    html +=
      '<section class="was-home__section was-home__incubator" aria-labelledby="was-home-incubator">' +
        '<h2 id="was-home-incubator">Incubator</h2>' +
        '<p class="was-home__journey-blurb">Future products, held quietly.</p>' +
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
        '<h2 id="was-home-supporting" class="was-home__quiet-title">Also nearby</h2>' +
        '<p class="was-home__journey-blurb">' + sup + "</p>" +
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
