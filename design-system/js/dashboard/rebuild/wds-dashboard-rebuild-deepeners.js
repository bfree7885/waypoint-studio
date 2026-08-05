/**
 * Dashboard Rebuild — Home below-fold deepeners (append only).
 * Field Notes · Waypoint's Take · Featured Photography · Scenes · Sheds.
 * Same visual family as Rebuild; honest empty/loading; no marketing banners.
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
    if (depth <= 0) return { root: "", articles: "articles/", scenes: "apps/scenes/", sheds: "apps/shed-hunting/map/", identity: "assets/images/identity/manifest.json" };
    return {
      root: "../../",
      articles: "../../articles/",
      scenes: "../scenes/",
      sheds: "../shed-hunting/map/",
      identity: "../../assets/images/identity/manifest.json"
    };
  }

  function renderSkeleton() {
    return (
      '<div class="wdb-r-deepen" data-wdb-r-deepen>' +
      '<section class="wdb-r-deepen__section" data-deepen="timeline" aria-label="Observation timeline">' +
      '<div class="wdb-r-deepen__body" data-deepen-body="timeline" aria-busy="true">' +
      '<p class="wdb-r-deepen__status" role="status">Loading observation timeline…</p>' +
      "</div>" +
      "</section>" +
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
      '<p class="wdb-r-deepen__lede">Shed hunting in the field — map-first, observational, private by default.</p>' +
      "</header>" +
      '<div class="wdb-r-deepen__body wdb-r-deepen__panel" data-deepen-body="sheds">' +
      '<p class="wdb-r-deepen__copy">Sheds is a dedicated app. Home introduces it; it does not embed here.</p>' +
      '<p class="wdb-r-deepen__action"><a class="wdb-r-deepen__link" data-deepen-link="sheds" href="#">Open Sheds \u2192</a></p>' +
      "</div>" +
      "</section>" +
      "</div>"
    );
  }

  function setLinks(root, depth) {
    var p = prefixes(depth);
    var scenes = root.querySelector('[data-deepen-link="scenes"]');
    var sheds = root.querySelector('[data-deepen-link="sheds"]');
    if (scenes) scenes.setAttribute("href", p.scenes);
    if (sheds) sheds.setAttribute("href", p.sheds);
  }

  function fillArticles(el, depth) {
    if (!el) return;
    var p = prefixes(depth);
    var dataUrl = p.root + "data/articles/articles.json";
    var observations = global.WDS && global.WDS.platformObservations;
    var payloadPromise = observations && observations.loadArticlePayload
      ? observations.loadArticlePayload(dataUrl)
      : fetch(dataUrl, { cache: "no-store" }).then(function (r) {
          if (!r.ok) throw new Error("articles " + r.status);
          return r.json();
        });
    payloadPromise
      .then(function (data) {
        var byId = Object.create(null);
        ((data && data.articles) || []).forEach(function (a) {
          byId[a.id] = a;
        });
        var engine = global.WDS && global.WDS.outdoorRecommendations;
        var items = [];
        if (engine && engine.recommendFor) {
          items = engine.recommendFor("dashboard", {
            articles: (data && data.articles) || [],
            platform: global.WDS.outdoorIntelligence && global.WDS.outdoorIntelligence.getLast
              ? global.WDS.outdoorIntelligence.getLast()
              : null,
            location: global.WDS.location && global.WDS.location.getState
              ? global.WDS.location.getState()
              : null,
            recentObservations: global.WDS.platformObservations && global.WDS.platformObservations.recent
              ? global.WDS.platformObservations.recent(12)
              : []
          }, { kinds: ["article"], limit: 3 }).map(function (rec) {
            return rec.article;
          }).filter(Boolean);
        }
        if (!items.length) {
          var pickIds = (data && data.dashboardPicks) || [];
          items = pickIds.map(function (id) {
            return byId[id];
          }).filter(Boolean);
        }
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

  function fillTimeline(el, depth) {
    if (!el) return;
    var timeline = global.WDS && global.WDS.observationTimeline;
    if (!timeline || !timeline.mount) {
      el.innerHTML = '<p class="wdb-r-deepen__empty">Observation timeline is unavailable right now.</p>';
      el.removeAttribute("aria-busy");
      return;
    }
    timeline.mount(el, {
      depth: depth,
      limit: 5,
      maxPerKind: { article: 1, weather: 1, "trail-condition": 1 },
      heading: "Recent observations",
      intro: "Photos, field notes, conditions, trips, and reading—one calm chronology."
    });
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
    fillTimeline(root.querySelector('[data-deepen-body="timeline"]'), depth);
    fillArticles(root.querySelector('[data-deepen-body="articles"]'), depth);
    fillTake(root.querySelector('[data-deepen-body="take"]'));
    fillPhoto(root.querySelector('[data-deepen-body="photo"]'), depth);
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildDeepeners = {
    version: "1.0.0-home-rc1",
    render: renderSkeleton,
    bind: bind,
    depthFromPath: depthFromPath
  };
})(typeof window !== "undefined" ? window : global);
