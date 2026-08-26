/**
 * Dashboard Rebuild — below-fold Discover briefing (Dashboard-native only).
 * Waypoint's Take prefers live intel briefs when available; otherwise calm editorial fallback.
 * Understand section appears only when publishingMatch finds a justified story.
 * Explore further links Publishing / Scenes — not sibling-app promo grids.
 * Authority: docs/SCENES-PUBLISHING.md · docs/PRODUCT-DIRECTION.md
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

  function renderSkeleton() {
    return (
      '<div class="wdb-r-deepen" data-wdb-r-deepen>' +
      '<section class="wdb-r-deepen__section" data-deepen="take" aria-labelledby="wdb-r-take-title">' +
      '<header class="wdb-r-deepen__header">' +
      '<p class="wdb-r-deepen__kicker">Why this matters</p>' +
      '<h2 class="wdb-r-deepen__title" id="wdb-r-take-title">Waypoint\u2019s Take</h2>' +
      '<p class="wdb-r-deepen__lede">Interpretation for this place — not a score or to-do list.</p>' +
      "</header>" +
      '<div class="wdb-r-deepen__body wdb-r-deepen__panel" data-deepen-body="take" aria-busy="true">' +
      '<p class="wdb-r-deepen__status" role="status">Loading Take\u2026</p>' +
      "</div>" +
      "</section>" +
      '<section class="wdb-r-deepen__section" data-deepen="understand" hidden aria-labelledby="wdb-r-understand-title">' +
      '<header class="wdb-r-deepen__header">' +
      '<p class="wdb-r-deepen__kicker">Understand this</p>' +
      '<h2 class="wdb-r-deepen__title" id="wdb-r-understand-title">A Waypoint story</h2>' +
      '<p class="wdb-r-deepen__lede">Only shown when an existing story genuinely fits — never filler.</p>' +
      "</header>" +
      '<div class="wdb-r-deepen__body wdb-r-deepen__panel" data-deepen-body="understand"></div>' +
      "</section>" +
      '<section class="wdb-r-deepen__section" data-deepen="explore" aria-labelledby="wdb-r-explore-title">' +
      '<header class="wdb-r-deepen__header">' +
      '<p class="wdb-r-deepen__kicker">Explore &amp; understand</p>' +
      '<h2 class="wdb-r-deepen__title" id="wdb-r-explore-title">Go deeper</h2>' +
      '<p class="wdb-r-deepen__lede">Publishing and Scenes when you want context — optional.</p>' +
      "</header>" +
      '<ul class="wdb-r-deepen__links" data-deepen-body="explore">' +
      '<li><a href="../../articles/">Articles</a> — calm field reading</li>' +
      '<li><a href="../../apps/scenes/">Scenes</a> — craft and visual exploration</li>' +
      '<li><a href="../../deep-forest-dispatch/">Deep Forest Dispatch</a> — Waypoint visual Earth stories</li>' +
      "</ul>" +
      "</section>" +
      "</div>"
    );
  }

  function resolveTake(ctx) {
    ctx = ctx || {};
    var fallback =
      "Start with conditions at this place. Let instruments settle honestly — live facts first, estimates labeled — then decide what the day outside asks of you.";
    var meta = "Editorial · Dashboard briefing · not a score";
    var platform = ctx.platform || null;
    var Intel = global.WDS && global.WDS.dashboardRebuildIntel;
    if (platform && Intel && typeof Intel.analyze === "function") {
      try {
        var analysis = Intel.analyze(platform, ctx.location || ctx.placeContext || null, ctx.now || null);
        var brief = analysis && analysis.beforeYouGo && analysis.beforeYouGo.brief;
        if (brief && String(brief).trim()) {
          return {
            body: String(brief).trim(),
            meta: "Derived from live instruments · not a score · evidence in Before you go"
          };
        }
      } catch (e) {
        /* use fallback */
      }
    }
    return { body: fallback, meta: meta };
  }

  function resolveUnderstand(ctx) {
    ctx = ctx || {};
    var Match = global.WDS && global.WDS.publishingMatch;
    if (!Match || typeof Match.matchDiscovery !== "function") return null;
    var signals = ctx.signals || null;
    var platform = ctx.platform || null;
    if (!signals && platform) {
      var Intel = global.WDS && global.WDS.dashboardRebuildIntel;
      if (Intel && typeof Intel.analyze === "function") {
        try {
          var analysis = Intel.analyze(platform, ctx.location || ctx.placeContext || null, ctx.now || null);
          signals = (analysis && analysis.happeningNow) || [];
        } catch (e) {
          signals = [];
        }
      }
    }
    try {
      return Match.matchDiscovery({
        signals: signals || [],
        platform: platform,
        now: ctx.now || null,
        topics: ctx.topics || []
      });
    } catch (err) {
      return null;
    }
  }

  function fillTake(el, ctx) {
    if (!el) return;
    var resolved = resolveTake(ctx);
    var Take = global.WDS && global.WDS.take;
    if (Take && Take.mount) {
      Take.mount(el, {
        body: resolved.body,
        meta: resolved.meta,
        surface: "dashboard",
        sources: []
      });
    } else {
      el.innerHTML =
        '<p class="wdb-r-deepen__copy">' +
        escapeHtml(resolved.body) +
        "</p>" +
        '<p class="wdb-r-deepen__meta">' +
        escapeHtml(resolved.meta) +
        "</p>";
    }
    el.removeAttribute("aria-busy");
  }

  function fillUnderstand(section, body, ctx) {
    if (!section || !body) return;
    var hit = resolveUnderstand(ctx);
    if (!hit || !hit.href || !hit.title) {
      section.setAttribute("hidden", "");
      body.innerHTML = "";
      return;
    }
    section.removeAttribute("hidden");
    var video =
      hit.videoHref
        ? '<p class="wdb-r-deepen__meta"><a href="' +
          escapeHtml(hit.videoHref) +
          '">Watch the story</a> when you prefer film.</p>'
        : "";
    body.innerHTML =
      '<p class="wdb-r-deepen__copy">' +
      escapeHtml(hit.why || "A Waypoint story that fits this discovery.") +
      "</p>" +
      '<p class="wdb-r-deepen__action"><a class="wdb-r-deepen__link" href="' +
      escapeHtml(hit.href) +
      '">' +
      escapeHtml(hit.title) +
      "</a></p>" +
      '<p class="wdb-r-deepen__meta">' +
      escapeHtml(hit.seriesLabel || "Deep Forest Dispatch") +
      (hit.basedOn ? " · Based on " + escapeHtml(hit.basedOn) : "") +
      "</p>" +
      video;
  }

  function bind(host, ctx) {
    if (!host) return;
    var root = host.querySelector("[data-wdb-r-deepen]");
    if (!root) return;
    ctx = ctx || {};
    fillTake(root.querySelector('[data-deepen-body="take"]'), ctx);
    fillUnderstand(
      root.querySelector('[data-deepen="understand"]'),
      root.querySelector('[data-deepen-body="understand"]'),
      ctx
    );
  }

  function ensureCatalog(done) {
    var Match = global.WDS && global.WDS.publishingMatch;
    if (!Match) {
      if (done) done();
      return;
    }
    if (Match.getCatalog && Match.getCatalog()) {
      if (done) done();
      return;
    }
    if (typeof global.fetch !== "function") {
      if (done) done();
      return;
    }
    var url = "/data/publishing/content-relationships.json";
    try {
      global
        .fetch(url, { credentials: "same-origin" })
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .then(function (json) {
          if (json && Match.setCatalog) Match.setCatalog(json);
          if (done) done();
        })
        .catch(function () {
          if (done) done();
        });
    } catch (e) {
      if (done) done();
    }
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildDeepeners = {
    version: "2.2.0-publishing",
    render: renderSkeleton,
    bind: bind,
    resolveTake: resolveTake,
    resolveUnderstand: resolveUnderstand,
    ensureCatalog: ensureCatalog
  };
})(typeof window !== "undefined" ? window : global);
