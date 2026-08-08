/**
 * Global Signals — Industry Intelligence (index + detail).
 * Loads curated-baseline JSON. Does not invent missing Takes or live events.
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

  var CONFIDENCE_ALLOWED = ["Observed", "High", "Medium", "Low", "Unknown"];
  var HORIZON_ALLOWED = ["Immediate", "Days", "Weeks", "Months", "Long-term"];

  function normalizeConfidence(value, opts) {
    opts = opts || {};
    if (value == null || value === "") return "Unknown";
    var lower = String(value).trim().toLowerCase();
    if (lower === "moderate") return "Medium";
    if (lower === "speculative") return "Low";
    var mapped = {
      observed: "Observed",
      high: "High",
      medium: "Medium",
      low: "Low",
      unknown: "Unknown"
    };
    var out = mapped[lower];
    if (!out) return "Unknown";
    if (opts.predicted && out === "Observed") return "Unknown";
    return out;
  }

  function normalizeTimeHorizon(value) {
    if (value == null || value === "") return "Unknown";
    var compact = String(value)
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-");
    var mapped = {
      immediate: "Immediate",
      days: "Days",
      day: "Days",
      weeks: "Weeks",
      week: "Weeks",
      months: "Months",
      month: "Months",
      "long-term": "Long-term",
      longterm: "Long-term"
    };
    return mapped[compact] || "Unknown";
  }

  function normalizeClaim(raw, predicted) {
    if (!raw) {
      return { text: "", confidence: "Unknown", horizon: "Unknown" };
    }
    if (typeof raw === "string") {
      return {
        text: raw.trim(),
        confidence: normalizeConfidence(null, { predicted: predicted }),
        horizon: "Unknown"
      };
    }
    return {
      text: String(raw.text || "").trim(),
      confidence: normalizeConfidence(raw.confidence, { predicted: !!predicted }),
      horizon: normalizeTimeHorizon(raw.horizon || raw.timeHorizon || raw.timeframe)
    };
  }

  function normalizeItems(list, predicted) {
    if (!Array.isArray(list)) return [];
    return list
      .map(function (item) {
        if (!item || typeof item !== "object") return null;
        var label = String(item.label || "").trim();
        if (!label) return null;
        return {
          label: label,
          detail: String(item.detail || item.text || "").trim(),
          confidence: normalizeConfidence(item.confidence, { predicted: !!predicted }),
          horizon: normalizeTimeHorizon(item.horizon || item.timeHorizon || item.timeframe)
        };
      })
      .filter(Boolean);
  }

  function normalizeIndustry(raw) {
    if (!raw || typeof raw !== "object") return null;
    var id = String(raw.id || "").trim();
    var slug = String(raw.slug || "").trim();
    if (!id || !slug) return null;
    var take = raw.waypointsTake || raw.waypointTake || null;
    if (typeof take === "string") take = { analysis: take };

    var countries = Array.isArray(raw.majorCountries)
      ? raw.majorCountries
          .map(function (c) {
            if (!c || typeof c !== "object") return null;
            var cid = String(c.id || "").trim();
            var name = String(c.name || "").trim();
            if (!cid && !name) return null;
            return {
              id: cid || null,
              name: name || "Country unavailable",
              slug: String(c.slug || "").trim() || null,
              role: String(c.role || "").trim()
            };
          })
          .filter(Boolean)
      : [];

    var supply = raw.supplyChain || {};
    var nodes = Array.isArray(supply.nodes)
      ? supply.nodes
          .map(function (n) {
            if (!n || typeof n !== "object") return null;
            var label = String(n.label || "").trim();
            if (!label) return null;
            return {
              label: label,
              type: String(n.type || "node").trim() || "node",
              note: String(n.note || "").trim()
            };
          })
          .filter(Boolean)
      : [];

    var articles = Array.isArray(raw.relatedArticles)
      ? raw.relatedArticles
          .map(function (a) {
            if (!a || typeof a !== "object") return null;
            var aid = String(a.id || "").trim();
            if (!aid) return null;
            return {
              id: aid,
              headline: String(a.headline || "").trim() || "Untitled brief"
            };
          })
          .filter(Boolean)
      : [];

    var citizens = Array.isArray(raw.citizenImpacts)
      ? raw.citizenImpacts
          .map(function (c) {
            if (!c || typeof c !== "object") return null;
            var label = String(c.label || "").trim();
            if (!label) return null;
            return {
              id: String(c.id || "").trim() || null,
              label: label,
              detail: String(c.detail || "").trim(),
              confidence: normalizeConfidence(c.confidence, { predicted: true }),
              horizon: normalizeTimeHorizon(c.horizon || c.timeHorizon)
            };
          })
          .filter(Boolean)
      : [];

    var deps = Array.isArray(raw.topDependencies)
      ? raw.topDependencies
          .map(function (d) {
            if (!d || typeof d !== "object") return null;
            var name = String(d.name || "").trim();
            var slugDep = String(d.slug || "").trim();
            var industryId = String(d.industryId || "").trim();
            if (!name && !slugDep && !industryId) return null;
            return {
              industryId: industryId || null,
              name: name || "Dependency unavailable",
              slug: slugDep || null,
              relation: String(d.relation || "").trim(),
              confidence: normalizeConfidence(d.confidence, { predicted: true })
            };
          })
          .filter(Boolean)
      : [];

    return {
      id: id,
      slug: slug,
      name: String(raw.name || "").trim() || "Untitled industry",
      tagline: String(raw.tagline || "").trim(),
      summary: String(raw.summary || "").trim(),
      whatIsHappening: normalizeClaim(raw.whatIsHappening, false),
      why: normalizeClaim(raw.why, true),
      threats: normalizeItems(raw.threats, true),
      opportunities: normalizeItems(raw.opportunities, true),
      majorCountries: countries,
      supplyChain: {
        overview: String(supply.overview || "").trim(),
        nodes: nodes
      },
      relatedArticles: articles,
      waypointsTake: take,
      citizenImpacts: citizens,
      topDependencies: deps,
      relatedIndustries: Array.isArray(raw.relatedIndustries)
        ? raw.relatedIndustries.map(function (x) {
            return String(x || "").trim();
          }).filter(Boolean)
        : [],
      taxonomyAliases: Array.isArray(raw.taxonomyAliases)
        ? raw.taxonomyAliases.map(function (x) {
            return String(x || "").trim();
          }).filter(Boolean)
        : []
    };
  }

  function badge(label, kind) {
    var cls = "gsi-badge";
    if (kind === "confidence") {
      cls += " gsi-badge--confidence";
      return (
        '<span class="' +
        cls +
        '" data-confidence="' +
        esc(label) +
        '">' +
        esc(label) +
        "</span>"
      );
    }
    return '<span class="' + cls + '">' + esc(label) + "</span>";
  }

  function claimMeta(claim) {
    return (
      '<p class="gsi-meta">' +
      badge("Confidence · " + claim.confidence, "confidence") +
      badge("Horizon · " + claim.horizon) +
      "</p>"
    );
  }

  function renderBanner(meta) {
    var label = (meta && meta.modeLabel) || "Curated baseline";
    var banner =
      (meta && meta.honesty && meta.honesty.banner) ||
      "Curated baseline intelligence — not a live breaking-news feed.";
    return (
      '<aside class="gsi-banner" role="status">' +
      '<p class="gsi-badge gsi-badge--mode">' +
      esc(label) +
      "</p>" +
      "<p>" +
      esc(banner) +
      "</p></aside>"
    );
  }

  function takeHasSubstance(take) {
    if (!take) return false;
    if (typeof take === "string") return take.trim().length > 0;
    return Boolean(
      (take.whyItMatters && String(take.whyItMatters).trim()) ||
        (take.analysis && String(take.analysis).trim())
    );
  }

  function renderTake(take) {
    if (!takeHasSubstance(take)) {
      return (
        '<section class="gsi-take gsi-take--empty" aria-labelledby="gsi-take-title">' +
        '<h2 id="gsi-take-title">Waypoint\u2019s Take</h2>' +
        '<p class="gsi-note">Analysis · interpretation, not established fact</p>' +
        "<p>No Waypoint\u2019s Take is available for this industry. We will not invent one.</p>" +
        "</section>"
      );
    }
    var parts = [];
    if (take.whyItMatters && String(take.whyItMatters).trim()) {
      parts.push(
        "<p><strong>Why it matters.</strong> " + esc(take.whyItMatters) + "</p>"
      );
    }
    if (take.analysis && String(take.analysis).trim()) {
      parts.push("<p>" + esc(take.analysis) + "</p>");
    }
    return (
      '<section class="gsi-take" aria-labelledby="gsi-take-title">' +
      '<h2 id="gsi-take-title">Waypoint\u2019s Take</h2>' +
      '<p class="gsi-note">Analysis · interpretation, not established fact</p>' +
      parts.join("") +
      "</section>"
    );
  }

  function renderItemList(title, id, items, emptyMsg) {
    if (!items || !items.length) {
      return (
        '<section class="gsi-section" aria-labelledby="' +
        esc(id) +
        '">' +
        "<h2 id=\"" +
        esc(id) +
        '">' +
        esc(title) +
        "</h2>" +
        '<p class="gsi-empty">' +
        esc(emptyMsg || "Not tagged.") +
        "</p></section>"
      );
    }
    var lis = items
      .map(function (item) {
        return (
          '<li class="gsi-item">' +
          "<h3>" +
          esc(item.label) +
          "</h3>" +
          '<p class="gsi-meta">' +
          badge(item.confidence, "confidence") +
          badge(item.horizon) +
          "</p>" +
          (item.detail ? "<p>" + esc(item.detail) + "</p>" : "") +
          "</li>"
        );
      })
      .join("");
    return (
      '<section class="gsi-section" aria-labelledby="' +
      esc(id) +
      '">' +
      "<h2 id=\"" +
      esc(id) +
      '">' +
      esc(title) +
      "</h2>" +
      '<ul class="gsi-item-list">' +
      lis +
      "</ul></section>"
    );
  }

  function countryHref(c, crossLinks) {
    var base =
      (crossLinks && crossLinks.countriesBase) ||
      "/side-trails/global-signals/countries/";
    if (c.slug) return base + encodeURIComponent(c.slug) + "/";
    if (c.id) return base + "?" + "id=" + encodeURIComponent(c.id);
    return base;
  }

  function articleHref(a, crossLinks) {
    var base =
      (crossLinks && crossLinks.articlesBase) ||
      "/side-trails/global-signals/articles/";
    return base + "?id=" + encodeURIComponent(a.id);
  }

  function citizenHref(c, crossLinks) {
    var base =
      (crossLinks && crossLinks.citizenImpactBase) ||
      "/side-trails/global-signals/citizen-impact/";
    if (c.id) return base + "?category=" + encodeURIComponent(c.id);
    return base + "?category=" + encodeURIComponent(c.label);
  }

  function industryHref(slug, relative) {
    if (relative) return "../" + encodeURIComponent(slug) + "/";
    return "./" + encodeURIComponent(slug) + "/";
  }

  function renderCountries(countries, crossLinks) {
    if (!countries.length) {
      return (
        '<section class="gsi-section" aria-labelledby="gsi-countries">' +
        '<h2 id="gsi-countries">Major countries involved</h2>' +
        '<p class="gsi-empty">Countries not tagged.</p></section>'
      );
    }
    var lis = countries
      .map(function (c) {
        return (
          '<li class="gsi-link-card">' +
          '<a href="' +
          esc(countryHref(c, crossLinks)) +
          '" data-entity="country" data-id="' +
          esc(c.id || "") +
          '">' +
          esc(c.name) +
          "</a>" +
          (c.role ? "<p>" + esc(c.role) + "</p>" : "") +
          '<p class="gsi-softlink">Country Intelligence soft-link · stable id ' +
          esc(c.id || "n/a") +
          "</p></li>"
        );
      })
      .join("");
    return (
      '<section class="gsi-section" aria-labelledby="gsi-countries">' +
      '<h2 id="gsi-countries">Major countries involved</h2>' +
      '<ul class="gsi-link-grid">' +
      lis +
      "</ul></section>"
    );
  }

  function renderSupply(supply) {
    var overview = supply.overview
      ? "<p>" + esc(supply.overview) + "</p>"
      : '<p class="gsi-empty">Supply chain overview unavailable.</p>';
    var chain = "";
    if (supply.nodes && supply.nodes.length) {
      chain =
        '<ol class="gsi-chain" aria-label="Supply chain stages">' +
        supply.nodes
          .map(function (n, i) {
            return (
              '<li class="gsi-chain__step" data-type="' +
              esc(n.type) +
              '">' +
              "<strong>" +
              esc(n.label) +
              "</strong>" +
              (n.note ? "<p>" + esc(n.note) + "</p>" : "") +
              (i < supply.nodes.length - 1
                ? '<span class="gsi-chain__arrow" aria-hidden="true">→</span>'
                : "") +
              "</li>"
            );
          })
          .join("") +
        "</ol>";
    }
    return (
      '<section class="gsi-section" aria-labelledby="gsi-supply">' +
      '<h2 id="gsi-supply">Supply chain</h2>' +
      overview +
      chain +
      "</section>"
    );
  }

  function renderArticles(articles, crossLinks) {
    if (!articles.length) {
      return (
        '<section class="gsi-section" aria-labelledby="gsi-articles">' +
        '<h2 id="gsi-articles">Related articles</h2>' +
        '<p class="gsi-empty">No related articles tagged.</p></section>'
      );
    }
    var lis = articles
      .map(function (a) {
        return (
          '<li><a href="' +
          esc(articleHref(a, crossLinks)) +
          '" data-entity="article" data-id="' +
          esc(a.id) +
          '">' +
          esc(a.headline) +
          "</a>" +
          '<span class="gsi-id">' +
          esc(a.id) +
          "</span></li>"
        );
      })
      .join("");
    return (
      '<section class="gsi-section" aria-labelledby="gsi-articles">' +
      '<h2 id="gsi-articles">Related articles</h2>' +
      '<ul class="gsi-plain-list">' +
      lis +
      "</ul></section>"
    );
  }

  function renderCitizens(items, crossLinks) {
    if (!items.length) {
      return (
        '<section class="gsi-section" aria-labelledby="gsi-citizen">' +
        '<h2 id="gsi-citizen">Citizen impacts</h2>' +
        '<p class="gsi-empty">Citizen impacts not tagged.</p></section>'
      );
    }
    var lis = items
      .map(function (c) {
        return (
          '<li class="gsi-item">' +
          '<h3><a href="' +
          esc(citizenHref(c, crossLinks)) +
          '" data-entity="citizen-impact" data-id="' +
          esc(c.id || "") +
          '">' +
          esc(c.label) +
          "</a></h3>" +
          '<p class="gsi-meta">' +
          badge(c.confidence, "confidence") +
          badge(c.horizon) +
          "</p>" +
          (c.detail ? "<p>" + esc(c.detail) + "</p>" : "") +
          "</li>"
        );
      })
      .join("");
    return (
      '<section class="gsi-section" aria-labelledby="gsi-citizen">' +
      '<h2 id="gsi-citizen">Citizen impacts</h2>' +
      '<p class="gsi-note">Soft-links to Citizen Impact categories (parallel module may still be a shell).</p>' +
      '<ul class="gsi-item-list">' +
      lis +
      "</ul></section>"
    );
  }

  function renderDeps(deps, byId) {
    if (!deps.length) {
      return (
        '<section class="gsi-section" aria-labelledby="gsi-deps">' +
        '<h2 id="gsi-deps">Top dependencies</h2>' +
        '<p class="gsi-empty">Dependencies not tagged.</p></section>'
      );
    }
    var lis = deps
      .map(function (d) {
        var href = d.slug ? industryHref(d.slug, true) : null;
        if (!href && d.industryId && byId[d.industryId]) {
          href = industryHref(byId[d.industryId].slug, true);
        }
        var title = href
          ? '<a href="' +
            esc(href) +
            '" data-entity="industry" data-id="' +
            esc(d.industryId || "") +
            '">' +
            esc(d.name) +
            "</a>"
          : esc(d.name);
        return (
          '<li class="gsi-item"><h3>' +
          title +
          "</h3>" +
          '<p class="gsi-meta">' +
          badge(d.confidence, "confidence") +
          "</p>" +
          (d.relation ? "<p>" + esc(d.relation) + "</p>" : "") +
          "</li>"
        );
      })
      .join("");
    return (
      '<section class="gsi-section" aria-labelledby="gsi-deps">' +
      '<h2 id="gsi-deps">Top dependencies</h2>' +
      '<ul class="gsi-item-list">' +
      lis +
      "</ul></section>"
    );
  }

  function renderRelatedIndustries(ids, byId) {
    var list = (ids || [])
      .map(function (id) {
        return byId[id];
      })
      .filter(Boolean);
    if (!list.length) return "";
    var lis = list
      .map(function (ind) {
        return (
          '<li><a href="' +
          esc(industryHref(ind.slug, true)) +
          '" data-entity="industry" data-id="' +
          esc(ind.id) +
          '">' +
          esc(ind.name) +
          "</a></li>"
        );
      })
      .join("");
    return (
      '<section class="gsi-section" aria-labelledby="gsi-related">' +
      '<h2 id="gsi-related">Related industries</h2>' +
      '<ul class="gsi-chip-links">' +
      lis +
      "</ul></section>"
    );
  }


  function industryGraphCta(ind) {
    if (!ind || !ind.id) return "";
    var gl = GS.graphLinks;
    var href =
      gl && gl.focusUrl
        ? gl.focusUrl(ind.id, { base: "../relationship-graph/" })
        : "../relationship-graph/?focus=" + encodeURIComponent(ind.id);
    return (
      '<a class="gs-cta" href="' +
      esc(href) +
      '" data-gs-graph-focus="' +
      esc(ind.id) +
      '">Open in Relationship Graph</a>'
    );
  }

  function renderIndexCard(ind) {
    return (
      '<article class="gsi-card" data-gsi-id="' +
      esc(ind.id) +
      '">' +
      '<p class="gsi-meta">' +
      badge(ind.id) +
      "</p>" +
      "<h2><a href=\"" +
      esc(industryHref(ind.slug, false)) +
      '">' +
      esc(ind.name) +
      "</a></h2>" +
      (ind.tagline ? '<p class="gsi-card__tagline">' + esc(ind.tagline) + "</p>" : "") +
      (ind.summary ? "<p>" + esc(ind.summary) + "</p>" : "") +
      '<p class="gsi-card__cta"><a class="gs-cta" href="' +
      esc(industryHref(ind.slug, false)) +
      '">Open industry</a> ' +
      industryGraphCta(ind) +
      "</p>" +
      "</article>"
    );
  }

  function renderIndex(payload) {
    var industries = (payload.industries || [])
      .map(normalizeIndustry)
      .filter(Boolean);
    if (!industries.length) {
      return (
        renderBanner(payload) +
        '<p class="gsi-empty" role="status">Industry intelligence will appear here when curated baselines are available. We will not invent live events.</p>'
      );
    }
    return (
      renderBanner(payload) +
      '<p class="gsi-count">' +
      industries.length +
      " industries · interconnected baselines</p>" +
      '<div class="gsi-grid">' +
      industries.map(renderIndexCard).join("") +
      "</div>" +
      '<nav class="gsi-crossnav" aria-label="Related Global Signals modules">' +
      "<h2>Explore connections</h2>" +
      "<ul>" +
      '<li><a href="../articles/">Articles</a></li>' +
      '<li><a href="../citizen-impact/">Citizen Impact</a></li>' +
      '<li><a class="gs-cta" href="../relationship-graph/">Explore in Relationship Graph</a></li>' +
      '<li><a href="../supply-chains/">Supply Chains</a></li>' +
      "</ul></nav>"
    );
  }

  function renderDetail(ind, payload, byId) {
    var cross = (payload && payload.crossLinks) || {};
    var what = ind.whatIsHappening;
    var why = ind.why;
    var gl = GS.graphLinks;
    var focusId = gl && gl.industryFocusId ? gl.industryFocusId(ind.id) : ind.id;
    var graphBase =
      (cross.relationshipGraphBase ||
        cross.relationshipExplorerBase ||
        (gl && gl.ROUTE) ||
        "/side-trails/global-signals/relationship-graph/");
    var relGraph =
      gl && gl.focusUrl
        ? gl.focusUrl(focusId, { base: graphBase })
        : graphBase.replace(/\/?$/, "/") + "?focus=" + encodeURIComponent(focusId);

    return (
      renderBanner(payload) +
      '<article class="gsi-detail" data-gsi-id="' +
      esc(ind.id) +
      '" data-gsi-slug="' +
      esc(ind.slug) +
      '">' +
      '<header class="gsi-detail__head">' +
      '<p class="gsi-meta">' +
      badge("Industry") +
      badge(ind.id) +
      "</p>" +
      "<h1>" +
      esc(ind.name) +
      "</h1>" +
      (ind.tagline ? '<p class="gsi-detail__tagline">' + esc(ind.tagline) + "</p>" : "") +
      (ind.summary ? "<p>" + esc(ind.summary) + "</p>" : "") +
      "</header>" +
      '<section class="gsi-section" aria-labelledby="gsi-what">' +
      '<h2 id="gsi-what">What is happening?</h2>' +
      '<p class="gsi-note">Curated baseline context — not a live ticker</p>' +
      claimMeta(what) +
      "<p>" +
      esc(what.text || "What-is-happening unavailable.") +
      "</p></section>" +
      '<section class="gsi-section" aria-labelledby="gsi-why">' +
      '<h2 id="gsi-why">Why?</h2>' +
      claimMeta(why) +
      "<p>" +
      esc(why.text || "Why unavailable.") +
      "</p></section>" +
      renderItemList("Current threats", "gsi-threats", ind.threats, "Threats not tagged.") +
      renderItemList(
        "Current opportunities",
        "gsi-opps",
        ind.opportunities,
        "Opportunities not tagged."
      ) +
      renderCountries(ind.majorCountries, cross) +
      renderSupply(ind.supplyChain) +
      renderArticles(ind.relatedArticles, cross) +
      renderTake(ind.waypointsTake) +
      renderCitizens(ind.citizenImpacts, cross) +
      renderDeps(ind.topDependencies, byId) +
      renderRelatedIndustries(ind.relatedIndustries, byId) +
      '<nav class="gsi-crossnav" aria-label="Interconnect">' +
      "<h2>Interconnect</h2>" +
      "<ul>" +
      '<li><a href="../">All industries</a></li>' +
      '<li><a href="../../articles/">Articles</a></li>' +
      '<li><a class="gs-cta" href="' +
      esc(relGraph) +
      '" data-gs-graph-focus="' +
      esc(focusId) +
      '">Open in Relationship Graph</a></li>' +
      '<li><a href="../../citizen-impact/">Citizen Impact</a></li>' +
      '<li><a href="../../">Global Signals</a></li>' +
      "</ul></nav>" +
      "</article>"
    );
  }

  function buildIndex(byId, list) {
    list.forEach(function (ind) {
      byId[ind.id] = ind;
    });
    return byId;
  }

  function resolveDataUrl(el, depth) {
    if (el && el.getAttribute("data-gsi-data")) return el.getAttribute("data-gsi-data");
    var d = typeof depth === "number" ? depth : 3;
    var prefix = "";
    for (var i = 0; i < d; i++) prefix += "../";
    return prefix + "data/global-signals/industries/industries.json";
  }

  function setState(el, state) {
    if (el) el.setAttribute("data-gsi-state", state);
  }

  function mountIndex(el, opts) {
    opts = opts || {};
    if (!el) return Promise.resolve(null);
    setState(el, "loading");
    el.innerHTML = '<p class="gsi-empty" role="status">Loading industry intelligence\u2026</p>';
    var url = opts.dataUrl || resolveDataUrl(el, opts.depth);
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (payload) {
        el.innerHTML = renderIndex(payload || {});
        setState(el, "ready");
        return payload;
      })
      .catch(function () {
        el.innerHTML =
          '<p class="gsi-empty" role="alert">Industry intelligence could not be loaded. The dataset may be unavailable — we will not invent content.</p>';
        setState(el, "error");
        return null;
      });
  }

  function mountDetail(el, opts) {
    opts = opts || {};
    if (!el) return Promise.resolve(null);
    var slug =
      opts.slug ||
      (el.getAttribute && el.getAttribute("data-gsi-slug")) ||
      "";
    slug = String(slug || "").trim();
    setState(el, "loading");
    el.innerHTML = '<p class="gsi-empty" role="status">Loading industry\u2026</p>';
    if (!slug) {
      el.innerHTML =
        '<p class="gsi-empty" role="alert">Industry slug missing. <a href="../">Back to industries</a></p>';
      setState(el, "error");
      return Promise.resolve(null);
    }
    var url = opts.dataUrl || resolveDataUrl(el, opts.depth == null ? 4 : opts.depth);
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (payload) {
        var list = (payload.industries || []).map(normalizeIndustry).filter(Boolean);
        var byId = buildIndex({}, list);
        var ind = list.find(function (i) {
          return i.slug === slug;
        });
        if (!ind) {
          el.innerHTML =
            '<p class="gsi-empty" role="alert">Industry not found. <a href="../">Back to industries</a></p>';
          setState(el, "error");
          return null;
        }
        el.innerHTML = renderDetail(ind, payload, byId);
        setState(el, "ready");
        if (global.document && document.title) {
          document.title = ind.name + " — Industry Intelligence · Global Signals";
        }
        return ind;
      })
      .catch(function () {
        el.innerHTML =
          '<p class="gsi-empty" role="alert">Industry intelligence could not be loaded. <a href="../">Back to industries</a></p>';
        setState(el, "error");
        return null;
      });
  }

  GS.industries = {
    normalizeConfidence: normalizeConfidence,
    normalizeTimeHorizon: normalizeTimeHorizon,
    normalizeIndustry: normalizeIndustry,
    normalizeClaim: normalizeClaim,
    renderIndex: renderIndex,
    renderDetail: renderDetail,
    renderTake: renderTake,
    renderIndexCard: renderIndexCard,
    takeHasSubstance: takeHasSubstance,
    mountIndex: mountIndex,
    mountDetail: mountDetail,
    CONFIDENCE_ALLOWED: CONFIDENCE_ALLOWED,
    HORIZON_ALLOWED: HORIZON_ALLOWED
  };
})(typeof window !== "undefined" ? window : globalThis);
