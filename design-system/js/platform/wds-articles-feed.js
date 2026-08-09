/**
 * Waypoint Articles feed UI — curated RSS article cards with filters and honesty states.
 * Loads /data/articles/articles.json (+ health). Original publishers remain the destination.
 */
(function (global) {
  "use strict";

  var PREFS_KEY = "waypoint.articles.prefs.v1";

  function esc(s) {
    if (global.WDS && WDS.escapeHtml) return WDS.escapeHtml(s);
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function loadPrefs() {
    try {
      return JSON.parse(global.localStorage.getItem(PREFS_KEY) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function savePrefs(prefs) {
    try {
      global.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs || {}));
    } catch (e) {
      /* ignore quota */
    }
  }

  function formatDate(iso) {
    if (!iso) return "Date unavailable";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "Date unavailable";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function provenanceLabel(kind, value) {
    if (kind === "summary") {
      if (value === "ai-generated") return "AI-generated summary";
      if (value === "editor-written") return "Editor-written summary";
      if (value === "unavailable") return "Summary unavailable";
      return "Feed-description summary · source facts";
    }
    if (global.WDS && WDS.take && WDS.take.provenanceLabel && kind === "take") {
      return WDS.take.provenanceLabel(value);
    }
    if (value === "generated") return "Generated take · interpretation, not a score";
    if (value === "editor-written") return "Editor-written take · interpretation, not a score";
    if (value === "unavailable") return "Waypoint’s Take unavailable";
    return "Fallback take · interpretation, not a score";
  }

  function renderTakeSection(article) {
    var opts = {
      body: article.waypointTake,
      summary: article.summary,
      provenance: article.takeProvenance,
      meta: provenanceLabel("take", article.takeProvenance)
    };
    if (global.WDS && WDS.take && typeof WDS.take.renderArticleHtml === "function") {
      return WDS.take.renderArticleHtml(opts);
    }
    var body = String(article.waypointTake || "").trim();
    var unavailable = !body || article.takeProvenance === "unavailable";
    if (unavailable) {
      return (
        '<section class="wds-take wds-take--article wds-take--restrained waf-card__take" data-take-surface="article" data-take-kind="restrained" aria-label="Waypoint’s Take">' +
        '<h3 class="wds-take__title">Waypoint’s Take</h3>' +
        '<p class="wds-take__body">No Waypoint’s Take is available for this item yet. We will not invent one.</p>' +
        '<p class="wds-take__meta">Optional · not invented</p>' +
        "</section>"
      );
    }
    return (
      '<section class="wds-take wds-take--article waf-card__take" data-take-surface="article" data-take-kind="interpretation" aria-label="Waypoint’s Take">' +
      '<h3 class="wds-take__title">Waypoint’s Take</h3>' +
      '<p class="wds-take__body">' +
      esc(body) +
      "</p>" +
      '<p class="wds-take__meta">' +
      esc(opts.meta) +
      "</p>" +
      "</section>"
    );
  }

  function isStale(data) {
    if (!data || !data.staleAfter) return false;
    return Date.now() > Date.parse(data.staleAfter);
  }

  function articleMatches(article, state) {
    if (!article) return false;
    if (state.category && state.category !== "all") {
      if ((article.categories || []).indexOf(state.category) < 0) return false;
    }
    if (state.geo && state.geo !== "all") {
      if ((article.geographicScopes || []).indexOf(state.geo) < 0) return false;
    }
    if (state.query) {
      var q = state.query.toLowerCase();
      var blob = [
        article.title,
        article.summary,
        article.waypointTake,
        article.sourceName,
        (article.categories || []).join(" "),
        (article.geographicScopes || []).join(" "),
        (article.placeReferences || []).join(" ")
      ]
        .join(" ")
        .toLowerCase();
      if (blob.indexOf(q) < 0) return false;
    }
    return true;
  }

  function articlesForView(data, view) {
    var all = (data && data.articles) || [];
    var byId = Object.create(null);
    all.forEach(function (a) {
      byId[a.id] = a;
    });
    var views = (data && data.views) || {};
    var ids = views[view] || views.forYou || all.map(function (a) {
      return a.id;
    });
    if (view === "latest") {
      return all.slice().sort(function (a, b) {
        return Date.parse(b.publishedAt || 0) - Date.parse(a.publishedAt || 0);
      });
    }
    return ids.map(function (id) {
      return byId[id];
    }).filter(Boolean);
  }

  function relatedAction(article, depth) {
    var products = article.relatedProducts || [];
    if (!products.length) return "";
    var p = products[0];
    var href = p.href || "#";
    if (depth >= 1 && href.charAt(0) === "/") {
      href = ".." + href;
    } else if (depth >= 1 && href.indexOf("/apps/") === 0) {
      href = ".." + href;
    }
    // From /articles/ depth 0, absolute site paths need leading ..
    if (depth === 0 && href.charAt(0) === "/") {
      href = ".." + href;
    }
    return (
      '<p class="waf-card__related"><span class="waf-card__related-label">Related in Waypoint</span> ' +
      '<a class="waf-card__related-link" href="' +
      esc(href) +
      '">' +
      esc(p.label) +
      "</a>" +
      (p.reason ? ' <span class="waf-card__related-reason">— ' + esc(p.reason) + "</span>" : "") +
      "</p>"
    );
  }

  function renderCard(article, depth) {
    var cats = (article.categories || []).slice(0, 2);
    var geo = (article.geographicScopes || [])[0] || "National";
    var summaryProv = provenanceLabel("summary", article.summaryProvenance);

    return (
      '<article class="waf-card" data-article-id="' +
      esc(article.id) +
      '" data-article-origin="' +
      esc(article.origin || article.projectId || "studio") +
      '">' +
      '<header class="waf-card__meta">' +
      '<span class="waf-chip waf-chip--geo">' +
      esc(geo) +
      "</span>" +
      cats
        .map(function (c) {
          return '<span class="waf-chip waf-chip--cat">' + esc(c) + "</span>";
        })
        .join("") +
      (article.projectLabel
        ? '<span class="waf-chip waf-chip--project">' + esc(article.projectLabel) + "</span>"
        : "") +
      "</header>" +
      '<h2 class="waf-card__title">' +
      esc(article.title) +
      "</h2>" +
      '<p class="waf-card__source">' +
      '<span class="waf-card__source-name">' +
      esc(article.sourceName) +
      "</span>" +
      ' · <time datetime="' +
      esc(article.publishedAt || "") +
      '">' +
      esc(formatDate(article.publishedAt)) +
      "</time>" +
      ' · <span class="waf-card__score" title="' +
      esc((article.relevanceReasons || []).join(" · ")) +
      '">Relevance ' +
      esc(String(article.relevanceScore != null ? article.relevanceScore : "—")) +
      "</span>" +
      "</p>" +
      '<section class="waf-card__summary" aria-label="Summary">' +
      '<p class="waf-card__summary-label">Summary</p>' +
      "<p>" +
      esc(article.summary || "Summary unavailable.") +
      "</p>" +
      '<p class="waf-card__prov">' +
      esc(summaryProv) +
      "</p>" +
      "</section>" +
      renderTakeSection(article) +
      relatedAction(article, depth) +
      '<p class="waf-card__cta">' +
      '<a class="wds-btn wds-btn--primary" href="' +
      esc(article.canonicalUrl) +
      '" rel="noopener noreferrer" target="_blank">Read original article</a>' +
      '<span class="waf-card__attr">Opens the publisher’s page — Waypoint does not host the full article.</span>' +
      "</p>" +
      "</article>"
    );
  }

  function renderEmpty(reason) {
    var messages = {
      none: "No curated articles are available right now. The feed registry is ready; try refreshing later.",
      filtered: "No articles match these filters. Clear search or broaden category and region.",
      unavailable: "Article feeds are temporarily unavailable. Waypoint will not invent stories to fill this space.",
      stale: "Article data may be stale. Showing the last successful curation until the next refresh."
    };
    return (
      '<div class="waf-empty" role="status">' +
      "<p>" +
      esc(messages[reason] || messages.none) +
      "</p>" +
      "</div>"
    );
  }

  function healthBadge(health, data) {
    var LS = global.WDS && WDS.liveStatus;
    if (LS) {
      var spec = LS.fromArticlesHealth(health, data, { isStale: isStale });
      return LS.renderHtml(spec);
    }
    var status = (health && health.status) || "unknown";
    var stale = isStale(data) || status === "stale" || !!(data && data.retainedPrevious);
    var label =
      status === "ok"
        ? "Feeds fresh"
        : status === "partial"
          ? "Partial refresh"
          : status === "stale"
            ? "Showing last good data"
            : "Feeds unavailable";
    if (stale && status !== "stale") label = "Stale data — " + label;
    return (
      '<p class="waf-health" data-health="' +
      esc(stale ? "stale" : status) +
      '" role="status">' +
      '<span class="waf-health__dot" aria-hidden="true"></span>' +
      esc(label) +
      (data && data.generatedAt
        ? ' · Updated <time datetime="' + esc(data.generatedAt) + '">' + esc(formatDate(data.generatedAt)) + "</time>"
        : "") +
      "</p>"
    );
  }

  function uniqueValues(articles, key) {
    var set = Object.create(null);
    (articles || []).forEach(function (a) {
      (a[key] || []).forEach(function (v) {
        set[v] = true;
      });
    });
    return Object.keys(set).sort();
  }

  function mountFeed(el, options) {
    if (!el) return;
    options = options || {};
    var depth = options.depth != null ? options.depth : 0;
    var dataUrl = options.dataUrl || (depth === 0 ? "../data/articles/articles.json" : "../../data/articles/articles.json");
    // From /articles/ index, root-relative data path:
    if (depth === 0 && !options.dataUrl) dataUrl = "../data/articles/articles.json";
    var healthUrl = options.healthUrl || dataUrl.replace(/articles\.json$/, "health.json");
    var prefs = loadPrefs();
    var state = {
      view: prefs.view || "forYou",
      category: prefs.category || "all",
      geo: prefs.geo || "all",
      query: ""
    };

    el.setAttribute("aria-busy", "true");
    el.innerHTML = '<p class="wds-honesty">Loading curated articles…</p>';

    Promise.all([
      fetch(dataUrl, { cache: "no-store" }).then(function (r) {
        if (!r.ok) throw new Error("articles " + r.status);
        return r.json();
      }),
      fetch(healthUrl, { cache: "no-store" })
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .catch(function () {
          return null;
        })
    ])
      .then(function (pair) {
        var data = pair[0];
        var health = pair[1];
        render(data, health);
      })
      .catch(function () {
        el.setAttribute("aria-busy", "false");
        el.innerHTML = renderEmpty("unavailable");
      });

    function render(data, health) {
      var articles = (data && data.articles) || [];
      var categories = uniqueValues(articles, "categories");
      var geos = uniqueValues(articles, "geographicScopes");
      var views = [
        { id: "forYou", label: "For You" },
        { id: "local", label: "Local" },
        { id: "latest", label: "Latest" },
        { id: "seasonal", label: "Seasonal" },
        { id: "photography", label: "Photography" },
        { id: "science", label: "Science" }
      ];

      function paint() {
        prefs.view = state.view;
        prefs.category = state.category;
        prefs.geo = state.geo;
        savePrefs(prefs);

        var list = articlesForView(data, state.view).filter(function (a) {
          return articleMatches(a, state);
        });

        var body;
        if (!articles.length) {
          body = renderEmpty(health && health.status === "unavailable" ? "unavailable" : "none");
        } else if (!list.length) {
          body = renderEmpty("filtered");
        } else {
          body =
            '<div class="waf-grid" role="list">' +
            list
              .map(function (a) {
                return '<div role="listitem">' + renderCard(a, depth) + "</div>";
              })
              .join("") +
            "</div>";
        }

        var staleNote = isStale(data) ? renderEmpty("stale") : "";

        el.setAttribute("aria-busy", "false");
        el.innerHTML =
          '<div class="waf">' +
          healthBadge(health, data) +
          '<p class="waf-lede">Curated outdoor and environmental reporting from trustworthy publishers. Waypoint summarizes feed metadata and adds a field take — the original article stays on the publisher’s site.</p>' +
          '<div class="waf-toolbar" role="region" aria-label="Article filters">' +
          '<div class="waf-views" role="tablist" aria-label="Feed views">' +
          views
            .map(function (v) {
              return (
                '<button type="button" class="waf-view' +
                (state.view === v.id ? " is-active" : "") +
                '" data-view="' +
                esc(v.id) +
                '" role="tab" aria-selected="' +
                (state.view === v.id ? "true" : "false") +
                '">' +
                esc(v.label) +
                "</button>"
              );
            })
            .join("") +
          "</div>" +
          '<div class="waf-filters">' +
          '<label class="waf-filter"><span class="wds-visually-hidden">Search</span>' +
          '<input type="search" data-waf-search placeholder="Search headlines, sources, places…" value="' +
          esc(state.query) +
          '"></label>' +
          '<label class="waf-filter">Category <select data-waf-category>' +
          '<option value="all">All categories</option>' +
          categories
            .map(function (c) {
              return (
                '<option value="' +
                esc(c) +
                '"' +
                (state.category === c ? " selected" : "") +
                ">" +
                esc(c) +
                "</option>"
              );
            })
            .join("") +
          "</select></label>" +
          '<label class="waf-filter">Region <select data-waf-geo>' +
          '<option value="all">All regions</option>' +
          geos
            .map(function (g) {
              return (
                '<option value="' +
                esc(g) +
                '"' +
                (state.geo === g ? " selected" : "") +
                ">" +
                esc(g) +
                "</option>"
              );
            })
            .join("") +
          "</select></label>" +
          "</div>" +
          '<p class="waf-count" role="status">' +
          esc(String(list.length)) +
          " articles · RSS <a href=\"../feeds/waypoint-articles.xml\">/feeds/waypoint-articles.xml</a></p>" +
          "</div>" +
          staleNote +
          body +
          '<aside class="waf-editorial">' +
          "<h2>Editorial samples</h2>" +
          '<p>Waypoint also publishes short Studio essays. <a href="samples/reading-todays-conditions.html">Reading today’s conditions</a> (labeled sample). Live topic filters are above — Wildlife, Climate, Conservation, and related field categories.</p>' +
          "</aside>" +
          "</div>";

        el.querySelectorAll("[data-view]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            state.view = btn.getAttribute("data-view");
            paint();
          });
        });
        var search = el.querySelector("[data-waf-search]");
        if (search) {
          search.addEventListener("input", function () {
            state.query = search.value || "";
            paint();
            var again = el.querySelector("[data-waf-search]");
            if (again) {
              again.focus();
              var len = again.value.length;
              again.setSelectionRange(len, len);
            }
          });
        }
        var cat = el.querySelector("[data-waf-category]");
        if (cat) {
          cat.addEventListener("change", function () {
            state.category = cat.value;
            paint();
          });
        }
        var geoSel = el.querySelector("[data-waf-geo]");
        if (geoSel) {
          geoSel.addEventListener("change", function () {
            state.geo = geoSel.value;
            paint();
          });
        }
        var retryBtn = el.querySelector("[data-wds-live-retry]");
        if (retryBtn) {
          retryBtn.addEventListener("click", function (ev) {
            ev.preventDefault();
            global.location.reload();
          });
        }
      }

      paint();
    }
  }

  /**
   * Quiet related-content mount for Scenes / Sheds / Photo Coach.
   * options.topics: string[] category hints
   * options.limit: number
   */
  function mountRelated(el, options) {
    if (!el) return;
    options = options || {};
    var depth = options.depth != null ? options.depth : 1;
    var limit = options.limit || 1;
    var topics = (options.topics || []).map(function (t) {
      return String(t).toLowerCase();
    });
    var dataUrl =
      options.dataUrl ||
      (depth <= 0
        ? "data/articles/articles.json"
        : depth === 1
          ? "../../data/articles/articles.json"
          : "../../../data/articles/articles.json");

    fetch(dataUrl, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("related " + r.status);
        return r.json();
      })
      .then(function (data) {
        var articles = (data.articles || []).slice();
        if (topics.length) {
          articles = articles.filter(function (a) {
            var blob = ((a.categories || []).join(" ") + " " + a.title).toLowerCase();
            return topics.some(function (t) {
              return blob.indexOf(t) >= 0;
            });
          });
        }
        articles.sort(function (a, b) {
          return (b.relevanceScore || 0) - (a.relevanceScore || 0);
        });
        var pick = articles.slice(0, limit);
        if (!pick.length) {
          el.hidden = true;
          el.innerHTML = "";
          return;
        }
        el.hidden = false;
        el.className = (el.className + " waf-related").trim();
        el.innerHTML =
          '<p class="waf-related__eyebrow">Related field reading</p>' +
          pick
            .map(function (a) {
              return (
                '<article class="waf-related__card">' +
                "<h3>" +
                esc(a.title) +
                "</h3>" +
                '<p class="waf-related__source">' +
                esc(a.sourceName) +
                " · " +
                esc((a.geographicScopes || [])[0] || "") +
                "</p>" +
                "<p>" +
                esc((a.summary || "").slice(0, 180)) +
                (a.summary && a.summary.length > 180 ? "…" : "") +
                "</p>" +
                '<p><a href="' +
                esc(a.canonicalUrl) +
                '" rel="noopener noreferrer" target="_blank">Read original</a>' +
                ' · <a href="' +
                (depth <= 0 ? "articles/" : depth === 1 ? "../../articles/" : "../../../articles/") +
                '">All Articles</a></p>' +
                "</article>"
              );
            })
            .join("");
      })
      .catch(function () {
        el.hidden = true;
      });
  }

  global.WDS = global.WDS || {};
  global.WDS.articlesFeed = {
    mountFeed: mountFeed,
    mountRelated: mountRelated,
    provenanceLabel: provenanceLabel,
    isStale: isStale
  };
})(typeof window !== "undefined" ? window : globalThis);
