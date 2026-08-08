/**
 * Global Signals — application home dashboard.
 * Composes labeled module datasets into a dense intelligence board.
 * Does not invent live news or fabricate module destinations.
 */
(function (global) {
  "use strict";

  var NS = (global.WDS = global.WDS || {});
  var GS = (NS.globalSignals = NS.globalSignals || {});

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fetchJson(url) {
    return fetch(url, { credentials: "same-origin" }).then(function (res) {
      if (!res.ok) throw new Error("Failed to load " + url + " (" + res.status + ")");
      return res.json();
    });
  }

  function byId(list, idKey, id) {
    if (!list || !id) return null;
    for (var i = 0; i < list.length; i++) {
      if (String(list[i][idKey]) === String(id)) return list[i];
    }
    return null;
  }

  function bySlug(list, slug) {
    return byId(list, "slug", slug);
  }

  function confChip(value) {
    var c = String(value || "Unknown");
    var cls = "gsh-chip gsh-chip--conf-" + c.toLowerCase().replace(/\s+/g, "-");
    return '<span class="' + cls + '">' + esc(c) + "</span>";
  }

  function horizonChip(value) {
    if (!value) return "";
    return '<span class="gsh-chip">' + esc(value) + "</span>";
  }

  function panel(id, title, moreHref, moreLabel, bodyHtml, wide) {
    return (
      '<section class="gsh-panel' +
      (wide ? " gsh-panel--wide" : "") +
      '" aria-labelledby="' +
      esc(id) +
      '-title">' +
      '<header class="gsh-panel__head">' +
      "<h2 id=\"" +
      esc(id) +
      '-title">' +
      esc(title) +
      "</h2>" +
      (moreHref
        ? '<a href="' + esc(moreHref) + '">' + esc(moreLabel || "Open") + "</a>"
        : "") +
      "</header>" +
      '<div class="gsh-panel__body">' +
      bodyHtml +
      "</div></section>"
    );
  }

  function renderBanner(home) {
    var label = home.modeLabel || "Sample / demo dataset";
    var msg =
      (home.honesty && home.honesty.banner) ||
      "Sample / demo dashboard — labeled datasets only.";
    return (
      '<div class="gsh-banner" role="status">' +
      '<p class="gsh-badge">' +
      esc(label) +
      "</p>" +
      "<p>" +
      esc(msg) +
      "</p></div>"
    );
  }

  function selectableEntities(rel) {
    var ents = (rel && rel.entities) || [];
    return ents.filter(function (e) {
      return e && e.selectable !== false && e.id && e.label;
    });
  }

  function renderSearch(rel, routes) {
    var ents = selectableEntities(rel);
    var options = ents
      .map(function (e) {
        return (
          '<option value="' +
          esc(e.id) +
          '">' +
          esc(e.label) +
          " · " +
          esc(e.type || "entity") +
          "</option>"
        );
      })
      .join("");
    return (
      '<section class="gsh-search" aria-labelledby="gsh-search-title">' +
      '<div class="gsh-search__head">' +
      '<h2 id="gsh-search-title">Relationship Explorer search</h2>' +
      '<a href="' +
      esc(routes.relationships) +
      '">Open explorer</a>' +
      "</div>" +
      '<form class="gsh-search__form" data-gsh-rel-search>' +
      '<div class="gsh-search__row">' +
      '<label for="gsh-entity">Entity</label>' +
      '<select id="gsh-entity" name="entity" required>' +
      '<option value="">Select an entity…</option>' +
      options +
      "</select>" +
      '<button class="gsh-search__go" type="submit">Explore</button>' +
      "</div>" +
      '<p class="gsh-search__hint">Deep-links into Relationship Explorer with why, confidence, horizon, and evidence on every step. Sample/demo entities only.</p>' +
      "</form></section>"
    );
  }

  function buildCurrentEvents(home, articles, countries) {
    var items = [];
    var prefArts = (home.currentEventSources && home.currentEventSources.preferArticleIds) || [];
    var prefCountries =
      (home.currentEventSources && home.currentEventSources.preferCountrySlugs) || [];
    var max = (home.currentEventSources && home.currentEventSources.maxItems) || 6;
    var artById = {};
    (articles.articles || []).forEach(function (a) {
      artById[a.id] = a;
    });
    prefArts.forEach(function (id) {
      var a = artById[id];
      if (!a) return;
      items.push({
        title: a.headline,
        summary: a.factualSummary,
        meta: [a.date || a.publishedAt || "", a.eventType || "Article", a.confidence || ""]
          .filter(Boolean)
          .join(" · "),
        href: "./articles/?id=" + encodeURIComponent(a.id),
        confidence: a.confidence,
        horizon: a.timeHorizon,
        kind: "article"
      });
    });
    var cBySlug = {};
    (countries.countries || []).forEach(function (c) {
      cBySlug[c.slug] = c;
    });
    prefCountries.forEach(function (slug) {
      var c = cBySlug[slug];
      if (!c || !c.currentEvents || !c.currentEvents.length) return;
      var ev = c.currentEvents[0];
      items.push({
        title: ev.title,
        summary: ev.summary,
        meta: [c.name, ev.asOf || "", ev.kind || "structural", ev.label || "Sample / demo"]
          .filter(Boolean)
          .join(" · "),
        href: "./countries/" + encodeURIComponent(c.slug) + "/",
        confidence: ev.confidence,
        horizon: ev.timeHorizon,
        kind: "country"
      });
    });
    return items.slice(0, max);
  }

  function renderEventList(items) {
    if (!items.length) return '<p class="gsh-empty">No current-event cards available in the sample datasets.</p>';
    return (
      '<ul class="gsh-list">' +
      items
        .map(function (it) {
          return (
            '<li><a class="gsh-item" href="' +
            esc(it.href) +
            '">' +
            '<p class="gsh-item__title">' +
            esc(it.title) +
            "</p>" +
            '<p class="gsh-item__meta">' +
            esc(it.meta) +
            " " +
            confChip(it.confidence) +
            " " +
            horizonChip(it.horizon) +
            "</p>" +
            (it.summary
              ? '<p class="gsh-item__summary">' + esc(it.summary) + "</p>"
              : "") +
            "</a></li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function renderFeaturedTake(home, articles, industries) {
    var cfg = home.featuredTake || {};
    var article = byId(articles.articles || [], "id", cfg.articleId);
    var industry = bySlug(industries.industries || [], cfg.industrySlug);
    if (!article || !article.waypointsTake) {
      return '<p class="gsh-empty">Featured Waypoint’s Take is unavailable in the sample Articles dataset.</p>';
    }
    var take = article.waypointsTake;
    var actions =
      '<div class="gsh-take__actions">' +
      '<a class="gs-cta gs-cta--primary" href="./articles/?id=' +
      encodeURIComponent(article.id) +
      '">Open article</a>' +
      (industry
        ? '<a class="gs-cta" href="./industries/' +
          encodeURIComponent(industry.slug) +
          '/">Industry Intelligence</a>'
        : "") +
      '<a class="gs-cta" href="./explain/?q=' +
      encodeURIComponent(article.headline) +
      '">Explain This</a>' +
      "</div>";
    return (
      '<div class="gsh-take">' +
      '<p class="gsh-item__meta">' +
      esc(article.headline) +
      " · sample/demo analysis</p>" +
      '<p class="gsh-take__why">' +
      esc(take.whyItMatters || "") +
      "</p>" +
      (take.analysis
        ? '<p class="gsh-take__analysis">' + esc(take.analysis) + "</p>"
        : "") +
      (cfg.note ? '<p class="gsh-item__summary">' + esc(cfg.note) + "</p>" : "") +
      actions +
      "</div>"
    );
  }

  function renderFeaturedRelationship(home, rel) {
    var cfg = home.featuredRelationship || {};
    var cascade = byId(rel.cascades || [], "id", cfg.cascadeId);
    var root = byId(rel.entities || [], "id", cfg.rootEntityId || (cascade && cascade.rootId));
    if (!cascade || !root) {
      return '<p class="gsh-empty">Featured relationship cascade unavailable.</p>';
    }
    var edgeIds = cascade.edgeIds || [];
    var pathLabels = [root.label];
    edgeIds.slice(0, 4).forEach(function (eid) {
      var edge = byId(rel.relationships || [], "id", eid);
      if (!edge) return;
      var to = byId(rel.entities || [], "id", edge.to);
      if (to) pathLabels.push(to.label);
    });
    var pathHtml =
      '<ol class="gsh-rel__path">' +
      pathLabels
        .map(function (label, idx) {
          return (
            "<li>" +
            (idx ? '<span class="gsh-rel__arrow" aria-hidden="true">→</span>' : "") +
            '<span class="gsh-chip">' +
            esc(label) +
            "</span></li>"
          );
        })
        .join("") +
      "</ol>";
    var entity = encodeURIComponent(root.id);
    var focus = encodeURIComponent(cfg.graphFocusId || root.id);
    var q = encodeURIComponent(cfg.explainQuery || cascade.title || root.label);
    return (
      '<div class="gsh-rel">' +
      '<p class="gsh-rel__title">' +
      esc(cascade.title) +
      "</p>" +
      '<p class="gsh-rel__summary">' +
      esc(cascade.summary || root.summary || "") +
      "</p>" +
      pathHtml +
      '<div class="gsh-take__actions">' +
      '<a class="gs-cta gs-cta--primary" href="./relationships/?entity=' +
      entity +
      '">Relationship Explorer</a>' +
      '<a class="gs-cta" href="./relationship-graph/?focus=' +
      focus +
      '">Relationship Graph</a>' +
      '<a class="gs-cta" href="./explain/?q=' +
      q +
      '">Explain This</a>' +
      "</div></div>"
    );
  }

  function renderCountries(home, countries) {
    var slugs = home.mostAffectedCountrySlugs || [];
    var list = [];
    slugs.forEach(function (slug) {
      var c = bySlug(countries.countries || [], slug);
      if (c) list.push(c);
    });
    if (!list.length) return '<p class="gsh-empty">No country profiles available.</p>';
    return (
      '<ul class="gsh-list">' +
      list
        .map(function (c) {
          var risk = (c.currentRisks && c.currentRisks[0]) || null;
          return (
            '<li><a class="gsh-item" href="./countries/' +
            encodeURIComponent(c.slug) +
            '/">' +
            '<p class="gsh-item__title">' +
            esc(c.name) +
            "</p>" +
            '<p class="gsh-item__meta">' +
            esc(c.region || "") +
            " · Country Intelligence</p>" +
            (risk
              ? '<p class="gsh-item__summary">' +
                esc(risk.title) +
                " " +
                confChip(risk.confidence) +
                " " +
                horizonChip(risk.timeHorizon) +
                "</p>"
              : '<p class="gsh-item__summary">' + esc(c.summary || "") + "</p>") +
            "</a></li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function renderIndustries(home, industries) {
    var slugs = home.industriesUnderPressureSlugs || [];
    var list = [];
    slugs.forEach(function (slug) {
      var ind = bySlug(industries.industries || [], slug);
      if (ind) list.push(ind);
    });
    if (!list.length) return '<p class="gsh-empty">No industry baselines available.</p>';
    return (
      '<ul class="gsh-list">' +
      list
        .map(function (ind) {
          var threat = (ind.threats && ind.threats[0]) || null;
          var happening = ind.whatIsHappening || {};
          return (
            '<li><a class="gsh-item" href="./industries/' +
            encodeURIComponent(ind.slug) +
            '/">' +
            '<p class="gsh-item__title">' +
            esc(ind.name) +
            "</p>" +
            '<p class="gsh-item__meta">Industry Intelligence · curated baseline</p>' +
            '<p class="gsh-item__summary">' +
            esc((threat && (threat.label || threat.title || threat.detail || threat.text)) || happening.text || ind.tagline || "") +
            " " +
            confChip((threat && threat.confidence) || happening.confidence) +
            " " +
            horizonChip((threat && (threat.horizon || threat.timeHorizon)) || happening.horizon) +
            "</p></a></li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function renderCitizen(home, citizen) {
    var ids = home.citizenImpactSectionIds || [];
    var sections = citizen.sections || [];
    var items = [];
    ids.forEach(function (id) {
      var sec = byId(sections, "id", id);
      if (!sec) return;
      var st = (sec.statements && sec.statements[0]) || null;
      items.push({ section: sec, statement: st });
    });
    if (!items.length) return '<p class="gsh-empty">Citizen Impact summary unavailable.</p>';
    return (
      '<ul class="gsh-list">' +
      items
        .map(function (it) {
          var st = it.statement;
          var href = "./citizen-impact/#section-" + encodeURIComponent(it.section.id);
          return (
            '<li><a class="gsh-item" href="' +
            href +
            '">' +
            '<p class="gsh-item__title">' +
            esc(it.section.label) +
            "</p>" +
            '<p class="gsh-item__meta">Citizen Impact · sample/demo</p>' +
            (st
              ? '<p class="gsh-item__summary">' +
                esc(st.whatChanged || st.why || st.text || st.summary || "") +
                " " +
                confChip(st.confidence) +
                " " +
                horizonChip(st.timeHorizon || st.horizon) +
                "</p>"
              : '<p class="gsh-item__summary">' + esc(it.section.blurb || "") + "</p>") +
            "</a></li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function renderArticles(home, articles) {
    var ids = home.featuredArticleIds || [];
    var list = [];
    ids.forEach(function (id) {
      var a = byId(articles.articles || [], "id", id);
      if (a) list.push(a);
    });
    if (!list.length) list = (articles.articles || []).slice(0, 4);
    if (!list.length) return '<p class="gsh-empty">No articles in the sample dataset.</p>';
    return (
      '<ul class="gsh-list">' +
      list
        .map(function (a) {
          return (
            '<li><a class="gsh-item" href="./articles/?id=' +
            encodeURIComponent(a.id) +
            '">' +
            '<p class="gsh-item__title">' +
            esc(a.headline) +
            "</p>" +
            '<p class="gsh-item__meta">' +
            esc(a.date || "") +
            " · " +
            esc(a.publisher || "") +
            " · " +
            esc(a.eventType || "") +
            " " +
            confChip(a.confidence) +
            "</p>" +
            '<p class="gsh-item__summary">' +
            esc(a.factualSummary || "") +
            "</p></a></li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function bindSearch(root, routes) {
    var form = root.querySelector("[data-gsh-rel-search]");
    if (!form) return;
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var sel = form.querySelector('select[name="entity"]');
      var id = sel && sel.value;
      if (!id) return;
      global.location.href =
        routes.relationships + "?entity=" + encodeURIComponent(id);
    });
  }

  function renderLiveStatus(home) {
    var LS = global.WDS && WDS.liveStatus;
    if (!LS) return "";
    return LS.renderHtml(LS.fromGlobalSignalsHome(home));
  }

  function renderBoard(bundle) {
    var home = bundle.home;
    var routes = home.moduleRoutes || {};
    var events = buildCurrentEvents(home, bundle.articles, bundle.countries);
    return (
      renderBanner(home) +
      renderLiveStatus(home) +
      renderSearch(bundle.relationships, routes) +
      '<div class="gsh-grid">' +
      panel("gsh-events", "Current Events", routes.articles, "All articles", renderEventList(events)) +
      panel(
        "gsh-take",
        "Featured Waypoint’s Take",
        routes.articles + "?id=" + encodeURIComponent((home.featuredTake && home.featuredTake.articleId) || ""),
        "Open source brief",
        renderFeaturedTake(home, bundle.articles, bundle.industries)
      ) +
      panel(
        "gsh-rel",
        "Featured Relationship",
        routes.relationships +
          "?entity=" +
          encodeURIComponent((home.featuredRelationship && home.featuredRelationship.rootEntityId) || ""),
        "Open cascade",
        renderFeaturedRelationship(home, bundle.relationships)
      ) +
      panel(
        "gsh-countries",
        "Most Affected Countries",
        routes.countries,
        "Country Intelligence",
        renderCountries(home, bundle.countries)
      ) +
      panel(
        "gsh-industries",
        "Industries Under Pressure",
        routes.industries,
        "Industry Intelligence",
        renderIndustries(home, bundle.industries)
      ) +
      panel(
        "gsh-citizen",
        "Citizen Impact Summary",
        routes.citizenImpact,
        "Citizen Impact",
        renderCitizen(home, bundle.citizenImpact)
      ) +
      panel(
        "gsh-articles",
        "Latest Articles",
        routes.articles,
        "Articles",
        renderArticles(home, bundle.articles),
        true
      ) +
      "</div>"
    );
  }

  function mount(el, options) {
    if (!el) return null;
    options = options || {};
    var base = options.dataBase || "../../data/global-signals/";
    var urls = {
      home: options.homeUrl || base + "home/home.json",
      articles: options.articlesUrl || base + "articles/articles.json",
      countries: options.countriesUrl || base + "countries/countries.json",
      industries: options.industriesUrl || base + "industries/industries.json",
      citizenImpact: options.citizenImpactUrl || base + "citizen-impact/citizen-impact.json",
      relationships: options.relationshipsUrl || base + "relationships/relationships.json"
    };

    el.setAttribute("data-gsh-state", "loading");
    el.innerHTML = '<p class="gsh-empty" role="status">Loading Global Signals dashboard…</p>';

    return Promise.all([
      fetchJson(urls.home),
      fetchJson(urls.articles),
      fetchJson(urls.countries),
      fetchJson(urls.industries),
      fetchJson(urls.citizenImpact),
      fetchJson(urls.relationships)
    ])
      .then(function (parts) {
        var bundle = {
          home: parts[0],
          articles: parts[1],
          countries: parts[2],
          industries: parts[3],
          citizenImpact: parts[4],
          relationships: parts[5]
        };
        el.setAttribute("data-gsh-state", "ready");
        el.innerHTML = renderBoard(bundle);
        bindSearch(el, bundle.home.moduleRoutes || {});
        var retryBtn = el.querySelector("[data-wds-live-retry]");
        if (retryBtn) {
          retryBtn.addEventListener("click", function (ev) {
            ev.preventDefault();
            mount(el, options);
          });
        }
        return bundle;
      })
      .catch(function (err) {
        el.setAttribute("data-gsh-state", "error");
        el.innerHTML =
          '<p class="gsh-empty" role="alert">Could not load the Global Signals dashboard. ' +
          esc(err && err.message ? err.message : "Unknown error") +
          "</p>";
        return null;
      });
  }

  GS.home = {
    mount: mount
  };
})(typeof window !== "undefined" ? window : globalThis);
