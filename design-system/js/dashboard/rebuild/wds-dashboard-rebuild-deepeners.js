/**
 * Dashboard Rebuild — Home below-fold deepeners (append only).
 * Field Notes · Waypoint's Take · Featured Photography · Scenes · Sheds · Side Trails.
 * Same visual family as Rebuild; Side Trails stays visually lighter than primary apps.
 * Honest empty/loading; no marketing banners.
 * Authority: docs/rebuild-2026/home-vision-lock-owner-review.md
 */
(function (global) {
  "use strict";

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function depthFromPath() {
    try {
      var path = String((global.location && global.location.pathname) || "");
      if (/\/apps\//.test(path)) return 1;
      return 0;
    } catch (e) {
      return 0;
    }
  }

  function prefixes(depth) {
    depth = depth == null ? depthFromPath() : depth;
    if (depth <= 0) {
      return {
        root: "",
        articles: "articles/",
        scenes: "apps/scenes/",
        sheds: "apps/shed-hunting/map/",
        identity: "assets/images/identity/manifest.json",
        sideTrails: "side-trails/",
        signalterrainLive: "apps/signalterrain/cyber/live.html",
        globalSignals: "side-trails/global-signals/",
        icons: "assets/images/side-trails/"
      };
    }
    return {
      root: "../../",
      articles: "../../articles/",
      scenes: "../scenes/",
      sheds: "../shed-hunting/map/",
      identity: "../../assets/images/identity/manifest.json",
      sideTrails: "../../side-trails/",
      signalterrainLive: "../signalterrain/cyber/live.html",
      globalSignals: "../../side-trails/global-signals/",
      icons: "../../assets/images/side-trails/"
    };
  }

  /** Homepage teaser cards — destinations verified for direct open (not catalog-only). */
  var SIDE_TRAILS_CARDS = [
    {
      id: "civic-trails",
      title: "Civic Trails",
      description: "Evidence-first civic transparency GIS from public records.",
      status: "Beta",
      hrefKey: "civicTrails",
      icon: "civic-trails-map.svg",
      external: true
    },
    {
      id: "signalterrain",
      title: "SignalTerrain",
      description: "Current defensive cyber intelligence from public sources.",
      status: "Experimental",
      hrefKey: "signalterrainLive",
      icon: "signalterrain-network.svg",
      external: false
    },
    {
      id: "global-signals",
      title: "Global Signals",
      description: "How world events shape everyday life.",
      status: "Experimental",
      hrefKey: "globalSignals",
      icon: "global-signals-globe.svg",
      external: false
    }
  ];

  var CIVIC_TRAILS_URL = "https://github.com/bfree7885/civic-trails";

  function sideTrailsHref(card, p) {
    if (card.hrefKey === "civicTrails") return CIVIC_TRAILS_URL;
    return p[card.hrefKey] || p.sideTrails;
  }

  function renderSideTrailsCard(card, p) {
    var href = sideTrailsHref(card, p);
    var rel = card.external ? ' target="_blank" rel="noopener noreferrer"' : "";
    var iconSrc = p.icons + card.icon;
    return (
      '<a class="wdb-r-deepen__st-card" data-st-card="' +
      escapeHtml(card.id) +
      '" href="' +
      escapeHtml(href) +
      '"' +
      rel +
      ">" +
      '<img class="wdb-r-deepen__st-icon" src="' +
      escapeHtml(iconSrc) +
      '" alt="" width="40" height="40" loading="lazy" decoding="async">' +
      '<span class="wdb-r-deepen__st-status">' +
      escapeHtml(card.status) +
      "</span>" +
      '<span class="wdb-r-deepen__st-title">' +
      escapeHtml(card.title) +
      "</span>" +
      '<span class="wdb-r-deepen__st-desc">' +
      escapeHtml(card.description) +
      "</span>" +
      "</a>"
    );
  }

  function renderSideTrailsSection(depth) {
    var p = prefixes(depth);
    var cards = SIDE_TRAILS_CARDS.map(function (card) {
      return renderSideTrailsCard(card, p);
    }).join("");
    return (
      '<section class="wdb-r-deepen__section wdb-r-deepen__section--side-trails" data-deepen="side-trails" aria-labelledby="wdb-r-side-trails-title">' +
      '<header class="wdb-r-deepen__header">' +
      '<h2 class="wdb-r-deepen__title" id="wdb-r-side-trails-title">Side Trails</h2>' +
      '<p class="wdb-r-deepen__lede">Experimental projects, research, and useful detours.</p>' +
      "</header>" +
      '<div class="wdb-r-deepen__body wdb-r-deepen__st" data-deepen-body="side-trails">' +
      '<div class="wdb-r-deepen__st-grid">' +
      cards +
      "</div>" +
      '<p class="wdb-r-deepen__action"><a class="wdb-r-deepen__link" data-deepen-link="side-trails" href="' +
      escapeHtml(p.sideTrails) +
      '">View all Side Trails \u2192</a></p>' +
      "</div>" +
      "</section>"
    );
  }

  function renderSkeleton() {
    return (
      '<div class="wdb-r-deepen" data-wdb-r-deepen>' +
      '<section class="wdb-r-deepen__section" data-deepen="articles" aria-labelledby="wdb-r-articles-title">' +
      '<header class="wdb-r-deepen__header">' +
      '<h2 class="wdb-r-deepen__title" id="wdb-r-articles-title">Field Notes</h2>' +
      '<p class="wdb-r-deepen__lede">A few curated articles — local, seasonal, and conditions-related. Full reporting stays with the publisher.</p>' +
      "</header>" +
      '<div class="wdb-r-deepen__body" data-deepen-body="articles" aria-busy="true">' +
      '<p class="wdb-r-deepen__status" role="status">Loading field notes…</p>' +
      "</div>" +
      "</section>" +
      '<section class="wdb-r-deepen__section" data-deepen="take" aria-labelledby="wdb-r-take-title">' +
      '<header class="wdb-r-deepen__header">' +
      '<h2 class="wdb-r-deepen__title" id="wdb-r-take-title">Waypoint\u2019s Take</h2>' +
      '<p class="wdb-r-deepen__lede">Editorial interpretation — not a score, not a to-do list.</p>' +
      "</header>" +
      '<div class="wdb-r-deepen__body wdb-r-deepen__panel" data-deepen-body="take" aria-busy="true">' +
      '<p class="wdb-r-deepen__status" role="status">Loading Take…</p>' +
      "</div>" +
      "</section>" +
      '<section class="wdb-r-deepen__section" data-deepen="photo" aria-labelledby="wdb-r-photo-title">' +
      '<header class="wdb-r-deepen__header">' +
      '<h2 class="wdb-r-deepen__title" id="wdb-r-photo-title">Featured Photography</h2>' +
      '<p class="wdb-r-deepen__lede">Frames from the field — captioned and credited.</p>' +
      "</header>" +
      '<div class="wdb-r-deepen__body" data-deepen-body="photo" aria-busy="true">' +
      '<p class="wdb-r-deepen__status" role="status">Loading photograph…</p>' +
      "</div>" +
      "</section>" +
      '<section class="wdb-r-deepen__section" data-deepen="scenes" aria-labelledby="wdb-r-scenes-title">' +
      '<header class="wdb-r-deepen__header">' +
      '<h2 class="wdb-r-deepen__title" id="wdb-r-scenes-title">Scenes</h2>' +
      '<p class="wdb-r-deepen__lede">Outdoor photography craft — review, organize, and understand what you captured.</p>' +
      "</header>" +
      '<div class="wdb-r-deepen__body wdb-r-deepen__panel" data-deepen-body="scenes">' +
      '<p class="wdb-r-deepen__copy">Scenes is a dedicated app. Home introduces it; it does not embed here.</p>' +
      '<p class="wdb-r-deepen__action"><a class="wdb-r-deepen__link" data-deepen-link="scenes" href="#">Open Scenes \u2192</a></p>' +
      "</div>" +
      "</section>" +
      '<section class="wdb-r-deepen__section" data-deepen="sheds" aria-labelledby="wdb-r-sheds-title">' +
      '<header class="wdb-r-deepen__header">' +
      '<h2 class="wdb-r-deepen__title" id="wdb-r-sheds-title">Sheds</h2>' +
      '<p class="wdb-r-deepen__lede">Whitetail field intelligence — where to search, private observations, guidance not certainty.</p>' +
      "</header>" +
      '<div class="wdb-r-deepen__body wdb-r-deepen__panel" data-deepen-body="sheds">' +
      '<p class="wdb-r-deepen__copy">Open the field map for search coverage and suggested ground. Finds stay private on your device.</p>' +
      '<p class="wdb-r-deepen__action"><a class="wdb-r-deepen__link" data-deepen-link="sheds" href="#">Open Sheds \u2192</a></p>' +
      "</div>" +
      "</section>" +
      renderSideTrailsSection(depthFromPath()) +
      "</div>"
    );
  }

  function setLinks(root, depth) {
    var p = prefixes(depth);
    var scenes = root.querySelector('[data-deepen-link="scenes"]');
    var sheds = root.querySelector('[data-deepen-link="sheds"]');
    var sideTrails = root.querySelector('[data-deepen-link="side-trails"]');
    if (scenes) scenes.setAttribute("href", p.scenes);
    if (sheds) sheds.setAttribute("href", p.sheds);
    if (sideTrails) sideTrails.setAttribute("href", p.sideTrails);

    /* Re-resolve card hrefs/icons when mounted from /apps/dashboard/ */
    SIDE_TRAILS_CARDS.forEach(function (card) {
      var el = root.querySelector('[data-st-card="' + card.id + '"]');
      if (!el) return;
      el.setAttribute("href", sideTrailsHref(card, p));
      var img = el.querySelector(".wdb-r-deepen__st-icon");
      if (img) img.setAttribute("src", p.icons + card.icon);
    });
  }

  function fillArticles(el, depth) {
    if (!el) return;
    var p = prefixes(depth);
    var dataUrl = p.root + "data/articles/articles.json";
    fetch(dataUrl, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("articles " + r.status);
        return r.json();
      })
      .then(function (data) {
        var byId = Object.create(null);
        ((data && data.articles) || []).forEach(function (a) {
          byId[a.id] = a;
        });
        var pickIds = (data && data.dashboardPicks) || [];
        var items = pickIds.map(function (id) {
          return byId[id];
        }).filter(Boolean);
        if (!items.length) {
          items = ((data && data.articles) || []).slice(0, 3);
        }
        if (!items.length) {
          el.innerHTML =
            '<p class="wdb-r-deepen__empty">No curated field notes yet. The Articles feed will appear after the next successful refresh.</p>' +
            '<p class="wdb-r-deepen__action"><a class="wdb-r-deepen__link" href="' +
            escapeHtml(p.articles) +
            '">Browse Articles \u2192</a></p>';
        } else {
          var labels = ["Local", "Seasonal", "Conditions"];
          var list = items
            .slice(0, 3)
            .map(function (a, idx) {
              var geo = (a.geographicScopes && a.geographicScopes[0]) || "";
              var chip =
                '<span class="wdb-r-deepen__chip">' +
                escapeHtml(labels[idx] || geo || "Article") +
                "</span>";
              return (
                '<li class="wdb-r-deepen__article">' +
                chip +
                '<a href="' +
                escapeHtml(a.canonicalUrl) +
                '" rel="noopener noreferrer" target="_blank">' +
                escapeHtml(a.title || "Untitled") +
                "</a>" +
                '<p class="wdb-r-deepen__summary">' +
                escapeHtml(a.sourceName || "") +
                (geo ? " · " + escapeHtml(geo) : "") +
                (a.summary ? " — " + escapeHtml(String(a.summary).slice(0, 140)) + (String(a.summary).length > 140 ? "…" : "") : "") +
                "</p>" +
                '<p class="wdb-r-deepen__meta">Opens original publisher</p>' +
                "</li>"
              );
            })
            .join("");
          el.innerHTML =
            '<ul class="wdb-r-deepen__list">' +
            list +
            "</ul>" +
            '<p class="wdb-r-deepen__action"><a class="wdb-r-deepen__link" href="' +
            escapeHtml(p.articles) +
            '">All Articles \u2192</a></p>';
        }
        el.removeAttribute("aria-busy");
      })
      .catch(function () {
        el.innerHTML =
          '<p class="wdb-r-deepen__empty" role="alert">Field notes could not load right now. Try again later.</p>' +
          '<p class="wdb-r-deepen__action"><a class="wdb-r-deepen__link" href="' +
          escapeHtml(p.articles) +
          '">Browse Articles \u2192</a></p>';
        el.removeAttribute("aria-busy");
      });
  }

  function fillTake(el) {
    if (!el) return;
    var Take = global.WDS && global.WDS.take;
    var body =
      "Begin with the day outside. Notice conditions before you leave — then photograph, search, or contribute when you choose. Home holds the instruments; articles and apps deepen what you observe.";
    if (Take && Take.mount) {
      Take.mount(el, {
        body: body,
        meta: "Editorial · not a score · uncertainty welcome",
        surface: "home",
        sources: []
      });
    } else {
      el.innerHTML =
        '<p class="wdb-r-deepen__copy">' +
        escapeHtml(body) +
        "</p>" +
        '<p class="wdb-r-deepen__meta">Editorial · not a score · uncertainty welcome</p>';
    }
    el.removeAttribute("aria-busy");
  }

  function fillPhoto(el, depth) {
    if (!el) return;
    var p = prefixes(depth);
    fetch(p.identity, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("identity " + r.status);
        return r.json();
      })
      .then(function (data) {
        var exp =
          (data && data.experiences && (data.experiences.home || data.experiences.dashboard)) ||
          null;
        if (!exp || !exp.src) {
          el.innerHTML =
            '<p class="wdb-r-deepen__empty">Featured photography will appear here when owner images are ready.</p>';
          el.removeAttribute("aria-busy");
          return;
        }
        var src = String(exp.src || "");
        if (src && src.charAt(0) !== "/" && !/^https?:/i.test(src)) {
          src = p.root + src.replace(/^\.\//, "");
        }
        var credit = exp.credit || "";
        if (exp.placeholder && credit && credit.indexOf("Placeholder") < 0) {
          credit = "Placeholder · " + credit;
        }
        var title = exp.label || "";
        var caption = exp.caption || "";
        var location = exp.location || "";
        var capParts = [];
        if (title) {
          capParts.push("<strong>" + escapeHtml(title) + "</strong>");
        }
        if (caption) {
          capParts.push(escapeHtml(caption));
        }
        if (location) {
          capParts.push("<em>" + escapeHtml(location) + "</em>");
        }
        if (credit) {
          capParts.push(escapeHtml(credit));
        }
        el.innerHTML =
          '<figure class="wdb-r-deepen__figure">' +
          '<img class="wdb-r-deepen__img" src="' +
          escapeHtml(src) +
          '" alt="' +
          escapeHtml(exp.alt || title || "Featured photography") +
          '" width="1280" height="720" loading="lazy" decoding="async"' +
          (exp.placeholder ? ' data-placeholder="true"' : "") +
          ">" +
          (capParts.length
            ? '<figcaption class="wdb-r-deepen__caption">' + capParts.join(" — ") + "</figcaption>"
            : "") +
          "</figure>";
        el.removeAttribute("aria-busy");
      })
      .catch(function () {
        el.innerHTML =
          '<p class="wdb-r-deepen__empty">Featured photography is unavailable right now.</p>';
        el.removeAttribute("aria-busy");
      });
  }

  function bind(host, options) {
    options = options || {};
    if (!host) return;
    var root = host.querySelector("[data-wdb-r-deepen]");
    if (!root) return;
    var depth = options.depth != null ? options.depth : depthFromPath();
    setLinks(root, depth);
    fillArticles(root.querySelector('[data-deepen-body="articles"]'), depth);
    fillTake(root.querySelector('[data-deepen-body="take"]'));
    fillPhoto(root.querySelector('[data-deepen-body="photo"]'), depth);
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildDeepeners = {
    version: "1.1.1-sheds-st-readiness",
    render: renderSkeleton,
    bind: bind,
    depthFromPath: depthFromPath
  };
})(typeof window !== "undefined" ? window : global);
